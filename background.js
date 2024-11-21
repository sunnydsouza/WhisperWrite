chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.type === "getApiKey") {
      chrome.storage.sync.get("apiKey", (data) => {
        sendResponse({ apiKey: data.apiKey });
      });
    }
    return true;
  });
  