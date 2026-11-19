// Lando's full-screen menu, without his photos and helmet. The motion is his,
// read from his site's code: one timeline, played forward to open and
// backward at 1.5x speed to close.
//  0.00  the panel opens downward through a growing ellipse (0.8s, power3.out)
//  0.35  the links rise 20px through ellipses of their own, 0.08s apart
//        (0.6s, back.out(1.2))
//  0.40  the current page's wavy line draws (0.6s, power2.inOut; his offsets
//        it by 0.05s per link, so it follows the link's place in the list)
//  0.50  the tagline, "Get in touch" and the socials wipe in from the left,
//        15px up, 0.04s apart (0.7s, back.out(1.1)), each covered by a block
//        of the accent colour that shrinks away to the right from 0.70
//  0.60  the contour lines fade in (0.6s)
// His helmet drawing runs from 0.20 for 1.7s. It is kept as an empty stretch
// of the timeline, so closing waits as long as his before things reverse.
// At the top centre, his DK monogram behaves like Lando's LN4 mark (below).
import { gsap } from 'gsap';
import { html, reducedMotion, unhovered, PAGE_CHANGE } from './core/env.js';
import { lockScroll } from './core/scroll.js';
import { createHamburger } from './hamburger.js';
import { menuColours, pagePalette, OURS } from './core/palette.js';

// Lando's LN4 mark, for the DK monogram: a pen (thick strokes along centre
// lines, used as a mask) draws it in, un-draws it from its start, and draws
// the accent colour over it while hovered. His take 0.55-0.6s, ease in-out.
const PEN = { in: 0.6, out: 0.55, hover: 0.55, ease: 'power2.inOut' };

function createMark(mark) {
  if (!mark) return { show() {}, hide() {} };
  const pen = (kind) => {
    const paths = [...mark.querySelectorAll(`[data-mark="${kind}"]`)];
    const lens = paths.map((p) => p.getTotalLength());
    return { paths, lens, total: lens.reduce((x, y) => x + y, 0), a: 0, b: 0, tween: null };
  };
  const ink = pen('draw');
  const accent = pen('hover');
  // Shows the stretch [a, b] of the whole line. Each part dashes on its own
  // (a dash pattern restarts with every subpath), so each gets its share.
  const render = (pn) => {
    let start = 0;
    pn.paths.forEach((path, i) => {
      const from = Math.max(0, pn.a - start);
      const to = Math.min(pn.lens[i], pn.b - start);
      if (to - from > 0.01) {
        path.style.opacity = '1';
        path.style.strokeDasharray = `${to - from} ${pn.lens[i] + 100}`;
        path.style.strokeDashoffset = `${-from}`;
      } else path.style.opacity = '0';
      start += pn.lens[i];
    });
  };
  const reset = (pn) => {
    pn.tween?.kill();
    pn.a = pn.b = 0;
    render(pn);
  };
  // In: the end runs on to the finish. Out: the start runs after the end.
  const drawIn = (pn, duration, delay = 0) => {
    pn.tween?.kill();
    if (pn.a > 0) pn.a = pn.b = 0;
    if (reducedMotion()) {
      pn.b = pn.total;
      render(pn);
      return;
    }
    pn.tween = gsap.to(pn, { b: pn.total, duration, delay, ease: PEN.ease, onUpdate: () => render(pn) });
  };
  const drawOut = (pn, duration) => {
    pn.tween?.kill();
    if (reducedMotion() || pn.b <= 0) return reset(pn);
    pn.tween = gsap.to(pn, { a: pn.b, duration, ease: PEN.ease, onUpdate: () => render(pn), onComplete: () => reset(pn) });
  };

  let shown = false;
  let pointer = false;
  let focus = false;
  let lit = false;
  // The accent draws while the pointer is on the mark (not once a page
  // change has started, as on Lando's: core/env.js) or keyboard focus is.
  const sync = () => {
    const want = shown && ((pointer && !unhovered()) || focus);
    if (want === lit) return;
    lit = want;
    if (want) drawIn(accent, PEN.hover);
    else drawOut(accent, PEN.hover);
  };
  mark.addEventListener('pointerenter', (e) => {
    if (e.pointerType === 'touch') return;
    pointer = true;
    sync();
  });
  mark.addEventListener('pointerleave', (e) => {
    if (e.pointerType === 'touch') return;
    pointer = false;
    sync();
  });
  mark.addEventListener('focus', () => {
    focus = mark.matches(':focus-visible');
    sync();
  });
  mark.addEventListener('blur', () => {
    focus = false;
    sync();
  });
  addEventListener(PAGE_CHANGE, sync);

  return {
    // As the menu opens it draws itself (from 0.2s, once the panel is over it).
    show() {
      shown = true;
      drawIn(ink, PEN.in, 0.2);
    },
    hide(now = false) {
      shown = false;
      lit = false;
      if (now) {
        reset(ink);
        reset(accent);
        return;
      }
      drawOut(ink, PEN.out);
      drawOut(accent, PEN.out);
    },
  };
}

