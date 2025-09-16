console.log("ChatGPT Pin Extension content script loaded!");

// Detect theme
function getTheme() {
  if (document.documentElement.classList.contains("dark")) {
    return "dark";
  }
  const attrTheme = document.documentElement.getAttribute("data-theme");
  return attrTheme === "dark" ? "dark" : "light";
}

// Choose icon based on theme + pin state
function getIcon(isPinned) {
  const theme = getTheme();
  if (isPinned) {
    return chrome.runtime.getURL(
      theme === "dark" ? "icons/unpin-dark-mode.svg" : "icons/unpin-light-mode.svg"
    );
  } else {
    return chrome.runtime.getURL(
      theme === "dark" ? "icons/pin-dark-mode.svg" : "icons/pin-light-mode.svg"
    );
  }
}

// Extract conversationId from URL (/c/{conversationId})
function getConversationId() {
  const match = window.location.pathname.match(/\/c\/([a-f0-9-]+)/);
  return match ? match[1] : null;
}

// Find the *next assistant message element* after this user message
function getNextAssistantMessageEl(userEl) {
  const allMessages = Array.from(document.querySelectorAll("[data-message-id]"));
  const index = allMessages.indexOf(userEl);
  if (index === -1) return null;

  for (let i = index + 1; i < allMessages.length; i++) {
    if (allMessages[i].getAttribute("data-message-author-role") === "assistant") {
      return allMessages[i];
    }
  }
  return null;
}

