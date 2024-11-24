let activeInputField = null; // Track the currently focused input field


// Create the blob
const blob = document.createElement("div");
const micIconURL = chrome.runtime.getURL("assets/mic_128.png");
blob.className = "whisper-blob";
blob.innerHTML = `
  <div class="mic-blob"> <img style="width:24px;height:24px;object-fit: contain" src="${micIconURL}" alt="Mic Icon" /></div>
  <div class="whisper-expanded">
    <button id="drag-btn" aria-label="Drag">&#x2630;</button>
    <select class="language-dropdown">
      <option value="en" selected title="English">🇬🇧 EN</option>
      <option value="es" title="Español">🇪🇸 ES</option>
      <option value="fr" title="Français">🇫🇷 FR</option>
      <option value="de" title="Deutsch">🇩🇪 DE</option>
      <option value="zh" title="中文">🇨🇳 ZH</option>
    </select>
    <button id="mic-btn"><img style="width:24px;height:24px;object-fit: contain" src="${micIconURL}" alt="Mic Icon" /></button>
    <button id="settings-btn">⚙️</button>
    <!--<span class="divider">|</span>
    <button id="minimize-btn" aria-label="Minimize"></button>-->
    <button id="close-btn">✖</button>
  </div>
`;

document.body.appendChild(blob);
blob.style.position = "absolute";
blob.style.left = "10px";
blob.style.top = "10px";
blob.style.display = "none"; // Initially hidden

// Allow dragging via the drag button
let isDragging = false;
let offsetX = 0,
  offsetY = 0;

const dragBtn = blob.querySelector("#drag-btn");
dragBtn.addEventListener("mousedown", (event) => {
  isDragging = true;
  offsetX = event.clientX - blob.getBoundingClientRect().left;
  offsetY = event.clientY - blob.getBoundingClientRect().top;
  blob.style.cursor = "grabbing";
});

document.addEventListener("mousemove", (event) => {
  if (isDragging) {
    blob.style.left = `${event.clientX - offsetX}px`;
    blob.style.top = `${event.clientY - offsetY}px`;
  }
});

document.addEventListener("mouseup", () => {
  if (isDragging) {
    isDragging = false;
    blob.style.cursor = "pointer";
  }
});



function repositionBlob(inputField) {
  if (!inputField) return;

  const rect = inputField.getBoundingClientRect(); // Get input field dimensions and position

  // Calculate the parent blob's position relative to the input field
  const left = rect.left - 50; // Adjust position to the left of the input
  const top = rect.top + (rect.height / 2); // Vertically align

  // Apply calculated positions to the parent blob
  blob.style.left = `${left}px`;
  blob.style.top = `${top}px`;
  blob.style.display = "inline-flex"; // Ensure visibility

  // Synchronize child element positions via CSS variables
  blob.style.setProperty("--blob-left", `${left}px`);
  blob.style.setProperty("--blob-top", `${top}px`);

  // Trigger the mic blob animation for new input focus
  const micBlob = blob.querySelector(".mic-blob");
  micBlob.style.display = "flex";
  blob.classList.add("mic-pulse");

  // Hide mic blob after 1 second and revert to mini blob
  setTimeout(() => {
    blob.classList.remove("mic-pulse");
    micBlob.style.display = "none";
  }, 1000); // 1-second pulsing effect
}



// Focus event to track active input, reposition the blob, and show mic glimpse
document.addEventListener("focusin", (e) => {
  const isTextInput = (element) =>
    ["text", "email", "search", "url", "tel"].includes(element.type) ||
    element.tagName === "TEXTAREA" ||
    element.contentEditable === "true";

  if (isTextInput(e.target) && e.target.type !== "password") {
    activeInputField = e.target; // Update the active input field
    repositionBlob(activeInputField); // Reposition the blob
    console.log("Focused on:", activeInputField);
  }
});

// Hide the blob on blur
document.addEventListener("focusout", (e) => {
  setTimeout(() => {
    if (!blob.contains(document.activeElement) && e.target === activeInputField) {
      activeInputField = null;
      console.log("Input field blurred. Active field cleared.");
    }
  }, 10); // Small delay to allow blob interactions
});

// Handle dictation
const micBtn = blob.querySelector("#mic-btn");
const languageDropdown = blob.querySelector(".language-dropdown");
let isRecording = false;
let mediaStream = null;


async function startRecording() {
  if (!activeInputField) {
    alert("Please focus on a text input field to use dictation.");
    return;
  }

  console.log("Starting recording for field:", activeInputField);

  isRecording = true;
  micBtn.innerText = "⏹️"; // Show stop icon
  micBtn.classList.add("recording"); // Turn mic red and pulse
  blob.classList.add("recording"); // Add pulsing red hue to blob
  activeInputField.classList.add("active-input-field"); // Highlight active field

  blob.classList.add("expanded");

  // Change the extension icon to "recording"
  chrome.runtime.sendMessage({ action: "startRecording" });

  mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true });
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
    micBtn.classList.remove("recording");
    blob.classList.remove("recording");
    if (activeInputField) {
      activeInputField.classList.remove("active-input-field");
    }
    micBtn.innerText = "🎙️"; // Reset icon
    blob.classList.remove("expanded");

    // Change the extension icon back to default
    chrome.runtime.sendMessage({ action: "stopRecording" });

    mediaRecorder.onstop = async () => {
      // Stop the MediaStream tracks
      mediaStream.getTracks().forEach((track) => track.stop());
      mediaStream = null;

      const audioBlob = new Blob(audioChunks, { type: "audio/webm" });

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

      micBtn.onclick = startRecording; // Reset mic button
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




// Minimize button functionality
// const minimizeBtn = blob.querySelector("#minimize-btn");
// minimizeBtn.onclick = () => {
//   blob.classList.remove("expanded");
// };

// Close button functionality
const closeBtn = blob.querySelector("#close-btn");
closeBtn.onclick = () => {
  blob.style.display = "none"; // Hide the blob
};

// Expand and collapse functionality on hover
blob.addEventListener("mouseenter", () => {
  if (!isRecording) blob.classList.add("expanded");
});

blob.addEventListener("mouseleave", () => {
  if (!isRecording) blob.classList.remove("expanded");
});
