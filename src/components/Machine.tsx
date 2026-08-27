import { useEffect, useRef } from 'react';
import { reduced } from '../lib/motion';

/**
 * The hero's centrepiece: the machine, and the traffic that never leaves it.
 *
 * the reference site's centrepiece is his face with his helmet assembling onto it. The
 * portfolio equivalent is not an abstract solid — the teardown was explicit
 * that his lands before you have read a word precisely because it is *his*
 * helmet on *his* head, and that an abstract shape means something only after
 * the copy explains it, which is too late.
 *
 * So the subject here is the one this whole site is about: five open-weight
 * models on local hardware, in a building nothing leaves. This is that box.
 * Five bays, a request arriving at the top, a route down the spine into
 * whichever bay is going to answer it, and the answer coming back. Every path
 * is inside the chassis. Nothing crosses the wall, ever, because the thesis of
 * the site is that nothing does.
 *
 * That makes the motion legible without a caption: something arrives, something
 * lights up, something comes back, and none of it gets out.
 *
 * Three rules carried over from the teardown, all of which the previous site's
 * object broke:
 *
 *   ANCHORED   it stands on the floor of the section on four feet, so it reads
 *              as being in a room rather than floating in one.
 *   QUIET      hairline. It is large enough to be the centrepiece without being
 *              loud enough to fight the wordmark, and the only saturated thing
 *              in it is the traffic.
 *   MOTIVATED  see above. It is the premises.
 *
 * Canvas 2D rather than WebGL: the geometry is a few hundred edges and the
 * projection is orthographic with a whisper of perspective, so a GPU context
 * would cost a context, a shader compile and a fallback path to draw something
 * the CPU finishes in well under a millisecond.
 */

type V3 = [number, number, number];

const W = 0.62;
const H = 1.5;
const D = 0.52;
const BAYS = 5;

interface Edge {
  a: V3;
  b: V3;
  bay?: number;
  /* Structure is drawn darker than contents, so the box reads as a box. */
  shell?: boolean;
}

interface Bay {
  y: number;
  h: number;
  face: V3[];
  /* Where the spine branches into this bay. */
  port: V3;
}

const edges: Edge[] = [];
const bays: Bay[] = [];

const box = (
  x0: number,
  y0: number,
  z0: number,
  x1: number,
  y1: number,
  z1: number,
  o: { bay?: number; shell?: boolean } = {},
) => {
  const c: V3[] = [
    [x0, y0, z0], [x1, y0, z0], [x1, y1, z0], [x0, y1, z0],
    [x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1],
  ];
  for (const [i, j] of [
    [0, 1],[1, 2],[2, 3],[3, 0],[4, 5],[5, 6],[6, 7],[7, 4],[0, 4],[1, 5],[2, 6],[3, 7],
  ])
    edges.push({ a: c[i], b: c[j], ...o });
};

/* Chassis and feet. */
box(-W, 0, -D, W, H, D, { shell: true });
const ft = 0.05;
for (const sx of [-1, 1])
  for (const sz of [-1, 1])
    box(sx * (W - 0.14) - ft, -0.07, sz * (D - 0.12) - ft, sx * (W - 0.14) + ft, 0, sz * (D - 0.12) + ft, {
      shell: true,
    });

/* Bays. */
const inset = 0.055;
const gap = 0.03;
const bh = (H - gap * (BAYS + 1)) / BAYS;
const zF = D + 0.02;
const zB = -D + inset;

