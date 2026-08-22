import { useEffect, useRef } from 'react';
import { gsap, ScrollTrigger, reduced } from '../lib/motion';
import { STATEMENT } from '../data/site';

/* His three numbers, off the bundle. The line's clip and the block's retreat are
   the same length, and the block starts at LINE/2 — halfway through the clip —
   which is what makes the block look like the leading edge of one wipe rather
   than two animations that happen to overlap. */
const LINE = 0.6;
const BLOCK = 0.6;
const STAGGER = 0.15;

/**
 * The thesis, set as the page's largest type.
 *
 * the reference site alternates a Didone in his accent against a heavy grotesk in bone, and
 * the alternation carries the meaning rather than a rhythm — the emphasised
 * words are the ones worth emphasising. Same rule here: the serif italic falls
 * on "cloud" and "air-gapped", which are the two words the whole site is about.
 *
 * The reveal is his `data-anim-high` mechanism, which is two moves per line:
 *
 *   the line   clip-path inset(0 100% 0 0) -> inset(0 0% 0 0), power2.out
 *   the block  scaleX 1 -> 0 from the RIGHT edge, power2.inOut, at LINE/2
 *
 * The text is never hidden by opacity and never moves. It sits under a solid
 * block of #b2c73a the whole time, and what you watch is the block leaving. The
 * clip opening from the left makes the block appear to grow out of nothing, and
 * then the block's own left edge overtakes it and the words come out behind.
 * One wipe, two elements.
 *
 * It fires once, at a threshold, and runs to the end on its own clock — nothing
 * about it is scrubbed, so scrolling on, back, or not at all makes no difference
 * once it has started, and it never plays backwards. That is `once: true` doing
 * the work rather than a `toggleActions` string, which would re-fire on the way
 * back down.
 */
export default function Statement() {
  const root = useRef<HTMLElement>(null);
  /* His trigger is the block that holds the lines, not the section around it.
     The section is a full screen tall with its own padding, so measuring "top
     90%" off it would fire the cascade most of a screen early. */
  const lines = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    const host = lines.current;
    if (!host) return;
    const rows = gsap.utils.toArray<HTMLElement>(host.querySelectorAll('.st-line'));
    if (!rows.length) return;

    /* The start state lives in CSS so the first paint is already covered. Doing
       it here instead means one frame of finished text before the effect runs,
       which on a reveal this large is the whole surprise given away. The cost is
       that CSS has to be the thing that un-hides it for reduced motion too. */
    if (reduced()) {
      gsap.set(rows, { clipPath: 'inset(0 0% 0 0)' });
      gsap.set(host.querySelectorAll('.st-hl'), { scaleX: 0 });
      return;
    }

    const tl = gsap.timeline({ paused: true });
    rows.forEach((row, i) => {
      const at = i * STAGGER;
      tl.to(row, { clipPath: 'inset(0 0% 0 0)', duration: LINE, ease: 'power2.out' }, at);
      tl.to(
        row.querySelector('.st-hl'),
        { scaleX: 0, duration: BLOCK, ease: 'power2.inOut' },
        at + LINE / 2,
      );
    });

    const st = ScrollTrigger.create({
      trigger: host,
      start: 'top 90%',
      once: true,
      onEnter: () => tl.play(),
    });

    return () => {
      st.kill();
      tl.kill();
    };
  }, []);

  return (
    <section
      className="sec t-olive on-dark stick-item"
      data-tone="dark"
      ref={root}
      aria-label="What the work is"
    >
      <div className="wrap st">
        <h2 ref={lines}>
          {/* The lines are clipped and covered, which hides them from sight but
              not from a screen reader — it would read the statement twice. This
              carries it once, and the visible copy is hidden from the tree. */}
          <span className="visually-hidden">{STATEMENT.map((l) => l.t).join(' ')}</span>
          <span aria-hidden="true" style={{ display: 'block' }}>
            {STATEMENT.map((l, i) => (
              <span className="st-row" key={i}>
                <span className={`st-line${l.em ? ' em' : ''}`}>
                  {l.t}
                  {/* His is created in script and appended; ours is in the
                      markup, so the covered state is the one that ships rather
                      than one JS has to apply before the first frame. */}
                  <span className="st-hl" />
                </span>
              </span>
            ))}
          </span>
        </h2>
      </div>
    </section>
  );
}
