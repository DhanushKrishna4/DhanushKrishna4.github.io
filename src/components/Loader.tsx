import { useLayoutEffect, useRef } from 'react';
import { gsap, reduced } from '../lib/motion';
import { SITE } from '../data/site';
import {
  MARK_CONSTRUCTION,
  CONSTRUCTION_CX,
  CONSTRUCTION_CY,
  SLOT_L,
  SLOT_R,
  SLOT_GAP,
  MERGED_CX,
  MERGED_W,
  SLOTS_H,
  SHEAR,
} from './Mark';

/**
 * The entry: the monogram resolves, then becomes the aperture.
 *
 * Two beats, both taken from the reference site.
 *
 * The first is the mark arriving under its own construction. His L7 assembles
 * rather than appearing — part of it is on screen before the rest of it is. A
 * ligature cannot be split the way two loose strokes can, so this does the
 * thing the handoff explicitly asks for instead: the mark is drawn upright and
 * the −12° shear runs on, so it settles into its final form rather than cutting
 * to it. The handoff's instruction is exact — animate the shear on the
 * construction group, never morph the flattened path — and it is also the only
 * animation of this mark that cannot go wrong, because every intermediate frame
 * is a real state of the drawing rather than an interpolation between outlines.
 *
 * The second is the aperture. The mark stops being a mark and becomes a hole:
 * it scales up until the shape is the viewport and what was behind it is the
 * site. The logo does not sit in front of the page waiting, it opens into it.
 * That is the rare loader that earns its time — a spinner is an apology for a
 * wait; this spends the wait introducing the mark and pays it back as a
 * transition rather than as a disappearance.
 *
 * Built as one SVG with an inverted mask: a full-bleed acid rect with the
 * monogram punched out of it in black on the mask, so the shape is absence
 * rather than ink. A second copy sits on top in solid ink for the first beat
 * and cross-fades out inside the first fifth of the growth — that overlap is
 * what sells "the mark became the window" instead of "a mark faded, then a hole
 * appeared".
 *
 * The mark drifts about sixteen pixels left as it shears, because the shear
 * pivots on the baseline and the outer group is centred on the mark's final
 * position rather than its upright one. That is deliberate: it reads as the
 * mark settling into place.
 */
