import Lenis from 'lenis';
import { gsap, ScrollTrigger, reduced } from './motion';

/**
 * One clock for scroll.
 *
 * Lenis is driven from GSAP's ticker rather than its own rAF so the
 * interpolation, the scrubbed triggers and every tween advance on the same
 * frame. Running both loops lets them disagree by a frame, which is visible
 * precisely when the page is already struggling.
 */
let lenis: Lenis | null = null;

export const smooth = () => lenis;

export function initScroll(): () => void {
  /* Smooth scrolling is itself a motion effect, and one that reliably makes
     motion-sensitive people ill. Reduced motion gets the native scroll it
     asked for. */
  if (reduced()) return () => {};

  const instance = new Lenis({ lerp: 0.1, smoothWheel: true, syncTouch: false });
  lenis = instance;

  instance.on('scroll', ScrollTrigger.update);
  const raf = (time: number) => instance.raf(time * 1000);
  gsap.ticker.add(raf);
  gsap.ticker.lagSmoothing(0);

  return () => {
    gsap.ticker.remove(raf);
    gsap.ticker.lagSmoothing(500, 33);
    instance.destroy();
    if (lenis === instance) lenis = null;
  };
}

/** Same-page anchors, interpolated, with focus moved for keyboard users. */
export function initAnchors(): () => void {
  const onClick = (e: MouseEvent) => {
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey) return;
    const link = (e.target as HTMLElement | null)?.closest?.('a[href^="#"]') as HTMLAnchorElement | null;
    if (!link) return;
    const hash = link.getAttribute('href') ?? '';
    if (hash.length < 2) return;
    const target = document.getElementById(hash.slice(1));
    if (!target) return;

    e.preventDefault();
    if (lenis) lenis.scrollTo(target, { duration: 1.1, offset: -8 });
    else target.scrollIntoView();

    /* preventDefault also cancels the focus move the browser would have done,
       which strands keyboard and screen-reader users at the old spot. */
    if (!/^(A|BUTTON|INPUT)$/.test(target.tagName) && !target.hasAttribute('tabindex'))
      target.setAttribute('tabindex', '-1');
    target.focus({ preventScroll: true });
    history.replaceState(null, '', hash);
  };

  document.addEventListener('click', onClick);
  return () => document.removeEventListener('click', onClick);
}
