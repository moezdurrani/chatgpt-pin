document.addEventListener("DOMContentLoaded", () => {
  const params = new URLSearchParams(window.location.search);
  const pinId = params.get("id");

  if (!pinId) {
    document.body.innerHTML = "<p>No pinned message selected.</p>";
    return;
  }

  chrome.storage.local.get(["pins"], (result) => {
    const pins = result.pins || [];
    const pin = pins.find(p => p.id === pinId);

    if (!pin) {
      document.body.innerHTML = "<p>Pinned message not found.</p>";
      return;
    }

    const container = document.createElement("div");
    container.className = "details-container";

    // User message
    const userDiv = document.createElement("div");
    userDiv.className = "message user";
    userDiv.innerHTML = `<strong>You:</strong><br>${pin.user}`;
    container.appendChild(userDiv);

    // Assistant response (now added!)
    if (pin.assistant && pin.assistant.trim() !== "") {
      const assistantDiv = document.createElement("div");
      assistantDiv.className = "message assistant";
      assistantDiv.innerHTML = `<strong>ChatGPT:</strong><br>${pin.assistant}`;
      container.appendChild(assistantDiv);
    }

    // Back button
    const backBtn = document.createElement("button");
    backBtn.textContent = "⬅ Back";
    backBtn.className = "back-btn";
    backBtn.addEventListener("click", () => {
      window.history.back();
    });

    document.body.appendChild(container);
    document.body.appendChild(backBtn);
  });
});
