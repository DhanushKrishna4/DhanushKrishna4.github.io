// Helpers for code-drawn covers: seeded randomness, colour, a painterly
// gradient field (WebGL), glow, grain, vignette, and a depth layer that each
// drawing step can paint into (near black, far white), for the cards' hover.

export function rng(seed = 1) {
  let a = seed >>> 0;
  const r = () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  r.range = (a, b) => a + (b - a) * r();
  r.pick = (arr) => arr[Math.floor(r() * arr.length)];
  r.gauss = () => {
    let u = 0, v = 0;
    while (u === 0) u = r();
    while (v === 0) v = r();
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  };
  return r;
}

export const hex = (h) => {
  const s = h.replace('#', '');
  return [0, 2, 4].map((i) => parseInt(s.slice(i, i + 2), 16) / 255);
};
export const mix = (a, b, t) => a.map((v, i) => v + (b[i] - v) * t);
export const css = (c, a = 1) => `rgba(${Math.round(c[0] * 255)},${Math.round(c[1] * 255)},${Math.round(c[2] * 255)},${a})`;
export const lighten = (c, t) => mix(c, [1, 1, 1], t);
export const darken = (c, t) => mix(c, [0, 0, 0], t);
export const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
export const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a)); return t * t * (3 - 2 * t); };

export function canvas(W, H) {
  const c = document.createElement('canvas');
  c.width = W;
  c.height = H;
  const ctx = c.getContext('2d');
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  return { c, ctx };
}

// 2D value noise and fbm, for the CPU side.
export function noise2(seed = 0) {
  const R = rng(seed);
  const perm = new Uint16Array(512);
  const p = Array.from({ length: 256 }, (_, i) => i);
  for (let i = 255; i > 0; i--) { const j = Math.floor(R() * (i + 1)); [p[i], p[j]] = [p[j], p[i]]; }
  for (let i = 0; i < 512; i++) perm[i] = p[i & 255];
  const grad = (h, x, y) => { const g = h & 7; const u = g < 4 ? x : y; const v = g < 4 ? y : x; return ((g & 1) ? -u : u) + ((g & 2) ? -2 * v : 2 * v); };
  const fade = (t) => t * t * t * (t * (t * 6 - 15) + 10);
  const n = (x, y) => {
    const X = Math.floor(x) & 255, Y = Math.floor(y) & 255;
    x -= Math.floor(x); y -= Math.floor(y);
    const u = fade(x), v = fade(y);
    const a = perm[X] + Y, b = perm[X + 1] + Y;
    const l = (t, A, B) => A + t * (B - A);
    return l(v, l(u, grad(perm[a], x, y), grad(perm[b], x - 1, y)), l(u, grad(perm[a + 1], x, y - 1), grad(perm[b + 1], x - 1, y - 1))) * 0.25;
  };
  n.fbm = (x, y, oct = 4) => { let s = 0, a = 0.5, f = 1; for (let i = 0; i < oct; i++) { s += a * n(x * f, y * f); f *= 2.02; a *= 0.5; } return s; };
  return n;
}

