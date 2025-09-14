console.log("ChatGPT Pin Extension content script loaded!");

// Function to add pin/unpin buttons under each message
function addPinButtons() {
  document.querySelectorAll('[data-message-id]').forEach(el => {
    const messageId = el.getAttribute("data-message-id");
    if (!messageId) return;

    // Avoid adding duplicate buttons
    if (el.querySelector(".pin-button")) return;
    el.style.outline = "1px solid red"; // Keep for debugging

    // Create pin button
    const pinBtn = document.createElement("button");
    pinBtn.className = "pin-button";
    pinBtn.style.marginLeft = "10px";
    pinBtn.style.cursor = "pointer";
    pinBtn.style.border = "none";
    pinBtn.style.background = "transparent";
    pinBtn.style.padding = "2px";

    // Add an <img> inside the button
    const icon = document.createElement("img");
    icon.src = chrome.runtime.getURL("icons/pin-dark-mode.svg"); // default is Pin
    icon.style.width = "16px";
    icon.style.height = "16px";
    pinBtn.appendChild(icon);

    // Initialize button state from storage
    chrome.storage.local.get(["pins"], (result) => {
      const pins = result.pins || [];
      if (pins.some(p => p.id === messageId)) {
        icon.src = chrome.runtime.getURL("icons/unpin-dark-mode.svg");
      }
    });

    // Add click event
    pinBtn.addEventListener("click", () => {
      const text = el.innerText;

      chrome.storage.local.get(["pins"], (result) => {
        let pins = result.pins || [];
        const index = pins.findIndex(p => p.id === messageId);

        if (index === -1) {
          // Not pinned yet → add it
          pins.push({ id: messageId, text });
          chrome.storage.local.set({ pins });
          icon.src = chrome.runtime.getURL("icons/unpin-dark-mode.svg");
          console.log("Pinned message:", { messageId, text });
        } else {
          // Already pinned → remove it
          pins.splice(index, 1);
          chrome.storage.local.set({ pins });
          icon.src = chrome.runtime.getURL("icons/pin-dark-mode.svg");
          console.log("Unpinned message:", { messageId });
        }
      });
    });

    // Append button
    const footer = el.querySelector("div > div:last-child") || el;
    footer.appendChild(pinBtn);
  });
}

// Listen for storage changes (sync buttons with popup removals)
chrome.storage.onChanged.addListener((changes, area) => {
  if (area === "local" && changes.pins) {
    const newPins = changes.pins.newValue || [];
    document.querySelectorAll('[data-message-id]').forEach(el => {
      const btn = el.querySelector(".pin-button img");
      if (!btn) return;
      const messageId = el.getAttribute("data-message-id");
      if (newPins.some(p => p.id === messageId)) {
        btn.src = chrome.runtime.getURL("icons/unpin-dark-mode.svg");
      } else {
        btn.src = chrome.runtime.getURL("icons/pin-dark-mode.svg");
      }
    });
  }
});

// Run on load + observe changes
setInterval(addPinButtons, 2000);
