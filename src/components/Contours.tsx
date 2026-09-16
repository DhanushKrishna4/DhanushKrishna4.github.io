import { useEffect, useRef } from 'react';
import { reduced } from '../lib/motion';

/**
 * Animated contour strokes sampled from a gently warped scalar field.
 * Static panels use the same field at its starting time. Independent x/y warps
 * preserve broad rounded bends instead of stretching them into diagonal loops.
 * A coarse sampling grid keeps the canvas inexpensive; connected quadratic
 * paths keep the strokes smooth at display resolution.
 */

interface Props {
  /* Distinct per section, so no two grounds carry the same field. */
  seed?: number;
  /* Contour interval — how many bands the field is cut into. */
  count?: number;
  /* Draw one frame and stop. His menu panel's field is static — the page behind
     it is still moving, and two fields drifting at once behind a stack of
     display type is one more than the eye wants. */
  still?: boolean;
}

/* ── 3D gradient noise ───────────────────────────────────────────────────── */
/* Deterministic 3D Perlin noise. Time moves through the third dimension;
   a noninteger starting slice avoids grid-aligned frozen panels. */
const PERM = new Uint8Array(512);
{
  const p = new Uint8Array(256);
  for (let i = 0; i < 256; i++) p[i] = i;
  /* Fixed shuffle: the field must be identical on every load, or a reload
     silently changes the background and a screenshot can never be compared. */
  let s = 1;
  for (let i = 255; i > 0; i--) {
    s = (s * 1664525 + 1013904223) >>> 0;
    const j = s % (i + 1);
    const t = p[i];
    p[i] = p[j];
    p[j] = t;
  }
  for (let i = 0; i < 512; i++) PERM[i] = p[i & 255];
}

const fade = (t: number) => t * t * t * (t * (t * 6 - 15) + 10);

function grad(hash: number, x: number, y: number, z: number): number {
  const h = hash & 15;
  const u = h < 8 ? x : y;
  const v = h < 4 ? y : h === 12 || h === 14 ? x : z;
  return (h & 1 ? -u : u) + (h & 2 ? -v : v);
}

/** −1..1. */
function noise3(x: number, y: number, z: number): number {
  const X = Math.floor(x) & 255;
  const Y = Math.floor(y) & 255;
  const Z = Math.floor(z) & 255;
  x -= Math.floor(x);
  y -= Math.floor(y);
  z -= Math.floor(z);
  const u = fade(x);
  const v = fade(y);
  const w = fade(z);
  const A = PERM[X] + Y;
  const AA = PERM[A] + Z;
  const AB = PERM[A + 1] + Z;
  const B = PERM[X + 1] + Y;
  const BA = PERM[B] + Z;
  const BB = PERM[B + 1] + Z;

  const lerp = (a: number, b: number, t: number) => a + t * (b - a);
  return lerp(
    lerp(
      lerp(grad(PERM[AA], x, y, z), grad(PERM[BA], x - 1, y, z), u),
      lerp(grad(PERM[AB], x, y - 1, z), grad(PERM[BB], x - 1, y - 1, z), u),
      v,
    ),
    lerp(
      lerp(grad(PERM[AA + 1], x, y, z - 1), grad(PERM[BA + 1], x - 1, y, z - 1), u),
      lerp(grad(PERM[AB + 1], x, y - 1, z - 1), grad(PERM[BB + 1], x - 1, y - 1, z - 1), u),
      v,
    ),
    w,
  );
}

/* Field scale is shared by moving sections and static panels. */
const SCALE = 1.65;
const SPEED = 0.055;
const DISTORT_SCALE = 0.42;
const DISTORT_INTENSITY = 0.24;
const CURSOR_INTENSITY = 0.28;
/* Subpixel edge interpolation and quadratic joins keep a 14px grid smooth
   without the cost of evaluating noise at screen resolution. */
const CELL = 14;
// Distortion varies much more slowly than the contours. Sample it on a coarser
// grid and interpolate to keep the rounded field within the original budget.
const WARP_STEP = 4;

