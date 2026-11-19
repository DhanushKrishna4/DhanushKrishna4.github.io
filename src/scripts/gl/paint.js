// Lusion's screen paint (their ScreenPaint, with the settings their site
// runs it at), which lights the giant words on the About page. The pointer
// paints into a texture a quarter of their render size (the screen at up to
// 1.5x density); every frame the paint is pushed outward along its own
// blurred velocity, stirred by curl noise, and fades.
//   r, g: which way the paint moves (0.5 is still)
//   b:    a weight that fades by 5% a frame
//   a:    a weight that fades by 20% a frame
// The stroke is as wide as the pointer is fast: nothing at rest, growing to
// max(40px, a twentieth of the screen's width) at 100px a frame. Like
// theirs, it runs frame by frame (not by time), in 8 bits, and stays put on
// the screen while the page scrolls under it. On touch screens it paints only
// while a finger is down and moving, as theirs does on phones.
import * as THREE from 'three';
import { fullscreenVert } from './glsl.js';
import { isTouch } from '../core/env.js';

// Their settings (the site-wide defaults their About page keeps).
const SETTINGS = {
  minRadius: 0,
  radiusDistanceRange: 100,
  pushStrength: 25,
  accelerationDissipation: 0.8,
  velocityDissipation: 0.975,
  weight1Dissipation: 0.95,
  weight2Dissipation: 0.8,
  curlScale: 0.02,
  curlStrength: 3,
};
// Their render size: the screen at up to 1.5x density, within 2560x1440 pixels.
const DPR_MAX = 1.5;
const MAX_PIXELS = 2560 * 1440;

const paintFrag = /* glsl */ `
precision highp float;
uniform sampler2D uLow;
uniform sampler2D uPrev;
uniform vec2 uTexel;
uniform vec4 uFrom;
uniform vec4 uTo;
uniform float uPush;
uniform vec3 uDissipations;
uniform vec2 uVel;
uniform float uCurlScale;
uniform float uCurlStrength;
varying vec2 vUv;

vec2 sdSegment(in vec2 p, in vec2 a, in vec2 b) {
  vec2 pa = p - a, ba = b - a;
  // (A pointer at rest gives a segment of no length: that is h = 0.)
  float h = clamp(dot(pa, ba) / max(dot(ba, ba), 1e-8), 0.0, 1.0);
  return vec2(length(pa - ba * h), h);
}
vec2 hash(vec2 p) {
  vec3 p3 = fract(vec3(p.xyx) * vec3(0.1031, 0.1030, 0.0973));
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.xx + p3.yz) * p3.zy) * 2.0 - 1.0;
}
// Gradient noise and its derivatives.
vec3 noised(in vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * f * (f * (f * 6.0 - 15.0) + 10.0);
  vec2 du = 30.0 * f * f * (f * (f - 2.0) + 1.0);
  vec2 ga = hash(i + vec2(0.0, 0.0));
  vec2 gb = hash(i + vec2(1.0, 0.0));
  vec2 gc = hash(i + vec2(0.0, 1.0));
  vec2 gd = hash(i + vec2(1.0, 1.0));
  float va = dot(ga, f - vec2(0.0, 0.0));
  float vb = dot(gb, f - vec2(1.0, 0.0));
  float vc = dot(gc, f - vec2(0.0, 1.0));
  float vd = dot(gd, f - vec2(1.0, 1.0));
  return vec3(va + u.x * (vb - va) + u.y * (vc - va) + u.x * u.y * (va - vb - vc + vd),
    ga + u.x * (gb - ga) + u.y * (gc - ga) + u.x * u.y * (ga - gb - gc + gd) + du * (u.yx * (va - vb - vc + vd) + vec2(vb, vc) - va));
}

void main() {
  // The new stroke: the segment from last frame's pointer to this one's,
  // its radius running from last frame's to this one's.
  vec2 res = sdSegment(gl_FragCoord.xy, uFrom.xy, uTo.xy);
  vec2 radiusWeight = mix(uFrom.zw, uTo.zw, res.y);
  float d = 1.0 - smoothstep(-0.01, radiusWeight.x, res.x);
  // Last frame's paint, fetched from upstream of its own blurred velocity
  // (so it spreads outward) and swirled by noise where there is paint.
  vec4 lowData = texture2D(uLow, vUv);
  vec2 velInv = (0.5 - lowData.xy) * uPush;
  vec3 noise3 = noised(gl_FragCoord.xy * uCurlScale * (1.0 - lowData.xy));
  vec2 noise = noised(gl_FragCoord.xy * uCurlScale * (2.0 - lowData.xy * (0.5 + noise3.x) + noise3.yz * 0.1)).yz;
  velInv += noise * (lowData.z + lowData.w) * uCurlStrength;
  vec4 data = texture2D(uPrev, vUv + velInv * uTexel);
  data.xy -= 0.5;
  // Fade, add the stroke, and move at least 0.004 a frame (a step of 8 bits).
  vec4 delta = (uDissipations.xxyz - 1.0) * data;
  vec2 newVel = uVel * d;
  delta += vec4(newVel, radiusWeight.yy * d);
  delta.zw = sign(delta.zw) * max(vec2(0.004), abs(delta.zw));
  data += delta;
  data.xy += 0.5;
  gl_FragColor = clamp(data, vec4(0.0), vec4(1.0));
}
`;

