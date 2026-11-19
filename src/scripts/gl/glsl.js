// 3D simplex noise.
// Based on "webgl-noise" by Ian McEwan and Stefan Gustavson (MIT licence),
// https://github.com/ashima/webgl-noise
export const snoise = /* glsl */ `
vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec4 permute(vec4 x) { return mod289(((x * 34.0) + 10.0) * x); }
vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }

float snoise(vec3 v) {
  const vec2 C = vec2(1.0 / 6.0, 1.0 / 3.0);
  const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);
  vec3 i = floor(v + dot(v, C.yyy));
  vec3 x0 = v - i + dot(i, C.xxx);
  vec3 g = step(x0.yzx, x0.xyz);
  vec3 l = 1.0 - g;
  vec3 i1 = min(g.xyz, l.zxy);
  vec3 i2 = max(g.xyz, l.zxy);
  vec3 x1 = x0 - i1 + C.xxx;
  vec3 x2 = x0 - i2 + C.yyy;
  vec3 x3 = x0 - D.yyy;
  i = mod289(i);
  vec4 p = permute(permute(permute(i.z + vec4(0.0, i1.z, i2.z, 1.0)) + i.y + vec4(0.0, i1.y, i2.y, 1.0)) + i.x + vec4(0.0, i1.x, i2.x, 1.0));
  float n_ = 0.142857142857;
  vec3 ns = n_ * D.wyz - D.xzx;
  vec4 j = p - 49.0 * floor(p * ns.z * ns.z);
  vec4 x_ = floor(j * ns.z);
  vec4 y_ = floor(j - 7.0 * x_);
  vec4 x = x_ * ns.x + ns.yyyy;
  vec4 y = y_ * ns.x + ns.yyyy;
  vec4 h = 1.0 - abs(x) - abs(y);
  vec4 b0 = vec4(x.xy, y.xy);
  vec4 b1 = vec4(x.zw, y.zw);
  vec4 s0 = floor(b0) * 2.0 + 1.0;
  vec4 s1 = floor(b1) * 2.0 + 1.0;
  vec4 sh = -step(h, vec4(0.0));
  vec4 a0 = b0.xzyw + s0.xzyw * sh.xxyy;
  vec4 a1 = b1.xzyw + s1.xzyw * sh.zzww;
  vec3 p0 = vec3(a0.xy, h.x);
  vec3 p1 = vec3(a0.zw, h.y);
  vec3 p2 = vec3(a1.xy, h.z);
  vec3 p3 = vec3(a1.zw, h.w);
  vec4 norm = taylorInvSqrt(vec4(dot(p0, p0), dot(p1, p1), dot(p2, p2), dot(p3, p3)));
  p0 *= norm.x;
  p1 *= norm.y;
  p2 *= norm.z;
  p3 *= norm.w;
  vec4 m = max(0.5 - vec4(dot(x0, x0), dot(x1, x1), dot(x2, x2), dot(x3, x3)), 0.0);
  m = m * m;
  return 105.0 * dot(m * m, vec4(dot(p0, x0), dot(p1, x1), dot(p2, x2), dot(p3, x3)));
}
`;