export default function Contours({ seed = 1, count = 9, still: frozen = false }: Props) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;


    let w = 0;
    let h = 0;
    let cols = 0;
    let rows = 0;
    let field = new Float32Array(0);
    let warpCols = 0;
    let warpRows = 0;
    let warpX = new Float32Array(0);
    let warpY = new Float32Array(0);
    /* Segment buffers, one per weight band, allocated once and refilled each
       frame. Four numbers a segment; a full field runs to a couple of thousand
       across every level, so this is generous. */
    const BANDS = 3;
    const seg = Array.from({ length: BANDS }, () => new Float32Array(16384));
    const segN = new Array(BANDS).fill(0);
    /* Per-cell gradient, plus a histogram of it so the band thresholds can be
       percentiles of the field rather than constants. Fixed thresholds were the
       first attempt and they do not survive a change to SCALE or to the contour
       interval: picked by eye at 0.045 and 0.09 they put essentially every
       segment in the lowest band, and the median line came out at exactly the
       lowest alpha — 0.035 x 235 = 8.2 against a measured 8. */
    let grad = new Float32Array(0);
    const HIST = 96;
    const hist = new Int32Array(HIST);
    // Cap backing resolution at 2x while preserving thin antialiased strokes.
    const dpr = () => Math.min(window.devicePixelRatio || 1, 2);

    /* Read once, not per frame. The stylesheet sets `color` here and .on-dark
       overrides it, so the field never has to know which ground it is on — but
       getComputedStyle forces a style recalculation, and calling it thirty
       times a second in each of six sections is hundreds of synchronous recalcs
       a second to fetch a value that never changes. */
    /* One colour, because the field is one thing again: strokes. It was briefly
       two, to keep the measured olive off the mass fill — and then the mass fill
       turned out not to belong on the page at all, which makes the split dead
       weight and one more way for a token to feed something it was not meant
       to. */
    let line: [number, number, number] = [71, 71, 0];
    /* A per-ground multiplier on the band alphas, read from the stylesheet for
       the same reason the colour is: the field should not have to know which
       ground it is on. Every section wants the alphas as tuned; the menu panel
       is the one place that wants them lighter, because his panel field is a
       different thing from his page field and is measurably shallower. */
    let weight = 1;

    /* Declared up here rather than beside the loop because `size` needs them:
       see the ResizeObserver below. */
    const still = frozen || reduced();
    let raf = 0;

    const size = () => {
      // The hero scales this canvas during scrolling. Its transformed bounds
      // can be much smaller than its layout box, leaving a stretched, blurry
      // field when it expands again without another layout resize.
      const cs = getComputedStyle(canvas);
      w = parseFloat(cs.width);
      h = parseFloat(cs.height);
      if (!w || !h) return;

      const m = cs.color.match(/[\d.]+/g);
      if (m && m.length >= 3) line = [+m[0], +m[1], +m[2]];
      const wv = parseFloat(cs.getPropertyValue('--field-weight'));
      weight = Number.isFinite(wv) && wv > 0 ? wv : 1;

      canvas.width = Math.round(w * dpr());
      canvas.height = Math.round(h * dpr());
      ctx.setTransform(dpr(), 0, 0, dpr(), 0, 0);

      cols = Math.max(2, Math.ceil(w / CELL)) + 1;
      rows = Math.max(2, Math.ceil(h / CELL)) + 1;
      field = new Float32Array(cols * rows);
      grad = new Float32Array(cols * rows);
      warpCols = Math.ceil((cols - 1) / WARP_STEP) + 1;
      warpRows = Math.ceil((rows - 1) / WARP_STEP) + 1;
      warpX = new Float32Array(warpCols * warpRows);
      warpY = new Float32Array(warpCols * warpRows);
    };
    size();
    /* Setting canvas.width clears the canvas — that is what assigning to it
       does, and it is the whole reason this is not just `new ResizeObserver(
       size)`. A moving field redraws on the next frame and never notices. A
       frozen one has already cancelled its loop, so the resize wiped it and
       nothing was ever going to put it back.

       Measured before the fix: on a viewport that settles after first paint —
       which is every viewport, since the loader unmounts into a taller
       document — the hero's field painted 36% of its pixels and then went to
       exactly 0 under `prefers-reduced-motion: reduce`. A blank white page
       behind the object, for the visitors least able to tell it was a bug. The
       menu panel had the same hole against a window resize while open. */
    const ro = new ResizeObserver(() => {
      size();
      if (still && !raf) raf = requestAnimationFrame(draw);
    });
    ro.observe(canvas);

    /* Only run while the section is on screen. Six of these on one page all
       animating off-screen is six rAF loops nobody is looking at. */
    let visible = true;
    const io = new IntersectionObserver(([e]) => (visible = e.isIntersecting), { rootMargin: '120px' });
    io.observe(canvas);

    /* The cursor pushes the sample point around, as his does. Smoothed, because
       the field is slow and a pointer that snaps makes it look like two
       unrelated animations sharing a canvas. */
    const want = { x: 0, y: 0 };
    const have = { x: 0, y: 0 };
    const onMove = (e: PointerEvent) => {
      const r = canvas.getBoundingClientRect();
      want.x = (e.clientX - r.left) / Math.max(1, r.width) - 0.5;
      want.y = (e.clientY - r.top) / Math.max(1, r.height) - 0.5;
    };
    if (!still) window.addEventListener('pointermove', onMove, { passive: true });

    let last = 0;

    const draw = (now: number) => {
      raf = requestAnimationFrame(draw);
      if (!visible || !w || !h) return;
      // About 22fps is enough for this slow drift and keeps canvas work bounded.
      if (now - last < 45) return;
      last = now;

      // A noninteger starting slice keeps frozen fields off the Perlin lattice.
      const t = 0.73 + (still ? 0 : (now / 1000) * SPEED);
      /* A frozen field paints once. Leaving the loop running to re-draw an
         identical frame thirty times a second is the kind of thing that only
         shows up on a battery. */
      have.x += (want.x - have.x) * 0.06;
      have.y += (want.y - have.y) * 0.06;

      /* Sampled in the shorter dimension's units so the field does not stretch
         with the viewport — a contour map that squashes when the window is
         resized stops reading as terrain. */
      const unit = Math.min(w, h);
      const off = seed * 13.37;

      for (let j = 0; j < warpRows; j++) {
        const y = ((j * WARP_STEP * CELL) / unit * SCALE + off) * DISTORT_SCALE;
        for (let i = 0; i < warpCols; i++) {
          const x = ((i * WARP_STEP * CELL) / unit * SCALE + off) * DISTORT_SCALE;
          const k = j * warpCols + i;
          warpX[k] = noise3(x + 7.1, y, t * 0.6);
          warpY[k] = noise3(x, y + 19.3, t * 0.6);
        }
      }

      for (let j = 0; j < rows; j++) {
        const wy = Math.min(Math.floor(j / WARP_STEP), warpRows - 2);
        const fy = j / WARP_STEP - wy;
        const y = ((j * CELL) / unit) * SCALE + off;
        for (let i = 0; i < cols; i++) {
          const x = ((i * CELL) / unit) * SCALE + off;
          const wx = Math.min(Math.floor(i / WARP_STEP), warpCols - 2);
          const fx = i / WARP_STEP - wx;
          const k = wy * warpCols + wx;
          const a = (1 - fx) * (1 - fy);
          const b = fx * (1 - fy);
          const c = (1 - fx) * fy;
          const d = fx * fy;
          // Independent, gentle warps keep bends rounded. Applying one large
          // displacement to both axes sheared the field into diagonal spindles.
          const dx = a * warpX[k] + b * warpX[k + 1] + c * warpX[k + warpCols] + d * warpX[k + warpCols + 1];
          const dy = a * warpY[k] + b * warpY[k + 1] + c * warpY[k + warpCols] + d * warpY[k + warpCols + 1];
          const n = noise3(
            x + dx * DISTORT_INTENSITY + have.x * CURSOR_INTENSITY,
            y + dy * DISTORT_INTENSITY + have.y * CURSOR_INTENSITY,
            t,
          );
          field[j * cols + i] = n * 0.5 + 0.5;
        }
      }

      /* Gradient once per cell rather than once per cell per level, and a
         histogram alongside it. Two thresholds come off that histogram below. */
      hist.fill(0);
      let gMax = 1e-6;
      for (let j = 0; j < rows - 1; j++) {
        for (let i = 0; i < cols - 1; i++) {
          const a = field[j * cols + i];
          const b = field[j * cols + i + 1];
          const cc = field[(j + 1) * cols + i + 1];
          const dd = field[(j + 1) * cols + i];
          const g = Math.abs(b + cc - a - dd) + Math.abs(cc + dd - a - b);
          grad[j * cols + i] = g;
          if (g > gMax) gMax = g;
        }
      }
      for (let j = 0; j < rows - 1; j++)
        for (let i = 0; i < cols - 1; i++)
          hist[Math.min(HIST - 1, (grad[j * cols + i] / gMax * HIST) | 0)]++;
      const total = (rows - 1) * (cols - 1);
      let acc = 0;
      let t1 = gMax;
      let t2 = gMax;
      for (let h = 0; h < HIST; h++) {
        acc += hist[h];
        if (t1 === gMax && acc >= total * 0.55) t1 = ((h + 1) / HIST) * gMax;
        if (acc >= total * 0.88) { t2 = ((h + 1) / HIST) * gMax; break; }
      }

      ctx.clearRect(0, 0, w, h);

      // Strokes only: all levels share the sampled field, with no filled bands.
      for (let i = 0; i < BANDS; i++) segN[i] = 0;

      /* ── the contours ──────────────────────────────────────────────────── */
      for (let c = 1; c < count; c++) {
        const level = c / count;
        for (let j = 0; j < rows - 1; j++) {
          const y0 = j * CELL;
          const y1 = y0 + CELL;
          for (let i = 0; i < cols - 1; i++) {
            const a = field[j * cols + i];
            const b = field[j * cols + i + 1];
            const cc = field[(j + 1) * cols + i + 1];
            const dd = field[(j + 1) * cols + i];
            let code = 0;
            if (a > level) code |= 8;
            if (b > level) code |= 4;
            if (cc > level) code |= 2;
            if (dd > level) code |= 1;
            if (code === 0 || code === 15) continue;

            const x0 = i * CELL;
            const x1 = x0 + CELL;
            const tx = x0 + ((level - a) / (b - a || 1e-6)) * CELL;
            const ry = y0 + ((level - b) / (cc - b || 1e-6)) * CELL;
            const bx = x0 + ((level - dd) / (cc - dd || 1e-6)) * CELL;
            const ly = y0 + ((level - a) / (dd - a || 1e-6)) * CELL;

            /* His outline pass is an edge detector on the banded value, so the
               strength of one of his lines *is* the local gradient — measured,
               his depths run 9.3 at the median to 21.6 at the top tenth where
               ours were a flat 21 everywhere. */
            const g = grad[j * cols + i];
            const bnd = g > t2 ? 2 : g > t1 ? 1 : 0;
            const buf = seg[bnd];
            let n = segN[bnd];
            const put = (ax: number, ay: number, bx2: number, by2: number) => {
              if (n + 4 > buf.length) return;
              buf[n] = ax; buf[n + 1] = ay; buf[n + 2] = bx2; buf[n + 3] = by2;
              n += 4;
            };
            switch (code) {
              case 1: case 14: put(x0, ly, bx, y1); break;
              case 2: case 13: put(bx, y1, x1, ry); break;
              case 3: case 12: put(x0, ly, x1, ry); break;
              case 4: case 11: put(tx, y0, x1, ry); break;
              case 6: case 9: put(tx, y0, bx, y1); break;
              case 7: case 8: put(x0, ly, tx, y0); break;
              // The asymptotic decider follows the actual surface at a saddle.
              // A fixed pairing produces sharp pinches as two contours meet.
              case 5: case 10: {
                const q = (a - level) * (cc - level) - (b - level) * (dd - level);
                if (q > 0) {
                  put(tx, y0, x1, ry); put(x0, ly, bx, y1);
                } else {
                  put(x0, ly, tx, y0); put(bx, y1, x1, ry);
                }
                break;
              }
            }
            segN[bnd] = n;
          }
        }
      }

      /* Chained and smoothed before stroking.
         Marching squares emits one straight segment per cell, so a contour is a
         polyline whose joints are visible wherever it turns — at 3x zoom our
         bends were two straight runs meeting at a corner where his are true
         curves, because his are evaluated per pixel. Shrinking the cell helps
         and costs noise: 10px was smoother and took the page to 47fps.

         Cheaper and better: link the segments back into runs by their shared
         endpoints — the crossing on a shared cell edge is computed from the
         same two corner values on both sides, so the coordinates match exactly
         — and draw each run through the midpoints with quadratic curves. Every
         joint becomes a curve rather than a corner, at the cell size that was
         already affordable. */
      const smooth = (buf: Float32Array, n: number) => {
        const count2 = n >> 2;
        // Shared edges have identical Float32 endpoints. Rounding to 1/8px
        // merged distinct crossings near a saddle, creating tiny false hooks.
        const key = (x: number, y: number) => `${x},${y}`;
        const ends = new Map<string, number[]>();
        for (let i = 0; i < count2; i++) {
          const k = i << 2;
          for (const kk of [key(buf[k], buf[k + 1]), key(buf[k + 2], buf[k + 3])]) {
            const a = ends.get(kk);
            if (a) a.push(i);
            else ends.set(kk, [i]);
          }
        }
        const used = new Uint8Array(count2);
        const px: number[] = [];
        const py: number[] = [];
        /* Follows from one end of a segment, consuming as it goes. */
        const walk = (from: number, x: number, y: number, push: (a: number, b: number) => void) => {
          let cx = x;
          let cy = y;
          let cur = from;
          for (;;) {
            const list = ends.get(key(cx, cy));
            if (!list) return;
            let nxt = -1;
            for (const c of list) if (c !== cur && !used[c]) { nxt = c; break; }
            if (nxt < 0) return;
            used[nxt] = 1;
            const k = nxt << 2;
            const sameStart = buf[k] === cx && buf[k + 1] === cy;
            cx = sameStart ? buf[k + 2] : buf[k];
            cy = sameStart ? buf[k + 3] : buf[k + 1];
            push(cx, cy);
            cur = nxt;
          }
        };
        for (let i = 0; i < count2; i++) {
          if (used[i]) continue;
          used[i] = 1;
          const k = i << 2;
          px.length = 0;
          py.length = 0;
          px.push(buf[k], buf[k + 2]);
          py.push(buf[k + 1], buf[k + 3]);
          walk(i, buf[k + 2], buf[k + 3], (a, b) => { px.push(a); py.push(b); });
          walk(i, buf[k], buf[k + 1], (a, b) => { px.unshift(a); py.unshift(b); });
          if (px.length === 2) {
            ctx.moveTo(px[0], py[0]);
            ctx.lineTo(px[1], py[1]);
            continue;
          }
          const end = px.length - 1;
          if (px[0] === px[end] && py[0] === py[end]) {
            // Smooth the closing join too; an open stroke leaves a cusp at the
            // first point even when every other joint on the loop is rounded.
            ctx.moveTo((px[end - 1] + px[0]) / 2, (py[end - 1] + py[0]) / 2);
            for (let j = 0; j < end; j++) {
              const next = (j + 1) % end;
              ctx.quadraticCurveTo(px[j], py[j], (px[j] + px[next]) / 2, (py[j] + py[next]) / 2);
            }
            ctx.closePath();
            continue;
          }
          ctx.moveTo(px[0], py[0]);
          for (let j = 1; j < px.length - 1; j++) {
            ctx.quadraticCurveTo(px[j], py[j], (px[j] + px[j + 1]) / 2, (py[j] + py[j + 1]) / 2);
          }
          ctx.lineTo(px[px.length - 1], py[py.length - 1]);
        }
      };

      /* One stroke per weight band. Alphas chosen so the distribution lands on
         his: the median line near 9 below the local ground and the strongest
         near 21, rather than every line at 21. */
      ctx.lineWidth = 1;
      /* Set against his, measured. With --field-ink carrying his hue, these
         land our strokes on his depth below paper: median 15.4 against his
         14.4. They are not the old numbers scaled — the old ink was near-black
         and these are for an ink less than a third as deep, so the alphas rise
         even though the lines get lighter. */
      const alpha = [0.11, 0.17, 0.285];
      for (let bnd = 0; bnd < BANDS; bnd++) {
        const n = segN[bnd];
        if (!n) continue;
        const buf = seg[bnd];
        ctx.beginPath();
        smooth(buf, n);
        ctx.strokeStyle = `rgba(${line[0]},${line[1]},${line[2]},${alpha[bnd] * weight})`;
        ctx.stroke();
      }

      if (still) {
        cancelAnimationFrame(raf);
        raf = 0;
      }
    };
    raf = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      io.disconnect();
      window.removeEventListener('pointermove', onMove);
    };
  }, [seed, count, frozen]);

  return <canvas ref={ref} className="contours" aria-hidden="true" />;
}