export default function Loader({ onDone }: { onDone: () => void }) {
  const root = useRef<HTMLDivElement>(null);
  const holeOut = useRef<SVGGElement>(null);
  const holeIn = useRef<SVGGElement>(null);
  const inkOut = useRef<SVGGElement>(null);
  const inkIn = useRef<SVGGElement>(null);
  const stemL = useRef<SVGGElement>(null);

  /* Layout effect, not effect. The groups render with no transform, so their
     first paint puts the mark at its raw construction coordinates — native
     size, top-left corner — and it only jumps to the centre once the effect
     runs. `useEffect` runs *after* the browser has painted, so that wrong
     frame is real and visible: a large DK in the corner for one frame on every
     load. useLayoutEffect runs before paint.
     The `opacity="0"` on both groups below is the belt to this braces: even if
     a frame ever slips through, there is nothing in it to see. */
  useLayoutEffect(() => {
    const el = root.current;
    if (!el) return;

    const finish = () => {
      document.body.classList.remove('is-loading');
      document.body.classList.add('is-ready');
      /* Hand the browser chrome over at the same moment the accent does. Without
         this the meta stays on the accent until the first tone change, so a
         reader who never scrolls keeps a lime status bar over a paper page. */
      const chrome = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
      if (chrome) chrome.content = '#f4f4ed';
      onDone();
    };

    /* Reduced motion gets no aperture and no wait. The transition is the
       decoration here; the site is the content. */
    if (reduced()) {
      finish();
      return;
    }

    document.body.classList.add('is-loading');

    const vw = window.innerWidth;
    const vh = window.innerHeight;

    const rest = 118 / 160;

    /* How far the shear throws a point sideways per unit of height. The slots
       are drawn inside `translate(40 0) skewX(-12)`, so their construction x is
       not the x they are painted at, and both numbers below have to be quoted
       in that group's output space rather than in construction coordinates. */
    const lean = Math.abs(Math.tan((SHEAR * Math.PI) / 180));

    /* Where the growth has to be centred for the merged bar to finish on the
       middle of the screen.

       This was SLOTS_CX — the slots' raw construction x — and that was wrong,
       because cx is subtracted *outside* the skew group while SLOTS_CX is
       measured inside it. The aperture therefore drifted right as it grew: at
       full size the bar's centre landed about 1700px right of a 1936px-wide
       screen and the left half never opened at all. It looked survivable only
       because the overlay fades out over the last fifth of the growth, so the
       fade was finishing a reveal the hole had not actually made. */
    const openCx = MERGED_CX + 40 - lean * CONSTRUCTION_CY;

    /* Big enough that the bar covers the viewport outright rather than being
       helped over the line by that fade. Two constraints: the slots' 92-unit
       height has to span vh, and the merged bar's 40-unit width has to span vw
       *plus* whatever the shear steals — a sheared bar crossing the full height
       of the screen gives up lean × vh of its horizontal cover. The 1.18 is
       margin for the rounding, not for the geometry. */
    const cover = Math.max(vh / SLOTS_H, (vw + lean * vh) / MERGED_W) * 1.18;

    /* `z` growth, `k` shear, `gap` how far apart the two ones still are, and
       `cx` the horizontal point the whole thing is centred on.

       z is 0 → 1 and the scale is rest * growth^z — geometric, not linear. The
       aperture has to cover about ninety times its own width, and over a span
       that large a linear tween on the scale spends most of its time invisible:
       the first half of the tween is the difference between a hole the size of
       a logo and one the size of a slightly larger logo, and all the visible
       movement lands in the last few frames. Interpolating the exponent instead
       makes the *rate* of expansion constant, which is what the eye actually
       measures. It is also why the ease here is mild — the edge of the hole
       still accelerates outward on its own, because its distance from the
       centre scales with everything else.

       cx is the other correction, and it is *derived* rather than animated —
       which is the whole point of this version.

       Two things have to be true. At rest the aperture is the mark's own
       counter, so it must sit exactly where that counter sits, which means
       centring on the mark: cx = 140. At full size the merged bar has to be on
       the middle of the screen or it does not cover: cx = openCx. Tweening
       between the two looks like the obvious way to satisfy both and is wrong,
       because the quantity the eye sees is not cx — it is s × (openCx − cx),
       and s grows about ninety-fold across the same span. A residual that is
       shrinking gets multiplied by a scale that is exploding, so the product
       peaks in the middle instead of decaying: simulated, the aperture swung
       166px to the LEFT at 88% of the growth before snapping back to centre at
       the very end. Both endpoints were correct and the path between them was
       not, which is exactly the kind of thing that survives a still.

       So cx is solved each frame from the screen offset we actually want:

           cx = openCx + D(1 − z) / s,    D = (140 − openCx) · rest

       At z = 0 this is identically 140, at z = 1 it is identically openCx, and
       in between the offset is −D(1 − z) — a monotonic 23px drift to the right
       across the whole growth, which is both invisible and, when you do catch
       it, moving the way the merge is moving rather than against it.

       gap runs 1 → 0, and that is not a flourish either. Two disconnected slots
       scaled about their shared centre can never cover the middle: neither one
       crosses the centre line, so the gap scales with everything else and
       leaves a permanent stripe of accent down the page however far it grows.
       Collapsing it merges them into one bar, which does cover. */
    const state = { z: 0, k: 0, gap: 1 };
    const growth = cover / rest;
    /* The rest offset, in screen units at rest scale: how far left of centre the
       merged bar sits when the aperture is still the size of the counter. */
    const drift = (CONSTRUCTION_CX - openCx) * rest;

    const place = () => {
      const s = rest * Math.pow(growth, state.z);
      const cx = openCx + (drift * (1 - state.z)) / s;
      const outer = `translate(${vw / 2} ${vh / 2}) scale(${s}) translate(${-CONSTRUCTION_CX} ${-CONSTRUCTION_CY})`;
      const inner = `translate(40 0) skewX(${state.k})`;
      inkOut.current?.setAttribute('transform', outer);
      inkIn.current?.setAttribute('transform', inner);

      /* Same coordinate system as the mark, so at rest the hole is precisely
         the mark's counter — no alignment arithmetic, because it is literally
         the same geometry under the same transform. */
      holeOut.current?.setAttribute(
        'transform',
        `translate(${vw / 2} ${vh / 2}) scale(${s}) translate(${-cx} ${-CONSTRUCTION_CY})`,
      );
      holeIn.current?.setAttribute('transform', inner);
      /* The left slot closes onto the right one, which does not move. The
         first cut converged both on the midpoint, which is the tidier-looking
         arithmetic and the worse choice: the right slot is the one nearer the
         middle of the screen, so anchoring it is the shorter move and leaves
         the merged bar closer to where it has to end up. */
      stemL.current?.setAttribute('transform', `translate(${SLOT_GAP * (1 - state.gap)} 0)`);
    };
    place();

    gsap.set(holeOut.current, { autoAlpha: 0 });

    const tl = gsap.timeline({ onUpdate: place, onComplete: finish });

    /* One: the mark arrives upright, holds long enough to be read as upright,
       and only then shears into its final construction.

       The ordering is the whole beat and the first attempt lost it. Fading in
       over 0.4s while an `expo.out` shear ran from 0.1s meant the shear was
       ninety per cent finished before the mark was fully visible — measured at
       160ms intervals, every frame showed the sheared mark and the animation
       may as well not have existed. `power3.inOut` over 0.7s, starting after
       the mark is solid, is slow through the middle where the movement is
       actually legible. */
    tl.fromTo(inkOut.current, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.28, ease: 'power2.out' })
      .to({}, { duration: 0.22 })
      .to(state, { k: SHEAR, duration: 0.7, ease: 'power3.inOut' })
      .to({}, { duration: 0.15 })

      /* Two: it stops being ink and becomes absence, and the aperture opens.
         The swap happens inside the first fifth of the growth so the eye never
         sees two states.

         The growth starts on the same frame as the swap. An earlier cut held
         the bare 11 for 0.4s first, on the theory that a shape nobody has time
         to read is a wipe rather than a number — but the counter has been on
         screen inside the mark for the whole of beat one, so by the time the
         ink leaves it has already been read, and the hold was dead air. What
         made it feel worse than 0.4s was the ease: `expo.in` over 1.5s puts
         seventy per cent of the duration into the first twelve per cent of the
         distance, so the aperture sat there apparently motionless for another
         second on top of the hold. Both are gone — the hole is already opening
         while the ink is still fading out. */
      .set(holeOut.current, { autoAlpha: 1 })
      .to(inkOut.current, { autoAlpha: 0, duration: 0.18 }, '<')
      .to(state, { z: 1, duration: 0.85, ease: 'power1.in' }, '<')
      /* The merge finishes well before the growth does, so the stems are one
         shape by the time either of them is near the edge of the screen. */
      .to(state, { gap: 0, duration: 0.34, ease: 'power2.in' }, '<')
      .to('.ld-label', { autoAlpha: 0, duration: 0.26 }, '<')
      /* Short, and strictly after the growth rather than overlapping its tail.
         The hole covers the viewport on its own now, so by the time this runs
         the overlay is already invisible and fading it is a formality — which
         is the point. Overlap it and the fade is doing part of the reveal
         again, which is exactly the thing that hid the drift. */
      .to(el, { autoAlpha: 0, duration: 0.14 });

    return () => {
      tl.kill();
      document.body.classList.remove('is-loading');
    };
  }, [onDone]);

  return (
    <div className="ld" ref={root} role="status" aria-live="polite">
      <span className="visually-hidden">Loading</span>
      <svg className="ld-svg" width="100%" height="100%" aria-hidden="true" focusable="false">
        <defs>
          <mask id="ld-hole">
            <rect x="0" y="0" width="100%" height="100%" fill="#fff" />
            {/* The hole is the mark's own counter. The reference opens the 4
                that already sits in the negative space between its L and its N
                — the number is not cut to, it is what the logo was holding all
                along. These are subpaths two and three of the construction
                above, under the identical transform, so the aperture starts as
                exactly the slots the monogram was drawn with. */}
            <g ref={holeOut} opacity="0">
              <g ref={holeIn}>
                <g ref={stemL}>
                  <path d={SLOT_L} fill="#000" />
                </g>
                {/* Anchored. The gap closes onto this one. */}
                <path d={SLOT_R} fill="#000" />
              </g>
            </g>
          </mask>
        </defs>
        {/* These two are the only var() references outside the stylesheet, and
            that is precisely why they broke: renaming --acid to --signal in the
            CSS left this one behind, and an undefined var() in a `fill` falls
            back to black rather than erroring. The loader was a black screen
            for three commits and every verification missed it, because they all
            wait for the loader to finish before screenshotting. */}
        <rect x="0" y="0" width="100%" height="100%" fill="var(--signal)" mask="url(#ld-hole)" />
        <g ref={inkOut} opacity="0">
          <g ref={inkIn}>
            <path d={MARK_CONSTRUCTION} fill="var(--ink)" fillRule="evenodd" />
          </g>
        </g>
      </svg>
      {/* The full name rather than a loading verb. the reference site's his loader label works
          because the surname alone is the brand; without that, "load" is just a
          word describing what a loader does, which the loader is already
          visibly doing. The name is the thing worth reading in the two seconds
          it is on screen. */}
      <p className="ld-label" aria-hidden="true">
        {SITE.name}
      </p>
    </div>
  );
}
