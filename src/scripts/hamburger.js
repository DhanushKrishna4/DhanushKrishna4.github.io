// Lando's menu button (landonorris.com), rebuilt in SVG. His is a Rive
// animation, so there was no file to copy: this was reconstructed from his
// button's canvas, recorded frame by frame, and every curve below is measured
// from those recordings. The shapes are in data/hamburger.js.
//
// Hover: a fill slides down over the button with a curved edge and the two
// bars slide toward each other; leaving drains it back up. A hover change
// waits for the one before it to finish (half a second), as his does, so even
// a quick pass over the button plays the whole fill.
// Opening: the fill stays exactly as it is (his does, with the pointer still
// on the button: it only drains once the pointer leaves), an edge that is
// dark for a moment fades round it, and each bar runs along its hidden path
// into the X. Closing runs them back.
// While the menu is open, a band round the edge takes the hover colour on its
// own slower timing, so it trails the fill in and out.
// On light pages the button is an outline, as his is over light sections.
// Over the open menu it takes the menu's colours whatever the page, easing
// over as it opens (ui.css).
import { gsap } from 'gsap';
import { html, reducedMotion, changingPage, PAGE_CHANGE } from './core/env.js';
import { HAM } from '../data/hamburger.js';

// Timing curves: [ms after the trigger, progress 0..1].
const CURVES = {
  // Hover in and out: the fill, the bars nudging together, the band's colour.
  fillIn: [[21, 0], [34, 0.015], [42, 0.031], [59, 0.046], [75, 0.069], [92, 0.092], [108, 0.123], [125, 0.162], [142, 0.215], [159, 0.277], [176, 0.362], [192, 0.477], [209, 0.6], [225, 0.692], [242, 0.769], [258, 0.815], [275, 0.862], [294, 0.892], [310, 0.915], [327, 0.938], [343, 0.954], [360, 0.969], [375, 0.985], [400, 1]],
  fillOut: [[45, 0], [61, 0.04], [80, 0.086], [96, 0.148], [113, 0.242], [129, 0.375], [146, 0.539], [162, 0.672], [178, 0.758], [195, 0.813], [213, 0.852], [228, 0.883], [245, 0.906], [264, 0.93], [279, 0.938], [296, 0.953], [313, 0.96], [330, 0.969], [346, 0.977], [363, 0.984], [397, 0.992], [430, 1]],
  barsIn: [[170, 0], [200, 0.1], [230, 0.3], [250, 0.5], [270, 0.7], [300, 0.9], [330, 1]],
  barsOut: [[60, 0], [80, 0.18], [100, 0.38], [120, 0.55], [145, 0.72], [170, 0.86], [200, 0.94], [280, 1]],
  bandIn: [[11, 0], [512, 1]],
  bandOut: [[15, 0], [55, 0.253], [89, 0.418], [120, 0.544], [155, 0.641], [189, 0.717], [223, 0.785], [256, 0.835], [290, 0.878], [323, 0.916], [355, 0.941], [389, 0.966], [423, 0.979], [457, 0.992], [489, 1]],
  // The two ends of each stroke (a0, a1: the top bar; b0, b1: the bottom one).
  openA0: [[13, 0], [107, 0], [157, 0.03], [217, 0.046], [333, 0.049], [367, 0.063], [393, 0.088], [413, 0.116], [429, 0.147], [489, 0.301], [507, 0.359], [581, 0.639], [619, 0.749], [653, 0.828], [683, 0.88], [731, 0.937], [787, 0.978], [839, 1]],
  openA1: [[13, 0], [41, 0], [65, 0.025], [97, 0.07], [127, 0.13], [165, 0.225], [199, 0.334], [221, 0.419], [269, 0.638], [295, 0.735], [313, 0.79], [341, 0.856], [359, 0.889], [423, 0.974], [457, 1]],
  openB0: [[13, 0], [89, 0], [133, 0.023], [171, 0.035], [287, 0.05], [317, 0.07], [343, 0.111], [369, 0.183], [433, 0.46], [471, 0.591], [495, 0.651], [529, 0.717], [573, 0.813], [635, 0.877], [707, 0.93], [813, 0.976], [905, 1]],
  openB1: [[13, 0], [73, 0], [215, 0.08], [247, 0.116], [287, 0.189], [321, 0.28], [347, 0.374], [385, 0.553], [407, 0.64], [435, 0.73], [487, 0.87], [503, 0.896], [563, 0.954], [601, 0.983], [639, 1]],
  closeA0: [[14, 0], [128, 0], [130, 0.006], [144, 0.013], [182, 0.026], [238, 0.072], [282, 0.14], [314, 0.212], [346, 0.316], [378, 0.448], [424, 0.662], [442, 0.729], [492, 0.868], [510, 0.906], [526, 0.929], [548, 0.945], [580, 0.954], [804, 0.957], [862, 0.991], [896, 1]],
  closeA1: [[14, 0], [464, 0], [466, 0.008], [514, 0.06], [538, 0.1], [562, 0.155], [602, 0.273], [620, 0.347], [658, 0.57], [682, 0.689], [702, 0.761], [730, 0.824], [760, 0.867], [868, 0.967], [916, 0.988], [996, 1]],
  closeB0: [[14, 0], [76, 0.007], [186, 0.033], [246, 0.068], [300, 0.112], [332, 0.142], [358, 0.179], [380, 0.224], [454, 0.426], [484, 0.546], [542, 0.842], [562, 0.902], [586, 0.942], [616, 0.958], [792, 0.961], [912, 1]],
  closeB1: [[14, 0], [296, 0], [332, 0.017], [374, 0.053], [398, 0.083], [422, 0.126], [452, 0.191], [474, 0.251], [508, 0.379], [556, 0.632], [580, 0.737], [602, 0.805], [638, 0.879], [670, 0.918], [706, 0.94], [796, 0.949], [884, 0.982], [962, 1]],
  // After the click that opens the menu: the band showing round the edge.
  bandShow: [[41, 0], [53, 0.016], [60, 0.05], [74, 0.1], [90, 0.168], [107, 0.244], [123, 0.32], [140, 0.414], [156, 0.514], [173, 0.6], [189, 0.718], [206, 0.75], [229, 0.78], [240, 0.81], [256, 0.836], [273, 0.86], [289, 0.88], [306, 0.894], [360, 0.94], [420, 1]],
  // Light pages: the outline coming back as the menu closes, then the square
  // going once it has.
  outlineIn: [[15, 0], [183, 1]],
  baseOut: [[0, 0], [200, 1]],
};
// The dark edge's opacity after the click (not a progress curve).
const DARK = [[0, 0.48], [156, 0.48], [173, 0.388], [189, 0.282], [206, 0.247], [229, 0.218], [240, 0.188], [256, 0.165], [273, 0.141], [289, 0.124], [306, 0.1], [339, 0.07], [374, 0.047], [406, 0.029], [439, 0.012], [473, 0.006], [506, 0]];

