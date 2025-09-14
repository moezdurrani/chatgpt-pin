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
    pinBtn.innerText = "📌 Pin";
    pinBtn.className = "pin-button";
    pinBtn.style.marginLeft = "10px";
    pinBtn.style.cursor = "pointer";
    pinBtn.style.border = "none";
    pinBtn.style.background = "transparent";
    pinBtn.style.color = "#555";

    // Initialize button state from storage
    chrome.storage.local.get(["pins"], (result) => {
      const pins = result.pins || [];
      if (pins.some(p => p.id === messageId)) {
        setUnpinStyle(pinBtn);
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
          setUnpinStyle(pinBtn);
          console.log("Pinned message:", { messageId, text });
        } else {
          // Already pinned → remove it
          pins.splice(index, 1);
          chrome.storage.local.set({ pins });
          setPinStyle(pinBtn);
          console.log("Unpinned message:", { messageId });
        }
      });
    });

    // Append button
    const footer = el.querySelector("div > div:last-child") || el;
    footer.appendChild(pinBtn);
  });
}

// Helper to style as Pin
function setPinStyle(btn) {
  btn.innerText = "📌 Pin";
  btn.style.color = "#555";
}

// Helper to style as Unpin
function setUnpinStyle(btn) {
  btn.innerText = "❌ Unpin";
  btn.style.color = "red";
}

// Listen for storage changes (e.g., when popup removes a pin)
chrome.storage.onChanged.addListener((changes, area) => {
  if (area === "local" && changes.pins) {
    const newPins = changes.pins.newValue || [];
    document.querySelectorAll('[data-message-id]').forEach(el => {
      const btn = el.querySelector(".pin-button");
      if (!btn) return;
      const messageId = el.getAttribute("data-message-id");
      if (newPins.some(p => p.id === messageId)) {
        setUnpinStyle(btn);
      } else {
        setPinStyle(btn);
      }
    });
  }
});

// Run on load + observe changes
setInterval(addPinButtons, 2000);