// The original (2011) release of the same simplex noise. Later releases of
// webgl-noise changed three constants (permute +10 for +1, a 0.5 falloff for
// 0.6, and 105x for 42x), which moves every shape. landonorris.com's contour
// lines use this release, so the contour field does too: the same input gives
// the same shapes as his. Ashima Arts / Stefan Gustavson, MIT licence,
// https://github.com/ashima/webgl-noise
export const snoiseClassic = /* glsl */ `
vec4 permuteClassic(vec4 x) { return mod(((x * 34.0) + 1.0) * x, 289.0); }
vec4 taylorInvSqrtClassic(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }

float snoiseClassic(vec3 v) {
  const vec2 C = vec2(1.0 / 6.0, 1.0 / 3.0);
  const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);
  vec3 i = floor(v + dot(v, C.yyy));
  vec3 x0 = v - i + dot(i, C.xxx);
  vec3 g = step(x0.yzx, x0.xyz);
  vec3 l = 1.0 - g;
  vec3 i1 = min(g.xyz, l.zxy);
  vec3 i2 = max(g.xyz, l.zxy);
  vec3 x1 = x0 - i1 + C.xxx;
  vec3 x2 = x0 - i2 + 2.0 * C.xxx;
  vec3 x3 = x0 - 1.0 + 3.0 * C.xxx;
  i = mod(i, 289.0);
  vec4 p = permuteClassic(permuteClassic(permuteClassic(i.z + vec4(0.0, i1.z, i2.z, 1.0)) + i.y + vec4(0.0, i1.y, i2.y, 1.0)) + i.x + vec4(0.0, i1.x, i2.x, 1.0));
  float n_ = 1.0 / 7.0;
  vec3 ns = n_ * D.wyz - D.xzx;
  vec4 j = p - 49.0 * floor(p * ns.z * ns.z);
  vec4 x_ = floor(j * ns.z);
  vec4 y_ = floor(j - 7.0 * x_);
  vec4 x = x_ * ns.x + ns.yyyy;
  vec4 y = y_ * ns.x + ns.yyyy;
  vec4 h = 1.0 - abs(x) - abs(y);
  vec4 b0 = vec4(x.xy, y.xy);
  vec4 b1 = vec4(x.zw, y.zw);
  vec4 s0 = floor(b0) * 2.0 + 1.0;
  vec4 s1 = floor(b1) * 2.0 + 1.0;
  vec4 sh = -step(h, vec4(0.0));
  vec4 a0 = b0.xzyw + s0.xzyw * sh.xxyy;
  vec4 a1 = b1.xzyw + s1.xzyw * sh.zzww;
  vec3 p0 = vec3(a0.xy, h.x);
  vec3 p1 = vec3(a0.zw, h.y);
  vec3 p2 = vec3(a1.xy, h.z);
  vec3 p3 = vec3(a1.zw, h.w);
  vec4 norm = taylorInvSqrtClassic(vec4(dot(p0, p0), dot(p1, p1), dot(p2, p2), dot(p3, p3)));
  p0 *= norm.x;
  p1 *= norm.y;
  p2 *= norm.z;
  p3 *= norm.w;
  vec4 m = max(0.6 - vec4(dot(x0, x0), dot(x1, x1), dot(x2, x2), dot(x3, x3)), 0.0);
  m = m * m;
  return 42.0 * dot(m * m, vec4(dot(p0, x0), dot(p1, x1), dot(p2, x2), dot(p3, x3)));
}
`;

// The contour lines that run through the site (the background and the menu),
// made the way landonorris.com makes his, with his settings, so they take the
// same shapes, spacing and drift: one layer of simplex noise, its position
// pushed along the diagonal by a second, slower layer (by up to half a screen
// height), moving at 0.1 a second, the push at a tenth of that. p is in screen
// heights from the bottom-left corner; returns 0..1. Needs snoiseClassic.
// The three-argument form adds his cursor: c (his cursor value times his
// CURSOR_INTENSITY) shifts where the noise is read, along the diagonal,
// around the pointer (see field.js).
export const contourField = /* glsl */ `
float contourField(vec2 p, float t, float c) {
  float push = 0.5 + 0.5 * snoiseClassic(vec3(p, t * 0.01));
  return 0.5 + 0.5 * snoiseClassic(vec3(p + c + push * 0.5, t * 0.1));
}
float contourField(vec2 p, float t) {
  return contourField(p, t, 0.0);
}
`;

// His spacing and line weight, shared by both: lines where the field crosses
// a sixth (his three bands, each split in two), 2 CSS pixels across at half
// strength (measured on his site; his are jagged from a low-resolution canvas,
// these are smooth). contrast is the lines' contrast ratio against the
// background (relative luminance with the usual 0.05 for glare, as in WCAG):
// his measure 1.23. A plain colour difference made lines on black far too
// faint, since near-black differences all but vanish on a real screen.
// cursor: his CURSOR_SCALE, CURSOR_INTENSITY and CURSOR_BOUNCE, and the
// easing of his pointer (eased position 0.025, eased pace 0.01, per hundredth
// of a second; pace times 4).
// trail: where his cursor trail passes (fluid.js), the bands are filled in
// turn with his COLOR_CURSOR_BACKGROUND and COLOR_CURSOR_FOREGROUND, and the
// lines take the first. These are their contrast ratios against his hero's
// background as they reach the screen (his colours are encoded twice on the
// way, so the hex values act as linear light): #E8E8DF and #CFD2C5 on
// #F8F8F3. His hero's lines measure 1.21 the same way, next to our 1.23.
export const CONTOUR = {
  scale: 1,
  bands: 6,
  lineCss: 2,
  contrast: 1.23,
  cursor: { scale: 3, intensity: 0.15, bounce: -0.75, follow: 0.025, settle: 0.01, gain: 4 },
  trail: { back: 1.0667, fore: 1.1773 },
};

// Anti-aliased line where fract(f) == 0.5, px device pixels across at half
// strength, with about a pixel of soft edge each side. Lines thinner than
// that edge come out fainter rather than thinner, as real hairlines do.
export const isoLine = /* glsl */ `
float isoLine(float f, float px) {
  float fw = length(vec2(dFdx(f), dFdy(f)));
  float d = abs(fract(f) - 0.5) / max(fw, 1e-6);
  return 1.0 - smoothstep(px * 0.5 - 0.75, px * 0.5 + 0.75, d);
}
`;

export const fullscreenVert = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = vec4(position.xy, 0.0, 1.0);
}
`;