// How far the fill moves down to cover the button, corners included.
const FULL = 132;
// A hover change starts once the one before it has run this long (ms):
// leaving waits for coming in to finish, and coming back for leaving.
const HOLD = { in: 492, out: 515 };

// Where the bars sit along their paths, as measured on the traced paths;
// MAP converts that to the cleaned paths drawn here.
const WIN = {
  rest: HAM.rest,
  hover: { a: [1, 29.5], b: [1, 29.5] },
  open: { a: [76.54, 105.04], b: [109.06, 137.56] },
};
const MAP = {
  a: [[0, 0], [34.25, 34.24], [35, 34.93], [35.5, 35.14], [35.75, 35.37], [60, 59.01], [63.25, 62.05], [105.04, 103.83]],
  b: [[0, 0], [38.75, 38.75], [47.75, 47.34], [71.25, 70.83], [80.25, 79.49], [80.5, 79.58], [80.75, 81.02], [85.25, 81.02], [85.5, 81.05], [86, 81.41], [88.75, 83.98], [137.56, 132.79]],
};

// Linear interpolation through [x, y] samples, held flat past either end.
const at = (curve, x) => {
  if (x <= curve[0][0]) return curve[0][1];
  for (let i = 1; i < curve.length; i++) {
    if (x <= curve[i][0]) {
      const [x0, y0] = curve[i - 1];
      const [x1, y1] = curve[i];
      return y0 + ((y1 - y0) * (x - x0)) / (x1 - x0 || 1);
    }
  }
  return curve[curve.length - 1][1];
};
const end = (curve) => curve[curve.length - 1][0];

