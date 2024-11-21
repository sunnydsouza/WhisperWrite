// Add a floating blob to all eligible text inputs
document.addEventListener("mouseover", (e) => {
  const isTextInput = (element) =>
    ["text", "email", "search", "url", "tel"].includes(element.type) ||
    element.tagName === "TEXTAREA" ||
    element.contentEditable === "true";

  // Ensure it's a valid text input, not a password field, and hasn't already been processed
  if (isTextInput(e.target) && !e.target.blobAdded && e.target.type !== "password") {
    const inputField = e.target;
    inputField.blobAdded = true;

    // Create the floating blob element
    const blob = document.createElement("div");
    blob.className = "whisper-blob";
    blob.innerHTML = `
      <div class="whisper-expanded">
        <select class="language-dropdown">
          <option value="en" selected title="English">🇬🇧 EN</option>
          <option value="es" title="Español">🇪🇸 ES</option>
          <option value="fr" title="Français">🇫🇷 FR</option>
          <option value="de" title="Deutsch">🇩🇪 DE</option>
          <option value="zh" title="中文">🇨🇳 ZH</option>
        </select>
        <button id="mic-btn">🎙️</button>
        <button id="settings-btn">⚙️</button>
        <span class="divider">|</span>
        <button id="minimize-btn" aria-label="Minimize"></button>
        <button id="close-btn">✖</button>
      </div>
    `;

    document.body.appendChild(blob);

    // Position the blob near the input
    const positionBlob = () => {
      const rect = inputField.getBoundingClientRect();
      blob.style.left = `${rect.right + 5}px`;
      blob.style.top = `${rect.top + (rect.height / 2) - 15}px`;
    };
    positionBlob();

    // Allow dragging the blob
    let isDragging = false;
    let offsetX = 0, offsetY = 0;

    blob.addEventListener("mousedown", (event) => {
      if (!["SELECT", "BUTTON"].includes(event.target.tagName)) {
        isDragging = true;
        offsetX = event.clientX - blob.getBoundingClientRect().left;
        offsetY = event.clientY - blob.getBoundingClientRect().top;
        blob.style.cursor = "grabbing";
      }
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


    const micBtn = blob.querySelector("#mic-btn");
    const languageDropdown = blob.querySelector(".language-dropdown");
    let isRecording = false;
    let mediaStream = null;

    // Separate function to start recording
    async function startRecording() {
      isRecording = true;
      micBtn.innerText = "⏹️"; // Show stop icon
      blob.classList.add("expanded");

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
        micBtn.innerText = "🎙️"; // Reset icon
        blob.classList.remove("expanded");

        mediaRecorder.onstop = async () => {
          // Stop the MediaStream tracks
          mediaStream.getTracks().forEach((track) => track.stop());
          mediaStream = null;

          const audioBlob = new Blob(audioChunks, { type: "audio/webm" });

          // Retrieve the API key from Chrome storage
          chrome.storage.local.get("openaiApiKey", async (result) => {
            const apiKey = result.openaiApiKey;
            if (!apiKey) {
              alert("Please set your OpenAI API key in the extension popup.");
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
                inputField.value = result.text; // Insert transcribed text into the input field
              } else {
                const error = await response.json();
                alert(`Error: ${error.message}`);
              }
            } catch (error) {
              console.error("Error during API call:", error);
              alert("An error occurred while transcribing audio. Check the console for details.");
            }
          });

          // Reset mic button to allow starting a new recording
          micBtn.onclick = startRecording;
        };
      };
    }

    // Assign the start recording function to the mic button initially
    micBtn.onclick = startRecording;





    // Close button functionality
    const closeBtn = blob.querySelector("#close-btn");
    closeBtn.onclick = () => {
      blob.remove(); // Remove the blob element
    };

    // Minimize button functionality
    const minimizeBtn = blob.querySelector("#minimize-btn");
    minimizeBtn.onclick = () => {
      blob.classList.remove("expanded");
    };

    // Prevent dropdown from collapsing blob
    languageDropdown.addEventListener("click", () => {
      blob.classList.add("expanded"); // Keep blob expanded during interaction
    });

    // Ensure dropdown selection works correctly
    languageDropdown.addEventListener("change", (e) => {
      const selectedOption = languageDropdown.options[languageDropdown.selectedIndex];
      languageDropdown.value = selectedOption.value; // Retain correct dropdown behavior
    });

    // Expand and collapse functionality
    blob.addEventListener("mouseenter", () => {
      if (!isRecording) blob.classList.add("expanded");
    });

    blob.addEventListener("mouseleave", () => {
      if (!isRecording && document.activeElement !== languageDropdown) {
        blob.classList.remove("expanded");
      }
    });
  }
});

// Utility to convert Blob to Base64
function blobToBase64(blob) {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result.split(",")[1]);
    reader.readAsDataURL(blob);
  });
}
