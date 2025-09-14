console.log("ChatGPT Pin Extension content script loaded!");

// Function to add pin/unpin buttons only for user messages
function addPinButtons() {
  document.querySelectorAll('[data-message-id]').forEach(el => {
    const messageId = el.getAttribute("data-message-id");
    if (!messageId) return;

    // Only add buttons to user messages
    const role = el.getAttribute("data-message-author-role");
    if (role !== "user") return;

    // Avoid duplicates
    if (el.querySelector(".pin-button")) return;
    el.style.outline = "1px solid red"; // debugging

    // Create pin button
    const pinBtn = document.createElement("button");
    pinBtn.className = "pin-button";
    pinBtn.style.cursor = "pointer";
    pinBtn.style.border = "none";
    pinBtn.style.background = "transparent";
    pinBtn.style.marginBottom = "5px"; // spacing from the text

    const icon = document.createElement("img");
    icon.src = chrome.runtime.getURL("icons/pin-dark-mode.svg");
    icon.style.width = "22px";   // ⬅ bigger size
    icon.style.height = "22px";
    icon.style.display = "block"; // force it to stay above
    pinBtn.appendChild(icon);

    // Initialize state
    chrome.storage.local.get(["pins"], (result) => {
      const pins = result.pins || [];
      if (pins.some(p => p.id === messageId)) {
        icon.src = chrome.runtime.getURL("icons/unpin-dark-mode.svg");
      }
    });

    // Pin click
    pinBtn.addEventListener("click", () => {
      const userText = el.innerText;

      // Find assistant response (next message after this one)
      const nextMsg = el.nextElementSibling?.querySelector('[data-message-id]');
      const assistantText = nextMsg ? nextMsg.innerText : "";

      chrome.storage.local.get(["pins"], (result) => {
        let pins = result.pins || [];
        const index = pins.findIndex(p => p.id === messageId);

        if (index === -1) {
          // Save as one pair
          pins.push({ id: messageId, user: userText, assistant: assistantText });
          chrome.storage.local.set({ pins });
          icon.src = chrome.runtime.getURL("icons/unpin-dark-mode.svg");
          console.log("Pinned pair:", { userText, assistantText });
        } else {
          // Remove pair
          pins.splice(index, 1);
          chrome.storage.local.set({ pins });
          icon.src = chrome.runtime.getURL("icons/pin-dark-mode.svg");
          console.log("Unpinned:", { messageId });
        }
      });
    });

    // Insert ABOVE the user message
    el.insertBefore(pinBtn, el.firstChild);
  });
}

setInterval(addPinButtons, 2000);
