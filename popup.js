// Load settings when popup opens
document.addEventListener("DOMContentLoaded", () => {
    const domainToggle = document.getElementById("domain-toggle");
    const pageToggle = document.getElementById("page-toggle");
  
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const url = new URL(tabs[0].url);
      const domain = url.hostname;
  
      chrome.storage.local.get(["settings"], (result) => {
        const settings = result.settings || {};
        domainToggle.checked = settings[domain]?.enabled ?? true;
        pageToggle.checked = settings[domain]?.pages?.[url.pathname] ?? true;
      });
    });
  
    // Save settings
    document.getElementById("save-settings-btn").onclick = () => {
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        const url = new URL(tabs[0].url);
        const domain = url.hostname;
        const pathname = url.pathname;
  
        chrome.storage.local.get(["settings"], (result) => {
          const settings = result.settings || {};
          if (!settings[domain]) settings[domain] = { enabled: true, pages: {} };
  
          settings[domain].enabled = domainToggle.checked;
          settings[domain].pages[pathname] = pageToggle.checked;
  
          chrome.storage.local.set({ settings }, () => {
            alert("Settings saved!");
          });
        });
      });
    };
  });
  