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

    if (el.querySelector(".pin-button")) return;

    // Create button
    const pinBtn = document.createElement("button");
    pinBtn.className = "pin-button";
    pinBtn.style.cursor = "pointer";
    pinBtn.style.border = "none";
    pinBtn.style.background = "transparent";
    pinBtn.style.marginBottom = "5px";
    pinBtn.style.padding = "6px";
    pinBtn.style.borderRadius = "10px";

    const icon = document.createElement("img");
    icon.style.width = "22px";
    icon.style.height = "22px";
    icon.style.display = "block";
    icon.style.cursor = "pointer";
    pinBtn.appendChild(icon);

    // Hover background like ChatGPT
    pinBtn.addEventListener("mouseenter", () => {
      pinBtn.style.background =
        getTheme() === "dark" ? "rgb(48, 48, 48)" : "rgb(232, 232, 232)";
    });
    pinBtn.addEventListener("mouseleave", () => {
      pinBtn.style.background = "transparent";
    });

    // Initialize state
    chrome.storage.local.get(["pins"], (result) => {
      const pins = result.pins || [];
      const isPinned = pins.some((p) => p.id === messageId);
      icon.src = getIcon(isPinned);
    });

    // Handle click
    pinBtn.addEventListener("click", () => {
      // ✅ Clone message to strip extension UI
      const clonedUserEl = el.cloneNode(true);
      const pinButton = clonedUserEl.querySelector(".pin-button");
      if (pinButton) pinButton.remove();

      const userText = clonedUserEl.innerText.trim();
      const userHtml = clonedUserEl.innerHTML;

      // ✅ Get assistant message
      const assistantEl = getNextAssistantMessageEl(el);
      let assistantText = "";
      let assistantHtml = "";
      if (assistantEl) {
        const clonedAssistantEl = assistantEl.cloneNode(true);
        clonedAssistantEl.querySelectorAll(".pin-button, .copy-btn, button").forEach((btn) =>
          btn.remove()
        );
        assistantText = clonedAssistantEl.innerText.trim();
        assistantHtml = clonedAssistantEl.innerHTML;
      }

      // Default title = first 60 chars of user text
      const defaultTitle =
        userText.length > 60 ? userText.slice(0, 60) + "…" : userText;

      // ✅ Get conversationId
      const conversationId = getConversationId();

      chrome.storage.local.get(["pins"], (result) => {
        let pins = result.pins || [];
        const index = pins.findIndex((p) => p.id === messageId);

        if (index === -1) {
          // Save user + assistant pair with both text and HTML
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
          console.log("📌 Pinned:", { userText, assistantText, conversationId });
        } else {
          // Remove pin
          pins.splice(index, 1);
          chrome.storage.local.set({ pins });
          icon.src = getIcon(false);
          console.log("❌ Unpinned:", { messageId });
        }
      });
    });

    // Place above the user’s message
    el.insertBefore(pinBtn, el.firstChild);
  });
}

// React to storage changes
chrome.storage.onChanged.addListener((changes, area) => {
  if (area === "local" && changes.pins) {
    const newPins = changes.pins.newValue || [];
    document.querySelectorAll("[data-message-id]").forEach((el) => {
      const btn = el.querySelector(".pin-button img");
      if (!btn) return;
      const messageId = el.getAttribute("data-message-id");
      const isPinned = newPins.some((p) => p.id === messageId);
      btn.src = getIcon(isPinned);
    });
  }
});

// React to theme changes
const observer = new MutationObserver(() => {
  document.querySelectorAll(".pin-button img").forEach((img) => {
    const parent = img.closest("[data-message-id]");
    if (!parent) return;
    const messageId = parent.getAttribute("data-message-id");
    chrome.storage.local.get(["pins"], (result) => {
      const pins = result.pins || [];
      const isPinned = pins.some((p) => p.id === messageId);
      img.src = getIcon(isPinned);
    });
  });
});

observer.observe(document.documentElement, {
  attributes: true,
  attributeFilter: ["class", "data-theme"],
});

// ✅ Listen for popup scroll request
chrome.runtime.onMessage.addListener((msg) => {
  if (msg.action === "scrollToPin" && msg.pin) {
    const { id, user, assistant, conversationId } = msg.pin;

    // Verify current conversation
    const currentConv = getConversationId();
    if (!conversationId || conversationId !== currentConv) {
      console.warn("⚠️ Wrong chat open. Expected:", conversationId, "Got:", currentConv);
      return;
    }

    function tryFindTarget() {
      let target = id ? document.querySelector(`[data-message-id="${id}"]`) : null;
      if (!target && user) {
        target = Array.from(document.querySelectorAll("[data-message-id]")).find(
          (el) =>
            el.innerText.includes(user.slice(0, 50)) ||
            (assistant && el.innerText.includes(assistant.slice(0, 50)))
        );
      }
      return target;
    }

    let target = tryFindTarget();
    if (target) {
      target.scrollIntoView({ behavior: "smooth", block: "center" });
      target.style.transition = "box-shadow 0.3s ease";
      target.style.borderRadius = "8px";
      target.style.boxShadow = "0 0 0 3px orange";
      setTimeout(() => (target.style.boxShadow = ""), 3000);
      console.log("✅ Scrolled to pinned message:", id || user);
    } else {
      console.warn("❌ Could not find pinned message:", id || user);
    }
  }
});

// Keep adding pin buttons dynamically
setInterval(addPinButtons, 2000);

// ✅ On load, check if there is a pending scroll request
window.addEventListener("load", () => {
  const currentConv = getConversationId();
  if (!currentConv) return;

  chrome.storage.local.get(["pendingScrollPin"], (result) => {
    const pending = result.pendingScrollPin;
    if (pending && pending.conversationId === currentConv) {
      console.log("▶ Found pending scroll request:", pending);

      function tryFindTarget() {
        let target = pending.id
          ? document.querySelector(`[data-message-id="${pending.id}"]`)
          : null;
        if (!target && pending.user) {
          target = Array.from(document.querySelectorAll("[data-message-id]")).find(
            (el) =>
              el.innerText.includes(pending.user.slice(0, 50)) ||
              (pending.assistant && el.innerText.includes(pending.assistant.slice(0, 50)))
          );
        }
        return target;
      }

      let target = tryFindTarget();
      if (target) {
        target.scrollIntoView({ behavior: "smooth", block: "center" });
        target.style.transition = "box-shadow 0.3s ease";
        target.style.borderRadius = "8px";
        target.style.boxShadow = "0 0 0 3px orange";
        setTimeout(() => (target.style.boxShadow = ""), 3000);
        console.log("✅ Scrolled to pending pinned message:", pending.id || pending.user);
        chrome.storage.local.remove("pendingScrollPin");
      }
    }
  });
});
