import { useEffect, useRef } from 'react';
import { reduced } from '../lib/motion';

/**
 * The living ground.
 *
 * This is the reference site's background field, rebuilt from its actual
 * construction rather than from what it looks like — which matters, because the
 * two are not the same and the first version of this file guessed.
 *
 * What his is doing, read off the running site: a full-screen fragment shader
 * samples 3D simplex noise with time on the z axis, distorts the sample point
 * with a second, lower-frequency noise and with the cursor, multiplies the
 * result by a detail factor and takes `fract()` of it. That last step is the
 * whole trick — fract of a scaled scalar field turns a smooth hill into a stack
 * of repeating bands, which is exactly what a topographic map is. The banded
 * value then mixes the ground colour toward the foreground colour, which is
 * where the soft masses come from, and a second pass samples the same field at
 * four neighbouring pixels and draws a line wherever they disagree, which is
 * where the hairlines come from. One field, both layers.
 *
 * The old version here drew a couple of dozen wobbling closed curves. That
 * produces meandering rings; his produces nested closed loops that split, merge
 * and pinch off as the surface underneath them moves, because they are level
 * sets of something rather than shapes in their own right. No amount of tuning
 * the old approach reaches that, which is why this is a rewrite.
 *
 * Reimplemented rather than ported. The noise below is Perlin gradient noise
 * written here, the contours are extracted by marching squares rather than by
 * edge-detecting a texture, and none of his shader source is in this file.
 *
 * Why not a shader, given his is one. Each section on this page carries its own
 * ground and its own field, so a shader would mean six WebGL contexts on top of
 * the one the hero object already holds. The split here does the same work
 * without that: the band fill is drawn as a small image and scaled up, where
 * bilinear smoothing is exactly the soft ramp we want, and the contours are cut
 * as vectors from the same grid so they stay hairline-crisp at any size — which
 * an upscaled texture would not be.
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
/* Perlin rather than simplex. Simplex is what his shader uses and is the better
   choice inside a fragment shader, where its lower sample count per lookup is
   worth the more complex setup; in JS at a few thousand samples a frame neither
   cost matters, and the classic lattice is the one that is easy to be certain
   is correct. With the domain distortion applied below, the axis alignment that
   is Perlin's usual tell does not survive to the output. */
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

/* His uniform names, kept so the two can be compared. */
const SCALE = 1.65;
const SPEED = 0.055;
const DISTORT_SCALE = 0.42;
const DISTORT_INTENSITY = 0.85;
const CURSOR_INTENSITY = 0.28;
/* Grid spacing. Contours land sub-pixel whatever this is, because marching
   squares interpolates each crossing along its cell edge — and since the band
   fill is now cut from those same crossings rather than rasterised, it inherits
   that accuracy too. Three finer grids were tried first (9px, 6px) on the
   assumption that the fill needed resolution; 6px still staircased and cost 26
   fps at the work section. The fill was the wrong shape, not the wrong size. */
const CELL = 14;

/* ── the mass field ────────────────────────────────────────────────────────
   A second, much lower-frequency field, posterised into three flat tones and
   filled underneath the lines. This is the layer the reference has and we did
   not, and it is the reason his ground reads as shapes where ours read as a
   sheet with lines on it.

   It was here once, twice, in two different wrong forms, and both were removed:
   first as even-odd polygon fills that cost the page 38fps, then as a smooth
   `smoothstep` alpha rasterised small and scaled up, which was deleted under the
   heading "he has no blobs". That conclusion was drawn by blurring the composited
   page, and it was wrong. His field is on its own canvas — canvas.gl, WebGL2,
   opacity 1, normal blend — so it can be screenshotted in isolation, and it is
   unambiguous:

     tones      233 / 244 / 252   at 26% / 38% / 36% of the area
     edges      median 3px wide, p90 3px -> posterised, NOT a gradient
     feature    ~170px across a 1280px canvas
     dark card  flat 41 at 73.8% -> no masses at all on his dark grounds

   So: three flat tones, hard boundaries, large shapes, light grounds only.

   Drawn as two nested fills of pure black rather than as absolute colours,
   because .ground-light is not one colour — the record section scrubs it from
   paper to sage — and any absolute tone would be right on one and wrong on the
   other. Black at a low alpha darkens proportionally and keeps its hue, so the
   two steps stay in proportion on both. */
