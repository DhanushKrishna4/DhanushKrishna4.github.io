// Work: Lusion's Projects page (the giant title, its count and arrow) with
// our filters, and the grid of Lusion's cards drawn in WebGL with Unseen's
// fold as they scroll up (gl/cards.js).
import { mountCommon } from './common.js';
import { createCards } from '../gl/cards.js';
import { jumpTo, refreshScroll } from '../core/scroll.js';

export function mountWork(root, { gl }) {
  const common = mountCommon(root, { gl });
  const section = root.querySelector('[data-grid="work"]');
  const cards = [...root.querySelectorAll('[data-card]')];
  const buttons = [...root.querySelectorAll('[data-filter]')];
  const layer = gl ? gl.add(createCards(gl, section, { mode: 'work' })) : null;

  const apply = (id) => {
    buttons.forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.filter === id)));
    const change = () => {
      cards.forEach((c) => {
        c.hidden = id !== 'all' && !c.dataset.tags.split(' ').includes(id);
      });
      jumpTo(0);
      refreshScroll();
    };
    if (layer) layer.filter(change);
    else change();
  };

  const onClick = (e) => {
    const b = e.target.closest('[data-filter]');
    if (b) apply(b.dataset.filter);
  };
  section.addEventListener('click', onClick);

  return {
    // The grid, for opening a project from its card and closing back to it.
    cards: layer,
    // Arriving back from a project: text and cards are simply there.
    settle() {
      common.settle();
      layer?.settle();
    },
    intro() {
      common.intro();
      layer?.intro();
    },
    destroy() {
      common.destroy();
      section.removeEventListener('click', onClick);
      gl?.remove(layer);
    },
  };
}
