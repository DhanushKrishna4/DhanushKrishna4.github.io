// Escapement: inside a watch, close up, in warm light. The balance wheel and
// its blued hairspring, the escape wheel and pallet fork, gold wheels with
// ruby jewels and blued screws, over a rhodium plate finished with Geneva
// stripes. Shallow focus; warm glints out of focus behind.
export default async function ({ L, W, H }) {
  const S = W / 1600;
  const R = L.rng(77);
  const out = L.canvas(W, H);
  const g = out.ctx;
  const dp = L.depthLayer(W, H, 1);
  const TAU = Math.PI * 2;
  const gold = { base: [0.84, 0.62, 0.24], hi: [1.0, 0.92, 0.66], lo: [0.3, 0.19, 0.06] };
  const rose = { base: [0.86, 0.56, 0.36], hi: [1.0, 0.86, 0.72], lo: [0.32, 0.16, 0.08] };
  const steel = { base: [0.62, 0.64, 0.68], hi: [0.97, 0.98, 1.0], lo: [0.14, 0.15, 0.18] };

  // The plate: rhodium, Geneva stripes, lit warm from the upper left.
  {
    const p = L.canvas(W, H);
    const c = p.ctx;
    c.save();
    c.translate(W * 0.5, H * 0.5);
    c.rotate(-0.42);
    const band = 54 * S;
    for (let k = -30; k < 30; k++) {
      const gr = c.createLinearGradient(0, k * band, 0, (k + 1) * band);
      gr.addColorStop(0, 'rgb(40,41,46)');
      gr.addColorStop(0.55, 'rgb(78,79,86)');
      gr.addColorStop(1, 'rgb(36,37,42)');
      c.fillStyle = gr;
      c.fillRect(-W * 2, k * band, W * 4, band);
    }
    c.restore();
    const lg = c.createRadialGradient(W * 0.28, H * 0.18, 0, W * 0.28, H * 0.18, W * 0.95);
    lg.addColorStop(0, 'rgba(255,196,120,0.3)');
    lg.addColorStop(0.5, 'rgba(60,40,20,0.15)');
    lg.addColorStop(1, 'rgba(0,0,0,0.7)');
    c.fillStyle = lg;
    c.fillRect(0, 0, W, H);
    g.drawImage(p.c, 0, 0);
    dp.paint((d) => d.fillRect(0, 0, W, H), 0.75);
  }
  // The balance sits in a round recess with a polished chamfer.
  {
    const cx = W * 0.235, cy = H * 0.5, rr = 205 * S;
    const rg = g.createRadialGradient(cx - rr * 0.2, cy - rr * 0.25, rr * 0.2, cx, cy, rr);
    rg.addColorStop(0, 'rgb(62,62,68)');
    rg.addColorStop(1, 'rgb(24,24,28)');
    g.fillStyle = rg;
    g.beginPath();
    g.arc(cx, cy, rr, 0, TAU);
    g.fill();
    // circular graining inside
    g.save();
    g.beginPath();
    g.arc(cx, cy, rr, 0, TAU);
    g.clip();
    for (let k = 0; k < 140; k++) {
      const r0 = R() * rr;
      g.strokeStyle = `rgba(${R() < 0.5 ? '255,240,220' : '0,0,0'},${0.03 + 0.04 * R()})`;
      g.lineWidth = (0.8 + R()) * S;
      g.beginPath();
      g.arc(cx, cy, r0, 0, TAU);
      g.stroke();
    }
    g.restore();
    const ch = g.createConicGradient(-2.2, cx, cy);
    ch.addColorStop(0, 'rgba(255,236,200,0.95)');
    ch.addColorStop(0.25, 'rgba(120,110,100,0.6)');
    ch.addColorStop(0.5, 'rgba(20,20,24,0.9)');
    ch.addColorStop(0.75, 'rgba(120,110,100,0.6)');
    ch.addColorStop(1, 'rgba(255,236,200,0.95)');
    g.strokeStyle = ch;
    g.lineWidth = 7 * S;
    g.beginPath();
    g.arc(cx, cy, rr + 3 * S, 0, TAU);
    g.stroke();
    dp.paint((d) => { d.beginPath(); d.arc(cx, cy, rr, 0, TAU); d.fill(); }, 0.8);
  }
  // Warm glints far out of focus.
  L.motes(g, null, W, H, R, { n: 14, area: [0.6, 0.0, 1.0, 0.35], color: [1, 0.76, 0.42], size: [14, 34], nearShare: 0, alpha: 0.38 });

  const metal = (c, cx, cy, m, turn = 0) => {
    const cg = c.createConicGradient(turn, cx, cy);
    const stops = [[0, m.lo], [0.1, m.hi], [0.22, m.base], [0.36, m.lo], [0.5, m.base], [0.6, m.hi], [0.72, m.base], [0.86, m.lo], [1, m.lo]];
    for (const [t, col] of stops) cg.addColorStop(t, L.css(col));
    return cg;
  };
  const toothed = (c, cx, cy, r, teeth, tdepth) => {
    c.beginPath();
    for (let k = 0; k < teeth; k++) {
      const a0 = (k / teeth) * TAU, da = TAU / teeth;
      const ri = r - tdepth;
      const P = [[ri, a0], [ri, a0 + da * 0.22], [r, a0 + da * 0.34], [r, a0 + da * 0.62], [ri, a0 + da * 0.74]];
      P.forEach(([rr, a], j) => { const x = cx + Math.cos(a) * rr, y = cy + Math.sin(a) * rr; k === 0 && j === 0 ? c.moveTo(x, y) : c.lineTo(x, y); });
    }
    c.closePath();
  };
  // Windows between spokes of constant width.
  const windows = (c, cx, cy, r1, r0, spokes, sw, turn) => {
    c.beginPath();
    for (let k = 0; k < spokes; k++) {
      const a = turn + (k / spokes) * TAU, b = turn + ((k + 1) / spokes) * TAU;
      const d1 = Math.asin(Math.min(0.99, sw / r1)), d0 = Math.asin(Math.min(0.99, sw / r0));
      c.moveTo(cx + Math.cos(a + d1) * r1, cy + Math.sin(a + d1) * r1);
      c.arc(cx, cy, r1, a + d1, b - d1);
      c.arc(cx, cy, r0, b - d0, a + d0, true);
      c.closePath();
    }
  };
  const place = (lay, z, { blur = 0, shadow = 1 } = {}) => {
    g.save();
    g.shadowColor = `rgba(0,0,0,${0.62 * shadow})`;
    g.shadowBlur = 16 * S;
    g.shadowOffsetX = 9 * S * shadow;
    g.shadowOffsetY = 12 * S * shadow;
    if (blur) g.filter = `blur(${blur}px)`;
    g.drawImage(lay.c, 0, 0);
    g.restore();
    const dl = L.canvas(W, H);
    if (blur) dl.ctx.filter = `blur(${blur}px)`;
    dl.ctx.drawImage(lay.c, 0, 0);
    dl.ctx.filter = 'none';
    dl.ctx.globalCompositeOperation = 'source-in';
    const v = Math.round(z * 255);
    dl.ctx.fillStyle = `rgb(${v},${v},${v})`;
    dl.ctx.fillRect(0, 0, W, H);
    dp.ctx.drawImage(dl.c, 0, 0);
  };
  const jewel = (c, cx, cy, jr) => {
    const ch = c.createRadialGradient(cx - jr * 0.5, cy - jr * 0.5, 0, cx, cy, jr * 2);
    ch.addColorStop(0, L.css(gold.hi));
    ch.addColorStop(1, L.css(gold.lo));
    c.fillStyle = ch;
    c.beginPath();
    c.arc(cx, cy, jr * 1.85, 0, TAU);
    c.fill();
    const jg = c.createRadialGradient(cx - jr * 0.3, cy - jr * 0.35, 0, cx, cy, jr);
    jg.addColorStop(0, 'rgb(255,160,180)');
    jg.addColorStop(0.45, 'rgb(214,18,58)');
    jg.addColorStop(1, 'rgb(84,0,20)');
    c.fillStyle = jg;
    c.beginPath();
    c.arc(cx, cy, jr, 0, TAU);
    c.fill();
    c.fillStyle = 'rgba(255,255,255,0.9)';
    c.beginPath();
    c.arc(cx - jr * 0.32, cy - jr * 0.36, jr * 0.2, 0, TAU);
    c.fill();
    c.fillStyle = L.css(steel.hi);
    c.beginPath();
    c.arc(cx, cy, jr * 0.2, 0, TAU);
    c.fill();
  };
  const wheel = ({ cx, cy, r, teeth, m, spokes = 5, z, blur = 0, turn = 0, gem = true }) => {
    const lay = L.canvas(W, H);
    const c = lay.ctx;
    toothed(c, cx, cy, r, teeth, Math.max(3 * S, r * 0.055));
    c.fillStyle = metal(c, cx, cy, m, turn);
    c.fill();
    c.save();
    c.globalCompositeOperation = 'destination-out';
    windows(c, cx, cy, r * 0.8, r * 0.24, spokes, r * 0.05, turn);
    c.fill();
    c.restore();
    // polished bevels along the windows and the rim, lit from the upper left
    c.save();
    c.globalCompositeOperation = 'source-atop';
    const bv = c.createLinearGradient(cx - r, cy - r, cx + r, cy + r);
    bv.addColorStop(0, 'rgba(255,240,205,0.3)');
    bv.addColorStop(0.5, 'rgba(0,0,0,0)');
    bv.addColorStop(1, 'rgba(0,0,0,0.38)');
    c.fillStyle = bv;
    c.fillRect(cx - r * 1.2, cy - r * 1.2, r * 2.4, r * 2.4);
    for (let k = 0; k < 260; k++) {
      const a = R() * TAU;
      c.strokeStyle = `rgba(${R() < 0.5 ? '255,236,200' : '0,0,0'},${0.04 + 0.05 * R()})`;
      c.lineWidth = 0.6 * S;
      c.beginPath();
      c.moveTo(cx + Math.cos(a) * r * 0.26, cy + Math.sin(a) * r * 0.26);
      c.lineTo(cx + Math.cos(a) * r * 0.98, cy + Math.sin(a) * r * 0.98);
      c.stroke();
    }
    c.restore();
    c.save();
    c.lineWidth = 1.6 * S;
    c.strokeStyle = 'rgba(255,236,196,0.55)';
    windows(c, cx, cy, r * 0.8, r * 0.24, spokes, r * 0.05, turn);
    c.stroke();
    c.restore();
    // the pinion on the same arbor: a small steel gear of ten leaves
    const pr = r * 0.17;
    toothed(c, cx, cy, pr, 10, pr * 0.28);
    c.fillStyle = metal(c, cx, cy, steel, turn + 0.5);
    c.fill();
    c.strokeStyle = 'rgba(0,0,0,0.35)';
    c.lineWidth = 1 * S;
    c.stroke();
    if (gem) jewel(c, cx, cy, Math.max(5 * S, r * 0.075));
    place(lay, z, { blur });
  };
  const screw = (cx, cy, r, z) => {
    const lay = L.canvas(W, H);
    const c = lay.ctx;
    // polished steel collar, then the blued head with its slot
    const col = c.createRadialGradient(cx - r * 0.4, cy - r * 0.5, 0, cx, cy, r * 1.35);
    col.addColorStop(0, 'rgb(240,242,248)');
    col.addColorStop(1, 'rgb(60,62,70)');
    c.fillStyle = col;
    c.beginPath();
    c.arc(cx, cy, r * 1.3, 0, TAU);
    c.fill();
    const sg = c.createRadialGradient(cx - r * 0.35, cy - r * 0.4, 0, cx, cy, r);
    sg.addColorStop(0, 'rgb(130,180,255)');
    sg.addColorStop(0.5, 'rgb(30,62,170)');
    sg.addColorStop(1, 'rgb(8,16,64)');
    c.fillStyle = sg;
    c.beginPath();
    c.arc(cx, cy, r, 0, TAU);
    c.fill();
    c.save();
    c.translate(cx, cy);
    c.rotate(R() * Math.PI);
    c.fillStyle = 'rgba(4,8,30,0.92)';
    c.fillRect(-r * 0.9, -r * 0.13, r * 1.8, r * 0.26);
    c.restore();
    place(lay, z, { shadow: 0.5 });
  };

  // Back to front.
  wheel({ cx: W * 0.88, cy: H * 0.8, r: 340 * S, teeth: 100, m: gold, spokes: 5, z: 0.52, turn: 0.4, blur: 2.5 * S });
  wheel({ cx: W * 0.62, cy: H * 0.1, r: 200 * S, teeth: 72, m: rose, spokes: 4, z: 0.48, turn: 1.1, blur: 1.6 * S });
  wheel({ cx: W * 0.64, cy: H * 0.6, r: 125 * S, teeth: 54, m: gold, spokes: 5, z: 0.42, turn: 0.2 });
  // the escape wheel: steel, fifteen club-footed teeth, four spokes
  {
    const cx = W * 0.505, cy = H * 0.4, r = 92 * S;
    const lay = L.canvas(W, H);
    const c = lay.ctx;
    c.beginPath();
    for (let k = 0; k < 15; k++) {
      const a = (k / 15) * TAU;
      const P = [[r * 0.78, a], [r * 0.98, a + 0.1], [r, a + 0.2], [r * 0.93, a + 0.22], [r * 0.78, a + 0.38]];
      P.forEach(([rr, aa], j) => { const x = cx + Math.cos(aa) * rr, y = cy + Math.sin(aa) * rr; k === 0 && j === 0 ? c.moveTo(x, y) : c.lineTo(x, y); });
    }
    c.closePath();
    c.fillStyle = metal(c, cx, cy, steel, 0.7);
    c.fill();
    c.save();
    c.globalCompositeOperation = 'destination-out';
    windows(c, cx, cy, r * 0.68, r * 0.22, 4, r * 0.05, 0.3);
    c.fill();
    c.restore();
    jewel(c, cx, cy, 6.5 * S);
    place(lay, 0.37);
  }
  for (const [x, y, r] of [[0.77, 0.4, 17], [0.44, 0.8, 16], [0.93, 0.3, 15], [0.71, 0.93, 16]]) screw(W * x, H * y, r * S, 0.4);

  // The pallet fork, between the escape wheel and the balance.
  {
    const lay = L.canvas(W, H);
    const c = lay.ctx;
    c.translate(W * 0.405, H * 0.43);
    c.rotate(-0.22);
    const lg = c.createLinearGradient(0, -14 * S, 0, 14 * S);
    lg.addColorStop(0, L.css(steel.hi));
    lg.addColorStop(0.5, L.css(steel.base));
    lg.addColorStop(1, L.css(steel.lo));
    c.fillStyle = lg;
    c.beginPath();
    c.moveTo(-70 * S, -5 * S);
    c.lineTo(30 * S, -9 * S);
    c.lineTo(56 * S, -32 * S);
    c.lineTo(66 * S, -26 * S);
    c.lineTo(44 * S, 0);
    c.lineTo(66 * S, 26 * S);
    c.lineTo(56 * S, 32 * S);
    c.lineTo(30 * S, 9 * S);
    c.lineTo(-70 * S, 5 * S);
    c.closePath();
    c.fill();
    for (const sy of [-29, 29]) {
      const jg = c.createLinearGradient(58 * S, (sy - 4) * S, 70 * S, (sy + 4) * S);
      jg.addColorStop(0, 'rgb(255,130,150)');
      jg.addColorStop(1, 'rgb(120,0,26)');
      c.fillStyle = jg;
      c.fillRect(60 * S, (sy - 4) * S, 11 * S, 8 * S);
    }
    c.fillStyle = L.css(gold.base);
    c.beginPath();
    c.arc(-6 * S, 0, 7 * S, 0, TAU);
    c.fill();
    place(lay, 0.36, { shadow: 0.7 });
  }

  // The balance wheel and its hairspring, in sharp focus.
  {
    const cx = W * 0.235, cy = H * 0.5, r = 180 * S;
    const lay = L.canvas(W, H);
    const c = lay.ctx;
    c.beginPath();
    c.arc(cx, cy, r, 0, TAU);
    c.arc(cx, cy, r * 0.87, 0, TAU, true);
    c.fillStyle = metal(c, cx, cy, gold, 0.3);
    c.fill('evenodd');
    c.save();
    c.translate(cx, cy);
    c.rotate(0.5);
    const ag = c.createLinearGradient(0, -r * 0.05, 0, r * 0.05);
    ag.addColorStop(0, L.css(gold.hi));
    ag.addColorStop(1, L.css(gold.lo));
    c.fillStyle = ag;
    c.fillRect(-r * 0.89, -r * 0.045, r * 1.78, r * 0.09);
    c.restore();
    for (let k = 0; k < 16; k++) {
      const a = (k / 16) * TAU + 0.1;
      const sx = cx + Math.cos(a) * r * 0.99, sy = cy + Math.sin(a) * r * 0.99;
      const sg = c.createRadialGradient(sx - 3 * S, sy - 3 * S, 0, sx, sy, 9 * S);
      sg.addColorStop(0, L.css(gold.hi));
      sg.addColorStop(1, L.css(gold.lo));
      c.fillStyle = sg;
      c.beginPath();
      c.arc(sx, sy, 8 * S, 0, TAU);
      c.fill();
    }
    // the hairspring: a fine blued spiral, with its outer curve
    c.save();
    c.lineWidth = 1.2 * S;
    const turns = 9;
    for (let k = 1; k <= turns * 160; k++) {
      const t0 = (k - 1) / 160, t1 = k / 160;
      const pt = (t) => { const a = t * TAU + 0.4; const rr = r * (0.12 + 0.52 * (t / turns)); return [cx + Math.cos(a) * rr, cy + Math.sin(a) * rr]; };
      const [x0, y0] = pt(t0), [x1, y1] = pt(t1);
      const lit = 0.5 + 0.5 * Math.cos(Math.atan2(y1 - cy, x1 - cx) + 2.3);
      c.strokeStyle = `rgba(${Math.round(90 + 150 * lit)},${Math.round(120 + 120 * lit)},${Math.round(220 + 35 * lit)},0.95)`;
      c.beginPath();
      c.moveTo(x0, y0);
      c.lineTo(x1, y1);
      c.stroke();
    }
    c.restore();
    c.fillStyle = L.css(gold.base);
    c.beginPath();
    c.arc(cx, cy, 20 * S, 0, TAU);
    c.fill();
    jewel(c, cx, cy, 11 * S);
    place(lay, 0.33, { shadow: 1.2 });
  }

  // The balance cock: a bridge reaching in from the left edge over the
  // balance, its edges polished, holding the cap jewel over the staff.
  {
    const cx = W * 0.235, cy = H * 0.5;
    const lay = L.canvas(W, H);
    const c = lay.ctx;
    const path = () => {
      c.beginPath();
      c.moveTo(-20 * S, cy - 150 * S);
      c.bezierCurveTo(W * 0.07, cy - 120 * S, cx - 120 * S, cy - 60 * S, cx - 30 * S, cy - 34 * S);
      c.arc(cx, cy, 36 * S, -2.2, 2.2);
      c.bezierCurveTo(cx - 120 * S, cy + 40 * S, W * 0.07, cy - 10 * S, -20 * S, cy + 10 * S);
      c.closePath();
    };
    path();
    const bg = c.createLinearGradient(0, cy - 150 * S, cx, cy + 40 * S);
    bg.addColorStop(0, 'rgb(150,150,158)');
    bg.addColorStop(0.5, 'rgb(96,97,104)');
    bg.addColorStop(1, 'rgb(58,58,64)');
    c.fillStyle = bg;
    c.fill();
    // straight graining along the bridge
    c.save();
    c.clip();
    for (let k = 0; k < 160; k++) {
      const y = cy - 160 * S + R() * 220 * S;
      c.strokeStyle = `rgba(${R() < 0.5 ? '255,255,255' : '0,0,0'},${0.03 + 0.04 * R()})`;
      c.lineWidth = (0.8 + R()) * S;
      c.beginPath();
      c.moveTo(0, y);
      c.lineTo(cx + 40 * S, y + 60 * S);
      c.stroke();
    }
    c.restore();
    // polished bevel along its edge
    path();
    const eg = c.createLinearGradient(0, cy - 160 * S, cx, cy + 40 * S);
    eg.addColorStop(0, 'rgba(255,244,222,0.95)');
    eg.addColorStop(1, 'rgba(120,110,100,0.7)');
    c.strokeStyle = eg;
    c.lineWidth = 4 * S;
    c.stroke();
    jewel(c, cx, cy, 13 * S);
    // its two screws
    for (const [sx, sy] of [[W * 0.045, cy - 70 * S], [W * 0.095, cy - 40 * S]]) {
      const sg = c.createRadialGradient(sx - 5 * S, sy - 6 * S, 0, sx, sy, 15 * S);
      sg.addColorStop(0, 'rgb(130,180,255)');
      sg.addColorStop(0.5, 'rgb(30,62,170)');
      sg.addColorStop(1, 'rgb(8,16,64)');
      c.fillStyle = sg;
      c.beginPath();
      c.arc(sx, sy, 15 * S, 0, TAU);
      c.fill();
      c.fillStyle = 'rgba(4,8,30,0.92)';
      c.save();
      c.translate(sx, sy);
      c.rotate(0.6 + R());
      c.fillRect(-13 * S, -2 * S, 26 * S, 4 * S);
      c.restore();
    }
    place(lay, 0.28, { shadow: 1.3 });
  }
  // A big wheel up close, out of focus, across the lower left corner.
  wheel({ cx: W * 0.03, cy: H * 1.1, r: 310 * S, teeth: 84, m: gold, spokes: 6, z: 0.06, turn: 0.9, blur: 16 * S, gem: false });

  const lg = g.createRadialGradient(W * 0.25, H * 0.15, 0, W * 0.25, H * 0.15, W * 0.7);
  lg.addColorStop(0, 'rgba(255,196,120,0.14)');
  lg.addColorStop(1, 'rgba(255,196,120,0)');
  g.save();
  g.globalCompositeOperation = 'screen';
  g.fillStyle = lg;
  g.fillRect(0, 0, W, H);
  g.restore();
  L.finish(g, W, H, { grain: 0.05, vignette: 0.55, vigColor: [0.03, 0.015, 0.0] });
  return { color: out, depth: dp, depthBlur: 0.006 };
}