for (let i = 0; i < BAYS; i++) {
  const y0 = gap + i * (bh + gap);
  const y1 = y0 + bh;
  const xl = -W + inset;
  const xr = W - inset;

  /* Front face and top face only. Drawing each bay as a full box put its four
     back edges behind every other bay's, and at centrepiece scale the result
     was a thicket rather than a machine — the object stopped reading as an
     object. Front plus top gives the drawer and the depth; the back of a
     drawer is not visible in the thing this is a drawing of. */
  for (const e of [
    [[xl, y0, zF], [xr, y0, zF]],
    [[xr, y0, zF], [xr, y1, zF]],
    [[xr, y1, zF], [xl, y1, zF]],
    [[xl, y1, zF], [xl, y0, zF]],
    [[xl, y1, zF], [xl, y1, zB]],
    [[xr, y1, zF], [xr, y1, zB]],
    [[xl, y1, zB], [xr, y1, zB]],
  ] as [V3, V3][])
    edges.push({ a: e[0], b: e[1], bay: i });

  const hy = y0 + bh * 0.5;

  /* Vent stack, right of the drawer front. */
  for (let v = 0; v < 4; v++) {
    const vx = xr - 0.08 - v * 0.05;
    edges.push({ a: [vx, y0 + bh * 0.26, zF], b: [vx, y0 + bh * 0.74, zF], bay: i });
  }

  /* The board inside, seen through the open front: a spine and its slots. This
     is the density that turns a transparent box into a drawing of hardware —
     an empty chassis reads as packaging, and the subject here is the contents. */
  const bz = D * 0.1;
  edges.push({ a: [xl + 0.06, hy, bz], b: [xr - 0.06, hy, bz], bay: i });
  for (let k = 0; k < 5; k++) {
    const sx = xl + 0.12 + k * 0.16;
    edges.push({ a: [sx, hy - 0.018, bz], b: [sx, hy + 0.018, bz], bay: i });
  }

  /* Rear connectors. */
  for (let k = 0; k < 3; k++) {
    const cx0 = xl + 0.1 + k * 0.18;
    edges.push({ a: [cx0, y0 + bh * 0.35, zB], b: [cx0 + 0.1, y0 + bh * 0.35, zB], bay: i });
  }

  bays.push({
    y: y0,
    h: bh,
    /* The lit region is a strip beside the port, not the whole drawer front.
       At this size a full face is a slab of pure accent big enough to be the
       loudest thing on the page, which is the opposite of what an indicator
       should be. */
    face: [
      [xl + 0.03, y0 + bh * 0.22, zF],
      [xl + 0.03 + (xr - xl) * 0.34, y0 + bh * 0.22, zF],
      [xl + 0.03 + (xr - xl) * 0.34, y0 + bh * 0.78, zF],
      [xl + 0.03, y0 + bh * 0.78, zF],
    ],
    port: [-W + inset + 0.05, hy, D + 0.02],
  });
}

/* The spine: the internal bus every request travels down. Drawn faintly as part
   of the structure so the routes the traffic takes are legible even between
   packets. */
const SPINE_X = -W + inset + 0.05;
const SPINE_TOP: V3 = [SPINE_X, H - gap, D + 0.02];
edges.push({ a: SPINE_TOP, b: [SPINE_X, gap, D + 0.02] });

/* One request's journey: in at the top of the spine, down to a bay's port,
   into the bay, and back the way it came. Expressed as a polyline so the packet
   can be placed by arc length and never has to know about geometry. */
function route(bay: number): V3[] {
  const b = bays[bay];
  return [SPINE_TOP, [SPINE_X, b.port[1], D + 0.02], [0.12, b.port[1], D + 0.02]];
}

const lerp = (a: V3, b: V3, t: number): V3 => [
  a[0] + (b[0] - a[0]) * t,
  a[1] + (b[1] - a[1]) * t,
  a[2] + (b[2] - a[2]) * t,
];

/** Point at normalised distance along a polyline. */
function along(pts: V3[], t: number): V3 {
  const segs: number[] = [];
  let total = 0;
  for (let i = 0; i < pts.length - 1; i++) {
    const d = Math.hypot(
      pts[i + 1][0] - pts[i][0],
      pts[i + 1][1] - pts[i][1],
      pts[i + 1][2] - pts[i][2],
    );
    segs.push(d);
    total += d;
  }
  let want = Math.max(0, Math.min(1, t)) * total;
  for (let i = 0; i < segs.length; i++) {
    if (want <= segs[i]) return lerp(pts[i], pts[i + 1], segs[i] ? want / segs[i] : 0);
    want -= segs[i];
  }
  return pts[pts.length - 1];
}

/* Callouts.
   the reference site captions every photograph — MONACO 2023, MIAMI GP 2024 — and the
   captions are half of why that site reads as edited rather than assembled.
   The equivalent on an engineering drawing is a leader line and a figure, which
   is also the exact visual language of the work this site is about: the thing
   he built reads instrument tags off P&ID drawings for a living.
   The three figures are the real ones from the Nexus facts, so the centrepiece
   is carrying content rather than decoration. */
interface Callout {
  at: V3;
  /* Which side the label runs to, and how far out. */
  side: -1 | 1;
  out: number;
  k: string;
  v: string;
}

/* Placement is entirely about what else is on the hero.
   All three ran right at first and the lowest landed under the call to action.
   Moved left, the lowest then ran under the status card — "TOKENS TO THE CLOUD"
   came out as "KENS TO THE CLOUD". A leader line arguing with the interface is
   worse than no leader line, so they now live in the upper two thirds, which is
   the only region of this hero that belongs to the drawing alone. */
const CALLOUTS: Callout[] = [
  { at: [-W, H * 0.92, D], side: -1, out: 0.34, k: 'Models, local', v: '5' },
  { at: [W, H * 0.66, D], side: 1, out: 0.36, k: 'Largest', v: '122B' },
  { at: [W, H * 0.38, D], side: 1, out: 0.26, k: 'Tokens to the cloud', v: '0' },
];

