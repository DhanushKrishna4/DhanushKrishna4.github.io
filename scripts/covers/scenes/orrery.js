// Orrery: twilight above a sea of clouds. The sun has just set into the
// cloud tops; a great ringed planet hangs in the lavender sky with two small
// moons, all on fine orbit lines traced around the sun, as on an orrery.
export default async function ({ L, W, H }) {
  const S = W / 1600;
  const asp = W / H;
  const SUN = [0.68, 0.345];
  const PL = { c: [0.28, 0.69], r: 0.135, tilt: -0.38 };
  const M1 = { c: [0.86, 0.74], r: 0.032 };
  const M2 = { c: [0.5, 0.52], r: 0.018 };
  const body = /* glsl */ `
const vec2 SUN = vec2(${SUN[0]}, ${SUN[1]});
const int NC = 6;
vec3 skyCol(vec2 uv, float disc) {
  float asp = uRes.x / uRes.y;
  float y = uv.y;
  vec3 col = mix(C(255, 196, 166), C(240, 182, 204), lstep(0.3, 0.44, y));
  col = mix(col, C(196, 176, 232), lstep(0.38, 0.6, y));
  col = mix(col, C(132, 118, 206), lstep(0.56, 0.86, y));
  col = mix(col, C(78, 66, 160), lstep(0.82, 1.08, y));
  vec2 sd = vec2((uv.x - SUN.x) * asp, uv.y - SUN.y);
  float r = length(sd);
  col += C(255, 196, 150) * 1.5 * exp(-r * 5.5);
  col += C(255, 166, 160) * 0.4 * exp(-r * 1.8);
  col = mix(col, C(255, 240, 220) * 5.0, smoothstep(0.026, 0.022, r) * disc);
  return col;
}
// A sphere lit from the sun, with soft bands and an atmosphere.
vec4 sphere(vec2 uv, vec2 c, float r, float tilt, vec3 a, vec3 b, float bandK, out float hit) {
  float asp = uRes.x / uRes.y;
  vec2 q = vec2((uv.x - c.x) * asp, uv.y - c.y) / r;
  float d = length(q);
  hit = 1.0 - smoothstep(0.995, 1.005, d);
  vec2 qr = rot(tilt) * q;
  float z = sqrt(max(0.0, 1.0 - d * d));
  vec3 n = vec3(q, z);
  vec3 Ls = normalize(vec3((SUN.x - c.x) * asp, SUN.y - c.y, 0.55));
  float dif = max(0.0, dot(n, Ls));
  float bands = sin(qr.y * bandK + fbm(vec2(qr.y * 3.0, qr.x * 0.6) + c * 9.0) * 2.4);
  vec3 base = mix(a, b, 0.5 + 0.32 * bands);
  vec3 col = base * (0.18 + 1.0 * pow(dif, 0.8));
  // a soft lavender fill from the sky on the night side
  col += C(120, 104, 190) * 0.18 * (1.0 - dif) * z;
  // atmosphere at the limb, brightest toward the sun
  float rim = pow(1.0 - z, 3.0) * (0.3 + dif);
  col += C(255, 214, 230) * rim * 0.6;
  return vec4(col, 1.0);
}
// The sea of clouds: rows of billows, nearer rows bigger; each lit by the
// low sun with light marched through the cloud toward it.
float bump(float u, float seed) {
  float i = floor(u), f = fract(u);
  float h = 0.45 + 0.55 * hash(i * 1.7 + seed);
  float d = (f - 0.5) * 2.0;
  return sqrt(max(0.0, 1.0 - d * d)) * h;
}
float topOf(int i, float x) {
  float t = float(i) / float(NC - 1);
  float base = mix(0.335, 0.0, pow(t, 0.8));
  float amp = mix(0.022, 0.2, pow(t, 1.1));
  float f = mix(16.0, 2.2, pow(t, 0.75));
  float s = float(i) * 13.7;
  float u = x * f + s;
  float b = 0.62 * bump(u, s) + 0.28 * bump(u * 2.3 + 0.4, s + 1.0) + 0.14 * bump(u * 5.2 + 0.7, s + 2.0) + 0.06 * bump(u * 11.0, s + 3.0);
  return base + amp * b;
}
float dens(int i, vec2 q) { return smoothstep(0.0, 0.012 + 0.03 * float(i) / float(NC - 1), topOf(i, q.x) - q.y); }
vec4 scene(vec2 p, vec2 uv) {
  float asp = uRes.x / uRes.y;
  float x = uv.x, y = uv.y;
  // clouds, nearest first
  for (int i = NC - 1; i >= 0; i--) {
    float t = float(i) / float(NC - 1);
    float top = topOf(i, x);
    if (y > top) continue;
    float a = dens(i, vec2(x, y));
    // light: march toward the sun through this row
    vec2 toSun = normalize(vec2((SUN.x - x) * asp, SUN.y - y + 0.25)) * vec2(1.0 / asp, 1.0);
    float acc = 0.0;
    float stepL = mix(0.004, 0.02, t);
    for (int k = 1; k <= 6; k++) acc += dens(i, vec2(x, y) + toSun * stepL * float(k));
    float T = exp(-acc * 0.55);
    float toward = exp(-abs(x - SUN.x) * 2.0);
    vec3 shade = mix(C(176, 156, 220), C(128, 108, 196), t);
    vec3 light = mix(C(255, 228, 220), C(255, 192, 160), toward) * (1.0 + 0.9 * toward);
    vec3 col = mix(shade, light, T);
    // a silver lining along the edges toward the sun
    col += C(255, 226, 210) * (1.0 - a) * 0.6 * (0.3 + toward);
    // far rows melt into the glow at the horizon
    col = mix(col, skyCol(vec2(x, 0.34), 0.0), (1.0 - t) * 0.5);
    vec3 under = skyCol(uv, 1.0);
    col = mix(under, col, a);
    if (a > 0.02) return vec4(col, mix(0.9, 0.08, t));
  }
  vec3 col = skyCol(uv, 1.0);
  float depth = 1.0;
  // stars, fading in at the top
  vec2 g = uv * vec2(asp, 1.0) * 150.0;
  vec2 id = floor(g);
  vec2 f = fract(g) - 0.5 - (hash22(id) - 0.5) * 0.6;
  col += C(255, 250, 255) * smoothstep(0.07, 0.0, length(f)) * step(0.982, hash2(id)) * lstep(0.62, 0.98, y) * (0.5 + 1.5 * hash2(id + 3.0));
  // the planet's far ring, the planet, then its near ring
  vec2 pc = vec2(${PL.c[0]}, ${PL.c[1]});
  float pr = ${PL.r};
  vec2 q = vec2((x - pc.x) * asp, y - pc.y);
  vec2 qr = rot(${PL.tilt}) * q;
  vec2 rq = vec2(qr.x, qr.y / 0.22);
  float rr = length(rq) / pr;
  float ring = smoothstep(1.32, 1.35, rr) * (1.0 - smoothstep(2.15, 2.18, rr));
  ring *= 0.55 + 0.45 * sin(rr * 46.0) * sin(rr * 13.0 + 1.0);
  ring *= 1.0 - 0.85 * (smoothstep(1.62, 1.64, rr) * (1.0 - smoothstep(1.7, 1.72, rr)));
  vec3 ringC = mix(C(255, 222, 200), C(220, 196, 236), sat((rr - 1.3) / 0.9));
  bool farSide = qr.y > 0.0;
  if (farSide) col = mix(col, ringC * 1.1, ring * 0.85);
  float hit;
  vec4 pl = sphere(uv, pc, pr, ${PL.tilt}, C(246, 206, 186), C(204, 168, 214), 14.0, hit);
  if (hit > 0.0) { col = mix(col, pl.rgb, hit); depth = 0.5; }
  // the ring's shadow falls across the planet's lower half
  if (!farSide) col = mix(col, ringC * 1.15, ring * 0.92);
  if (ring > 0.05) depth = min(depth, farSide ? 0.56 : 0.44);
  // two small moons
  vec4 m1 = sphere(uv, vec2(${M1.c[0]}, ${M1.c[1]}), ${M1.r}, 0.2, C(206, 220, 255), C(160, 176, 230), 9.0, hit);
  if (hit > 0.0) { col = mix(col, m1.rgb, hit); depth = 0.66; }
  vec4 m2 = sphere(uv, vec2(${M2.c[0]}, ${M2.c[1]}), ${M2.r}, 0.0, C(255, 196, 188), C(236, 150, 160), 6.0, hit);
  if (hit > 0.0) { col = mix(col, m2.rgb, hit); depth = 0.8; }
  return vec4(col, depth);
}
`;
  const { color, depth } = L.shader(W, H, body, { ss: 3, seed: 11 });
  const g = color.ctx;
  const dp = L.depthFrom(depth);
  // Orbit lines around the sun, each through one of the bodies: fine and
  // pale, as engraved on an orrery's brass rings.
  const sx = SUN[0] * W, sy = (1 - SUN[1]) * H;
  const flat = 0.3;
  g.save();
  g.lineWidth = 1.3 * S;
  for (const b of [PL, M1, M2]) {
    const bx = b.c[0] * W, by = (1 - b.c[1]) * H;
    const dx = bx - sx, dy = (by - sy) / flat;
    const rx = Math.hypot(dx, dy);
    g.strokeStyle = 'rgba(255,240,236,0.45)';
    g.setLineDash([]);
    g.beginPath();
    g.ellipse(sx, sy, rx, rx * flat, 0, Math.PI * 1.02, Math.PI * 1.98 + 0.0);
    g.stroke();
  }
  g.restore();
  // A soft bloom over the bright clouds and the sun.
  const bloom = L.canvas(W, H);
  bloom.ctx.filter = `blur(${24 * S}px)`;
  bloom.ctx.drawImage(color.c, 0, 0);
  g.save();
  g.globalCompositeOperation = 'soft-light';
  g.globalAlpha = 0.35;
  g.drawImage(bloom.c, 0, 0);
  g.restore();
  L.finish(g, W, H, { grain: 0.04, vignette: 0.18, vigColor: [0.18, 0.12, 0.3] });
  return { color, depth: dp, depthBlur: 0.005 };
}
