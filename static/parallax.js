(() => {
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const finePointer = window.matchMedia("(pointer: fine)");
  if (reducedMotion.matches || !finePointer.matches) return;

  const root = document.documentElement;
  let targetX = 0, targetY = 0, currentX = 0, currentY = 0, raf = 0;
  const max = 4;

  const apply = () => {
    currentX += (targetX - currentX) * 0.075;
    currentY += (targetY - currentY) * 0.075;
    root.style.setProperty("--parallax-x", `${currentX.toFixed(2)}px`);
    root.style.setProperty("--parallax-y", `${currentY.toFixed(2)}px`);
    root.style.setProperty("--parallax-bg-x", `${(currentX * 0.55).toFixed(2)}px`);
    root.style.setProperty("--parallax-bg-y", `${(currentY * 0.55).toFixed(2)}px`);
    if (Math.abs(targetX - currentX) > 0.02 || Math.abs(targetY - currentY) > 0.02) raf = requestAnimationFrame(apply);
    else raf = 0;
  };

  const move = (event) => {
    targetX = ((event.clientX / window.innerWidth) - 0.5) * max;
    targetY = ((event.clientY / window.innerHeight) - 0.5) * max;
    if (!raf) raf = requestAnimationFrame(apply);
  };

  const reset = () => {
    targetX = 0;
    targetY = 0;
    if (!raf) raf = requestAnimationFrame(apply);
  };

  window.addEventListener("pointermove", move, { passive: true });
  window.addEventListener("pointerleave", reset, { passive: true });
})();
