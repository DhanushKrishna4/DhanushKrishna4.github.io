// "404" drawn in the DK monogram's own geometry (public/favicon.svg), for the
// 404 page: Lando's has his two 4s in his LN4 mark's lettering, ours are in
// the DK's. Measured from the monogram, in its 256-unit drawing:
//  - letters 129.08 tall (y 63.46 to 192.54);
//  - strokes 27.43 thick, upright and at 45 degrees;
//  - corners cut at 45 degrees, 16.14 along each side (the D's two right
//    corners), which is also the width of its stripes;
//  - everything sheared 12 degrees, the D's left edge rising 0.2126 to the
//    right for every unit up.
// The digits are laid out upright, y down, then sheared about their middle.
// Plain numbers only, so the page (flat fallback) and WebGL share them.

export const H = 129.08;
export const STROKE = 27.43;
export const CUT = 16.14;
export const SLANT = 0.2126;

// The 4, open at the top as Lando's is: a left stroke, a bar across 80% of
// the way down, and the stem, whose top starts a stroke lower. The stem's
// top right and the bar's bottom left (the sharp corners once slanted) are
// cut.
const W4 = STROKE * 3;
const BAR = H * 0.8;
function four(x) {
  const top = STROKE;
  return [
    [0, 0],
    [STROKE, 0],
    [STROKE, BAR - STROKE],
    [W4 - STROKE, BAR - STROKE],
    [W4 - STROKE, top],
    [W4 - CUT, top],
    [W4, top + CUT],
    [W4, H],
    [W4 - STROKE, H],
    [W4 - STROKE, BAR],
    [CUT, BAR],
    [0, BAR - CUT],
  ].map(([px, py]) => [x + px, py]);
}

// The 0, as wide as the monogram's D, with the same two corners cut as the
// 4s and a plain counter a stroke in from every side.
const W0 = 100.03;
function zero(x) {
  const outer = [
    [0, 0],
    [W0 - CUT, 0],
    [W0, CUT],
    [W0, H],
    [CUT, H],
    [0, H - CUT],
  ].map(([px, py]) => [x + px, py]);
  const counter = [
    [STROKE, STROKE],
    [W0 - STROKE, STROKE],
    [W0 - STROKE, H - STROKE],
    [STROKE, H - STROKE],
  ].map(([px, py]) => [x + px, py]);
  return { outer, holes: [counter] };
}

// Between the digits: one stripe's width, the monogram's own gap.
const GAP = CUT;

const slant = (shape) => shape.map(([x, y]) => [x + SLANT * (H / 2 - y), y]);

// The three digits as { outer, holes } polygons, y down, slanted, with the
// whole word's box starting at 0,0.
export function notFoundShapes() {
  const x0 = W4 + GAP;
  const x4 = x0 + W0 + GAP;
  const z = zero(x0);
  const raw = [
    { outer: four(0), holes: [] },
    { outer: z.outer, holes: z.holes },
    { outer: four(x4), holes: [] },
  ].map((s) => ({ outer: slant(s.outer), holes: s.holes.map(slant) }));
  const xs = raw.flatMap((s) => s.outer.map((p) => p[0]));
  const minX = Math.min(...xs);
  const width = Math.max(...xs) - minX;
  const move = (shape) => shape.map(([x, y]) => [x - minX, y]);
  return {
    width,
    height: H,
    shapes: raw.map((s) => ({ outer: move(s.outer), holes: s.holes.map(move) })),
  };
}

// The same, as one SVG path (even-odd), for drawing it flat.
export function notFoundPath() {
  const { width, height, shapes } = notFoundShapes();
  const ring = (points) => `M${points.map(([x, y]) => `${+x.toFixed(2)},${+y.toFixed(2)}`).join(' L')} Z`;
  const d = shapes.map((s) => [s.outer, ...s.holes].map(ring).join(' ')).join(' ');
  return { d, viewBox: `0 0 ${+width.toFixed(2)} ${height}`, width, height };
}