const SHUT = 'ellipse(120% 0% at 50% 0%)';
const OPEN = 'ellipse(120% 100% at 50% 20%)';


export function createMenu({ field = null } = {}) {
  const toggle = document.querySelector('[data-menu-toggle]');
  const menu = document.querySelector('[data-menu]');
  const panel = menu.querySelector('[data-menu-panel]');
  const lines = menu.querySelector('[data-menu-gl]');
  const links = [...menu.querySelectorAll('[data-menu-link]')];
  const waves = [...menu.querySelectorAll('.menu__wave path')];
  const highlights = [...menu.querySelectorAll('[data-menu-highlight]')];
  const blocks = highlights.map((el) => {
    const block = document.createElement('span');
    block.className = 'menu__block';
    block.setAttribute('aria-hidden', 'true');
    el.append(block);
    return block;
  });
  const ham = createHamburger(toggle);
  const mark = createMark(menu.querySelector('[data-menu-mark]'));
  let isOpen = false;
  let lastFocus = null;
  let restore = true;
  let waiting = []; // callers waiting for a close in progress to finish
  let focusLater = null;

  // The current page's link is inert, as on Lando's: no hover, no click, not
  // in the Tab order. Focus goes to the first link that leads somewhere.
  const focusables = () => [toggle, ...menu.querySelectorAll('a[href]:not([aria-current="page"])')];
  const firstLink = () => links.find((l) => !l.hasAttribute('aria-current'));
  menu.addEventListener('click', (e) => {
    if (e.target.closest('[data-menu-link][aria-current="page"]')) e.preventDefault();
  });

  // Once closed: hidden, scrolling back on, and focus back where it was.
  const finish = () => {
    html.classList.remove('menu-open');
    lockScroll(false);
    field?.stop();
    ham.settle();
    if (restore && lastFocus?.focus) lastFocus.focus({ preventScroll: true });
    release();
  };
  const release = () => {
    waiting.forEach((done) => done());
    waiting = [];
  };

  gsap.set(panel, { clipPath: SHUT });
  gsap.set(links, { clipPath: 'ellipse(30% 0% at 50% 0%)', y: 20 });
  gsap.set(lines, { autoAlpha: 0 });
  // His way: the dash is the line's real length (in its own units), offset
  // by that much to hide it. A length of 1 would be rounded to 0 or 1 px.
  // All four share one shape; hidden ones can measure 0 in some browsers.
  const waveLength = Math.max(433.2, ...waves.map((w) => w.getTotalLength()));
  gsap.set(waves, { strokeDasharray: waveLength, strokeDashoffset: waveLength });
  // His wipe is inset(0 100% 0 0) to inset(0 0% 0 0); the clip stays after
  // it, so it reaches a little below here to keep the links' hover underline.
  gsap.set(highlights, { clipPath: 'inset(0 100% -0.4em 0)', y: 15 });
  gsap.set(blocks, { scaleX: 1 });

  const helmet = { t: 0 };
  const tl = gsap
    .timeline({ paused: true, onReverseComplete: finish })
    .to(panel, { clipPath: OPEN, duration: 0.8, ease: 'power3.out' }, 0)
    .to(links, { clipPath: OPEN, y: 0, duration: 0.6, stagger: 0.08, ease: 'back.out(1.2)' }, 0.35)
    .to(helmet, { t: 1, duration: 1.7, ease: 'none' }, 0.2)
    .to(lines, { autoAlpha: 1, duration: 0.6 }, 0.6)
    .to(waves, { strokeDashoffset: 0, duration: 0.6, stagger: 0.05, ease: 'power2.inOut' }, 0.4)
    .to(highlights, { clipPath: 'inset(0 0% -0.4em 0)', y: 0, duration: 0.7, stagger: 0.04, ease: 'back.out(1.1)' }, 0.5)
    .to(blocks, { scaleX: 0, duration: 0.6, stagger: 0.05, ease: 'power2.inOut' }, 0.7);

  function setState(open) {
    isOpen = open;
    toggle.setAttribute('aria-expanded', String(open));
    toggle.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    ham.setOpen(open);
  }

  // The colours of the page it opens over (a project page's palette is on #swap).
  function takeColours() {
    const c = menuColours(pagePalette());
    const set = (el, name, value) => (value ? el.style.setProperty(name, value) : el.style.removeProperty(name));
    for (const [name, key] of [['--menu-bg', 'bg'], ['--menu-ink', 'ink'], ['--menu-accent', 'accent']]) set(menu, name, c?.[key]);
    for (const [name, key] of [['--menu-ink', 'ink'], ['--menu-accent', 'accent'], ['--menu-on', 'on']]) set(toggle, name, c?.[key]);
    field?.setColours?.(c?.bg ?? OURS.bg, c?.line ?? OURS.line);
  }

  function open() {
    if (isOpen) return;
    // Reopened while closing: carry on from where it is, and let anything
    // waiting on that close go ahead.
    if (html.classList.contains('menu-open')) release();
    else lastFocus = document.activeElement;
    takeColours();
    setState(true);
    html.classList.add('menu-open');
    lockScroll(true);
    field?.start();
    mark.show();
    focusLater?.kill();
    if (reducedMotion()) {
      tl.pause(tl.duration(), true);
      firstLink()?.focus({ preventScroll: true });
      return;
    }
    focusLater = gsap.delayedCall(0.55, () => firstLink()?.focus({ preventScroll: true }));
    tl.timeScale(1).play();
  }

  function close({ immediate = false, restoreFocus = true } = {}) {
    const closing = !isOpen && html.classList.contains('menu-open');
    if (!isOpen && !(closing && immediate)) {
      return closing ? new Promise((done) => waiting.push(done)) : Promise.resolve();
    }
    if (isOpen) setState(false);
    restore = restoreFocus;
    focusLater?.kill();
    mark.hide(immediate);
    if (immediate || reducedMotion()) {
      tl.pause(0, true);
      finish();
      return Promise.resolve();
    }
    return new Promise((done) => {
      waiting.push(done);
      tl.timeScale(1.5).reverse();
    });
  }

  toggle.addEventListener('click', () => (isOpen ? close() : open()));

  addEventListener('keydown', (e) => {
    if (!isOpen) return;
    if (e.key === 'Escape') {
      e.preventDefault();
      close();
    } else if (e.key === 'Tab') {
      const list = focusables();
      const i = list.indexOf(document.activeElement);
      const next = e.shiftKey ? (i <= 0 ? list.length - 1 : i - 1) : i === list.length - 1 ? 0 : i + 1;
      e.preventDefault();
      list[next].focus();
    }
  });

  return {
    open,
    close,
    get isOpen() {
      return isOpen;
    },
  };
}
