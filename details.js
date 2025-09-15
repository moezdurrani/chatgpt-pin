document.addEventListener("DOMContentLoaded", () => {
  const params = new URLSearchParams(window.location.search);
  const pinId = params.get("id");
  const pinTitle = document.getElementById("pin-title");
  const pinContent = document.getElementById("pin-content");
  const backBtn = document.getElementById("back-btn");

  // Helper: create copy button with tooltip
  function createCopyButton(textToCopy) {
  const btn = document.createElement("button");
  btn.className = "copy-btn";

  const icon = document.createElement("img");
  icon.src = chrome.runtime.getURL("icons/copy.svg");
  btn.appendChild(icon);

  // Tooltip (now absolutely positioned)
  const tooltip = document.createElement("span");
  tooltip.className = "tooltip";
  tooltip.textContent = "Copy";
  btn.appendChild(tooltip);

  btn.addEventListener("mouseenter", () => {
    tooltip.style.opacity = "1";
  });
  btn.addEventListener("mouseleave", () => {
    tooltip.style.opacity = "0";
    tooltip.textContent = "Copy"; // reset
  });

  btn.addEventListener("click", () => {
    navigator.clipboard.writeText(textToCopy).then(() => {
      tooltip.textContent = "Copied ✓";
      tooltip.style.opacity = "1";

      setTimeout(() => {s
        tooltip.style.opacity = "0";
        tooltip.textContent = "Copy";
      }, 2000);
    });
  });

  return btn;
}


  chrome.storage.local.get(["pins"], (result) => {
    const pins = result.pins || [];
    const pin = pins.find(p => p.id === pinId);
    if (!pin) {
      pinContent.innerHTML = "<p>Pin not found.</p>";
      return;
    }

    pinTitle.textContent = pin.title || pin.user.slice(0, 80) + "…";

    // User block
    const userDiv = document.createElement("div");
    userDiv.className = "pin-block pin-user";
    // userDiv.innerHTML = `<strong>You:</strong><br>${pin.user}`;
    userDiv.innerHTML = `${pin.user}`;
    userDiv.appendChild(createCopyButton(pin.user));

    // Assistant block
    const assistantDiv = document.createElement("div");
    assistantDiv.className = "pin-block pin-assistant";
    // assistantDiv.innerHTML = `<strong>ChatGPT:</strong><br>${pin.assistant}`;
    assistantDiv.innerHTML = `${pin.assistant}`;
    assistantDiv.appendChild(createCopyButton(pin.assistant));

    pinContent.appendChild(userDiv);
    pinContent.appendChild(assistantDiv);
  });

  backBtn.addEventListener("click", () => {
    window.close();
  });
});