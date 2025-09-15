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
        editIcon.src = chrome.runtime.getURL("icons/edit-light-mode.svg");
        editIcon.style.width = "14px";
        editIcon.style.height = "14px";
        editBtn.appendChild(editIcon);
        editBtn.className = "edit-btn";

        editBtn.addEventListener("click", (event) => {
          event.stopPropagation();

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
          }

          input.addEventListener("blur", saveTitle);
          input.addEventListener("keydown", (e) => {
            if (e.key === "Enter") saveTitle();
            if (e.key === "Escape") li.replaceChild(titleSpan, input);
          });
        });

        // --- Anchor button ---
        const anchorBtn = document.createElement("button");
        const anchorIcon = document.createElement("img");
        anchorIcon.src = chrome.runtime.getURL("icons/anchor-light-mode.svg");
        anchorIcon.style.width = "14px";
        anchorIcon.style.height = "14px";
        anchorBtn.appendChild(anchorIcon);
        anchorBtn.className = "anchor-btn";

        anchorBtn.addEventListener("click", (event) => {
          event.stopPropagation();
          console.log("Anchor clicked for pin:", pin);

          if (!pin.conversationId) {
            alert("No conversation ID stored for this pin.");
            return;
          }

          chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            const activeTab = tabs[0];
            console.log("Active tab:", activeTab);

            if (!activeTab || !activeTab.url.includes("https://chatgpt.com/c/")) {
              alert("⚠️ Please open a ChatGPT conversation first.");
              return;
            }

            console.log("➡️ Sending scrollToPin to tab:", activeTab.id);
            chrome.tabs.sendMessage(activeTab.id, { action: "scrollToPin", pin }, () => {
              if (chrome.runtime.lastError) {
                console.error("Message failed:", chrome.runtime.lastError);
              } else {
                console.log("✅ Message sent to content.js");
              }
            });
          });
        });


        // --- Remove button ---
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

        // --- Details page ---
        li.addEventListener("click", () => {
          chrome.tabs.create({
            url:
              chrome.runtime.getURL("details.html?id=" + encodeURIComponent(pin.id)),
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
