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
    }, root);
    return () => ctx.revert();
  }, []);

  return (
    <section className="sec" id="about" data-tone="light" ref={root}>
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
          <div className="pr-body" data-ab>
            {ABOUT.map((p, i) => (
              <p key={i}>{p}</p>
            ))}
          </div>

          <div>
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
