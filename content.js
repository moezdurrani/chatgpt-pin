console.log("ChatGPT Pin Extension content script loaded!");

// For testing: highlight all ChatGPT messages
setInterval(() => {
  document.querySelectorAll('[data-message-id]').forEach(el => {
    el.style.outline = "1px solid red";
  });
}, 2000);
