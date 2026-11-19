// The project grid: Lusion's cards (their ProjectItem: the image with 15px
// corners, a line of tags and the name). They move as you scroll in one of
// two ways. On the Work page (mode 'work') only as Unseen's do (their
// ProjectMenu scene): they fold away at the top. On the home page (mode
// 'home') only as Lusion's do (below). The images (and on the Work page the
// captions too) are redrawn in WebGL on top of their DOM copies, which stay
// for links, keyboard focus and screen readers.
//
// Lusion's, on the home page (their ProjectItem.update), each time a card
// comes on screen: its image grows from 70% of its box to all of it while the
// picture inside settles from 1.33 times its size (1.5s, expo out), and the
// image slides out from 5% of the screen's width toward the middle, turned
// 0.05 radians, into place (2s, expo out); its tags type themselves out at
// 40 letters a second behind five random characters; and each letter of its
// name rolls down a column of four copies into place (expo in-out, the middle
// letters first). While scrolling, cards near the top and bottom of the
// screen stretch sideways with how fast you scroll. Their captions are page
// text, as Lusion's are. Leaving the screen resets all of it.
//
// Unseen's fold, on the Work page: their scene has the camera 2000 units in front of the page
// and the cards 1000 units in front of it, so a unit is 2px. Above a line a
// third of the way down (their bend points: 100 to 700 units above the
// middle, for a screen 1100 tall), a card is pushed back into the distance,
// up to 1200 units, and pulled down, up to 1.5 times the height of their card
// image (pullFor: theirs, not ours, which are bigger), with two slow waves
// running across it (±50 units of depth, ±0.5 of the pull).
// So the top row tips back and folds away behind itself as it rises, its
// edge rippling, sinking at first and then climbing back up the screen into
// the distance, fading out between 1500 and 2000 units of their depth (read
// off their depth buffer, a little less than the true distance) and misting
// toward the background colour (from 500 units to 4500) as it goes. Once
// whatever follows the grid (the footer, or the home page's button) starts
// coming up, the fold comes down the screen to meet the last row, easing in,
// so the cards have folded away completely by the time they would leave the
// screen (or the page ends, if sooner): none is ever left half-folded to ride
// up with the page. Their constant ripple, drifting camera, grain and colour
// fringing are left out: at rest the cards sit still and sharp, with only a
// small red/blue split while scrolling.
//
// Lusion's hover (their ProjectItem.update): over the card, the name slides
// 1.5em to the right, letter by letter, as an arrow slides in on its left.
// Over the image, the image eases back from its resting 2.5% zoom (a spring),
// jolts twice in random directions, shakes briefly and then drifts with the
// cursor, as their depth-mapped images do (ours have no depth maps, so the
// image is taken as one flat plate at middle depth). Their cards' entrances
// as they scroll in (sliding in from the sides, the name rolling up, the tags
// typing themselves out) and their scroll ripple are left out: the scroll
// motion is Unseen's alone.
//
// Filtering plays Unseen's filter change, and the page's first showing plays
// its second half (filter()). Opening a project zooms the whole grid into its
// card, Lusion's way (zoom(), driven by core/projectZoom.js and the router).
import * as THREE from 'three';
import { gsap } from 'gsap';
import { scrollVelocity } from '../core/scroll.js';
import { reducedMotion, isTouch, hexToRgb, unhovered } from '../core/env.js';
import { fullscreenVert } from './glsl.js';
import { cubicInOut, fit, expoOut, expoInOut, lusionEase } from '../core/projectZoom.js';

// Unseen's breakpoints (min-widths): sm, md, lg, xlg.
const SM = 768;
const MD = 1024;
const LG = 1366;
const XLG = 1921;
// Lusion's phone layout.
const MOBILE = 812;

// Unseen's bend points, in units above the middle of a screen h tall.
export function bendFor(w, h) {
  if (w >= MD) return [(100 * h) / 1100, (700 * h) / 1100];
  if (w >= SM) return [100, 500];
  return [100, 600];
}

// How far down a folding card is pulled (before their 1.5 times and the
// wave): the height of Unseen's card image, in units, for this screen width
// (their 430-unit image times its size for the breakpoint, grown with the
// width on large screens). Ours are Lusion's cards, taller than theirs, so
// pulling by our own height would drag a folded row down behind the next one
// before it could climb back up into the distance, as theirs do.
export function pullFor(w) {
  const size = w >= LG ? 0.35 : w >= MD ? 0.28 : w >= SM ? 0.3 : 0.21;
  const grow = w >= XLG ? w / 2150 + 0.2 : w >= LG ? w / 2150 + 0.3 : 1;
  return 430 * size * grow;
}

// How far up the screen a card's lowest point must be (px, maybe above the
// top) for it to have faded out completely: 83% of the way through the fold,
// its depth (as their shader reads it) is past 2000 whatever the wave does.
export function goneLine(w, h) {
  const [bx, by] = bendFor(w, h);
  return h / 2 - 2 * (bx + 0.83 * (by - bx));
}

// Whether a card is laid out at all: the home page hides its second half on
// phones and tablets (pages.css), and the Work page's filters hide some.
const showing = (card) => getComputedStyle(card).display !== 'none';


// Lusion's SecondOrderDynamics (the robust form): a spring with frequency f,
// damping z and response r that follows `target`.
class Spring {
  constructor(value, f, z, r) {
    const w = 2 * Math.PI * f;
    this.value = value;
    this.target = value;
    this.prev = value;
    this.vel = 0;
    this.w = w;
    this.z = z;
    this.d = w * Math.sqrt(Math.abs(z * z - 1));
    this.k1 = z / (Math.PI * f);
    this.k2 = 1 / (w * w);
    this.k3 = (r * z) / w;
  }
  update(dt) {
    if (dt <= 0) return this.value;
    const t = this.target;
    const tv = (t - this.prev) / dt;
    this.prev = t;
    let k1;
    let k2;
    if (this.w * dt < this.z) {
      k1 = this.k1;
      k2 = Math.max(this.k2, (dt * dt) / 2 + (dt * this.k1) / 2, dt * this.k1);
    } else {
      const e = Math.exp(-this.z * this.w * dt);
      const r = 2 * e * (this.z <= 1 ? Math.cos(dt * this.d) : Math.cosh(dt * this.d));
      const n = e * e;
      const a = dt / (1 + n - r);
      k1 = (1 - n) * a;
      k2 = dt * a;
    }
    this.vel += (t + this.k3 * tv - this.value - k1 * this.vel) * (dt / k2);
    this.value += this.vel * dt;
    return this.value;
  }
}

