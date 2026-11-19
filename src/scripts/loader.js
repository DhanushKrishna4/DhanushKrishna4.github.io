// The first-visit loader: Active Theory's (their LoaderView and LoaderGLUI),
// in our red. While the page loads:
//  - a 220px square of slashes, cut to a circle, types itself out row by row
//    with the progress, 12 times a second; on every other tick 30 of its
//    characters turn into digits of the count;
//  - the count over its middle ("//5", "/42", ">>>" at 100) changes between
//    three tints 24 times a second;
//  - the WebGL ring and glowing bars (gl/loaderScene.js) fade in over half a
//    second and follow the progress.
// Progress, as theirs: each part of the load that finishes moves the count
// to 90% of the share done, linearly over half a second. Once everything has
// loaded, the slashes and the count fade over two seconds, the count runs to
// 100 (">>>") in 0.3s, the backdrop turns and fades away in 0.5s, and the
// site appears. No click is needed to enter.
import { gsap } from 'gsap';
import { html, wait } from './core/env.js';
import { createLoaderScene } from './gl/loaderScene.js';

// Their 16 rows of 30 slashes (each row break shows as a space, so a row is
// one unbreakable run, wider than the square).
const SLASHES = ('/'.repeat(30) + '\n').repeat(16);
// Their count's tints, turned to our red like the rest (see .loader).
const TINTS = ['#d186aa', '#e8acc9', '#d97794'];
// Their font's letters are 0.5796em wide, plus 0.1em spacing. Whatever
// monospace face the system has is spaced to the same 0.6796em a letter.
const ADVANCE = 0.5796 + 0.1;

const spaceLikeTheirs = (el) => {
  const cs = getComputedStyle(el);
  const size = parseFloat(cs.fontSize);
  const ctx = document.createElement('canvas').getContext('2d');
  ctx.font = `${cs.fontWeight} ${size}px ${cs.fontFamily}`;
  el.style.letterSpacing = `${(ADVANCE * size - ctx.measureText('/').width).toFixed(3)}px`;
};

export async function runLoader(engine, { ready = Promise.resolve() } = {}) {
  const behind = document.querySelector('[data-loader-behind]');
  const count = document.querySelector('[data-loader-count]');
  spaceLikeTheirs(behind);
  spaceLikeTheirs(count);
  const text = { percent: 0 };
  const scene = engine.add(createLoaderScene(engine, () => text.percent));
  const u = scene.uniforms;

  // Their two text loops.
  let tick = 0;
  const drawSlashes = () => {
    tick++;
    let s = SLASHES.slice(0, Math.round(text.percent * SLASHES.length));
    if (s.length && tick % 2 === 0) {
      const digits = String(Math.round(100 * text.percent));
      const chars = s.split('');
      for (let i = 0; i < 30; i++) chars[Math.floor(Math.random() * s.length)] = digits.charAt(Math.floor(Math.random() * digits.length));
      s = chars.join('');
    }
    behind.textContent = s;
  };
  const drawCount = () => {
    count.style.color = TINTS[Math.floor(Math.random() * TINTS.length)];
    const p = Math.round(100 * text.percent);
    count.textContent = p < 10 ? `//${p}` : p < 100 ? `/${p}` : '>>>';
  };
  let next12 = 0;
  let next24 = 0;
  const loop = (time) => {
    if (time >= next12) {
      next12 = time + 1 / 12;
      drawSlashes();
    }
    if (time >= next24) {
      next24 = time + 1 / 24;
      drawCount();
    }
  };
  gsap.ticker.add(loop);

  // Timed as theirs on a quick visit (measured on their site, from when the
  // count appears): the count runs to 30 from 0.03s and to 60 from 0.88s,
  // and the last part (our fonts and first images) lands no sooner than
  // 1.48s, when it eases on to 100. Their backdrop comes up about 1.23s in (it
  // waits for their 3D world), fading in over half a second.
  const start = performance.now();
  gsap.to(u.uAlpha, { value: 1, duration: 0.5, ease: 'sine.out', delay: 1.23 });
  const parts = [
    wait(35),
    wait(880),
    Promise.race([ready, wait(4000)]).then(() => wait(Math.max(0, 1485 - (performance.now() - start)))),
  ];
  let done = 0;
  await Promise.all(
    parts.map((part) =>
      part.then(() => {
        done++;
        gsap.to(text, { percent: (0.9 * done) / parts.length, duration: 0.5, ease: 'none', overwrite: 'auto' });
      }),
    ),
  );

  // Loaded.
  gsap.to(behind, { opacity: 0, duration: 2, ease: 'sine.out' });
  gsap.to(count, { opacity: 0, duration: 2, ease: 'sine.inOut' });
  await gsap.to(text, { percent: 1, duration: 0.3, ease: 'sine.out', overwrite: 'auto' });
  gsap.to(u.uVisible, { value: 0, duration: 0.5, ease: 'power2.in' });
  await gsap.to(u.uAlpha, { value: 0, duration: 0.5, ease: 'power2.in', overwrite: 'auto' });

  gsap.ticker.remove(loop);
  engine.remove(scene);
  try {
    sessionStorage.setItem('dk:loaded', '1');
  } catch (e) {}
  html.classList.remove('is-loading');
}
