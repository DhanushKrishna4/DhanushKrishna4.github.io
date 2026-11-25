// VoiceGuide AI: a coastal road at sunset. From a hillside of cypresses the
// road winds down through plum hills to a small seaside town whose lights
// are coming on; the sun sets into a coral sea.
export default async function ({ L, W, H }) {
  const S = W / 1600;
  const body = /* glsl */ `
const float HZ = 0.53;
const vec2 SUN = vec2(0.68, 0.548);
vec3 skyCol(vec2 uv) {
  float asp = uRes.x / uRes.y;
  float y = uv.y;
  vec3 col = mix(C(255, 178, 112), C(248, 128, 96), lstep(HZ, HZ + 0.12, y));
  col = mix(col, C(176, 78, 104), lstep(HZ + 0.1, HZ + 0.32, y));
  col = mix(col, C(68, 32, 76), lstep(HZ + 0.28, 1.05, y));
  vec2 sd = vec2((uv.x - SUN.x) * asp, y - SUN.y);
  float r = length(sd);
  col += C(255, 176, 120) * 1.3 * exp(-r * 6.5);
  col += C(255, 120, 100) * 0.4 * exp(-r * 2.0);
  // a few long clouds catching the light
  float band = lstep(HZ + 0.12, HZ + 0.18, y) * (1.0 - lstep(HZ + 0.3, HZ + 0.42, y));
  vec2 cp = vec2(uv.x * asp * 1.1, y * 20.0);
  float cn = fbm(cp + vec2(fbm(cp * 0.3) * 2.0, 0.0));
  col = mix(col, mix(C(140, 60, 100), C(255, 170, 140), exp(-abs(uv.x - SUN.x) * 2.0)), smoothstep(0.55, 0.78, cn) * band * 0.8);
  float disc = smoothstep(0.04, 0.036, r) * step(HZ, y);
  col = mix(col, C(255, 200, 140) * 3.2, disc);
  return col;
}
// The land, back to front: a hazy headland, the plum hills, the near slope.
float headland(float x) { return HZ + 0.045 * exp(-pow((x - 0.97) / 0.12, 2.0)) + 0.012 * (fbm1(x * 9.0) - 0.5); }
float hillsY(float x) { return 0.36 + 0.2 * exp(-pow((x - 0.08) / 0.34, 2.0)) + 0.04 * (fbm1(x * 5.0 + 3.0) - 0.5) - 0.06 * smoothstep(0.4, 0.75, x); }
float nearY(float x) { return 0.24 + 0.16 * exp(-pow((x + 0.05) / 0.32, 2.0)) - 0.14 * smoothstep(0.3, 1.0, x) + 0.015 * (fbm1(x * 7.0 + 1.0) - 0.5); }
vec4 scene(vec2 p, vec2 uv) {
  float asp = uRes.x / uRes.y;
  float x = uv.x, y = uv.y;
  float toward = exp(-abs(x - SUN.x) * 2.2);
  // near slope
  float ny = nearY(x);
  if (y < ny) {
    float d = ny - y;
    vec3 col = mix(C(70, 26, 50), C(34, 12, 28), lstep(0.0, 0.2, d));
    col += C(255, 140, 110) * 0.35 * exp(-d / 0.008) * (0.3 + toward);
    col *= 0.9 + 0.2 * fbm(p * 26.0);
    return vec4(col, mix(0.36, 0.08, lstep(0.0, ny, d)));
  }
  // plum hills
  float hy = hillsY(x);
  if (y < hy) {
    float d = hy - y;
    vec3 col = mix(C(132, 64, 98), C(84, 38, 76), lstep(0.0, 0.18, d));
    col += C(255, 150, 120) * 0.4 * exp(-d / 0.006) * (0.3 + toward);
    col = mix(col, C(206, 116, 120), 0.2);
    col *= 0.94 + 0.12 * fbm(p * 20.0);
    return vec4(col, 0.62 - 0.08 * lstep(0.0, 0.2, d));
  }
  // the sea
  if (y < HZ) {
    float hdy = headland(x);
    float v = HZ - y;
    float swell = (noise(vec2(x * 10.0, y * 360.0)) - 0.5) + (noise(vec2(x * 3.0, y * 120.0)) - 0.5) * 0.8;
    swell *= 1.0 + 2.2 * exp(-abs(x - SUN.x) * 10.0);
    vec2 m = vec2(x + swell * 0.003, HZ + v + swell * 0.09 * v);
    vec3 refl = skyCol(m);
    vec3 col = mix(C(60, 24, 50), refl, mix(0.55, 0.9, pow(lstep(0.0, HZ, y), 0.4)));
    return vec4(col, mix(0.9, 0.55, lstep(0.0, HZ - 0.2, v)));
  }
  // the headland on the horizon
  if (y < headland(x)) return vec4(mix(skyCol(uv), C(170, 90, 120), 0.6), 0.95);
  return vec4(skyCol(uv), 1.0);
}
`;
  const { color, depth } = L.shader(W, H, body, { ss: 2, seed: 15 });
  const g = color.ctx;
  const dp = L.depthFrom(depth);
  const R = L.rng(55);
  const nearY = (x) => 0.24 + 0.16 * Math.exp(-(((x + 0.05) / 0.32) ** 2)) - 0.14 * Math.min(1, Math.max(0, (x - 0.3) / 0.7)) ** 2 * (3 - 2 * Math.min(1, Math.max(0, (x - 0.3) / 0.7)));
  const hillsY = (x) => 0.36 + 0.2 * Math.exp(-(((x - 0.08) / 0.34) ** 2)) - 0.06 * Math.min(1, Math.max(0, (x - 0.4) / 0.35));
  const Y = (u) => H * (1 - u);

  // The town, stacked up the hillside above the harbour: pale houses with
  // warm windows, a church tower, lights along the quay.
  const town = [];
  for (let i = 0; i < 150; i++) {
    const u = Math.pow(R(), 0.9);
    const tx = 0.43 + 0.22 * u;
    const top = hillsY(tx) - 0.004;
    const ty = 0.352 + (top - 0.352) * Math.pow(R(), 0.8);
    town.push([tx * W, Y(ty), R(), ty]);
  }
  town.sort((a, b) => a[1] - b[1]);
  for (const [x, y, r] of town) {
    const w = (7 + 8 * r) * S, h = (6 + 6 * r) * S;
    const lit = 0.75 + 0.25 * r;
    g.fillStyle = `rgba(${Math.round(236 * lit)},${Math.round(196 * lit)},${Math.round(190 * lit)},0.95)`;
    g.fillRect(x - w / 2, y - h, w, h);
    g.fillStyle = 'rgba(150,70,80,0.95)';
    g.beginPath();
    g.moveTo(x - w / 2 - 1.5 * S, y - h);
    g.lineTo(x, y - h - 3.5 * S);
    g.lineTo(x + w / 2 + 1.5 * S, y - h);
    g.fill();
    g.fillStyle = 'rgba(80,40,60,0.35)';
    g.fillRect(x + w * 0.15, y - h, w * 0.35, h);
  }
  {
    // the church tower
    const x = 0.56 * W, y = Y(hillsY(0.56) - 0.03);
    g.fillStyle = 'rgb(236,200,190)';
    g.fillRect(x - 6 * S, y - 40 * S, 12 * S, 40 * S);
    g.fillStyle = 'rgb(150,70,80)';
    g.beginPath();
    g.moveTo(x - 8 * S, y - 40 * S);
    g.lineTo(x, y - 56 * S);
    g.lineTo(x + 8 * S, y - 40 * S);
    g.fill();
  }
  L.glow(g, W, H, (c) => {
    for (const [x, y, r] of town) {
      if (r < 0.4) continue;
      c.fillStyle = 'rgba(255,212,140,0.95)';
      c.fillRect(x - 2 * S, y - 6 * S, 2.4 * S, 2.6 * S);
    }
    // lights along the quay
    for (let k = 0; k < 18; k++) {
      const x = (0.44 + k * 0.012) * W, y = Y(0.352);
      c.fillStyle = 'rgba(255,220,160,1)';
      c.beginPath();
      c.arc(x, y - 3 * S, 1.6 * S, 0, Math.PI * 2);
      c.fill();
    }
  }, { blur: [2 * S, 8 * S], strength: [0.8, 0.55], sharp: 1 });
  // their reflections in the harbour: soft streaks
  g.save();
  g.globalCompositeOperation = 'lighter';
  g.filter = `blur(${1.5 * S}px)`;
  for (let k = 0; k < 18; k++) {
    const x = (0.44 + k * 0.012) * W;
    g.fillStyle = 'rgba(255,190,120,0.4)';
    g.fillRect(x - 1 * S, Y(0.35), 2 * S, (14 + 16 * R()) * S);
  }
  g.restore();
  dp.paint((d) => d.fillRect(0.42 * W, Y(0.5), 0.26 * W, Y(0.35) - Y(0.5)), 0.6, { blur: 8 * S });

  // Olive trees dotted over the hills, smaller further away, each lit on
  // its sunward side.
  {
    const trees = [];
    // a grove in loose rows across the plum hill
    for (let row = 0; row < 4; row++) {
      for (let k = 0; k < 7; k++) {
        const tx = 0.04 + k * 0.055 + row * 0.02 + (R() - 0.5) * 0.02;
        const lo = nearY(tx) + 0.015, hi = hillsY(tx) - 0.015;
        if (hi <= lo || R() < 0.2) continue;
        const ty = lo + (hi - lo) * (0.15 + row * 0.22);
        trees.push([tx, ty]);
      }
    }
    trees.sort((a, b) => b[1] - a[1]);
    for (const [tx, ty] of trees) {
      const x = tx * W, y = Y(ty);
      const near = 1 - ty / 0.5;
      const r = (7 + 6 * near) * S;
      const tg = g.createRadialGradient(x + r * 0.4, y - r * 0.5, 0, x, y, r * 1.2);
      tg.addColorStop(0, 'rgba(206,110,104,0.95)');
      tg.addColorStop(0.5, 'rgba(70,28,52,0.95)');
      tg.addColorStop(1, 'rgba(40,14,32,0.95)');
      g.fillStyle = tg;
      g.beginPath();
      g.ellipse(x, y - r * 0.8, r, r * 0.82, 0, 0, Math.PI * 2);
      g.fill();
      g.fillStyle = 'rgba(30,10,24,0.35)';
      g.beginPath();
      g.ellipse(x - r * 0.6, y + r * 0.05, r * 1.3, r * 0.28, 0, 0, Math.PI * 2);
      g.fill();
    }
  }

  // The road, winding down the hills from the near slope to the town.
  const road = [[0.1, -0.03], [0.24, 0.05], [0.33, 0.13], [0.25, 0.2], [0.17, 0.255], [0.27, 0.3], [0.38, 0.325], [0.45, 0.352]];
  const pts = road.map(([x, y]) => [x * W, Y(y)]);
  const dense = [];
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[Math.max(0, i - 1)], p1 = pts[i], p2 = pts[i + 1], p3 = pts[Math.min(pts.length - 1, i + 2)];
    for (let k = 0; k < 24; k++) {
      const t = k / 24, t2 = t * t, t3 = t2 * t;
      dense.push([
        0.5 * (2 * p1[0] + (-p0[0] + p2[0]) * t + (2 * p0[0] - 5 * p1[0] + 4 * p2[0] - p3[0]) * t2 + (-p0[0] + 3 * p1[0] - 3 * p2[0] + p3[0]) * t3),
        0.5 * (2 * p1[1] + (-p0[1] + p2[1]) * t + (2 * p0[1] - 5 * p1[1] + 4 * p2[1] - p3[1]) * t2 + (-p0[1] + 3 * p1[1] - 3 * p2[1] + p3[1]) * t3),
      ]);
    }
  }
  const n = dense.length;
  const widthAt = (k) => (58 - 52 * Math.pow(k / n, 0.55)) * S;
  const ribbon = (c) => {
    const left = [], right = [];
    for (let k = 0; k < n; k++) {
      const a = dense[Math.max(0, k - 1)], b = dense[Math.min(n - 1, k + 1)];
      let tx = b[0] - a[0], ty = b[1] - a[1];
      const l = Math.hypot(tx, ty) || 1;
      tx /= l; ty /= l;
      // seen from above at a slant, the road is flattened vertically
      const w = widthAt(k) / 2;
      left.push([dense[k][0] - ty * w, dense[k][1] + tx * w * 0.45]);
      right.push([dense[k][0] + ty * w, dense[k][1] - tx * w * 0.45]);
    }
    c.beginPath();
    left.forEach((q, i) => (i ? c.lineTo(...q) : c.moveTo(...q)));
    right.reverse().forEach((q) => c.lineTo(...q));
    c.closePath();
  };
  ribbon(g);
  const rg = g.createLinearGradient(0, H, 0, Y(0.36));
  rg.addColorStop(0, 'rgb(96,58,74)');
  rg.addColorStop(0.5, 'rgb(150,98,110)');
  rg.addColorStop(1, 'rgb(204,146,140)');
  g.fillStyle = rg;
  g.fill();
  // its centre line, dashed, near us
  g.save();
  g.setLineDash([14 * S, 14 * S]);
  g.strokeStyle = 'rgba(255,226,200,0.6)';
  g.lineWidth = 1.6 * S;
  g.beginPath();
  dense.slice(0, Math.floor(n * 0.45)).forEach((q, i) => (i ? g.lineTo(...q) : g.moveTo(...q)));
  g.stroke();
  g.restore();
  dp.paint((d) => ribbon(d), 0.3);
  // a car's lights on its way down
  L.glow(g, W, H, (c) => {
    const q = dense[Math.floor(n * 0.62)];
    c.fillStyle = 'rgba(255,236,200,1)';
    c.beginPath();
    c.arc(q[0], q[1], 2.4 * S, 0, Math.PI * 2);
    c.fill();
    const q2 = dense[Math.floor(n * 0.36)];
    c.fillStyle = 'rgba(255,90,70,1)';
    c.beginPath();
    c.arc(q2[0], q2[1], 2.2 * S, 0, Math.PI * 2);
    c.fill();
  }, { blur: [4 * S, 14 * S], strength: [0.9, 0.6], sharp: 1 });

  // Cypresses on the near slope, rim-lit by the sun.
  const cypress = (c, x, base, h, rim) => {
    const w = h * 0.14;
    c.beginPath();
    c.moveTo(x, base - h);
    c.bezierCurveTo(x + w * 0.9, base - h * 0.7, x + w * 0.75, base - h * 0.15, x + w * 0.2, base);
    c.lineTo(x - w * 0.2, base);
    c.bezierCurveTo(x - w * 0.75, base - h * 0.15, x - w * 0.9, base - h * 0.7, x, base - h);
    c.closePath();
  };
  const trees = [[0.05, 0.34, 0.42], [0.1, 0.31, 0.3], [0.4, 0.17, 0.26], [0.47, 0.13, 0.2], [0.015, 0.36, 0.33]];
  for (const [tx, ty, th] of trees) {
    const x = tx * W, base = Y(ty) + 6 * S, h = th * H;
    cypress(g, x, base, h);
    const tg = g.createLinearGradient(x - h * 0.1, 0, x + h * 0.1, 0);
    tg.addColorStop(0, 'rgb(28,10,22)');
    tg.addColorStop(0.7, 'rgb(40,14,30)');
    tg.addColorStop(1, 'rgb(120,50,60)');
    g.fillStyle = tg;
    g.fill();
    // foliage texture
    g.save();
    cypress(g, x, base, h);
    g.clip();
    for (let k = 0; k < 140; k++) {
      const yy = base - R() * h;
      const xx = x + (R() - 0.3) * h * 0.22;
      g.strokeStyle = `rgba(${xx > x ? '255,150,120' : '0,0,0'},${0.05 + 0.07 * R()})`;
      g.lineWidth = 1.2 * S;
      g.beginPath();
      g.moveTo(xx, yy);
      g.quadraticCurveTo(xx + h * 0.01, yy - h * 0.02, xx + h * 0.004, yy - h * 0.045);
      g.stroke();
    }
    g.restore();
    dp.paint((d) => { cypress(d, x, base, h); d.fill(); }, 0.18);
  }
  L.finish(g, W, H, { grain: 0.05, vignette: 0.35, vigColor: [0.08, 0.02, 0.06] });
  return { color, depth: dp, depthBlur: 0.005 };
}