// Both parts of a card: Unseen's fold, then Lusion's zoom into a card.
const vert = /* glsl */ `
uniform vec2 uPos;
uniform vec2 uSize;
uniform vec2 uView;
uniform vec2 uBend;
uniform float uShift;
uniform float uPull;
uniform float uLift;
uniform float uTime;
uniform float uDist;
uniform float uZoomScale;
uniform vec2 uZoomShift;
uniform vec2 uZoomTurn;
varying vec2 vUv;
varying float vDepth;
void main() {
  vUv = uv;
  // The point on the page, in px from the screen's top left...
  vec2 s = uPos + vec2(uv.x * uSize.x, (1.0 - uv.y) * uSize.y);
  // ...and where Unseen's scene has it: in units of 2px from the middle of
  // the screen, y up, 1000 units in front (their cards' depth; uLift moves a
  // card nearer). uShift moves their picture down the screen.
  vec3 wp = vec3((s.x - uView.x * 0.5) * 0.5, (uView.y * 0.5 + uShift - s.y) * 0.5, 1000.0 + uLift);

  // Their vertex shader, less its constant ripple and the cursor's fluid.
  float noise = sin((wp.x - wp.y * 0.1) * 0.03 + -uTime * 1.1 + cos(wp.z * 0.04) * 10.0) * 50.0;
  float noise2 = sin((wp.x + wp.y * 0.1) * 0.01 + -uTime * 0.4) * 0.5;
  vec3 p = wp;
  float back = smoothstep(uBend.x, uBend.y, wp.y);
  p.z -= 1200.0 * back;
  p.z -= noise * back;
  p.y -= (1.5 - noise2) * smoothstep(uBend.x * 1.1, uBend.y * 0.7, wp.y) * uPull;

  // How far it is from their camera, and the same point for ours, placed so
  // it lands where theirs draws it (shifted down by uShift). Flat cards land
  // exactly on their DOM copies.
  float d = 2000.0 - p.z;
  float f = d / 1000.0;
  // Their fade and fog read depth as gl_FragCoord.z / gl_FragCoord.w, which
  // with their camera (near 100, far 4500) is 4500/4400 of (distance - 100):
  // a little less than the distance, so a folded card fades later and is
  // still there as it climbs back up the screen into the distance.
  vDepth = (4500.0 / 4400.0) * (d - 100.0);
  vec3 w = vec3(uView.x * 0.5 + p.x * 2.0, -uView.y * 0.5 + p.y * 2.0 - uShift * f, uDist * (1.0 - f));

  // Lusion's zoom into a card (their ProjectItemList): the whole grid shifts
  // toward the chosen card and scales by uZoomScale about the screen's centre,
  // then turns a little, a roll and then a yaw toward the card's side.
  vec3 q = vec3(w.x - uView.x * 0.5 + uZoomShift.x, w.y + uView.y * 0.5 - uZoomShift.y, w.z) * uZoomScale;
  float cr = cos(uZoomTurn.y), sr = sin(uZoomTurn.y);
  q.xy = vec2(cr * q.x - sr * q.y, sr * q.x + cr * q.y);
  float cy = cos(uZoomTurn.x), sy = sin(uZoomTurn.x);
  q.xz = vec2(cy * q.x + sy * q.z, -sy * q.x + cy * q.z);
  w = vec3(uView.x * 0.5, -uView.y * 0.5, 0.0) + q;
  gl_Position = projectionMatrix * viewMatrix * vec4(w, 1.0);
}
`;

// Unseen's fade and mist, shared by both parts.
const fade = /* glsl */ `
uniform vec3 uBg;
uniform float uOpacity;
varying float vDepth;
float farFade() { return smoothstep(2000.0, 1500.0, vDepth) * uOpacity; }
vec3 mist(vec3 c) { return mix(c, uBg, smoothstep(500.0, 4500.0, vDepth)); }
`;

// Lusion's card image (their ProjectItem shader), for an image with no depth
// map: a flat plate at middle depth.
const imageFrag = /* glsl */ `
precision highp float;
uniform sampler2D uImage;
uniform float uHasImage;
uniform vec2 uImageSize;
uniform vec2 uSize;
uniform float uRadius;
uniform float uZoom;
uniform vec2 uFocus;
uniform vec2 uJolt;
uniform vec3 uPlaceholder;
uniform float uFog;
uniform vec3 uFogColor;
varying vec2 vUv;
${fade}

float sdRoundedBox(vec2 p, vec2 b, float r) {
  vec2 q = abs(p) - b + r;
  return min(max(q.x, q.y), 0.0) + length(max(q, 0.0)) - r;
}

void main() {
  // Their rounded corners, with a one-pixel soft edge.
  float d = sdRoundedBox((vUv - 0.5) * uSize, uSize * 0.5, uRadius);
  float edge = smoothstep(0.0, -fwidth(d), d);

  // Their image: zoomed 2.5% in at rest and not at all once hovered (uZoom),
  // seen from a camera 10 card-heights away (5 when hovered) aimed at uFocus
  // (px from the middle, y up), through a plate 0.15 card-heights deep whose
  // surface sits halfway down; jolted by uJolt; and covering the card.
  vec2 p = (vUv - 0.5) * uSize * mix(0.975, 1.0, uZoom);
  float cam = mix(10.0, 5.0, uZoom);
  p = uFocus + (p - uFocus) * (cam + 0.075) / (cam + 0.15);
  vec2 cover = uImageSize * max(uSize.x / uImageSize.x, uSize.y / uImageSize.y);
  vec2 uv = p / cover + 0.5 + uJolt * 0.015;
  // Sampled before any branching: mipmap selection needs screen-space
  // derivatives, which are only reliable there.
  vec4 col = texture2D(uImage, uv);
  // No image (yet): a plain panel in the project's own colour.
  if (uHasImage < 0.5) col = vec4(uPlaceholder, 1.0);
  // Opening its project, the image dissolves into the project's colour.
  col.rgb = mix(col.rgb, uFogColor, uFog);
  float a = farFade() * edge;
  gl_FragColor = vec4(mist(col.rgb) * a, a);
}
`;