// A painterly gradient: a base colour and soft blobs of light, the space
// between them warped by noise, mixed in linear light and gently tone mapped.
// blobs: [{ x, y (0..1), r (share of height), c: [r,g,b], k (strength), sx, sy }]
export function field(W, H, { base, blobs = [], warp = 0.25, warpScale = 1.6, seed = 1, exposure = 1, grainy = 0 }) {
  const c = document.createElement('canvas');
  c.width = W;
  c.height = H;
  const gl = c.getContext('webgl2', { preserveDrawingBuffer: true, premultipliedAlpha: false });
  const vs = `#version 300 es
in vec2 p; void main(){ gl_Position = vec4(p,0.,1.); }`;
  const N = 16;
  const fs = `#version 300 es
precision highp float;
uniform vec2 uRes; uniform vec3 uBase; uniform int uN;
uniform vec4 uB[${N}]; uniform vec3 uC[${N}]; uniform vec2 uS[${N}];
uniform float uWarp, uWarpScale, uSeed, uExp;
out vec4 o;
float h(vec2 p){ vec3 p3 = fract(vec3(p.xyx)*.1031); p3 += dot(p3, p3.yzx+33.33); return fract((p3.x+p3.y)*p3.z); }
float n(vec2 x){ vec2 i=floor(x), f=fract(x); f=f*f*(3.-2.*f); return mix(mix(h(i),h(i+vec2(1,0)),f.x),mix(h(i+vec2(0,1)),h(i+vec2(1,1)),f.x),f.y); }
float fbm(vec2 p){ float s=0., a=.5; for(int i=0;i<5;i++){ s+=a*n(p); p=p*2.03+7.1; a*=.5; } return s; }
vec3 lin(vec3 c){ return pow(c, vec3(2.2)); }
void main(){
  vec2 uv = gl_FragCoord.xy / uRes; uv.y = 1. - uv.y;
  float asp = uRes.x / uRes.y;
  vec2 p = vec2(uv.x * asp, uv.y);
  vec2 w = vec2(fbm(p*uWarpScale + uSeed), fbm(p*uWarpScale + uSeed + 5.2)) - .5;
  vec2 q = p + w * uWarp;
  vec3 col = lin(uBase);
  for (int i = 0; i < ${N}; i++) {
    if (i >= uN) break;
    vec2 c = vec2(uB[i].x * asp, uB[i].y);
    vec2 d = (q - c) / (uB[i].z * uS[i]);
    float k = exp(-dot(d, d) * 1.6);
    col += lin(uC[i]) * uB[i].w * k;
  }
  col *= uExp;
  col = col / (1. + col * .18);
  vec3 s = pow(col, vec3(1./2.2));
  s += (h(gl_FragCoord.xy + uSeed) - .5) / 255.;
  o = vec4(s, 1.);
}`;
  const prog = gl.createProgram();
  for (const [type, src] of [[gl.VERTEX_SHADER, vs], [gl.FRAGMENT_SHADER, fs]]) {
    const s = gl.createShader(type);
    gl.shaderSource(s, src);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s));
    gl.attachShader(prog, s);
  }
  gl.bindAttribLocation(prog, 0, 'p');
  gl.linkProgram(prog);
  gl.useProgram(prog);
  const b = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, b);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  gl.enableVertexAttribArray(0);
  gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
  const u = (n) => gl.getUniformLocation(prog, n);
  gl.uniform2f(u('uRes'), W, H);
  gl.uniform3fv(u('uBase'), base);
  gl.uniform1i(u('uN'), Math.min(N, blobs.length));
  const B = new Float32Array(N * 4), C = new Float32Array(N * 3), Sc = new Float32Array(N * 2);
  blobs.slice(0, N).forEach((bl, i) => {
    B.set([bl.x, bl.y, bl.r, bl.k ?? 1], i * 4);
    C.set(bl.c, i * 3);
    Sc.set([bl.sx ?? 1, bl.sy ?? 1], i * 2);
  });
  gl.uniform4fv(u('uB'), B);
  gl.uniform3fv(u('uC'), C);
  gl.uniform2fv(u('uS'), Sc);
  gl.uniform1f(u('uWarp'), warp);
  gl.uniform1f(u('uWarpScale'), warpScale);
  gl.uniform1f(u('uSeed'), seed);
  gl.uniform1f(u('uExp'), exposure);
  gl.viewport(0, 0, W, H);
  gl.drawArrays(gl.TRIANGLES, 0, 3);
  return c;
}

// Draws with a glow: the drawing itself, plus blurred copies of it added on top.
export function glow(ctx, W, H, draw, { blur = [6, 24], strength = [0.9, 0.6], sharp = 1, mode = 'lighter' } = {}) {
  const { c, ctx: g } = canvas(W, H);
  draw(g);
  ctx.save();
  ctx.globalCompositeOperation = mode;
  blur.forEach((b, i) => {
    ctx.filter = `blur(${b}px)`;
    ctx.globalAlpha = strength[i] ?? 0.5;
    ctx.drawImage(c, 0, 0);
  });
  ctx.filter = 'none';
  ctx.globalAlpha = sharp;
  if (sharp > 0) ctx.drawImage(c, 0, 0);
  ctx.restore();
  return c;
}

