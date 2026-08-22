import { useCallback, useEffect, useRef, useState } from 'react';
import { reduced } from '../lib/motion';
import { SITE } from '../data/site';
import Mark from './Mark';
import { MARK_MS, MARK_REST, markAt } from '../lib/mark';
import Menu from './Menu';
import Roll from './Roll';

/**
 * Fixed wordmark left, actions right — the reference site's exact arrangement, and the
 * arrangement is doing real work: the mark is the only thing on screen at every
 * scroll position, so it is what makes six different grounds read as one site.
 *
 * Three items, and the monogram is centred on the page rather than between the
 * other two — the wordmark and the actions are different widths, so a flex row
 * would put it off-centre by half their difference.
 *
 * The right-hand side is two controls and no more: one accent button and a
 * toggle. The four section links used to sit out here beside them, which is the
 * ordinary portfolio answer and reads as busier than the reference for a reason
 * worth naming — a bar with one accent button on it has one obvious thing to
 * press, and a bar with six items has none. The links are in the panel now.
 *
 * Colour comes from the section currently under the bar, tracked in lib/tone.ts.
 * See the note there for why this is not `mix-blend-mode: difference`, which is
 * the obvious answer and fails twice.
 */
export default function Nav() {
  const [open, setOpen] = useState(false);
  /* The panel leaves differently from how it arrives — his small-caps text is
     wiped out under an accent bar on the way out and simply is not on the way
     in — so the exit needs a state of its own. `open` going false is not enough:
     it is the absence of a state, and there is nothing to hang an exit
     animation on. */
  const [closing, setClosing] = useState(false);
  const toggle = useRef<HTMLButtonElement>(null);
  const timer = useRef(0);

  const close = useCallback(() => {
    setOpen(false);
    setClosing(true);
    window.clearTimeout(timer.current);
    /* His close is the open timeline reversed at 1.5x — 1.9s over 1.5, where
       the 1.9 is the timeline's full length rather than the point its last
       visible tween ends. The sheet itself starts retracting at 0.733s and runs
       0.533s. Clearing early snaps the panel away mid-retract. Held as a number
       here rather than read back off an animationend, because a panel with a
       dozen staggered children fires a dozen of those and the last one is not
       reliably the panel's own. */
    timer.current = window.setTimeout(() => setClosing(false), 1320);
  }, []);
  useEffect(() => () => window.clearTimeout(timer.current), []);

  /* The mark is driven here rather than by CSS. Keyframing the `d` property
     works in Chromium and does nothing at all in WebKit — CSS.supports('d')
     is false in Safari 26 — so the morph was dead on Safari while looking
     perfect in every capture I took. Writing the attribute on each frame has no
     engine dependency.

     Reduced motion gets the end state without the journey, which is the whole
     point of the preference. */
  const barA = useRef<SVGPathElement>(null);
  const barB = useRef<SVGPathElement>(null);
  useEffect(() => {
    if (!open && !closing) return;
    const a = barA.current;
    const b = barB.current;
    if (!a || !b) return;
    const paint = (p: number) => {
      const [da, db] = markAt(p);
      a.setAttribute('d', da);
      b.setAttribute('d', db);
    };
    if (reduced()) {
      paint(open ? 1 : 0);
      return;
    }
    let raf = 0;
    const t0 = performance.now();
    const tick = (now: number) => {
      const k = Math.min(1, (now - t0) / MARK_MS);
      paint(open ? k : 1 - k);
      if (k < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [open, closing]);

  /* The mark lives in the bar and the panel owns `menu-open`, so the exit needs
     its own flag on the same element for the reversed keyframes to hang off. */
  useEffect(() => {
    document.body.classList.toggle('menu-closing', closing);
    return () => document.body.classList.remove('menu-closing');
  }, [closing]);

  return (
    <>
      <header className="nav">
        {/* Typeset rather than the drawn logotype, to match the reference's
            lockup: a Didone over a heavy grotesk, uppercase, tight leading, the
            two lines set to the same optical width. His the two-line wordmark is
            exactly this and it is the most recognisable thing about that site.

            What this gives up is worth naming. The drawn wordmark's KRISHNA
            begins with the monogram's own K — the same drawing, not a font's
            approximation of it — and that link is gone the moment this is type.
            The mark itself still carries it, in the bar and in the loader.

            The link carries the label, so the type is decorative here and a
            screen reader reads the name once rather than twice. */}
        <a className="nav-mark" href="#top" aria-label={`${SITE.name} — top of page`}>
          <span className="lockup" aria-hidden="true">
            <span className="a">{SITE.first}</span>
            <span className="b">{SITE.last}</span>
          </span>
        </a>

        {/* Centred, exactly where the reference site's L7 sits. It is the one element on the
            bar that is the mark rather than the name, so it holds the middle and
            the wordmark holds the corner. Decorative: the wordmark beside it
            already says who this is, so labelling it would make a screen reader
            read the name twice. */}
        {/* 35px, which is his L7's measured height. The two marks have opposite
            proportions — his is taller than wide, ours is wider than tall — so
            only one dimension can match, and height is the one that sets how
            big a mark reads. Ours comes out 52 wide against his 32. */}
        <a className="nav-badge" href="#top" tabIndex={-1} aria-hidden="true">
          <Mark height={35} />
        </a>

        <div className="nav-right">
          {/* His STORE button: a soft-cornered rectangle rather than a pill,
              icon left, heavy and tight. The icon is a document because the
              thing on the other end is a PDF, and it opens in a new tab. */}
          <a
            className="btn btn-signal"
            href={SITE.resume}
            target="_blank"
            rel="noopener noreferrer"
            /* The label is split into letters below, so it carries its name
               here instead — a per-character span tree is not something to make
               a screen reader walk. */
            aria-label="Résumé"
          >
            {/* Sized to his bag, measured at 15 x 19 with a 2px stroke. Ours was
                13 x 14 at 1.4, which is why it read as a smaller icon in a
                bigger button. */}
            <svg width="16" height="19" viewBox="0 0 16 19" fill="none" aria-hidden="true">
              <path
                d="M1 2.1A1.1 1.1 0 0 1 2.1 1h6.6L15 7.6v9.3a1.1 1.1 0 0 1-1.1 1.1H2.1A1.1 1.1 0 0 1 1 16.9V2.1Z"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinejoin="round"
              />
              <path d="M8.5 1.4v6.2h6.2" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
            </svg>
            {/* The shared component rather than its own copy of the same
                markup. This button and the footer links had grown two separate
                implementations of one gesture, on two different clocks, and
                nothing about either looked wrong on its own. */}
            <Roll>Résumé</Roll>
          </a>

          <button
            ref={toggle}
            className="btn btn-ghost btn-icon"
            aria-expanded={open}
            aria-controls="site-menu"
            onClick={() => (open ? close() : setOpen(true))}
          >
            <span className="visually-hidden">{open ? 'Close menu' : 'Open menu'}</span>
            {/* The plate that wipes over the outline on scroll. A real element
                rather than a third pseudo: ::before is the hover disc and
                ::after is the outline, and this has to sit BETWEEN the outline
                and the mark, which pseudo-element paint order cannot give. */}
            <span className="btn-plate" aria-hidden="true" />
            {/* His mark, and it is not a hamburger.

                Measured row by row inside the button rather than read off a
                zoom, which is how the previous two attempts got it wrong. In
                the toggle's 48px inner box his bars are:

                  top     left 22, right 35   length 14
                  bottom  left 11, right 24   length 14

                Both the *same* length, staggered horizontally — top to the
                right, bottom to the left. It reads as an equals sign pulled
                apart on the diagonal, which is why it looks like a mark rather
                than a menu icon.

                Re-measured at 3x with sub-pixel edges, because the 1x pass
                rounded the lengths to whole pixels and reported 14 against our
                13 as a match:

                  length     his 14.61   ours was 13.50
                  thickness  his ~2.50   ours was 3.00
                  stagger    his 11.00   ours was 10.50

                Two paths rather than one, because on hover they move toward
                each other — and because they are also the X. */}
            {/* One SVG that becomes the close mark, rather than two that swap.
                A swap is a cut: the bars are there on one frame and an X on the
                next. In his, the strokes travel — they rotate and cross while
                the panel is still coming down, and the intermediate frames show
                them mid-way at an angle, which is only possible if it is the
                same two strokes throughout. The numbers that turn one into the
                other are in the stylesheet. */}
            {/* Square box now, because the strokes need room to curl through
                the middle of the morph — the bars themselves keep exactly the
                geometry measured off his, centred in it. The `d` of each comes
                from the stylesheet so it can be keyframed. */}
            <svg className="ico ico-bars" viewBox="0 0 60 60" fill="none" aria-hidden="true">
              <path className="bar bar-a" ref={barA} d={MARK_REST[0]} stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
              <path className="bar bar-b" ref={barB} d={MARK_REST[1]} stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
            </svg>
          </button>
        </div>
      </header>

      <Menu open={open} closing={closing} onClose={close} toggleRef={toggle} />
    </>
  );
}
