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

        // --- Title ---
        const titleSpan = document.createElement("span");
        titleSpan.textContent = pin.title || "(Untitled)";
        titleSpan.className = "pin-title";
        titleSpan.title = pin.title || "(Untitled)";

        // --- Edit button ---
        const editBtn = document.createElement("button");
        const editIcon = document.createElement("img");
        editIcon.src = chrome.runtime.getURL("icons/edit-dark-mode.svg");
        editIcon.style.width = "17px";
        editIcon.style.height = "17px";
        editBtn.appendChild(editIcon);
        editBtn.className = "edit-btn";
        editBtn.setAttribute("data-tooltip", "Edit Pin");

        editBtn.addEventListener("click", (event) => {
          event.stopPropagation();

          // mark li as editing
          li.dataset.editing = "true";

          const input = document.createElement("input");
          input.type = "text";
          input.value = pin.title || "";
          input.className = "pin-title-input";

          li.replaceChild(input, titleSpan);
          input.focus();

          function saveTitle() {
            const newTitle = input.value.trim() || "(Untitled)";
            pins[index].title = newTitle;
            chrome.storage.local.set({ pins });
            titleSpan.textContent = newTitle;
            titleSpan.title = newTitle;
            li.replaceChild(titleSpan, input);

            // remove editing flag when done
            delete li.dataset.editing;
          }

          input.addEventListener("blur", saveTitle);
          input.addEventListener("keydown", (e) => {
            if (e.key === "Enter") saveTitle();
            if (e.key === "Escape") {
              li.replaceChild(titleSpan, input);
              delete li.dataset.editing;
            }
          });
        });

        // --- Anchor button ---
        const anchorBtn = document.createElement("button");
        const anchorIcon = document.createElement("img");
        anchorIcon.src = chrome.runtime.getURL("icons/anchor-dark-mode.svg");
        anchorIcon.style.width = "17px";
        anchorIcon.style.height = "17px";
        anchorBtn.appendChild(anchorIcon);
        anchorBtn.className = "anchor-btn";
        anchorBtn.setAttribute("data-tooltip", "Take me to the message in chat");

        anchorBtn.addEventListener("click", (event) => {
          event.stopPropagation();
          console.log("Anchor clicked for pin:", pin);

          if (!pin.conversationId) {
            alert("No conversation ID stored for this pin.");
            return;
          }

          chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            const activeTab = tabs[0];
            const convUrl = `https://chat.openai.com/c/${pin.conversationId}`;

            if (activeTab && activeTab.url.includes(`/c/${pin.conversationId}`)) {
              // ✅ Already in correct chat
              chrome.tabs.sendMessage(activeTab.id, { action: "scrollToPin", pin });
            } else {
              // ❌ Wrong chat → save pin for retry
              chrome.storage.local.set({ pendingScrollPin: pin }, () => {
                chrome.tabs.create({ url: convUrl });
              });
            }
          });
        });

        // --- Remove button ---
        const removeBtn = document.createElement("button");
        const removeIcon = document.createElement("img");
        removeIcon.src = chrome.runtime.getURL("icons/unpin-dark-mode.svg");
        removeIcon.style.width = "17px";
        removeIcon.style.height = "17px";
        removeBtn.appendChild(removeIcon);
        removeBtn.className = "remove-btn";
        removeBtn.setAttribute("data-tooltip", "Unpin");

        removeBtn.addEventListener("click", (event) => {
          event.stopPropagation();
          pins.splice(index, 1);
          chrome.storage.local.set({ pins });
        });

        // --- Details page ---
        li.addEventListener("click", () => {
          // Only open details if not editing
          if (li.dataset.editing === "true") {
            console.log("✏️ Editing in progress, not opening details.");
            return;
          }
          chrome.tabs.create({
            url: chrome.runtime.getURL("details.html?id=" + encodeURIComponent(pin.id))
          });
        });

        li.appendChild(titleSpan);
        li.appendChild(editBtn);
        li.appendChild(anchorBtn);
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
