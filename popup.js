document.addEventListener("DOMContentLoaded", () => {
  const body = document.body;
  const pinList = document.getElementById("pin-list");
  const toggleBtn = document.getElementById("theme-toggle");
  const toggleIcon = document.getElementById("theme-toggle-icon");

  // themes order: light → dark → green
  const themes = ["theme-light", "theme-dark", "theme-green"];
  const icons = {
    "theme-light": "icons/moon.svg",       // show moon to go to dark
    "theme-dark": "icons/leaf-dark-mode.svg", // show leaf to go to green
    "theme-green": "icons/sun-light-mode.svg" // show sun to go to light
  };

  // --- Get correct icon path based on theme ---
  function getIconPath(baseName) {
    let theme = "light-mode"; // default fallback

    if (body.classList.contains("theme-dark")) {
      theme = "dark-mode";
    } else if (body.classList.contains("theme-green")) {
      // no green icons exist → reuse dark
      theme = "dark-mode";
    }

    return chrome.runtime.getURL(`icons/${baseName}-${theme}.svg`);
  }

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
        editIcon.src = getIconPath("edit");
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
        anchorIcon.src = getIconPath("anchor");
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
        removeIcon.src = getIconPath("unpin");
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

  // --- Theme setup ---
  chrome.storage.local.get("popupTheme", (result) => {
    const savedTheme = result.popupTheme || "theme-light";
    body.className = savedTheme;
    toggleIcon.src = chrome.runtime.getURL(icons[savedTheme]);

    // ✅ only load pins after theme is applied
    loadPins();
  });

  toggleBtn.addEventListener("click", () => {
    const currentTheme = themes.find((t) => body.classList.contains(t)) || "theme-light";
    const nextTheme = themes[(themes.indexOf(currentTheme) + 1) % themes.length];

    body.className = nextTheme;
    toggleIcon.src = chrome.runtime.getURL(icons[nextTheme]);

    chrome.storage.local.set({ popupTheme: nextTheme });

    // ✅ reload pins so icons update
    loadPins();
  });

  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === "local" && changes.pins) {
      loadPins();
    }
  });
});