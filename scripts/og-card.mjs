// Draws the site's share card, the picture links to it show (Open Graph and
// X cards): public/og.png, 1200 x 630. Laid out as Lando's (landonorris.com's
// lando-OpenGraph): his two-line name lockup, 576px wide (48% of the card),
// centred over faint contour lines on a dark ground. His signature across it
// is left out. Ours: our lockup as the header draws it (DHANUSH in Fraunces
// over KRISHNA in Mona Sans, each line the same width), in bone, over our
// contour field (its still moment, as the menu shows it) in our red on black,
// drawn as his card's are: hairlines 1px across, as strong against the ground
// as his are against his (contrast 1.52). The lettering's middle sits where
// his does, 314.5px down. Rendered with the Chrome already on this Mac.
//   node scripts/og-card.mjs

import puppeteer from 'puppeteer-core';
import { writeFile, mkdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { snoiseClassic, contourField, isoLine, CONTOUR } from '../src/scripts/gl/glsl.js';
import { site } from '../src/data/site.js';

const CHROME = process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const OUT = path.join(ROOT, 'public/og.png');
const TMP = path.join(process.env.TMPDIR || tmpdir(), 'dk-og');
const fontFile = (pkg, file) => `file://${path.join(ROOT, 'node_modules/@fontsource-variable', pkg, 'files', file)}`;

const W = 1200;
const H = 630;
// His lockup's width on his card.
const LOCKUP = 576;
// Ours: black ground, bone letters, the site's line red (gl/field.js).
const BG = [0, 0, 0];
const INK = '#efe7e2';
const LINE = [0x6a, 0x12, 0x20];
// His card: ground #282d20, lines #44493a at their strongest.
const HIS = { bg: [40, 45, 32], line: [68, 73, 58] };
// The field's still moment (seconds), as the menu shows it.
const MOMENT = 40;
// His lines are hairlines, a pixel across.
const LINE_PX = 1;
// Moves the lockup's box so its letters' middle lands where his do
// (measured: ours otherwise sits 2.5px lower).
const NUDGE = -2.5;

const luminance = (rgb) => {
  const [r, g, b] = rgb.map((v) => v / 255).map((v) => (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const contrast = (a, b) => {
  const [x, y] = [luminance(a), luminance(b)].sort((p, q) => q - p);
  return (x + 0.05) / (y + 0.05);
};
// Our line colour at the strength that gives his card's contrast.
const target = contrast(HIS.bg, HIS.line);
let lo = 0;
let hi = 1;
for (let i = 0; i < 30; i++) {
  const mid = (lo + hi) / 2;
  const c = BG.map((v, k) => v + (LINE[k] - v) * mid);
  if (contrast(BG, c) < target) lo = mid;
  else hi = mid;
}
const line = BG.map((v, k) => (v + (LINE[k] - v) * lo) / 255);

const frag = `
#extension GL_OES_standard_derivatives : enable
precision highp float;
uniform vec2 uRes;
uniform vec3 uBg;
uniform vec3 uLine;
uniform float uLinePx;
${snoiseClassic}
${contourField}
${isoLine}
void main() {
  vec2 p = vec2(gl_FragCoord.x, gl_FragCoord.y) / uRes.y;
  float f = contourField(p * ${CONTOUR.scale.toFixed(2)}, ${MOMENT.toFixed(1)}) * ${CONTOUR.bands.toFixed(1)} + 0.5;
  gl_FragColor = vec4(mix(uBg, uLine, isoLine(f, uLinePx)), 1.0);
}`;

const html = `<!doctype html>
<meta charset="utf-8">
<style>
@font-face { font-family: 'Fraunces Variable'; src: url('${fontFile('fraunces', 'fraunces-latin-full-normal.woff2')}') format('woff2'); font-weight: 100 900; }
@font-face { font-family: 'Mona Sans Variable'; src: url('${fontFile('mona-sans', 'mona-sans-latin-wdth-normal.woff2')}') format('woff2'); font-weight: 200 900; font-stretch: 75% 125%; }
html, body { margin: 0; width: ${W}px; height: ${H}px; overflow: hidden; background: #000; }
canvas { position: absolute; inset: 0; width: ${W}px; height: ${H}px; }
/* The header's lockup (ui.css .lockup), at his card's size. */
.lockup { position: absolute; left: 50%; top: 50%; display: flex; flex-direction: column; width: ${LOCKUP}px;
  transform: translate(-50%, calc(-50% + ${NUDGE}px)); color: ${INK}; text-transform: uppercase; line-height: 0.8; white-space: nowrap; }
.lockup span { display: block; overflow: hidden; padding-block: 0.04em; }
.lockup b { display: inline-block; font-weight: inherit; }
.first { font-family: 'Fraunces Variable'; font-weight: 560; font-variation-settings: 'opsz' 144, 'SOFT' 0, 'WONK' 1; letter-spacing: -0.01em; }
.last { font-family: 'Mona Sans Variable'; font-weight: 830; font-stretch: 100%; letter-spacing: -0.015em; }
</style>
<canvas width="${W}" height="${H}"></canvas>
<div class="lockup"><span class="first"><b>${site.first}</b></span><span class="last"><b>${site.last}</b></span></div>
<script>
const canvas = document.querySelector('canvas');
const gl = canvas.getContext('webgl', { antialias: false, preserveDrawingBuffer: true });
gl.getExtension('OES_standard_derivatives');
const shader = (type, src) => { const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s)); return s; };
const prog = gl.createProgram();
gl.attachShader(prog, shader(gl.VERTEX_SHADER, 'attribute vec2 a; void main() { gl_Position = vec4(a, 0.0, 1.0); }'));
gl.attachShader(prog, shader(gl.FRAGMENT_SHADER, ${JSON.stringify(frag)}));
gl.linkProgram(prog);
gl.useProgram(prog);
gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
gl.enableVertexAttribArray(0);
gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
gl.uniform2f(gl.getUniformLocation(prog, 'uRes'), ${W}, ${H});
gl.uniform3f(gl.getUniformLocation(prog, 'uBg'), ${BG.map((v) => v / 255).join(', ')});
gl.uniform3f(gl.getUniformLocation(prog, 'uLine'), ${line.join(', ')});
gl.uniform1f(gl.getUniformLocation(prog, 'uLinePx'), ${LINE_PX});
gl.drawArrays(gl.TRIANGLES, 0, 3);
// Each line the lockup's width, as the header's script fits them.
document.fonts.ready.then(() => {
  document.querySelectorAll('.lockup span').forEach((line) => {
    const inner = line.querySelector('b');
    line.style.fontSize = '100px';
    line.style.fontSize = (100 * ${LOCKUP}) / inner.getBoundingClientRect().width + 'px';
  });
  window.done = true;
});
</script>`;

await rm(TMP, { recursive: true, force: true });
await mkdir(TMP, { recursive: true });
const page = path.join(TMP, 'og.html');
await writeFile(page, html);

const browser = await puppeteer.launch({ executablePath: CHROME, headless: true, args: ['--force-color-profile=srgb', '--allow-file-access-from-files'] });
try {
  const tab = await browser.newPage();
  await tab.setViewport({ width: W, height: H, deviceScaleFactor: 1 });
  await tab.goto(`file://${page}`, { waitUntil: 'load' });
  await tab.waitForFunction('window.done === true', { timeout: 20000 });
  await tab.screenshot({ path: OUT, type: 'png' });
  console.log(`wrote ${path.relative(ROOT, OUT)} (lines at contrast ${target.toFixed(2)})`);
} finally {
  await browser.close();
  await rm(TMP, { recursive: true, force: true });
}
