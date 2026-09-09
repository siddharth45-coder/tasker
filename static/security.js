(() => {
  const nativeFetch = window.fetch.bind(window);
  let pendingMutations = 0;

  function setLoading(active) {
    const board = document.getElementById("board");
    if (!board) return;
    board.setAttribute("aria-busy", active ? "true" : "false");
    let overlay = document.getElementById("apiLoading");
    if (active && !overlay) {
      overlay = document.createElement("div");
      overlay.id = "apiLoading";
      overlay.className = "api-loading";
      overlay.setAttribute("role", "status");
      overlay.setAttribute("aria-live", "polite");
      overlay.innerHTML = '<span class="loading-spinner" aria-hidden="true"></span><span>Loading tasks...</span>';
      board.parentElement?.insertBefore(overlay, board);
    }
    if (overlay) overlay.classList.toggle("hidden", !active);
  }

  const originalFetch = nativeFetch;
  window.fetch = (input, init = {}) => {
    const method = String(init.method || (input instanceof Request ? input.method : "GET") || "GET").toUpperCase();
    const headers = new Headers(init.headers || (input instanceof Request ? input.headers : undefined));
    if (!["GET", "HEAD", "OPTIONS"].includes(method)) {
      const token = document.querySelector('meta[name="csrf-token"]')?.content;
      if (token) headers.set("X-CSRF-Token", token);
      pendingMutations += 1;
      document.documentElement.classList.add("mutation-pending");
    }

    const isTaskLoad = method === "GET" && String(input instanceof Request ? input.url : input).includes("/api/tasks");
    if (isTaskLoad) setLoading(true);

    return originalFetch(input, { ...init, headers }).finally(() => {
      if (isTaskLoad) setLoading(false);
      if (!["GET", "HEAD", "OPTIONS"].includes(method)) {
        pendingMutations = Math.max(0, pendingMutations - 1);
        if (!pendingMutations) document.documentElement.classList.remove("mutation-pending");
      }
    });
  };

  document.addEventListener("DOMContentLoaded", () => {
    let lastFocused = null;

    const modal = document.getElementById("modal");
    const form = document.getElementById("taskForm");
    const close = document.getElementById("closeModal");

    if (modal) {
      const focusable = () => [...modal.querySelectorAll('button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])')].filter(el => !el.closest(".hidden"));
      const observer = new MutationObserver(() => {
        const open = !modal.classList.contains("hidden");
        if (open && !lastFocused) lastFocused = document.activeElement;
        if (!open && lastFocused && typeof lastFocused.focus === "function") {
          lastFocused.focus();
          lastFocused = null;
        }
      });
      observer.observe(modal, { attributes: true, attributeFilter: ["class"] });

      modal.addEventListener("keydown", e => {
        if (e.key === "Escape") {
          close?.click();
          return;
        }
        if (e.key !== "Tab" || modal.classList.contains("hidden")) return;
        const items = focusable();
        if (!items.length) return;
        const first = items[0], last = items[items.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      });
    }

    if (form) {
      form.addEventListener("submit", () => {
        const submit = form.querySelector('button[type="submit"]');
        if (!submit || submit.disabled) return;
        submit.disabled = true;
        submit.dataset.originalText = submit.textContent;
        submit.textContent = "Saving...";
        const unlock = () => {
          if (document.body.contains(submit) && document.documentElement.classList.contains("mutation-pending")) return;
          submit.disabled = false;
          submit.textContent = submit.dataset.originalText || "Save task";
        };
        setTimeout(unlock, 5000);
        const timer = setInterval(() => {
          if (!document.documentElement.classList.contains("mutation-pending")) {
            clearInterval(timer);
            unlock();
          }
        }, 120);
      }, true);
    }

    const enhanceTaskCards = () => {
      document.querySelectorAll(".task-card").forEach(card => {
        if (card.dataset.a11yReady) return;
        card.dataset.a11yReady = "1";
        card.setAttribute("tabindex", "0");
        card.addEventListener("keydown", e => {
          if ((e.key === "Enter" || e.key === " ") && !e.target.closest("button, input, textarea, select")) {
            e.preventDefault();
            card.click();
          }
        });
      });
    };

    enhanceTaskCards();
    new MutationObserver(enhanceTaskCards).observe(document.body, { childList: true, subtree: true });

    document.addEventListener("keydown", e => {
      if (e.key === "Escape") document.querySelectorAll(".task-menu:not(.hidden)").forEach(menu => menu.classList.add("hidden"));
    });
  });
})();
