// Entry point. Starts smooth scrolling, the WebGL engine, the menu and the
// router, then plays the loader on a first visit and the page's entrance.
import { gsap } from 'gsap';
import { html, hasGL } from './core/env.js';
import { initScroll, scrollY } from './core/scroll.js';
import { createRouter, markCurrent } from './core/router.js';
import { fitLockup } from './core/lockup.js';
import { startClock } from './core/clock.js';
import { createMenu } from './menu.js';
import { setupRoll } from './core/roll.js';
import { picturesIn, fetchTheRest } from './core/pictures.js';
import { setupScrollIndicator } from './core/scrollIndicator.js';
import { mountPage } from './pages/index.js';

async function boot() {
  initScroll();
  fitLockup();
  startClock();
  markCurrent();

  let gl = null;
  let menuField = null;
  if (hasGL()) {
    try {
      const { createEngine } = await import('./gl/engine.js');
      gl = createEngine(document.getElementById('gl'));
      const { createMenuField } = await import('./gl/menuField.js');
      menuField = createMenuField(document.querySelector('[data-menu-gl]'));
    } catch (err) {
      console.warn('WebGL could not start; showing the plain site.', err);
      gl = null;
      html.classList.add('no-gl');
      html.classList.remove('is-loading');
    }
  }

  if (import.meta.env.DEV) {
    // Dev-only helpers for checking motion when the browser can't run
    // animation frames (for example a hidden preview pane).
    window.__gl = gl;
    window.__gsap = gsap;
    window.__run = async (ms) => {
      const end = performance.now() + ms;
      while (performance.now() < end) {
        gsap.ticker.tick();
        await new Promise((r) => setTimeout(r, 16));
      }
    };
    window.__snap = () => {
      const src = document.getElementById('gl');
      let c = document.getElementById('__snap');
      if (!c) {
        c = document.createElement('canvas');
        c.id = '__snap';
        c.style.cssText = 'position:fixed;inset:0;width:100%;height:100%;z-index:0;pointer-events:none';
        src.after(c);
      }
      c.width = src.width;
      c.height = src.height;
      gsap.ticker.tick();
      c.getContext('2d').drawImage(src, 0, 0);
    };
    window.__pointer = async (points) => {
      for (const [x, y] of points) {
        const p = gl.state.pointer;
        Object.assign(p, { x, y, nx: x / innerWidth, ny: 1 - y / innerHeight, moved: true, lastMove: gl.state.time });
        gsap.ticker.tick();
        await new Promise((r) => setTimeout(r, 30));
      }
    };
  }
  const menu = createMenu({ field: menuField });
  // The header lives outside the swapped page, so its links are set up once.
  setupRoll(document.querySelector('[data-header]'));
  // So does the scroll indicator that stands in for the browser's scroll bar.
  setupScrollIndicator();

  // The menu button appears once you scroll past the opening screen's top.
  gsap.ticker.add(() => html.classList.toggle('is-scrolled', scrollY() > innerHeight * 0.35));

  const ctx = { gl };
  const router = createRouter({
    gl,
    mount: (root, opts) => mountPage(root, { ...ctx, router, ...opts }),
    onLeave: async ({ samePage }) => {
      if (menu.isOpen) await menu.close({ immediate: !samePage, restoreFocus: samePage });
    },
  });

  const page = mountPage(document.getElementById('swap'), { ...ctx, router, first: true });
  router.setCurrent(page);

  const fontsReady = document.fonts.ready;
  // All the pictures this page loads straight away (core/pictures.js), each
  // sent to the graphics chip as it arrives; the loader waits for them.
  const pictures = picturesIn(document.getElementById('swap'));
  if (gl && html.classList.contains('is-loading')) {
    const { runLoader } = await import('./loader.js');
    await runLoader(gl, { ready: Promise.all([fontsReady, pictures]) });
    page.intro?.({ fromLoader: true });
  } else {
    html.classList.remove('is-loading');
    await fontsReady;
    page.intro?.({ fromLoader: false });
  }
  // Then the rest of the site's pictures, in the background.
  pictures.then(() => setTimeout(fetchTheRest, 1500));
}

boot();
