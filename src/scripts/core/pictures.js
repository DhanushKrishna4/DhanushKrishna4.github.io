// Pictures load before they are needed, as on sites with a loader: a page's
// own pictures load (and go to the graphics chip, gl/cards.js, gl/gallery.js)
// under the first visit's loader or the page-change cover, never while the
// page is being scrolled; the rest of the site's pictures then download in
// the background, so other pages find theirs already here.
//
// Not everything at once: all 23MB of the site's media (16MB of it the demo
// videos) would hold the loader a long time on a phone's connection, and
// every picture on the graphics chip together (about 340MB) is more than
// Safari allows a page on an iPhone. So videos load on their own pages, and
// only the page on screen keeps its pictures on the graphics chip.
import { wait } from './env.js';
import manifest from '../../data/media.json';
import cardArt from '../../data/card-art.json';

const loaded = (img) =>
  new Promise((done) => {
    img.addEventListener('load', done, { once: true });
    img.addEventListener('error', done, { once: true });
  });

// The pictures in `root` that load straight away (not lazy ones further along
// a gallery, which only start near the screen), once loaded or failed; never
// longer than `cap` ms.
export function picturesIn(root, cap = Infinity) {
  const pending = [...(root?.querySelectorAll('img') ?? [])].filter((img) => img.loading !== 'lazy' && !img.complete);
  if (!pending.length) return Promise.resolve();
  const all = Promise.all(pending.map(loaded));
  return Number.isFinite(cap) ? Promise.race([all, wait(cap)]) : all;
}

let fetching = false;

// Every other picture on the site (and the videos' still frames), one at a
// time, at low priority, into the browser's cache. Skipped when the phone
// asks to save data.
export function fetchTheRest() {
  if (fetching || navigator.connection?.saveData) return;
  fetching = true;
  const have = new Set([...document.images].map((img) => new URL(img.currentSrc || img.src, location.href).pathname));
  // the cards' pictures too, and their depth maps where a pointer can hover
  const hover = matchMedia('(hover: hover)').matches;
  const cards = Object.values(cardArt).flatMap((c) => (hover ? [c.src, c.depth] : [c.src]));
  const urls = [...new Set([...cards, ...Object.values(manifest).flat().map((m) => (m.video ? m.poster : m.src))].filter(Boolean))].filter((u) => !have.has(u));
  let i = 0;
  const next = () => {
    if (i >= urls.length) return;
    const img = new Image();
    img.decoding = 'async';
    img.fetchPriority = 'low';
    img.onload = img.onerror = next;
    img.src = urls[i++];
  };
  next();
}