// Film grain, as soft light, and an optional vignette.
export function finish(ctx, W, H, { grain = 0.06, vignette = 0.35, seed = 7, vigColor = [0, 0, 0] } = {}) {
  if (vignette > 0) {
    const g = ctx.createRadialGradient(W * 0.5, H * 0.5, Math.min(W, H) * 0.25, W * 0.5, H * 0.5, Math.hypot(W, H) * 0.62);
    g.addColorStop(0, css(vigColor, 0));
    g.addColorStop(1, css(vigColor, vignette));
    ctx.save();
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
    ctx.restore();
  }
  if (grain > 0) {
    const { c, ctx: g } = canvas(W, H);
    const img = g.createImageData(W, H);
    const R = rng(seed);
    for (let i = 0; i < img.data.length; i += 4) {
      const v = 128 + (R() + R() + R() - 1.5) * 90;
      img.data[i] = img.data[i + 1] = img.data[i + 2] = v;
      img.data[i + 3] = 255;
    }
    g.putImageData(img, 0, 0);
    ctx.save();
    ctx.globalCompositeOperation = 'soft-light';
    ctx.globalAlpha = grain;
    ctx.drawImage(c, 0, 0);
    ctx.restore();
  }
}

// The depth layer: start far (white); paint shapes nearer (darker).
export function depthLayer(W, H, far = 1) {
  const d = canvas(W, H);
  d.ctx.fillStyle = css([far, far, far]);
  d.ctx.fillRect(0, 0, W, H);
  d.paint = (draw, depth, { blur = 0 } = {}) => {
    d.ctx.save();
    if (blur) d.ctx.filter = `blur(${blur}px)`;
    const v = clamp(depth);
    d.ctx.fillStyle = d.ctx.strokeStyle = css([v, v, v]);
    draw(d.ctx);
    d.ctx.restore();
  };
  return d;
}

// A smooth curve through points (Catmull-Rom as Beziers).
export function curve(ctx, pts, closed = false) {
  if (pts.length < 2) return;
  const P = closed ? [pts[pts.length - 1], ...pts, pts[0], pts[1]] : [pts[0], ...pts, pts[pts.length - 1]];
  ctx.moveTo(P[1][0], P[1][1]);
  for (let i = 1; i < P.length - 2; i++) {
    const [p0, p1, p2, p3] = [P[i - 1], P[i], P[i + 1], P[i + 2]];
    ctx.bezierCurveTo(p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6, p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6, p2[0], p2[1]);
  }
}

