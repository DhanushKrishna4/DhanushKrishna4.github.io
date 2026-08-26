import { useEffect, useRef } from 'react';
import { gsap, ScrollTrigger, reduced, reveal } from '../lib/motion';
import { EXPERIENCE, SKILLS, STACK_ROW, FACTS } from '../data/site';

/**
 * Track record, on the sage ground — the third value in the page's sequence,
 * sitting between the paper of About and the signal of the footer so the run of
 * light sections never repeats the same tone twice.
 *
 * The stack row at the foot is the reference site's PARTNERS & CAMPAIGNS logo wall. His is
 * brands; the honest equivalent on a portfolio is what the work is actually
 * built with, set as wordmarks rather than as invented logos.
 */
export default function Record() {
  const root = useRef<HTMLElement>(null);

  useEffect(() => {
    if (!root.current) return;
    /* Not gated on reduced motion the way the rest of this file is. The sage
       ground used to be this section's own background, so it existed whether
       anything animated or not; now that it lives on the shared canvas, an
       early return here means a reader with reduced motion never sees sage at
       all — a whole ground quietly deleted. The fade is the animation; the
       ground is not. */
    const tone = getComputedStyle(document.documentElement);
    const ground = document.querySelector<HTMLElement>('.ground-light');
    const paper = tone.getPropertyValue('--paper').trim();
    const sage = tone.getPropertyValue('--sage').trim();

    const ctx = gsap.context(() => {
      if (reduced()) {
        /* The ground still changes, it just changes at the join instead of
           across it — which is exactly what this looked like before any of
           this, when the two sections carried their own colours.

           'top top', the same point the scrubbed version finishes at, NOT the
           point it starts at. At 'top bottom' the swap fires the moment this
           section's top clears the bottom of the window, which is with most of
           About still on screen — so About went sage while you were reading it.
           Caught by sampling the rendered pixels; the computed value looked
           fine either way. */
        if (ground) {
          ScrollTrigger.create({
            trigger: root.current,
            start: 'top top',
            onEnter: () => gsap.set(ground, { backgroundColor: sage }),
            onLeaveBack: () => gsap.set(ground, { backgroundColor: paper }),
          });
        }
        return;
      }

      reveal('.rec-row', {
        y: 24,
        opacity: 0,
        duration: 0.8,
        ease: 'power3.out',
        stagger: 0.08,
        scrollTrigger: { trigger: '.rec-list', start: 'top 82%' },
      });

      /* The ground arrives by changing colour rather than by starting.
         His grounds have no edges at all — the page colour is scrubbed from one
         to the next across the whole of the incoming section, so by the time you
         notice the ground has changed you cannot point at where it did.

         Measured on his, sampling the modal pixel of the frame every 200px:
         #282c20 held, then 6, 22, 37, 51, 63, 73, 80, 88, 92, 96, 98, 100 per
         cent of the way to paper. It runs from his section's top meeting the
         top of the window to its bottom meeting the bottom, and he carries it
         on `body`.

         Ours is carried on .ground-light, the one fixed canvas both this
         section and About are transparent over. That is the same idea as his
         `body` and it is what makes the join edgeless for free: there is only
         one ground to change, so there is never a moment where two of them
         disagree. An earlier version tinted the two sections in step, which
         works and is two things that have to be kept in step forever.

         No ease set, which is deliberate rather than an omission. His curve
         decelerates, and 0/6/22/37/51/63/73/80/88/92/96/98/100 is GSAP's
         default power1.out almost exactly. Passing ease: 'none' — the usual
         reflex with a scrub — would give a straight ramp and lose it.

         The colours are read rather than named because GSAP cannot interpolate
         a var().

         The range is his shape but not his points, because his section is three
         and a half screens tall and this one is barely over one. He runs
         top-top to bottom-bottom, 2243px of scrub, and the last screenful of
         his section is solidly the new colour. The same two points here span
         80px and read as a snap. Enter-to-bottom-bottom fixes the snap and
         breaks something else: the fade only finishes at the very last 80px, so
         the section you are actually reading is paper nearly all the way down
         and the sage never arrives.

         Enter-to-top-top is the pair that keeps both properties. It is a full
         window of scroll, and it completes exactly as the section finishes
         filling the screen — so this reads as a sage section, with the change
         spent entirely on the join above it. */
      if (!ground) return;
      gsap.fromTo(
        ground,
        { backgroundColor: paper },
        {
          backgroundColor: sage,
          scrollTrigger: {
            trigger: root.current,
            start: 'top bottom',
            end: 'top top',
            scrub: true,
          },
        },
      );
    }, root);
    return () => ctx.revert();
  }, []);

  return (
    <section className="sec" id="record" data-tone="light" data-ground="light" ref={root}>
      <div className="wrap">
        <header className="sec-title">
          <p className="eyebrow">Where I have worked</p>
          <h2 className="sec-head lockup">
            <span className="a">Track</span>
            <span className="b">Record</span>
          </h2>
        </header>

        <div className="rec-list">
          {EXPERIENCE.map((r) => (
            <div className="rec-row" key={r.title + r.org}>
              <div className="rec-when">{r.period}</div>
              <h3 className="rec-what">
                {r.title}
                <span className="rec-org">{r.org}</span>
              </h3>
              <p className="rec-blurb">{r.blurb}</p>
            </div>
          ))}
        </div>

        <dl className="skills">
          {SKILLS.map((s) => (
            <div className="skill" key={s.k}>
              <dt>{s.k}</dt>
              <dd>{s.v.join(' · ')}</dd>
            </div>
          ))}
          <div className="skill">
            <dt>Education</dt>
            <dd>{FACTS.education}</dd>
          </div>
          <div className="skill">
            <dt>Certified</dt>
            <dd>{FACTS.certs}</dd>
          </div>
        </dl>

        <ul className="row" style={{ marginTop: '3.5rem' }} aria-label="Built with">
          {STACK_ROW.map((s) => (
            <li key={s}>{s}</li>
          ))}
        </ul>
      </div>
    </section>
  );
}
