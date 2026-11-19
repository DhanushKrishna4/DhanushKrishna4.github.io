// Makes DHANUSH (serif) and KRISHNA (sans) exactly the same width, the way
// LANDO and NORRIS line up in his lockup. Runs once fonts load and whenever
// the lockup changes width: the screen resizing, or the lockup showing again
// after a page that hides it (the 404). While hidden it measures nothing, so
// it is left as it was.
export function fitLockup() {
  const lockup = document.querySelector('[data-lockup]');
  if (!lockup) return;
  let fitted = 0;

  const fit = () => {
    const width = lockup.getBoundingClientRect().width;
    if (!width) return;
    lockup.querySelectorAll('.lockup__first, .lockup__last').forEach((line) => {
      const inner = line.querySelector('.lockup__inner');
      const was = line.style.fontSize;
      line.style.fontSize = '100px';
      const natural = inner.getBoundingClientRect().width;
      line.style.fontSize = natural > 0 ? `${(100 * width) / natural}px` : was;
    });
    fitted = width;
  };

  document.fonts.ready.then(fit);
  let raf = 0;
  new ResizeObserver(() => {
    cancelAnimationFrame(raf);
    raf = requestAnimationFrame(() => {
      if (lockup.getBoundingClientRect().width !== fitted) fit();
    });
  }).observe(lockup);
}