const copyFrag = /* glsl */ `
precision highp float;
uniform sampler2D uTexture;
varying vec2 vUv;
void main() {
  gl_FragColor = texture2D(uTexture, vUv);
}
`;

// Empty paint: still (0.5) and weightless. Drawn rather than cleared, as
// theirs is: three.js scales a clear colour by its alpha, which would make
// it (0, 0, 0, 0), a full-strength push down and to the left.
const emptyFrag = /* glsl */ `
void main() {
  gl_FragColor = vec4(0.5, 0.5, 0.0, 0.0);
}
`;

// Their nine-tap blur, one direction at a time.
const blurFrag = /* glsl */ `
precision highp float;
uniform sampler2D uTexture;
uniform vec2 uDelta;
varying vec2 vUv;
void main() {
  vec4 color = texture2D(uTexture, vUv) * 0.1633;
  vec2 delta = uDelta;
  color += texture2D(uTexture, vUv - delta) * 0.1531;
  color += texture2D(uTexture, vUv + delta) * 0.1531;
  delta += uDelta;
  color += texture2D(uTexture, vUv - delta) * 0.12245;
  color += texture2D(uTexture, vUv + delta) * 0.12245;
  delta += uDelta;
  color += texture2D(uTexture, vUv - delta) * 0.0918;
  color += texture2D(uTexture, vUv + delta) * 0.0918;
  delta += uDelta;
  color += texture2D(uTexture, vUv - delta) * 0.051;
  color += texture2D(uTexture, vUv + delta) * 0.051;
  gl_FragColor = color;
}
`;

const fit = (v, a, b, c, d) => c + Math.min(1, Math.max(0, (v - a) / (b - a))) * (d - c);

