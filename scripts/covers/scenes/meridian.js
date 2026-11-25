// Meridian: a still lake at blue hour. Two stones have just dropped in; their
// rings spread and cross on the mirror-flat water. A soft moon, the first
// stars, mist on the far shore and a few warm windows among the trees.
export default async function ({ L, W, H }) {
  const body = /* glsl */ `
const float HZ = 0.455;
const vec2 MOON = vec2(0.255, 0.79);

vec3 skyCol(vec2 uv, vec2 p) {
  float asp = uRes.x / uRes.y;
  float y = uv.y;
  vec3 col = mix(C(238, 186, 176), C(168, 168, 214), lstep(HZ, HZ + 0.06, y));
  col = mix(col, C(84, 106, 170), lstep(HZ + 0.04, HZ + 0.22, y));
  col = mix(col, C(34, 50, 104), lstep(HZ + 0.18, 0.86, y));
  col = mix(col, C(12, 18, 44), lstep(0.8, 1.1, y));
  // the afterglow sits low on the right
  col += C(255, 170, 150) * 0.22 * exp(-pow((y - HZ) / 0.06, 2.0)) * (0.5 + 0.8 * lstep(0.2, 1.0, uv.x));
  // stars, more of them higher up
  vec2 g = uv * vec2(asp, 1.0) * 180.0;
  vec2 id = floor(g);
  vec2 f = fract(g) - 0.5;
  float h = hash2(id);
  vec2 off = (hash22(id) - 0.5) * 0.7;
  float star = smoothstep(0.08, 0.0, length(f - off)) * step(0.985, h) * lstep(HZ + 0.08, 0.98, y);
  col += C(220, 230, 255) * star * (0.6 + 2.4 * pow(hash2(id + 7.0), 6.0));
  // the moon and its halo
  vec2 md = vec2((uv.x - MOON.x) * asp, uv.y - MOON.y);
  float mr = length(md);
  col += C(150, 170, 230) * 0.5 * exp(-mr * 7.0);
  col += C(200, 210, 255) * 0.35 * exp(-mr * 22.0);
  float disc = smoothstep(0.032, 0.029, mr);
  float maria = fbm(md * 60.0 + 3.0);
  vec3 moon = C(242, 240, 232) * (1.0 - 0.18 * smoothstep(0.45, 0.7, maria)) * 2.6;
  col = mix(col, moon, disc);
  return col;
}

// The far shore: hazy hills, then a dark band of trees.
float hills(float x) { return HZ + 0.07 + 0.06 * (fbm1(x * 2.4 + 2.0) - 0.5) + 0.03 * sin(x * 2.1 + 0.9) - 0.025 * smoothstep(0.55, 0.95, x); }
float hills2(float x) { return HZ + 0.04 + 0.045 * (fbm1(x * 3.6 + 7.0) - 0.45) + 0.02 * sin(x * 4.0 + 2.0); }
float trees(float x) {
  float clump = smoothstep(0.25, 0.65, fbm1(x * 4.0 + 1.0)) * 0.7 + 0.3 * smoothstep(0.5, 0.95, x);
  float base = HZ + 0.006 + 0.016 * clump;
  // pine tops, dense and uneven, in two rows
  float k = x * 120.0;
  float i = floor(k), f = fract(k);
  float ht = 0.45 + 0.55 * hash(i * 1.37);
  float pine = pow(1.0 - abs(f - 0.5) * 2.0, 1.25) * ht * 0.034 * clump;
  float k2 = x * 120.0 + 0.5;
  float i2 = floor(k2), f2 = fract(k2);
  float pine2 = pow(1.0 - abs(f2 - 0.5) * 2.0, 1.25) * (0.3 + 0.5 * hash(i2 * 2.1)) * 0.03 * clump;
  return base + max(pine, pine2);
}
vec3 above(vec2 uv, vec2 p) {
  float x = uv.x, y = uv.y;
  vec3 col = skyCol(uv, p);
  float hy = hills(x);
  if (y < hy) col = mix(C(138, 142, 196), C(110, 118, 180), lstep(HZ, hy, y));
  float hy2 = hills2(x);
  if (y < hy2) col = mix(C(92, 100, 160), C(72, 82, 142), lstep(HZ, hy2, y));
  float ty = trees(x);
  if (y < ty) col = mix(C(26, 34, 68), C(18, 24, 52), lstep(HZ, ty, y));
  // windows: small warm lights at the foot of the trees
  for (int i = 0; i < 6; i++) {
    float fi = float(i);
    vec2 c = vec2(0.66 + 0.035 * fi + 0.012 * hash(fi * 3.1), HZ + 0.006 + 0.004 * hash(fi * 5.7));
    float asp = uRes.x / uRes.y;
    float d = length(vec2((x - c.x) * asp, (y - c.y) * 1.4));
    float on = step(0.3, hash(fi * 9.3));
    col += C(255, 186, 112) * on * (smoothstep(0.0026, 0.0012, d) * 4.0 + 0.4 * exp(-d * 140.0));
  }
  // mist over the water at the foot of the shore
  float mist = exp(-pow((y - HZ - 0.004) / 0.012, 2.0)) * (0.4 + 0.6 * fbm(vec2(x * 5.0, y * 40.0)));
  col = mix(col, C(170, 178, 220), mist * 0.45);
  return col;
}

// Two stones' rings on the water (world units on the lake plane).
float rings(vec2 w) {
  float h = 0.0;
  vec2 S1 = vec2(-0.35, 5.2), S2 = vec2(0.85, 6.6);
  for (int s = 0; s < 2; s++) {
    vec2 c = s == 0 ? S1 : S2;
    float r = length(w - c);
    float age = s == 0 ? 1.0 : 0.82;
    for (int k = 0; k < 5; k++) {
      float r0 = (0.28 + 0.42 * float(k)) * age;
      float a = 0.022 / (1.0 + float(k) * 0.5) / (0.4 + r0);
      float d = r - r0;
      h += a * exp(-d * d / 0.018) * cos(d * 38.0);
    }
  }
  return h;
}

vec4 scene(vec2 p, vec2 uv) {
  float asp = uRes.x / uRes.y;
  float x = uv.x, y = uv.y;
  if (y >= HZ) {
    float hy = hills(x), ty = trees(x);
    float depth = y < ty ? 0.84 : y < hills2(x) ? 0.89 : y < hy ? 0.94 : 1.0;
    return vec4(above(uv, p), depth);
  }
  // The lake. Screen height below the horizon gives the distance.
  float v = HZ - y;
  float Z = 1.0 / max(v, 1e-4);
  vec2 w = vec2((x - 0.5) * asp * Z, Z);
  float e = 0.004 * Z;
  float hX = (rings(w + vec2(e, 0.0)) - rings(w - vec2(e, 0.0))) / (2.0 * e);
  float hZ = (rings(w + vec2(0.0, e)) - rings(w - vec2(0.0, e))) / (2.0 * e);
  // faint breeze texture far out
  float br = (fbm(vec2(w.x * 2.0, w.y * 0.6)) - 0.5) * 0.004 * lstep(0.0, 0.15, 0.2 - v);
  vec2 disp = vec2(hX * 0.06, hZ * 0.9 + br);
  // a faint swell everywhere: thin horizontal slices that stretch every
  // bright thing above into a vertical streak, as on real water
  float swell = (noise(vec2(x * 9.0, y * 340.0)) - 0.5) * 1.0 + (noise(vec2(x * 4.0, y * 120.0)) - 0.5) * 0.7;
  swell *= 1.0 + 2.5 * exp(-abs(x - MOON.x) * 9.0);
  // the mirror: what is above, flipped about the horizon, shifted by the slope
  vec2 m = vec2(x + disp.x * v * 2.2, HZ + v + disp.y * v * v * 9.0 + swell * 0.12 * v);
  vec3 refl = above(m, vec2(m.x * asp, m.y));
  // windows stretch into long reflections
  vec3 water = C(5, 10, 26);
  float fres = mix(0.45, 0.97, pow(lstep(0.0, HZ, y), 0.55));
  vec3 col = mix(water, refl, fres);
  // the moon's glitter on the ring crests
  float crest = max(0.0, hX * -0.4 + hZ * 0.6);
  col += C(210, 220, 255) * smoothstep(0.02, 0.06, crest) * 0.35 * exp(-abs(x - MOON.x) * 3.0);
  float depth = mix(0.9, 0.06, pow(lstep(0.0, HZ, v), 0.7));
  return vec4(col, depth);
}
`;
  const { color, depth } = L.shader(W, H, body, { ss: 3, seed: 3, exposure: 1.0 });
  const g = color.ctx;
  const dp = L.depthFrom(depth);
  // Reeds in the near corner, dark against the water.
  const R = L.rng(5);
  const reed = (ctx) => {
    for (let i = 0; i < 34; i++) {
      const bx = W * (0.83 + 0.2 * R()), by = H * (1.02);
      const hgt = H * (0.16 + 0.26 * Math.pow(R(), 1.4));
      const lean = (R() - 0.55) * W * 0.07;
      ctx.lineWidth = Math.max(1.2, W * (0.0016 + 0.0016 * R()));
      ctx.beginPath();
      ctx.moveTo(bx, by);
      ctx.quadraticCurveTo(bx + lean * 0.2, by - hgt * 0.6, bx + lean, by - hgt);
      ctx.stroke();
      if (R() < 0.25) {
        // a long leaf, bending over
        const lx = bx + lean * 0.3, ly = by - hgt * (0.3 + 0.3 * R());
        const dir = R() < 0.5 ? -1 : 1;
        ctx.save();
        ctx.lineWidth = Math.max(1.2, W * 0.0022);
        ctx.beginPath();
        ctx.moveTo(bx + lean * 0.1, by - hgt * 0.1);
        ctx.quadraticCurveTo(lx, ly - hgt * 0.25, lx + dir * W * 0.03, ly + hgt * 0.05);
        ctx.stroke();
        ctx.restore();
      }
      if (R() < 0.4) {
        // a cattail head
        const tx = bx + lean, ty = by - hgt;
        ctx.save();
        ctx.translate(tx - lean * 0.05, ty + hgt * 0.06);
        ctx.rotate(Math.atan2(lean, hgt) * 0.9);
        ctx.beginPath();
        ctx.ellipse(0, 0, W * 0.0036, H * 0.024, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
    }
  };
  g.save();
  g.strokeStyle = g.fillStyle = 'rgb(6,10,24)';
  reed(g);
  g.restore();
  // the same shapes, near, in the depth
  const R2 = L.rng(5);
  dp.paint((ctx) => { const keep = R; reed(ctx); }, 0.04);
  L.finish(g, W, H, { grain: 0.045, vignette: 0.4, vigColor: [0.0, 0.01, 0.04] });
  return { color, depth: dp, depthBlur: 0.004 };
}
