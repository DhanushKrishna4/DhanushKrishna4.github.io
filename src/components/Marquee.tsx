import { useEffect, useRef } from 'react';
import { gsap, reduced } from '../lib/motion';
import { MARQUEE } from '../data/site';
import Mark from './Mark';
import Signature from './Signature';

/**
 * The band: two lines travelling against each other behind the panel, with the
 * signature drawing over the top of both.
 *
 * The travel is on a clock, not on the scroll. The comment that used to sit here
 * said the opposite in some detail — that an autoplaying marquee is the most
 * dated effect on the web, that tying it to scroll makes it a second axis the
 * reader controls, and that this is why the reference site's reads as expensive. Confidently
 * argued and simply not what he does.
 *
 * Settled by holding the scroll still on his page and watching: 16% of the
 * pixels in a band of his text change every half second with nothing touched.
 * Both lines run at a steady 127 px/s, against each other, forever — see SPEED
 * below for how that number was got wrong once first.
 */
/** Pixels a second, measured off his.
 *
 * 127, not the 224 this said for two commits. The first figure came from
 * cross-correlating screenshots, and the elapsed time in that measurement was
 * computed as the midpoint of one capture window minus the midpoint of the
 * other — which quietly drops half the screenshot latency and inflates every
 * reading by the same factor. About 1.75x at the intervals I was using, which
 * happened to land his number on top of our own, so the two agreed and I stopped
 * looking.
 *
 * Timed from the two captures' start instants instead, his reads -129, -126,
 * -130 px/s at three different intervals, and ours reads -217, -223, -225 —
 * matching what the DOM says our transform is doing, which is the check that
 * says the method is right this time. Dhanush could see it; ours was running at
 * very nearly twice his. */
const SPEED = 127;
/* His is much slower on a phone, and it is not the same number as his desktop:
   measured at 393x735 he runs 38 px/s, and at 1280x800 he runs 108. Ours is one
   constant at either width by design — see the note on duration below — so his
   holds a roughly fixed TIME to cross and lets the rate follow the viewport,
   where we hold a fixed rate and let the time follow.

   Only the narrow figure is taken here. Desktop is left at 127 against his 108,
   because that is a 15% difference nobody has asked about and changing it was
   not the request.

   Measured by cross-correlating a horizontal strip of the rendered text between
   frames, bounded to +/-70px so a repeating line cannot alias onto the wrong
   copy — an earlier unbounded search reported 300 px/s for a track the DOM said
   was doing 129. His marquee has no DOM to read: it is drawn inside the
   full-screen gl-canvas, which is also why elementFromPoint returns the canvas
   and no selector finds the words. The method was checked against ours first,
   where it read 126 against a known 129. */
const SPEED_NARROW = 38;
const speedNow = () => (window.innerWidth <= 620 ? SPEED_NARROW : SPEED);

