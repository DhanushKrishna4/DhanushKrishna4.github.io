// The giant name that slides along the bottom of the opening screen.
// On its own it drifts at Dennis's pace; scrolling speeds it up and flips
// its direction to follow the scroll.
import { gsap } from 'gsap';
import { scrollVelocity } from './scroll.js';
import { reducedMotion } from './env.js';

// Dennis's goes once round its block in 18s (his index-new.js: roll() with
// duration 18). At the same font size his block ("Dennis Snellenberg —") is
// 0.856 the width of ours, measured at 390 to 1920 wide, so ours goes round
// in 18 / 0.856 = 21.03s and its letters move exactly as fast as his.
const PERIOD = 21.03;

export function setupMarquee(el) {
  const track = el?.querySelector('[data-marquee-track]');
  if (!track) return () => {};
  if (reducedMotion()) return () => {};

  let x = 0;
  let dir = -1;
  let width = track.children[0].getBoundingClientRect().width;
  const onResize = () => (width = track.children[0].getBoundingClientRect().width);
  addEventListener('resize', onResize);
  // Measured again once the font is in: the fallback's width is not the name's.
  document.fonts?.ready.then(onResize);

  const tick = (_, deltaMs) => {
    const v = scrollVelocity();
    if (Math.abs(v) > 0.4) dir = v > 0 ? -1 : 1;
    const speed = width / PERIOD + Math.min(Math.abs(v) * 28, 900);
    x += dir * speed * (deltaMs / 1000);
    if (x <= -width) x += width;
    if (x > 0) x -= width;
    track.style.transform = `translate3d(${x}px,0,0)`;
  };
  gsap.ticker.add(tick);

  return () => {
    gsap.ticker.remove(tick);
    removeEventListener('resize', onResize);
  };
}
