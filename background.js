chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.type === "getApiKey") {
      chrome.storage.sync.get("apiKey", (data) => {
        sendResponse({ apiKey: data.apiKey });
      });
    }
    return true;
  });
  
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === "getActiveTab") {
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        sendResponse(tabs[0]); // Respond with the active tab
      });
      return true; // Keep the message channel open for async response
    }
  });
  