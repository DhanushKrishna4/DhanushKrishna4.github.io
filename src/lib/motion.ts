import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

export { gsap, ScrollTrigger };

export const reduced = () =>
  typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;

/**
 * `gsap.from` with the flash removed.
 *
 * Carried over from opus5, where it cost a day to work out. `immediateRender:
 * false` renders the element in its final state on the first frame and only
 * then jumps it back to the start — content appears, blanks, and animates in.
 * `immediateRender: true` fixes that and creates a worse bug: anything already
 * on screen when the trigger is created is written to its start state and, if
 * the reader never scrolls it past the trigger point, stays invisible forever.
 *
 * The answer is to render the start state immediately only while every target
 * is still below the fold, and to sweep for anything the reader scrolled past
 * faster than the trigger could fire.
 */
const armed = new Set<gsap.core.Tween>();

const sweep = () => {
  for (const tween of armed) {
    const targets = tween.targets() as Element[];
    const el = targets[0];
    if (!el || !el.isConnected) {
      armed.delete(tween);
      continue;
    }
    const past = el.getBoundingClientRect().bottom < 0;
    if (past && tween.progress() === 0) {
      tween.progress(1);
      armed.delete(tween);
    }
  }
};

if (typeof window !== 'undefined') {
  ScrollTrigger.addEventListener('scrollEnd', sweep);
  ScrollTrigger.addEventListener('refresh', sweep);
}

export function reveal(targets: gsap.TweenTarget, vars: gsap.TweenVars) {
  const els = gsap.utils.toArray<Element>(targets);
  const unseen =
    els.length > 0 && els.every((el) => el.getBoundingClientRect().top >= window.innerHeight);
  const tween = gsap.from(targets, { immediateRender: unseen, ...vars });
  if (unseen) armed.add(tween);
  return tween;
}
