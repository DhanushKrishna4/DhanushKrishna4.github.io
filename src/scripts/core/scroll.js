// Smooth scrolling with Lenis, driven by GSAP's ticker so every animation
// (ScrollTrigger, WebGL, marquee) reads the same scroll value each frame.
import Lenis from 'lenis';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { reducedMotion, isTouch } from './env.js';

gsap.registerPlugin(ScrollTrigger);

export let lenis = null;

// Whether the browser moves the page itself: on touch screens (Lenis leaves
// touch alone) and with reduced motion (no Lenis). It moves the page a frame
// before any script can redraw the fixed WebGL canvas behind it, so whatever
// is drawn there to follow the page trails it in a fast flick (measured 30 to
// 50px). Pieces that must stay with the page (the home page's monogram, the
// red lines) then get their own canvas inside the page, which scrolls with it.
export const browserScrolls = () => !lenis || isTouch();

export function initScroll() {
  history.scrollRestoration = 'manual';
  if (reducedMotion()) return;
  lenis = new Lenis({ lerp: 0.1, wheelMultiplier: 1, touchMultiplier: 1.4, autoRaf: false });
  lenis.on('scroll', ScrollTrigger.update);
  gsap.ticker.add((time) => lenis.raf(time * 1000));
  gsap.ticker.lagSmoothing(0);
}

export const scrollY = () => (lenis ? lenis.scroll : window.scrollY);
export const scrollVelocity = () => (lenis ? lenis.velocity : 0);

export function jumpTo(y = 0) {
  if (lenis) lenis.scrollTo(y, { immediate: true, force: true });
  else window.scrollTo(0, y);
}

export function smoothTo(y = 0) {
  if (lenis) lenis.scrollTo(y, { duration: 1.4 });
  else window.scrollTo({ top: y, behavior: reducedMotion() ? 'auto' : 'smooth' });
}

export function lockScroll(locked) {
  if (lenis) (locked ? lenis.stop() : lenis.start());
  document.documentElement.style.overflow = locked ? 'hidden' : '';
}

export function refreshScroll() {
  if (lenis) lenis.resize();
  ScrollTrigger.refresh();
}
