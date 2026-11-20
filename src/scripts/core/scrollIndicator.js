// Lando's scroll indicator (landonorris.com, their .scroll-indicator), in
// place of the browser's scroll bar (hidden in ui.css, as theirs is). It shows
// only while the page moves: on a scroll it fades in over 0.5s and its bar
// eases to its place (0.3s, power2.out); half a second after the last scroll
// it fades out over 0.5s, every time. The bar is the share of the page on
// screen, 10 to 25% of the indicator. Hidden on screens under 480px wide.
import { gsap } from 'gsap';
import { html, PAGE_CHANGE } from './env.js';

export function setupScrollIndicator() {
  const el = document.querySelector('[data-scroll-indicator]');
  const bar = el?.querySelector('[data-scroll-indicator-bar]');
  if (!el || !bar) return;

  let shown = false;
  let hideTimer = 0;
  let share = 10; // the bar's length, % of the indicator
  let pageHeight = 0;
  gsap.set(el, { autoAlpha: 0 });

  const size = () => {
    pageHeight = document.documentElement.scrollHeight;
    share = gsap.utils.clamp(10, 25, (innerHeight / pageHeight) * 100);
    gsap.set(bar, { height: `${share}%` });
  };
  // As far down the indicator as the page is scrolled.
  const target = () => {
    const max = pageHeight - innerHeight;
    const q = max > 0 ? window.scrollY / max : 0;
    const h = el.offsetHeight;
    return q * (h - (share / 100) * h);
  };
  const place = () => gsap.set(bar, { y: target() });

  const onScroll = () => {
    // The page can grow as it loads; the bar follows.
    if (document.documentElement.scrollHeight !== pageHeight) size();
    if (!shown) {
      shown = true;
      gsap.to(el, { autoAlpha: 1, duration: 0.5 });
    }
    clearTimeout(hideTimer);
    gsap.to(bar, { y: target(), duration: 0.3, ease: 'power2.out' });
    hideTimer = setTimeout(() => {
      shown = false;
      gsap.to(el, { autoAlpha: 0, duration: 0.5 });
    }, 500);
  };

  addEventListener('scroll', onScroll, { passive: true });
  addEventListener('resize', () => {
    size();
    place();
  });
  // Each page is a new length; measured once it is in.
  addEventListener(PAGE_CHANGE, () => {
    if (html.classList.contains('is-transitioning')) return;
    size();
    place();
  });
  size();
  place();
}
