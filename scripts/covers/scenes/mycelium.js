// Mycelium: a forest floor at night, close up. A cluster of glowing
// bell-capped mushrooms rises from a mossy mound; the mycelium spreads out
// from under them as fine threads of light across the moss. Fireflies drift
// in the dark, tree trunks stand out of focus in the mist behind.
export default async function ({ L, W, H }) {
  const S = W / 1600;
  const R = L.rng(21);
  const body = /* glsl */ `
// The mound's top edge: a soft hill under the cluster, mossy bumps on top.
float mound(float x) {
  float m = 0.30 + 0.14 * exp(-pow((x - 0.58) / 0.26, 2.0)) + 0.03 * sin(x * 4.0 + 1.0);
  m += 0.012 * (fbm1(x * 30.0) - 0.5) + 0.006 * (fbm1(x * 120.0) - 0.5);
  return m;
}
vec4 scene(vec2 p, vec2 uv) {
  float asp = uRes.x / uRes.y;
  float x = uv.x, y = uv.y;
  // night air with mist; a cool glow high on the left
  vec3 col = mix(C(5, 13, 11), C(12, 30, 26), lstep(0.15, 0.9, y));
  col += C(60, 120, 104) * 0.22 * exp(-length(vec2((x - 0.18) * asp, y - 1.05)) * 1.5);
  // trunks at three distances, softer and paler further away
  for (int layer = 0; layer < 3; layer++) {
    float fl = float(layer);
    for (int i = 0; i < 5; i++) {
      float fi = float(i) + fl * 11.0;
      float tx = hash(fi * 3.3 + 1.0) * 1.1 - 0.05;
      float tw = (0.006 + 0.012 * hash(fi * 7.1)) * (1.0 + fl * 0.9);
      float soft = (0.006 + 0.016 * (2.0 - fl));
      float d = abs((x - tx) * asp) - tw * (1.0 + 0.15 * (1.0 - y));
      float trunk = 1.0 - smoothstep(-soft, soft, d);
      vec3 tc = mix(C(14, 32, 28), C(3, 8, 7), fl / 2.0);
      col = mix(col, tc, trunk * mix(0.4, 0.85, fl / 2.0));
    }
  }
  // mist low in the wood
  float mist = lstep(0.75, 0.3, y) * (0.5 + 0.5 * fbm(vec2(x * 3.0, y * 8.0) + 2.0));
  col = mix(col, C(30, 62, 54), mist * 0.35);
  float depth = 0.96;
  float m = mound(x);
  if (y < m) {
    float d = m - y;
    float n = fbm(vec2(x * 46.0, y * 60.0));
    float n2 = fbm(vec2(x * 160.0, y * 180.0));
    vec3 moss = mix(C(12, 30, 14), C(34, 72, 28), smoothstep(0.35, 0.78, n));
    moss *= 0.65 + 0.7 * smoothstep(0.45, 0.85, n2);
    moss *= 1.0 - 0.8 * lstep(0.0, 0.32, d);
    // the moss nearest the glow is lit by it
    float glow = exp(-length(vec2((x - 0.58) * asp, (y - 0.4) * 1.8)) * 3.2);
    moss += C(120, 210, 90) * 0.35 * glow * (0.5 + 0.5 * n2) * (1.0 - lstep(0.0, 0.25, d));
    moss += C(140, 220, 110) * 0.1 * exp(-d / 0.005) * (0.2 + glow);
    col = moss;
    depth = mix(0.55, 0.1, lstep(0.0, m, d));
  }
  return vec4(col, depth);
}
`;
  const { color, depth } = L.shader(W, H, body, { ss: 2, seed: 5 });
  const g = color.ctx;
  const dp = L.depthFrom(depth);
  const moundY = (u) => 0.30 + 0.14 * Math.exp(-(((u - 0.58) / 0.26) ** 2)) + 0.03 * Math.sin(u * 4 + 1);
  const Y = (uvy) => H * (1 - uvy);
  const lime = L.hex('#b4f25c'), mint = L.hex('#6ee8b4'), pale = L.hex('#e2ffa8'), deepG = [0.1, 0.34, 0.14];
  const cx = 0.58 * W;

  // Mycelium: fine threads spreading down and out across the mound's face.
  const threads = [];
  const grow = (x, y, a, len, w, gen) => {
    const pts = [[x, y]];
    let px = x, py = y, ang = a;
    const step = 3 * S;
    const steps = Math.round(len / step);
    for (let i = 0; i < steps; i++) {
      ang += (R() - 0.5) * 0.34;
      const top = Y(moundY(px / W)) + 6 * S;
      if (py < top) ang += 0.3;
      if (py > H + 20 * S) break;
      px += Math.cos(ang) * step;
      py += Math.sin(ang) * step;
      pts.push([px, py]);
      if (gen > 0 && R() < 0.03) grow(px, py, ang + (R() < 0.5 ? -1 : 1) * (0.35 + R() * 0.6), len * (0.3 + 0.35 * R()), w * 0.7, gen - 1);
    }
    threads.push({ pts, w, a: 0.25 + 0.6 * R() });
  };
  for (let i = 0; i < 12; i++) {
    const side = R() < 0.5 ? -1 : 1;
    const a = Math.PI / 2 - side * (0.7 + R() * 0.85);
    const x0 = cx + (R() - 0.5) * 120 * S;
    grow(x0, Y(moundY(x0 / W)) + (10 + R() * 14) * S, a, (300 + 500 * R()) * S, 0.9 * S, 3);
  }
  L.glow(g, W, H, (c) => {
    for (const t of threads) {
      const n = t.pts.length;
      // brighter near the cluster, fading out along each thread
      for (let k = 1; k < n; k++) {
        const f = 1 - k / n;
        c.strokeStyle = L.css(L.mix(mint, lime, 0.6), (0.1 + 0.5 * f) * t.a);
        c.lineWidth = Math.max(0.5, t.w * (0.6 + 0.6 * f));
        c.beginPath();
        c.moveTo(t.pts[k - 1][0], t.pts[k - 1][1]);
        c.lineTo(t.pts[k][0], t.pts[k][1]);
        c.stroke();
      }
    }
    for (let i = 0; i < 40; i++) {
      const t = threads[Math.floor(R() * threads.length)];
      const q = t.pts[Math.floor(R() * t.pts.length * 0.6)];
      c.fillStyle = L.css(pale, 0.6);
      c.beginPath();
      c.arc(q[0], q[1], (0.7 + 1.2 * R()) * S, 0, Math.PI * 2);
      c.fill();
    }
  }, { blur: [1.5 * S, 6 * S, 16 * S], strength: [0.6, 0.45, 0.3], sharp: 0.8 });

  // Mushrooms: bell caps on slender stems; taller ones behind.
  const shrooms = [];
  const N = 13;
  for (let i = 0; i < N; i++) {
    const back = i < 6;
    const x = cx + (R() - 0.5) * (back ? 260 : 380) * S + (i % 2 ? 1 : -1) * 20 * S;
    const base = Y(moundY(x / W)) + (back ? 6 + R() * 8 : 18 + R() * 34) * S;
    const hgt = (back ? 190 + 140 * R() : 70 + 120 * R()) * S;
    const capW = (back ? 54 + 34 * R() : 62 + 64 * R()) * S;
    shrooms.push({ x, base, hgt, capW, lean: (R() - 0.5) * 0.5, back, bright: 0.75 + 0.25 * R() });
  }
  shrooms.sort((a, b) => a.base - b.base);
  const capPath = (c, w, h) => {
    // a bell: rounded apex, flaring rim
    c.beginPath();
    c.moveTo(-w * 0.52, h * 0.04);
    c.bezierCurveTo(-w * 0.46, -h * 0.4, -w * 0.26, -h * 0.92, -w * 0.06, -h * 0.98);
    c.quadraticCurveTo(0, -h * 1.1, w * 0.06, -h * 0.98);
    c.bezierCurveTo(w * 0.26, -h * 0.92, w * 0.46, -h * 0.4, w * 0.52, h * 0.04);
    c.quadraticCurveTo(0, h * 0.2, -w * 0.52, h * 0.04);
    c.closePath();
  };
  for (const m of shrooms) {
    const top = [m.x + Math.sin(m.lean) * m.hgt, m.base - Math.cos(m.lean) * m.hgt];
    const capH = m.capW * 0.72;
    const sw = m.capW * 0.055;
    // stem, curving a little, brighter toward the cap
    const sg = g.createLinearGradient(m.x, m.base, top[0], top[1]);
    sg.addColorStop(0, L.css([0.1, 0.24, 0.12], 1));
    sg.addColorStop(0.6, L.css(L.mix(deepG, lime, 0.6), 0.95));
    sg.addColorStop(1, L.css(L.mix(pale, lime, 0.5), 0.95));
    g.fillStyle = sg;
    const mid = [(m.x + top[0]) / 2 - m.lean * 30 * S, (m.base + top[1]) / 2];
    g.beginPath();
    g.moveTo(m.x - sw * 1.4, m.base);
    g.quadraticCurveTo(mid[0] - sw, mid[1], top[0] - sw * 0.8, top[1]);
    g.lineTo(top[0] + sw * 0.8, top[1]);
    g.quadraticCurveTo(mid[0] + sw, mid[1], m.x + sw * 1.4, m.base);
    g.closePath();
    g.fill();
    // cap: translucent, lit from within; ribbed by its gills
    g.save();
    g.translate(top[0], top[1] + capH * 0.12);
    g.rotate(m.lean * 0.7);
    const cg = g.createRadialGradient(0, capH * 0.15, 0, 0, -capH * 0.1, capH * 1.25);
    cg.addColorStop(0, L.css(L.mix(pale, lime, 0.35), 1));
    cg.addColorStop(0.3, L.css(lime, 0.98));
    cg.addColorStop(0.72, L.css(L.mix(deepG, lime, 0.5), 0.96));
    cg.addColorStop(1, L.css(deepG, 0.95));
    g.fillStyle = cg;
    capPath(g, m.capW, capH);
    g.fill();
    g.clip();
    g.strokeStyle = L.css(deepG, 0.28);
    g.lineWidth = Math.max(0.6, 0.9 * S);
    for (let k = -6; k <= 6; k++) {
      g.beginPath();
      g.moveTo(k * m.capW * 0.07, 0);
      g.quadraticCurveTo(k * m.capW * 0.05, -capH * 0.5, k * m.capW * 0.012, -capH);
      g.stroke();
    }
    g.restore();
    dp.paint((d) => {
      d.save();
      d.translate(top[0], top[1] + capH * 0.12);
      d.rotate(m.lean * 0.7);
      capPath(d, m.capW, capH);
      d.fill();
      d.restore();
      d.beginPath();
      d.moveTo(m.x - sw * 1.4, m.base);
      d.quadraticCurveTo(mid[0] - sw, mid[1], top[0] - sw, top[1]);
      d.lineTo(top[0] + sw, top[1]);
      d.quadraticCurveTo(mid[0] + sw, mid[1], m.x + sw * 1.4, m.base);
      d.fill();
    }, m.back ? 0.4 : 0.3);
  }
  // their glow, and the light they throw
  L.glow(g, W, H, (c) => {
    for (const m of shrooms) {
      const top = [m.x + Math.sin(m.lean) * m.hgt, m.base - Math.cos(m.lean) * m.hgt];
      const rg = c.createRadialGradient(top[0], top[1], 0, top[0], top[1], m.capW * 1.7);
      rg.addColorStop(0, L.css(lime, 0.5 * m.bright));
      rg.addColorStop(1, L.css(lime, 0));
      c.fillStyle = rg;
      c.fillRect(top[0] - m.capW * 2, top[1] - m.capW * 2, m.capW * 4, m.capW * 4);
    }
  }, { blur: [18 * S, 48 * S], strength: [0.55, 0.45], sharp: 0.45 });

  // Fireflies and spores; a few large and soft, near the lens.
  L.glow(g, W, H, (c) => {
    for (let i = 0; i < 80; i++) {
      const x = R() * W, y = R() * H * 0.8;
      const near = R() < 0.1;
      const r = near ? (16 + 30 * R()) * S : (1.0 + 2.4 * R()) * S;
      const col = R() < 0.65 ? lime : [1, 0.9, 0.5];
      const rg = c.createRadialGradient(x, y, 0, x, y, r);
      rg.addColorStop(0, L.css(col, near ? 0.12 : 1));
      rg.addColorStop(near ? 0.85 : 0.4, L.css(col, near ? 0.16 : 0.55));
      rg.addColorStop(1, L.css(col, 0));
      c.fillStyle = rg;
      c.beginPath();
      c.arc(x, y, r, 0, Math.PI * 2);
      c.fill();
      if (near) dp.paint((d) => { d.beginPath(); d.arc(x, y, r, 0, Math.PI * 2); d.fill(); }, 0.06);
    }
  }, { blur: [3 * S, 12 * S], strength: [0.8, 0.5], sharp: 1 });

  // Out-of-focus fern fronds across the near corners.
  const frond = (c, x0, y0, ang, len) => {
    c.save();
    c.translate(x0, y0);
    c.rotate(ang);
    c.lineWidth = 3 * S;
    c.beginPath();
    c.moveTo(0, 0);
    c.quadraticCurveTo(len * 0.5, -len * 0.06, len, len * 0.04);
    c.stroke();
    for (let i = 1; i < 22; i++) {
      const t = i / 22;
      const lx = t * len, ly = -len * 0.06 * Math.sin(t * Math.PI) + t * len * 0.04;
      const lw = Math.sin(Math.PI * Math.min(1, t * 1.15)) * len * 0.16 + 4 * S;
      for (const sgn of [-1, 1]) {
        c.beginPath();
        c.ellipse(lx + lw * 0.3, ly + sgn * lw * 0.42, lw * 0.5, lw * 0.13, sgn * 0.75, 0, Math.PI * 2);
        c.fill();
      }
    }
    c.restore();
  };
  const ferns = (c) => {
    frond(c, -30 * S, H + 10 * S, -0.62, 520 * S);
    frond(c, W + 40 * S, H + 30 * S, -2.45, 460 * S);
  };
  const fr = L.canvas(W, H);
  fr.ctx.fillStyle = fr.ctx.strokeStyle = 'rgb(2,7,5)';
  ferns(fr.ctx);
  g.save();
  g.filter = `blur(${9 * S}px)`;
  g.drawImage(fr.c, 0, 0);
  g.restore();
  const near = L.canvas(W, H);
  near.ctx.fillStyle = near.ctx.strokeStyle = 'rgb(10,10,10)';
  ferns(near.ctx);
  dp.ctx.save();
  dp.ctx.filter = `blur(${5 * S}px)`;
  dp.ctx.globalCompositeOperation = 'darken';
  dp.ctx.drawImage(near.c, 0, 0);
  dp.ctx.restore();

  L.finish(g, W, H, { grain: 0.06, vignette: 0.42, vigColor: [0, 0.01, 0.0] });
  return { color, depth: dp, depthBlur: 0.005 };
}
