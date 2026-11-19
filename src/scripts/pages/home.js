// Home: the opening screen (the 3D DK monogram, with the location, role and
// scrolling name), the intro with the red line and the curling project grid.
import { gsap } from 'gsap';
import { mountCommon } from './common.js';
import { setupMarquee } from '../core/marquee.js';
import { reducedMotion } from '../core/env.js';
import { createMonogram } from '../gl/monogram.js';
import { createLine } from '../gl/line.js';
import { createCards } from '../gl/cards.js';
import { setupFeatured } from '../core/featured.js';

export function mountHome(root, { gl }) {
  const common = mountCommon(root, { gl });
  const offMarquee = setupMarquee(root.querySelector('[data-marquee]'));
  const hero = root.querySelector('[data-hero]');
  const heroItems = root.querySelectorAll('[data-hero-item]');
  const marquee = root.querySelector('[data-marquee]');
  // "Selected work" enters as Lusion's "Featured Work" does.
  const offFeatured = setupFeatured(root.querySelector('[data-grid="home"]'));

  const layers = [];
  let monogram = null;
  let cards = null;
  if (gl) {
    monogram = gl.add(createMonogram(gl, hero));
    layers.push(monogram);
    layers.push(gl.add(createLine(gl, root.querySelector('[data-line="home"]'), 'home')));
    layers.push((cards = gl.add(createCards(gl, root.querySelector('[data-grid="home"]'), { mode: 'home' }))));
  }

  // Parallax: the scrolling name and the hero copy drift slower than the page.
  const parallax = reducedMotion()
    ? null
    : gsap
        .timeline({ scrollTrigger: { trigger: hero, start: 'top top', end: 'bottom top', scrub: true } })
        .to(marquee, { yPercent: 60, ease: 'none' }, 0)
        .to(heroItems, { yPercent: 40, ease: 'none' }, 0);

  if (!reducedMotion()) gsap.set([heroItems, marquee], { opacity: 0 });

  return {
    // The grid, for opening a project from its card and closing back to it.
    cards,
    // Arriving back from a project: text and cards are simply there.
    settle() {
      common.settle();
      cards?.settle();
    },
    intro({ fromLoader = false } = {}) {
      common.intro();
      cards?.intro();
      monogram?.intro({ fromLoader });
      if (reducedMotion()) return;
      gsap
        .timeline({ delay: fromLoader ? 0.6 : 0.2 })
        .fromTo(marquee, { opacity: 0, y: 80 }, { opacity: 1, y: 0, duration: 1.6, ease: 'expo.out' }, 0)
        .fromTo(heroItems, { opacity: 0, y: 30 }, { opacity: 1, y: 0, duration: 1.4, ease: 'expo.out', stagger: 0.12 }, 0.25);
    },
    destroy() {
      common.destroy();
      offMarquee();
      offFeatured();
      parallax?.scrollTrigger?.kill();
      parallax?.kill();
      layers.forEach((l) => gl?.remove(l));
    },
  };
}
