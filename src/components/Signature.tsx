import { useLayoutEffect, useRef } from 'react';
import { gsap, ScrollTrigger, reduced } from '../lib/motion';
import { SIGNATURE } from '../brand/signature';

/**
 * The signature, signing itself as you scroll.
 *
 * On the reference site this is the single best small moment: a stroke that draws
 * forward while the type behind it travels sideways and the photograph between
 * them stays still. Three registers of motion at once is what makes it read as
 * choreography rather than as an effect. Scroll-scrubbed rather than autoplayed
 * is what makes it feel authored — the reader signs it, and it unsigns if they
 * scroll back up.
 *
 * The path is Dhanush's own, drawn on a trackpad and vectorised by the brand
 * handoff. The first version of this file animated a squiggle I invented, which
 * is a forged signature on a page whose whole argument is that its claims can
 * be checked — the one asset here that cannot be faked, and the reason this
 * component waited for the real one.
 */
/** The strokes, in writing order. `d` holds them as subpaths and every one of
 *  them starts with an absolute moveto, which is the only M in the data. */
const STROKES = SIGNATURE.d.split(/(?=M)/).filter(Boolean);

export default function Signature({ className = '' }: { className?: string }) {
  const ref = useRef<SVGSVGElement>(null);

  /* Layout effect for the same reason as the loader: the dash is applied in
     JS, so between paint and effect the signature is on screen fully drawn.
     Below the fold on a cold load, but reload while the band is in view and it
     flashes complete before drawing itself on. */
  useLayoutEffect(() => {
    const svg = ref.current;
    const paths = svg ? [...svg.querySelectorAll('path')] : [];
    if (!svg || !paths.length) return;

    /* Reduced motion gets the finished signature rather than no signature: the
       mark is content, the drawing of it is the decoration. */
    if (reduced()) {
      for (const p of paths) p.style.strokeDashoffset = '0';
      return;
    }

    const open = svg.closest('.open');

    const ctx = gsap.context(() => {
      /* Measured rather than taken from the handoff's stated length. They should
         agree; if they ever do not, the drawing is the thing that is true. */
      const lens = paths.map((p) => p.getTotalLength());
      const total = lens.reduce((a2, b2) => a2 + b2, 0);
      gsap.set(paths, {
        strokeDasharray: (i: number) => lens[i],
        strokeDashoffset: (i: number) => lens[i],
      });

      /* One tween per stroke, end to end. The two strokes used to be subpaths of
         a single <path>, and SVG restarts the dash pattern at every subpath — so
         one dashoffset ran both of them at once and the pen appeared to be in
         two places, which is what Dhanush saw. They have to be separate elements
         to be drawn separately.

         Durations are each stroke's share of the total length, so the pen moves
         at one speed across the join instead of slowing down for the short
         stroke and racing through the long one. */
      const tl = gsap.timeline({
        /* Off the opening sequence when it is inside one, not off the
           signature's own box. Pinned, that box stops moving — so a trigger
           reading its position fires once at the top of the pin and is done
           before the panel has finished contracting. His signature draws over
           the settled panel, which is the back half of the pin. */
        scrollTrigger: open
          ? { trigger: open, start: 'top top-=50%', end: 'top top-=100%', scrub: 0.6 }
          : { trigger: svg, start: 'top 88%', end: 'bottom 42%', scrub: 0.6 },
      });
      paths.forEach((p, i) => {
        tl.to(p, { strokeDashoffset: 0, ease: 'none', duration: lens[i] / total }, i ? '>' : 0);
      });
    }, svg);

    return () => {
      ctx.revert();
      ScrollTrigger.refresh();
    };
  }, []);

  return (
    <svg
      ref={ref}
      className={`sig ${className}`}
      viewBox={SIGNATURE.viewBox}
      fill="none"
      stroke="currentColor"
      strokeWidth={SIGNATURE.strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {/* One element per stroke. Held as subpaths of a single path until now,
          which is how the drawing is authored and is wrong for animating it:
          the dash pattern restarts at each subpath, so both drew together.

          Dashed from the handoff's stated total in the markup, so the very first
          paint is already blank rather than a fully drawn signature waiting to
          be hidden — the total is longer than either stroke, which is all that
          is needed to hide them. The effect replaces both values per stroke with
          the measured length. */}
      {STROKES.map((d, i) => (
        <path
          key={i}
          d={d}
          strokeDasharray={SIGNATURE.length}
          strokeDashoffset={SIGNATURE.length}
        />
      ))}
    </svg>
  );
}
