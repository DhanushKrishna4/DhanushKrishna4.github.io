// Opening and closing a project the way Lusion does, with their timings
// (their ProjectsPage, ProjectItemList, ProjectPage and PageManager code).
//
// Opening: the list leaves over 1.5s. Its text fades out over the first half.
// From a quarter of the way in, the whole grid of cards zooms toward the card
// you clicked (cubic in-out), until that card's image is 1.2 times the size
// that would cover the screen, centred, and turned a little toward the side
// it sat on. As it closes in, the image dissolves into the project's colour.
// Then the project page arrives over 1s (project.js): nothing shows in the
// first half; in the second the page fades in as the title, the write-up,
// the button and the details rise into place one after another.
//
// Closing (Back): the project page leaves over 1s, its text gone by halfway.
// Then the list arrives over 1.5s: the card, filling the screen in the
// project's colour, zooms back out into its place over the first three
// quarters, and the list's text fades in over the second half.
import { gsap } from 'gsap';

// Their helpers: fit maps v from a..b onto c..d (clamped), through an ease.
export const fit = (v, a, b, c, d, ease) => {
  let t = Math.min(1, Math.max(0, (v - a) / (b - a)));
  if (ease) t = ease(t);
  return c + (d - c) * t;
};
export const cubicInOut = (t) => ((t *= 2) < 1 ? 0.5 * t * t * t : 0.5 * ((t -= 2) * t * t + 2));
export const expoOut = (t) => (t === 1 ? 1 : 1 - 2 ** (-10 * t));
export const expoInOut = (t) => (t === 0 ? 0 : t === 1 ? 1 : (t *= 2) < 1 ? 0.5 * 1024 ** (t - 1) : 0.5 * (2 - 2 ** (-10 * (t - 1))));

// A CSS-style cubic-bezier(x1, y1, x2, y2) easing.
export function bezier(x1, y1, x2, y2) {
  const at = (t, a, b) => ((1 - 3 * b + 3 * a) * t + (3 * b - 6 * a)) * t * t + 3 * a * t;
  const slope = (t, a, b) => 3 * (1 - 3 * b + 3 * a) * t * t + 2 * (3 * b - 6 * a) * t + 3 * a;
  return (x) => {
    if (x <= 0) return 0;
    if (x >= 1) return 1;
    let t = x;
    for (let i = 0; i < 8; i++) {
      const s = slope(t, x1, x2);
      if (Math.abs(s) < 1e-6) break;
      t -= (at(t, x1, x2) - x) / s;
    }
    let lo = 0;
    let hi = 1;
    for (let i = 0; i < 30 && Math.abs(at(t, x1, x2) - x) > 1e-6; i++) {
      if (at(t, x1, x2) > x) hi = t;
      else lo = t;
      t = (lo + hi) / 2;
    }
    return at(t, y1, y2);
  };
}
// Their ease.lusion.
export const lusionEase = bezier(0.35, 0, 0, 1);

// Calls step(r) every frame as r runs from 0 to 1 over `duration` seconds,
// evenly (their page tweens have no easing of their own).
export function run(duration, step) {
  return new Promise((done) => {
    const o = { r: 0 };
    step(0);
    gsap.to(o, {
      r: 1,
      duration,
      ease: 'none',
      onUpdate: () => step(o.r),
      onComplete: () => {
        step(1);
        done();
      },
    });
  });
}

export const OPEN = 1.5; // the list leaving toward a project
export const SHOW = 1; // a project page arriving
export const HIDE = 1; // a project page leaving
export const CLOSE = 1.5; // the list arriving back from a project

// How far the card has zoomed in, from how far the list has gone (their
// fit(activeRatio, 0, 0.75, 1, 0)): nothing until a quarter of the way.
export const zoomFor = (listShown) => fit(listShown, 0, 0.75, 1, 0);
// A page's text while it leaves or arrives this way: gone by halfway out,
// back from halfway in.
export const textOut = (r) => fit(r, 0, 0.5, 1, 0);
export const textIn = (r) => fit(r, 0.5, 1, 0, 1);

// The Back pill, as theirs: it rises 1em into place and fades in over the
// first quarter of the page's second half (expo out), and leaves the same way.
export function setBack(shown) {
  const pill = document.querySelector('[data-back]');
  if (!pill) return;
  const c = fit(shown, 0.5, 1, 0, 1);
  const u = fit(c, 0, 0.5, 0, 1, expoOut);
  pill.style.transform = u >= 1 ? '' : `translate3d(0, ${(1 - u).toFixed(3)}em, 0)`;
  pill.style.opacity = u >= 1 ? '' : String(u);
}
