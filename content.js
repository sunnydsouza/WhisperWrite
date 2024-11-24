let activeInputField = null; // Track the currently focused input field

// Create the main wrapper
const whisperText = document.createElement("div");
whisperText.className = "whisper-text";

// Sub-elements: whisper-blob, mic-blob, expanded-blob
whisperText.innerHTML = `
  <div class="whisper-blob"></div>
  <div class="mic-blob">
    <img style="width:24px;height:24px;object-fit:contain" src="${chrome.runtime.getURL("assets/mic_128.png")}" alt="Mic Icon" />
  </div>
  <div class="expanded-blob">
    <button id="drag-btn" aria-label="Drag">&#x2630;</button>
    <select class="language-dropdown">
      <option value="en" selected title="English">🇬🇧 EN</option>
      <option value="es" title="Español">🇪🇸 ES</option>
      <option value="fr" title="Français">🇫🇷 FR</option>
      <option value="de" title="Deutsch">🇩🇪 DE</option>
      <option value="zh" title="中文">🇨🇳 ZH</option>
    </select>
    <button id="mic-btn">
      <img style="width:24px;height:24px;object-fit:contain" src="${chrome.runtime.getURL("assets/mic_128.png")}" alt="Mic Icon" />
    </button>
    <button id="settings-btn">⚙️</button>
    <button id="close-btn">✖</button>
  </div>
`;

// Append the main wrapper to the document
document.body.appendChild(whisperText);

// Initialize the positions and hide the sub-elements
whisperText.style.position = "absolute";
whisperText.style.left = "10px";
whisperText.style.top = "10px";
whisperText.style.display = "none"; // Initially hidden

const whisperBlob = whisperText.querySelector(".whisper-blob");
const micBlob = whisperText.querySelector(".mic-blob");
const expandedBlob = whisperText.querySelector(".expanded-blob");

micBlob.style.display = "none";
expandedBlob.style.display = "none";

// Allow dragging via the drag button
let isDragging = false;
let offsetX = 0,
  offsetY = 0;

const dragBtn = expandedBlob.querySelector("#drag-btn");
dragBtn.addEventListener("mousedown", (event) => {
  isDragging = true;
  offsetX = event.clientX - whisperText.getBoundingClientRect().left;
  offsetY = event.clientY - whisperText.getBoundingClientRect().top;
  whisperText.style.cursor = "grabbing";
});

document.addEventListener("mousemove", (event) => {
  if (isDragging) {
    whisperText.style.left = `${event.clientX - offsetX}px`;
    whisperText.style.top = `${event.clientY - offsetY}px`;
  }
});

document.addEventListener("mouseup", () => {
  if (isDragging) {
    isDragging = false;
    whisperText.style.cursor = "pointer";
  }
});

// Function to reposition the whisperText
function repositionBlob(inputField) {
  if (!inputField) return;

  const rect = inputField.getBoundingClientRect();

  // Position the main container near the input field
  whisperText.style.left = `${rect.left - 25}px`; // Adjust position slightly to the left
  whisperText.style.top = `${rect.top + rect.height / 2}px`; // Center vertically
  whisperText.style.display = "flex";

  // Show the mic-blob briefly for animation
  micBlob.style.display = "flex";
  setTimeout(() => {
    micBlob.style.display = "none";
    whisperBlob.style.display = "block"; // Default state
  }, 1000); // 1-second delay
}

// Add hover event to show expanded-blob
whisperText.addEventListener("mouseenter", () => {
  micBlob.style.display = "none";
  whisperBlob.style.display = "none";
  expandedBlob.style.display = "flex"; // Show expanded blob
});

whisperText.addEventListener("mouseleave", () => {
  expandedBlob.style.display = "none"; // Hide expanded blob
  whisperBlob.style.display = "block"; // Restore mini blob
});

// Add focus and blur listeners to track input fields
document.addEventListener("focusin", (e) => {
  const isTextInput = (element) =>
    ["text", "email", "search", "url", "tel"].includes(element.type) ||
    element.tagName === "TEXTAREA" ||
    element.contentEditable === "true";

  if (isTextInput(e.target) && e.target.type !== "password") {
    activeInputField = e.target;
    repositionBlob(activeInputField);
  }
});

document.addEventListener("focusout", (e) => {
  setTimeout(() => {
    if (!whisperText.contains(document.activeElement) && e.target === activeInputField) {
      activeInputField = null;
      whisperText.style.display = "none";
    }
  }, 10);
});

// Handle dictation
const micBtn = expandedBlob.querySelector("#mic-btn");
const languageDropdown = expandedBlob.querySelector(".language-dropdown");
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
  micBtn.querySelector("img").src = chrome.runtime.getURL("assets/stop.png");

  whisperBlob.style.display = "none";
  expandedBlob.style.display = "flex";
  whisperText.classList.add("recording");

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
    whisperText.style.boxShadow = `0 0 0 ${volume / 20}px rgba(255, 0, 0, 1)`;
    requestAnimationFrame(updateVolume);
  };

  updateVolume();

  const mediaRecorder = new MediaRecorder(mediaStream);
  let audioChunks = [];

  mediaRecorder.ondataavailable = (event) => {
    audioChunks.push(event.data);
  };

  mediaRecorder.start();

  micBtn.onclick = async () => {
    // Stop recording
    mediaRecorder.stop();
    isRecording = false;

    whisperText.style.boxShadow = "none";
    whisperBlob.style.display = "block";
    expandedBlob.style.display = "none";

    micBtn.querySelector("img").src = chrome.runtime.getURL("assets/mic_128.png");

    mediaRecorder.onstop = async () => {
      mediaStream.getTracks().forEach((track) => track.stop());
      mediaStream = null;
      audioContext.close();

      const audioBlob = new Blob(audioChunks, { type: "audio/webm" });

      chrome.storage.local.get("openaiApiKey", async (result) => {
        const apiKey = result.openaiApiKey;
        if (!apiKey) {
          alert("Please set your OpenAI API key in the extension options.");
          return;
        }

        const formData = new FormData();
        formData.append("file", audioBlob, "audio.webm");
        formData.append("model", "whisper-1");
        formData.append("language", languageDropdown.value);

        try {
          const response = await fetch("https://api.openai.com/v1/audio/transcriptions", {
            method: "POST",
            headers: { Authorization: `Bearer ${apiKey}` },
            body: formData,
          });

          if (response.ok) {
            const result = await response.json();
            insertTextAtCursor(result.text);
          } else {
            const error = await response.json();
            alert(`Error: ${error.message}`);
          }
        } catch (error) {
          console.error("Error during API call:", error);
        }
      });

      micBtn.onclick = startRecording;
    };
  };
}

// Insert text into the active input field
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

expandedBlob.querySelector("#close-btn").onclick = () => {
  whisperText.style.display = "none";
};
