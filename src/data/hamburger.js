// Shapes for the menu button, Lando's rebuilt in SVG (the motion is in
// scripts/hamburger.js). Everything sits in a 120-unit square, the size of his
// Rive artboard; the button is drawn at 50px, as his is.
//
// Each bar is a 28.5-unit visible piece of a longer hidden path, traced from
// his frames. The top bar's path runs right, loops up round the right side and
// comes back down-left as the X's "/". The bottom bar's path runs left, climbs
// the left side, comes over the top and down-right as the "\".
export const HAM = {
  a: 'M50.5 53L83.1 53L84.08 52.98L84.46 52.96L84.82 52.91L85.31 52.78L86.61 52.27L88.08 51.83L88.43 51.69L88.78 51.51L89.26 51.19L89.71 50.81L90.26 50.25L90.9 49.52L91.25 49.07L91.53 48.58L91.75 48.05L91.9 47.49L91.96 47.1L92 46.71L92.01 45.92L91.97 45.13L91.87 44.55L91.68 43.8L91.36 42.88L91.2 42.52L91.01 42.18L90.68 41.7L90.42 41.41L90 41L89.56 40.62L89.26 40.38L88.94 40.17L88.6 39.98L88.25 39.82L87.88 39.7L87.51 39.6L87.12 39.54L86.73 39.5L86.13 39.47L85.34 39.47L84.54 39.48L83.95 39.53L83.56 39.59L83 39.73L82.64 39.87L82.29 40.03L80.16 41.24L79.84 41.45L79.39 41.81L78.53 42.62L50 71',
  b: 'M69.5 70L31.31 69.99L30.55 69.92L30.18 69.85L29.81 69.75L29.45 69.61L27.84 68.95L27.5 68.79L27.18 68.59L26.74 68.23L25.78 67.3L25.39 66.87L25.05 66.4L24.86 66.07L24.66 65.53L24.55 64.96L24.49 64.37L24.46 63.37L24.45 61.97L24.46 41.98L24.52 41.2L24.64 40.64L24.86 40.12L25.27 39.47L25.61 39L25.97 38.54L26.37 38.12L26.66 37.86L27.12 37.52L27.78 37.1L28.29 36.84L28.64 36.7L29.01 36.6L29.39 36.53L30.76 36.39L32.31 36.12L32.89 36.07L33.27 36.08L33.46 36.1L33.81 36.19L34.15 36.34L34.47 36.53L34.91 36.89L35.49 37.44L70 71',
  len: { a: 103.83, b: 132.79 },
  // Where the bars sit at rest, along their paths (start, end).
  rest: { a: [6, 34.5], b: [7, 35.5] },
  bar: 28.5,
  // The hover fill: a tall block whose lower edge is a curve 28.2 deep over its
  // width, lowest in the middle, with that lowest point at y = 0. It is moved
  // down to cover the button. The region under the same curve clips the dark
  // edge that shows for a moment after a click (all of the button, as it
  // sits).
  fill: 'M-10 -400H130V-28.2Q60 28.2-10-28.2Z',
  drain: 'M-10-28.2Q60 28.2 130-28.2V400H-10Z',
};
