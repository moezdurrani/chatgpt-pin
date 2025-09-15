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

        // Show title instead of full user text
        const titleSpan = document.createElement("span");
        titleSpan.textContent = pin.title || "(Untitled)";
        titleSpan.className = "pin-title";
        titleSpan.title = pin.title || "(Untitled)";

        // Remove button
        const removeBtn = document.createElement("button");
        const removeIcon = document.createElement("img");
        removeIcon.src = chrome.runtime.getURL("icons/unpin-light-mode.svg");
        removeIcon.style.width = "14px";
        removeIcon.style.height = "14px";
        removeBtn.appendChild(removeIcon);
        removeBtn.className = "remove-btn";

        // Remove pin (don’t trigger detail view)
        removeBtn.addEventListener("click", (event) => {
          event.stopPropagation(); // ⛔ prevent li click handler
          pins.splice(index, 1);
          chrome.storage.local.set({ pins });
        });

        // ✅ Open details page when clicking the pin item
        li.addEventListener("click", () => {
          chrome.tabs.create({
            url: chrome.runtime.getURL("details.html?id=" + encodeURIComponent(pin.id))
          });
        });

        li.appendChild(titleSpan);
        li.appendChild(removeBtn);
        pinList.appendChild(li);
      });
    });
  }

  // Initial load
  loadPins();

  // Refresh when storage changes
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === "local" && changes.pins) {
      loadPins();
    }
  });
});
