// Project pages (Lusion's): the write-up on the left, then scrolling moves the
// page sideways through the images. At the end the next project peeks in;
// keep scrolling to fill its bar and it opens.
// Arriving from a card (show) and leaving for one (hide) follow Lusion's
// project page; see core/projectZoom.js for the whole open and close.
import { gsap } from 'gsap';
import { mountCommon } from './common.js';
import { isSmall, reducedMotion, clamp } from '../core/env.js';
import { scrollY } from '../core/scroll.js';
import { run, fit, expoOut, expoInOut, textIn, textOut, setBack, SHOW, HIDE } from '../core/projectZoom.js';
import { createGallery } from '../gl/gallery.js';

export function mountProject(root, { router, gl }) {
  const common = mountCommon(root, { gl });
  const track = root.querySelector('[data-track]');
  const rail = root.querySelector('[data-rail]');
  const intro = root.querySelector('[data-project-intro]');
  const nextPanel = root.querySelector('[data-next-panel]');
  const bar = root.querySelector('[data-next-bar]');
  const hint = root.querySelector('[data-scroll-hint]');
  const media = [...root.querySelectorAll('[data-media]')];
  // Lusion's gallery items (their ProjectDetailsItem): when one comes into
  // view it opens over a second (expo out). Its rounded frame grows from 60%
  // of its size to full, from the middle, as the picture inside settles from
  // a 1/0.6 zoom. Once out of view it resets, so coming back plays it again.
  // A picture shows only once it has loaded, fading in over a second.
  const items = media.map((fig) => ({
    fig,
    frame: fig.querySelector('.media__frame'),
    el: fig.querySelector('img, video'),
    hero: fig.classList.contains('media--hero'),
    t: 0,
    open: -1,
    ready: reducedMotion() ? 1 : 0,
    loaded: false,
  }));
  if (!reducedMotion()) {
    items.forEach((it) => {
      if (!it.el) return;
      it.el.style.opacity = '0';
      const done = () => (it.loaded = true);
      if (it.el.tagName === 'VIDEO') {
        if (it.el.readyState >= 2) done();
        else it.el.addEventListener('loadeddata', done, { once: true });
      } else if (it.el.complete && it.el.naturalWidth) done();
      else it.el.addEventListener('load', done, { once: true });
    });
  }
  // How far the gallery moved since the last frame, as a share of the screen
  // (Lusion's scrollViewDelta): sideways on wide screens, down on phones.
  let moved = 0;
  let lastPos = null;
  let railX = 0; // the gallery's sideways offset, set by tick (below)
  const reveal = (time, deltaMs) => {
    const pos = isSmall() ? scrollY() / innerHeight : railX / innerWidth;
    moved = lastPos === null || reducedMotion() ? 0 : pos - lastPos;
    lastPos = pos;
    if (reducedMotion()) return;
    const dt = Math.min(deltaMs / 1000, 0.1);
    for (const it of items) {
      const r = it.fig.getBoundingClientRect();
      const inView = r.right > 0 && r.left < innerWidth && r.bottom > 0 && r.top < innerHeight;
      it.t = inView ? it.t + dt : 0;
      const open = 0.6 + 0.4 * expoOut(Math.min(1, it.t));
      if (Math.abs(open - it.open) > 0.0002) {
        it.fig.style.setProperty('--open', open >= 1 ? '1' : open.toFixed(4));
        it.open = open;
      }
      if (it.el && it.loaded && it.ready < 1) {
        it.ready = Math.min(1, it.ready + dt);
        it.el.style.opacity = it.ready >= 1 ? '' : it.ready.toFixed(3);
      }
    }
  };
  gsap.ticker.add(reveal);
  // With WebGL the gallery is drawn there, through Lusion's screen pass. It
  // moves the rail into place itself before measuring the pictures (place,
  // below), as the engine draws before this page's own ticker step runs.
  const gallery =
    gl && items.length
      ? gl.add(createGallery(gl, items, { root, host: rail, clip: track, motion: () => moved, vertical: isSmall, place: () => place() }))
      : null;

  // The clip of the demo in use plays on its own, muted and looping; for
  // anyone who prefers less motion it waits, with controls, at its first frame.
  root.querySelectorAll('[data-media-video]').forEach((v) => {
    if (reducedMotion()) {
      v.removeAttribute('autoplay');
      v.pause();
      v.controls = true;
    } else v.play?.().catch(() => {});
  });

  // Extra scroll after the gallery ends; filling it opens the next project.
  const OVERSCROLL = () => innerHeight * 0.55;
  let max = 0;
  let opened = false;

  const measure = () => {
    if (isSmall()) {
      track.style.height = '';
      rail.style.transform = '';
      return;
    }
    max = Math.max(0, rail.scrollWidth - innerWidth);
    track.style.height = `${max + innerHeight + OVERSCROLL()}px`;
  };
  measure();
  addEventListener('resize', measure);

  // The rail where the scroll has it, and how far into the extra scroll the
  // page is (0..1). The same all frame, so running it twice does no harm.
  let over = 0;
  const place = () => {
    if (isSmall()) return;
    const top = track.getBoundingClientRect().top + scrollY();
    const local = scrollY() - top;
    const x = clamp(local, 0, max);
    rail.style.transform = `translate3d(${-x}px,0,0)`;
    railX = x;
    intro.style.opacity = String(clamp(1 - x / (innerWidth * 0.45), 0, 1));
    if (hint) hint.style.opacity = String(clamp(1 - x / 200, 0, 1));
    over = clamp((local - max) / OVERSCROLL(), 0, 1);
    bar?.style.setProperty('--p', over.toFixed(3));
  };
  const tick = () => {
    if (isSmall()) return;
    place();
    if (over >= 0.995 && !opened) {
      opened = true;
      router?.go(root.querySelector('[data-project]').dataset.next, { trigger: nextPanel });
    }
  };
  gsap.ticker.add(tick);

  // Lusion's parts of the page, in the order they arrive.
  const title = root.querySelector('.project__title');
  const body = root.querySelector('.project__body');
  const cta = root.querySelector('.project__launch');
  const side = [...root.querySelectorAll('.project__side > div')];
  const lines = gl?.field?.uniforms?.uFade;
  // A part rising 30px into place as it fades in (T: 0..1, already eased).
  const rise = (el, T) => {
    if (!el) return;
    el.style.opacity = T >= 1 ? '' : String(T);
    el.style.transform = T >= 1 ? '' : `translate3d(0, ${((1 - T) * 30).toFixed(2)}px, 0)`;
  };

  return {
    // Its images open one by one as they come into view (reveal, above).
    intro() {
      common.intro();
    },
    // Arriving from its card (their ProjectDetailsSection, over 1s): nothing
    // in the first half, then the page fades in while the title slides up
    // from the middle of the screen (expo in-out, done by 0.65) and the
    // write-up (0.4 to 0.85), the button (0.45 to 0.9) and the two halves of
    // the details (0.5 to 0.95, 0.55 to 1) rise 30px into place (expo out).
    // The images fade in with the page, and the contour lines with them.
    show() {
      common.settle();
      const t = title.getBoundingClientRect();
      const centre = innerHeight / 2 - (t.top + t.height / 2);
      return run(SHOW, (r) => {
        const page = textIn(r);
        root.style.opacity = r >= 1 ? '' : String(page);
        title.style.transform = r >= 1 ? '' : `translate3d(0, ${fit(r, 0, 0.65, centre, 0, expoInOut).toFixed(2)}px, 0)`;
        rise(body, fit(r, 0.4, 0.85, 0, 1, expoOut));
        rise(cta, fit(r, 0.45, 0.9, 0, 1, expoOut));
        side.slice(0, 2).forEach((el) => rise(el, fit(r, 0.5, 0.95, 0, 1, expoOut)));
        side.slice(2).forEach((el) => rise(el, fit(r, 0.55, 1, 0, 1, expoOut)));
        media.forEach((m) => (m.style.opacity = r >= 1 ? '' : String(page)));
        if (lines) lines.value = page;
        setBack(r);
      });
    },
    // Leaving for its card: the page is gone by halfway through 1s, the
    // lines and the Back pill with it.
    hide() {
      return run(HIDE, (h) => {
        root.style.opacity = String(textOut(h));
        if (lines) lines.value = textOut(h);
        setBack(1 - h);
      });
    },
    destroy() {
      common.destroy();
      gsap.ticker.remove(tick);
      gsap.ticker.remove(reveal);
      gl?.remove(gallery);
      removeEventListener('resize', measure);
    },
  };
}
