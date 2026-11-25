// Stock Dashboard: a city at pink dusk across a river. The rooftops of its
// skyline rise and fall like a price chart, a fine line of light traced along
// them to the last price; windows are lit, and the river holds it all.
export default async function ({ L, W, H }) {
  const S = W / 1600;
  const R = L.rng(73);
  const out = L.canvas(W, H);
  const g = out.ctx;
  const dp = L.depthLayer(W, H, 1);
  const TAU = Math.PI * 2;
  const SHORE = 0.7 * H;
  const pink = [1, 0.35, 0.63];

  // Sky: navy above, through violet to hot pink and coral at the horizon.
  {
    const sg = g.createLinearGradient(0, 0, 0, SHORE);
    sg.addColorStop(0, 'rgb(14,16,40)');
    sg.addColorStop(0.35, 'rgb(62,36,92)');
    sg.addColorStop(0.7, 'rgb(214,74,128)');
    sg.addColorStop(1, 'rgb(255,150,118)');
    g.fillStyle = sg;
    g.fillRect(0, 0, W, SHORE);
    const sun = g.createRadialGradient(0.72 * W, SHORE, 0, 0.72 * W, SHORE, 0.5 * W);
    sun.addColorStop(0, 'rgba(255,200,150,0.75)');
    sun.addColorStop(0.3, 'rgba(255,120,130,0.25)');
    sun.addColorStop(1, 'rgba(255,120,130,0)');
    g.fillStyle = sun;
    g.fillRect(0, 0, W, SHORE);
    // long thin clouds, lit from below
    g.save();
    g.filter = `blur(${8 * S}px)`;
    for (let i = 0; i < 7; i++) {
      const y = (0.16 + 0.3 * R()) * H, x = R() * W, w = (220 + 380 * R()) * S, h = (12 + 18 * R()) * S;
      const cg = g.createLinearGradient(0, y - h, 0, y + h);
      cg.addColorStop(0, 'rgba(120,50,110,0)');
      cg.addColorStop(0.5, `rgba(255,${130 + 60 * R()},${150},${0.25 + 0.25 * R()})`);
      cg.addColorStop(1, 'rgba(120,50,110,0)');
      g.fillStyle = cg;
      g.beginPath();
      g.ellipse(x, y, w, h, 0, 0, TAU);
      g.fill();
    }
    g.restore();
    // the sun, sinking behind the city
    const sx = 0.885 * W, sy = SHORE - 0.085 * H;
    const sd = g.createRadialGradient(sx, sy, 0, sx, sy, 0.07 * H);
    sd.addColorStop(0, 'rgba(255,236,200,1)');
    sd.addColorStop(0.85, 'rgba(255,180,150,0.95)');
    sd.addColorStop(1, 'rgba(255,150,140,0)');
    g.fillStyle = sd;
    g.beginPath();
    g.arc(sx, sy, 0.07 * H, 0, TAU);
    g.fill();
    // the first stars, high up
    for (let i = 0; i < 120; i++) {
      const x = R() * W, y = Math.pow(R(), 2) * 0.35 * H;
      g.fillStyle = `rgba(255,240,250,${0.3 + 0.6 * R()})`;
      g.beginPath();
      g.arc(x, y, (0.5 + R()) * S, 0, TAU);
      g.fill();
    }
  }

  // A far skyline, hazy pink.
  const lit = L.canvas(W, H); // lit windows, for the river
  {
    let x = -10 * S;
    while (x < W) {
      const w = (24 + 50 * R()) * S, h = (40 + 120 * R()) * S;
      g.fillStyle = 'rgba(150,70,120,0.85)';
      g.fillRect(x, SHORE - h, w, h);
      x += w + R() * 6 * S;
    }
    dp.paint((d) => d.fillRect(0, SHORE - 160 * S, W, 160 * S), 0.9);
  }

  // The main skyline: towers of varied widths with gaps between, their
  // heights set by a price series that climbs, dips, recovers and climbs.
  const N = 24;
  const prices = [];
  let v = 0.3;
  for (let i = 0; i < N; i++) {
    const t = i / (N - 1);
    const trend = 0.26 + 0.42 * t - 0.14 * Math.exp(-(((t - 0.55) / 0.1) ** 2));
    v += (trend - v) * 0.4 + (R() - 0.5) * 0.08;
    prices.push(Math.max(0.12, v));
  }
  const tops = [];
  {
    let x = 0.01 * W;
    for (let i = 0; i < N; i++) {
      const w = (0.8 * W / N) * (0.45 + 0.75 * R());
      const h = prices[i] * SHORE * 0.62;
      const top = SHORE - h;
      tops.push([x + w / 2, top]);
      const tower = (c) => {
        c.beginPath();
        // a setback near the top on some
        if (R() < 0.45 && h > 120 * S) {
          const sb = w * 0.18, sh = h * 0.12;
          c.moveTo(x, SHORE);
          c.lineTo(x, top + sh);
          c.lineTo(x + sb, top + sh);
          c.lineTo(x + sb, top);
          c.lineTo(x + w - sb, top);
          c.lineTo(x + w - sb, top + sh);
          c.lineTo(x + w, top + sh);
          c.lineTo(x + w, SHORE);
        } else {
          c.rect(x, top, w, h);
        }
        c.closePath();
      };
      const bg = g.createLinearGradient(x, 0, x + w, 0);
      bg.addColorStop(0, 'rgb(24,22,50)');
      bg.addColorStop(0.75, 'rgb(14,14,34)');
      bg.addColorStop(1, 'rgb(46,28,62)');
      g.fillStyle = bg;
      tower(g);
      g.fill();
      g.fillStyle = 'rgba(255,130,160,0.4)';
      g.fillRect(x + w - 2 * S, top, 2 * S, h);
      const cols = Math.max(2, Math.floor(w / (10 * S)));
      for (let fy = top + 10 * S; fy < SHORE - 6 * S; fy += 12 * S) {
        for (let c = 0; c < cols; c++) {
          if (R() < 0.68) continue;
          const wx = x + 5 * S + c * ((w - 10 * S) / cols);
          const col = R() < 0.75 ? 'rgba(255,214,170,0.85)' : 'rgba(255,150,200,0.85)';
          g.fillStyle = col;
          g.fillRect(wx, fy, 4 * S, 5 * S);
          lit.ctx.fillStyle = col;
          lit.ctx.fillRect(wx, fy, 4 * S, 5 * S);
        }
      }
      if (R() < 0.3) {
        g.strokeStyle = 'rgb(20,20,40)';
        g.lineWidth = 2 * S;
        g.beginPath();
        g.moveTo(x + w / 2, top);
        g.lineTo(x + w / 2, top - 34 * S);
        g.stroke();
        const ax = x + w / 2, ay = top - 34 * S;
        const blink = (c) => { c.fillStyle = 'rgba(255,60,90,1)'; c.beginPath(); c.arc(ax, ay, 2.2 * S, 0, TAU); c.fill(); };
        L.glow(g, W, H, blink, { blur: [3 * S, 10 * S], strength: [0.9, 0.5], sharp: 1 });
        blink(lit.ctx);
      }
      dp.paint((d) => { tower(d); d.fill(); }, 0.62);
      x += w + (R() < 0.5 ? (3 + 12 * R()) * S : 0);
    }
  }
  // A nearer row of low buildings and trees along the embankment.
  {
    let x = -10 * S;
    while (x < W) {
      const w = (30 + 90 * R()) * S, h = (18 + 50 * R()) * S;
      g.fillStyle = 'rgb(10,10,24)';
      g.fillRect(x, SHORE - h, w, h);
      for (let k = 0; k < w / (12 * S); k++) {
        if (R() < 0.6) continue;
        const col = 'rgba(255,200,150,0.8)';
        g.fillStyle = col;
        g.fillRect(x + 4 * S + k * 12 * S, SHORE - h + 6 * S + R() * (h - 14 * S), 5 * S, 4 * S);
        lit.ctx.fillStyle = col;
        lit.ctx.fillRect(x + 4 * S + k * 12 * S, SHORE - h + 8 * S, 5 * S, 4 * S);
      }
      dp.paint((d) => d.fillRect(x, SHORE - h, w, h), 0.5);
      x += w + R() * 30 * S;
      // a clump of trees
      if (R() < 0.5) {
        const tx = x - 10 * S, tr = (8 + 10 * R()) * S;
        g.fillStyle = 'rgb(8,8,20)';
        g.beginPath();
        g.arc(tx, SHORE - tr, tr, 0, TAU);
        g.arc(tx + tr, SHORE - tr * 0.8, tr * 0.8, 0, TAU);
        g.fill();
      }
    }
  }
  // The chart line along the rooftops, and its last price.
  const chart = (c) => {
    c.strokeStyle = L.css(pink, 0.95);
    c.lineWidth = 2.4 * S;
    c.lineJoin = 'round';
    c.beginPath();
    tops.forEach(([x, y], i) => (i ? c.lineTo(x, y - 6 * S) : c.moveTo(x, y - 6 * S)));
    c.stroke();
    const [lx, ly] = tops[tops.length - 1];
    c.fillStyle = 'rgba(255,240,250,1)';
    c.beginPath();
    c.arc(lx, ly - 6 * S, 5 * S, 0, TAU);
    c.fill();
  };
  L.glow(g, W, H, chart, { blur: [3 * S, 14 * S, 40 * S], strength: [0.9, 0.6, 0.4], sharp: 1 });
  chart(lit.ctx);
  // under the line, a faint wash of light, as a chart's area fill
  {
    g.save();
    g.beginPath();
    tops.forEach(([x, y], i) => (i ? g.lineTo(x, y - 6 * S) : g.moveTo(x, y - 6 * S)));
    g.lineTo(W, SHORE);
    g.lineTo(0, SHORE);
    g.closePath();
    const ag = g.createLinearGradient(0, SHORE * 0.4, 0, SHORE);
    ag.addColorStop(0, 'rgba(255,90,160,0.16)');
    ag.addColorStop(1, 'rgba(255,90,160,0)');
    g.globalCompositeOperation = 'screen';
    g.fillStyle = ag;
    g.fill();
    g.restore();
  }

  // The river: the city again, upside down, broken by the current.
  {
    const snap = L.canvas(W, H);
    snap.ctx.drawImage(out.c, 0, 0);
    const wg = g.createLinearGradient(0, SHORE, 0, H);
    wg.addColorStop(0, 'rgb(40,20,50)');
    wg.addColorStop(1, 'rgb(8,8,20)');
    g.fillStyle = wg;
    g.fillRect(0, SHORE, W, H - SHORE);
    const slice = 2 * S;
    for (let y = SHORE; y < H; y += slice) {
      const src = 2 * SHORE - y;
      if (src < 0) break;
      const k = (y - SHORE) / (H - SHORE);
      const off = Math.sin(y * 0.18 / S) * (0.5 + 2 * k) * S + Math.sin(y * 0.045 / S + 1) * 4 * k * S;
      g.globalAlpha = 0.6 - 0.25 * k;
      g.drawImage(snap.c, 0, src, W, slice, off, y, W, slice);
    }
    g.globalAlpha = 1;
    // lit windows and the line, stretched into streaks
    const mir = L.canvas(W, H);
    mir.ctx.save();
    mir.ctx.translate(0, 2 * SHORE);
    mir.ctx.scale(1, -1);
    mir.ctx.drawImage(lit.c, 0, 0);
    mir.ctx.restore();
    const sq = L.canvas(W, Math.round(H / 5));
    sq.ctx.filter = `blur(${2 * S}px)`;
    sq.ctx.drawImage(mir.c, 0, 0, W, sq.c.height);
    g.save();
    g.beginPath();
    g.rect(0, SHORE, W, H - SHORE);
    g.clip();
    g.globalCompositeOperation = 'lighter';
    g.globalAlpha = 0.45;
    g.drawImage(sq.c, 0, 0, W, H);
    g.restore();
    // the shore: a dark embankment line
    g.fillStyle = 'rgb(10,10,24)';
    g.fillRect(0, SHORE - 3 * S, W, 6 * S);
    const rd = dp.ctx.createLinearGradient(0, SHORE, 0, H);
    rd.addColorStop(0, 'rgb(150,150,150)');
    rd.addColorStop(1, 'rgb(20,20,20)');
    dp.ctx.fillStyle = rd;
    dp.ctx.fillRect(0, SHORE, W, H - SHORE);
  }
  L.finish(g, W, H, { grain: 0.05, vignette: 0.42, vigColor: [0.02, 0.01, 0.05] });
  return { color: out, depth: dp, depthBlur: 0.005 };
}