function addPinButtons() {
  document.querySelectorAll("[data-message-id]").forEach((el) => {
    const messageId = el.getAttribute("data-message-id");
    if (!messageId) return;

    const role = el.getAttribute("data-message-author-role");
    if (role !== "user") return;

    if (el.querySelector(".pin-controls")) return; // already added

    // --- Container for controls ---
    const controls = document.createElement("div");
    controls.className = "pin-controls";
    controls.style.display = "flex";
    controls.style.alignItems = "center";
    controls.style.gap = "6px";
    controls.style.marginBottom = "5px";

    // --- Title display ---
    const titleBox = document.createElement("span");
    titleBox.className = "pin-title-inline";
    titleBox.style.background = getTheme() === "dark" ? "#333" : "#eee";
    titleBox.style.color = getTheme() === "dark" ? "#fff" : "#000";
    titleBox.style.padding = "5px 8px";
    titleBox.style.marginRight = "6px";
    titleBox.style.borderRadius = "6px";
    titleBox.style.fontSize = "12px";
    titleBox.style.maxWidth = "250px";
    titleBox.style.overflow = "hidden";
    titleBox.style.textOverflow = "ellipsis";
    titleBox.style.whiteSpace = "nowrap";

    // --- Edit button ---
    const editBtn = document.createElement("button");
    editBtn.className = "pin-edit-btn";
    editBtn.style.cursor = "pointer";
    editBtn.style.border = "none";
    editBtn.style.background = "transparent";
    const editIcon = document.createElement("img");
    editIcon.src = chrome.runtime.getURL("icons/edit-dark-mode.svg");
    editIcon.style.width = "22px";
    editIcon.style.height = "22px";
    editBtn.appendChild(editIcon);

    // --- Pin/unpin button ---
    const pinBtn = document.createElement("button");
    pinBtn.className = "pin-button";
    pinBtn.style.cursor = "pointer";
    pinBtn.style.border = "none";
    pinBtn.style.background = "transparent";
    const icon = document.createElement("img");
    icon.style.width = "22px";
    icon.style.height = "22px";
    icon.style.display = "block";
    pinBtn.appendChild(icon);

    controls.appendChild(titleBox);
    controls.appendChild(editBtn);
    controls.appendChild(pinBtn);

    // --- Attach controls above the message ---
    el.insertBefore(controls, el.firstChild);

    // Load pin state
    chrome.storage.local.get(["pins"], (result) => {
      const pins = result.pins || [];
      const pinData = pins.find((p) => p.id === messageId);
      if (pinData) {
        icon.src = getIcon(true);
        titleBox.textContent = pinData.title || "(Untitled)";
      } else {
        icon.src = getIcon(false);
        titleBox.textContent = ""; // hidden until pinned
      }
    });

    // --- Pin/unpin logic ---
    pinBtn.addEventListener("click", () => {
      // Clone user message (strip extension UI)
      const clonedUserEl = el.cloneNode(true);
      clonedUserEl.querySelectorAll(".pin-controls").forEach((c) => c.remove());
      const userText = clonedUserEl.innerText.trim();
      const userHtml = clonedUserEl.innerHTML;

      // Get assistant
      const assistantEl = getNextAssistantMessageEl(el);
      let assistantText = "";
      let assistantHtml = "";
      if (assistantEl) {
        const clonedAssistantEl = assistantEl.cloneNode(true);
        clonedAssistantEl.querySelectorAll(".pin-controls, .copy-btn, button").forEach((btn) =>
          btn.remove()
        );
        assistantText = clonedAssistantEl.innerText.trim();
        assistantHtml = clonedAssistantEl.innerHTML;
      }

      const defaultTitle = userText.length > 60 ? userText.slice(0, 60) + "…" : userText;
      const conversationId = getConversationId();

      chrome.storage.local.get(["pins"], (result) => {
        let pins = result.pins || [];
        const index = pins.findIndex((p) => p.id === messageId);

        if (index === -1) {
          pins.push({
            id: messageId,
            conversationId,
            title: defaultTitle,
            user: userText,
            userHtml,
            assistant: assistantText,
            assistantHtml,
          });
          chrome.storage.local.set({ pins });
          icon.src = getIcon(true);
          titleBox.textContent = defaultTitle;
        } else {
          pins.splice(index, 1);
          chrome.storage.local.set({ pins });
          icon.src = getIcon(false);
          titleBox.textContent = "";
        }
      });
    });

    // --- Inline edit title ---
    editBtn.addEventListener("click", () => {
      chrome.storage.local.get(["pins"], (result) => {
        let pins = result.pins || [];
        const pinData = pins.find((p) => p.id === messageId);
        if (!pinData) return; // only allow editing if pinned

        const input = document.createElement("input");
        input.type = "text";
        input.value = pinData.title || "";
        input.style.fontSize = "12px";
        input.style.background = getTheme() === "dark" ? "#333" : "#eee";
        input.style.color = getTheme() === "dark" ? "#fff" : "#000";
        input.style.padding = "2px 4px";
        input.style.borderRadius = "4px";
        input.style.border = "1px solid #ccc";
        input.style.maxWidth = "150px";

        controls.replaceChild(input, titleBox);
        input.focus();

        function saveTitle() {
          const newTitle = input.value.trim() || "(Untitled)";
          pinData.title = newTitle;
          chrome.storage.local.set({ pins });
          titleBox.textContent = newTitle;
          controls.replaceChild(titleBox, input);
        }

        input.addEventListener("blur", saveTitle);
        input.addEventListener("keydown", (e) => {
          if (e.key === "Enter") saveTitle();
          if (e.key === "Escape") controls.replaceChild(titleBox, input);
        });
      });
    });
  });
}

// React to storage changes (sync inline UI)
chrome.storage.onChanged.addListener((changes, area) => {
  if (area === "local" && changes.pins) {
    const pins = changes.pins.newValue || [];
    document.querySelectorAll("[data-message-id]").forEach((el) => {
      const controls = el.querySelector(".pin-controls");
      if (!controls) return;

      const messageId = el.getAttribute("data-message-id");
      const pinData = pins.find((p) => p.id === messageId);
      const icon = controls.querySelector(".pin-button img");
      const titleBox = controls.querySelector(".pin-title-inline");

      if (pinData) {
        icon.src = getIcon(true);
        titleBox.textContent = pinData.title || "(Untitled)";
      } else {
        icon.src = getIcon(false);
        titleBox.textContent = "";
      }
    });
  }
});

// Keep adding pin buttons dynamically
setInterval(addPinButtons, 2000);
