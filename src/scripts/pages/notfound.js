// The 404 page, as Lando's: the 404 in 3D across the middle (gl/lost.js)
// and his "Go to home" button, whose arrow redraws itself on hover.
import { gsap } from 'gsap';
import { mountCommon } from './common.js';
import { createLost } from '../gl/lost.js';
import { reducedMotion, isTouch, changingPage, PAGE_CHANGE } from '../core/env.js';

// His arrow (a Rive animation), timed from recordings of his button. While
// the pointer is on the button it loops every 1.5s, starting a beat after
// the pointer arrives. Each round, the arrow rubs out from its tail, round
// the hook and along to the tip (0.465s, speeding up), then its head shrinks
// into its point (0.12s, slowing, so a dot lingers); a fresh one starts
// drawing from the tail at 0.5s, while that dot is still there, and draws
// the same way round, its head growing out of its point (0.9s, slowing
// down), then holds. Once the pointer leaves, the round in progress finishes
// and it stops. Keyboard focus counts as hover.
function setupArrow(link) {
  const svg = link?.querySelector('.lost__arrow svg');
  const line = svg?.querySelector('[data-arrow-line]');
  const head = svg?.querySelector('[data-arrow-head]');
  if (!line || !head) return () => {};
  const L = line.getTotalLength();
  // The head is one stroke, barb to point to barb, so the point stays mitred;
  // it shows the stretch `v` either side of its middle (the point).
  const B = head.getTotalLength() / 2;
  const ALL = L + B;
  // Two copies, so the new arrow can start while the old one finishes. Each
  // is drawn up to `d` and rubbed out up to `e`, along the line, then the head.
  const copy = (paths) => ({ line: paths[0], head: paths[1], e: 0, d: 0 });
  const old = copy([line, head]);
  const fresh = copy([line.cloneNode(), head.cloneNode()]);
  svg.append(fresh.line, fresh.head);
  const show = (path, from, to, length) => {
    if (to - from > 0.01) {
      path.style.opacity = '1';
      path.style.strokeDasharray = `${to - from} ${length + 10}`;
      path.style.strokeDashoffset = `${-from}`;
    } else path.style.opacity = '0';
  };
  const render = () => {
    for (const c of [old, fresh]) {
      show(c.line, Math.min(c.e, L), Math.min(c.d, L), L);
      const v = Math.min(Math.max(c.d - L, 0), B) - Math.min(Math.max(c.e - L, 0), B);
      show(c.head, B - v, B + v, 2 * B);
    }
  };
  const rest = () => {
    Object.assign(old, { e: 0, d: ALL });
    Object.assign(fresh, { e: 0, d: 0 });
  };
  rest();
  render();

  let pointer = false;
  let focus = false;
  let round = null;
  const wanted = () => ((pointer && !changingPage()) || focus) && !reducedMotion();
  const loop = (delay = 0) => {
    rest();
    round = gsap
      .timeline({ delay, onUpdate: render, onComplete: () => (wanted() ? loop() : ((round = null), rest(), render())) })
      .to(old, { e: L, duration: 0.465, ease: 'power2.in' }, 0)
      .to(old, { e: ALL, duration: 0.12, ease: 'power2.out' }, 0.465)
      .to(fresh, { d: ALL, duration: 0.9, ease: 'power2.out' }, 0.5)
      .to({}, { duration: 1.5 }, 0);
  };
  const sync = () => {
    if (wanted() && !round) loop(0.05);
  };
  const onEnter = (e) => {
    if (e.pointerType === 'touch' || isTouch()) return;
    pointer = true;
    sync();
  };
  const onLeave = () => {
    pointer = false;
  };
  const onFocus = () => {
    focus = link.matches(':focus-visible');
    sync();
  };
  const onBlur = () => {
    focus = false;
  };
  link.addEventListener('pointerenter', onEnter);
  link.addEventListener('pointerleave', onLeave);
  link.addEventListener('focus', onFocus);
  link.addEventListener('blur', onBlur);
  addEventListener(PAGE_CHANGE, sync);
  return () => {
    link.removeEventListener('pointerenter', onEnter);
    link.removeEventListener('pointerleave', onLeave);
    link.removeEventListener('focus', onFocus);
    link.removeEventListener('blur', onBlur);
    removeEventListener(PAGE_CHANGE, sync);
    round?.kill();
  };
}

export function mountNotFound(root, { gl }) {
  const common = mountCommon(root, { gl });
  const offArrow = setupArrow(root.querySelector('[data-lost-home]'));
  const lost = gl ? gl.add(createLost(gl, root.querySelector('[data-lost-stage]'))) : null;
  // As on his 404, the lines keep moving but nothing stirs them: no cursor
  // trail, and no make-believe pointer sweeping when the real one rests.
  gl?.fluid?.setCalm(true);

  return {
    settle() {
      common.settle();
    },
    intro({ fromLoader = false } = {}) {
      common.intro();
      lost?.intro({ fromLoader });
    },
    destroy() {
      common.destroy();
      offArrow();
      if (lost) gl.remove(lost);
      gl?.fluid?.setCalm(false);
    },
  };
}
