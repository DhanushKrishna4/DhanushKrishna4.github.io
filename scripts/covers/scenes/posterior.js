// Posterior: misty mountains in blue ink on warm paper, ridge behind ridge,
// each darker and sharper than the last, the mist lifting between them; a
// pale sun, pines on the near ridge, a few birds.
export default async function ({ L, W, H }) {
  const S = W / 1600;
  const body = /* glsl */ `
const int NL = 7;
float peaks(float x, float seed) {
  float s = 0.0, a = 0.55, f = 1.0;
  for (int k = 0; k < 5; k++) {
    float n = 1.0 - abs(2.0 * noise1(x * f + seed) - 1.0);
    s += a * n * n;
    f *= 2.1; a *= 0.48;
  }
  return s;
}
float ridgeY(int i, float x) {
  float t = float(i) / float(NL - 1);
  float base = mix(0.6, 0.06, pow(t, 0.9));
  float amp = mix(0.12, 0.3, t);
  float freq = mix(2.6, 1.15, t);
  float y = base + amp * (peaks(x * freq + float(i) * 7.3, float(i) * 3.1) - 0.45);
  // the near ridges rise toward the left, framing the view
  y += t * 0.12 * (1.0 - smoothstep(0.0, 0.55, x)) * step(0.6, t);
  return y;
}
vec3 paper(vec2 uv, vec2 p) {
  vec3 c = C(238, 233, 222);
  float fib = fbm(vec2(p.x * 220.0, p.y * 30.0)) * 0.6 + fbm(p * 90.0) * 0.4;
  c *= 0.965 + 0.06 * fib;
  // the faint warmth of age toward the corners
  float e = length(uv - 0.5);
  c = mix(c, C(222, 208, 186), smoothstep(0.35, 0.85, e) * 0.5);
  return c;
}
vec4 scene(vec2 p, vec2 uv) {
  float asp = uRes.x / uRes.y;
  float x = uv.x, y = uv.y;
  vec3 col = paper(uv, p);
  // the sky: a whisper of blue up high
  col = mix(col, C(214, 220, 232), lstep(0.7, 1.1, y) * 0.5);
  // a pale sun
  vec2 sd = vec2((x - 0.7) * asp, y - 0.74);
  float sr = length(sd);
  col = mix(col, C(232, 150, 118), smoothstep(0.072, 0.066, sr) * 0.55);
  col = mix(col, C(240, 200, 180), exp(-sr * 9.0) * 0.18);
  float depth = 1.0;
  vec3 mistC = C(232, 230, 226);
  for (int i = 0; i < NL; i++) {
    float t = float(i) / float(NL - 1);
    float Y = ridgeY(i, x) + 0.004 * (noise(vec2(x * 160.0, float(i))) - 0.5);
    if (y < Y) {
      float d = Y - y;
      // mist fills the body of the mountain, so what is behind is hidden
      col = mix(paper(uv, p), mistC, 0.35);
      col = mix(col, C(226, 228, 236), (1.0 - t) * 0.35);
      // ink: dense at the ridge, washing out downward into the mist
      float fall = mix(0.035, 0.12, t);
      float a = exp(-d / fall);
      // texture strokes down the slopes
      float strokes = fbm(vec2(x * mix(30.0, 14.0, t), d * mix(10.0, 5.0, t) + float(i)));
      a = a * (0.75 + 0.5 * strokes) + (0.12 + 0.18 * t) * smoothstep(0.55, 0.8, strokes) * exp(-d / (fall * 3.0));
      a *= 0.9 + 0.2 * fbm(p * 140.0);
      vec3 ink = mix(C(146, 162, 196), C(22, 30, 74), pow(t, 0.85));
      col = mix(col, ink, sat(a * mix(0.55, 1.0, t)));
      depth = mix(0.92, 0.12, t) - 0.04 * lstep(0.0, 0.2, d);
    }
  }
  return vec4(col, depth);
}
`;
  const { color, depth } = L.shader(W, H, body, { ss: 3, seed: 7 });
  const g = color.ctx;
  const dp = L.depthFrom(depth);
  const R = L.rng(33);
  // Pines on the near ridge, in ink: a leaning trunk, short branches, and
  // flat pads of needles drawn as fans of fine strokes.
  const pine = (c, x, y, h, lean) => {
    const pts = [];
    for (let k = 0; k <= 12; k++) {
      const t = k / 12;
      pts.push([x + lean * h * t * t + Math.sin(t * 5 + x) * h * 0.02, y - h * t]);
    }
    c.save();
    c.lineCap = 'round';
    for (let k = 1; k < pts.length; k++) {
      c.lineWidth = Math.max(1, h * 0.032 * (1 - (k / pts.length) * 0.75));
      c.beginPath();
      c.moveTo(pts[k - 1][0], pts[k - 1][1]);
      c.lineTo(pts[k][0], pts[k][1]);
      c.stroke();
    }
    const pad = (px, py, r) => {
      for (let j = 0; j < 46; j++) {
        const a = -Math.PI / 2 + (R() - 0.5) * Math.PI * 1.25;
        const len = r * (0.45 + 0.55 * R());
        c.lineWidth = Math.max(0.7, h * 0.006);
        c.globalAlpha = 0.55 + 0.35 * R();
        c.beginPath();
        c.moveTo(px, py);
        c.lineTo(px + Math.cos(a) * len, py + Math.sin(a) * len * 0.38);
        c.stroke();
      }
      c.globalAlpha = 0.5;
      c.beginPath();
      c.ellipse(px, py - r * 0.06, r * 0.7, r * 0.14, 0, 0, Math.PI * 2);
      c.fill();
      c.globalAlpha = 1;
    };
    for (let k = 0; k < 6; k++) {
      const t = 0.42 + k * 0.1;
      const [bx, by] = pts[Math.round(t * 12)];
      const dir = k % 2 ? 1 : -1;
      const reach = h * (0.26 - 0.03 * k) * (0.8 + 0.4 * R());
      const ex = bx + dir * reach, ey = by - h * 0.04;
      c.lineWidth = Math.max(1, h * 0.012);
      c.beginPath();
      c.moveTo(bx, by);
      c.quadraticCurveTo(bx + dir * reach * 0.5, by - h * 0.05, ex, ey);
      c.stroke();
      pad(ex - dir * reach * 0.25, ey, reach * 0.75);
    }
    pad(pts[12][0], pts[12][1] + h * 0.02, h * 0.16);
    c.restore();
  };
  const pines = [[0.085, 0.8, 0.3, 0.12], [0.145, 0.775, 0.2, -0.1], [0.035, 0.81, 0.22, 0.2]];
  g.save();
  g.fillStyle = g.strokeStyle = 'rgba(16,22,56,0.9)';
  for (const [px, py, ph, ln] of pines) pine(g, px * W, py * H, ph * H, ln);
  g.restore();
  const pd = L.canvas(W, H);
  pd.ctx.fillStyle = pd.ctx.strokeStyle = 'rgb(20,20,20)';
  for (const [px, py, ph, ln] of pines) pine(pd.ctx, px * W, py * H, ph * H, ln);
  dp.ctx.save();
  dp.ctx.filter = `blur(${2 * S}px)`;
  dp.ctx.globalCompositeOperation = 'darken';
  dp.ctx.drawImage(pd.c, 0, 0);
  dp.ctx.restore();
  // Birds crossing toward the sun.
  g.save();
  g.strokeStyle = 'rgba(30,36,74,0.8)';
  for (const [bx, by, s] of [[0.5, 0.2, 1], [0.53, 0.18, 0.8], [0.555, 0.215, 0.7], [0.475, 0.235, 0.6]]) {
    const x = bx * W, y = by * H, w = 0.012 * W * s;
    g.lineWidth = Math.max(1, 0.0018 * W * s);
    g.beginPath();
    g.moveTo(x - w, y - w * 0.15);
    g.quadraticCurveTo(x - w * 0.4, y - w * 0.5, x, y);
    g.quadraticCurveTo(x + w * 0.4, y - w * 0.5, x + w, y - w * 0.2);
    g.stroke();
  }
  g.restore();
  L.finish(g, W, H, { grain: 0.035, vignette: 0.12, vigColor: [0.35, 0.28, 0.2] });
  return { color, depth: dp, depthBlur: 0.005 };
}
