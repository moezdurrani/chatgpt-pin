document.addEventListener("DOMContentLoaded", () => {
  const pinList = document.getElementById("pin-list");

  function loadPins() {
    chrome.storage.local.get(["pins"], (result) => {
      const pins = result.pins || [];
      pinList.innerHTML = "";

      if (pins.length === 0) {
        pinList.innerHTML = "<li>No pinned messages yet.</li>";
        return;
      }

      pins.forEach((pin, index) => {
        const li = document.createElement("li");
        li.className = "pin-item";

        const span = document.createElement("span");
        span.textContent = pin.text;
        span.title = pin.text; // Tooltip with full text

        // Use unpin icon instead of "X"
        const removeBtn = document.createElement("button");
        removeBtn.className = "remove-btn";

        const icon = document.createElement("img");
        icon.src = chrome.runtime.getURL("icons/unpin-light-mode.svg");
        icon.alt = "Unpin";
        icon.style.width = "14px";
        icon.style.height = "14px";

        removeBtn.appendChild(icon);

        removeBtn.addEventListener("click", () => {
          pins.splice(index, 1);
          chrome.storage.local.set({ pins }, loadPins); // refresh list
        });

        li.appendChild(span);
        li.appendChild(removeBtn);
        pinList.appendChild(li);
      });
    });
  }

  loadPins();
});