// A channel runs from one value to another along a curve, from a start time.
const channel = (v) => ({ from: v, to: v, t0: 0, curve: null });
const read = (c, now) => (c.curve ? c.from + (c.to - c.from) * at(c.curve, now - c.t0) : c.to);
const settled = (c, now) => !c.curve || now - c.t0 >= end(c.curve);
function go(c, to, curve, t0) {
  c.from = read(c, t0);
  c.to = to;
  c.t0 = t0;
  c.curve = curve && !reducedMotion() ? curve : null;
}

const f2 = (n) => Math.round(n * 100) / 100;

export function createHamburger(button) {
  const svg = button.querySelector('.ham');
  const one = (name) => svg.querySelector(`[data-ham="${name}"]`);
  const fillClip = one('fill');
  const base = one('base');
  const band = one('band');
  const outline = one('outline');
  const dark = one('dark');
  const darkEdge = one('dark-edge');
  const bars = { a: [...svg.querySelectorAll('[data-ham="a"]')], b: [...svg.querySelectorAll('[data-ham="b"]')] };

  let light = html.dataset.tone === 'light';
  const ch = {
    fill: channel(0), // hover fill, 0..1 of FULL
    band: channel(0), // the edge band's colour, base 0 .. accent 1
    bars: channel(0), // bars at rest 0 .. nudged together 1
    a0: channel(0), // each stroke end, closed 0 .. in the X 1
    a1: channel(0),
    b0: channel(0),
    b1: channel(0),
    show: channel(0), // the edge band's opacity (only while the menu is open)
    outline: channel(light ? 1 : 0),
    base: channel(light ? 0 : 1),
  };

  // Hover, with his queueing: a change waits until the current one has run its course.
  const hover = { on: false, want: false, since: -Infinity, wantAt: 0 };
  function stepHover(now) {
    if (hover.want === hover.on) return;
    const t = reducedMotion() ? now : Math.max(hover.wantAt, hover.since + (hover.on ? HOLD.in : HOLD.out));
    if (now < t) return;
    hover.on = hover.want;
    hover.since = t;
    const v = hover.on ? 1 : 0;
    go(ch.fill, v, hover.on ? CURVES.fillIn : CURVES.fillOut, t);
    go(ch.band, v, hover.on ? CURVES.bandIn : CURVES.bandOut, t);
    go(ch.bars, v, hover.on ? CURVES.barsIn : CURVES.barsOut, t);
  }

  let open = false;
  let openAt = -Infinity;
  let darkening = false;
  let overMenu = false;

  // A stroke's visible piece [start, end] along its path, in drawn units:
  // between where it sits with the menu closed (at rest, or nudged by hover)
  // and the X, separately for each end.
  function piece(k, now) {
    const nudge = read(ch.bars, now);
    const rest = WIN.rest[k];
    const near = WIN.hover[k];
    const x = WIN.open[k];
    const c0 = rest[0] + (near[0] - rest[0]) * nudge;
    const c1 = rest[1] + (near[1] - rest[1]) * nudge;
    const e0 = read(ch[`${k}0`], now);
    const e1 = read(ch[`${k}1`], now);
    return [at(MAP[k], c0 + (x[0] - c0) * e0), at(MAP[k], c1 + (x[1] - c1) * e1)];
  }

  // Writes only what changed since the last frame.
  const last = new Map();
  const put = (el, key, value, write) => {
    let seen = last.get(el);
    if (!seen) last.set(el, (seen = {}));
    if (seen[key] === value) return;
    seen[key] = value;
    write(value);
  };
  const attr = (el, name, value) => put(el, name, value, (v) => el.setAttribute(name, v));
  const style = (el, name, value) => put(el, name, value, (v) => (el.style[name] = v));

  function render(now) {
    stepHover(now);
    const t = now - openAt;
    // The menu's colours, and a light page's outline turning solid, as the
    // menu opens.
    if (open && !overMenu) {
      overMenu = true;
      button.classList.add('is-over-menu');
      go(ch.outline, 0, null, now);
      go(ch.base, 1, null, now);
    }
    if (darkening && t >= end(DARK)) darkening = false;

    attr(fillClip, 'transform', `translate(0 ${f2(FULL * read(ch.fill, now))})`);
    attr(dark, 'display', darkening ? 'inline' : 'none');
    style(darkEdge, 'opacity', darkening ? String(f2(at(DARK, t))) : '0');

    style(band, 'opacity', String(f2(read(ch.show, now))));
    style(band, 'stroke', `color-mix(in srgb, var(--ham-accent) ${f2(read(ch.band, now) * 100)}%, var(--ham-base))`);
    style(outline, 'opacity', String(f2(read(ch.outline, now))));
    style(base, 'opacity', String(f2(read(ch.base, now))));

    for (const k of ['a', 'b']) {
      const [s0, s1] = piece(k, now);
      const dash = `${f2(Math.max(0, s1 - s0))} 999`;
      const offset = String(f2(-s0));
      for (const el of bars[k]) {
        style(el, 'strokeDasharray', dash);
        style(el, 'strokeDashoffset', offset);
      }
    }
  }

  const busy = (now) =>
    hover.want !== hover.on ||
    darkening ||
    Object.values(ch).some((c) => !settled(c, now));

  let ticking = false;
  const tick = () => {
    const now = performance.now();
    render(now);
    if (!busy(now)) {
      gsap.ticker.remove(tick);
      ticking = false;
    }
  };
  const wake = () => {
    if (ticking) return;
    ticking = true;
    gsap.ticker.add(tick);
  };

  // Mouse or pen over the button, or keyboard focus on it, counts as hover;
  // the pointer stops counting once a page change starts, as on Lando's
  // (core/env.js).
  let pointerIn = false;
  let keyFocus = false;
  const sync = () => {
    const want = (pointerIn && !changingPage()) || keyFocus;
    if (want === hover.want) return;
    hover.want = want;
    hover.wantAt = performance.now();
    wake();
  };
  button.addEventListener('pointerenter', (e) => {
    if (e.pointerType === 'touch') return;
    pointerIn = true;
    sync();
  });
  button.addEventListener('pointerleave', (e) => {
    if (e.pointerType === 'touch') return;
    pointerIn = false;
    sync();
  });
  button.addEventListener('focus', () => {
    keyFocus = button.matches(':focus-visible');
    sync();
  });
  button.addEventListener('blur', () => {
    keyFocus = false;
    sync();
  });
  addEventListener(PAGE_CHANGE, sync);

  // Light or dark page (the router updates html[data-tone] on navigation).
  // While the menu is open the button is solid either way.
  const fitTone = () => {
    go(ch.outline, light ? 1 : 0, null, performance.now());
    go(ch.base, light ? 0 : 1, null, performance.now());
    wake();
  };
  new MutationObserver(() => {
    const next = html.dataset.tone === 'light';
    if (next === light) return;
    light = next;
    if (!open) fitTone();
  }).observe(html, { attributes: true, attributeFilter: ['data-tone'] });

  function setOpen(next) {
    if (next === open) return;
    open = next;
    const now = performance.now();
    openAt = now;
    const v = open ? 1 : 0;
    go(ch.a0, v, open ? CURVES.openA0 : CURVES.closeA0, now);
    go(ch.a1, v, open ? CURVES.openA1 : CURVES.closeA1, now);
    go(ch.b0, v, open ? CURVES.openB0 : CURVES.closeB0, now);
    go(ch.b1, v, open ? CURVES.openB1 : CURVES.closeB1, now);
    if (open) {
      darkening = !reducedMotion();
      go(ch.show, 1, CURVES.bandShow, now);
    } else {
      darkening = false;
      go(ch.show, 0, null, now);
      if (light) go(ch.outline, 1, CURVES.outlineIn, now);
    }
    wake();
  }

  // Once the menu has finished closing: back to the page's colours, and a
  // light page's button loses its square, now the page is behind it again.
  function settle() {
    if (open) return;
    overMenu = false;
    button.classList.remove('is-over-menu');
    if (light) go(ch.base, 0, CURVES.baseOut, performance.now());
    else fitTone();
    wake();
  }

  render(performance.now());
  return { setOpen, settle };
}
