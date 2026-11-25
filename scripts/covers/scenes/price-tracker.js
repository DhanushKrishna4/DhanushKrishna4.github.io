// Price Tracker: a city street at night in the rain. Shopfronts and neon
// signs line both sides, lime above all, among them a neon price tag with a
// falling arrow; everything glows again, stretched long, in the wet road.
export default async function ({ L, W, H }) {
  const S = W / 1600;
  const R = L.rng(61);
  const out = L.canvas(W, H);
  const g = out.ctx;
  const dp = L.depthLayer(W, H, 1);
  const TAU = Math.PI * 2;
  const VP = [0.52 * W, 0.47 * H], F = 0.75 * H, EYE = 1.7;
  const P = (X, Y, Z) => [VP[0] + (X * F) / Z, VP[1] - ((Y - EYE) * F) / Z];
  const zDepth = (Z) => Math.min(0.97, 0.06 + Math.log(Z) / Math.log(140));
  const quad = (c, pts) => { c.beginPath(); pts.forEach((q, i) => (i ? c.lineTo(...q) : c.moveTo(...q))); c.closePath(); };
  const lime = [0.78, 0.94, 0.3], pink = [1, 0.3, 0.62], cyanC = [0.3, 0.86, 1];

  // Sky: low cloud lit from below by the city, green-grey.
  {
    const sg = g.createLinearGradient(0, 0, 0, VP[1]);
    sg.addColorStop(0, 'rgb(6,8,6)');
    sg.addColorStop(1, 'rgb(34,44,30)');
    g.fillStyle = sg;
    g.fillRect(0, 0, W, VP[1] + 2);
  }
  // Road and pavements: dark and wet.
  {
    const rg = g.createLinearGradient(0, VP[1], 0, H);
    rg.addColorStop(0, 'rgb(24,30,24)');
    rg.addColorStop(1, 'rgb(6,8,7)');
    g.fillStyle = rg;
    g.fillRect(0, VP[1], W, H - VP[1]);
  }

  // Emissive things (shop windows, signs, street lamps), kept for the
  // reflections in the road.
  const glowLayer = L.canvas(W, H);
  const gl = glowLayer.ctx;

  // Buildings: the two street walls, far to near, with windows above and
  // lit shopfronts below.
  const sides = [-1, 1];
  for (const side of sides) {
    const X = side * 6.5;
    let Z = 120;
    while (Z > 3) {
      const len = 6 + R() * 10;
      const Z0 = Math.max(3, Z - len), Z1 = Z;
      const top = 12 + R() * 22;
      // facade
      const pts = [P(X, 0, Z0), P(X, top, Z0), P(X, top, Z1), P(X, 0, Z1)];
      const k = 0.6 + 0.4 * R();
      g.fillStyle = `rgb(${Math.round(18 * k)},${Math.round(22 * k)},${Math.round(20 * k)})`;
      quad(g, pts);
      g.fill();
      dp.paint((d) => { quad(d, pts); d.fill(); }, zDepth((Z0 + Z1) / 2));
      // windows above the shops
      for (let fy = 5; fy < top - 1.5; fy += 3) {
        for (let fz = Z0 + 0.8; fz < Z1 - 1.2; fz += 2.2) {
          if (R() < 0.55) continue;
          const warm = R() < 0.6;
          const col = warm ? 'rgba(255,196,120,0.75)' : 'rgba(170,220,200,0.6)';
          const wp = [P(X, fy, fz), P(X, fy + 1.6, fz), P(X, fy + 1.6, fz + 1.2), P(X, fy, fz + 1.2)];
          g.fillStyle = col;
          quad(g, wp);
          g.fill();
          gl.fillStyle = col;
          quad(gl, wp);
          gl.fill();
        }
      }
      // the shopfront: a long lit window at street level (the nearest shops
      // are shut, their shutters down)
      if (Z0 < 8) {
        const sp = [P(X, 0.2, Z0 + 0.3), P(X, 3.2, Z0 + 0.3), P(X, 3.2, Z1 - 0.3), P(X, 0.2, Z1 - 0.3)];
        g.fillStyle = 'rgb(20,24,20)';
        quad(g, sp);
        g.fill();
        g.strokeStyle = 'rgba(120,140,110,0.12)';
        g.lineWidth = 1 * S;
        for (let fy = 0.4; fy < 3.1; fy += 0.18) {
          g.beginPath();
          g.moveTo(...P(X, fy, Z0 + 0.3));
          g.lineTo(...P(X, fy, Z1 - 0.3));
          g.stroke();
        }
      } else if (R() < 0.8) {
        const tint = R() < 0.45 ? [0.72, 0.92, 0.36] : R() < 0.5 ? [1, 0.7, 0.42] : [0.5, 0.86, 1];
        const sp = [P(X, 0.4, Z0 + 0.5), P(X, 3.2, Z0 + 0.5), P(X, 3.2, Z1 - 0.5), P(X, 0.4, Z1 - 0.5)];
        const yTop = Math.min(sp[1][1], sp[2][1]), yBot = Math.max(sp[0][1], sp[3][1]);
        const ig = g.createLinearGradient(0, yTop, 0, yBot);
        ig.addColorStop(0, L.css(tint, 0.62));
        ig.addColorStop(1, L.css(L.darken(tint, 0.55), 0.5));
        g.fillStyle = ig;
        quad(g, sp);
        g.fill();
        // shelves inside
        g.save();
        quad(g, sp);
        g.clip();
        g.strokeStyle = 'rgba(10,14,10,0.4)';
        g.lineWidth = Math.max(1, (0.06 * F) / Z1);
        for (const fy of [1.1, 1.8, 2.5]) {
          g.beginPath();
          g.moveTo(...P(X, fy, Z0 + 0.5));
          g.lineTo(...P(X, fy, Z1 - 0.5));
          g.stroke();
        }
        g.restore();
        gl.fillStyle = L.css(tint, 0.5);
        quad(gl, sp);
        gl.fill();
        // an awning line
        g.strokeStyle = L.css(L.darken(tint, 0.6), 0.8);
        g.lineWidth = Math.max(1, (1.2 * F) / Z1 / 60);
        g.beginPath();
        g.moveTo(...P(X, 3.4, Z0 + 0.3));
        g.lineTo(...P(X, 3.4, Z1 - 0.3));
        g.stroke();
      }
      Z = Z0 - 0.4;
    }
  }

  // Blade signs: neon panels sticking out from the walls.
  const blade = (side, Z, y0, h, col, shape) => {
    const X0 = side * 6.5, X1 = side * 4.6;
    const pts = [P(X0, y0, Z), P(X0, y0 + h, Z), P(X1, y0 + h, Z), P(X1, y0, Z)];
    g.fillStyle = 'rgb(10,12,10)';
    quad(g, pts);
    g.fill();
    dp.paint((d) => { quad(d, pts); d.fill(); }, zDepth(Z) - 0.03);
    // the neon tube following the panel's edge, and the shape inside
    const draw = (c, a) => {
      c.strokeStyle = L.css(col, a);
      c.lineWidth = Math.max(1.2, (0.09 * F) / Z);
      const inset = (u, v) => {
        const top = [pts[1][0] + (pts[2][0] - pts[1][0]) * u, pts[1][1] + (pts[2][1] - pts[1][1]) * u];
        const bot = [pts[0][0] + (pts[3][0] - pts[0][0]) * u, pts[0][1] + (pts[3][1] - pts[0][1]) * u];
        return [bot[0] + (top[0] - bot[0]) * v, bot[1] + (top[1] - bot[1]) * v];
      };
      c.beginPath();
      [[0.08, 0.06], [0.08, 0.94], [0.92, 0.94], [0.92, 0.06]].forEach(([u, v], i) => (i ? c.lineTo(...inset(u, v)) : c.moveTo(...inset(u, v))));
      c.closePath();
      c.stroke();
      if (shape === 'tag') {
        // a price tag with its hole, and a falling arrow under it
        c.beginPath();
        [[0.3, 0.82], [0.7, 0.82], [0.7, 0.5], [0.5, 0.38], [0.3, 0.5]].forEach(([u, v], i) => (i ? c.lineTo(...inset(u, v)) : c.moveTo(...inset(u, v))));
        c.closePath();
        c.stroke();
        const ho = inset(0.5, 0.72);
        c.beginPath();
        c.arc(ho[0], ho[1], c.lineWidth * 1.6, 0, TAU);
        c.stroke();
        c.beginPath();
        c.moveTo(...inset(0.5, 0.3));
        c.lineTo(...inset(0.5, 0.12));
        c.moveTo(...inset(0.38, 0.2));
        c.lineTo(...inset(0.5, 0.12));
        c.lineTo(...inset(0.62, 0.2));
        c.stroke();
      } else if (shape === 'pct') {
        const a1 = inset(0.32, 0.7), a2 = inset(0.68, 0.3);
        c.beginPath();
        c.moveTo(...inset(0.7, 0.8));
        c.lineTo(...inset(0.3, 0.2));
        c.stroke();
        for (const q of [a1, a2]) {
          c.beginPath();
          c.arc(q[0], q[1], c.lineWidth * 2.2, 0, TAU);
          c.stroke();
        }
      } else if (shape === 'bars') {
        for (let k = 0; k < 4; k++) {
          c.beginPath();
          c.moveTo(...inset(0.2 + k * 0.2, 0.2));
          c.lineTo(...inset(0.2 + k * 0.2, 0.3 + 0.15 * k));
          c.stroke();
        }
      }
    };
    draw(g, 1);
    draw(gl, 1);
    L.glow(g, W, H, (c) => draw(c, 1), { blur: [3 * S, 12 * S, 34 * S], strength: [0.9, 0.6, 0.4], sharp: 0.9 });
  };
  blade(-1, 9, 4.5, 5.5, lime, 'tag');
  blade(1, 16, 5, 4.5, lime, 'pct');
  blade(-1, 26, 5, 4, pink, 'bars');
  blade(1, 34, 6, 4, cyanC, 'bars');
  blade(-1, 48, 5, 4, lime, 'pct');
  blade(1, 60, 5, 3.5, pink, 'tag');

  // Street lamps down the right side.
  for (const Z of [7, 15, 26, 44, 72]) {
    const base = P(5.6, 0, Z), top = P(5.6, 6.5, Z), arm = P(4.2, 6.5, Z);
    g.strokeStyle = 'rgb(12,14,12)';
    g.lineWidth = Math.max(1, (0.18 * F) / Z);
    g.beginPath();
    g.moveTo(...base);
    g.lineTo(...top);
    g.lineTo(...arm);
    g.stroke();
    const lamp = (c) => { c.fillStyle = 'rgba(255,236,190,1)'; c.beginPath(); c.arc(arm[0], arm[1] + (0.12 * F) / Z, Math.max(1.5, (0.18 * F) / Z), 0, TAU); c.fill(); };
    lamp(gl);
    L.glow(g, W, H, lamp, { blur: [4 * S, 18 * S, 60 * S], strength: [0.9, 0.6, 0.35], sharp: 1 });
  }

  // Far down the street: fog, and the lights of cars.
  {
    const fg = g.createRadialGradient(VP[0], VP[1], 0, VP[0], VP[1], W * 0.35);
    fg.addColorStop(0, 'rgba(150,180,140,0.35)');
    fg.addColorStop(1, 'rgba(150,180,140,0)');
    g.fillStyle = fg;
    g.fillRect(0, 0, W, H);
    const cars = (c) => {
      for (const [X, Z, col] of [[-1.6, 30, 'rgba(255,40,30,1)'], [-1.2, 55, 'rgba(255,40,30,1)'], [1.8, 40, 'rgba(255,250,230,1)'], [1.5, 80, 'rgba(255,250,230,1)']]) {
        for (const dx of [-0.7, 0.7]) {
          const q = P(X + dx, 0.7, Z);
          c.fillStyle = col;
          c.beginPath();
          c.arc(q[0], q[1], Math.max(1.2, (0.12 * F) / Z), 0, TAU);
          c.fill();
        }
      }
    };
    cars(gl);
    L.glow(g, W, H, cars, { blur: [3 * S, 14 * S], strength: [0.9, 0.6], sharp: 1 });
  }

  // The wet road: everything bright, mirrored and stretched toward us.
  {
    const mir = L.canvas(W, H);
    mir.ctx.save();
    mir.ctx.translate(0, 2 * VP[1]);
    mir.ctx.scale(1, -1);
    mir.ctx.drawImage(glowLayer.c, 0, 0);
    mir.ctx.restore();
    // the mirror image squashed, blurred, and stretched back: long streaks
    const sq = L.canvas(W, Math.round(H / 6));
    sq.ctx.filter = `blur(${2.5 * S}px)`;
    sq.ctx.drawImage(mir.c, 0, 0, W, sq.c.height);
    const streak = L.canvas(W, H);
    streak.ctx.filter = `blur(${2 * S}px)`;
    streak.ctx.drawImage(sq.c, 0, 0, W, H);
    g.save();
    g.beginPath();
    g.rect(0, VP[1], W, H - VP[1]);
    g.clip();
    g.globalCompositeOperation = 'lighter';
    g.globalAlpha = 0.75;
    g.drawImage(streak.c, 0, 0);
    // and a sharper copy for the puddles
    g.globalAlpha = 0.18;
    g.filter = `blur(${1.5 * S}px)`;
    const slice = 2 * S;
    for (let y = VP[1]; y < H; y += slice) {
      const off = Math.sin(y * 0.21 / S) * 3 * S + Math.sin(y * 0.047 / S + 2) * 6 * S * ((y - VP[1]) / (H - VP[1]));
      g.drawImage(mir.c, 0, y, W, slice, off, y, W, slice);
    }
    g.restore();
    // kerbs: the pavements' wet edges, catching the light
    for (const X of [-4.4, 4.4]) {
      g.strokeStyle = 'rgba(200,220,180,0.28)';
      g.lineWidth = 1.4 * S;
      g.beginPath();
      g.moveTo(...P(X, 0.15, 3));
      g.lineTo(...P(X, 0.15, 140));
      g.stroke();
    }
    // lane markings, catching the light
    g.strokeStyle = 'rgba(200,220,180,0.35)';
    for (let Z = 5; Z < 120; Z += 6) {
      const a = P(0, 0, Z), b = P(0, 0, Z + 2.5);
      g.lineWidth = Math.max(0.8, (0.15 * F) / Z);
      g.beginPath();
      g.moveTo(...a);
      g.lineTo(...b);
      g.stroke();
    }
    // the road's depth: just the road between the kerbs, far at the
    // horizon and near at the bottom
    {
      const c = dp.ctx;
      const a = P(-6.5, 0, 2.2), b = P(-6.5, 0, 140), d2 = P(6.5, 0, 140), e = P(6.5, 0, 2.2);
      const rd = c.createLinearGradient(0, VP[1], 0, H);
      rd.addColorStop(0, `rgb(${Math.round(zDepth(140) * 255)},${Math.round(zDepth(140) * 255)},${Math.round(zDepth(140) * 255)})`);
      rd.addColorStop(0.08, 'rgb(170,170,170)');
      rd.addColorStop(0.35, 'rgb(90,90,90)');
      rd.addColorStop(1, 'rgb(15,15,15)');
      c.save();
      c.fillStyle = rd;
      c.beginPath();
      c.moveTo(...a);
      c.lineTo(...b);
      c.lineTo(...d2);
      c.lineTo(...e);
      c.closePath();
      c.fill();
      c.restore();
    }
  }

  // Rain: fine streaks, catching the light where it is bright.
  {
    const rain = L.canvas(W, H);
    const c = rain.ctx;
    for (let i = 0; i < 1400; i++) {
      const x = R() * W * 1.1 - 0.05 * W, y = R() * H;
      const len = (10 + 26 * R()) * S;
      c.strokeStyle = `rgba(220,240,210,${0.06 + 0.12 * R()})`;
      c.lineWidth = (0.6 + 0.8 * R()) * S;
      c.beginPath();
      c.moveTo(x, y);
      c.lineTo(x - len * 0.18, y + len);
      c.stroke();
    }
    g.save();
    g.globalCompositeOperation = 'screen';
    g.drawImage(rain.c, 0, 0);
    g.restore();
  }
  L.finish(g, W, H, { grain: 0.06, vignette: 0.5, vigColor: [0, 0.01, 0] });
  return { color: out, depth: dp, depthBlur: 0.005 };
}
