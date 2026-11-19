// Lusion's "Featured Work" entrances (their HomeFeaturedSection.update), for
// the home page's "Selected work" heading. Once the section is on screen,
// each part plays as it comes on screen:
//  - the title's letters rise from 1em below, turned 10 degrees, into place,
//    each over 2/3 of a second, 1/30 of a second apart;
//  - the note's lines slide up out of their own masks, each over a second,
//    1/20 of a second apart;
//  - the button rises from 150% below, turned 10 degrees, fading in, over a
//    second.
// All in their ease (cubic-bezier(0.35, 0, 0, 1)). They start again once the
// section has gone off screen and comes back. On phones (812px and under)
// they don't play, as on theirs.
import { gsap } from 'gsap';
import { SplitText } from 'gsap/SplitText';
import { reducedMotion } from './env.js';
import { fit, lusionEase } from './projectZoom.js';

gsap.registerPlugin(SplitText);

const MOBILE = 812;

export function setupFeatured(section) {
  const title = section?.querySelector('.featured-head__title');
  const note = section?.querySelector('.featured-head__note');
  const cta = section?.querySelector('.grid-more .cta');
  if (!title || reducedMotion()) return () => {};

  let chars = [];
  let lines = [];
  let split = [];
  const parts = {
    title: { el: title, time: 0, on: false, max: 2 },
    note: { el: note, time: 0, on: false, max: 2 },
    cta: { el: cta, time: 0, on: false, max: 1 },
  };
  let needsReset = true;

  const unsplit = () => {
    split.forEach((s) => s.revert());
    split = [];
    chars = [];
    lines = [];
  };
  const doSplit = () => {
    unsplit();
    if (innerWidth <= MOBILE) return;
    const t = SplitText.create(title, { type: 'words,chars' });
    split.push(t);
    chars = t.chars;
    if (note) {
      const n = SplitText.create(note, { type: 'lines', mask: 'lines' });
      split.push(n);
      lines = n.lines;
    }
  };
  doSplit();

  // Their _reset: everything back below its mask, not playing.
  const reset = () => {
    needsReset = false;
    Object.values(parts).forEach((p) => {
      p.time = 0;
      p.on = false;
    });
    [...chars, ...lines].forEach((el) => (el.style.transform = 'translate3d(0, 100%, 0)'));
    if (cta && innerWidth > MOBILE) {
      cta.style.transform = 'translate3d(0, 150%, 0) rotate(10deg)';
      cta.style.opacity = '0';
    }
  };

  const onScreen = (el) => {
    const r = el.getBoundingClientRect();
    return r.top < innerHeight && r.bottom > 0;
  };

  const tick = (time, deltaMs) => {
    const dt = Math.min(deltaMs / 1000, 0.1);
    if (!onScreen(section)) {
      needsReset = true;
      return;
    }
    if (needsReset) reset();
    for (const p of Object.values(parts)) {
      if (!p.el) continue;
      if (!p.on && p.el.getBoundingClientRect().top < innerHeight) p.on = true;
      p.time = Math.min(p.max, Math.max(0, p.time + (p.on ? dt : -dt)));
    }
    const mobile = innerWidth <= MOBILE;
    if (!mobile) {
      chars.forEach((el, c) => {
        const k = parts.title.time * 1.5 - c / 20;
        el.style.transform = `translate3d(0, ${fit(k, 0, 1, 1, 0, lusionEase)}em, 0) rotate(${fit(k, 0, 1, 10, 0, lusionEase)}deg)`;
      });
      lines.forEach((el, c) => {
        el.style.transform = `translate3d(0, ${fit(parts.note.time - c / 20, 0, 1, 100, 0, lusionEase)}%, 0)`;
      });
    }
    if (cta) {
      if (mobile) {
        cta.style.transform = '';
        cta.style.opacity = '';
      } else {
        const t = parts.cta.time;
        cta.style.transform = `translate3d(0, ${fit(t, 0, 1, 150, 0, lusionEase)}%, 0) rotate(${fit(t, 0, 1, 10, 0, lusionEase)}deg)`;
        cta.style.opacity = String(lusionEase(t));
      }
    }
  };
  gsap.ticker.add(tick);

  let wide = innerWidth;
  const onResize = () => {
    if (innerWidth === wide) return;
    wide = innerWidth;
    doSplit();
  };
  addEventListener('resize', onResize);

  return () => {
    gsap.ticker.remove(tick);
    removeEventListener('resize', onResize);
    unsplit();
    if (cta) {
      cta.style.transform = '';
      cta.style.opacity = '';
    }
  };
}
