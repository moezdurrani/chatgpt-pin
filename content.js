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

function getEditIcon() {
    const theme = getTheme();
    return chrome.runtime.getURL(
        theme === "dark" ? "icons/edit-dark-mode.svg" : "icons/edit-light-mode.svg"
    );
}


// Extract conversationId from URL (/c/{conversationId})
function getConversationId() {
    const match = window.location.pathname.match(/\/c\/([a-f0-9-]+)/);
    return match ? match[1] : null;
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

        // --- Title display (hidden unless pinned) ---
        const titleBox = document.createElement("span");
        titleBox.className = "pin-title-inline";
        titleBox.style.background = getTheme() === "dark" ? "#333" : "#eee";
        titleBox.style.color = getTheme() === "dark" ? "#fff" : "#000";
        titleBox.style.padding = "4px 6px";
        titleBox.style.marginRight = "6px";
        titleBox.style.borderRadius = "6px";
        titleBox.style.fontSize = "15px";
        titleBox.style.maxWidth = "250px";
        titleBox.style.overflow = "hidden";
        titleBox.style.textOverflow = "ellipsis";
        titleBox.style.whiteSpace = "nowrap";
        titleBox.style.display = "none";

        // --- Edit button (hidden unless pinned) ---
        const editBtn = document.createElement("button");
        editBtn.className = "pin-edit-btn";
        editBtn.style.cursor = "pointer";
        editBtn.style.border = "none";
        editBtn.style.background = "transparent";
        editBtn.style.display = "none";
        const editIcon = document.createElement("img");
        editIcon.src = getEditIcon();
        editIcon.style.width = "20px";
        editIcon.style.height = "20px";
        editBtn.appendChild(editIcon);

        // --- Pin/unpin button ---
        const pinBtn = document.createElement("button");
        pinBtn.className = "pin-button";
        pinBtn.style.cursor = "pointer";
        pinBtn.style.border = "none";
        pinBtn.style.background = "transparent";
        pinBtn.style.padding = "6px";
        pinBtn.style.borderRadius = "10px";

        const icon = document.createElement("img");
        icon.style.width = "22px";
        icon.style.height = "22px";
        icon.style.display = "block";
        pinBtn.appendChild(icon);

        // Hover background like ChatGPT
        pinBtn.addEventListener("mouseenter", () => {
            pinBtn.style.background =
                getTheme() === "dark" ? "rgb(48, 48, 48)" : "rgb(232, 232, 232)";
        });
        pinBtn.addEventListener("mouseleave", () => {
            pinBtn.style.background = "transparent";
        });

        // Attach order: title → edit → pinBtn
        controls.appendChild(titleBox);
        controls.appendChild(editBtn);
        controls.appendChild(pinBtn);

        el.insertBefore(controls, el.firstChild);

        // Load pin state
        chrome.storage.local.get(["pins"], (result) => {
            const pins = result.pins || [];
            const pinData = pins.find((p) => p.id === messageId);
            if (pinData) {
                icon.src = getIcon(true);
                titleBox.textContent = pinData.title || "(Untitled)";
                titleBox.style.display = "inline-block";
                editBtn.style.display = "inline-block";
            } else {
                icon.src = getIcon(false);
            }
        });

        // --- Pin/unpin logic ---
        pinBtn.addEventListener("click", () => {
            const userText = el.innerText.trim();
            const assistantText = getNextAssistantMessage(el);

            const defaultTitle =
                userText.length > 60 ? userText.slice(0, 60) + "…" : userText;

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
                        assistant: assistantText,
                    });
                    chrome.storage.local.set({ pins });
                    icon.src = getIcon(true);
                    titleBox.textContent = defaultTitle;
                    titleBox.style.display = "inline-block";
                    editBtn.style.display = "inline-block";
                } else {
                    pins.splice(index, 1);
                    chrome.storage.local.set({ pins });
                    icon.src = getIcon(false);
                    titleBox.style.display = "none";
                    editBtn.style.display = "none";
                }
            });
        });

        // --- Inline edit title ---
        editBtn.addEventListener("click", () => {
            chrome.storage.local.get(["pins"], (result) => {
                let pins = result.pins || [];
                const pinData = pins.find((p) => p.id === messageId);
                if (!pinData) return;

                const input = document.createElement("input");
                input.type = "text";
                input.value = pinData.title || "";
                input.style.fontSize = "15px";
                input.style.background = getTheme() === "dark" ? "#333" : "#eee";
                input.style.color = getTheme() === "dark" ? "#fff" : "#000";
                input.style.padding = "2px 4px";
                input.style.borderRadius = "4px";
                input.style.border = "1px solid #ccc";
                input.style.minWidth = "150px"; 
                input.style.maxWidth = "250px";

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

// React to storage changes
chrome.storage.onChanged.addListener((changes, area) => {
    if (area === "local" && changes.pins) {
        const newPins = changes.pins.newValue || [];
        document.querySelectorAll("[data-message-id]").forEach((el) => {
            const controls = el.querySelector(".pin-controls");
            if (!controls) return;

            const messageId = el.getAttribute("data-message-id");
            const icon = controls.querySelector(".pin-button img");
            const titleBox = controls.querySelector(".pin-title-inline");
            const editBtn = controls.querySelector(".pin-edit-btn");

            const pinData = newPins.find((p) => p.id === messageId);
            if (pinData) {
                icon.src = getIcon(true);
                titleBox.textContent = pinData.title || "(Untitled)";
                titleBox.style.display = "inline-block";
                editBtn.style.display = "inline-block";
            } else {
                icon.src = getIcon(false);
                titleBox.style.display = "none";
                editBtn.style.display = "none";
            }
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

    // ✅ Update all edit icons too
    document.querySelectorAll(".pin-edit-btn img").forEach((img) => {
        img.src = getEditIcon();
    });
});
observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class", "data-theme"] });

// ✅ Scroll handling (unchanged from your working code)
chrome.runtime.onMessage.addListener((msg) => {
    if (msg.action === "scrollToPin" && msg.pin) {
        const { id, user, assistant, conversationId } = msg.pin;
        const currentConv = getConversationId();
        if (!conversationId || conversationId !== currentConv) return;

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
            return;
        }

        let attempts = 0;
        const maxAttempts = 40;
        const interval = setInterval(() => {
            attempts++;
            const retryTarget = tryFindTarget();
            if (retryTarget) {
                clearInterval(interval);
                retryTarget.scrollIntoView({ behavior: "smooth", block: "center" });
                retryTarget.style.transition = "box-shadow 0.3s ease";
                retryTarget.style.borderRadius = "8px";
                retryTarget.style.boxShadow = "0 0 0 3px orange";
                setTimeout(() => (retryTarget.style.boxShadow = ""), 3000);
            } else if (attempts >= maxAttempts) {
                clearInterval(interval);
            }
        }, 500);
    }
});

setInterval(addPinButtons, 2000);

// ✅ Pending scroll handling (unchanged from your working code)
window.addEventListener("load", () => {
    const currentConv = getConversationId();
    if (!currentConv) return;
    chrome.storage.local.get(["pendingScrollPin"], (result) => {
        const pending = result.pendingScrollPin;
        if (pending && pending.conversationId === currentConv) {
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
                chrome.storage.local.remove("pendingScrollPin");
                return;
            }
            let attempts = 0;
            const maxAttempts = 40;
            const interval = setInterval(() => {
                attempts++;
                const retryTarget = tryFindTarget();
                if (retryTarget) {
                    clearInterval(interval);
                    retryTarget.scrollIntoView({ behavior: "smooth", block: "center" });
                    retryTarget.style.transition = "box-shadow 0.3s ease";
                    retryTarget.style.borderRadius = "8px";
                    retryTarget.style.boxShadow = "0 0 0 3px orange";
                    setTimeout(() => (retryTarget.style.boxShadow = ""), 3000);
                    chrome.storage.local.remove("pendingScrollPin");
                } else if (attempts >= maxAttempts) {
                    clearInterval(interval);
                    chrome.storage.local.remove("pendingScrollPin");
                }
            }, 500);
        }
    });
});
