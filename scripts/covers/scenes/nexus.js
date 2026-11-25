// Nexus: a lake in the mountains at night. A constellation of connected
// points glows cyan above the still water, and the water holds its
// reflection; the Milky Way arcs over dark peaks.
export default async function ({ L, W, H }) {
  const S = W / 1600;
  const HZv = 0.36; // the shoreline, as uv y (from the bottom)
  const body = /* glsl */ `
const float HZ = ${HZv};
vec3 skyCol(vec2 uv, vec2 p) {
  float asp = uRes.x / uRes.y;
  float y = uv.y;
  vec3 col = mix(C(16, 30, 44), C(8, 14, 26), lstep(HZ, 0.75, y));
  col = mix(col, C(3, 5, 12), lstep(0.7, 1.05, y));
  // the Milky Way: a soft band across the sky with dark dust in it
  vec2 q = rot(0.42) * vec2((uv.x - 0.5) * asp, y - 0.78);
  float band = exp(-q.y * q.y / 0.012);
  float dust = fbm(q * vec2(4.0, 14.0) + 3.0);
  col += C(80, 110, 140) * band * (0.15 + 0.4 * fbm(q * 7.0)) * (1.0 - 0.7 * smoothstep(0.45, 0.7, dust));
  // stars: fine and many in the band, fewer elsewhere
  for (int l = 0; l < 2; l++) {
    float sc = l == 0 ? 220.0 : 90.0;
    vec2 g = uv * vec2(asp, 1.0) * sc;
    vec2 id = floor(g);
    vec2 f = fract(g) - 0.5 - (hash22(id + float(l) * 7.0) - 0.5) * 0.7;
    float th = l == 0 ? mix(0.975, 0.93, band) : 0.992;
    float s = smoothstep(l == 0 ? 0.06 : 0.09, 0.0, length(f)) * step(th, hash2(id + float(l) * 3.0));
    col += mix(C(200, 220, 255), C(255, 226, 200), hash2(id + 11.0)) * s * (0.5 + 2.5 * pow(hash2(id + 5.0), 5.0)) * lstep(HZ + 0.02, HZ + 0.2, y);
  }
  // a faint cyan glow from the network, low in the sky
  col += C(40, 150, 190) * 0.18 * exp(-length(vec2((uv.x - 0.5) * asp, (y - 0.6) * 1.6)) * 2.6);
  return col;
}
float peaks(float x) {
  float s = 0.0, a = 0.5, f = 1.0;
  for (int k = 0; k < 5; k++) { float n = 1.0 - abs(2.0 * noise1(x * f * 3.0 + 4.0) - 1.0); s += a * n * n; f *= 2.1; a *= 0.5; }
  return s;
}
float far(float x) { return HZ + 0.06 + 0.17 * (peaks(x * 1.3 + 2.0) - 0.4); }
float near(float x) { return HZ + 0.012 + 0.07 * (peaks(x * 2.4 + 9.0) - 0.45) + 0.05 * smoothstep(0.65, 1.0, x); }
vec3 above(vec2 uv, vec2 p) {
  vec3 col = skyCol(uv, p);
  if (uv.y < far(uv.x)) col = mix(C(14, 24, 36), C(10, 18, 28), lstep(HZ, far(uv.x), uv.y));
  if (uv.y < near(uv.x)) col = C(5, 9, 15);
  // a thin mist on the water at the foot of the mountains
  col = mix(col, C(30, 60, 80), exp(-pow((uv.y - HZ - 0.006) / 0.014, 2.0)) * 0.35);
  return col;
}
vec4 scene(vec2 p, vec2 uv) {
  float asp = uRes.x / uRes.y;
  float x = uv.x, y = uv.y;
  if (y >= HZ) {
    float depth = y < near(x) ? 0.84 : y < far(x) ? 0.92 : 1.0;
    return vec4(above(uv, p), depth);
  }
  float v = HZ - y;
  float swell = (noise(vec2(x * 8.0, y * 300.0)) - 0.5) * 1.0 + (noise(vec2(x * 3.0, y * 110.0)) - 0.5) * 0.7;
  vec2 m = vec2(x + swell * 0.004, HZ + v + swell * 0.05 * v);
  vec3 refl = above(m, vec2(m.x * asp, m.y));
  vec3 col = mix(C(2, 4, 8), refl, mix(0.5, 0.92, pow(lstep(0.0, HZ, y), 0.5)));
  return vec4(col, mix(0.88, 0.1, pow(lstep(0.0, HZ, v), 0.7)));
}
`;
  const { color, depth } = L.shader(W, H, body, { ss: 2, seed: 13 });
  const g = color.ctx;
  const dp = L.depthFrom(depth);
  const R = L.rng(41);
  const cyan = L.hex('#5fe0ff'), ice = L.hex('#d8f6ff');
  // The network: a loose orb of points floating over the water, each joined
  // to its nearest neighbours; the far side dimmer; a few strays drifting off.
  const shore = (1 - HZv) * H;
  const N = 120;
  const P3 = [];
  for (let i = 0; i < N; i++) {
    const t = (i + 0.5) / N;
    const phi = Math.acos(1 - 2 * t), th = Math.PI * (1 + Math.sqrt(5)) * i;
    const rr = 1 + (R() - 0.5) * 0.18;
    P3.push([Math.sin(phi) * Math.cos(th) * rr, Math.cos(phi) * rr * 0.92, Math.sin(phi) * Math.sin(th) * rr]);
  }
  for (let i = 0; i < 14; i++) {
    const a = R() * Math.PI * 2, b = (R() - 0.5) * 2;
    const rr = 1.35 + R() * 0.6;
    P3.push([Math.cos(a) * rr, b * 0.7, Math.sin(a) * rr]);
  }
  const rotY = 0.6, rotX = 0.35;
  const cxp = 0.5 * W, cyp = 0.33 * H, rad = 0.17 * H;
  const pts = P3.map(([x, y, z]) => {
    let X = x * Math.cos(rotY) + z * Math.sin(rotY), Z = -x * Math.sin(rotY) + z * Math.cos(rotY);
    let Y = y * Math.cos(rotX) - Z * Math.sin(rotX);
    Z = y * Math.sin(rotX) + Z * Math.cos(rotX);
    const f = 3.2 / (3.2 + Z);
    return { x: cxp + X * rad * f, y: cyp - Y * rad * f, z: Z, front: 0.5 - Z * 0.5, s: R() < 0.1 ? 2.2 + 1.4 * R() : 0.7 + 0.9 * R() };
  });
  const edges = [];
  for (let i = 0; i < N; i++) {
    const d = P3.slice(0, N).map((q, j) => [Math.hypot(q[0] - P3[i][0], q[1] - P3[i][1], q[2] - P3[i][2]), j]).sort((a, b) => a[0] - b[0]);
    for (let k = 1; k <= 3; k++) if (R() < 0.85 && d[k][1] > i) edges.push([i, d[k][1]]);
  }
  const drawNet = (c, alpha = 1) => {
    for (const [i, j] of edges) {
      const a = pts[i], b = pts[j];
      const fa = 0.25 + 0.75 * a.front, fb = 0.25 + 0.75 * b.front;
      const gr = c.createLinearGradient(a.x, a.y, b.x, b.y);
      gr.addColorStop(0, L.css(cyan, 0.5 * fa * alpha));
      gr.addColorStop(1, L.css(cyan, 0.5 * fb * alpha));
      c.strokeStyle = gr;
      c.lineWidth = 0.9 * S;
      c.beginPath();
      c.moveTo(a.x, a.y);
      c.lineTo(b.x, b.y);
      c.stroke();
    }
    for (const q of pts) {
      const f = 0.3 + 0.7 * q.front;
      const r = q.s * 1.9 * S * (0.7 + 0.4 * q.front);
      const rg = c.createRadialGradient(q.x, q.y, 0, q.x, q.y, r * 3);
      rg.addColorStop(0, L.css(ice, f * alpha));
      rg.addColorStop(0.25, L.css(cyan, 0.85 * f * alpha));
      rg.addColorStop(1, L.css(cyan, 0));
      c.fillStyle = rg;
      c.beginPath();
      c.arc(q.x, q.y, r * 3, 0, Math.PI * 2);
      c.fill();
    }
    // a soft light inside the orb
    const ig = c.createRadialGradient(cxp, cyp, 0, cxp, cyp, rad * 1.2);
    ig.addColorStop(0, L.css(cyan, 0.16 * alpha));
    ig.addColorStop(1, L.css(cyan, 0));
    c.fillStyle = ig;
    c.beginPath();
    c.arc(cxp, cyp, rad * 1.2, 0, Math.PI * 2);
    c.fill();
  };
  // its reflection: mirrored about the shoreline, broken by the swell
  {
    const net = L.canvas(W, H);
    drawNet(net.ctx, 0.9);
    const ref = L.canvas(W, H);
    const slice = 3 * S;
    for (let y = shore; y < H; y += slice) {
      const src = 2 * shore - y;
      if (src < 0) break;
      const off = Math.sin(y * 0.09 / S) * 4 * S + Math.sin(y * 0.031 / S + 1.3) * 7 * S * ((y - shore) / (H - shore));
      ref.ctx.drawImage(net.c, 0, src, W, slice, off, y, W, slice);
    }
    g.save();
    g.globalCompositeOperation = 'lighter';
    g.globalAlpha = 0.55;
    g.filter = `blur(${1.6 * S}px)`;
    g.drawImage(ref.c, 0, 0);
    g.restore();
  }
  L.glow(g, W, H, (c) => drawNet(c), { blur: [3 * S, 12 * S, 40 * S], strength: [0.8, 0.55, 0.4], sharp: 1 });
  dp.paint((d) => { d.beginPath(); d.arc(cxp, cyp, rad * 1.05, 0, Math.PI * 2); d.fill(); }, 0.5, { blur: 14 * S });
  L.finish(g, W, H, { grain: 0.05, vignette: 0.45, vigColor: [0, 0.01, 0.03] });
  return { color, depth: dp, depthBlur: 0.006 };
}