interface Packet {
  bay: number;
  t: number;
  speed: number;
  /* Out to the bay, then back to the top. */
  dir: 1 | -1;
  wait: number;
}

export default function Machine() {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const still = reduced();

    /* `want` is where the cursor is, `have` is where the object has got to. The
       lag is what makes it feel like an object rather than a slider. */
    const want = { x: 0, y: 0, open: 0 };
    const have = { x: 0, y: 0, open: 0 };

    const onMove = (e: PointerEvent) => {
      const r = canvas.getBoundingClientRect();
      want.x = (e.clientX - (r.left + r.width / 2)) / (window.innerWidth / 2);
      want.y = (e.clientY - (r.top + r.height / 2)) / (window.innerHeight / 2);
      /* Opens on proximity rather than hover, because the canvas takes no
         pointer events — the object must never eat a click meant for the page. */
      const dx = Math.abs(e.clientX - (r.left + r.width / 2)) / (r.width / 2);
      want.open = Math.max(0, 1 - dx);
    };
    window.addEventListener('pointermove', onMove, { passive: true });

    let w = 0;
    let h = 0;
    const dpr = () => Math.min(window.devicePixelRatio || 1, 2);
    const size = () => {
      const r = canvas.getBoundingClientRect();
      w = r.width;
      h = r.height;
      if (!w || !h) return;
      canvas.width = Math.round(w * dpr());
      canvas.height = Math.round(h * dpr());
      ctx.setTransform(dpr(), 0, 0, dpr(), 0, 0);
    };
    size();
    const ro = new ResizeObserver(size);
    ro.observe(canvas);

    let visible = true;
    const io = new IntersectionObserver(([e]) => (visible = e.isIntersecting), { rootMargin: '80px' });
    io.observe(canvas);

    /* Three in flight at once: enough that the machine always looks busy, few
       enough that any one of them can be followed from the top to a bay and
       back, which is the whole point of drawing them. */
    const packets: Packet[] = Array.from({ length: 3 }, (_, i) => ({
      bay: (i * 2) % BAYS,
      t: -i * 0.4,
      speed: 0.55 + i * 0.08,
      dir: 1,
      wait: 0,
    }));
    /* How recently each bay was hit, for the flash. */
    const heat = new Array(BAYS).fill(0);

    let raf = 0;
    let prev = 0;

    const draw = (now: number) => {
      raf = requestAnimationFrame(draw);
      if (!visible || !w || !h) return;
      const dt = Math.min(0.05, prev ? (now - prev) / 1000 : 0.016);
      prev = now;

      have.x += (want.x - have.x) * 0.055;
      have.y += (want.y - have.y) * 0.055;
      have.open += (want.open - have.open) * 0.06;

      /* An idle sway, so it is alive before the cursor has touched it. */
      const idle = still ? 0 : Math.sin(now / 3400) * 0.06;
      const yaw = still ? -0.42 : -0.42 + have.x * 0.3 + idle;
      const pitch = still ? 0.16 : 0.16 + have.y * 0.09;

      const floor = h - 72;
      /* Dominant but contained. Fitting the bounding box left the rack half the
         height of its frame, which is a diagram; the correction overshot and
         burst it out of the frame on all four sides, which is worse — an object
         you cannot see the edges of stops being an object. The divisors below
         account for what the projection actually adds: yaw widens by the depth,
         pitch adds to the height, and neither shows up in W and H. */
      const scale = Math.min(w / (W * 4.6), (h - 190) / (H * 1.2));

      const project = (p: V3, dy = 0): [number, number] => {
        const [x, y0, z] = p;
        const y = y0 + dy;
        const cy = Math.cos(yaw);
        const sy = Math.sin(yaw);
        const x1 = x * cy - z * sy;
        const z1 = x * sy + z * cy;
        const cp = Math.cos(pitch);
        const sp = Math.sin(pitch);
        const y1 = y * cp - z1 * sp;
        const k = 1 / (1 + (z1 * cp + y * sp) * 0.16);
        return [w / 2 + x1 * scale * k, floor - y1 * scale * k];
      };

      const lift = (bay: number | undefined) =>
        bay === undefined ? 0 : have.open * (0.012 + bay * 0.016);

      ctx.clearRect(0, 0, w, h);

      /* ── traffic ─────────────────────────────────────────────────────── */
      if (!still) {
        for (const p of packets) {
          if (p.wait > 0) {
            p.wait -= dt;
          } else {
            p.t += p.speed * dt * p.dir;
            if (p.t >= 1 && p.dir === 1) {
              p.t = 1;
              p.dir = -1;
              p.wait = 0.18;
              heat[p.bay] = 1;
            } else if (p.t <= 0 && p.dir === -1) {
              p.t = 0;
              p.dir = 1;
              p.wait = 0.3 + Math.random() * 0.7;
              /* Next request goes wherever the router sends it. */
              p.bay = Math.floor(Math.random() * BAYS);
            }
          }
        }
      }
      for (let i = 0; i < BAYS; i++) heat[i] = Math.max(0, heat[i] - dt * 1.6);

      /* ── lit bays ────────────────────────────────────────────────────── */
      for (let i = 0; i < BAYS; i++) {
        const a = heat[i] * 0.6;
        if (a < 0.01) continue;
        const dy = lift(i);
        ctx.beginPath();
        bays[i].face.forEach((p, k) => {
          const [px, py] = project(p, dy);
          k === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
        });
        ctx.closePath();
        ctx.fillStyle = `rgba(255, 59, 48, ${a})`;
        ctx.fill();
      }

      /* ── structure ───────────────────────────────────────────────────── */
      ctx.lineWidth = 1;
      ctx.lineJoin = 'round';
      for (const e of edges) {
        const dy = lift(e.bay);
        const [ax, ay] = project(e.a, dy);
        const [bx, by] = project(e.b, dy);
        ctx.strokeStyle = e.shell ? 'rgba(236,236,242,0.46)' : 'rgba(236,236,242,0.2)';
        ctx.beginPath();
        ctx.moveTo(ax, ay);
        ctx.lineTo(bx, by);
        ctx.stroke();
      }

      /* ── callouts ────────────────────────────────────────────────────── */
      /* Dropped entirely on narrow screens. The leader runs `out` model units
         past the edge of the object and the label runs further still, so on a
         390px viewport "LARGEST 122B" is cut to "LARGEST 122" by the right edge
         of the canvas. There is nowhere to move them to at that width — the
         object is already the full width of the screen — and a caption clipped
         mid-figure is worse than no caption, because a number missing its last
         digit is not obviously missing anything. */
      ctx.font = '600 10px Mona Sans Variable, system-ui, sans-serif';
      ctx.letterSpacing = '0.14em';
      for (const c of w < 700 ? [] : CALLOUTS) {
        const [ax, ay] = project(c.at);
        const ex = ax + c.side * c.out * scale;
        ctx.strokeStyle = 'rgba(236,236,242,0.34)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(ax, ay);
        ctx.lineTo(ex, ay);
        ctx.stroke();
        ctx.fillStyle = 'rgba(236,236,242,0.9)';
        ctx.beginPath();
        ctx.arc(ax, ay, 2.2, 0, Math.PI * 2);
        ctx.fill();

        ctx.textAlign = c.side === 1 ? 'left' : 'right';
        const tx = ex + c.side * 8;
        ctx.fillStyle = 'rgba(236,236,242,0.5)';
        ctx.fillText(c.k.toUpperCase(), tx, ay - 7);
        ctx.font = '800 21px Mona Sans Variable, system-ui, sans-serif';
        ctx.letterSpacing = '-0.02em';
        ctx.fillStyle = 'rgba(236,236,242,0.92)';
        ctx.fillText(c.v, tx, ay + 15);
        ctx.font = '600 10px Mona Sans Variable, system-ui, sans-serif';
        ctx.letterSpacing = '0.14em';
      }
      ctx.letterSpacing = '0px';
      ctx.textAlign = 'left';

      /* ── packets ─────────────────────────────────────────────────────── */
      if (!still) {
        for (const p of packets) {
          const path = route(p.bay);
          const dy = lift(p.bay);
          /* A short trail rather than a dot: direction is the information, and
             a dot has none. */
          const head = along(path, p.t);
          const tail = along(path, Math.max(0, Math.min(1, p.t - 0.1 * p.dir)));
          const [hx, hy] = project(head, dy);
          const [tx, ty] = project(tail, dy);
          const g = ctx.createLinearGradient(tx, ty, hx, hy);
          g.addColorStop(0, 'rgba(255,59,48,0)');
          g.addColorStop(1, 'rgba(255,59,48,0.95)');
          ctx.strokeStyle = g;
          ctx.lineWidth = 2.5;
          ctx.beginPath();
          ctx.moveTo(tx, ty);
          ctx.lineTo(hx, hy);
          ctx.stroke();
          ctx.fillStyle = 'rgba(255,59,48,1)';
          ctx.beginPath();
          ctx.arc(hx, hy, 2.6, 0, Math.PI * 2);
          ctx.fill();
          ctx.lineWidth = 1;
        }
      }
    };
    raf = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      io.disconnect();
      window.removeEventListener('pointermove', onMove);
    };
  }, []);

  return <canvas ref={ref} className="hero-canvas" aria-hidden="true" />;
}
