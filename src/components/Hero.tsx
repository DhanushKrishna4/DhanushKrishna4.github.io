import { useEffect, useRef } from 'react';
import { SITE } from '../data/site';
import { gsap, ScrollTrigger, reduced } from '../lib/motion';
import Contours from './Contours';
import Core from './Core';
import Mark from './Mark';

/**
 * Hero.
 *
 * Composition is the whole item, and it is the thing the previous site got
 * wrong: its 3D object crossed its own wordmark in acid wireframe with glowing
 * text behind it. the reference site's helmet never crosses "the reference site" and never covers
 * the face, at any cursor position — that restraint is free and it is most of
 * the difference.
 *
 * It now goes further than restraint. There is no headline and no standfirst
 * here at all, because his hero has neither: the picture is the message, the
 * name is a mark in the corner, and the only words on the screen are one small
 * card holding the one fact that changes. A portfolio feels like it has to
 * introduce itself in the first screen, and resisting that is most of what
 * separates the two pages.
 *
 * What was removed and where it went. The display name is the wordmark on the
 * bar, which says it at every scroll position rather than once. The standfirst
 * — "Final-year CS student. I build machine-learning systems for places the
 * cloud can't reach." — is not re-homed anywhere, because both halves of it
 * already exist further down verbatim: the statement band shouts MACHINE
 * LEARNING FOR PLACES THE CLOUD CAN'T REACH, and the about copy opens "I'm a
 * final-year Computer Science student at BITS Pilani Dubai". Moving it would
 * have put the same sentence on the page twice.
 *
 * The <h1> stays as a visually-hidden heading. The name has to be the document
 * heading for search and for anyone navigating by headings; it does not have to
 * be 5rem of type in the middle of the picture.
 */
/* The object rides the shrink down rather than being cropped by it. His plane
   scales its picture into the panel, so the whole portrait is still there at
   the end; clipping alone left ours showing a corner of the crystal. 0.62 is
   the panel's own share of the viewport, near enough, and the small lift keeps
   the object centred in a panel whose middle sits at 48% rather than 50%. */
/* Where the panel ends up, as insets from each edge of the viewport.

   Off the running page now rather than off a frame. His panel is a WebGL plane
   that comes to rest on a DOM proxy — .marquee-gl-target — so the box is
   readable exactly: x484..956, y298..603 in a 1440x900 viewport, which is
   33.6% in from each side and 33.1 / 33.0 top and bottom.

   The frame reading had it at 30.5 / 34.1, which put our centre at 48.2% where
   his is dead centre at 50.0%. Not much, and enough to see side by side. */
const END = { t: 33.1, x: 33.6, b: 33.0, r: 0 };

/* What the panel becomes. His plate is not the photograph at full strength in a
   smaller box — it is desaturated, darkened and flattened until it sits down
   into the olive instead of punching out of it. Measured inside his box against
   inside ours:

                     his              ours before
     mean       rgb(88,93,78)     rgb(148,161,92)
     saturation      16.1%             35.4%
     luminance      63..176            0..252

   Ours was a white plate with a near-black object on it: the highest contrast on
   the page, sitting exactly where his has the lowest. Swept against those
   numbers, this lands at rgb(87,88,82) — his mean almost exactly, which is what
   makes the plate sit down into the ground rather than punch out of it.

   The sepia and the hue-rotate are there for a cast, not for warmth. Neutral
   grey on olive reads cold, and his does not: his plate runs green over red over
   blue because it is a photograph of a face.

   What cannot be matched, and is worth saying rather than faking: his plate
   holds 16% saturation and ours reaches about 6. His chroma comes from skin
   tones. Ours is a white ground with a grey object on it and is very nearly
   achromatic to begin with — no amount of saturate() invents colour that is not
   there, and tinting hard enough to reach 16 would stop being his colour and
   start being a green wash over the object. */
