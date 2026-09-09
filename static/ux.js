(() => {
  const modal = document.getElementById("modal");
  const form = document.getElementById("taskForm");
  const saveBtn = form?.querySelector(".save-btn");
  let lastFocused = null;

  if (typeof window.openModal === "function") {
    const originalOpenModal = window.openModal;
    window.openModal = (...args) => {
      lastFocused = document.activeElement;
      originalOpenModal(...args);
    };
  }
  if (typeof window.closeModal === "function") {
    const originalCloseModal = window.closeModal;
    window.closeModal = (...args) => {
      originalCloseModal(...args);
      if (lastFocused && document.contains(lastFocused)) lastFocused.focus();
    };
  }

  if (form && saveBtn) {
    form.addEventListener("submit", () => {
      saveBtn.disabled = true;
      saveBtn.dataset.originalText = saveBtn.textContent;
      saveBtn.textContent = "Saving...";
      saveBtn.setAttribute("aria-busy", "true");
    }, { capture: true });

    const observer = new MutationObserver(() => {
      if (!modal || modal.classList.contains("hidden")) {
        saveBtn.disabled = false;
        saveBtn.textContent = saveBtn.dataset.originalText || "Save task";
        saveBtn.removeAttribute("aria-busy");
      }
    });
    if (modal) observer.observe(modal, { attributes: true, attributeFilter: ["class"] });
  }

  document.addEventListener("keydown", (event) => {
    if (!modal || modal.classList.contains("hidden") || event.key !== "Tab") return;
    const focusable = [...modal.querySelectorAll("button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled])")]
      .filter(el => el.offsetParent !== null);
    if (!focusable.length) return;
    const first = focusable[0], last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
  });
})();
