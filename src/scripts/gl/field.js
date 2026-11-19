// The background: Lando's moving contour lines, made his way with his
// settings (see contourField in glsl.js), so they have his shapes, spacing,
// weight and strength. Warped noise is cut into bands and only the edges
// between bands are drawn, so the lines keep slowly re-forming. The pointer
// bends them as his does: the faster it moves, the more the noise is shifted
// near it (and the other way, a little, everywhere else), settling back over
// about a second once it stops. Where his cursor trail runs (fluid.js), the
// bands fill in, one shade and the next in turn. (His trail lives in his
// hero and switches off once it scrolls away; here the lines run the whole
// site and the home page opens on the monogram alone, so the trail goes
// wherever the lines are.)
import * as THREE from 'three';
import { gsap } from 'gsap';
import { snoiseClassic, contourField, CONTOUR, fullscreenVert } from './glsl.js';
import { hexToRgb, luminance } from '../core/env.js';

const frag = /* glsl */ `
precision highp float;
uniform float uTime;
uniform vec2 uRes;
uniform float uScroll;
uniform vec2 uMouse;
uniform float uMousePace;
uniform vec3 uBg;
uniform vec3 uLine;
uniform float uLineAlpha;
uniform float uScale;
uniform float uBands;
uniform float uLinePx;
uniform float uFade;
uniform float uFootEdge;
uniform float uFootDepth;
uniform float uFootW;
uniform float uFootScroll;
uniform float uSheetTop;
uniform float uTopHold;
uniform sampler2D uFluid;
uniform vec3 uTrailBack;
uniform vec3 uTrailFore;
varying vec2 vUv;
${snoiseClassic}
${contourField}
void main() {
  vec2 p = gl_FragCoord.xy / uRes.y;
  // His cursor (in screen space, before scrolling): 1 at the pointer falling
  // to 0 a third of a screen height away and below 0 beyond, times how fast
  // the pointer moves, kept within -0.75..1.
  float cursor = clamp((1.0 - distance(uMouse, p) * ${CONTOUR.cursor.scale.toFixed(1)}) * uMousePace, ${CONTOUR.cursor.bounce.toFixed(2)}, 1.0);
  // Under the pinned footer the lines hold still, at the place they will have
  // once the page reaches the bottom; above its curved edge they scroll on.
  // The edge is the same parabola the footer is clipped to (device pixels,
  // measured from the top): uFootEdge at the sides, uFootDepth lower mid-way.
  float fx = clamp(gl_FragCoord.x / uFootW, 0.0, 1.0);
  float edge = uFootEdge + uFootDepth * 4.0 * fx * (1.0 - fx);
  float y = uRes.y - gl_FragCoord.y;
  float under = step(edge, y);
  // A black sheet (About, from "What I work on" down) slides up over pinned
  // content: from its top edge (uSheetTop, device pixels) down to the footer
  // there are no lines. Above it, the pinned content's lines hold still from
  // the moment it pins (uTopHold), so they don't drift behind still text.
  // f stays continuous across the sheet's edge; only the drawing stops.
  float sheet = step(uSheetTop, y) * (1.0 - under);
  p.y -= mix(min(uScroll, uTopHold), uFootScroll, under);
  // Lines where the field crosses a sixth (the +0.5 puts them on whole numbers of f).
  float f = contourField(p * uScale, uTime, cursor * ${CONTOUR.cursor.intensity.toFixed(2)}) * uBands + 0.5;
  // Each line is uLinePx device pixels across at half strength, measured with
  // how fast f changes from one pixel to the next. A pixel pair that
  // straddles the footer's edge measures the jump between the two sets of
  // lines instead, which would draw a broken seam along the curve, so such a
  // pixel uses the other axis, or draws no line if both pairs straddle.
  float sx = dFdx(f);
  float sy = dFdy(f);
  float cx = abs(dFdx(under));
  float cy = abs(dFdy(under));
  float fw = cx > 0.0 && cy > 0.0 ? 0.0 : length(vec2(cx > 0.0 ? sy : sx, cy > 0.0 ? sx : sy));
  float dist = abs(fract(f) - 0.5) / max(fw, 1e-6);
  float line = fw > 0.0 ? 1.0 - smoothstep(uLinePx * 0.5 - 0.75, uLinePx * 0.5 + 0.75, dist) : 0.0;
  // His trail: on where its colour's red is below 0.9, read a little in from
  // the edges as he does. Inside it the bands take his two cursor colours in
  // turn (each line flips which), and the lines take the first of them.
  vec2 screen = gl_FragCoord.xy / uRes;
  float trail = step(0.1, 1.0 - texture2D(uFluid, 0.025 + screen * 0.95).r);
  float fore = step(0.5, fract((f - 0.5) * 0.5));
  vec3 trailCol = mix(mix(uTrailBack, uTrailFore, fore), uTrailBack, line);
  float keep = (1.0 - sheet) * uFade;
  vec3 col = mix(uBg, uLine, line * uLineAlpha * keep);
  col = mix(col, trailCol, trail * keep);
  gl_FragColor = vec4(col, 1.0);
}
`;

