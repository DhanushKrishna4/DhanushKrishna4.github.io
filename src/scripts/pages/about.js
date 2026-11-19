// About: a red line sweeps under the heading and loops the Contact button, and
// the giant words behind "What I work on" light up under the cursor the way
// Lusion's awards title does (gl/glow.js). From there down to the footer the
// page is a black sheet without the contour lines, which slides up over the
// part above it the way Lando's sections do; on it the cursor paints as
// Lusion's does instead of leaving Lando's trail.
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { mountCommon } from './common.js';
import { smoothTo } from '../core/scroll.js';
import { reducedMotion, clamp } from '../core/env.js';
import { createLine } from '../gl/line.js';
import { createGlow } from '../gl/glow.js';

gsap.registerPlugin(ScrollTrigger);

const f2 = (n) => Math.round(n * 100) / 100;
const unclampedFit = (v, a, b, c, d) => c + ((v - a) / (b - a)) * (d - c);

// The giant words behind "What I work on" don't fit the screen (nor does
// Lusion's awards title fit theirs), so, as theirs does, each line slides
// left while you scroll (their AboutAwardSection and titleVert). Theirs:
//  - progress is their ScrollDomRange ratio for their section (-1 as its top
//    comes in at the bottom of the screen, 1 as its bottom leaves at the
//    top), taken from -0.75..0.75 to 0..1. The section starts where their
//    title starts and is 1.302 screen widths tall on wide screens (the title
//    drawn at 1.5x); on their phone layout (812px wide and below) its lists
//    make it about 1.35 screen heights. So nothing moves until the title's
//    top is about halfway up a wide screen (two thirds down a phone's);
//  - their line k (of six, 0.225 screen widths apart) moves left between
//    progress 0.4k/6 and 0.56 + 0.4k/6, linearly, by half the screen width.
//    So the lines set off one after another as they come up the screen.
// Ours sit closer together, so each of our lines is timed by where it is on
// screen, as theirs at the same height would be: its section top is taken
// to be k line gaps of theirs above the line's own top. Measured on their
// site (the value their shader is given), these give the same numbers.
// The lines start level (no indent, see .glow-words). The page's copy of
// each line is moved; gl/glow.js draws each line where its copy is, so
// without WebGL the outline copy slides too. Reduced motion keeps them still.
const LUSION = { pitch: 0.225, wide: 1.302, phone: 1.35, breakpoint: 812 };

function setupWordsSlide(section, gl) {
  const words = section?.querySelector('[data-glow-words]');
  if (!words) return () => {};
  const lines = [...words.querySelectorAll('span')].map((el) => ({ el, x: 0 }));
  // How far below each line's top its capitals start (the text, not the line box).
  const measure = document.createElement('canvas').getContext('2d');
  let capFor = -1;
  let capTop = 0;
  const capOffset = (width) => {
    if (capFor === width) return capTop;
    const span = lines[0].el;
    const cs = getComputedStyle(span);
    const size = parseFloat(cs.fontSize);
    measure.font = `${cs.fontWeight} ${size}px ${cs.fontFamily}`;
    const m = measure.measureText(span.textContent.toUpperCase());
    const ascent = m.fontBoundingBoxAscent ?? size * 0.95;
    const descent = m.fontBoundingBoxDescent ?? size * 0.25;
    const cap = measure.measureText('H').actualBoundingBoxAscent ?? size * 0.7;
    const lineH = span.getBoundingClientRect().height;
    capTop = (lineH - (ascent + descent)) / 2 + ascent - cap;
    capFor = width;
    return capTop;
  };
  document.fonts.ready.then(() => (capFor = -1));

  const update = () => {
    const still = reducedMotion();
    const vh = innerHeight;
    const width = words.clientWidth;
    const tall = width > LUSION.breakpoint ? LUSION.wide * width : LUSION.phone * vh;
    const offset = capOffset(width);
    lines.forEach((line, k) => {
      // The line's capitals' top on screen (a slide doesn't change it).
      const y = line.el.getBoundingClientRect().top + offset;
      const top = y - k * LUSION.pitch * width;
      const ratio = Math.min(0, unclampedFit(top, vh, vh - tall, -1, 0)) + Math.max(0, unclampedFit(top, 0, -tall, 0, 1));
      const progress = clamp((ratio + 0.75) / 1.5, 0, 1);
      const start = (0.4 * k) / 6;
      const x = still ? 0 : f2(-clamp((progress - start) / 0.56, 0, 1) * 0.5 * width);
      if (x === line.x) return;
      line.x = x;
      line.el.style.transform = x ? `translate3d(${x}px, 0, 0)` : '';
    });
  };
  // With WebGL this runs in the engine's frame, ahead of the words layer, so
  // the lines are drawn where they are this frame; without it, on the ticker.
  const layer = gl ? gl.add({ order: -8, visible: false, update, render() {} }) : null;
  if (!gl) gsap.ticker.add(update);
  update();
  return () => {
    if (layer) gl.remove(layer);
    else gsap.ticker.remove(update);
    lines.forEach(({ el }) => (el.style.transform = ''));
  };
}

