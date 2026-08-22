import { useEffect, useRef } from 'react';
import { gsap, ScrollTrigger, reduced } from '../lib/motion';

/* His numbers, read off the bundle rather than the frames. The thumb is a
   percentage of the track, floored at 10 and ceilinged at 25 — so on a very long
   page it stops shrinking into a dot, and on a short one it stops growing until
   it means nothing. */
const MIN = 10;
const MAX = 25;
/* Milliseconds of stillness before it goes. Short enough that it is gone by the
   time you have finished reading whatever you stopped for. */
const IDLE = 500;
const FADE = 0.5;
/* The thumb eases to its target rather than tracking the scroll position. This
   is the whole reason his reads as part of the page and a native bar does not. */
const TRAVEL = 0.3;

/**
 * The scrollbar, drawn rather than native.
 *
 * The native one is off at the root (see the note on `html` in the stylesheet).
 * Hiding it alone is only half of what he does and leaves the page with no
 * position indicator at all — this is the other half.
 *
 * It appears on the first scroll event and leaves half a second after the last
 * one, so it is only ever on screen while it is being used. That is worth more
 * than it sounds: a permanent bar is a permanent vertical line down the edge of
 * every ground, and the grounds here are the design.
 *
 * The thumb tweens toward its target over 0.3s rather than being written to the
 * scroll position each frame. The page is on smooth scroll, so the raw scroll
 * position is ahead of the one on screen — easing the thumb puts it back in step
 * with what the reader can actually see, and is the difference between this and
 * a native bar that arrives at the bottom before the page does.
 *
 * `mix-blend-mode: difference` on the track is his, and it is the reason there
 * is one of these rather than one per ground: a white thumb inverts itself
 * against whatever it is over, so it stays legible from the olive through to the
 * paper without knowing which section it is on.
 */
export default function ScrollIndicator() {
  const track = useRef<HTMLDivElement>(null);
  const thumb = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const t = track.current;
    const b = thumb.current;
    if (!t || !b) return;

    const slow = reduced() ? 0 : FADE;
    const quick = reduced() ? 0 : TRAVEL;

    let shown = false;
    let timer = 0;
    /* Held rather than recomputed per scroll: sizing reads scrollHeight, and
       doing that on every scroll event to set a value that only changes on
       resize is a forced layout for nothing. */
    let pct = MIN;

    gsap.set(t, { autoAlpha: 0 });

    const size = () => {
      const doc = document.documentElement.scrollHeight;
      pct = doc > 0 ? gsap.utils.clamp(MIN, MAX, (window.innerHeight / doc) * 100) : MIN;
      gsap.set(b, { height: `${pct}%` });
    };

    /* The travel is the track's height less the thumb's, so the thumb's BOTTOM
       lands on the track's bottom at the end of the page rather than its top. */
    const target = () => {
      const range = document.documentElement.scrollHeight - window.innerHeight;
      /* A page shorter than the viewport has nowhere to scroll, and the obvious
         expression puts 0/0 into the tween. */
      if (range <= 0) return 0;
      const p = gsap.utils.clamp(0, 1, window.scrollY / range);
      return p * (t.offsetHeight - (pct / 100) * t.offsetHeight);
    };

    const onScroll = () => {
      if (!shown) {
        shown = true;
        gsap.to(t, { autoAlpha: 1, duration: slow });
      }
      window.clearTimeout(timer);
      gsap.to(b, { y: target(), duration: quick, ease: 'power2.out' });
      timer = window.setTimeout(() => {
        shown = false;
        gsap.to(t, { autoAlpha: 0, duration: slow });
      }, IDLE);
    };

    /* Sizing depends on the document height, and on this page that is not
       settled at mount: the pinned sections add their spacers on the first
       ScrollTrigger refresh, and the web fonts move everything again after that.
       His only listens for resize, which is right for a page whose height is
       fixed once it has loaded and wrong for this one. */
    const remeasure = () => {
      size();
      gsap.set(b, { y: target() });
    };
    remeasure();

    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', remeasure);
    ScrollTrigger.addEventListener('refresh', remeasure);

    return () => {
      window.clearTimeout(timer);
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', remeasure);
      ScrollTrigger.removeEventListener('refresh', remeasure);
    };
  }, []);

  /* Decorative: it reports a position that the page itself already tells you,
     and there is nothing here to operate. Hidden from the tree entirely. */
  return (
    <div className="scroll-indicator" ref={track} aria-hidden="true">
      <div className="scroll-indicator-bar" ref={thumb} />
    </div>
  );
}
