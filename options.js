// Save the API key
document.getElementById("save-key-btn").onclick = () => {
    const apiKey = document.getElementById("openai-api-key").value.trim();
    if (apiKey) {
      chrome.storage.local.set({ openaiApiKey: apiKey }, () => {
        alert("API Key saved!");
      });
    } else {
      alert("Please enter a valid API key.");
    }
  };
  
  // Load the API key when options page opens
  document.addEventListener("DOMContentLoaded", () => {
    chrome.storage.local.get("openaiApiKey", (result) => {
      if (result.openaiApiKey) {
        document.getElementById("openai-api-key").value = result.openaiApiKey;
      }
    });
  });
  