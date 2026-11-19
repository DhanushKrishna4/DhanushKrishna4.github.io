// Draws the cover images for the projects without a live demo (Nexus,
// VoiceGuide AI, AI Summarizer, Price Tracker, Stock Dashboard, URL
// Shortener): one abstract drawing each of what the project does, read from
// its code, in that project's own colours. Rendered with the Chrome already
// on this Mac.
//   node scripts/draw-covers.mjs              all six
//   node scripts/draw-covers.mjs nexus        just one
// Writes public/media/<slug>/1.jpg (2400 x 1500) and updates src/data/media.json.

import puppeteer from 'puppeteer-core';
import { readFile, writeFile, mkdir, rm } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { projects } from '../src/data/projects.js';

const CHROME = process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const MEDIA = path.join(ROOT, 'public/media');
const MANIFEST = path.join(ROOT, 'src/data/media.json');
const FONT = path.join(ROOT, 'node_modules/@fontsource-variable/mona-sans/files/mona-sans-latin-wdth-normal.woff2');
const TMP = path.join(process.env.TMPDIR || tmpdir(), 'dk-covers');

const W = 1600;
const H = 1000;
const SCALE = 1.5; // saved at 2400 x 1500

// ---------------------------------------------------------------------------
// Small helpers

// Seeded random numbers, so every drawing comes out the same each time.
function random(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const hex = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
const mix = (a, b, t) => {
  const [x, y] = [hex(a), hex(b)];
  return `rgb(${x.map((v, i) => Math.round(v + (y[i] - v) * t)).join(',')})`;
};
const alpha = (h, a) => `rgba(${hex(h).join(',')},${a})`;
const f = (n) => Math.round(n * 100) / 100;
const attrs = (o) =>
  Object.entries(o)
    .filter(([, v]) => v !== undefined && v !== null)
    .map(([k, v]) => `${k.replace(/[A-Z]/g, (m) => '-' + m.toLowerCase())}="${v}"`)
    .join(' ');
const line = (x1, y1, x2, y2, o = {}) => `<line ${attrs({ x1: f(x1), y1: f(y1), x2: f(x2), y2: f(y2), ...o })}/>`;
const circle = (cx, cy, r, o = {}) => `<circle ${attrs({ cx: f(cx), cy: f(cy), r: f(r), ...o })}/>`;
const rect = (x, y, w, h, o = {}) => `<rect ${attrs({ x: f(x), y: f(y), width: f(w), height: f(h), ...o })}/>`;
const pathEl = (d, o = {}) => `<path ${attrs({ d, ...o })}/>`;
const text = (x, y, s, o = {}) => `<text ${attrs({ x: f(x), y: f(y), ...o })}>${s}</text>`;
const poly = (pts) => pts.map(([x, y], i) => `${i ? 'L' : 'M'}${f(x)},${f(y)}`).join(' ');

// A smooth curve through points (Catmull-Rom turned into cubic Béziers).
function smooth(pts) {
  let d = `M${f(pts[0][0])},${f(pts[0][1])}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] || pts[i];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[i + 2] || p2;
    const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
    const c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
    d += ` C${f(c1[0])},${f(c1[1])} ${f(c2[0])},${f(c2[1])} ${f(p2[0])},${f(p2[1])}`;
  }
  return d;
}

// Shared backdrop: the project's background, lifted very slightly towards the middle.
const backdrop = (c, id) => `
  <defs>
    <radialGradient id="${id}-lift" cx="54%" cy="46%" r="70%">
      <stop offset="0" stop-color="${mix(c.bg, c.fg, 0.045)}"/>
      <stop offset="1" stop-color="${c.bg}"/>
    </radialGradient>
  </defs>
  ${rect(0, 0, W, H, { fill: `url(#${id}-lift)` })}`;

// ---------------------------------------------------------------------------
// The drawings

// Nexus: drawn as the kind of engineering diagram its Blueprint Analyzer reads.
// One request enters a sealed boundary (nothing leaves the machine), meets the
// Auto router, and is sent down one line to one of six models, tagged by role
// and size (fast 35b, reasoning 122b, code 27b, vision 32b, embeddings 4b,
// background 2b). The knowledge base sits below the router as a vessel.
function nexus(c) {
  const fg = (a) => alpha(c.fg, a);
  const acc = c.accent;
  let s = backdrop(c, 'nx');
  // Blueprint grid
  for (let x = 0; x <= W; x += 40) s += line(x, 0, x, H, { stroke: fg(x % 200 === 0 ? 0.055 : 0.028), strokeWidth: 1 });
  for (let y = 0; y <= H; y += 40) s += line(0, y, W, y, { stroke: fg(y % 200 === 0 ? 0.055 : 0.028), strokeWidth: 1 });

  // The sealed boundary: a double line, with one gate on the left for the request.
  const bx = 150, by = 150, bw = 1300, bh = 700, gateY = 470;
  const gap = 22;
  const boundary = (inset, o) => {
    const x0 = bx + inset, y0 = by + inset, x1 = bx + bw - inset, y1 = by + bh - inset, r = 26 - inset;
    return pathEl(
      `M${x0},${gateY - gap} L${x0},${y0 + r} Q${x0},${y0} ${x0 + r},${y0} L${x1 - r},${y0} Q${x1},${y0} ${x1},${y0 + r} ` +
        `L${x1},${y1 - r} Q${x1},${y1} ${x1 - r},${y1} L${x0 + r},${y1} Q${x0},${y1} ${x0},${y1 - r} L${x0},${gateY + gap}`,
      { fill: 'none', ...o },
    );
  };
  s += boundary(0, { stroke: fg(0.62), strokeWidth: 2.4 });
  s += boundary(12, { stroke: fg(0.2), strokeWidth: 1.2 });

  // Router (diamond) and the request line coming in.
  const rx = 470, ry = gateY;
  s += line(40, ry, rx - 46, ry, { stroke: acc, strokeWidth: 3.2 });
  s += pathEl(`M${rx - 70},${ry - 9} L${rx - 56},${ry} L${rx - 70},${ry + 9}`, { fill: 'none', stroke: acc, strokeWidth: 3.2, strokeLinejoin: 'round' });
  s += pathEl(`M${rx},${ry - 46} L${rx + 46},${ry} L${rx},${ry + 46} L${rx - 46},${ry} Z`, { fill: c.bg, stroke: acc, strokeWidth: 3 });
  s += text(rx, ry + 6, 'AUTO', { fill: fg(0.85), fontSize: 15, fontWeight: 700, letterSpacing: 1.5, textAnchor: 'middle' });

  // Header pipe and the six branches.
  const hx = 700;
  const models = [
    ['F', '35'],
    ['R', '122'],
    ['C', '27'],
    ['V', '32'],
    ['E', '4'],
    ['B', '2'],
  ];
  const top = 236, step = 94;
  const ys = models.map((_, i) => top + i * step);
  const chosen = 3; // the vision model: the one that reads drawings
  const chosenY = ys[chosen];
  s += line(rx + 46, ry, hx, ry, { stroke: acc, strokeWidth: 3.2 });
  s += line(hx, ys[0], hx, ys[ys.length - 1], { stroke: fg(0.42), strokeWidth: 2.4 });
  s += line(hx, Math.min(ry, chosenY), hx, Math.max(ry, chosenY), { stroke: acc, strokeWidth: 3.2 });
  const bubbleX = 1060, valveX = 880, r = 38;
  models.forEach(([tag, size], i) => {
    const y = ys[i];
    const on = i === chosen;
    const col = on ? acc : fg(0.42);
    s += line(hx, y, bubbleX - r, y, { stroke: col, strokeWidth: on ? 3.2 : 2.4 });
    // Valve: two triangles tip to tip; open (filled) on the chosen line, shut on the rest.
    s += pathEl(`M${valveX - 18},${y - 13} L${valveX + 18},${y + 13} L${valveX + 18},${y - 13} L${valveX - 18},${y + 13} Z`, {
      fill: on ? acc : c.bg,
      stroke: on ? acc : fg(0.55),
      strokeWidth: 2,
      strokeLinejoin: 'round',
    });
    if (!on) s += line(valveX, y - 22, valveX, y - 13, { stroke: fg(0.55), strokeWidth: 2 });
    // Instrument bubble: role letter over model size, split by a line.
    s += circle(bubbleX, y, r, { fill: c.bg, stroke: on ? acc : fg(0.7), strokeWidth: on ? 3 : 2 });
    s += line(bubbleX - r, y, bubbleX + r, y, { stroke: on ? acc : fg(0.7), strokeWidth: on ? 2.4 : 1.6 });
    s += text(bubbleX, y - 9, tag, { fill: on ? acc : fg(0.9), fontSize: 19, fontWeight: 700, textAnchor: 'middle' });
    s += text(bubbleX, y + 25, size, { fill: on ? acc : fg(0.7), fontSize: 16, fontWeight: 560, textAnchor: 'middle' });
  });
  // Flow arrows on the chosen route.
  const arrow = (x, y) => pathEl(`M${x - 10},${y - 8} L${x + 2},${y} L${x - 10},${y + 8}`, { fill: 'none', stroke: acc, strokeWidth: 3, strokeLinejoin: 'round', strokeLinecap: 'round' });
  s += arrow(600, ry);
  s += arrow(985, chosenY);
  // From the vision model, out to the drawing it reads.
  const sx = 1170, sy = chosenY - 64;
  s += line(bubbleX + r, chosenY, sx, chosenY, { stroke: acc, strokeWidth: 3.2 });
  s += rect(sx, sy, 190, 128, { rx: 6, fill: mix(c.bg, c.fg, 0.03), stroke: acc, strokeWidth: 2.4 });
  // A tiny drawing on that sheet: a pipe run with a vessel and two tags.
  s += pathEl(`M${sx + 22},${sy + 84} L${sx + 74},${sy + 84} L${sx + 74},${sy + 42} L${sx + 132},${sy + 42}`, { fill: 'none', stroke: fg(0.7), strokeWidth: 2 });
  s += rect(sx + 132, sy + 26, 34, 72, { rx: 17, fill: 'none', stroke: fg(0.7), strokeWidth: 2 });
  s += circle(sx + 48, sy + 52, 13, { fill: 'none', stroke: fg(0.7), strokeWidth: 1.8 });
  s += line(sx + 48, sy + 65, sx + 48, sy + 84, { stroke: fg(0.7), strokeWidth: 1.6 });
  s += circle(sx + 104, sy + 74, 13, { fill: 'none', stroke: acc, strokeWidth: 2 });
  s += line(sx + 104, sy + 42, sx + 104, sy + 61, { stroke: acc, strokeWidth: 1.8 });

  // Knowledge base vessel under the router.
  const vx = rx, vy = 640;
  s += line(rx, ry + 46, rx, vy, { stroke: fg(0.42), strokeWidth: 2.4 });
  s += rect(vx - 52, vy, 104, 150, { rx: 52, fill: c.bg, stroke: fg(0.7), strokeWidth: 2.2 });
  for (let i = 0; i < 4; i++) s += line(vx - 28, vy + 50 + i * 18, vx + 28, vy + 50 + i * 18, { stroke: fg(0.38), strokeWidth: 2, strokeLinecap: 'round' });
  s += text(vx + 76, vy + 82, 'KB', { fill: fg(0.6), fontSize: 15, fontWeight: 700, letterSpacing: 1.5 });
  return s;
}

// VoiceGuide AI: a spoken request (a waveform) becomes the day's route, with
// timed stops, ending in the PDF it exports. Behind it, greetings in some of
// the languages it listens and replies in.
function voiceguide(c) {
  const fg = (a) => alpha(c.fg, a);
  const acc = c.accent;
  const rand = random(7);
  let s = backdrop(c, 'vg');
  const words = [
    ['Hello', 210, 180, 30], ['नमस्ते', 520, 140, 40], ['Bonjour', 900, 175, 30], ['Hola', 1230, 150, 36],
    ['നമസ്കാരം', 1330, 255, 30], ['مرحبا', 330, 300, 36], ['你好', 760, 280, 40], ['こんにちは', 1080, 290, 30],
    ['Hallo', 170, 840, 32], ['Ciao', 520, 880, 38], ['Olá', 860, 860, 32], ['Привет', 1170, 880, 34],
    ['Merhaba', 1370, 790, 28], ['안녕하세요', 1420, 380, 26],
  ];
  const family = "Mona, 'Helvetica Neue', 'Kohinoor Devanagari', 'Malayalam Sangam MN', 'Geeza Pro', 'PingFang SC', 'Hiragino Sans', 'Apple SD Gothic Neo', sans-serif";
  for (const [w, x, y, size] of words) s += text(x, y, w, { fill: fg(0.13), fontSize: size, fontFamily: family, fontWeight: 450, textAnchor: 'middle' });

  // The waveform: one spoken sentence, bars rising and falling with the syllables.
  const cy = 540;
  const n = 44;
  const x0 = 150, bar = 6, gap = 5;
  for (let i = 0; i < n; i++) {
    const t = i / (n - 1);
    const envelope = Math.sin(Math.PI * t) ** 0.6;
    const syllable = 0.45 + 0.55 * Math.abs(Math.sin(i * 0.9 + 0.4 * Math.sin(i * 0.33)));
    const h = 26 + 250 * envelope * syllable * (0.75 + 0.25 * rand());
    const x = x0 + i * (bar + gap);
    s += line(x, cy - h / 2, x, cy + h / 2, { stroke: alpha(acc, 0.35 + 0.65 * t), strokeWidth: bar, strokeLinecap: 'round' });
  }
  const startX = x0 + (n - 1) * (bar + gap) + 26;

  // The route: from the voice, across the day, through nine stops.
  const pts = [
    [startX, cy], [690, 470], [785, 560], [880, 650], [985, 610], [1055, 500], [1150, 430], [1235, 520], [1300, 610], [1385, 560],
  ];
  const d = smooth(pts);
  s += pathEl(d, { fill: 'none', stroke: alpha(acc, 0.28), strokeWidth: 14, strokeLinecap: 'round', strokeLinejoin: 'round' });
  s += pathEl(d, { fill: 'none', stroke: acc, strokeWidth: 3.4, strokeLinecap: 'round', strokeLinejoin: 'round' });
  const times = ['09:00', '10:30', '12:00', '13:30', '15:00', '16:30', '18:00', '19:30', '21:00'];
  pts.slice(1).forEach(([x, y], i) => {
    const last = i === times.length - 1;
    s += circle(x, y, last ? 11 : 8, { fill: last ? acc : c.bg, stroke: acc, strokeWidth: 3.2 });
    const below = i % 2 === 0;
    s += text(x, below ? y + 46 : y - 30, times[i], { fill: fg(0.62), fontSize: 17, fontWeight: 520, textAnchor: 'middle', letterSpacing: 0.3 });
  });
  // The exported PDF, at the end of the day.
  const px = 1420, py = 596;
  s += line(1397, 569, px + 4, py - 2, { stroke: acc, strokeWidth: 2.4, strokeDasharray: '4 6', strokeLinecap: 'round' });
  s += pathEl(`M${px},${py} L${px + 52},${py} L${px + 72},${py + 20} L${px + 72},${py + 96} L${px},${py + 96} Z M${px + 52},${py} L${px + 52},${py + 20} L${px + 72},${py + 20}`, {
    fill: mix(c.bg, c.fg, 0.04),
    stroke: fg(0.8),
    strokeWidth: 2.2,
    strokeLinejoin: 'round',
  });
  for (let i = 0; i < 4; i++) s += line(px + 14, py + 40 + i * 13, px + 14 + (i === 3 ? 26 : 44), py + 40 + i * 13, { stroke: fg(0.5), strokeWidth: 3, strokeLinecap: 'round' });
  return s;
}

// AI Summarizer: a page of text flows into three bullet points. Only the lines
// above the dashed cut take part, because the code sends just the first 4,000
// characters to GPT-3.5.
function summarizer(c) {
  const fg = (a) => alpha(c.fg, a);
  const acc = c.accent;
  const rand = random(11);
  let s = backdrop(c, 'sm');
  s += `<defs><linearGradient id="sm-flow" x1="600" y1="0" x2="1040" y2="0" gradientUnits="userSpaceOnUse">
    <stop offset="0" stop-color="${alpha(c.fg, 0.14)}"/><stop offset="1" stop-color="${alpha(acc, 0.85)}"/></linearGradient></defs>`;
  // Pages
  const px = 170, py = 160, pw = 430, ph = 660;
  s += rect(px + 30, py - 26, pw, ph, { rx: 12, fill: mix(c.bg, c.fg, 0.02), stroke: fg(0.16), strokeWidth: 2 });
  s += rect(px, py, pw, ph, { rx: 12, fill: mix(c.bg, c.fg, 0.035), stroke: fg(0.5), strokeWidth: 2.2 });
  // Text lines, in paragraphs
  const ends = [];
  let y = py + 64;
  const cutAfter = 14;
  let k = 0;
  while (y < py + ph - 44) {
    const paraLen = 3 + Math.floor(rand() * 4);
    for (let i = 0; i < paraLen && y < py + ph - 44; i++, k++) {
      const last = i === paraLen - 1;
      const len = last ? 120 + rand() * 160 : 300 + rand() * 60;
      const above = k < cutAfter;
      s += line(px + 40, y, px + 40 + len, y, { stroke: fg(above ? 0.42 : 0.15), strokeWidth: 7, strokeLinecap: 'round' });
      if (above) ends.push([px + 40 + len, y]);
      if (k === cutAfter - 1) {
        y += 22;
        s += line(px - 30, y, px + pw + 30, y, { stroke: alpha(acc, 0.8), strokeWidth: 2.2, strokeDasharray: '10 8' });
        s += text(px + pw + 44, y + 6, '4,000', { fill: alpha(acc, 0.9), fontSize: 17, fontWeight: 600 });
      }
      y += 25;
    }
    y += 18;
  }
  // Three bullets
  const bx = 1060;
  const bys = [372, 486, 600];
  const lens = [300, 236, 330];
  ends.forEach(([x, yy], i) => {
    const g = Math.min(2, Math.floor((i * 3) / ends.length));
    const ty = bys[g] + (rand() - 0.5) * 6;
    const mx = (x + bx) / 2 + 60;
    const ex = px + pw;
    s += line(x + 16, yy, ex, yy, { stroke: fg(0.09), strokeWidth: 1.4, strokeDasharray: '2 6' });
    s += pathEl(`M${ex},${f(yy)} C${f(mx)},${f(yy)} ${f(mx)},${f(ty)} ${bx - 34},${f(ty)}`, { fill: 'none', stroke: 'url(#sm-flow)', strokeWidth: 1.8 });
  });
  bys.forEach((by, i) => {
    s += circle(bx - 14, by, 10, { fill: acc });
    s += line(bx + 18, by, bx + 18 + lens[i], by, { stroke: fg(0.9), strokeWidth: 16, strokeLinecap: 'round' });
  });
  return s;
}

// Price Tracker: one check a minute (stems on a time axis), the price stepping
// along above a dashed £60 target until it drops below and raises the alert.
function priceTracker(c) {
  const fg = (a) => alpha(c.fg, a);
  const acc = c.accent;
  const rand = random(5);
  let s = backdrop(c, 'pt');
  const left = 150, right = 1450, base = 740, target = 440;
  s += line(left, base, right, base, { stroke: fg(0.4), strokeWidth: 2 });
  const n = 24, step = (right - left - 70) / (n - 1);
  const xs = Array.from({ length: n }, (_, i) => left + 40 + i * step);
  // Minute ticks
  xs.forEach((x, i) => {
    const major = i % 5 === 0;
    s += line(x, base, x, base + (major ? 18 : 9), { stroke: fg(0.4), strokeWidth: 2 });
    if (major) s += text(x, base + 46, `${i} min`, { fill: fg(0.5), fontSize: 16, fontWeight: 520, textAnchor: 'middle' });
  });
  // Target
  s += line(left, target, right, target, { stroke: fg(0.55), strokeWidth: 2, strokeDasharray: '12 9' });
  s += text(left, target - 18, 'target  £60', { fill: fg(0.7), fontSize: 18, fontWeight: 560 });
  // Prices: holding above the target, then a drop that stays below.
  const drop = 17;
  const ys = xs.map((_, i) => (i < drop ? 270 + Math.round(rand() * 3) * 22 : 556 + Math.round(rand() * 1) * 14));
  let d = `M${f(xs[0])},${f(ys[0])}`;
  for (let i = 1; i < n; i++) d += ` L${f(xs[i])},${f(ys[i - 1])} L${f(xs[i])},${f(ys[i])}`;
  s += pathEl(d, { fill: 'none', stroke: fg(0.38), strokeWidth: 2.4, strokeLinejoin: 'round' });
  xs.forEach((x, i) => {
    const below = i >= drop;
    s += line(x, ys[i] + 9, x, base, { stroke: below ? alpha(acc, 0.35) : fg(0.12), strokeWidth: 2 });
    s += circle(x, ys[i], i === drop ? 13 : 8, { fill: below ? acc : c.bg, stroke: below ? acc : fg(0.8), strokeWidth: 2.6 });
  });
  // The alert: a few strokes bursting from the first check under the target.
  const ax = xs[drop], ay = ys[drop];
  for (const a of [-150, -115, -80, -45]) {
    const r = (a * Math.PI) / 180;
    s += line(ax + Math.cos(r) * 26, ay + Math.sin(r) * 26, ax + Math.cos(r) * 52, ay + Math.sin(r) * 52, { stroke: acc, strokeWidth: 3.4, strokeLinecap: 'round' });
  }
  return s;
}

// Stock Dashboard: its main view, a year of daily closes for the default
// ticker (AAPL in the code) as a line over volume bars, with the crosshair of
// an interactive chart pinned to one day and its price marked on the axis.
function stockDashboard(c) {
  const fg = (a) => alpha(c.fg, a);
  const acc = c.accent;
  const rand = random(23);
  let s = backdrop(c, 'sd');
  const left = 150, right = 1390, top = 300, low = 640, floor = 680, volTop = 712, volBase = 812;
  s += `<defs><linearGradient id="sd-area" x1="0" y1="${top}" x2="0" y2="${floor}" gradientUnits="userSpaceOnUse">
    <stop offset="0" stop-color="${alpha(acc, 0.34)}"/><stop offset="1" stop-color="${alpha(acc, 0)}"/></linearGradient></defs>`;
  // Ticker
  s += text(left, 214, 'AAPL', { fill: fg(0.94), fontSize: 66, fontWeight: 720, letterSpacing: 1 });
  s += text(left + 214, 214, 'close, last 12 months', { fill: fg(0.5), fontSize: 20, fontWeight: 480 });
  // Grid
  for (let i = 0; i < 5; i++) {
    const y = top + i * ((low - top) / 4);
    s += line(left, y, right, y, { stroke: fg(0.07), strokeWidth: 1.5 });
    s += line(right + 8, y, right + 20, y, { stroke: fg(0.35), strokeWidth: 2 });
  }
  s += line(left, floor, right, floor, { stroke: fg(0.2), strokeWidth: 1.5 });
  // 252 trading days: a random walk with a gentle rise.
  const n = 252;
  let v = 0;
  const vals = [];
  for (let i = 0; i < n; i++) {
    v += (rand() - 0.47) * 1.6 + Math.sin(i / 19) * 0.12;
    vals.push(v);
  }
  const lo = Math.min(...vals), hi = Math.max(...vals);
  const ix = (i) => left + (i / (n - 1)) * (right - left);
  const iy = (val) => top + (1 - (val - lo) / (hi - lo)) * (low - top);
  const pts = vals.map((val, i) => [ix(i), iy(val)]);
  s += pathEl(`${poly(pts)} L${f(ix(n - 1))},${floor} L${f(ix(0))},${floor} Z`, { fill: 'url(#sd-area)' });
  s += pathEl(poly(pts), { fill: 'none', stroke: acc, strokeWidth: 3, strokeLinejoin: 'round' });
  // Volume
  for (let i = 0; i < n; i += 2) {
    const h = 10 + (volBase - volTop - 10) * Math.pow(rand(), 2.4);
    s += line(ix(i), volBase, ix(i), volBase - h, { stroke: fg(0.22), strokeWidth: 2.6 });
  }
  // Months along the bottom
  'JFMAMJJASOND'.split('').forEach((m, i) => {
    const x = left + ((i + 0.5) / 12) * (right - left);
    s += text(x, volBase + 40, m, { fill: fg(0.42), fontSize: 16, fontWeight: 560, textAnchor: 'middle' });
  });
  // Crosshair on one day, its price marked on the axis.
  const day = 196;
  const [hx, hy] = pts[day];
  s += line(hx, top - 30, hx, volBase, { stroke: fg(0.42), strokeWidth: 1.8, strokeDasharray: '6 6' });
  s += line(left, hy, right, hy, { stroke: fg(0.3), strokeWidth: 1.6, strokeDasharray: '6 6' });
  s += rect(right + 26, hy - 15, 64, 30, { rx: 15, fill: acc });
  s += circle(hx, hy, 10, { fill: acc, stroke: c.bg, strokeWidth: 4 });
  return s;
}

// URL Shortener: a long link, folded back and forth because it is long, is
// condensed into a four-character key. Clicks fan out from the key to wherever
// it redirects, and each one is tallied below it.
function urlShortener(c) {
  const fg = (a) => alpha(c.fg, a);
  const acc = c.accent;
  const rand = random(3);
  let s = backdrop(c, 'us');
  // The long link: rows of character marks joined by U-turns.
  const x0 = 150, x1 = 640, rowH = 56, rows = 7, top = 330;
  let d = '';
  for (let r = 0; r < rows; r++) {
    const y = top + r * rowH;
    const [a, b] = r % 2 ? [x1, x0] : [x0, x1];
    d += r ? ` L${b === x0 ? x1 : x0},${y}` : `M${a},${y}`;
    d += ` L${b},${y}`;
    if (r < rows - 1) {
      const turnX = b;
      const dir = b === x1 ? 1 : -1;
      d += ` C${turnX + dir * 40},${y} ${turnX + dir * 40},${y + rowH} ${turnX},${y + rowH}`;
    }
    for (let x = x0 + 14; x < x1 - 10; x += 13 + rand() * 6) s += line(x, y - 9, x, y - 4 - rand() * 8, { stroke: fg(0.32), strokeWidth: 2.4, strokeLinecap: 'round' });
  }
  s += pathEl(d, { fill: 'none', stroke: fg(0.42), strokeWidth: 2.2 });
  const endY = top + (rows - 1) * rowH;
  // Condense: the link's end runs into the key.
  const kx = 780, ky = 444, kw = 290, kh = 112;
  s += pathEl(`M${x1},${endY} C${x1 + 70},${endY} ${kx - 80},${ky + kh / 2} ${kx},${ky + kh / 2}`, { fill: 'none', stroke: acc, strokeWidth: 3.2 });
  s += rect(kx, ky, kw, kh, { rx: 18, fill: mix(c.bg, c.fg, 0.05), stroke: acc, strokeWidth: 3 });
  s += text(kx + kw / 2, ky + kh / 2 + 23, '/x7Qa', { fill: c.fg, fontSize: 64, fontWeight: 700, textAnchor: 'middle', letterSpacing: 1 });
  // Clicks fanning out to where the key redirects.
  const ox = kx + kw, oy = ky + kh / 2;
  const n = 17;
  for (let i = 0; i < n; i++) {
    const t = i / (n - 1);
    const ex = 1380 + rand() * 80;
    const ey = 200 + t * 600 + (rand() - 0.5) * 20;
    const hot = i % 4 === 1;
    s += pathEl(`M${ox},${oy} C${ox + 120},${oy} ${ex - 160},${f(ey)} ${f(ex)},${f(ey)}`, { fill: 'none', stroke: hot ? alpha(acc, 0.85) : fg(0.24), strokeWidth: hot ? 2.4 : 1.6 });
    s += circle(ex, ey, hot ? 7 : 5, { fill: hot ? acc : fg(0.55) });
  }
  // Tally of the clicks: three fives and two.
  const tx = kx + 34, ty = ky + kh + 60;
  for (let g = 0; g < 4; g++) {
    const marks = g < 3 ? 4 : 2;
    for (let m = 0; m < marks; m++) s += line(tx + g * 66 + m * 12, ty, tx + g * 66 + m * 12, ty + 44, { stroke: fg(0.7), strokeWidth: 3, strokeLinecap: 'round' });
    if (g < 3) s += line(tx + g * 66 - 6, ty + 36, tx + g * 66 + 42, ty + 8, { stroke: acc, strokeWidth: 3, strokeLinecap: 'round' });
  }
  return s;
}

const DRAWINGS = {
  nexus: { draw: nexus, alt: 'Drawing of Nexus: one request entering a sealed boundary, passing a router and going to one of six models, drawn like an engineering diagram' },
  'voiceguide-ai': { draw: voiceguide, alt: 'Drawing of VoiceGuide AI: a voice waveform becoming a route through nine timed stops, ending in a PDF, among greetings in many languages' },
  'ai-summarizer': { draw: summarizer, alt: 'Drawing of AI Summarizer: the lines of a document page, down to a 4,000-character cut, flowing into three bullet points' },
  'price-tracker': { draw: priceTracker, alt: 'Drawing of Price Tracker: a price checked once a minute, stepping below a dashed £60 target and raising an alert' },
  'stock-dashboard': { draw: stockDashboard, alt: 'Drawing of Stock Dashboard: a year of closing prices over volume bars, with a crosshair, two metric panels and a ten-row table' },
  'url-shortener': { draw: urlShortener, alt: 'Drawing of URL Shortener: a long folded link condensed into a four-character key, with clicks fanning out and tallied below' },
};

// ---------------------------------------------------------------------------

const only = process.argv.slice(2);
const font = (await readFile(FONT)).toString('base64');
const manifest = JSON.parse(await readFile(MANIFEST, 'utf8'));
await mkdir(TMP, { recursive: true });

const browser = await puppeteer.launch({ executablePath: CHROME, headless: true, args: ['--force-color-profile=srgb'] });
try {
  const page = await browser.newPage();
  await page.setViewport({ width: W, height: H, deviceScaleFactor: SCALE });
  for (const [slug, { draw, alt }] of Object.entries(DRAWINGS)) {
    if (only.length && !only.includes(slug)) continue;
    const project = projects.find((p) => p.slug === slug);
    if (!project) throw new Error(`No project ${slug}`);
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" font-family="Mona, sans-serif">${draw(project.colors)}</svg>`;
    const html = `<!doctype html><html><head><style>
      @font-face { font-family: 'Mona'; src: url(data:font/woff2;base64,${font}) format('woff2'); font-weight: 200 900; font-stretch: 75% 125%; }
      html, body { margin: 0; background: ${project.colors.bg}; }
      svg { display: block; }
    </style></head><body>${svg}</body></html>`;
    await page.setContent(html, { waitUntil: 'load' });
    await page.evaluate(async () => {
      await document.fonts.ready;
    });
    const png = path.join(TMP, `${slug}.png`);
    await page.screenshot({ path: png, clip: { x: 0, y: 0, width: W, height: H } });
    const dir = path.join(MEDIA, slug);
    await rm(dir, { recursive: true, force: true });
    await mkdir(dir, { recursive: true });
    const jpg = path.join(dir, '1.jpg');
    execFileSync('sips', ['-s', 'format', 'jpeg', '-s', 'formatOptions', '92', png, '--out', jpg], { stdio: 'ignore' });
    manifest[slug] = [{ src: `/media/${slug}/1.jpg`, w: W * SCALE, h: H * SCALE, alt, cover: true }];
    console.log(`drew ${slug}`);
  }
} finally {
  await browser.close();
}
await writeFile(MANIFEST, JSON.stringify(manifest, null, 2) + '\n');
console.log('Wrote src/data/media.json');