const FX = { sat: 0.45, sep: 0.5, con: 0.52, bri: 0.66 };

export default function Hero() {
  const root = useRef<HTMLElement>(null);

  useEffect(() => {
    const el = root.current;
    if (!el || reduced()) return;

    /* Driven from a scrubbed proxy rather than by tweening the clip-path
       string. GSAP will happily interpolate `inset(0% 0% 0% 0%)`, and stops
       being reliable the moment a `round` is on the end of it — which is the
       part that matters here, because the corners rounding off as the panel
       contracts is most of what makes it read as a panel rather than a crop. */
    /* Resolved to an element, not left as a selector string. gsap.context scopes
       selector lookups to its second argument — this section — and `.open` is
       this section's PARENT, so the string never matched anything inside the
       scope. GSAP warned and fell back to the viewport, which by luck starts at
       the same scroll position and made the shrink look correct while being
       anchored to nothing. It would have come apart the moment anything was
       added above the hero. */
    const band = el.closest('.open') ?? el;

    const ctx = gsap.context(() => {
      const p = { v: 0 };
      const nav = document.querySelector('.nav');
      gsap.to(p, {
        v: 1,
        ease: 'none',
        scrollTrigger: {
          trigger: band,
          start: 'top top',
          /* Seven tenths of a screen. His panel has finished contracting around
             650 of a 900 viewport and spends the rest of the pin drifting up. */
          end: '+=70%',
          scrub: 0.6,
        },
        onUpdate: () => {
          const k = p.v;
          el.style.setProperty('--ct', `${END.t * k}%`);
          el.style.setProperty('--cx', `${END.x * k}%`);
          el.style.setProperty('--cb', `${END.b * k}%`);
          el.style.setProperty('--cr', `${END.r * k}px`);
          /* The bar is over olive long before the hero stops being under it, and
             lib/tone.ts cannot see that: its trigger for this section fired once
             at the top and stays active for the whole pin. Written directly
             here, and handed back the moment the marquee's own trigger takes
             over below. */
          /* Early, and deliberately before there is anything for it to be
             legible against. His flips within the first 75px of a 900 viewport
             and spends the next 150px white on a still-paper hero. I had this at
             0.28, waiting for the panel's top edge to clear the bar so the
             wordmark was always readable, and that is a different animation: his
             bar changes with the scroll, mine changed with the panel.

             0.035 of a 70%-of-viewport range — about 22px in, where 0.08 put it
             at 50. Both the wordmark's colour and the toggle's outline wipe hang
             off this one flag, so they move together, which they should: on his
             they are one theme change. */
          nav?.setAttribute('data-tone', k > 0.035 ? 'dark' : 'light');
          /* The canvas too, on the same flag. This is the one section without a
             single ground — it starts paper and turns olive under the fog — so a
             static data-ground cannot describe it, and this overrides the one
             tone.ts set on entry. */
          if (root.current) root.current.dataset.ground = k > 0.035 ? 'olive' : 'paper';
          /* The picture scales WITH the panel, it is not cropped by it.

             The panel ends at 472x305 in a 1440x900 viewport — 0.328 of the
             width — and the content has to travel the same distance or the
             panel is just a window closing over a scene that never moved. Ours
             went to 0.62 against the panel's 0.328, so the crystal stayed very
             nearly its full size while the box came down around it, which is
             exactly what Dhanush described as cropping in.

             At 0.328 the object fills the shrunken panel the way it filled the
             screen, which is what his portrait does. */
          el.style.setProperty('--fs', String(1 - 0.672 * k));
          el.style.setProperty('--sat', String(1 - (1 - FX.sat) * k));
          el.style.setProperty('--sep', String(FX.sep * k));
          el.style.setProperty('--con', String(1 - (1 - FX.con) * k));
          el.style.setProperty('--bri', String(1 - (1 - FX.bri) * k));
          /* No lift any more. It existed to keep a half-scaled object inside a
             panel it did not fit; scaled properly about the panel's own centre
             there is nothing to correct. */
        },
      });

      ScrollTrigger.refresh();
    }, el);
    return () => ctx.revert();
  }, []);

  return (
    <section className="hero" id="top" data-tone="light" data-ground="paper" ref={root}>
      <Contours seed={3} count={9} />

      {/* The mobile identity block: monogram, one-line wordmark, one line of
          fact. Off on desktop, where the wordmark lives in the bar.

          In the hero rather than in the nav because the reference's SCROLLS —
          checked at 390 wide, his wordmark is gone by 700px of scroll while his
          store button and toggle stay put, so only those two are fixed. Putting
          it in the bar would have pinned a large centred wordmark over
          everything below it.

          aria-hidden: the hero already carries a visually-hidden <h1> with the
          same name and role, and this is a second copy of it. */}
      <div className="hero-id" aria-hidden="true">
        <Mark height={30} />
        <span className="lockup hero-id-mark">
          <span className="a">{SITE.first}</span>
          <span className="b">{SITE.last}</span>
        </span>
        <p className="hero-id-sub">
          {SITE.school} · Class of {SITE.year}
        </p>
      </div>

      <div className="hero-figure">
        <Core />
      </div>

      <div className="hero-inner">
        <h1 className="visually-hidden">
          {SITE.name} — {SITE.role}
        </h1>

        <div className="hero-foot">
          {/* the reference site's NEXT RACE card, in its shape and its structure: the corner
              cut, a label in the top left, then everything else centred in a
              stack divided by hairline rules, ending on an emblem and a line of
              small caps. His holds the next thing in his calendar; this holds
              the current thing in a career, which is the same kind of fact —
              the one on the page most likely to be out of date. */}
          <div className="status">
            {/* The outline is drawn rather than bordered, because the card has
                to be transparent — his is `rgba(0,0,0,0)` and the contour field
                runs straight through it — and a transparent shape with rounded
                corners *and* a cut-out cannot be made from a border. The
                two-stacked-clips trick this used before needs an opaque fill by
                construction: the inner layer's whole job is to hide the outer
                one except for a 1px sliver.

                Geometry is his: a rounded rectangle with a tab taken out of the
                top left, the two top edges joined by an S rather than a step,
                and the label sitting in the cut-out rather than inside the
                card. viewBox matches the card's rendered size so the corners
                stay circular; `non-scaling-stroke` keeps the hairline at 1px
                whatever the box does.

                The path is inset half a stroke from the viewBox on every side,
                and that half-pixel is not tidiness. Drawn on the boundary, the
                outer half of every stroke falls outside the SVG viewport and is
                clipped away — measured at 0.5px on the left, right and top and
                0.35 along the bottom, against a full 1px on the tab's top edge,
                which is the one segment that runs through the interior. The
                outline came out visibly thinner on its outside than on its
                inside. */}
            <svg
              className="status-frame"
              viewBox="0 0 310 211"
              preserveAspectRatio="none"
              aria-hidden="true"
            >
              <path
                d="M0.5 200.5 L0.5 36 A10 10 0 0 1 10.5 26 L94 26 C107 26 107 0.5 120 0.5 L299.5 0.5 A10 10 0 0 1 309.5 10.5 L309.5 200.5 A10 10 0 0 1 299.5 210.5 L10.5 210.5 A10 10 0 0 1 0.5 200.5 Z"
                vectorEffect="non-scaling-stroke"
              />
            </svg>
            <div className="status-in">
              <p className="status-k">Currently</p>
              <p className="status-v">
                {SITE.role}
                <br />
                {SITE.location}
              </p>
              <p className="status-sub">{SITE.available}</p>
              <p className="status-emblem" aria-hidden="true">
                <Mark height={20} />
              </p>
              <p className="status-foot">
                {SITE.school}
                <br />
                Class of {SITE.year}
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
