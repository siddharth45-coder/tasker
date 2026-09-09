(() => {
  const modal = document.getElementById("modal");
  const form = document.getElementById("taskForm");
  const saveBtn = form?.querySelector(".save-btn");
  let lastFocused = null;
  let savePending = false;

  document.addEventListener("pointerdown", (event) => {
    const opener = event.target.closest("#newTaskBtn,#newTaskTop,#emptyAddTask,.task-card,.calendar-task");
    if (opener) lastFocused = opener;
  }, true);

  const setSaveState = (busy) => {
    if (!saveBtn) return;
    savePending = busy;
    if (busy) {
      saveBtn.disabled = true;
      saveBtn.dataset.originalText = saveBtn.textContent;
      saveBtn.textContent = "Saving...";
      saveBtn.setAttribute("aria-busy", "true");
    } else {
      saveBtn.disabled = false;
      saveBtn.textContent = saveBtn.dataset.originalText || "Save task";
      saveBtn.removeAttribute("aria-busy");
    }
  };

  if (form && saveBtn) {
    form.addEventListener("submit", () => setSaveState(true), { capture: true });

    // Keep the button usable when an API request fails and the modal remains open.
    const originalFetch = window.fetch.bind(window);
    window.fetch = (...args) => {
      const input = args[0];
      const url = typeof input === "string" ? input : input?.url || "";
      const options = args[1] || {};
      const method = (options.method || (typeof input !== "string" && input?.method) || "GET").toUpperCase();
      const isTaskMutation = /^\/api\/tasks(?:\/|$)/.test(url) && ["POST", "PUT", "PATCH", "DELETE"].includes(method);

      return originalFetch(...args).finally(() => {
        if (isTaskMutation && savePending) setSaveState(false);
      });
    };

    const observer = new MutationObserver(() => {
      if (!modal || modal.classList.contains("hidden")) {
        setSaveState(false);
        if (lastFocused && document.contains(lastFocused)) setTimeout(() => lastFocused.focus(), 0);
      }
    });
    if (modal) observer.observe(modal, { attributes: true, attributeFilter: ["class"] });
  }

  document.addEventListener("keydown", (event) => {
    if (!modal || modal.classList.contains("hidden")) return;
    if (event.key === "Tab") {
      const focusable = [...modal.querySelectorAll("button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled])")].filter(el => el.offsetParent !== null);
      if (!focusable.length) return;
      const first = focusable[0], last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    }
    if (event.key === "Enter" && event.target.classList.contains("task-card")) {
      event.preventDefault(); event.target.click();
    }
  });
})();
