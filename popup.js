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

        const removeBtn = document.createElement("button");
        removeBtn.textContent = "X";
        removeBtn.className = "remove-btn";

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