// Contrast ratio of two sRGB colours (0..1 triples): relative luminance with
// 0.05 added for glare, as in WCAG.
const luma = (rgb) => {
  const [r, g, b] = rgb.map((v) => (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const contrast = (a, b) => {
  const [la, lb] = [luma(a), luma(b)];
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
};

// The strength (0..1) at which a colour drawn over the background reaches a
// given contrast against it.
function alphaFor(bg, line, target) {
  let lo = 0;
  let hi = 1;
  for (let i = 0; i < 24; i++) {
    const mid = (lo + hi) / 2;
    const c = bg.map((v, k) => v + (line[k] - v) * mid);
    if (contrast(bg, c) < target) lo = mid;
    else hi = mid;
  }
  return (lo + hi) / 2;
}

// The strength at which the lines reach CONTOUR.contrast, as Lando's do.
export const lineAlphaFor = (bg, line) => alphaFor(bg, line, CONTOUR.contrast);

// The trail's two band colours: the line colour over the background, at the
// contrast his cursor colours have against his (CONTOUR.trail).
const trailColours = (bg, line) => {
  const at = (target) => {
    const a = alphaFor(bg, line, target);
    return bg.map((v, i) => v + (line[i] - v) * a);
  };
  return { back: at(CONTOUR.trail.back), fore: at(CONTOUR.trail.fore) };
};

// Palette for the default black-and-red theme.
const DEFAULT = { bg: '#000000', line: '#6a1220' };
DEFAULT.lineAlpha = lineAlphaFor(hexToRgb(DEFAULT.bg), hexToRgb(DEFAULT.line));
Object.assign(DEFAULT, trailColours(hexToRgb(DEFAULT.bg), hexToRgb(DEFAULT.line)));

// Derives field colours from a project page's own palette.
export function themeFromPalette({ bg, fg, accent }) {
  const light = luminance(bg) > 0.5;
  const mix = (a, b, t) => {
    const ca = hexToRgb(a);
    const cb = hexToRgb(b);
    return ca.map((v, i) => v + (cb[i] - v) * t);
  };
  const line = mix(bg, accent, light ? 0.32 : 0.36);
  return {
    bg: hexToRgb(bg),
    line,
    lineAlpha: lineAlphaFor(hexToRgb(bg), line),
    ...trailColours(hexToRgb(bg), line),
  };
}

const toRgb = (theme) => {
  const bg = Array.isArray(theme.bg) ? theme.bg : hexToRgb(theme.bg);
  const line = Array.isArray(theme.line) ? theme.line : hexToRgb(theme.line);
  const trail = theme.back && theme.fore ? theme : trailColours(bg, line);
  return { bg, line, lineAlpha: theme.lineAlpha, back: trail.back, fore: trail.fore };
};

// Shown when there is no trail (no float textures): white is "still".
const still = new THREE.DataTexture(new Uint8Array([255, 255, 255, 255]), 1, 1);
still.needsUpdate = true;

export function createField(state, fluid = null) {
  const u = {
    uTime: { value: 0 },
    uRes: { value: new THREE.Vector2(1, 1) },
    uScroll: { value: 0 },
    uMouse: { value: new THREE.Vector2(0.5, 0.5) },
    uMousePace: { value: 0 },
    uBg: { value: new THREE.Color() },
    uLine: { value: new THREE.Color() },
    uLineAlpha: { value: DEFAULT.lineAlpha },
    uScale: { value: CONTOUR.scale },
    uBands: { value: CONTOUR.bands },
    uLinePx: { value: CONTOUR.lineCss },
    uFade: { value: 1 },
    // The pinned footer's region (see common.js); off by default.
    uFootEdge: { value: 1e6 },
    uFootDepth: { value: 0 },
    uFootW: { value: 1 },
    uFootScroll: { value: 0 },
    // The About page's black sheet and its pinned top part (see about.js); off by default.
    uSheetTop: { value: 1e6 },
    uTopHold: { value: 1e6 },
    // His cursor trail (fluid.js) and the colours it fills the bands with.
    uFluid: { value: fluid ? fluid.texture : still },
    uTrailBack: { value: new THREE.Color() },
    uTrailFore: { value: new THREE.Color() },
  };
  const material = new THREE.ShaderMaterial({
    vertexShader: fullscreenVert,
    fragmentShader: frag,
    uniforms: u,
    depthTest: false,
    depthWrite: false,
  });
  const scene = new THREE.Scene();
  const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  scene.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), material));

  // All shaders on this site work directly in sRGB values: colours go in as
  // raw 0..1 triples and are written to the screen unchanged.
  // His pointer, eased his way every frame: its position (-1..1, y up)
  // following at 0.025 and its pace (how far it moved since the last frame,
  // in those units) settling at 0.01, both per hundredth of a second of frame
  // time (capped at a thirtieth of a second), the pace then times 4.
  const mouse = { x: 0, y: 0, pace: 0 };
  const followPointer = () => {
    const p = state.pointer;
    const { follow, settle, gain } = CONTOUR.cursor;
    const cs = Math.min(state.delta, 1 / 30) * 100;
    mouse.pace += (2 * Math.hypot(p.vx, p.vy) - mouse.pace) * (1 - Math.exp(-settle * cs));
    const k = 1 - Math.exp(-follow * cs);
    mouse.x += (p.nx * 2 - 1 - mouse.x) * k;
    mouse.y += (p.ny * 2 - 1 - mouse.y) * k;
    u.uMouse.value.set((mouse.x * 0.5 + 0.5) * (state.width / state.height), mouse.y * 0.5 + 0.5);
    u.uMousePace.value = mouse.pace * gain;
  };

  const current = toRgb(DEFAULT);
  const apply = () => {
    u.uBg.value.setRGB(...current.bg);
    u.uLine.value.setRGB(...current.line);
    u.uLineAlpha.value = current.lineAlpha;
    u.uTrailBack.value.setRGB(...current.back);
    u.uTrailFore.value.setRGB(...current.fore);
  };
  apply();

  return {
    uniforms: u,
    resize() {
      u.uRes.value.set(state.width * state.dpr, state.height * state.dpr);
      u.uLinePx.value = CONTOUR.lineCss * state.dpr;
    },
    setTheme(theme, immediate = false) {
      const target = toRgb(theme ?? DEFAULT);
      gsap.killTweensOf(current);
      const flat = { ...current };
      const keys = ['bg', 'line', 'back', 'fore'];
      const from = { a: 0 };
      const start = JSON.parse(JSON.stringify(flat));
      if (immediate) {
        keys.forEach((k) => (current[k] = target[k]));
        current.lineAlpha = target.lineAlpha;
        apply();
        return;
      }
      gsap.to(from, {
        a: 1,
        duration: 0.9,
        ease: 'power2.inOut',
        onUpdate: () => {
          keys.forEach((k) => (current[k] = start[k].map((v, i) => v + (target[k][i] - v) * from.a)));
          current.lineAlpha = start.lineAlpha + (target.lineAlpha - start.lineAlpha) * from.a;
          apply();
        },
      });
    },
    defaultTheme: DEFAULT,
    render(renderer) {
      u.uTime.value = state.time;
      u.uScroll.value = (state.scroll / state.height) * 0.12;
      followPointer();
      renderer.render(scene, camera);
    },
  };
}