const metaFrag = /* glsl */ `
precision highp float;
uniform sampler2D uMeta;
uniform float uCaption;
varying vec2 vUv;
${fade}
void main() {
  vec4 col = texture2D(uMeta, vUv);
  // The caption is page text to Lusion: it fades with the rest of it.
  float a = col.a * farFade() * uCaption;
  gl_FragColor = vec4(mist(col.rgb) * a, a);
}
`;

// The home page's image (Lusion's ProjectItem mesh, their UfxMesh): the box
// widened by uPad (left, right) on its outer side, as theirs is by 1000px, so
// the picture can slide and stretch past it; turned by uTurn about the box's
// middle (anticlockwise, as their rotation.z) and moved uSlide px sideways;
// then Lusion's zoom into a card.
const lusionVert = /* glsl */ `
uniform vec2 uPos;
uniform vec2 uSize;
uniform vec2 uPad;
uniform float uSlide;
uniform float uTurn;
uniform vec2 uView;
uniform float uZoomScale;
uniform vec2 uZoomShift;
uniform vec2 uZoomTurn;
varying vec2 vUv;
void main() {
  vec2 s = vec2(mix(uPos.x - uPad.x, uPos.x + uSize.x + uPad.y, uv.x), uPos.y + (1.0 - uv.y) * uSize.y);
  // The box's own coordinates (0..1 across it, beyond it in the padding).
  vUv = vec2((s.x - uPos.x) / uSize.x, uv.y);
  vec2 c = uPos + uSize * 0.5;
  vec2 d = s - c;
  float cs = cos(uTurn), sn = sin(uTurn);
  s = c + vec2(d.x * cs + d.y * sn, -d.x * sn + d.y * cs) + vec2(uSlide, 0.0);
  vec3 w = vec3(s.x, -s.y, 0.0);
  vec3 q = vec3(w.x - uView.x * 0.5 + uZoomShift.x, w.y + uView.y * 0.5 - uZoomShift.y, w.z) * uZoomScale;
  float cr = cos(uZoomTurn.y), sr = sin(uZoomTurn.y);
  q.xy = vec2(cr * q.x - sr * q.y, sr * q.x + cr * q.y);
  float cy = cos(uZoomTurn.x), sy = sin(uZoomTurn.x);
  q.xz = vec2(cy * q.x + sy * q.z, -sy * q.x + cy * q.z);
  w = vec3(uView.x * 0.5, -uView.y * 0.5, 0.0) + q;
  gl_Position = projectionMatrix * viewMatrix * vec4(w, 1.0);
}
`;

// Their image shader with its show and scroll ripple: the rounded box grows
// from 70% (uShow 0) to all of the card, the picture settles from 1.33 times
// its size, and while scrolling the image is pushed sideways by uRipple times
// how far it is from the middle of the screen, most at the screen's top and
// bottom. Then their hover, as on the Work page.
const lusionFrag = /* glsl */ `
precision highp float;
uniform sampler2D uImage;
uniform float uHasImage;
uniform vec2 uImageSize;
uniform vec2 uSize;
uniform float uRadius;
uniform float uShow;
uniform float uRipple;
uniform vec2 uRes;
uniform float uZoom;
uniform vec2 uFocus;
uniform vec2 uJolt;
uniform vec3 uPlaceholder;
uniform float uFog;
uniform vec3 uFogColor;
uniform float uOpacity;
varying vec2 vUv;

float sdRoundedBox(vec2 p, vec2 b, float r) {
  vec2 q = abs(p) - b + r;
  return min(max(q.x, q.y), 0.0) + length(max(q, 0.0)) - r;
}

void main() {
  vec2 screenUv = gl_FragCoord.xy / uRes;
  vec2 base = vUv;
  base.x -= (screenUv.x - 0.5) * (1.0 - sin(screenUv.y * 3.141592)) * uRipple;
  float d = sdRoundedBox((base - 0.5) * uSize, uSize * 0.5 * mix(0.7, 1.0, uShow), uRadius);
  float edge = smoothstep(0.0, -fwidth(d), d);

  vec2 p = (base - 0.5) * uSize * mix(0.75, 1.0, uShow) * mix(0.975, 1.0, uZoom);
  float cam = mix(10.0, 5.0, uZoom);
  p = uFocus + (p - uFocus) * (cam + 0.075) / (cam + 0.15);
  vec2 cover = uImageSize * max(uSize.x / uImageSize.x, uSize.y / uImageSize.y);
  vec2 uv = p / cover + 0.5 + uJolt * 0.015;
  vec4 col = texture2D(uImage, uv);
  if (uHasImage < 0.5) col = vec4(uPlaceholder, 1.0);
  col.rgb = mix(col.rgb, uFogColor, uFog);
  float a = edge * uOpacity;
  gl_FragColor = vec4(col.rgb * a, a);
}
`;

// The cards are drawn into an offscreen image first, then copied to the
// screen. At rest the copy is exact. While scrolling, red and blue are taken
// from uShift device pixels above and below, a small colour split that
// settles back to zero when the page stops. Nothing is copied below the
// page's bottom edge once the footer shows under it (its curved top, as the
// background draws it: uFootEdge at the sides, uFootDepth lower mid-way).
const postFrag = /* glsl */ `
precision highp float;
uniform sampler2D uScene;
uniform vec2 uRes;
uniform float uShift;
uniform float uFootEdge;
uniform float uFootDepth;
uniform float uFootW;
varying vec2 vUv;
void main() {
  float fx = clamp(gl_FragCoord.x / uFootW, 0.0, 1.0);
  if (uRes.y - gl_FragCoord.y >= uFootEdge + uFootDepth * 4.0 * fx * (1.0 - fx)) {
    gl_FragColor = vec4(0.0);
    return;
  }
  vec2 off = vec2(0.0, uShift / uRes.y);
  vec4 a = texture2D(uScene, vUv);
  vec4 r = texture2D(uScene, vUv + off);
  vec4 b = texture2D(uScene, vUv - off);
  gl_FragColor = vec4(r.r, a.g, b.b, max(a.a, max(r.a, b.a)));
}
`;

const mixRgb = (a, b, t) => a.map((v, i) => v + (b[i] - v) * t);