export function createPaint(renderer, state) {
  const target = () =>
    new THREE.WebGLRenderTarget(1, 1, {
      type: THREE.UnsignedByteType,
      format: THREE.RGBAFormat,
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
      wrapS: THREE.ClampToEdgeWrapping,
      wrapT: THREE.ClampToEdgeWrapping,
      depthBuffer: false,
      stencilBuffer: false,
    });
  let prev = target();
  let curr = target();
  const low = target();
  const lowBlur = target();
  const size = new THREE.Vector2(1, 1);

  const pass = (fragmentShader, uniforms) =>
    new THREE.ShaderMaterial({ vertexShader: fullscreenVert, fragmentShader, uniforms, blending: THREE.NoBlending, depthTest: false, depthWrite: false });
  const from = new THREE.Vector4();
  const to = new THREE.Vector4();
  const vel = new THREE.Vector2();
  const paint = pass(paintFrag, {
    uLow: { value: low.texture },
    uPrev: { value: null },
    uTexel: { value: new THREE.Vector2() },
    uFrom: { value: from },
    uTo: { value: to },
    uPush: { value: SETTINGS.pushStrength },
    uDissipations: { value: new THREE.Vector3(SETTINGS.velocityDissipation, SETTINGS.weight1Dissipation, SETTINGS.weight2Dissipation) },
    uVel: { value: vel },
    uCurlScale: { value: SETTINGS.curlScale },
    uCurlStrength: { value: SETTINGS.curlStrength },
  });
  const copy = pass(copyFrag, { uTexture: { value: null } });
  const blur = pass(blurFrag, { uTexture: { value: null }, uDelta: { value: new THREE.Vector2() } });
  const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), paint);
  quad.frustumCulled = false;
  const scene = new THREE.Scene();
  scene.add(quad);
  const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  const draw = (material, rt) => {
    quad.material = material;
    renderer.setRenderTarget(rt);
    renderer.render(scene, camera);
  };

  // Touch: where the finger is, and whether it is down (now and last frame).
  const touch = isTouch();
  const finger = { x: 0, y: 0, down: false, wasDown: false };
  const onTouch = (e) => {
    const t = e.touches[0];
    if (t) {
      finger.x = t.clientX;
      finger.y = t.clientY;
    }
    finger.down = e.touches.length > 0;
  };
  if (touch) ['touchstart', 'touchmove', 'touchend', 'touchcancel'].forEach((type) => addEventListener(type, onTouch, { passive: true }));
  const pointer = () => (touch ? finger : state.pointer);
  // Where the pointer was at the end of the last frame (CSS pixels), and
  // whether it had moved by then: like theirs, the frame it first turns up
  // paints nothing, as that is a jump from nowhere (the middle of the screen).
  const last = { x: 0, y: 0 };
  let hadMoved = false;
  const hasMoved = () => state.pointer.lastMove >= 0;

  const empty = pass(emptyFrag, {});
  const clear = () => {
    for (const rt of [prev, curr, low, lowBlur]) draw(empty, rt);
    renderer.setRenderTarget(null);
    vel.set(0, 0);
  };

  const api = {
    get texture() {
      return curr.texture;
    },
    size,
    resize() {
      let rw = state.width * Math.min(DPR_MAX, devicePixelRatio || 1);
      let rh = state.height * Math.min(DPR_MAX, devicePixelRatio || 1);
      if (rw * rh > MAX_PIXELS) {
        const aspect = rw / rh;
        rh = Math.sqrt(MAX_PIXELS / aspect);
        rw = Math.ceil(rh * aspect);
        rh = Math.ceil(rh);
      }
      const w = Math.max(1, rw >> 2);
      const h = Math.max(1, rh >> 2);
      if (w === size.x && h === size.y) return;
      size.set(w, h);
      prev.setSize(w, h);
      curr.setSize(w, h);
      low.setSize(Math.max(1, rw >> 3), Math.max(1, rh >> 3));
      lowBlur.setSize(low.width, low.height);
      paint.uniforms.uTexel.value.set(1 / w, 1 / h);
      clear();
    },
    // Starts afresh from where the pointer is now: no paint, and no stroke
    // from wherever it was when the paint last ran.
    reset() {
      clear();
      const p = pointer();
      last.x = p.x;
      last.y = p.y;
      finger.wasDown = finger.down;
      to.set((p.x / state.width) * size.x, (1 - p.y / state.height) * size.y, 0, 1);
      from.copy(to);
    },
    update() {
      [prev, curr] = [curr, prev];
      paint.uniforms.uPrev.value = prev.texture;

      // The stroke's radius: how far the pointer moved since the last frame,
      // 0..100px giving 0..max(40px, width / 20); none on a touch screen
      // unless a finger was down then and still is. In paint pixels.
      const p = pointer();
      let radius = fit(Math.hypot(p.x - last.x, p.y - last.y), 0, SETTINGS.radiusDistanceRange, SETTINGS.minRadius, Math.max(40, state.width / 20));
      if (touch ? !(finger.down && finger.wasDown) : !hadMoved) radius = 0;
      radius = (radius / state.height) * size.y;
      from.copy(to);
      to.set((p.x / state.width) * size.x, (1 - p.y / state.height) * size.y, radius, 1);
      // The velocity it paints with: its movement in paint pixels times the
      // frame's time and 0.8, added to 80% of last frame's.
      vel.multiplyScalar(SETTINGS.accelerationDissipation).add({ x: (to.x - from.x) * state.delta * 0.8, y: (to.y - from.y) * state.delta * 0.8 });

      draw(paint, curr);
      // A blurred eighth-size copy for next frame's push and swirl.
      copy.uniforms.uTexture.value = curr.texture;
      draw(copy, low);
      blur.uniforms.uTexture.value = low.texture;
      blur.uniforms.uDelta.value.set((8 / low.width) * 0.25, 0);
      draw(blur, lowBlur);
      blur.uniforms.uTexture.value = lowBlur.texture;
      blur.uniforms.uDelta.value.set(0, (8 / low.height) * 0.25);
      draw(blur, low);
      renderer.setRenderTarget(null);

      last.x = p.x;
      last.y = p.y;
      finger.wasDown = finger.down;
      hadMoved = hasMoved();
    },
    dispose() {
      if (touch) ['touchstart', 'touchmove', 'touchend', 'touchcancel'].forEach((type) => removeEventListener(type, onTouch));
      [prev, curr, low, lowBlur].forEach((rt) => rt.dispose());
      [paint, copy, blur, empty].forEach((m) => m.dispose());
      quad.geometry.dispose();
    },
  };
  api.resize();
  return api;
}
