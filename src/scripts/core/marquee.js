// The giant name that slides along the bottom of the opening screen, as on
// Dennis's. It rolls at a steady pace, and whenever the scroll changes
// direction it eases through a stop and rolls the other way. On computers it
// also drifts sideways with the scroll, so it races ahead while the page moves
// and settles back to its pace when the page stops. Phones, tablets and
// windows under 1024px wide get no drift.
import { gsap } from 'gsap';
import { scrollY } from './scroll.js';
import { reducedMotion } from './env.js';

// Dennis's goes once round its block in 18s (his index-new.js: roll() with
// duration 18). At the same font size his block ("Dennis Snellenberg —") is
// 0.856 the width of ours, measured at 390 to 1920 wide, so ours goes round
// in 18 / 0.856 = 21.03s and its letters move exactly as fast as his.
const PERIOD = 21.03;

// His turn: on a change of scroll direction he tweens the roll's timeScale to
// 1 or -1 with GSAP's defaults, 0.5s and power1.out (measured: through zero at
// about 0.15s, at full speed the other way by 0.5s).
const TURN = { duration: 0.5, ease: 'power1.out' };

// His drift: Locomotive Scroll's data-scroll-speed="4" (read as 4 / 10),
// direction horizontal, position top, which moves the name left by 0.4px for
// every px the page has scrolled (measured: exactly -0.4 x scroll).
const DRIFT = 0.4;

// Locomotive only runs its smooth scroll, and with it the drift, when its own
// test says this isn't a phone or tablet: no mobile browser, no iPad posing as
// a Mac, and a window at least 1024px wide (its tablet breakpoint), checked
// once when the page starts.
function drifts() {
  const mobile =
    /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1) ||
    innerWidth < 1024;
  return !mobile;
}

export function setupMarquee(el) {
  const track = el?.querySelector('[data-marquee-track]');
  if (!track) return () => {};
  if (reducedMotion()) return () => {};

  // The roll, wrapped into one block; the drift is added on top unwrapped.
  let x = 0;
  // His timeScale: 1 rolls left (scrolling down), -1 rolls right (up).
  const roll = { scale: 1 };
  let dir = 1;
  let last = scrollY();
  const drift = drifts() ? DRIFT : 0;

  let width = track.children[0].getBoundingClientRect().width;
  const onResize = () => (width = track.children[0].getBoundingClientRect().width);
  addEventListener('resize', onResize);
  // Measured again once the font is in: the fallback's width is not the name's.
  document.fonts?.ready.then(onResize);

  const tick = (_, deltaMs) => {
    // Any movement the other way turns it round, as ScrollTrigger's direction
    // does, reading the same smoothed scroll the page is drawn at.
    const y = scrollY();
    if (y !== last) {
      const d = y > last ? 1 : -1;
      if (d !== dir) {
        dir = d;
        gsap.to(roll, { scale: dir, ...TURN, overwrite: true });
      }
      last = y;
    }
    x -= roll.scale * (width / PERIOD) * (deltaMs / 1000);
    if (x <= -width) x += width;
    if (x > 0) x -= width;
    track.style.transform = `translate3d(${x - drift * y}px,0,0)`;
  };
  gsap.ticker.add(tick);

  return () => {
    gsap.ticker.remove(tick);
    gsap.killTweensOf(roll);
    removeEventListener('resize', onResize);
  };
}