// Draws a card's caption (the tags and the name with its arrow) where the DOM
// puts it, into `canvas`, which covers `area` (CSS px on screen) at device
// pixels, so it maps one to one onto the screen's pixels. The name's line
// hides whatever leaves it (the arrow at rest), as on the page.
function drawMeta(canvas, meta, area, dpr) {
  const ctx = canvas.getContext('2d');
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, area.width, area.height);

  // Each word (or letter) is drawn exactly where the page laid it out.
  const range = document.createRange();
  const text = (el) => {
    if (!el) return;
    const cs = getComputedStyle(el);
    const upper = cs.textTransform === 'uppercase';
    ctx.font = `${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`;
    if ('letterSpacing' in ctx) ctx.letterSpacing = cs.letterSpacing === 'normal' ? '0px' : cs.letterSpacing;
    ctx.fillStyle = cs.color;
    ctx.textBaseline = 'alphabetic';
    // A word's box starts at the font's ascent above its baseline.
    const ascent = ctx.measureText('Hg').fontBoundingBoxAscent;
    const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
    for (let node = walker.nextNode(); node; node = walker.nextNode()) {
      const words = /\S+/g;
      for (let m = words.exec(node.data); m; m = words.exec(node.data)) {
        range.setStart(node, m.index);
        range.setEnd(node, m.index + m[0].length);
        const r = range.getClientRects()[0];
        if (r) ctx.fillText(upper ? m[0].toUpperCase() : m[0], r.left - area.left, r.top - area.top + ascent);
      }
    }
  };
  text(meta.querySelector('.card__tags'));

  const name = meta.querySelector('.card__name');
  const nb = name.getBoundingClientRect();
  ctx.save();
  ctx.beginPath();
  ctx.rect(nb.left - area.left, nb.top - area.top, nb.width, nb.height);
  ctx.clip();
  text(name.querySelector('.card__letters'));
  const arrow = name.querySelector('.card__arrow');
  if (arrow) {
    const r = arrow.getBoundingClientRect();
    const s = r.width / 16;
    ctx.translate(r.left - area.left, r.top - area.top);
    ctx.scale(s, s);
    ctx.strokeStyle = getComputedStyle(arrow).color;
    ctx.lineWidth = 1.25;
    ctx.lineCap = 'square';
    ctx.stroke(new Path2D('M1.5 8h12.5M8.5 2.5 14 8l-5.5 5.5'));
  }
  ctx.restore();
}

const metaTexture = (canvas, anisotropy) => {
  const tex = new THREE.CanvasTexture(canvas);
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  tex.generateMipmaps = true;
  tex.anisotropy = anisotropy;
  return tex;
};

// Lusion's hover thresholds: the image jolts as the hover passes 0.2 and 0.3.
const THRESHOLDS = [0, 0.2, 0.3];
const band = (v) => {
  for (let i = 0; i < THRESHOLDS.length; i++) if (v < THRESHOLDS[i]) return i;
  return THRESHOLDS.length;
};

