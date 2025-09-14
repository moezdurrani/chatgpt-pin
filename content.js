console.log("ChatGPT Pin Extension content script loaded!");

// Function to add a pin button under each message
function addPinButtons() {
  document.querySelectorAll('[data-message-id]').forEach(el => {
    // ✅ This already prevents duplicate buttons
    if (el.querySelector(".pin-button")) return;

    el.style.outline = "1px solid red"; // debugging highlight

    // Create pin button
    const pinBtn = document.createElement("button");
    pinBtn.innerText = "📌 Pin";
    pinBtn.className = "pin-button";
    pinBtn.style.marginLeft = "10px";
    pinBtn.style.cursor = "pointer";
    pinBtn.style.border = "none";
    pinBtn.style.background = "transparent";
    pinBtn.style.color = "#555";

    // Add click event
    pinBtn.addEventListener("click", () => {
      const messageId = el.getAttribute("data-message-id");
      const text = el.innerText;

      console.log("Pinned message:", { messageId, text });

      // Store pinned messages in Chrome storage
      chrome.storage.local.get(["pins"], (result) => {
        const pins = result.pins || [];
        pins.push({ id: messageId, text });
        chrome.storage.local.set({ pins });
      });
    });

    // Append button under message footer (next to existing buttons if possible)
    const footer = el.querySelector("div > div:last-child") || el;
    footer.appendChild(pinBtn);
  });
}

// Run on load + observe changes
setInterval(addPinButtons, 2000);
