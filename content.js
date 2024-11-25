let activeInputField = null; // Track the currently focused input field
let isDragging = false; // Flag for drag operation
let offsetX = 0, offsetY = 0; // Drag offsets
const blobPositions = {}; // Store custom positions per input field
let blobListenersInitialized = false; // Prevent duplicate listeners

// Listen for messages from the background script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "updateToggle") {
    if (message.enabled) {
      console.log("UpdateToggle message received");
      initializeBlobFunctionality(); // Enable blob functionality
    } else {
      removeBlobFunctionality(); // Disable blob functionality
    }
  }
});

// Fetch the initial state on page load
chrome.runtime.sendMessage({ action: "getDomainToggleState" }, (response) => {
  if (response && response.enabled) {
    initializeBlobFunctionality(); // Initialize blob functionality only if enabled
  } else {
    console.log("Blob functionality disabled for this domain.");
  }
});

// Core functionality wrapped in a function for conditional initialization
function initializeBlobFunctionality() {
  if (document.querySelector(".whisper-blob")) {
    console.log("Blob functionality already initialized.");
    return;
  }

  // Create the blob
  const blob = document.createElement("div");
  const micIconURL = chrome.runtime.getURL("assets/mic_128.png");
  const recordingIconURL = chrome.runtime.getURL("assets/stop.png");
  blob.className = "whisper-blob";
  blob.innerHTML = `
    <div class="mic-blob" style="position: relative;">
      <img style="width:24px;height:24px;object-fit: contain" src="${micIconURL}" alt="Mic Icon" />
    </div>
    <div class="whisper-expanded">
      <button id="drag-btn" aria-label="Drag">&#x2630;</button>
      <select class="language-dropdown">
        <option value="en" selected title="English">🇬🇧 EN</option>
        <option value="es" title="Español">🇪🇸 ES</option>
        <option value="fr" title="Français">🇫🇷 FR</option>
        <option value="de" title="Deutsch">🇩🇪 DE</option>
        <option value="zh" title="中文">🇨🇳 ZH</option>
      </select>
      <button id="mic-btn" style="position: relative;">
        <img style="width:24px;height:24px;object-fit: contain" src="${micIconURL}" alt="Mic Icon" />
        
      </button>
      <button id="settings-btn">⚙️</button>
      <button id="close-btn">✖</button>
    </div>

    
  `;

  const tooltip = document.createElement("div");
  // tooltip.innerHTML=`<span class="whisper-tooltip">Start recording</span>`
  document.body.appendChild(blob);
  // document.body.appendChild(tooltip);
  blob.style.position = "absolute";
  blob.style.left = "10px";
  blob.style.top = "10px";
  blob.style.display = "none"; // Initially hidden

  const dragBtn = blob.querySelector("#drag-btn");
  const micBtn = blob.querySelector("#mic-btn");

  // Add drag functionality
  dragBtn.addEventListener("mousedown", (event) => {
    isDragging = true;
    const rect = blob.getBoundingClientRect();
    offsetX = event.clientX - rect.left;
    offsetY = event.clientY - rect.top;
    blob.style.cursor = "grabbing";
  });

  document.addEventListener("mousemove", (event) => {
    if (isDragging) {
      blob.style.left = `${event.clientX - offsetX}px`;
      blob.style.top = `${event.clientY - offsetY}px`;
      blob.style.transition = "none"; // Disable animation during drag
    }
  });

  document.addEventListener("mouseup", () => {
    if (isDragging) {
      isDragging = false;
      blob.style.cursor = "pointer";
      blob.style.transition = ""; // Re-enable animation

      if (activeInputField) {
        // Save custom position for this field
        const fieldId = getFieldId(activeInputField);
        blobPositions[fieldId] = {
          left: blob.style.left,
          top: blob.style.top,
        };
        saveBlobPositions(); // Persist positions to storage
      }
    }
  });

  // Reposition the blob based on input or custom positions
  function repositionBlob(inputField) {
    if (!inputField) return;

    const fieldId = getFieldId(inputField);
    const rect = inputField.getBoundingClientRect();
    const left = rect.left - 25; // Adjust position to the left of the input
    const top = rect.top + rect.height / 2; // Vertically align

    const customPosition = blobPositions[fieldId];
    if (customPosition) {
      blob.style.left = customPosition.left;
      blob.style.top = customPosition.top;
    } else {
      blob.style.left = `${left}px`;
      blob.style.top = `${top}px`;
    }

    blob.style.display = "inline-flex"; // Ensure visibility

    const micBlob = blob.querySelector(".mic-blob");
    if (!isDragging) {
      micBlob.style.display = "flex";
      blob.classList.add("mic-pulse");
      setTimeout(() => {
        blob.classList.remove("mic-pulse");
        micBlob.style.display = "none";
      }, 1000);
    }
  }

  // Get a unique ID for the input field
  function getFieldId(inputField) {
    const rect = inputField.getBoundingClientRect();
    return `${inputField.tagName}-${rect.left}-${rect.top}`;
  }

  // Save blob positions to chrome.storage.local
  function saveBlobPositions() {
    chrome.storage.local.set({ blobPositions }, () => {
      console.log("Blob positions saved:", blobPositions);
    });
  }

  // Load blob positions from chrome.storage.local
  function loadBlobPositions() {
    chrome.storage.local.get("blobPositions", (result) => {
      Object.assign(blobPositions, result.blobPositions || {});
      console.log("Loaded blob positions:", blobPositions);
    });
  }

  // Load saved positions on page load
  loadBlobPositions();

  // Handle input field focus
  document.body.addEventListener("focusin", (e) => {
    if (
      ["text", "email", "search", "url", "tel"].includes(e.target.type) ||
      e.target.tagName === "TEXTAREA" ||
      e.target.contentEditable === "true"
    ) {
      activeInputField = e.target;
      repositionBlob(activeInputField);
    }
  });

  // Hide the blob on blur
  document.body.addEventListener("focusout", (e) => {
    setTimeout(() => {
      if (!blob.contains(document.activeElement) && e.target === activeInputField) {
        activeInputField = null;
        blob.style.display = "none";
      }
    }, 10);
  });

  // Load positions when the page loads
  loadBlobPositions();
  const languageDropdown = blob.querySelector(".language-dropdown");
  let isRecording = false;
  let mediaStream = null;
  let audioContext = null;
  let analyser = null;
  let volumeMeter = null;

  async function startRecording() {
    if (!activeInputField) {
      alert("Please focus on a text input field to use dictation.");
      return;
    }

    isRecording = true;
    micBtn.querySelector("img").src = recordingIconURL;
    micBtn.classList.add("recording");
    blob.classList.add("recording");
    activeInputField.classList.add("active-input-field");

    mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true });
    audioContext = new AudioContext();
    analyser = audioContext.createAnalyser();
    const source = audioContext.createMediaStreamSource(mediaStream);
    source.connect(analyser);
    volumeMeter = new Uint8Array(analyser.frequencyBinCount);

    const updateVolume = () => {
      if (!isRecording) return;
      analyser.getByteFrequencyData(volumeMeter);
      const volume = Math.max(...volumeMeter);
      blob.style.boxShadow = `0 0 0 ${volume / 20}px rgba(255, 0, 0, 1)`;
      requestAnimationFrame(updateVolume);
    };
    updateVolume();

    const mediaRecorder = new MediaRecorder(mediaStream);
    const audioChunks = [];

    mediaRecorder.ondataavailable = (event) => audioChunks.push(event.data);
    mediaRecorder.start();

    micBtn.onclick = async () => {
      mediaRecorder.stop();
      isRecording = false;
      micBtn.classList.remove("recording");
      blob.classList.remove("recording");
      blob.style.boxShadow = "none";
      activeInputField.classList.remove("active-input-field");
      micBtn.querySelector("img").src = micIconURL;

      mediaRecorder.onstop = async () => {
        mediaStream.getTracks().forEach((track) => track.stop());
        mediaStream = null;
        audioContext.close();

        const audioBlob = new Blob(audioChunks, { type: "audio/webm" });
        console.log("Audio recorded successfully.");


        // Retrieve the API key from Chrome storage
        chrome.storage.local.get("openaiApiKey", async (result) => {
          const apiKey = result.openaiApiKey;
          if (!apiKey) {
            alert("Please set your OpenAI API key in the extension options.");
            return;
          }

          // Prepare FormData for the API request
          const formData = new FormData();
          formData.append("file", audioBlob, "audio.webm");
          formData.append("model", "whisper-1");
          formData.append("language", languageDropdown.value);

          try {
            const response = await fetch("https://api.openai.com/v1/audio/transcriptions", {
              method: "POST",
              headers: {
                Authorization: `Bearer ${apiKey}`, // Use the stored API key
              },
              body: formData, // Attach FormData
            });

            if (response.ok) {
              const result = await response.json();
              insertTextAtCursor(result.text); // Insert transcribed text at the cursor position
            } else {
              const error = await response.json();
              alert(`Error: ${error.message}`);
            }
          } catch (error) {
            console.error("Error during API call:", error);
            alert("An error occurred while transcribing audio. Check the console for details.");
          }
        });

        micBtn.onclick = startRecording;
      };
    };
  }

  // Insert text at the cursor position in the active input field
  function insertTextAtCursor(text) {
    if (!activeInputField) return;

    if (activeInputField.tagName === "TEXTAREA" || activeInputField.type === "text") {
      const start = activeInputField.selectionStart;
      const end = activeInputField.selectionEnd;
      const currentText = activeInputField.value;
      activeInputField.value = currentText.slice(0, start) + text + currentText.slice(end);
      activeInputField.setSelectionRange(start + text.length, start + text.length);
    } else if (activeInputField.contentEditable === "true") {
      const selection = window.getSelection();
      const range = selection.getRangeAt(0);
      range.deleteContents();
      range.insertNode(document.createTextNode(text));
      range.collapse(false);
    }
  }

  micBtn.onclick = startRecording;

  // Close button functionality
  blob.querySelector("#close-btn").onclick = () => {
    blob.style.display = "none";
  };

  // Expand/collapse on hover
  blob.addEventListener("mouseenter", () => {
    if (!isRecording) blob.classList.add("expanded");
  });

  blob.addEventListener("mouseleave", () => {
    if (!isRecording) blob.classList.remove("expanded");
  });
}

// Remove the blob functionality
function removeBlobFunctionality() {
  const blob = document.querySelector(".whisper-blob");
  if (blob) blob.remove();
  console.log("Blob functionality disabled.");
}