export function createCards(engine, section, { mode = 'work' } = {}) {
  const grid = section?.querySelector('[data-cards]');
  if (!grid) return null;
  // The home page moves as Lusion's; the Work page as Unseen's.
  const lusion = mode === 'home';
  const { state } = engine;
  const html = document.documentElement;
  const anisotropy = Math.min(8, engine.renderer.capabilities.getMaxAnisotropy());
  const bg = hexToRgb(getComputedStyle(html).getPropertyValue('--bg').trim() || '#000000');

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(40, 1, 10, 20000);
  const rt = new THREE.WebGLRenderTarget(1, 1, { samples: 4, depthBuffer: false });
  const foot = engine.field?.uniforms;
  const postUniforms = {
    uScene: { value: rt.texture },
    uRes: { value: new THREE.Vector2(1, 1) },
    uShift: { value: 0 },
    // The footer's edge, shared with the background (pages/common.js sets it).
    uFootEdge: foot?.uFootEdge ?? { value: 1e6 },
    uFootDepth: foot?.uFootDepth ?? { value: 0 },
    uFootW: foot?.uFootW ?? { value: 1 },
  };
  const post = new THREE.Mesh(
    new THREE.PlaneGeometry(2, 2),
    new THREE.ShaderMaterial({
      vertexShader: fullscreenVert,
      fragmentShader: postFrag,
      uniforms: postUniforms,
      transparent: true,
      // The offscreen image already has its colours multiplied by alpha.
      premultipliedAlpha: true,
      depthTest: false,
      depthWrite: false,
    }),
  );
  const postScene = new THREE.Scene();
  postScene.add(post);
  const postCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  // Unseen's planes: 12 by 12 segments for the image and for the caption.
  // Lusion's images stay flat: one quad.
  const geometry = new THREE.PlaneGeometry(1, 1, 12, 12);
  const quad = new THREE.PlaneGeometry(1, 1, 1, 1);
  const bufferSize = new THREE.Vector2();

  const items = [];
  const listeners = [];
  let ready = false;
  let velocity = 0;
  // Uniforms every card shares: the screen, the fold, Lusion's zoom.
  const shared = {
    uView: { value: new THREE.Vector2(1, 1) },
    uBend: { value: new THREE.Vector2(100, 700) },
    uShift: { value: 0 },
    uTime: { value: 0 },
    uDist: { value: 1000 },
    uBg: { value: new THREE.Color().setRGB(...bg) },
    uZoomScale: { value: 1 },
    uZoomShift: { value: new THREE.Vector2() },
    uZoomTurn: { value: new THREE.Vector2() },
  };
  const uCaption = { value: 1 };
  // Lusion's scroll strength (their ScrollManager.easedScrollStrength): the
  // scroll each frame as a share of the screen's height, eased away at 10 a
  // second, at most 1; the ripple is half of it, at most 0.15.
  const ripple = { value: 0 };
  let strength = 0;
  let lastScroll = window.scrollY;
  const zoom = { item: null, ratio: 0, caption: 1 };
  let settled = false; // arriving back from a project: no entrance
  let wantIntro = false;
  let shownOnce = false;
  let filtering = null;
  let whenBuilt;
  const built = new Promise((r) => (whenBuilt = r));

  const shown = () => items.filter((it) => !it.card.hidden);

  // The end of the grid. With b the last card's lowest point on the screen:
  // from when whatever follows (the home page's button, or the page's end,
  // where the footer starts to show) reaches the bottom of the screen, the
  // fold is moved down the screen by U t^2, t running from 0 there to 1 when
  // b reaches the top of the screen (or wherever it stops when the page can
  // scroll no further, if lower), and U just enough that b has passed
  // goneLine() by then. It depends only on where the page is, so it runs back
  // the same way when scrolling up.
  const more = section.querySelector('.grid-more');
  const shiftNow = () => {
    const list = shown();
    const last = list[list.length - 1];
    if (!last) return 0;
    const h = state.height;
    const b = last.meta.getBoundingClientRect().bottom;
    const next = more ? more.getBoundingClientRect().top : section.getBoundingClientRect().bottom;
    const max = document.documentElement.scrollHeight - h;
    const done = Math.max(0, b - Math.max(0, max - window.scrollY));
    const start = Math.max(b + h - next, done + h / 2);
    const t = Math.min(1, Math.max(0, (start - b) / (start - done)));
    return Math.max(0, done - goneLine(state.width, h)) * t * t;
  };

  // A box in whole device pixels. Only positions change as the page scrolls;
  // sizes stay fixed, so the caption never gets resampled.
  const px = (r) => {
    const dpr = state.dpr;
    return { left: Math.round(r.left * dpr), top: Math.round(r.top * dpr), w: Math.round(r.width * dpr), h: Math.round(r.height * dpr) };
  };
  // The caption's area: its box, widened a little either side for the
  // name's first letter and the arrow (the name sits 0.06em left of it).
  const captionArea = (it) => {
    const r = it.meta.getBoundingClientRect();
    const pad = Math.ceil(parseFloat(getComputedStyle(it.name).fontSize) * 0.25);
    return px({ left: r.left - pad, top: r.top, width: r.width + 2 * pad, height: r.height });
  };

  const redrawMeta = (it, b) => {
    const dpr = state.dpr;
    const area = { left: b.left / dpr, top: b.top / dpr, width: b.w / dpr, height: b.h / dpr };
    const resized = it.canvas.width !== b.w || it.canvas.height !== b.h;
    if (resized) {
      it.canvas.width = Math.max(2, b.w);
      it.canvas.height = Math.max(2, b.h);
    }
    drawMeta(it.canvas, it.meta, area, dpr);
    if (resized || !it.metaUniforms.uMeta.value) {
      it.metaUniforms.uMeta.value?.dispose();
      it.metaUniforms.uMeta.value = metaTexture(it.canvas, anisotropy);
    } else it.metaUniforms.uMeta.value.needsUpdate = true;
    it.metaW = b.w;
    it.metaH = b.h;
    it.metaDirty = false;
  };

  const part = (fragmentShader, uniforms, order, vertexShader = vert, geo = geometry) => {
    const mesh = new THREE.Mesh(
      geo,
      new THREE.ShaderMaterial({
        vertexShader,
        fragmentShader,
        uniforms,
        transparent: true,
        premultipliedAlpha: true,
        depthTest: false,
        depthWrite: false,
        side: THREE.DoubleSide,
      }),
    );
    mesh.frustumCulled = false;
    mesh.renderOrder = order;
    scene.add(mesh);
    return mesh;
  };

  // Unseen's filter change, in two halves (their onProjectFiltersChange): the
  // cards shown drift 100 units away (0.5s, power2.out) as they fade (0.3s),
  // 0.035s apart; once the last has faded the grid changes, and the cards now
  // shown come from 100 units nearer back into place as they fade in (0.5s
  // each), 0.035s apart.
  const fadeOut = () => {
    const tl = gsap.timeline({ defaults: { duration: 0.5, ease: 'power2.out' } });
    shown().forEach((it, i) => {
      tl.to(it.lift, { value: -100, overwrite: true }, 0.035 * i);
      tl.to(it.opacity, { value: 0, duration: 0.3, overwrite: true }, '<');
    });
    // Their next step waits for the last fade, not the last drift.
    return new Promise((done) => tl.call(done, null, '>'));
  };
  const fadeIn = () => {
    const tl = gsap.timeline({ defaults: { duration: 0.5, ease: 'power2.out' } });
    shown().forEach((it, i) => {
      tl.fromTo(it.lift, { value: 100 }, { value: 0, overwrite: true }, 0.035 * i);
      tl.to(it.opacity, { value: 1, overwrite: true }, '<');
    });
    return tl;
  };
  const showAll = () => {
    items.forEach((it) => {
      gsap.killTweensOf([it.lift, it.opacity]);
      it.lift.value = 0;
      it.opacity.value = 1;
    });
  };
  const playIntro = () => {
    if (shownOnce) return;
    shownOnce = true;
    if (reducedMotion() || settled) showAll();
    else fadeIn();
  };

  const build = async () => {
    await document.fonts.ready;
    const cards = [...grid.querySelectorAll('[data-card]')];
    cards.forEach((card, index) => {
      const visual = card.querySelector('.card__visual');
      const media = card.querySelector('.card__media');
      const meta = card.querySelector('.card__meta');
      const name = card.querySelector('.card__name');
      const img = card.querySelector('[data-card-img]');
      const tint = hexToRgb(card.dataset.bg || '#200608');
      // Per card, shared by its image and caption.
      const lift = { value: 0 };
      const opacity = { value: lusion || reducedMotion() || settled ? 1 : 0 };
      const pull = { value: 100 };
      const uniforms = {
        ...shared,
        uPos: { value: new THREE.Vector2() },
        uSize: { value: new THREE.Vector2(1, 1) },
        uPull: pull,
        uLift: lift,
        uOpacity: opacity,
        uImage: { value: null },
        uHasImage: { value: 0 },
        uImageSize: { value: new THREE.Vector2(16, 10) },
        uRadius: { value: 15 },
        uZoom: { value: 0 },
        uFocus: { value: new THREE.Vector2() },
        uJolt: { value: new THREE.Vector2() },
        uPlaceholder: { value: new THREE.Color().setRGB(...mixRgb(tint, [0.78, 0.06, 0.18], 0.12)) },
        uFog: { value: 0 },
        uFogColor: { value: new THREE.Color().setRGB(...tint) },
        // Lusion's show, slide, turn and ripple (home page).
        uPad: { value: new THREE.Vector2() },
        uSlide: { value: 0 },
        uTurn: { value: 0 },
        uShow: { value: 1 },
        uRipple: ripple,
        uRes: postUniforms.uRes,
      };
      const metaUniforms = {
        ...shared,
        uPos: { value: new THREE.Vector2() },
        uSize: { value: new THREE.Vector2(1, 1) },
        uPull: pull,
        uLift: lift,
        uOpacity: opacity,
        uMeta: { value: null },
        uCaption,
      };
      // Drawn in project order, each caption after its image. On the home
      // page only the image is drawn: the caption is page text.
      const image = lusion ? part(lusionFrag, uniforms, index, lusionVert, quad) : part(imageFrag, uniforms, 2 * index);
      const caption = lusion ? null : part(metaFrag, metaUniforms, 2 * index + 1);
      const tags = card.querySelector('.card__tags');
      const item = {
        card,
        visual,
        media,
        meta,
        name,
        letters: [...card.querySelectorAll('.card__letter')],
        arrow: card.querySelector('.card__arrow'),
        img,
        uniforms,
        metaUniforms,
        image,
        caption,
        lift,
        opacity,
        canvas: document.createElement('canvas'),
        metaW: 0,
        metaH: 0,
        metaDirty: true,
        path: new URL(card.href).pathname,
        // Lusion's hover state (their ProjectItem).
        overCard: false,
        overImage: false,
        nameRatio: 0,
        hoverRatio: 0,
        zoom: new Spring(0, 2.2, 0.7, 3),
        focusX: new Spring(0, 1, 0.6, 2),
        focusY: new Spring(0, 1, 0.6, 2),
        jolt: new THREE.Vector2(),
        joltTarget: new THREE.Vector2(),
        // Lusion's scroll-in (home page): time on screen for the image, the
        // tags and the name; arriving back from a project they start done.
        index,
        tags,
        tagsText: tags?.textContent ?? '',
        showTime: settled ? 2 : 0,
        tagsTime: settled ? 10 : 0,
        nameTime: settled ? 10 : 0,
        typed: settled,
        rolled: false,
      };
      items.push(item);

      if (img) {
        const useImage = () => {
          const tex = new THREE.Texture(img);
          // Mipmaps: the screenshots are larger than the cards, and shrinking
          // them without mipmaps makes small text shimmer like grain.
          tex.minFilter = THREE.LinearMipmapLinearFilter;
          tex.generateMipmaps = true;
          tex.anisotropy = anisotropy;
          tex.needsUpdate = true;
          uniforms.uImage.value = tex;
          uniforms.uHasImage.value = 1;
          uniforms.uImageSize.value.set(img.naturalWidth || 16, img.naturalHeight || 10);
          // Sent to the graphics chip now, mipmaps and all, not on its first
          // draw: that costs a frame, and mid-scroll a missed frame shows (on
          // a phone the page carries on while what we draw stalls). Pictures
          // load under the loader or the page-change cover (app.js, router.js).
          engine.renderer.initTexture(tex);
        };
        if (img.complete && img.naturalWidth) useImage();
        else img.addEventListener('load', useImage, { once: true });
        // Fetched now, ready before it scrolls on; a hidden card's waits
        // until it shows (a phone never downloads the home page's second half).
        if (showing(card)) img.loading = 'eager';
      }

      // Their hover: over the card for the name, over the image for the image.
      if (!isTouch()) {
        const on = (key, v) => () => (item[key] = v);
        const handlers = [
          [card, 'pointerenter', on('overCard', true)],
          [card, 'pointerleave', on('overCard', false)],
          [media, 'pointerenter', on('overImage', true)],
          [media, 'pointerleave', on('overImage', false)],
        ];
        handlers.forEach(([el, type, fn]) => el.addEventListener(type, fn));
        listeners.push(() => handlers.forEach(([el, type, fn]) => el.removeEventListener(type, fn)));
      }
    });
    ready = true;
    section.classList.add(lusion ? 'is-gl-images' : 'is-gl-cards');
    layer.resize();
    if (wantIntro || settled) playIntro();
    whenBuilt();
  };
  build();

  // Lusion's hover, a frame at a time (their ProjectItem.update).
  const hover = (it, dt, mobile) => {
    // The name: 2.5 a second toward 1 over the card, back to 0 off it. Each
    // letter slides up to 1.5em, the last ones a touch earlier, and the arrow
    // comes in once the slide is under way. On phones both stay put, the
    // arrow showing (the stylesheet does that).
    // Once a page change starts the card counts as unhovered, pointer or
    // not, as links do on Lando's (core/env.js).
    const leaving = unhovered();
    const overCard = it.overCard && !leaving;
    const overImage = it.overImage && !leaving;
    const was = it.nameRatio;
    it.nameRatio = Math.min(1, Math.max(0, it.nameRatio + (overCard ? 1 : -1) * dt * 2.5));
    if (!lusion && (it.nameRatio !== was || it.mobile !== mobile)) {
      const n = it.letters.length;
      it.letters.forEach((el, f) => {
        const v = Math.min(1, Math.max(0, it.nameRatio - Math.abs(f - n - 1) / 100));
        el.style.transform = mobile ? '' : `translateX(${fit(v, 0, 1, 0, 1.5, lusionEase)}em)`;
      });
      if (it.arrow) it.arrow.style.transform = mobile ? '' : `translateX(${fit(it.nameRatio, 0.3, 1, 0, 1, lusionEase)}em)`;
      it.mobile = mobile;
      it.metaDirty = true;
    }

    // The image: hoverRatio rises 1 a second over it and falls off it. As it
    // passes 0.2 and 0.3 the image is jolted in a random direction (by 0.67,
    // then 0.25 of their unit), the jolt easing off by 5% a frame; while it
    // is under 0.3 the focus point shakes (up to 0.75 of the image's height);
    // after that it follows the cursor. The zoom spring heads for 1.
    const u = it.uniforms;
    const before = it.hoverRatio;
    it.hoverRatio = Math.min(1, Math.max(0, it.hoverRatio + (overImage ? 1 : -1) * dt));
    if (before < it.hoverRatio) {
      const a = band(before);
      const b = band(it.hoverRatio);
      if (a !== b) {
        const angle = Math.random() * Math.PI * 2;
        it.joltTarget.set(Math.cos(angle), Math.sin(angle)).multiplyScalar(fit(it.hoverRatio, 0, 0.6, 1, 0));
        if (b === THRESHOLDS.length) it.joltTarget.multiplyScalar(0.5);
      }
    } else it.joltTarget.multiplyScalar(0.95);
    it.jolt.lerp(it.joltTarget, 0.2);
    u.uJolt.value.copy(it.jolt);

    const opening = zoom.item === it && zoom.ratio > 0;
    if (overImage && !zoom.item) {
      const r = it.media.getBoundingClientRect();
      const shake = it.hoverRatio > 0 ? fit(it.hoverRatio, 0, 0.3, 1, 0) * r.height * 0.75 : 0;
      const t = state.time;
      it.focusX.target = ((state.pointer.x - r.left - r.width / 2 + Math.cos(t * 20) * shake) / r.width) * -r.height;
      it.focusY.target = ((state.pointer.y - r.top - r.height / 2 - Math.sin(t * 30) * shake) / r.height) * r.height;
    } else {
      it.focusX.target = 0;
      it.focusY.target = 0;
    }
    it.zoom.target = overImage || opening ? 1 : 0;
    u.uFocus.value.set(it.focusX.update(dt), it.focusY.update(dt));
    u.uZoom.value = it.zoom.update(dt);
  };

  // Lusion's scroll-in (their ProjectItem.update), for a card on the home
  // page. Returns whether it is on screen.
  const lusionStep = (it, dt, w, h, mobile) => {
    const r = it.card.getBoundingClientRect();
    const on = !it.card.hidden && r.top < h && r.bottom > 0;
    if (!on) {
      // Off screen: everything starts again next time it comes on (the tags
      // keep their whole text meanwhile, for screen readers).
      it.showTime = it.tagsTime = it.nameTime = 0;
      it.typed = false;
      if (it.tags && it.tags.textContent !== it.tagsText) it.tags.textContent = it.tagsText;
      return false;
    }
    const still = reducedMotion();
    it.showTime += dt;
    it.tagsTime += dt;
    it.nameTime += dt * 0.8;

    // The tags type themselves out, 40 letters a second, five random
    // characters running ahead of the real ones.
    if (!it.typed && it.tags) {
      const text = it.tagsText;
      const due = still ? Infinity : Math.floor(40 * it.tagsTime);
      const n = Math.min(text.length, due - 5);
      const a = Math.min(text.length, due);
      let out = text.slice(0, Math.max(0, n));
      for (let c = 0; c < a - n; c++) out += String.fromCharCode(33 + Math.floor(Math.random() * 93));
      if (it.tags.textContent !== out) it.tags.textContent = out;
      it.typed = n >= text.length;
    }

    // The name: each letter's column of copies rolls down into place (from
    // 500% of its height, expo in-out, the middle letters a little ahead),
    // sliding right with the hover as on the Work page. On phones the
    // stylesheet keeps them still, the arrow showing.
    const n = it.letters.length;
    const rolling = !still && it.nameTime < 1.4;
    if (rolling || it.nameRatio !== it.lastNameRatio || it.mobile !== mobile) {
      it.letters.forEach((el, f) => {
        if (mobile) {
          el.style.transform = '';
          return;
        }
        const p = n > 1 ? fit(f, 0, n - 1, Math.PI / 2, (3 * Math.PI) / 2) : Math.PI / 2;
        const g = still ? 1 : Math.min(1, Math.max(0, it.nameTime - Math.cos(p) / 20));
        const v = fit(g, 0, 1, 500, 0, expoInOut);
        const k = Math.min(1, Math.max(0, it.nameRatio - Math.abs(f - n - 1) / 100));
        const x = fit(k, 0, 1, 0, 1.5, lusionEase);
        el.style.transform = `translate3d(${x}em, ${-v}%, 0)`;
      });
      if (it.arrow) it.arrow.style.transform = mobile ? '' : `translateX(${fit(it.nameRatio, 0.3, 1, 0, 1, lusionEase)}em)`;
      it.lastNameRatio = it.nameRatio;
      it.mobile = mobile;
    }

    // The image: shown over 1.5s, slid and turned into place over 2s, from
    // the side of the screen's middle (the left column from the right).
    const side = (it.index % 2) - 0.5;
    const settle = still ? 1 : fit(it.showTime, 0, 2, 0, 1, expoOut);
    const u = it.uniforms;
    u.uShow.value = still ? 1 : fit(it.showTime, 0, 1.5, 0, 1, expoOut);
    u.uSlide.value = (1 - settle) * side * -w * 0.1;
    u.uTurn.value = (1 - settle) * side * 0.1;
    u.uPad.value.set(side < 0 ? 1000 : 0, side < 0 ? 0 : 1000);
    return true;
  };

  const layer = {
    order: 4,
    visible: true,
    items,
    // The page's first showing (its intro): the cards come forward as they
    // do after a filter change.
    intro() {
      wantIntro = true;
      if (ready) playIntro();
    },
    // Unseen's filter change: fade the cards shown, run change() (which shows
    // and hides cards), then bring the new set in.
    async filter(change) {
      if (!ready || reducedMotion()) {
        change();
        showAll();
        return;
      }
      const run = (filtering = {});
      await fadeOut();
      if (filtering !== run) return;
      change();
      fadeIn();
    },
    // The card that opens a project page (its path, e.g. /work/forge/), if
    // it is showing: leaving a project whose card is hidden here (the home
    // page on a phone) comes back without the zoom, as from any other page.
    async find(path) {
      await built;
      return items.find((it) => it.path === path && showing(it.card)) ?? null;
    },
    // Once the card's image is in (or a second and a half has gone by).
    imageReady(item) {
      const img = item?.img;
      if (!img || (img.complete && img.naturalWidth)) return Promise.resolve();
      return new Promise((done) => {
        img.addEventListener('load', done, { once: true });
        img.addEventListener('error', done, { once: true });
        setTimeout(done, 1500);
      });
    },
    // Zoom into `item` by `ratio` (0..1, before easing), with the captions at
    // `caption` opacity. zoom(null) puts everything back.
    zoom(item, ratio = 0, caption = 1) {
      zoom.item = item;
      zoom.ratio = item ? ratio : 0;
      zoom.caption = caption;
    },
    // Arriving back from a project: cards are simply there, no entrance.
    settle() {
      settled = true;
      shownOnce = true;
      showAll();
      // Lusion's cards on screen are simply there (the ones off it still come
      // in as they scroll on).
      items.forEach((it) => {
        it.showTime = 2;
        it.tagsTime = it.nameTime = 10;
        it.typed = true;
        if (it.tags) it.tags.textContent = it.tagsText;
      });
    },
    // How far down the screen cards start to tip back (px); none on the home
    // page, where nothing folds.
    flatLine() {
      if (lusion) return null;
      const [bx] = bendFor(state.width, state.height);
      return state.height / 2 + shiftNow() - 2 * bx;
    },
    resize() {
      const w = state.width;
      const h = state.height;
      const dist = h / 2 / Math.tan((camera.fov * Math.PI) / 360);
      camera.aspect = w / h;
      camera.near = 10;
      // Folded cards lie up to 1.2 times this far behind the page, and the
      // zoom into a card can push them several times further.
      camera.far = dist * 20;
      camera.position.set(w / 2, -h / 2, dist);
      camera.lookAt(w / 2, -h / 2, 0);
      camera.updateProjectionMatrix();
      shared.uView.value.set(w, h);
      shared.uDist.value = dist;
      // Same size as the screen's drawing buffer, so the copy is one to one.
      engine.renderer.getDrawingBufferSize(bufferSize);
      rt.setSize(bufferSize.x, bufferSize.y);
      postUniforms.uRes.value.copy(bufferSize);
      // Text may have rewrapped: redraw every caption on the next frame.
      items.forEach((it) => (it.metaDirty = true));
    },
    update() {
      if (!ready) return;
      const dpr = state.dpr;
      const w = state.width;
      const h = state.height;
      const dt = Math.min(state.delta, 0.1);
      const mobile = w <= MOBILE;
      const target = Math.max(-40, Math.min(40, -scrollVelocity() * 1.1));
      velocity += (target - velocity) * 0.12;
      // Settle exactly, so resting cards sit on whole pixels with no split.
      if (Math.abs(velocity) < 0.05) velocity = 0;

      let any = false;
      if (lusion) {
        const y = window.scrollY;
        strength += Math.abs(y - lastScroll) / h;
        lastScroll = y;
        strength += (0 - strength) * (1 - Math.exp(-10 * dt));
        strength = Math.min(strength, 1);
        ripple.value = reducedMotion() ? 0 : Math.min(0.15, strength * 0.5);
        for (const it of items) {
          hover(it, dt, mobile);
          const show = lusionStep(it, dt, w, h, mobile);
          it.image.visible = show;
          if (!show) continue;
          any = true;
          const mb = px(it.media.getBoundingClientRect());
          it.uniforms.uPos.value.set(mb.left / dpr, mb.top / dpr);
          it.uniforms.uSize.value.set(mb.w / dpr, mb.h / dpr);
        }
      }

      const [bx, by] = bendFor(w, h);
      shared.uBend.value.set(bx, by);
      shared.uShift.value = lusion ? 0 : shiftNow();
      shared.uTime.value = reducedMotion() ? 0 : state.time;
      const gone = goneLine(w, h) + shared.uShift.value;
      const pull = pullFor(w);
      for (const it of lusion ? [] : items) {
        hover(it, dt, mobile);
        const m = it.media.getBoundingClientRect();
        const c = it.meta.getBoundingClientRect();
        const show = !it.card.hidden && c.bottom > gone && m.top < h + 200;
        it.image.visible = show;
        it.caption.visible = show;
        if (!show) continue;
        any = true;
        const mb = px(m);
        const cb = captionArea(it);
        if (it.metaDirty || it.metaW !== cb.w || it.metaH !== cb.h) redrawMeta(it, cb);
        it.uniforms.uPos.value.set(mb.left / dpr, mb.top / dpr);
        it.uniforms.uSize.value.set(mb.w / dpr, mb.h / dpr);
        it.metaUniforms.uPos.value.set(cb.left / dpr, cb.top / dpr);
        it.metaUniforms.uSize.value.set(cb.w / dpr, cb.h / dpr);
        // Pulled down by Unseen's card height for this width (pullFor).
        it.uniforms.uPull.value = pull;
      }
      layer.visible = any;
      postUniforms.uShift.value = Math.min(Math.abs(velocity) * 0.07, 2.5) * dpr;

      // Lusion's zoom (their ProjectItemList.update): with u the eased ratio,
      // scale from 1 to 1.2 times what makes the card's image cover the
      // screen, bring its centre to the screen's centre, and turn by 0.3
      // radians times how far off-centre it sat (as a share of the width).
      const z = zoom.item ? zoom.ratio : 0;
      const u = cubicInOut(z);
      items.forEach((it) => (it.uniforms.uFog.value = 0));
      if (z > 0) {
        const m = zoom.item.media.getBoundingClientRect();
        const f = Math.max(w / m.width, h / m.height);
        const l = 1 + (f * 1.2 - 1) * u;
        const p = w / 2 - (m.left + m.width / 2);
        const g = h / 2 - (m.top + m.height / 2);
        const k = 1 - (1 - u) / l;
        shared.uZoomScale.value = l;
        shared.uZoomShift.value.set(p * k, g * k);
        shared.uZoomTurn.value.set((u * 0.3 * p) / w, (-u * 0.3 * p) / w);
        // Their fog into the project's colour, for an image at middle depth:
        // it starts as the zoom passes 0.71 and is complete by 0.89.
        const a = z * z;
        zoom.item.uniforms.uFog.value = Math.min(1, Math.max(0, (a * 2.5 - 1.25) / 0.75));
        zoom.item.image.visible = true;
        if (zoom.item.caption) zoom.item.caption.visible = true;
        layer.visible = true;
      } else {
        shared.uZoomScale.value = 1;
        shared.uZoomShift.value.set(0, 0);
        shared.uZoomTurn.value.set(0, 0);
      }
      uCaption.value = zoom.caption;
    },
    render(renderer) {
      renderer.setRenderTarget(rt);
      renderer.setClearColor(0x000000, 0);
      renderer.clear(true, false, false);
      renderer.render(scene, camera);
      renderer.setRenderTarget(null);
      renderer.setClearColor(0x000000, 1);
      renderer.render(postScene, postCamera);
    },
    dispose() {
      section.classList.remove('is-gl-images', 'is-gl-cards');
      filtering = null;
      listeners.forEach((off) => off());
      items.forEach((it) => {
        gsap.killTweensOf([it.lift, it.opacity]);
        it.letters.forEach((el) => (el.style.transform = ''));
        if (it.arrow) it.arrow.style.transform = '';
        if (it.tags) it.tags.textContent = it.tagsText;
        it.image.material.dispose();
        it.caption?.material.dispose();
        it.metaUniforms.uMeta.value?.dispose();
        it.uniforms.uImage.value?.dispose();
      });
      geometry.dispose();
      quad.dispose();
      rt.dispose();
      post.material.dispose();
    },
  };
  return layer;
}
