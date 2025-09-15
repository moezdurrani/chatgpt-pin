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

        // Show title
        const titleSpan = document.createElement("span");
        titleSpan.textContent = pin.title || "(Untitled)";
        titleSpan.className = "pin-title";
        titleSpan.title = pin.title || "(Untitled)";

        // Edit button
        const editBtn = document.createElement("button");
        const editIcon = document.createElement("img");
        editIcon.src = chrome.runtime.getURL("icons/edit-light-mode.svg");
        editIcon.style.width = "14px";
        editIcon.style.height = "14px";
        editBtn.appendChild(editIcon);
        editBtn.className = "edit-btn";

        editBtn.addEventListener("click", (event) => {
          event.stopPropagation(); // prevent triggering detail view

          // Replace span with input
          const input = document.createElement("input");
          input.type = "text";
          input.value = pin.title || "";
          input.className = "pin-title-input";

          li.replaceChild(input, titleSpan);
          input.focus();

          // Save on Enter or blur
          function saveTitle() {
            const newTitle = input.value.trim() || "(Untitled)";
            pins[index].title = newTitle;
            chrome.storage.local.set({ pins });

            // Restore span
            titleSpan.textContent = newTitle;
            titleSpan.title = newTitle;
            li.replaceChild(titleSpan, input);
          }

          input.addEventListener("blur", saveTitle);
          input.addEventListener("keydown", (e) => {
            if (e.key === "Enter") saveTitle();
            if (e.key === "Escape") {
              li.replaceChild(titleSpan, input); // cancel
            }
          });
        });

        // Remove button
        const removeBtn = document.createElement("button");
        const removeIcon = document.createElement("img");
        removeIcon.src = chrome.runtime.getURL("icons/unpin-light-mode.svg");
        removeIcon.style.width = "14px";
        removeIcon.style.height = "14px";
        removeBtn.appendChild(removeIcon);
        removeBtn.className = "remove-btn";

        removeBtn.addEventListener("click", (event) => {
          event.stopPropagation();
          pins.splice(index, 1);
          chrome.storage.local.set({ pins });
        });

        // Open details page when clicking the pin item (but not icons)
        li.addEventListener("click", () => {
          chrome.tabs.create({
            url: chrome.runtime.getURL("details.html?id=" + encodeURIComponent(pin.id))
          });
        });

        li.appendChild(titleSpan);
        li.appendChild(editBtn);
        li.appendChild(removeBtn);
        pinList.appendChild(li);
      });
    });
  }

  loadPins();

  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === "local" && changes.pins) {
      loadPins();
    }
  });
});
