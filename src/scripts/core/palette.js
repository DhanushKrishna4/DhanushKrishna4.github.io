// Colours for things drawn over a page: the menu, and the page-change
// curtain leaving a project page.
// The menu's colours. Ours: an oxblood panel with darker lines, bone text,
// ember accents. On a project page, which brings its own palette, the same
// set in the project's colours: the panel and lines are its accent made as
// deep as oxblood and the lines are beside ember (the same OKLCH lightness
// and hue, chroma scaled by how saturated the accent is beside ember), the
// text is the page's light colour, the accents are its accent, and the bars
// on the button's fill take whichever of black or the text reads on it.
export const OURS = { bg: '#5c0a14', line: '#3f0610' };
const OK = { ember: [0.6481, 0.2063], panel: [0.308, 0.1128], line: [0.2413, 0.0855] };

const hexRgb = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16) / 255);
const rgbHex = (c) => `#${c.map((v) => Math.round(Math.min(1, Math.max(0, v)) * 255).toString(16).padStart(2, '0')).join('')}`;
const toLinear = (c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
const fromLinear = (c) => (c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055);
const toOklch = (rgb) => {
  const [r, g, b] = rgb.map(toLinear);
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  const A = 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s;
  const B = 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s;
  return [0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s, Math.hypot(A, B), Math.atan2(B, A)];
};
const fromOklch = ([L, C, h]) => {
  const a = C * Math.cos(h);
  const b = C * Math.sin(h);
  const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s = (L - 0.0894841775 * a - 1.291485548 * b) ** 3;
  return [
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
  ].map(fromLinear);
};
// The colour at lightness L and hue h, with as much of chroma C as sRGB holds.
const deep = (L, C, h) => {
  let c = C;
  const inside = (rgb) => rgb.every((v) => v >= -1e-4 && v <= 1 + 1e-4);
  while (c > 0 && !inside(fromOklch([L, c, h]))) c -= 0.002;
  return rgbHex(fromOklch([L, Math.max(0, c), h]));
};
const luminance = (hex) => {
  const [r, g, b] = hexRgb(hex).map(toLinear);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const contrast = (a, b) => {
  const [x, y] = [luminance(a), luminance(b)].sort((p, q) => q - p);
  return (x + 0.05) / (y + 0.05);
};

export function menuColours(palette) {
  if (!palette?.accent) return null;
  const [, C, h] = toOklch(hexRgb(palette.accent));
  const k = C / OK.ember[1];
  const ink = luminance(palette.fg) > luminance(palette.bg) ? palette.fg : palette.bg;
  return {
    bg: deep(OK.panel[0], OK.panel[1] * k, h),
    line: deep(OK.line[0], OK.line[1] * k, h),
    ink,
    accent: palette.accent,
    on: contrast('#000000', palette.accent) >= contrast(ink, palette.accent) ? '#000000' : ink,
  };
}

// The palette of the page on screen: a project page brings its own (on
// #swap); other pages have none (null).
export function pagePalette() {
  try {
    return JSON.parse(document.getElementById('swap')?.dataset.theme || 'null');
  } catch (e) {
    return null;
  }
}
