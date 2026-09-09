(() => {
  const nativeFetch = window.fetch.bind(window);
  window.fetch = (input, init = {}) => {
    const method = String(init.method || "GET").toUpperCase();
    if (!["GET", "HEAD", "OPTIONS"].includes(method)) {
      const token = document.querySelector('meta[name="csrf-token"]')?.content;
      if (token) {
        const headers = new Headers(init.headers || {});
        headers.set("X-CSRF-Token", token);
        init = { ...init, headers };
      }
    }
    return nativeFetch(input, init);
  };
})();
