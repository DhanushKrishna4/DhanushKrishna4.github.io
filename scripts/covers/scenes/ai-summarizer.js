// AI Summarizer: a library at night. On the desk an open book; its pages
// lift away one by one, drift up in a stream and gather into three glowing
// lights. Shelves of books stand out of focus behind, under a warm lamp.
export default async function ({ L, W, H }) {
  const S = W / 1600;
  const R = L.rng(91);
  const out = L.canvas(W, H);
  const g = out.ctx;
  const dp = L.depthLayer(W, H, 0.92);
  const TAU = Math.PI * 2;

  // The shelves behind: rows of spines, drawn sharp, then thrown out of focus.
  {
    const sh = L.canvas(W, H);
    const c = sh.ctx;
    c.fillStyle = 'rgb(18,12,30)';
    c.fillRect(0, 0, W, H);
    const rowH = 0.2 * H;
    const spines = [[64, 40, 110], [110, 44, 70], [40, 70, 96], [150, 120, 90], [86, 60, 140], [120, 84, 50], [50, 40, 74], [170, 150, 130], [96, 30, 50]];
    for (let row = 0; row < 6; row++) {
      const yb = 0.02 * H + (row + 1) * rowH;
      let x = -20 * S;
      while (x < W + 20 * S) {
        const w = (14 + 26 * R()) * S;
        const h = rowH * (0.62 + 0.3 * R());
        const col = spines[Math.floor(R() * spines.length)];
        const k = 0.6 + 0.5 * R();
        c.fillStyle = `rgb(${Math.round(col[0] * k)},${Math.round(col[1] * k)},${Math.round(col[2] * k)})`;
        const lean = R() < 0.08 ? (R() - 0.5) * 0.25 : 0;
        c.save();
        c.translate(x + w / 2, yb);
        c.rotate(lean);
        c.fillRect(-w / 2, -h, w, h);
        // gold bands on the spine
        c.fillStyle = 'rgba(220,180,110,0.55)';
        c.fillRect(-w / 2, -h * 0.85, w, 2 * S);
        c.fillRect(-w / 2, -h * 0.18, w, 2 * S);
        c.restore();
        x += w + 1.5 * S;
        if (R() < 0.05) x += 30 * S;
      }
      // the shelf board
      c.fillStyle = 'rgb(40,24,30)';
      c.fillRect(0, yb, W, 0.02 * H);
      c.fillStyle = 'rgba(255,200,140,0.12)';
      c.fillRect(0, yb, W, 2 * S);
    }
    // the lamp's warm light on the shelves, upper left; the rest in blue dark
    const lg = c.createRadialGradient(W * 0.18, H * 0.3, 0, W * 0.18, H * 0.3, W * 0.75);
    lg.addColorStop(0, 'rgba(255,180,110,0.35)');
    lg.addColorStop(0.5, 'rgba(60,40,90,0.15)');
    lg.addColorStop(1, 'rgba(6,4,16,0.75)');
    c.fillStyle = lg;
    c.fillRect(0, 0, W, H);
    g.filter = `blur(${11 * S}px)`;
    g.drawImage(sh.c, 0, 0);
    g.filter = 'none';
  }
  // Out-of-focus glints from the lamp, far behind.
  L.motes(g, null, W, H, R, { n: 16, area: [0.0, 0.05, 0.45, 0.6], color: [1, 0.78, 0.5], size: [12, 30], nearShare: 0, alpha: 0.35 });

  // The desk: dark wood, lit warm toward the lamp.
  const DESK = 0.74 * H;
  {
    const dg = g.createLinearGradient(0, DESK, 0, H);
    dg.addColorStop(0, 'rgb(58,34,30)');
    dg.addColorStop(1, 'rgb(20,12,16)');
    g.fillStyle = dg;
    g.fillRect(0, DESK, W, H - DESK);
    const lg = g.createRadialGradient(W * 0.3, DESK, 0, W * 0.3, DESK, W * 0.6);
    lg.addColorStop(0, 'rgba(255,180,110,0.22)');
    lg.addColorStop(1, 'rgba(255,180,110,0)');
    g.fillStyle = lg;
    g.fillRect(0, DESK, W, H - DESK);
    for (let k = 0; k < 60; k++) {
      g.strokeStyle = `rgba(${R() < 0.5 ? '255,200,150' : '0,0,0'},${0.04 + 0.05 * R()})`;
      g.lineWidth = (0.8 + R() * 1.5) * S;
      const y = DESK + R() * (H - DESK);
      g.beginPath();
      g.moveTo(0, y);
      g.lineTo(W, y + (R() - 0.5) * 10 * S);
      g.stroke();
    }
    dp.paint((d) => d.fillRect(0, DESK, W, H - DESK), 0.32);
    const dg2 = dp.ctx.createLinearGradient(0, DESK, 0, H);
    dg2.addColorStop(0, 'rgb(90,90,90)');
    dg2.addColorStop(1, 'rgb(20,20,20)');
    dp.ctx.fillStyle = dg2;
    dp.ctx.fillRect(0, DESK, W, H - DESK);
  }

  // The open book, its pages curving up from the spine.
  const bx = 0.5 * W, by = 0.82 * H, bw = 0.3 * W, bh = 0.13 * H;
  {
    const page = (side) => {
      g.beginPath();
      g.moveTo(bx, by + bh * 0.08);
      g.bezierCurveTo(bx + side * bw * 0.15, by - bh * 0.25, bx + side * bw * 0.35, by - bh * 0.12, bx + side * bw * 0.5, by - bh * 0.2);
      g.lineTo(bx + side * bw * 0.54, by + bh * 0.55);
      g.bezierCurveTo(bx + side * bw * 0.35, by + bh * 0.5, bx + side * bw * 0.12, by + bh * 0.4, bx, by + bh * 0.62);
      g.closePath();
    };
    // the block of pages beneath, and the cover
    g.fillStyle = 'rgb(60,30,50)';
    g.beginPath();
    g.ellipse(bx, by + bh * 0.62, bw * 0.58, bh * 0.14, 0, 0, TAU);
    g.fill();
    for (const side of [-1, 1]) {
      for (let k = 6; k >= 0; k--) {
        g.save();
        g.translate(0, k * 1.6 * S);
        page(side);
        g.fillStyle = k ? 'rgb(196,180,160)' : 'rgb(240,230,214)';
        g.fill();
        g.restore();
      }
      // faint lines of text
      g.save();
      page(side);
      g.clip();
      g.strokeStyle = 'rgba(80,60,70,0.28)';
      g.lineWidth = 1.2 * S;
      for (let l = 0; l < 9; l++) {
        const t = 0.15 + l * 0.08;
        g.beginPath();
        g.moveTo(bx + side * bw * 0.08, by - bh * 0.05 + bh * t * 0.9);
        g.lineTo(bx + side * bw * 0.46, by - bh * 0.12 + bh * t * 0.95);
        g.stroke();
      }
      g.restore();
      // the light of the gathering pages above falls on the pages
      g.save();
      page(side);
      g.clip();
      const lg = g.createRadialGradient(bx, by - bh * 2, 0, bx, by - bh * 2, bw * 0.8);
      lg.addColorStop(0, 'rgba(200,170,255,0.35)');
      lg.addColorStop(1, 'rgba(200,170,255,0)');
      g.fillStyle = lg;
      g.fillRect(0, 0, W, H);
      g.restore();
    }
    // shadow in the gutter
    const gg = g.createLinearGradient(bx - bw * 0.06, 0, bx + bw * 0.06, 0);
    gg.addColorStop(0, 'rgba(40,20,30,0)');
    gg.addColorStop(0.5, 'rgba(40,20,30,0.45)');
    gg.addColorStop(1, 'rgba(40,20,30,0)');
    g.fillStyle = gg;
    g.fillRect(bx - bw * 0.06, by - bh * 0.3, bw * 0.12, bh * 0.95);
    dp.paint((d) => { d.beginPath(); d.ellipse(bx, by + bh * 0.2, bw * 0.58, bh * 0.6, 0, 0, TAU); d.fill(); }, 0.24);
  }

  // Pages in flight: lifting from the book, rising in a curve, getting
  // smaller and brighter, until they dissolve into the three lights.
  const orbs = [[0.3 * W, 0.3 * H], [0.5 * W, 0.2 * H], [0.7 * W, 0.3 * H]];
  const pages = [];
  for (let i = 0; i < 20; i++) {
    const t = 0.1 + 0.78 * (i / 19) + (R() - 0.5) * 0.04;
    const o = orbs[i % 3];
    // a curve from the book up to its light
    const p0 = [bx + (R() - 0.5) * bw * 0.4, by - bh * 0.3];
    const p1 = [bx + (o[0] - bx) * 0.2 + (R() - 0.5) * 120 * S, by - (by - o[1]) * 0.55];
    const u = t;
    const x = (1 - u) * (1 - u) * p0[0] + 2 * (1 - u) * u * p1[0] + u * u * o[0];
    const y = (1 - u) * (1 - u) * p0[1] + 2 * (1 - u) * u * p1[1] + u * u * o[1];
    pages.push({ x, y, t, rot: (R() - 0.5) * 1.6, curl: R(), o });
  }
  for (const p of pages) {
    if (p.t > 0.9) continue;
    const w = (58 - 40 * p.t) * S, h = w * 1.3;
    g.save();
    g.translate(p.x, p.y);
    g.rotate(p.rot);
    g.transform(1, 0, (p.curl - 0.5) * 0.5, 0.75 + 0.25 * Math.cos(p.curl * 6), 0, 0);
    const pg = g.createLinearGradient(-w / 2, -h / 2, w / 2, h / 2);
    const glowK = p.t;
    pg.addColorStop(0, `rgba(${240},${230 + 10 * glowK},${214 + 41 * glowK},${0.95 - 0.4 * glowK})`);
    pg.addColorStop(1, `rgba(${200 + 20 * glowK},${180 + 40 * glowK},${230},${0.85 - 0.4 * glowK})`);
    g.fillStyle = pg;
    g.beginPath();
    g.moveTo(-w / 2, -h / 2);
    g.quadraticCurveTo(0, -h / 2 - w * 0.12 * p.curl, w / 2, -h / 2);
    g.lineTo(w / 2, h / 2);
    g.quadraticCurveTo(0, h / 2 - w * 0.12 * p.curl, -w / 2, h / 2);
    g.closePath();
    g.fill();
    g.strokeStyle = `rgba(90,70,110,${0.25 * (1 - glowK)})`;
    g.lineWidth = 1 * S;
    for (let l = 0; l < 6; l++) {
      g.beginPath();
      g.moveTo(-w * 0.35, -h * 0.3 + l * h * 0.11);
      g.lineTo(w * 0.35, -h * 0.3 + l * h * 0.11);
      g.stroke();
    }
    g.restore();
    dp.paint((d) => { d.beginPath(); d.arc(p.x, p.y, w * 0.6, 0, TAU); d.fill(); }, 0.3 + 0.15 * p.t);
  }
  // sparks trailing off the pages into the lights
  L.glow(g, W, H, (c) => {
    for (let i = 0; i < 260; i++) {
      const o = orbs[i % 3];
      const t = Math.pow(R(), 0.6);
      const sx = bx + (R() - 0.5) * bw * 0.3, sy = by - bh * 0.5;
      const mx = (sx + o[0]) / 2 + (R() - 0.5) * 160 * S, my = (sy + o[1]) / 2 - 40 * S;
      const x = (1 - t) * (1 - t) * sx + 2 * (1 - t) * t * mx + t * t * o[0] + (R() - 0.5) * 18 * S;
      const y = (1 - t) * (1 - t) * sy + 2 * (1 - t) * t * my + t * t * o[1] + (R() - 0.5) * 18 * S;
      c.fillStyle = `rgba(${200 + 55 * t},${180 + 60 * t},255,${0.3 + 0.6 * t})`;
      c.beginPath();
      c.arc(x, y, (0.6 + 1.4 * R()) * S, 0, TAU);
      c.fill();
    }
  }, { blur: [2 * S, 8 * S], strength: [0.8, 0.5], sharp: 1 });
  // the three lights
  L.glow(g, W, H, (c) => {
    for (const [ox, oy] of orbs) {
      const rg = c.createRadialGradient(ox, oy, 0, ox, oy, 70 * S);
      rg.addColorStop(0, 'rgba(255,255,255,1)');
      rg.addColorStop(0.18, 'rgba(236,226,255,0.95)');
      rg.addColorStop(0.45, 'rgba(170,140,255,0.45)');
      rg.addColorStop(1, 'rgba(140,100,255,0)');
      c.fillStyle = rg;
      c.beginPath();
      c.arc(ox, oy, 70 * S, 0, TAU);
      c.fill();
    }
  }, { blur: [12 * S, 40 * S, 110 * S], strength: [0.9, 0.7, 0.55], sharp: 1 });
  dp.paint((d) => { for (const [ox, oy] of orbs) { d.beginPath(); d.arc(ox, oy, 30 * S, 0, TAU); d.fill(); } }, 0.42, { blur: 8 * S });
  L.finish(g, W, H, { grain: 0.05, vignette: 0.5, vigColor: [0.02, 0.01, 0.05] });
  return { color: out, depth: dp, depthBlur: 0.006 };
}
