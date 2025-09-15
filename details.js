document.addEventListener("DOMContentLoaded", () => {
  const params = new URLSearchParams(window.location.search);
  const pinId = params.get("id");

  const pinTitleEl = document.getElementById("pin-title");
  const pinContent = document.getElementById("pin-content");
  const backBtn = document.getElementById("back-btn");

  chrome.storage.local.get(["pins"], (result) => {
    const pins = result.pins || [];
    const pin = pins.find(p => p.id === pinId);

    if (!pin) {
      pinContent.innerHTML = "<p>Pin not found.</p>";
      return;
    }

    // Title
    pinTitleEl.textContent = pin.title || "Pinned Message";

    // User block
    const userDiv = document.createElement("div");
    userDiv.className = "pin-block";
    userDiv.innerHTML = `<strong>You:</strong> <div>${pin.user}</div>`;

    // Assistant block
    const assistantDiv = document.createElement("div");
    assistantDiv.className = "pin-block";
    assistantDiv.innerHTML = `<strong>ChatGPT:</strong> <div>${pin.assistant}</div>`;

    pinContent.appendChild(userDiv);
    pinContent.appendChild(assistantDiv);
  });

  backBtn.addEventListener("click", () => {
    window.close();
  });
});
