import { useEffect, useRef } from 'react';
import { gsap, reduced, reveal } from '../lib/motion';
import { ABOUT, ASIDE, PULL_QUOTE } from '../data/site';

/**
 * The story. the reference site's is "Since I was 7 years old…" set small beside a pull
 * quote in the serif and a scatter of archival photographs.
 *
 * The quote and the aside carry the weight here. The aside is his own words,
 * kept unpolished on purpose — the clipped run is the least fluent writing on
 * the page and that is exactly its value, because everything else is balanced
 * and being well made is what makes prose about oneself read as written by
 * somebody else.
 */
export default function About() {
  const root = useRef<HTMLElement>(null);

  useEffect(() => {
    if (!root.current || reduced()) return;
    const ctx = gsap.context(() => {
      reveal('[data-ab]', {
        y: 26,
        opacity: 0,
        duration: 0.9,
        ease: 'power3.out',
        stagger: 0.08,
        scrollTrigger: { trigger: root.current, start: 'top 78%' },
      });

      /* The ink hanging into the paper, deepening as the join comes up the
         screen. His numbers: the ellipse's vertical radius runs 0 to 100 while
         this section's top travels from the bottom of the window to 38% of the
         way up it, then holds. Measured off his at 0.1795% per pixel, dead
         linear — 0.18, 27.1, 54.0, 81.0, 100 at 150px intervals — which is why
         the ease is none.

         Worth saying what this is NOT. The join above this one holds the olive
         still and slides the ink over it. This one does nothing of the kind:
         his ink bottom and paper top sit at exactly the same y at every scroll
         position, both moving 1:1, and ours already did too. There is no pin
         here on his site and none here. The whole of the effect is this shape.

         clip-path rather than border-radius because the arc has to be wider
         than it is deep by a long way — 70% of the width against 8rem of height
         — and an elliptical corner radius cannot reach across the middle. */
      gsap.fromTo(
        '.visor',
        { clipPath: 'ellipse(70% 0% at 50% 0%)' },
        {
          clipPath: 'ellipse(70% 100% at 50% 0%)',
          ease: 'none',
          scrollTrigger: { trigger: root.current, start: 'top bottom', end: 'top 38%', scrub: true },
        },
      );

        /* The two columns converge as the block comes up the screen — his On
           Track / Off Track section, which brings its halves in from either side.

           Measured off his at 1440, letting the page settle at each position so
           any smoothing had finished. Both his pairs run to zero and neither is
           linear:

             scrollY   5700  5900  6000  6100  6300  6600
             text        28    15     9     3     0     0
             images      73    42    30    21     9     1

           offset = A x (1 - p)^2 lands on every one of those, which is a
           scrubbed power2.out — not the `ease: none` the visor above uses. Worth
           stating because a first read of the numbers looked like the decay of a
           lerp catching up. It is not: the values hold at each scroll position.

           His text columns travel 28 and his images 73. Ours are text, but here
           they ARE the content — there are no images carrying the section — so
           they take the larger figure. Capped in px rather than left as a vw so
           it cannot grow absurd on a wide monitor. */
        const travel = Math.min(72, window.innerWidth * 0.05);
        const mm = gsap.matchMedia();
        mm.add('(min-width: 900px)', () => {
          /* Only where .pr is actually two columns. Below that it is one column
             and a converge would be two blocks sliding about for no reason. */
          /* Each group is triggered on ITSELF, and starts at `top bottom` —
             the moment its own top reaches the bottom of the window, which is
             before any of it is on screen. Triggering the columns on .pr at
             `top 88%` meant the heading was long since read and the first
             paragraphs visible before anything moved, so it sat still and then
             set off. It has to already be moving by the time you see it.

             Two triggers rather than one because the heading and the columns
             enter at different times — the heading is the top of the section and
             the columns are most of a screen below it. On a single trigger the
             heading would finish converging before the columns had appeared. */
          const span = (trigger: string) =>
            ({ trigger, start: 'top bottom', end: 'top 55%', scrub: true }) as const;

          /* The heading is left-hand content, so it travels with the left
             column. .sec-title carries no data-ab of its own — the eyebrow and
             the lockup inside it do — so it can take the transform directly,
             the same arrangement as .pr-main and .pr-body. */
          gsap.fromTo('.sec-title', { x: -travel }, { x: 0, ease: 'power2.out', scrollTrigger: span('.sec-title') });
          gsap.fromTo('.pr-main', { x: -travel }, { x: 0, ease: 'power2.out', scrollTrigger: span('.pr') });
          gsap.fromTo('.pr-side', { x: travel }, { x: 0, ease: 'power2.out', scrollTrigger: span('.pr') });
        });
    }, root);
    return () => ctx.revert();
  }, []);

  return (
    <section className="sec" id="about" data-tone="light" data-ground="light" ref={root}>
      {/* The ink section's bottom edge, bulging down into this one. It belongs
          to this section rather than the one above because it has to sit ON the
          paper — it is ink painted over paper, not paper cut away. */}
      <span className="visor" aria-hidden="true" />
      <div className="wrap">
        <header className="sec-title">
          <p className="eyebrow" data-ab>
            The short version
          </p>
          <h2 className="sec-head lockup" data-ab>
            <span className="a">About</span>
            <span className="b">Dhanush</span>
          </h2>
        </header>

        <div className="pr">
          {/* The wrapper takes the converge, .pr-body keeps the reveal.
              Both on one element means two tweens writing the same
              transform and the reveal wins — which showed up as the left
              column sitting at 0 while the right sat at its full offset. */}
          <div className="pr-main">
            <div className="pr-body" data-ab>
              {ABOUT.map((p, i) => (
                <p key={i}>{p}</p>
              ))}
            </div>
          </div>

          <div className="pr-side">
            <blockquote className="quote" data-ab>
              “{PULL_QUOTE}”
            </blockquote>
            <div className="aside" data-ab>
              {ASIDE.map((p, i) => (
                <p key={i}>{p}</p>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
