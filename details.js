document.addEventListener("DOMContentLoaded", () => {
  const params = new URLSearchParams(window.location.search);
  const pinId = params.get("id");
  const pinTitle = document.getElementById("pin-title");
  const pinContent = document.getElementById("pin-content");
  const backBtn = document.getElementById("back-btn");

  chrome.storage.local.get(["pins"], (result) => {
    const pins = result.pins || [];
    const pin = pins.find(p => p.id === pinId);
    if (!pin) {
      pinContent.innerHTML = "<p>Pin not found.</p>";
      return;
    }

    // Title
    pinTitle.textContent = pin.title || pin.user.slice(0, 80) + "…";

    // User block
    const userDiv = document.createElement("div");
    userDiv.className = "pin-block pin-user";
    userDiv.innerHTML = `<strong>You:</strong><br>${pin.user}`;

    // Copy button for user
    const userCopy = document.createElement("button");
    userCopy.className = "copy-btn";
    const userCopyIcon = document.createElement("img");
    userCopyIcon.src = chrome.runtime.getURL("icons/copy.svg");
    userCopy.appendChild(userCopyIcon);
    userCopy.addEventListener("click", () => {
      navigator.clipboard.writeText(pin.user);
    });
    userDiv.appendChild(userCopy);

    // Assistant block
    const assistantDiv = document.createElement("div");
    assistantDiv.className = "pin-block pin-assistant";
    assistantDiv.innerHTML = `<strong>ChatGPT:</strong><br>${pin.assistant}`;

    // Copy button for assistant
    const assistantCopy = document.createElement("button");
    assistantCopy.className = "copy-btn";
    const assistantCopyIcon = document.createElement("img");
    assistantCopyIcon.src = chrome.runtime.getURL("icons/copy.svg");
    assistantCopy.appendChild(assistantCopyIcon);
    assistantCopy.addEventListener("click", () => {
      navigator.clipboard.writeText(pin.assistant);
    });
    assistantDiv.appendChild(assistantCopy);

    // Add both blocks
    pinContent.appendChild(userDiv);
    pinContent.appendChild(assistantDiv);
  });

  backBtn.addEventListener("click", () => {
    window.close();
  });
});
