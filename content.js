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

// Find the *next assistant message* after this user message
function getNextAssistantMessage(userEl) {
    const allMessages = Array.from(document.querySelectorAll("[data-message-id]"));
    const index = allMessages.indexOf(userEl);
    if (index === -1) return "";

    for (let i = index + 1; i < allMessages.length; i++) {
        if (allMessages[i].getAttribute("data-message-author-role") === "assistant") {
            return allMessages[i].innerText;
        }
    }
    return "";
}

function addPinButtons() {
    document.querySelectorAll('[data-message-id]').forEach(el => {
        const messageId = el.getAttribute("data-message-id");
        if (!messageId) return;

        const role = el.getAttribute("data-message-author-role");
        if (role !== "user") return;

        if (el.querySelector(".pin-button")) return;
        el.style.outline = "1px solid red"; // debugging

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
            pinBtn.style.background = getTheme() === "dark" ? "rgb(48, 48, 48)" : "rgb(232, 232, 232)";
        });
        pinBtn.addEventListener("mouseleave", () => {
            pinBtn.style.background = "transparent";
        });

        // Initialize state
        chrome.storage.local.get(["pins"], (result) => {
            const pins = result.pins || [];
            const isPinned = pins.some(p => p.id === messageId);
            icon.src = getIcon(isPinned);
        });

        // Handle click
        pinBtn.addEventListener("click", () => {
            const userText = el.innerText;
            const assistantText = getNextAssistantMessage(el); // ✅ FIXED

            chrome.storage.local.get(["pins"], (result) => {
                let pins = result.pins || [];
                const index = pins.findIndex(p => p.id === messageId);

                if (index === -1) {
                    // Save user + assistant pair
                    pins.push({ id: messageId, user: userText, assistant: assistantText });
                    chrome.storage.local.set({ pins });
                    icon.src = getIcon(true);
                    console.log("Pinned pair:", { userText, assistantText });
                } else {
                    // Remove pair
                    pins.splice(index, 1);
                    chrome.storage.local.set({ pins });
                    icon.src = getIcon(false);
                    console.log("Unpinned:", { messageId });
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
        document.querySelectorAll('[data-message-id]').forEach(el => {
            const btn = el.querySelector(".pin-button img");
            if (!btn) return;
            const messageId = el.getAttribute("data-message-id");
            const isPinned = newPins.some(p => p.id === messageId);
            btn.src = getIcon(isPinned);
        });
    }
});

// React to theme changes
const observer = new MutationObserver(() => {
    document.querySelectorAll(".pin-button img").forEach(img => {
        const parent = img.closest("[data-message-id]");
        if (!parent) return;
        const messageId = parent.getAttribute("data-message-id");
        chrome.storage.local.get(["pins"], (result) => {
            const pins = result.pins || [];
            const isPinned = pins.some(p => p.id === messageId);
            img.src = getIcon(isPinned);
        });
    });
});

observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["class", "data-theme"]
});

setInterval(addPinButtons, 2000);
