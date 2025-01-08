# **Whisper Extension: Voice-to-Text Assistant for Input Fields**

## **Purpose**
Revolutionize Your Productivity with AI-Powered Voice Transcription

Effortlessly transcribe, dictate, and translate on any webpage with the power of OpenAI's Whisper API. Whisper Mic Assistant integrates seamlessly into your browser, turning voice inputs into accurate text in multiple languages or translating speech directly to English.

Key Features:

- Smooth, dynamic UI for dictation and translation.
- Language-specific transcription or speech-to-text capabilities.
- Drag-and-drop repositionable mic control for effortless use.
- Automatic language translation to English for global communication.
- Intuitive toggles and settings for domain-specific customization.
- Empower your workflow with Whisper Mic Assistant—voice technology redefined.
---

## **Exclusive Features**
### **1. Adaptive Floating Blob**
- **Miniature Mode**: A small blob icon stays docked near input fields and is draggable for convenience.
- **Hover Expansion**: The blob expands on hover, revealing buttons for microphone, settings, and other functionalities.

![Extension in action](docs/in_action.gif)

### **2. Multi-Language Support**
- Select from multiple languages for transcription, including English, Spanish, French, German, and Chinese.
- Dropdown shows language options with flags and abbreviations (e.g., 🇬🇧 EN for English).

### **3. Real-Time Recording Feedback**
- Visual pulse effect around the blob that dynamically scales based on the microphone input volume.
- Recording mode turns the mic button red, providing a clear indicator of active recording.

### **4. Active Input Field Highlighting**
- Highlights the currently active input field in red while recording, ensuring clarity about where the text will appear.

### **5. Easy Drag-and-Drop**
- Blob can be repositioned anywhere on the screen via a drag button for user convenience.

### **6. Mic Pulsing Animation**
- On focusing a new input field, the blob briefly shows a pulsating mic animation before collapsing into the miniature blob.

### **7. Persistent API Key**
- API key is securely stored via Chrome's local storage and is editable through the extension's options page.

### **8. Toggle Functionality**
- Toggle the extension on or off for specific domains or pages using a user-friendly popup menu.

---

## **Video**

![Whisper Extension](https://youtu.be/-2meGMWIkfU?si=vIdS2cyg5gMpN9Dp)


---

## **Installation Instructions**

### **For Users**
1. **Download Extension**: 
   - Download the extension `.zip` from [GitHub Releases](https://github.com/sunnydsouza/whisper-extension/releases).
   - Extract the contents of the `.zip` file.
2. **Install Locally**:
   - Open Chrome and navigate to `chrome://extensions/`.
   - Enable **Developer Mode** (toggle at the top-right corner).
   - Click **Load unpacked** and select the extracted folder.
3. **Setup API Key**:
   - Open the extension popup by clicking the extension icon in Chrome.
   - Enter your OpenAI Whisper API key in the provided field and save it.

### **For Developers**
1. **Clone Repository**:
   ```bash
   git clone https://github.com/sunnydsouza/whisper-extension.git
   cd whisper-extension
   ```
2. **Install Dependencies**:
   - Install dependencies if applicable for the development setup (e.g., `npm install`).
3. **Run in Chrome**:
   - Follow the same steps as "Install Locally" to load the unpacked extension.

---

## **How It Works**
1. **Focus on Input Field**:
   - Hover or click on a supported input field to activate the extension.
2. **Start Recording**:
   - Click the mic button on the expanded blob. A red hue around the blob and mic indicates recording mode.
3. **Stop Recording**:
   - Click the mic button again to stop recording. The transcribed text will appear at the cursor position in the active input field.

---

## **Configuration**
### **Options Page**
- Manage and store the Whisper API key securely.
- Toggle extension functionality for specific domains or pages.

---

## **Development Contributions**
### **Features to Expand**
- **Multi-Field Output**: Allow transcribed text to split across multiple fields.
- **Mobile Support**: Adapt blob positioning and features for touch-based interfaces.
- **Browser Compatibility**: Extend support to other browsers like Firefox and Edge.

### **Contribution Guidelines**
1. Fork the repository and create a feature branch:
   ```bash
   git checkout -b feature-name
   ```
2. Implement the feature or fix and write tests where applicable.
3. Submit a pull request with a detailed description of changes.

---

## **Known Issues**
- **Blob Positioning in Edge Cases**: Blob might overlap input fields in complex layouts. Drag repositioning is a temporary workaround.
- **Mic Permissions**: Ensure the browser has microphone permissions enabled for the extension to function properly.



---

## **License**
This project is licensed under the MIT License. See the [LICENSE](https://github.com/sunnydsouza/whisper-extension/blob/main/LICENSE) file for details.