export default function Marquee() {
  const root = useRef<HTMLElement>(null);

  useEffect(() => {
    const el = root.current;
    if (!el || reduced()) return;

    /* Waits for the fonts before measuring. The duration is derived from the
       track's width, and on mount that width is the fallback face's rather than
       Mona Sans and Bodoni — a different distance would mean a different speed.

       Not a fix for anything. I added it believing it explained a reading of
       382 px/s against his 224, and it did not: that number was my measurement
       aliasing, cross-correlating our much larger type onto the wrong letter.
       Read off the DOM instead, the travel is -229 px/s against his -224 and
       always was. The guard stays because measuring layout before the webfont
       lands is wrong on its own terms, not because it changed anything here. */
    let ctx: gsap.Context | null = null;
    let dead = false;
    const build = () => {
      if (dead || !root.current) return;
      ctx = gsap.context(() => {
        /* Duration from the measured width rather than a fixed number of
           seconds, so the speed is the same at any viewport: a track twice as
           long has to take twice as long to cross. Half the width, because the
           words are duplicated — travelling exactly one copy leaves the next
           copy where the first began, and the loop point is invisible. */
        const spin = (sel: string, back: boolean) => {
          const t = el.querySelector<HTMLElement>(sel);
          if (!t) return;
          const half = t.getBoundingClientRect().width / 2;
          if (half < 1) return;
          gsap.fromTo(
            t,
            { xPercent: back ? -50 : 0 },
            { xPercent: back ? 0 : -50, ease: 'none', duration: half / speedNow(), repeat: -1 },
          );
        };
        spin('.mq-a', false);
        spin('.mq-b', true);

        /* The label first, the mark well into it — not the other way round, which
           is what ours was doing. Measured on his by counting ink in each box
           across the scroll:

             label   first char moves at 630, last settles at 820
             mark    nothing until 740, appears at 760, full by 800

           So his mark starts about 63% of the way through the label's run and is
           done before the last letters have landed. Ours had the mark starting
           at 62% of the viewport and the text at 64%, so the mark led and
           finished first — the exact inverse. */
        /* Resolved to elements, not selector strings. gsap.context scopes lookups
           to this section, and the eyebrow is a SIBLING of it — the same trap
           the hero's trigger fell into, and with the same symptom: no warning,
           no error, and every character sitting at ty 0 forever. */
        const band = el.closest('.open');
        const chars = band?.querySelectorAll('.eb-char');
        const ebMark = band?.querySelector('.open-eyebrow svg');
        if (band && chars?.length && ebMark) {
          gsap.fromTo(
            chars,
            { yPercent: 100 },
            {
              yPercent: 0,
              ease: 'power2.out',
              stagger: 0.012,
              scrollTrigger: { trigger: band, start: 'top top-=70%', end: 'top top-=91%', scrub: 0.5 },
            },
          );
          gsap.fromTo(
            ebMark,
            { autoAlpha: 0, y: 10 },
            {
              autoAlpha: 1, y: 0, ease: 'power2.out',
              scrollTrigger: { trigger: band, start: 'top top-=78%', end: 'top top-=85%', scrub: 0.5 },
            },
          );
        }
      }, el);
    };

    if (!document.fonts || document.fonts.status === 'loaded') build();
    else void document.fonts.ready.then(build).catch(build);

    return () => {
      dead = true;
      ctx?.revert();
    };
  }, []);

  /* One sentence across two lines, which is his arrangement: a serif line in
     the accent above a heavy sans line in bone, running against each other. */
  const all = MARQUEE.split(' ');
  const lines = [all.slice(0, 4), all.slice(4)];

  return (
    <>
    {/* No data-tone. It used to carry one, and it has to lose it now that it is
        pinned onto the same band as the hero: lib/tone.ts picks whichever
        tagged section is under the bar, and an olive section sitting under the
        paper hero from scroll 0 made the bar go light over a light ground — the
        wordmark simply vanished at the top of the page. The opening band drives
        the tone itself from the shrink (see Hero.tsx), and the olive section
        below takes it back afterwards.

        `on-dark` stays: that is the contour field asking which ground it is on,
        which is a different question and still answered olive. */}
    <section className="mq on-dark" aria-label="Statement" ref={root}>
      {lines.map((ws, li) => (
        <div className={`mq-track ${li === 0 ? 'mq-a' : 'mq-b'}`} key={li} aria-hidden="true">
          {[...ws, ...ws, ...ws, ...ws, ...ws, ...ws].map((w, i) => (
            <span className="mq-word" key={i}>
              {w}
            </span>
          ))}
        </div>
      ))}
      <p className="visually-hidden">{MARQUEE}</p>

      {/* The plate that used to sit here — an empty outline and a caption
          admitting it was empty — is gone, and not as a tidy-up: the hero panel
          now lands on that exact box and holds the object, which is what his
          does too. His shrinking picture comes to rest on his marquee's own
          target. Leaving the outline behind put a placeholder and its caption
          underneath a panel that had already filled the slot. */}
    </section>

    {/* His "MESSAGE FROM <name>" — the monogram and a line of small caps centred
        above the panel, naming what the band is. Measured off his: the mark's
        box starts at 16.7% of the viewport and is 30px tall, the label sits 17px
        under it at 8.33px, and both hold still while everything else moves.

        The label's characters roll up out of a clipped line rather than fading.
        His `.char` spans read ty 8.3 through the first two thirds of the pin and
        ty 0.1 after it — one line-height, which is the same mechanism as the
        letters in his buttons.

        The words are the one thing here that is a judgement rather than a
        measurement: his band is a message from him and says so, and ours is a
        line about the work in Dhanush's own voice, so it takes the same form. */}
    <div className="open-eyebrow" aria-hidden="true">
      <Mark height={30} />
      <span className="eb-line">
        {[...'MESSAGE FROM DHANUSH'].map((c, i) => (
          <span className="eb-char" key={i} style={{ '--i': i } as React.CSSProperties}>
            {c === ' ' ? '\u00a0' : c}
          </span>
        ))}
      </span>
    </div>

    {/* Outside the band rather than inside it, which is not a preference.
        `position: sticky` makes a stacking context whatever its z-index, so
        anything inside the marquee is sealed under the hero panel — the
        signature drew, and drew BEHIND the thing it is supposed to be signing.
        Only the edges of it showed, around the panel. As a sibling it can sit
        over both, which is where his is in every frame. */}
    <div className="open-sig" aria-hidden="true">
      <Signature />
    </div>
    </>
  );
}
