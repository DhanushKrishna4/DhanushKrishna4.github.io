// Behaviour every page shares: text reveals, clocks, the footer reveal and
// the rolling link text.
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { setupReveals } from '../core/reveal.js';
import { updateClocks } from '../core/clock.js';
import { clamp } from '../core/env.js';
import { smoothTo } from '../core/scroll.js';
import { setupRoll } from '../core/roll.js';
import { setupPills } from '../core/pill.js';

gsap.registerPlugin(ScrollTrigger);

const f2 = (n) => Math.round(n * 100) / 100;

// The footer, the reverse of Lando's pinned sections: instead of the next
// section sliding up over a pinned one, the footer waits pinned to the bottom
// of the screen and the page lifts off it. The page's bottom edge is curved
// (Dennis's curve) and flattens as it rises. Inside the footer the background
// lines hold still at the place they will have at the very bottom, so the
// footer looks fixed all the way through. A footer taller than the screen
// can't be pinned without hiding its top, so it simply scrolls.
function setupFooter(root, gl) {
  const field = gl?.field?.uniforms;
  const lines = (edge, depth, width, hold) => {
    if (!field) return;
    field.uFootEdge.value = edge;
    field.uFootDepth.value = depth;
    field.uFootW.value = width;
    field.uFootScroll.value = hold;
  };
  const off = () => lines(1e6, 0, 1, 0);
  off();
  const footer = root.querySelector('[data-footer]');
  if (!footer) return () => {};

  let clip = '';
  const setClip = (next) => {
    if (next !== clip) footer.style.clipPath = clip = next;
  };
  const update = () => {
    const vh = innerHeight;
    const h = footer.offsetHeight;
    const pinned = h <= vh;
    footer.classList.toggle('is-pinned', pinned);
    if (!pinned) {
      setClip('');
      off();
      return;
    }
    const w = footer.clientWidth;
    const top = vh - h; // where the footer is pinned
    const natural = root.getBoundingClientRect().bottom - h; // where its top would be in the flow
    const edge = clamp(natural - top, 0, h); // the page's bottom edge, from the footer's top
    const progress = 1 - edge / h;
    const depth = Math.min(innerWidth * 0.1, 160) * (1 - progress);
    setClip(
      edge >= h
        ? 'inset(100% 0 0 0)'
        : `path('M0,${f2(edge)} Q${f2(w / 2)},${f2(edge + depth * 2)} ${f2(w)},${f2(edge)} L${f2(w)},${f2(h)} L0,${f2(h)} Z')`,
    );
    if (field) {
      const dpr = gl.state.dpr;
      const max = document.documentElement.scrollHeight - vh;
      // The page's bottom edge where it really is, below the screen too: on
      // touch screens the project cards draw past the screen's bottom
      // (gl/cards.js), and nothing there may be cut off until the page ends.
      lines(Math.max(top, natural) * dpr, depth * dpr, w * dpr, (max / gl.state.height) * 0.12);
    }
  };

  // With WebGL the reveal runs inside the engine's frame (after the scroll has
  // moved, before the background is drawn), so the clipped edge and the held
  // lines always match; without it, on the ticker.
  const layer = gl ? gl.add({ order: -10, visible: false, update, render() {} }) : null;
  if (!gl) gsap.ticker.add(update);
  update();

  // Keyboard: tabbing into a footer that is still covered brings it into view.
  const onFocus = () => {
    if (footer.classList.contains('is-pinned')) smoothTo(document.documentElement.scrollHeight);
  };
  footer.addEventListener('focusin', onFocus);

  return () => {
    if (layer) gl.remove(layer);
    else gsap.ticker.remove(update);
    footer.removeEventListener('focusin', onFocus);
    footer.classList.remove('is-pinned');
    footer.style.clipPath = '';
    off();
  };
}

export function mountCommon(root, { gl } = {}) {
  const reveals = setupReveals(root);
  const offFooter = setupFooter(root, gl);
  const offRoll = setupRoll(root);
  const offPills = setupPills(root);
  updateClocks(root);
  return {
    intro() {
      reveals.start();
    },
    settle() {
      reveals.finish();
    },
    destroy() {
      reveals.destroy();
      offFooter();
      offRoll();
      offPills();
    },
  };
}