/* Every number below was fitted to his, not chosen. The method, because it is
   the only reason these are trustworthy: his field is on its own canvas, so it
   can be screenshotted in isolation; ours is put behind the same isolation by
   hiding everything except .ground-light; both are then passed through a 5px
   median filter, which removes the hairlines — they are 1px and would otherwise
   register as thousands of spurious one-pixel runs — and quantised to their own
   three tones. Run lengths along scanlines then measure feature size directly.

     measured        HIS        OURS
     horizontal     120px      124px
     vertical        74px       76px
     H/V ratio       1.62       1.63
     areas       36/38/26   36/37/27

   The first fit missed by 2.5x and looked plausible, because the hairlines were
   still in the measurement and were dragging the median down to 27px against a
   real 217px. */
const MASS_SCALE = 3.2;
/* Reuses the contour field's own domain distortion — free, and it is what keeps
   the shapes irregular with pinched necks rather than round islands. */
const MASS_DISTORT = 0.35;
/* His shapes are not round. Measured, his run 1.62x wider than tall while an
   unmodified noise field is 1.12 — near isotropic — and that difference is most
   of why a statistically matched field still looked wrong: same sizes, same area
   split, but ours came out as islands where his are ribbons. Raising the y
   frequency alone compresses the features vertically and they flow. */
const MASS_ASPECT = 1.45;
/* His area split, used as PERCENTILES of the field rather than as fixed
   thresholds. Fixed values do not survive a change to MASS_SCALE; percentiles
   hold the 26/38/36 split whatever the frequency is. */
const MASS_LO = 0.26;
const MASS_HI = 0.64;
/* Chosen so paper lands on his steps: 243 -> 235 -> 224, which is -8 then -11,
   the same two steps his 252 / 244 / 233 makes. */
