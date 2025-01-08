document.addEventListener("DOMContentLoaded", () => {
  const dynamicContent = document.getElementById("dynamic-content");

  // Query the active tab to get the current URL
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    const url = new URL(tabs[0].url);
    const domain = url.hostname;

    // Inject dynamic content with domain-specific labels
    dynamicContent.innerHTML = `
      <label>
        <strong>${domain}</strong>
        <div class="toggle-switch">
          <input type="checkbox" id="domain-toggle" />
          <div class="toggle-slider"></div>
        </div>
      </label>
    `;

    // Fetch saved settings and apply toggle states
    chrome.storage.local.get(["settings"], (result) => {
      const settings = result.settings || {};
      document.getElementById("domain-toggle").checked =
        settings[domain]?.enabled ?? true;
    });

    // Add event listener to automatically save settings on toggle
    document.querySelector("#domain-toggle").addEventListener("change", (e) => {
      const isEnabled = e.target.checked;
    
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        const url = new URL(tabs[0].url);
        const domain = url.hostname;
    
        chrome.storage.local.get(["settings"], (result) => {
          const settings = result.settings || {};
          if (!settings[domain]) settings[domain] = { enabled: true, pages: {} };
    
          settings[domain].enabled = isEnabled;
    
          chrome.storage.local.set({ settings }, () => {
            console.log(`Domain ${domain} toggle set to ${isEnabled}`);
          });
        });
      });
    });
    
  });
});
