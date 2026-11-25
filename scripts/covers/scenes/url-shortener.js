// URL Shortener: a mountain pass at golden hour. The old road climbs the
// mountain in a long ladder of hairpins; down at its foot a straight road
// runs into a tunnel and through, car lights streaming in. Snow on the peak,
// haze in the valley, pines in front.
export default async function ({ L, W, H }) {
  const S = W / 1600;
  const SUN = [0.16, 0.6];
  const body = /* glsl */ `
const vec2 SUN = vec2(${SUN[0]}, ${SUN[1]});
vec3 skyCol(vec2 uv) {
  float asp = uRes.x / uRes.y;
  float y = uv.y;
  vec3 col = mix(C(255, 200, 124), C(246, 166, 120), lstep(0.4, 0.58, y));
  col = mix(col, C(150, 120, 150), lstep(0.55, 0.82, y));
  col = mix(col, C(60, 64, 108), lstep(0.78, 1.08, y));
  vec2 sd = vec2((uv.x - SUN.x) * asp, y - SUN.y);
  float r = length(sd);
  col += C(255, 200, 130) * 1.4 * exp(-r * 6.0);
  col += C(255, 160, 90) * 0.4 * exp(-r * 1.8);
  col = mix(col, C(255, 226, 170) * 4.0, smoothstep(0.034, 0.03, r));
  return col;
}
float peaks(float x, float s) {
  float v = 0.0, a = 0.55, f = 1.0;
  for (int k = 0; k < 6; k++) { float n = 1.0 - abs(2.0 * noise1(x * f + s) - 1.0); v += a * n * n; f *= 2.1; a *= 0.48; }
  return v;
}
// The far range, and the great mountain in front of it.
float farR(float x) { return 0.5 + 0.13 * (peaks(x * 2.2, 3.0) - 0.4); }
float mtn(float x) {
  float body = exp(-pow((x - 0.6) / 0.21, 2.0));
  float m = 0.27 + 0.47 * body * (0.82 + 0.3 * peaks(x * 3.2, 9.0));
  return m + (0.03 + 0.09 * body) * (peaks(x * 9.0, 21.0) - 0.45) + 0.05 * body * body * (1.0 - abs(x - 0.6) / 0.08);
}
vec4 scene(vec2 p, vec2 uv) {
  float asp = uRes.x / uRes.y;
  float x = uv.x, y = uv.y;
  float m = mtn(x);
  if (y < m) {
    float d = m - y;
    // a rocky heightfield on the face: its slope, lit from the low sun on
    // the left, gives ridges in gold and gullies in blue shadow
    vec2 q = vec2(x * asp * 16.0 + fbm(vec2(x, y) * 6.0) * 1.5, y * 4.0);
    float e = 0.01;
    float h0 = ridged(q), hx = ridged(q + vec2(e, 0.0)), hy = ridged(q + vec2(0.0, e));
    vec3 n = normalize(vec3(-(hx - h0) / e * 0.07, -(hy - h0) / e * 0.03, 1.0));
    // the mountain's broad shape: the left side faces the sun
    float side = sat(0.5 - (x - 0.6) * 2.6);
    vec3 Ls = normalize(vec3(-1.0, 0.35, 0.55));
    float lit = max(0.0, dot(n, Ls)) * mix(0.25, 1.1, side);
    vec3 shade = C(38, 42, 84), gold = C(255, 168, 78), rock = C(168, 104, 70);
    vec3 col = mix(shade, mix(rock, gold, 0.6), smoothstep(0.15, 0.85, lit));
    // snow up high, lying in the hollows
    float snow = smoothstep(0.56, 0.66, y + 0.04 * fbm(q * 0.3)) * smoothstep(0.35, 0.6, 1.0 - h0 + 0.25 * fbm(q * 0.5));
    col = mix(col, mix(C(120, 130, 190), C(255, 232, 206), smoothstep(0.2, 0.7, lit)), snow * 0.92);
    // haze lower down and toward the valley
    col = mix(col, C(214, 160, 140), lstep(0.5, 0.2, y) * 0.35);
    col += C(255, 180, 110) * exp(-d / 0.004) * 0.6 * side;
    return vec4(col, mix(0.62, 0.42, lstep(0.2, 0.75, y)));
  }
  float fr = farR(x);
  if (y < fr) {
    vec3 col = mix(C(190, 150, 160), C(150, 128, 160), lstep(0.4, fr, y));
    col += C(255, 190, 130) * 0.3 * exp(-length(vec2((x - SUN.x) * asp, y - SUN.y)) * 3.0);
    return vec4(col, 0.85);
  }
  return vec4(skyCol(uv), 1.0);
}
`;
  const { color, depth } = L.shader(W, H, body, { ss: 2, seed: 19 });
  const g = color.ctx;
  const dp = L.depthFrom(depth);
  const R = L.rng(83);
  const TAU = Math.PI * 2;
  const Y = (u) => H * (1 - u);

  // The old road: a ladder of hairpins up the mountain's sunlit flank.
  const hair = [];
  {
    let y = 0.235;
    for (let k = 0; k < 6; k++) {
      const l = (0.4 + 0.012 * k) * W, r = (0.585 - 0.008 * k) * W;
      const a = k % 2 ? r : l, b = k % 2 ? l : r;
      hair.push([a, Y(y)], [b, Y(y + 0.02)]);
      y += 0.038;
    }
  }
  const serp = (c) => {
    c.beginPath();
    c.moveTo(...hair[0]);
    for (let k = 1; k < hair.length; k++) {
      const [x, y] = hair[k];
      if (k % 2 === 1) {
        c.lineTo(x, y);
      } else {
        // the hairpin: a tight turn up to the next run
        const [px, py] = hair[k - 1];
        const dir = Math.sign(px - hair[k - 2][0]);
        c.quadraticCurveTo(px + dir * 14 * S, (py + y) / 2, x, y);
      }
    }
  };
  g.save();
  g.lineJoin = 'round';
  g.lineCap = 'round';
  g.strokeStyle = 'rgba(60,40,44,0.6)';
  g.lineWidth = 7 * S;
  serp(g);
  g.stroke();
  g.strokeStyle = 'rgba(255,226,186,0.95)';
  g.lineWidth = 3.4 * S;
  serp(g);
  g.stroke();
  g.restore();
  // a few cars on it, headlights on
  L.glow(g, W, H, (c) => {
    for (const k of [2, 5, 8, 10]) {
      const q = hair[k];
      c.fillStyle = 'rgba(255,240,200,1)';
      c.beginPath();
      c.arc(q[0] + 6 * S, q[1] + 1 * S, 1.8 * S, 0, TAU);
      c.fill();
    }
  }, { blur: [3 * S, 9 * S], strength: [0.9, 0.5], sharp: 1 });

  // The valley floor, in shade: a broad dark band at the foot.
  {
    const vg = g.createLinearGradient(0, Y(0.3), 0, H);
    vg.addColorStop(0, 'rgba(70,50,60,0.0)');
    vg.addColorStop(0.25, 'rgb(46,36,44)');
    vg.addColorStop(1, 'rgb(16,12,16)');
    g.fillStyle = vg;
    g.beginPath();
    g.moveTo(0, Y(0.25));
    for (let x = 0; x <= W; x += 20 * S) g.lineTo(x, Y(0.22 + 0.025 * Math.sin(x / W * 7 + 1)));
    g.lineTo(W, H);
    g.lineTo(0, H);
    g.closePath();
    g.fill();
    dp.paint((d) => d.fillRect(0, Y(0.25), W, H - Y(0.25)), 0.3);
    const vd = dp.ctx.createLinearGradient(0, Y(0.25), 0, H);
    vd.addColorStop(0, 'rgb(100,100,100)');
    vd.addColorStop(1, 'rgb(20,20,20)');
    dp.ctx.fillStyle = vd;
    dp.ctx.fillRect(0, Y(0.25), W, H - Y(0.25));
  }

  // The straight road, from us to the tunnel in the mountain's foot.
  const portal = [0.64 * W, Y(0.28)];
  {
    const near = [[0.74 * W, H + 10 * S], [1.0 * W, H + 10 * S]];
    g.fillStyle = 'rgb(54,46,52)';
    g.beginPath();
    g.moveTo(near[0][0], near[0][1]);
    g.lineTo(portal[0] - 14 * S, portal[1] + 6 * S);
    g.lineTo(portal[0] + 14 * S, portal[1] + 6 * S);
    g.lineTo(near[1][0], near[1][1]);
    g.closePath();
    g.fill();
    dp.paint((d) => { d.beginPath(); d.moveTo(near[0][0], near[0][1]); d.lineTo(portal[0], portal[1]); d.lineTo(near[1][0], near[1][1]); d.fill(); }, 0.22);
    // the centre line
    g.strokeStyle = 'rgba(255,214,140,0.55)';
    g.setLineDash([16 * S, 18 * S]);
    g.lineWidth = 2 * S;
    g.beginPath();
    g.moveTo((near[0][0] + near[1][0]) / 2, H);
    g.lineTo(portal[0], portal[1] + 6 * S);
    g.stroke();
    g.setLineDash([]);
    // light trails of cars streaming in (red) and out (white)
    L.glow(g, W, H, (c) => {
      for (const [ox, col, w] of [[-0.35, 'rgba(255,60,40,0.9)', 3], [-0.22, 'rgba(255,80,50,0.8)', 2.2], [0.25, 'rgba(255,244,214,0.9)', 3], [0.38, 'rgba(255,230,190,0.75)', 2.2]]) {
        c.strokeStyle = col;
        c.lineWidth = w * S;
        c.beginPath();
        const bx = (near[0][0] + near[1][0]) / 2 + ox * (near[1][0] - near[0][0]);
        c.moveTo(bx, H);
        c.lineTo(portal[0] + ox * 24 * S, portal[1] + 4 * S);
        c.stroke();
      }
    }, { blur: [3 * S, 12 * S, 30 * S], strength: [0.9, 0.6, 0.4], sharp: 1 });
  }
  // The portal: a stone arch, lit warm inside.
  {
    const pw = 46 * S, ph = 40 * S;
    g.fillStyle = 'rgb(120,96,86)';
    g.beginPath();
    g.moveTo(portal[0] - pw, portal[1] + 6 * S);
    g.lineTo(portal[0] - pw, portal[1] - ph * 0.5);
    g.arc(portal[0], portal[1] - ph * 0.5, pw, Math.PI, 0);
    g.lineTo(portal[0] + pw, portal[1] + 6 * S);
    g.closePath();
    g.fill();
    const inside = (c) => {
      c.fillStyle = 'rgba(255,196,110,1)';
      c.beginPath();
      c.moveTo(portal[0] - pw * 0.72, portal[1] + 6 * S);
      c.lineTo(portal[0] - pw * 0.72, portal[1] - ph * 0.5);
      c.arc(portal[0], portal[1] - ph * 0.5, pw * 0.72, Math.PI, 0);
      c.lineTo(portal[0] + pw * 0.72, portal[1] + 6 * S);
      c.closePath();
      c.fill();
    };
    L.glow(g, W, H, inside, { blur: [6 * S, 24 * S, 70 * S], strength: [0.9, 0.6, 0.45], sharp: 1 });
    g.fillStyle = 'rgba(160,100,50,0.6)';
    g.beginPath();
    g.ellipse(portal[0], portal[1] - ph * 0.15, pw * 0.3, ph * 0.3, 0, 0, TAU);
    g.fill();
    dp.paint((d) => d.fillRect(portal[0] - pw, portal[1] - ph * 1.5, pw * 2, ph * 1.6), 0.38);
  }

  // Pines in front, dark, rim-lit on the sun side.
  const pine = (c, x, base, h, seed) => {
    const RR = L.rng(seed);
    const w = h * 0.3;
    c.beginPath();
    c.moveTo(x, base - h);
    const tiers = 9;
    for (let k = 1; k <= tiers; k++) {
      const t = k / tiers;
      const tw = w * (0.12 + 0.88 * t) * (0.8 + 0.4 * RR());
      c.lineTo(x + tw * 0.5, base - h + h * t * 0.94 + h * 0.012);
      c.lineTo(x + tw * 0.22, base - h + h * t * 0.94 - h * 0.025);
    }
    c.lineTo(x + w * 0.04, base);
    c.lineTo(x - w * 0.04, base);
    for (let k = tiers; k >= 1; k--) {
      const t = k / tiers;
      const tw = w * (0.12 + 0.88 * t) * (0.8 + 0.4 * RR());
      c.lineTo(x - tw * 0.22, base - h + h * t * 0.94 - h * 0.025);
      c.lineTo(x - tw * 0.5, base - h + h * t * 0.94 + h * 0.012);
    }
    c.closePath();
  };
  const trees = [];
  for (let i = 0; i < 26; i++) {
    const x = R() < 0.7 ? R() * 0.5 * W : (0.86 + R() * 0.16) * W;
    trees.push([x, H + (R() * 40) * S, (0.16 + 0.24 * R()) * H]);
  }
  trees.sort((a, b) => a[2] - b[2]);
  for (const [x, base, h] of trees) {
    const seed = Math.round(x * 7 + h);
    pine(g, x, base, h, seed);
    const tg = g.createLinearGradient(x - h * 0.17, 0, x + h * 0.17, 0);
    tg.addColorStop(0, 'rgb(70,46,30)');
    tg.addColorStop(0.35, 'rgb(18,14,16)');
    tg.addColorStop(1, 'rgb(10,8,12)');
    g.fillStyle = tg;
    g.fill();
    dp.paint((d) => { pine(d, x, base, h, seed); d.fill(); }, 0.1);
  }
  // light haze in the air, toward the sun
  const hz = g.createRadialGradient(SUN[0] * W, Y(SUN[1]), 0, SUN[0] * W, Y(SUN[1]), W * 0.6);
  hz.addColorStop(0, 'rgba(255,200,140,0.22)');
  hz.addColorStop(1, 'rgba(255,200,140,0)');
  g.save();
  g.globalCompositeOperation = 'screen';
  g.fillStyle = hz;
  g.fillRect(0, 0, W, H);
  g.restore();
  L.finish(g, W, H, { grain: 0.05, vignette: 0.36, vigColor: [0.06, 0.03, 0.02] });
  return { color, depth: dp, depthBlur: 0.005 };
}
