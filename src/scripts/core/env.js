// Small environment helpers shared by every module.
export const html = document.documentElement;

const reduceQuery = matchMedia('(prefers-reduced-motion: reduce)');
export const reducedMotion = () => reduceQuery.matches;

// Touch-first devices get touch-friendly fallbacks (no hover-only effects).
export const isTouch = () => matchMedia('(hover: none), (pointer: coarse)').matches;

export const isSmall = () => innerWidth <= 760;

export const hasGL = () => !html.classList.contains('no-gl');

// As on Lando's: from the click until the new page is in, whatever is under
// the pointer looks as it does unhovered. The router marks the page and sends
// PAGE_CHANGE as a change starts and ends; scripted hovers listen for it.
export const PAGE_CHANGE = 'dk:pagechange';
export const changingPage = () => html.classList.contains('is-transitioning');

export const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
export const lerp = (a, b, t) => a + (b - a) * t;
export const smoothstep = (a, b, x) => {
  const t = clamp((x - a) / (b - a), 0, 1);
  return t * t * (3 - 2 * t);
};

export const wait = (ms) => new Promise((r) => setTimeout(r, ms));

// Hex like #c8102e -> [r, g, b] in 0..1
export const hexToRgb = (hex) => {
  const h = hex.replace('#', '');
  const n = parseInt(h.length === 3 ? h.split('').map((c) => c + c).join('') : h, 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
};

// Relative luminance, used to decide whether a project page is light or dark.
export const luminance = (hex) => {
  const [r, g, b] = hexToRgb(hex).map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
