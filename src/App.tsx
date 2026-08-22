import { useCallback, useEffect, useState } from 'react';
import { initScroll, initAnchors } from './lib/scroll';
import { initNavTone } from './lib/tone';
import { ScrollTrigger } from './lib/motion';

import Loader from './components/Loader';
import Contours from './components/Contours';
import Nav from './components/Nav';
import Hero from './components/Hero';
import Marquee from './components/Marquee';
import Statement from './components/Statement';
import Work from './components/Work';
import About from './components/About';
import Record from './components/Record';
import Contact from './components/Contact';
import ScrollIndicator from './components/ScrollIndicator';

/**
 * The order is the argument, and it is the reference site's order rather than a
 * portfolio's usual one.
 *
 * A portfolio normally runs name → about → work → contact. the reference site's runs name →
 * a statement shouted sideways → what he stands for → the gallery → the story →
 * the people he works with → the sign-off, and the difference is that the work
 * arrives while you are still interested rather than after two screens of
 * explanation. So: the gallery comes before the biography here too.
 *
 * The grounds alternate deliberately — paper, olive, olive, ink, paper,
 * sage, signal. No value repeats consecutively except the two olive sections,
 * which are one idea split across a band and a statement and read as a single
 * stretch.
 */
export default function App() {
  const [booting, setBooting] = useState(true);
  const onDone = useCallback(() => setBooting(false), []);

  useEffect(() => {
    const stopScroll = initScroll();
    const stopAnchors = initAnchors();
    const stopTone = initNavTone();
    /* Web fonts land after first paint and move every trigger under them. */
    document.fonts?.ready.then(() => ScrollTrigger.refresh());
    return () => {
      stopTone();
      stopAnchors();
      stopScroll();
    };
  }, []);

  return (
    <>
      {booting && <Loader onDone={onDone} />}
      <a className="skip" href="#work">
        Skip to the work
      </a>
      <Nav />
      {/* Outside <main>, because it reports on the whole document rather than
          belonging to any part of it — and it has to sit above every ground. */}
      <ScrollIndicator />
      <main>
        {/* The light ground: ONE canvas, fixed to the window, sitting under
            everything. About and Record paint nothing of their own — this is
            what you see through them.

            Fixed rather than sticky, and that is the whole point of it. Sticky
            would have this slide up into view as its run arrived, which is the
            ink handing over to the paper. Fixed means the paper is already
            there, unmoved, behind the ink the entire time, and the ink simply
            leaves — the reverse of the olive join, where the ink arrived over a
            held olive. Nothing about the paper moves at any point.

            It also makes the light run one field instead of two. About and
            Record each drew their own, which is a seam at the join between
            them, and a second seam every time the ground colour changed under
            a canvas that had already decided where its lines went. */}
        <div className="ground-light" aria-hidden="true">
          <Contours seed={2} count={9} />
        </div>
        {/* The olive runs from the top of the page to the end of the statement,
            and it is ONE ground with one field on it — not three sections that
            each draw their own.

            Two canvases meeting edge to edge on the same colour is a seam: the
            lines stop at the join because each generates its own noise, and
            nothing else changes there to hide it. His has no seam anywhere
            because his field is a single fixed canvas the whole page scrolls
            over — position: fixed, one viewport tall, z-index -1, and it never
            moves at any scroll position.

            Sticky rather than fixed, which is the same thing with an end on it:
            the field holds still for the length of this wrapper and then leaves
            with it, which is what it should do when the ground stops being
            olive.

            The opening sequence is still one thing inside it — the hero shrinks
            into a panel and the olive is revealed AROUND it, which only reads if
            the olive is already there to be revealed. */}
        {/* The olive-to-ink handover: the statement holds at the top of the
            window and the ink section scrolls up over it at 1:1. His mechanism
            exactly — see the note on .stick-item in the stylesheet. */}
        <div className="ground-olive">
          {/* The field needs a layer of its own. Sticky still takes its space in
              the flow, so the canvas on its own pushed everything below it down
              by a screen and added that to the document height. Absolute here,
              sticky inside — out of the flow, full height of the run, and still
              able to hold at the top of it. */}
          <div className="ground-field" aria-hidden="true">
            <div className="ground-field-in">
              <Contours seed={11} count={8} />
            </div>
          </div>
          <div className="open">
            <Hero />
            <Marquee />
          </div>
          <Statement />
          {/* The statement's runway. This has to be a real element in the flow:
              a sticky box may only travel inside its containing block, and the
              containing block of an in-flow child is its parent's CONTENT box.
              Padding on the run does not count — tried it, and the statement
              computed as sticky with 900px of padding beneath it and still held
              for exactly zero pixels. */}
          <div className="stick-run" aria-hidden="true" />
        </div>
        <Work />
        <About />
        <Record />
      </main>
      <Contact />
    </>
  );
}