// The top part (heading, red line, intro) stops moving once its bottom reaches
// the bottom of the screen (CSS sticky, offset set here), and the sheet slides
// up over it with a straight edge. The top part is clipped at that edge, and
// so is the red line drawn for it. The background shader leaves the contour
// lines out from the edge down, and holds the top part's lines still while it
// is pinned, so nothing drifts behind the still text.
function setupSheet(root, gl, line) {
  const field = gl?.field?.uniforms;
  const fieldOff = () => {
    if (!field) return;
    field.uSheetTop.value = 1e6;
    field.uTopHold.value = 1e6;
  };
  const top = root.querySelector('[data-about-top]');
  const sheet = root.querySelector('[data-about-sheet]');
  if (!top || !sheet) {
    fieldOff();
    return () => {};
  }

  let edge = Infinity; // the sheet's top edge, in CSS pixels from the top of the screen
  let clip = '';
  let pinTop = null;
  const fit = () => {
    // A top part taller than the screen pins with its top above the screen;
    // a shorter one pins at the top.
    const next = Math.min(0, innerHeight - top.offsetHeight);
    if (next !== pinTop) top.style.setProperty('--pin-top', `${(pinTop = next)}px`);
  };

  const update = () => {
    fit();
    edge = sheet.getBoundingClientRect().top;
    const t = top.getBoundingClientRect();
    const covered = t.bottom - edge; // how much of the top part the sheet is over
    const next = covered < 0.5 ? '' : covered >= t.height ? 'inset(100% 0 0 0)' : `inset(0 0 ${f2(covered)}px 0)`;
    if (next !== clip) top.style.clipPath = clip = next;
    if (field) {
      // The scroll at which the top part pins: the sheet's place on the page,
      // less the shorter of the top part and the screen.
      const pinAt = Math.max(0, edge + scrollY - Math.min(top.offsetHeight, innerHeight));
      field.uSheetTop.value = edge * gl.state.dpr;
      field.uTopHold.value = (pinAt / gl.state.height) * 0.12;
    }
  };

  // The red line belongs to the top part, so it is cut off at the sheet's edge too.
  if (line) {
    const draw = line.render;
    line.render = (renderer, state) => {
      if (edge >= state.height) return draw(renderer, state);
      if (edge <= 0) return undefined;
      renderer.setScissorTest(true);
      renderer.setScissor(0, state.height - edge, state.width, edge);
      draw(renderer, state);
      renderer.setScissorTest(false);
      return undefined;
    };
  }

  // Keyboard: the browser counts a link in the pinned top part as on screen
  // even while the sheet covers it, so focusing one scrolls back up to it.
  const onFocus = (e) => {
    if (!clip) return;
    const offset = e.target.getBoundingClientRect().top - top.getBoundingClientRect().top;
    const natural = edge + scrollY - top.offsetHeight + offset; // where it sits when nothing is pinned
    const pinAt = Math.max(0, edge + scrollY - Math.min(top.offsetHeight, innerHeight));
    smoothTo(Math.max(0, Math.min(pinAt, natural - innerHeight / 2)));
  };
  top.addEventListener('focusin', onFocus);

  // ScrollTrigger works out where things sit on the page (the red line's
  // drawing, the text reveals); a pinned top part would mislead it, so the pin
  // is released while it measures.
  const release = () => top.classList.remove('is-pinnable');
  const pin = () => {
    fit();
    top.classList.add('is-pinnable');
  };
  ScrollTrigger.addEventListener('refreshInit', release);
  ScrollTrigger.addEventListener('refresh', pin);
  pin();

  // With WebGL this runs inside the engine's frame, so the clip, the line and
  // the background agree on where the edge is; without it, on the ticker.
  const layer = gl ? gl.add({ order: -9, visible: false, update, render() {} }) : null;
  if (!gl) gsap.ticker.add(update);
  update();

  return () => {
    if (layer) gl.remove(layer);
    else gsap.ticker.remove(update);
    ScrollTrigger.removeEventListener('refreshInit', release);
    ScrollTrigger.removeEventListener('refresh', pin);
    top.removeEventListener('focusin', onFocus);
    top.classList.remove('is-pinnable');
    top.style.clipPath = '';
    fieldOff();
  };
}

export function mountAbout(root, { gl }) {
  const common = mountCommon(root, { gl });
  const line = gl ? gl.add(createLine(gl, root.querySelector('[data-line="about"]'), 'about')) : null;
  const glowSection = root.querySelector('[data-glow]');
  // Added before the words layer so the lines move before they are drawn.
  const offSlide = setupWordsSlide(glowSection, gl);
  const glow = gl ? gl.add(createGlow(gl, glowSection)) : null;
  const offSheet = setupSheet(root, gl, line);
  return {
    intro() {
      common.intro();
    },
    destroy() {
      common.destroy();
      offSheet();
      offSlide();
      gl?.remove(line);
      gl?.remove(glow);
    },
  };
}
