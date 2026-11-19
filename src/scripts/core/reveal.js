// Text reveals, modelled on Lusion's "Bold Ideas, Brought to Life" heading:
// words sit inside masked lines and slide into place one after another,
// 0.1s apart, each taking about a second, fast through the middle and
// settling slowly (cubic-bezier(0.35, 0, 0, 1)).
import { gsap } from 'gsap';
import { SplitText } from 'gsap/SplitText';
import { CustomEase } from 'gsap/CustomEase';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { reducedMotion } from './env.js';

gsap.registerPlugin(SplitText, CustomEase, ScrollTrigger);
CustomEase.create('reveal', 'M0,0 C0.35,0 0,1 1,1');

const builders = {
  // Two-line heading. Line one rises from below and then slides into its
  // indent; line two drops in from above. Each line on screen gets its own
  // mask (a heading line that wraps, on narrower screens, would otherwise
  // show its first row's words sitting on its second row before they rise).
  // The masks clip only above and below, so words can slide into the indent,
  // and reach 0.14em below the line for the serif's descenders (.reveal-line-mask).
  lusion(el) {
    const lines = [...el.querySelectorAll('.line-mask')];
    const words = lines.map((line) => {
      const split = SplitText.create(line, { type: 'lines,words', mask: 'lines', tag: 'span', linesClass: 'reveal-line', wordsClass: 'word' });
      split.masks.forEach((mask) => {
        mask.style.overflowX = 'visible';
        mask.style.overflowY = 'clip';
      });
      return split.words;
    });
    const indent = lines[0] ? parseFloat(getComputedStyle(lines[0]).paddingLeft) || 0 : 0;
    const tl = gsap.timeline({ paused: true });
    if (words[0]) {
      tl.fromTo(words[0], { yPercent: 105 }, { yPercent: 0, duration: 1, ease: 'reveal', stagger: 0.1 }, 0);
      if (indent > 0) {
        tl.fromTo(words[0], { x: -indent }, { x: 0, duration: 0.8, ease: 'reveal', stagger: { each: 0.1, from: 'end' } }, 0.45);
      }
    }
    if (words[1]) {
      // From far enough up that descenders (0.11em below the line) are
      // hidden too before they drop in.
      tl.fromTo(words[1], { yPercent: -115 }, { yPercent: 0, duration: 1, ease: 'reveal', stagger: 0.1 }, 0.1 * (words[0]?.length ?? 0) * 0.6);
    }
    return tl;
  },

  // Big uppercase headings: letters rise with a small tilt that straightens.
  chars(el) {
    const split = SplitText.create(el, { type: 'lines,chars', mask: 'lines', charsClass: 'char' });
    return gsap
      .timeline({ paused: true })
      .fromTo(split.chars, { yPercent: 110, rotate: 10 }, { yPercent: 0, rotate: 0, duration: 1, ease: 'reveal', stagger: 0.03 });
  },

  // Paragraphs: a fast ripple of words fading up from almost invisible.
  ripple(el) {
    const split = SplitText.create(el, { type: 'words', wordsClass: 'word' });
    return gsap
      .timeline({ paused: true })
      .fromTo(split.words, { opacity: 0.08, yPercent: 60 }, { opacity: 1, yPercent: 0, duration: 1, ease: 'expo.out', stagger: 0.012 });
  },

  fade(el) {
    return gsap.timeline({ paused: true }).fromTo(el, { opacity: 0, y: 24 }, { opacity: 1, y: 0, duration: 1, ease: 'expo.out' });
  },
};

// Sets up every [data-reveal] inside root. Nothing plays until start() is
// called, so entrances wait for the loader or page transition to finish.
export function setupReveals(root) {
  const items = [];
  if (reducedMotion()) return { start() {}, finish() {}, destroy() {} };

  root.querySelectorAll('[data-reveal]').forEach((el) => {
    const build = builders[el.dataset.reveal];
    if (!build) return;
    const tl = build(el);
    tl.progress(0).pause();
    items.push({ el, tl });
  });

  const triggers = [];
  return {
    start() {
      items.forEach(({ el, tl }) => {
        triggers.push(
          ScrollTrigger.create({
            trigger: el,
            start: 'top 92%',
            once: true,
            onEnter: () => tl.play(),
          }),
        );
      });
    },
    // Everything shown as it ends, at once (a page arriving with Lusion's
    // project transition fades in whole instead).
    finish() {
      items.forEach(({ tl }) => tl.progress(1).pause());
    },
    destroy() {
      triggers.forEach((t) => t.kill());
      items.forEach(({ tl }) => tl.kill());
    },
  };
}