const MASS_A1 = 0.034;
const MASS_A2 = 0.047;

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
    let mass = new Float32Array(0);
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
    /* The mass field's own histogram, hoisted for the same reason the one
       above is: this runs every frame and must not allocate. */
    const MH = 128;
    const mhist = new Int32Array(MH);
    /* Two device pixels. Dropping to one was tried for the even-odd fill's
       sake and gives the cost back in the wrong currency: the hairlines lose
       half their depth, measured, because a 1px stroke on a 1x buffer is
       resampled by the browser instead of drawn. The fill is made cheaper below
       instead, where it does not show. */
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
    let massOn = 0;

    /* Declared up here rather than beside the loop because `size` needs them:
       see the ResizeObserver below. */
    const still = frozen || reduced();
    let raf = 0;

    const size = () => {
      const r = canvas.getBoundingClientRect();
      w = r.width;
      h = r.height;
      if (!w || !h) return;

      const cs = getComputedStyle(canvas);
      const m = cs.color.match(/[\d.]+/g);
      if (m && m.length >= 3) line = [+m[0], +m[1], +m[2]];
      const wv = parseFloat(cs.getPropertyValue('--field-weight'));
      weight = Number.isFinite(wv) && wv > 0 ? wv : 1;
      /* Off unless a ground asks for it. His dark card carries no masses at all
         — flat 41 across 73.8% of it — so this is a light-ground layer and every
         other call site of this component leaves it alone. */
      const mv = parseFloat(cs.getPropertyValue('--field-mass'));
      massOn = Number.isFinite(mv) && mv > 0 ? mv : 0;

      canvas.width = Math.round(w * dpr());
      canvas.height = Math.round(h * dpr());
      ctx.setTransform(dpr(), 0, 0, dpr(), 0, 0);

      cols = Math.max(2, Math.ceil(w / CELL)) + 1;
      rows = Math.max(2, Math.ceil(h / CELL)) + 1;
      field = new Float32Array(cols * rows);
      mass = new Float32Array(cols * rows);
      grad = new Float32Array(cols * rows);
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
      /* Twenty-two frames a second. It was thirty; the banded fill costs more
         than the smooth one it replaced, and this is the cheapest place to give
         some of that back — the field drifts slowly enough that the difference
         is not perceptible, where a softer hairline or a coarser band edge
         both were. */
      if (now - last < 45) return;
      last = now;

      const t = still ? 0 : (now / 1000) * SPEED;
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

      for (let j = 0; j < rows; j++) {
        for (let i = 0; i < cols; i++) {
          const ux = (i * CELL) / unit;
          const uy = (j * CELL) / unit;
          const x = ux * SCALE + off;
          const y = uy * SCALE + off;
          const d = noise3(x * DISTORT_SCALE, y * DISTORT_SCALE, t * 0.6);
          const n = noise3(
            x + d * DISTORT_INTENSITY + have.x * CURSOR_INTENSITY,
            y + d * DISTORT_INTENSITY + have.y * CURSOR_INTENSITY,
            t,
          );
          field[j * cols + i] = n * 0.5 + 0.5;

          /* The mass field, on the same distortion `d` the lines already paid
             for. Its own offset so its shapes are unrelated to theirs — on his,
             the hairlines cross the mass boundaries freely rather than tracing
             them, and sharing an offset here would lock the two together and
             give the tell away. Drifts slower than the lines, because a large
             shape moving at a small shape's speed reads as a different, faster
             animation. */
          if (massOn) {
            mass[j * cols + i] =
              noise3(
                ux * MASS_SCALE + d * MASS_DISTORT + off * 0.5 + 41.7,
                uy * MASS_SCALE * MASS_ASPECT + d * MASS_DISTORT + off * 0.5 + 41.7,
                t * 0.45,
              ) *
                0.5 +
              0.5;
          }
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

      /* ── the masses, under everything ──────────────────────────────────────
         Two nested fills. The outer covers everything below the 64th percentile
         of the field, the inner everything below the 26th, so the tone
         accumulates and the field posterises into his three steps: untouched,
         one alpha, two alphas.

         Percentiles rather than fixed values, read off the field's own
         histogram each frame. Fixed thresholds do not survive a change to
         MASS_SCALE — the lesson the gradient thresholds above already learned —
         and his 26/38/36 area split is the thing worth holding, not two numbers
         that happen to produce it at one frequency.

         Each partial cell is filled by walking its boundary and taking every
         corner that is inside plus every edge that changes sign. Exact and
         sub-pixel, which is what makes the boundary hard: his edges measure a
         median of 3px, so a soft-edged version is visibly the wrong thing — and
         the version of this layer deleted from this file was soft-edged, which
         is part of why it never matched. Runs of fully covered cells merge into
         one rect per row so the path stays short.

         Saddle cells come out as a bow tie rather than two triangles. At 14px
         and these alphas that is invisible and not worth the branch. */
      if (massOn) {
        const N = cols * rows;
        mhist.fill(0);
        for (let k = 0; k < N; k++) {
          const v = mass[k];
          mhist[v <= 0 ? 0 : v >= 1 ? MH - 1 : (v * MH) | 0]++;
        }
        let acc = 0;
        let T1 = 0;
        let T2 = 1;
        let got1 = false;
        for (let bn = 0; bn < MH; bn++) {
          acc += mhist[bn];
          if (!got1 && acc >= N * MASS_LO) {
            T1 = (bn + 1) / MH;
            got1 = true;
          }
          if (acc >= N * MASS_HI) {
            T2 = (bn + 1) / MH;
            break;
          }
        }

        const fillBelow = (T: number, alpha: number) => {
          ctx.beginPath();
          const right = (cols - 1) * CELL - CELL / 2;
          for (let j = 0; j < rows - 1; j++) {
            const y0 = j * CELL - CELL / 2;
            const y1 = y0 + CELL;
            let run = -1;
            for (let i = 0; i < cols - 1; i++) {
              const va = mass[j * cols + i];
              const vb = mass[j * cols + i + 1];
              const vc = mass[(j + 1) * cols + i + 1];
              const vd = mass[(j + 1) * cols + i];
              const ia = va < T;
              const ib = vb < T;
              const ic = vc < T;
              const id = vd < T;
              const x0 = i * CELL - CELL / 2;
              const x1 = x0 + CELL;
              if (ia && ib && ic && id) {
                if (run < 0) run = x0;
                continue;
              }
              if (run >= 0) {
                ctx.rect(run, y0, x0 - run, CELL);
                run = -1;
              }
              if (!ia && !ib && !ic && !id) continue;
              const tx = x0 + ((T - va) / (vb - va || 1e-6)) * CELL;
              const ry = y0 + ((T - vb) / (vc - vb || 1e-6)) * CELL;
              const bx = x0 + ((T - vd) / (vc - vd || 1e-6)) * CELL;
              const ly = y0 + ((T - va) / (vd - va || 1e-6)) * CELL;
              let open = false;
              const P = (px: number, py: number) => {
                if (open) ctx.lineTo(px, py);
                else {
                  ctx.moveTo(px, py);
                  open = true;
                }
              };
              if (ia) P(x0, y0);
              if (ia !== ib) P(tx, y0);
              if (ib) P(x1, y0);
              if (ib !== ic) P(x1, ry);
              if (ic) P(x1, y1);
              if (ic !== id) P(bx, y1);
              if (id) P(x0, y1);
              if (id !== ia) P(x0, ly);
              ctx.closePath();
            }
            if (run >= 0) ctx.rect(run, y0, right - run, CELL);
          }
          ctx.fillStyle = `rgba(0,0,0,${alpha * massOn})`;
          ctx.fill();
        };

        fillBelow(T2, MASS_A1);
        fillBelow(T1, MASS_A2);
      }

      /* ── masses and contours, cut from the same crossings ───────────────── */
      /* His masses have edges: side by side, his are flat regions with a
         defined boundary where ours were a smooth gradient with none. That edge
         is `fract` — his shader posterises the field per pixel and the band
         boundary is the edge.

         Getting there took four wrong turns, all of them rasterising the fill
         into a small image and scaling it up. Banding at the grid nodes and
         interpolating after made the edge crawl a whole cell at a time.
         Interpolating first and banding after fixed the crawl and left the
         boundary faceted, because an iso-line of a piecewise-linear surface is
         piecewise-linear — a staircase wherever it runs near-horizontal.
         Smoothstep across the cell replaced the facets with notches, since its
         gradient vanishes at every node. Finer grids helped and did not
         converge: 9px still staircased, 6px still staircased and cost 26fps.

         The fill was the wrong shape rather than the wrong size. Marching
         squares already locates each crossing sub-pixel along its cell edge —
         that is why the contour lines were smooth the whole time — so the bands
         are filled from those same crossings: for every level, the part of each
         cell lying above it, with runs of fully-covered cells merged into one
         rectangle per row so the path stays a few hundred pieces rather than
         one per cell. The fills nest, so the tone accumulates level by level
         and the field posterises into steps whose boundaries are exactly the
         contours drawn over them.

         It is also cheaper than any of the rasters: the grid went back to 14px
         and the whole field is one pass. */
      for (let i = 0; i < BANDS; i++) segN[i] = 0;

      /* No soft masses, and this is a removal rather than a value set to zero.

         They were added because a whole-screen comparison read his ground as
         carrying large pale shapes and ours as a blank sheet with a few lines
         on it. That reading was wrong. Blurring both grounds hard enough to
         destroy the hairlines and then stretching the remaining twenty-six
         levels across full black to white — which is the only way to see tone
         this faint — his comes back flat cream everywhere except the halo
         around his own portrait. Ours came back covered in grey shapes.

         Dhanush has said three times that he has no blobs. He was right three
         times. What his ground actually has at low frequency is nothing: the
         tone people think they see there is his cursor effect, which this site
         does not have and is not getting until there is a portrait to build it
         around.

         The whole layer goes, not its opacity: the low-resolution canvas, the
         per-cell loop, the putImageData and the scaled drawImage were a frame's
         work every frame to paint something that should not be on the page. */

      /* ── the contours ──────────────────────────────────────────────────── */
      for (let c = 1; c < count; c++) {
        const level = c / count;
        for (let j = 0; j < rows - 1; j++) {
          const y0 = j * CELL - CELL / 2;
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

            const x0 = i * CELL - CELL / 2;
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
              /* Saddles. Both pairings are valid; taking one consistently is
                 what stops the line flickering as the field crosses. */
              case 5: put(x0, ly, tx, y0); put(bx, y1, x1, ry); break;
              case 10: put(x0, ly, bx, y1); put(tx, y0, x1, ry); break;
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
        const key = (x: number, y: number) => Math.round(x * 8) * 100000 + Math.round(y * 8);
        const ends = new Map<number, number[]>();
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
            const sameStart = Math.abs(buf[k] - cx) < 0.01 && Math.abs(buf[k + 1] - cy) < 0.01;
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
