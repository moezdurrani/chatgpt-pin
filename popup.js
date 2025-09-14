document.addEventListener("DOMContentLoaded", () => {
  const pinsList = document.getElementById("pins-list");

  // Load pins from Chrome storage
  chrome.storage.local.get(["pins"], (result) => {
    const pins = result.pins || [];

    if (pins.length === 0) {
      pinsList.innerHTML = "<li>No pinned messages yet.</li>";
      return;
    }

    pins.forEach((pin) => {
      const li = document.createElement("li");
      li.textContent = pin.text.slice(0, 100); // show first 100 chars
      pinsList.appendChild(li);
    });
  });
});