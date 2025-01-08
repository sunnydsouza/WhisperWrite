// Helper function to get active tab
function getActiveTab(callback) {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (tabs && tabs.length > 0) {
      callback(tabs[0]);
    } else {
      callback(null);
    }
  });
}

// Listener for messages
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  switch (message.action) {
    case "getApiKey":
      chrome.storage.sync.get("apiKey", (data) => {
        sendResponse({ apiKey: data.apiKey });
      });
      break;

    case "getActiveTab":
      getActiveTab((activeTab) => sendResponse(activeTab));
      break;

    case "getDomainToggleState":
      getActiveTab((activeTab) => {
        if (!activeTab) {
          sendResponse({ enabled: false });
          return;
        }

        const domain = new URL(activeTab.url).hostname;
        chrome.storage.local.get(["settings"], (result) => {
          const settings = result.settings || {};
          const isDomainEnabled = settings[domain]?.enabled ?? true; // Default to enabled
          sendResponse({ enabled: isDomainEnabled });
        });
      });
      break;

    default:
      console.warn(`Unhandled message action: ${message.action}`);
  }

  return true; // Indicate async response
});

// Listener for storage changes
chrome.storage.onChanged.addListener((changes, area) => {
  if (area === "local" && changes.settings) {
    getActiveTab((activeTab) => {
      if (!activeTab) return;

      const domain = new URL(activeTab.url).hostname;
      const newSettings = changes.settings.newValue || {};
      const isDomainEnabled = newSettings[domain]?.enabled ?? true;

      // Notify content scripts of updated domain toggle state
      chrome.tabs.sendMessage(activeTab.id, { action: "updateToggle", enabled: isDomainEnabled });
    });
  }
});