// A full-frame fragment shader. `body` defines vec4 scene(vec2 p, vec2 uv):
// uv is 0..1 with y up, p is uv with x stretched to the aspect (x 0..W/H);
// it returns linear HDR colour in rgb and depth (0 near, 1 far) in a.
// Supersampled ss x ss; returns { color, depth } as 2D canvases.
const HEADER = `#version 300 es
precision highp float;
uniform vec2 uRes;
uniform int uPass;
uniform float uSeed;
out vec4 o;
#define PI 3.14159265359
#define TAU 6.28318530718
float hash(float n) { return fract(sin(n * 127.1 + 311.7) * 43758.5453123); }
float hash2(vec2 p) { vec3 p3 = fract(vec3(p.xyx) * 0.1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }
vec2 hash22(vec2 p) { vec3 p3 = fract(vec3(p.xyx) * vec3(0.1031, 0.1030, 0.0973)); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.xx + p3.yz) * p3.zy); }
float noise(vec2 x) { vec2 i = floor(x), f = fract(x); vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash2(i), hash2(i + vec2(1, 0)), u.x), mix(hash2(i + vec2(0, 1)), hash2(i + vec2(1, 1)), u.x), u.y); }
float noise1(float x) { float i = floor(x), f = fract(x); float u = f * f * (3.0 - 2.0 * f); return mix(hash(i), hash(i + 1.0), u); }
float fbm(vec2 p) { float s = 0.0, a = 0.5; mat2 m = mat2(1.6, 1.2, -1.2, 1.6); for (int i = 0; i < 6; i++) { s += a * noise(p); p = m * p + 3.1; a *= 0.5; } return s; }
float fbm3(vec2 p) { float s = 0.0, a = 0.5; mat2 m = mat2(1.6, 1.2, -1.2, 1.6); for (int i = 0; i < 3; i++) { s += a * noise(p); p = m * p + 3.1; a *= 0.5; } return s; }
float fbm1(float x) { float s = 0.0, a = 0.5; for (int i = 0; i < 5; i++) { s += a * noise1(x); x = x * 2.03 + 1.7; a *= 0.5; } return s; }
float ridged(vec2 p) { float s = 0.0, a = 0.5; mat2 m = mat2(1.6, 1.2, -1.2, 1.6); for (int i = 0; i < 5; i++) { float n = 1.0 - abs(noise(p) * 2.0 - 1.0); s += a * n * n; p = m * p + 1.7; a *= 0.5; } return s; }
vec3 C(float r, float g, float b) { return pow(vec3(r, g, b) / 255.0, vec3(2.2)); }
vec3 C(int r, int g, int b) { return pow(vec3(float(r), float(g), float(b)) / 255.0, vec3(2.2)); }
vec3 CH(int h) { return C(float((h >> 16) & 255), float((h >> 8) & 255), float(h & 255)); }
float sat(float x) { return clamp(x, 0.0, 1.0); }
float lstep(float a, float b, float x) { return sat((x - a) / (b - a)); }
float sdBox2(vec2 p, vec2 b) { vec2 d = abs(p) - b; return length(max(d, 0.0)) + min(max(d.x, d.y), 0.0); }
float sdRound2(vec2 p, vec2 b, float r) { vec2 q = abs(p) - b + r; return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - r; }
float sdSeg(vec2 p, vec2 a, vec2 b) { vec2 pa = p - a, ba = b - a; float h = sat(dot(pa, ba) / dot(ba, ba)); return length(pa - ba * h); }
mat2 rot(float a) { float c = cos(a), s = sin(a); return mat2(c, -s, s, c); }
// Filmic: ACES (Narkowicz), then a gentle shoulder.
vec3 tonemap(vec3 x) { return clamp((x * (2.51 * x + 0.03)) / (x * (2.43 * x + 0.59) + 0.14), 0.0, 1.0); }
vec3 srgb(vec3 c) { return pow(max(c, 0.0), vec3(1.0 / 2.2)); }
`;
const MAIN = `
uniform int uSS;
uniform float uExposure;
void main() {
  vec3 acc = vec3(0.0);
  float n = float(uSS);
  for (int i = 0; i < 4; i++) for (int j = 0; j < 4; j++) {
    if (i >= uSS || j >= uSS) continue;
    vec2 fc = gl_FragCoord.xy - 0.5 + (vec2(i, j) + 0.5) / n;
    vec2 uv = fc / uRes;
    vec2 p = vec2(uv.x * uRes.x / uRes.y, uv.y);
    vec4 s = scene(p, uv);
    acc += uPass == 0 ? tonemap(s.rgb * uExposure) : vec3(sat(s.a));
  }
  acc /= n * n;
  if (uPass == 0) acc = srgb(acc) + (hash2(gl_FragCoord.xy + uSeed) - 0.5) / 255.0;
  o = vec4(acc, 1.0);
}
`;

export function shader(W, H, body, { ss = 3, seed = 1, exposure = 1 } = {}) {
  const c = document.createElement('canvas');
  c.width = W;
  c.height = H;
  const gl = c.getContext('webgl2', { preserveDrawingBuffer: true, premultipliedAlpha: false, antialias: false });
  const src = HEADER + body + MAIN;
  const prog = gl.createProgram();
  for (const [type, s] of [[gl.VERTEX_SHADER, `#version 300 es\nin vec2 p; void main(){ gl_Position = vec4(p, 0., 1.); }`], [gl.FRAGMENT_SHADER, src]]) {
    const sh = gl.createShader(type);
    gl.shaderSource(sh, s);
    gl.compileShader(sh);
    if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
      const log = gl.getShaderInfoLog(sh);
      const m = /0:(\d+)/.exec(log || '');
      const lines = s.split('\n');
      const at = m ? +m[1] : 0;
      throw new Error(log + '\n' + lines.slice(Math.max(0, at - 3), at + 2).map((l, k) => `${at - 2 + k}: ${l}`).join('\n'));
    }
    gl.attachShader(prog, sh);
  }
  gl.bindAttribLocation(prog, 0, 'p');
  gl.linkProgram(prog);
  gl.useProgram(prog);
  const b = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, b);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  gl.enableVertexAttribArray(0);
  gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
  const u = (n) => gl.getUniformLocation(prog, n);
  gl.uniform2f(u('uRes'), W, H);
  gl.uniform1i(u('uSS'), ss);
  gl.uniform1f(u('uSeed'), seed);
  gl.uniform1f(u('uExposure'), exposure);
  gl.viewport(0, 0, W, H);
  const grab = (pass) => {
    gl.uniform1i(u('uPass'), pass);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    const out = canvas(W, H);
    out.ctx.drawImage(c, 0, 0);
    return out;
  };
  const color = grab(0);
  const depth = grab(1);
  return { color, depth };
}

