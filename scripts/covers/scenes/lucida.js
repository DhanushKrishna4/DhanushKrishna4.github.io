// Lucida: afternoon sun through a window onto a pale wall and an oak sill.
// Glass on the sill, a prism, a round bottle of water and a marble, bends the
// light: the prism throws a rainbow up the wall, the water a bright caustic
// into its own shadow; an olive branch outside throws soft leaf shadows.
export default async function ({ L, W, H }) {
  const S = W / 1600;
  const R = L.rng(17);
  const out = L.canvas(W, H);
  const g = out.ctx;
  const dp = L.depthLayer(W, H, 0.82);
  const TAU = Math.PI * 2;
  const SILL = 0.765 * H;     // where the sill's top meets the wall
  const FRONT = 0.835 * H;    // the sill's front edge
  const shear = 0.2;          // the sun comes down from the upper left

  // The wall in shade: warm plaster, faintly textured.
  {
    const wg = g.createLinearGradient(0, 0, 0, SILL);
    wg.addColorStop(0, 'rgb(196,184,172)');
    wg.addColorStop(1, 'rgb(214,204,192)');
    g.fillStyle = wg;
    g.fillRect(0, 0, W, SILL);
    const tex = L.canvas(W, H);
    const n = L.noise2(3);
    const img = tex.ctx.createImageData(W, H);
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const v = 128 + 60 * n.fbm(x / (9 * S), y / (9 * S), 3);
      const i = (y * W + x) * 4;
      img.data[i] = img.data[i + 1] = img.data[i + 2] = v;
      img.data[i + 3] = 255;
    }
    tex.ctx.putImageData(img, 0, 0);
    g.save();
    g.globalCompositeOperation = 'soft-light';
    g.globalAlpha = 0.18;
    g.drawImage(tex.c, 0, 0);
    g.restore();
  }

  // The sunlight: a window's four panes, sheared down to the right, with soft
  // edges; leaf shadows from the olive branch outside.
  const sun = L.canvas(W, H);
  {
    const c = sun.ctx;
    const x0 = -0.04 * W, x1 = 0.7 * W;
    const top = (x) => -0.06 * H + (x - x0) * shear;
    const bot = (x) => 0.9 * H + (x - x0) * shear;
    const lg0 = c.createLinearGradient(0, 0, W * 0.8, H);
    lg0.addColorStop(0, 'rgb(255,232,190)');
    lg0.addColorStop(1, 'rgb(255,214,160)');
    c.fillStyle = lg0;
    c.beginPath();
    c.moveTo(x0, top(x0));
    c.lineTo(x1, top(x1));
    c.lineTo(x1, bot(x1));
    c.lineTo(x0, bot(x0));
    c.closePath();
    c.fill();
    // muntins
    c.globalCompositeOperation = 'destination-out';
    const mx = 0.34 * W, bw = 0.018 * W;
    c.fillRect(mx - bw / 2, 0, bw, H);
    c.beginPath();
    const my = (x) => 0.36 * H + (x - x0) * shear;
    c.moveTo(x0, my(x0) - bw / 2);
    c.lineTo(x1, my(x1) - bw / 2);
    c.lineTo(x1, my(x1) + bw / 2);
    c.lineTo(x0, my(x0) + bw / 2);
    c.fill();
    c.globalCompositeOperation = 'source-over';
  }
  // leaves: an olive sprig's shadow across the upper right of the light
  const leaves = L.canvas(W, H);
  {
    const c = leaves.ctx;
    c.fillStyle = 'rgba(0,0,0,1)';
    c.strokeStyle = 'rgba(0,0,0,1)';
    const branch = (x, y, ang, len, n) => {
      c.save();
      c.translate(x, y);
      c.rotate(ang);
      c.lineWidth = 3.5 * S;
      c.beginPath();
      c.moveTo(0, 0);
      c.quadraticCurveTo(len * 0.5, len * 0.08, len, 0);
      c.stroke();
      for (let k = 0; k < n; k++) {
        const t = (k + 0.5) / n;
        const lx = t * len, ly = Math.sin(t * Math.PI) * len * 0.04;
        const side = k % 2 ? 1 : -1;
        c.save();
        c.translate(lx, ly);
        c.rotate(side * (0.5 + 0.3 * R()) + 0.2);
        c.beginPath();
        c.ellipse(len * 0.07 * side * 0.3, side * len * 0.075, len * 0.03, len * 0.11, 0.15 * side, 0, TAU);
        c.fill();
        c.restore();
      }
      c.restore();
    };
    branch(0.78 * W, -0.02 * H, 2.45, 0.5 * W, 16);
    branch(0.66 * W, 0.04 * H, 2.05, 0.3 * W, 11);
    branch(0.58 * W, 0.16 * H, 2.75, 0.24 * W, 9);
  }
  {
    const c = sun.ctx;
    c.save();
    c.globalCompositeOperation = 'destination-out';
    c.filter = `blur(${3.5 * S}px)`;
    c.globalAlpha = 0.62;
    c.drawImage(leaves.c, 0, 0);
    c.restore();
  }
  const soft = L.canvas(W, H);
  soft.ctx.filter = `blur(${5 * S}px)`;
  soft.ctx.drawImage(sun.c, 0, 0);
  g.save();
  g.beginPath();
  g.rect(0, 0, W, SILL);
  g.clip();
  g.globalCompositeOperation = 'screen';
  g.globalAlpha = 0.85;
  g.drawImage(soft.c, 0, 0);
  g.restore();

  // The sill: oak, its top in the sun, its front in shade.
  {
    const tg = g.createLinearGradient(0, SILL, 0, FRONT);
    tg.addColorStop(0, 'rgb(170,124,84)');
    tg.addColorStop(1, 'rgb(206,160,112)');
    g.fillStyle = tg;
    g.fillRect(0, SILL, W, FRONT - SILL);
    const fg = g.createLinearGradient(0, FRONT, 0, H);
    fg.addColorStop(0, 'rgb(132,88,56)');
    fg.addColorStop(1, 'rgb(84,52,32)');
    g.fillStyle = fg;
    g.fillRect(0, FRONT, W, H - FRONT);
    // grain
    for (let k = 0; k < 140; k++) {
      const y = SILL + R() * (H - SILL);
      g.strokeStyle = `rgba(${R() < 0.5 ? '255,220,180' : '60,30,10'},${0.05 + 0.08 * R()})`;
      g.lineWidth = (0.6 + R() * 1.4) * S;
      g.beginPath();
      g.moveTo(0, y);
      for (let x = 0; x <= W; x += 40 * S) g.lineTo(x, y + Math.sin(x * 0.004 / S + k) * 2 * S);
      g.stroke();
    }
    // the bright edge of the sill
    g.fillStyle = 'rgba(255,230,190,0.45)';
    g.fillRect(0, FRONT - 1.5 * S, W, 3 * S);
    // the sunlight continues across the sill top
    g.save();
    g.beginPath();
    g.rect(0, SILL, W, FRONT - SILL);
    g.clip();
    g.globalCompositeOperation = 'screen';
    g.globalAlpha = 0.5;
    g.translate(0, (FRONT - SILL) * 0.2);
    g.drawImage(soft.c, 0, 0);
    g.restore();
    dp.paint((d) => d.fillRect(0, SILL, W, FRONT - SILL), 0.42);
    dp.paint((d) => d.fillRect(0, FRONT, W, H - FRONT), 0.2);
    // a soft gradient on the sill depth, nearer toward its front edge
    const sg = dp.ctx.createLinearGradient(0, SILL, 0, FRONT);
    sg.addColorStop(0, 'rgb(130,130,130)');
    sg.addColorStop(1, 'rgb(70,70,70)');
    dp.ctx.fillStyle = sg;
    dp.ctx.fillRect(0, SILL, W, FRONT - SILL);
  }

  // The rainbow: the prism's spectrum, fanned up the wall to the right.
  const prism = { x: 0.27 * W, base: SILL + 0.035 * H, w: 0.15 * W, h: 0.19 * H };
  {
    const rb = L.canvas(W, H);
    const c = rb.ctx;
    const ox = prism.x + prism.w * 0.3, oy = prism.base - prism.h * 0.55;
    const spec = ['#ff2a1a', '#ff8a12', '#ffe21a', '#3ee05a', '#1aa0ff', '#5a3cff', '#b040ff'];
    const a0 = -0.42, a1 = -0.24;
    for (let k = 0; k < spec.length; k++) {
      const t0 = a0 + ((a1 - a0) * k) / spec.length, t1 = a0 + ((a1 - a0) * (k + 1)) / spec.length;
      c.fillStyle = spec[k];
      c.beginPath();
      c.moveTo(ox, oy);
      c.lineTo(ox + Math.cos(t0) * W, oy + Math.sin(t0) * W);
      c.lineTo(ox + Math.cos(t1) * W, oy + Math.sin(t1) * W);
      c.closePath();
      c.fill();
    }
    // brightest near the wall's middle, fading out at both ends
    c.globalCompositeOperation = 'destination-in';
    const fade = c.createLinearGradient(ox, 0, W, 0);
    fade.addColorStop(0, 'rgba(0,0,0,0)');
    fade.addColorStop(0.18, 'rgba(0,0,0,0.85)');
    fade.addColorStop(0.7, 'rgba(0,0,0,0.6)');
    fade.addColorStop(1, 'rgba(0,0,0,0.15)');
    c.fillStyle = fade;
    c.fillRect(0, 0, W, H);
    g.save();
    g.beginPath();
    g.rect(0, 0, W, SILL);
    g.clip();
    g.globalCompositeOperation = 'screen';
    g.filter = `blur(${8 * S}px)`;
    g.globalAlpha = 0.8;
    g.drawImage(rb.c, 0, 0);
    g.restore();
  }

  const snapWall = L.canvas(W, H);
  snapWall.ctx.drawImage(out.c, 0, 0);
  // Glass: what is behind it, bent (here: flipped and magnified, as a round
  // vessel of water does), edges darkened, highlights from the window.
  const glass = (shapePath, cx, cy, { flip = true, flipY = false, mag = 1.15, tint = 'rgba(200,230,236,0.12)', z = 0.3, edge = null } = {}) => {
    const snap = L.canvas(W, H);
    snap.ctx.drawImage(out.c, 0, 0);
    g.save();
    shapePath(g);
    g.clip();
    g.translate(cx, cy);
    g.scale(flip ? -mag : mag, flipY ? -mag : mag);
    g.translate(-cx, -cy);
    g.drawImage(snap.c, 0, 0);
    g.restore();
    g.save();
    shapePath(g);
    g.fillStyle = tint;
    g.fill();
    g.clip();
    // thick glass at the edges bends in darker light
    if (edge) {
      const rg = g.createRadialGradient(edge.x, edge.y, edge.r * 0.45, edge.x, edge.y, edge.r);
      rg.addColorStop(0, 'rgba(30,50,52,0)');
      rg.addColorStop(0.75, 'rgba(30,50,52,0.16)');
      rg.addColorStop(1, 'rgba(14,26,28,0.55)');
      g.fillStyle = rg;
      g.fillRect(0, 0, W, H);
    }
    g.lineWidth = 16 * S;
    g.strokeStyle = 'rgba(30,50,54,0.3)';
    shapePath(g);
    g.stroke();
    g.lineWidth = 2.6 * S;
    g.strokeStyle = 'rgba(255,255,255,0.7)';
    shapePath(g);
    g.stroke();
    g.restore();
    dp.paint((d) => { shapePath(d); d.fill(); }, z);
  };
  // The window, reflected small in a curved glass surface.
  const windowGlint = (x, y, w, h, a = 0.85) => {
    g.save();
    g.fillStyle = `rgba(255,252,240,${a})`;
    g.translate(x, y);
    g.transform(1, 0.18, -0.08, 1, 0, 0);
    const bw = w * 0.12;
    g.fillRect(0, 0, (w - bw) / 2, (h - bw) / 2);
    g.fillRect((w + bw) / 2, 0, (w - bw) / 2, (h - bw) / 2);
    g.fillRect(0, (h + bw) / 2, (w - bw) / 2, (h - bw) / 2);
    g.fillRect((w + bw) / 2, (h + bw) / 2, (w - bw) / 2, (h - bw) / 2);
    g.restore();
  };
  // Shadows with a caustic at their heart, cast down and to the right: a
  // bright focus with coloured fringes, as light through glass makes.
  const castShadow = (x, w, len, caustic = true) => {
    const cy = SILL + (FRONT - SILL) * 0.46;
    g.save();
    g.beginPath();
    g.rect(0, SILL, W, FRONT - SILL);
    g.clip();
    g.filter = `blur(${5 * S}px)`;
    g.fillStyle = 'rgba(70,38,18,0.42)';
    g.beginPath();
    g.ellipse(x + len * 0.5, cy, len * 0.62, (FRONT - SILL) * 0.3, 0, 0, TAU);
    g.fill();
    if (caustic) {
      g.globalCompositeOperation = 'screen';
      const fx = x + len * 0.58;
      const fringes = [['rgba(255,80,60,0.55)', 1.25], ['rgba(80,160,255,0.5)', 1.15], ['rgba(255,236,190,1)', 0.85], ['rgba(255,255,240,1)', 0.45]];
      for (const [col, k] of fringes) {
        g.fillStyle = col;
        g.beginPath();
        g.ellipse(fx, cy, len * 0.2 * k, (FRONT - SILL) * 0.11 * k, 0, 0, TAU);
        g.fill();
      }
      // filaments of light, as in the bottom of a glass
      g.strokeStyle = 'rgba(255,244,214,0.7)';
      g.lineWidth = 1.5 * S;
      for (let k = 0; k < 7; k++) {
        g.beginPath();
        g.ellipse(fx, cy, len * (0.24 + 0.05 * k), (FRONT - SILL) * (0.13 + 0.02 * k), 0, Math.PI * (0.9 + 0.1 * R()), Math.PI * (1.5 + 0.4 * R()));
        g.stroke();
      }
    }
    g.restore();
  };
  // The prism: a triangular glass bar lying on the sill, its far end
  // receding; bright edges, a rainbow on one face.
  castShadow(prism.x, prism.w, 0.2 * W, true);
  {
    const p = prism;
    const off = [0.05 * W, -0.028 * H];
    const A = [p.x - p.w * 0.5, p.base], B = [p.x + p.w * 0.06, p.base - p.h], Cc = [p.x + p.w * 0.5, p.base];
    const A2 = [A[0] + off[0], A[1] + off[1]], B2 = [B[0] + off[0], B[1] + off[1]], C2 = [Cc[0] + off[0], Cc[1] + off[1]];
    const quad = (P) => (c) => { c.beginPath(); c.moveTo(...P[0]); P.slice(1).forEach((q) => c.lineTo(...q)); c.closePath(); };
    // the far faces, seen through the near ones
    glass(quad([B, B2, C2, Cc]), p.x + p.w * 0.3, p.base - p.h * 0.5, { flip: false, mag: 1.04, tint: 'rgba(200,226,232,0.24)', z: 0.31 });
    glass(quad([A, B, Cc]), p.x, p.base - p.h * 0.35, { flip: true, flipY: true, mag: 1.12, tint: 'rgba(190,222,230,0.2)', z: 0.3, edge: { x: p.x, y: p.base - p.h * 0.33, r: p.w * 0.55 } });
    g.save();
    quad([A, B, Cc])(g);
    g.clip();
    const fg = g.createLinearGradient(A[0], A[1], B[0], B[1]);
    fg.addColorStop(0, 'rgba(255,255,255,0.0)');
    fg.addColorStop(0.6, 'rgba(255,255,255,0.3)');
    fg.addColorStop(1, 'rgba(255,255,255,0.05)');
    g.fillStyle = fg;
    g.fill();
    // the spectrum, spread inside the far face
    const spec = ['rgba(255,50,30,0.55)', 'rgba(255,150,20,0.5)', 'rgba(255,230,40,0.5)', 'rgba(60,220,110,0.45)', 'rgba(50,140,255,0.55)', 'rgba(140,60,255,0.5)'];
    spec.forEach((col, k) => {
      g.strokeStyle = col;
      g.lineWidth = 4 * S;
      g.beginPath();
      g.moveTo(B[0] + (k - 2.5) * 3 * S, B[1] + p.h * 0.18);
      g.lineTo(Cc[0] - p.w * (0.12 + k * 0.03), Cc[1] - 2 * S);
      g.stroke();
    });
    g.restore();
    // bright edges
    g.save();
    g.lineCap = 'round';
    for (const [P, Q, a] of [[A, B, 0.9], [B, Cc, 0.6], [B, B2, 0.95], [Cc, C2, 0.5], [B2, C2, 0.4], [A, Cc, 0.5]]) {
      g.strokeStyle = `rgba(255,255,255,${a})`;
      g.lineWidth = 2.2 * S;
      g.beginPath();
      g.moveTo(...P);
      g.lineTo(...Q);
      g.stroke();
    }
    g.restore();
  }

  // The bottle of water.
  const bottle = { x: 0.53 * W, base: SILL + 0.045 * H, w: 0.19 * W, h: 0.44 * H };
  castShadow(bottle.x, bottle.w, 0.24 * W, true);
  {
    const b = bottle;
    const path = (c) => {
      const r = b.w * 0.5;
      c.beginPath();
      c.moveTo(b.x - b.w * 0.09, b.base - b.h);
      c.lineTo(b.x - b.w * 0.09, b.base - b.h * 0.66);
      c.bezierCurveTo(b.x - b.w * 0.12, b.base - b.h * 0.56, b.x - r, b.base - b.h * 0.56, b.x - r, b.base - b.h * 0.3);
      c.bezierCurveTo(b.x - r, b.base - b.h * 0.02, b.x - r * 0.7, b.base, b.x, b.base);
      c.bezierCurveTo(b.x + r * 0.7, b.base, b.x + r, b.base - b.h * 0.02, b.x + r, b.base - b.h * 0.3);
      c.bezierCurveTo(b.x + r, b.base - b.h * 0.56, b.x + b.w * 0.12, b.base - b.h * 0.56, b.x + b.w * 0.09, b.base - b.h * 0.66);
      c.lineTo(b.x + b.w * 0.09, b.base - b.h);
      c.closePath();
    };
    glass(path, b.x, b.base - b.h * 0.26, { flip: true, flipY: true, mag: 1.3, tint: 'rgba(180,222,226,0.16)', z: 0.28, edge: { x: b.x, y: b.base - b.h * 0.27, r: b.w * 0.55 } });
    // the neck is a narrow tube: it only flips side to side
    const neck = (c) => { c.beginPath(); c.rect(b.x - b.w * 0.09, b.base - b.h, b.w * 0.18, b.h * 0.36); };
    const snap2 = L.canvas(W, H);
    snap2.ctx.drawImage(out.c, 0, 0);
    g.save();
    path(g);
    g.clip();
    neck(g);
    g.clip();
    g.drawImage(snap2.c, 0, 0);
    g.restore();
    g.save();
    path(g);
    g.clip();
    neck(g);
    g.clip();
    // redo the neck from the wall behind it, flipped side to side
    g.translate(b.x, 0);
    g.scale(-1.6, 1);
    g.translate(-b.x, 0);
    const wallOnly = L.canvas(W, H);
    wallOnly.ctx.drawImage(snapWall.c, 0, 0);
    g.drawImage(wallOnly.c, 0, 0);
    g.restore();
    g.save();
    path(g);
    g.clip();
    neck(g);
    g.fillStyle = 'rgba(180,222,226,0.18)';
    g.fill();
    g.lineWidth = 2 * S;
    g.strokeStyle = 'rgba(30,50,54,0.35)';
    g.beginPath();
    g.moveTo(b.x - b.w * 0.085, b.base - b.h);
    g.lineTo(b.x - b.w * 0.085, b.base - b.h * 0.64);
    g.moveTo(b.x + b.w * 0.085, b.base - b.h);
    g.lineTo(b.x + b.w * 0.085, b.base - b.h * 0.64);
    g.stroke();
    g.restore();
    // the water line, and the window's reflection on the left of the bulb
    g.save();
    path(g);
    g.clip();
    g.strokeStyle = 'rgba(255,255,255,0.6)';
    g.lineWidth = 2.2 * S;
    g.beginPath();
    g.ellipse(b.x, b.base - b.h * 0.42, b.w * 0.47, b.w * 0.06, 0, 0, TAU);
    g.stroke();
    windowGlint(b.x - b.w * 0.33, b.base - b.h * 0.47, b.w * 0.16, b.h * 0.16, 0.8);
    g.fillStyle = 'rgba(255,255,255,0.4)';
    g.beginPath();
    g.ellipse(b.x + b.w * 0.36, b.base - b.h * 0.22, b.w * 0.025, b.h * 0.09, -0.1, 0, TAU);
    g.fill();
    g.fillStyle = 'rgba(255,255,255,0.35)';
    g.fillRect(b.x - b.w * 0.07, b.base - b.h * 0.98, b.w * 0.025, b.h * 0.26);
    g.restore();
  }

  // A glass marble.
  {
    const mx = 0.7 * W, mr = 0.045 * H, my = SILL + 0.05 * H - mr;
    castShadow(mx, mr * 2, 0.07 * W, true);
    const path = (c) => { c.beginPath(); c.arc(mx, my, mr, 0, TAU); };
    glass(path, mx, my, { flip: true, flipY: true, mag: 1.7, tint: 'rgba(200,150,120,0.14)', z: 0.26, edge: { x: mx, y: my, r: mr } });
    g.fillStyle = 'rgba(255,255,255,0.8)';
    g.beginPath();
    g.ellipse(mx - mr * 0.35, my - mr * 0.4, mr * 0.16, mr * 0.1, -0.6, 0, TAU);
    g.fill();
  }

  // A small terracotta pot with a succulent, at the end of the sill.
  {
    const px = 0.86 * W, pb = SILL + 0.05 * H, pw = 0.11 * W, ph = 0.13 * H;
    castShadow(px, pw, 0.1 * W, false);
    const pg = g.createLinearGradient(px - pw / 2, 0, px + pw / 2, 0);
    pg.addColorStop(0, 'rgb(236,140,96)');
    pg.addColorStop(0.35, 'rgb(214,104,62)');
    pg.addColorStop(0.8, 'rgb(150,58,28)');
    pg.addColorStop(1, 'rgb(104,36,16)');
    g.fillStyle = pg;
    g.beginPath();
    g.moveTo(px - pw * 0.5, pb - ph);
    g.lineTo(px + pw * 0.5, pb - ph);
    g.lineTo(px + pw * 0.4, pb);
    g.quadraticCurveTo(px, pb + 0.012 * H, px - pw * 0.4, pb);
    g.closePath();
    g.fill();
    // the rim, its top lit
    const rg2 = g.createLinearGradient(px - pw / 2, 0, px + pw / 2, 0);
    rg2.addColorStop(0, 'rgb(246,160,112)');
    rg2.addColorStop(0.4, 'rgb(226,120,76)');
    rg2.addColorStop(1, 'rgb(128,46,20)');
    g.fillStyle = rg2;
    g.beginPath();
    g.roundRect(px - pw * 0.55, pb - ph - 0.024 * H, pw * 1.1, 0.03 * H, 3 * S);
    g.fill();
    g.fillStyle = 'rgba(255,220,190,0.55)';
    g.fillRect(px - pw * 0.53, pb - ph - 0.024 * H, pw * 0.9, 1.6 * S);
    g.fillStyle = 'rgb(54,34,24)';
    g.beginPath();
    g.ellipse(px, pb - ph - 0.022 * H, pw * 0.48, 0.008 * H, 0, 0, TAU);
    g.fill();
    // rosette of thick leaves
    for (let k = 0; k < 14; k++) {
      const a = -Math.PI / 2 + (k / 13 - 0.5) * 2.4;
      const len = (0.05 + 0.03 * R()) * H;
      const lg = g.createLinearGradient(px, pb - ph, px + Math.cos(a) * len, pb - ph + Math.sin(a) * len);
      lg.addColorStop(0, 'rgb(46,88,66)');
      lg.addColorStop(0.75, 'rgb(122,174,134)');
      lg.addColorStop(1, 'rgb(176,206,164)');
      g.fillStyle = lg;
      g.save();
      g.translate(px, pb - ph - 0.01 * H);
      g.rotate(a + Math.PI / 2);
      g.beginPath();
      g.ellipse(0, -len * 0.5, len * 0.2, len * 0.55, 0, 0, TAU);
      g.fill();
      g.restore();
    }
    dp.paint((d) => d.fillRect(px - pw * 0.55, pb - ph - 0.09 * H, pw * 1.1, ph + 0.09 * H), 0.27);
  }

  // Dust in the sunbeam.
  L.motes(g, null, W, H, R, { n: 50, area: [0.1, 0.05, 0.7, 0.7], color: [1, 0.96, 0.86], size: [0.8, 1.8], nearShare: 0, alpha: 0.55 });
  L.finish(g, W, H, { grain: 0.035, vignette: 0.22, vigColor: [0.25, 0.15, 0.08] });
  return { color: out, depth: dp, depthBlur: 0.006 };
}
