document.addEventListener("DOMContentLoaded", () => {
  const pinList = document.getElementById("pin-list");

  // Load pinned messages
  chrome.storage.local.get(["pins"], (result) => {
    const pins = result.pins || [];

    pins.forEach((pin, index) => {
      const li = document.createElement("li");

      // Shortened preview text
      const span = document.createElement("span");
      span.textContent = pin.text;
      span.title = pin.text; // Tooltip shows full text on hover

      // Remove button
      const removeBtn = document.createElement("button");
      removeBtn.textContent = "X";
      removeBtn.className = "remove-btn";

      removeBtn.addEventListener("click", () => {
        // Remove this pin from the array
        pins.splice(index, 1);
        chrome.storage.local.set({ pins }, () => {
          li.remove();
        });
      });

      li.appendChild(span);
      li.appendChild(removeBtn);
      pinList.appendChild(li);
    });
  });
});