// A cover's depth layer from a shader's depth output, ready to paint more into.
export function depthFrom(d) {
  d.paint = (draw, depth, { blur = 0 } = {}) => {
    d.ctx.save();
    if (blur) d.ctx.filter = `blur(${blur}px)`;
    const v = clamp(depth);
    d.ctx.fillStyle = d.ctx.strokeStyle = css([v, v, v]);
    draw(d.ctx);
    d.ctx.restore();
  };
  return d;
}

// Depth of field: each pixel takes a blur by how far its depth is from the
// focus (both 0..1), blended between a few pre-blurred copies.
export function dof(color, depth, { focus = 0.5, range = 0.25, maxBlur = 10, levels = 6, near = 1, far = 1 } = {}) {
  const W = color.c.width, H = color.c.height;
  const copies = [];
  for (let k = 0; k < levels; k++) {
    const b = canvas(W, H);
    const r = (k / (levels - 1)) * maxBlur;
    if (r > 0) b.ctx.filter = `blur(${r}px)`;
    b.ctx.drawImage(color.c, 0, 0);
    copies.push(b.ctx.getImageData(0, 0, W, H).data);
  }
  const d = depth.ctx.getImageData(0, 0, W, H).data;
  const out = color.ctx.createImageData(W, H);
  const o = out.data;
  for (let i = 0; i < W * H; i++) {
    const z = d[i * 4] / 255;
    const dz = z - focus;
    const coc = Math.min(1, Math.max(0, Math.abs(dz) * (dz < 0 ? near : far) / range));
    const f = coc * (levels - 1);
    const k0 = Math.floor(f), k1 = Math.min(levels - 1, k0 + 1), t = f - k0;
    const a = copies[k0], b = copies[k1], j = i * 4;
    o[j] = a[j] + (b[j] - a[j]) * t;
    o[j + 1] = a[j + 1] + (b[j + 1] - a[j + 1]) * t;
    o[j + 2] = a[j + 2] + (b[j + 2] - a[j + 2]) * t;
    o[j + 3] = 255;
  }
  color.ctx.putImageData(out, 0, 0);
}

// Soft glowing motes, with their depth.
export function motes(ctx, dp, W, H, R, { n = 60, area = [0, 0, 1, 1], color = [1, 1, 1], size = [1, 3], nearShare = 0.1, nearSize = [14, 36], alpha = 0.9, depth = 0.08 } = {}) {
  const S = W / 1600;
  glow(ctx, W, H, (c) => {
    for (let i = 0; i < n; i++) {
      const x = (area[0] + (area[2] - area[0]) * R()) * W;
      const y = (area[1] + (area[3] - area[1]) * R()) * H;
      const near = R() < nearShare;
      const r = near ? (nearSize[0] + (nearSize[1] - nearSize[0]) * R()) * S : (size[0] + (size[1] - size[0]) * R()) * S;
      const col = typeof color === 'function' ? color(R) : color;
      const rg = c.createRadialGradient(x, y, 0, x, y, r);
      rg.addColorStop(0, css(col, near ? 0.1 * alpha : alpha));
      rg.addColorStop(near ? 0.85 : 0.4, css(col, near ? 0.16 * alpha : 0.55 * alpha));
      rg.addColorStop(1, css(col, 0));
      c.fillStyle = rg;
      c.beginPath();
      c.arc(x, y, r, 0, Math.PI * 2);
      c.fill();
      if (near && dp) dp.paint((d) => { d.beginPath(); d.arc(x, y, r, 0, Math.PI * 2); d.fill(); }, depth);
    }
  }, { blur: [3 * S, 12 * S], strength: [0.8, 0.5], sharp: 1 });
}
