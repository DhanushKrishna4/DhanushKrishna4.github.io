// The two page transitions.
//  curtain: Dennis's panel with curved edges that sweeps up over the page,
//           shows where you're going, then lifts away (his timings, below).
//  fill:    for opening a project (Lusion): the project's own colour grows
//           out of the card you clicked until it covers the screen.
import { gsap } from 'gsap';
import { reducedMotion } from './env.js';

const $ = (s) => document.querySelector(s);

// Dennis's page transition, from his site's code (pageTransitionIn/Out):
// one timeline from the click.
//  0.00   the panel rises from below (0.5s, power4.in), its domed top edge
//         growing to 10vh (0.4s, power4.in), so nothing shows for a moment
//         and then it sweeps up
//  0.495  covered: the old page goes and the new one is put in
//  0.55   the page's name fades in, rising 50px (0.8s, power4.out)
//  0.80   the new page's blocks rise from 50vh below (1s, expo.out, 0.05s
//         apart), mostly still hidden
//  1.15   the panel lifts away (0.8s, power3.inOut), the name fading as it
//         goes (0.6s, linear); from 1.35 the curve under it flattens (0.85s)
// His panel lifts at 1.15 whatever happens; this one waits there if the new
// page isn't in yet, so it never uncovers a blank page.
// colours: { bg, ink } to draw it in (leaving a project page, its menu
// colours); without them, oxblood and bone.
export function curtain(label = '', colours = null) {
  const root = $('[data-curtain]');
  for (const [name, key] of [['--curtain-bg', 'bg'], ['--curtain-ink', 'ink']]) {
    if (colours?.[key]) root.style.setProperty(name, colours[key]);
    else root.style.removeProperty(name);
  }
  const screen = $('[data-curtain-screen]');
  const top = $('[data-curtain-top]');
  const bottom = $('[data-curtain-bottom]');
  const text = $('[data-curtain-label]');
  text.textContent = label;
  root.style.visibility = 'visible';
  const small = innerWidth <= 540;

  let ready = false;
  let covered;
  let done;
  const coveredP = new Promise((r) => (covered = r));
  const doneP = new Promise((r) => (done = r));
  const finish = () => {
    root.style.visibility = 'hidden';
    gsap.set(screen, { y: 0, yPercent: 100 });
    gsap.set(text, { opacity: 0, y: 0 });
    gsap.set([top, bottom], { height: 0 });
    done();
  };

  if (reducedMotion()) {
    gsap.set(screen, { y: 0, yPercent: 0 });
    gsap.set(text, { xPercent: -50, yPercent: -50, opacity: 1, y: 0 });
    covered();
    return {
      covered: coveredP,
      done: doneP,
      elapsed: () => 1.15,
      ready() {
        finish();
      },
    };
  }

  const tl = gsap
    .timeline({ onComplete: finish })
    .set(screen, { y: 0, yPercent: 100 }, 0)
    .set(text, { x: 0, xPercent: -50, yPercent: -50, opacity: 0, y: 0 }, 0)
    .set(bottom, { height: small ? '5vh' : '10vh' }, 0)
    .set(top, { height: '0vh' }, 0)
    .to(screen, { yPercent: 0, duration: 0.5, ease: 'power4.in' }, 0)
    .to(top, { height: '10vh', duration: 0.4, ease: 'power4.in' }, 0)
    .call(() => covered(), null, 0.495)
    .to(text, { opacity: 1, y: -50, duration: 0.8, ease: 'power4.out' }, 0.55)
    .call(() => !ready && tl.pause(), null, 1.15)
    .to(screen, { yPercent: -100, duration: 0.8, ease: 'power3.inOut' }, 1.15)
    .to(text, { opacity: 0, duration: 0.6, ease: 'none' }, 1.15)
    .set(top, { height: '0vh' }, 1.35)
    .to(bottom, { height: 0, duration: 0.85, ease: 'power3.inOut' }, 1.35);

  return {
    covered: coveredP,
    done: doneP,
    // Seconds since the click, on the transition's own clock.
    elapsed: () => tl.time(),
    // The new page is in: the panel may lift (now, if it was waiting).
    ready() {
      ready = true;
      if (tl.paused()) tl.play();
    },
  };
}

// The new page's blocks rising into place, as Dennis's "once-in" sections
// do: from 50vh below (20vh on phones), 0.8s after the click, 1s expo.out,
// 0.05s apart.
export function riseIn(blocks, elapsed = 0) {
  if (reducedMotion() || !blocks.length) return;
  const from = innerWidth <= 540 ? '20vh' : '50vh';
  gsap.fromTo(
    blocks,
    { y: from },
    { y: 0, duration: 1, ease: 'expo.out', stagger: 0.05, delay: Math.max(0, 0.8 - elapsed), clearProps: 'transform' },
  );
}

const insetFrom = (rect) => {
  const w = innerWidth;
  const h = innerHeight;
  const top = Math.max(0, rect.top);
  const left = Math.max(0, rect.left);
  const right = Math.max(0, w - rect.right);
  const bottom = Math.max(0, h - rect.bottom);
  return `inset(${top}px ${right}px ${bottom}px ${left}px round 10px)`;
};

export async function fillCover(rect, color) {
  const el = $('[data-project-fill]');
  el.style.background = color;
  el.style.visibility = 'visible';
  el.style.opacity = '1';
  const from = rect ? insetFrom(rect) : `inset(0px 0px 0px ${innerWidth}px round 0px)`;
  if (reducedMotion()) {
    el.style.clipPath = 'inset(0px)';
    return;
  }
  await gsap.fromTo(el, { clipPath: from }, { clipPath: 'inset(0px 0px 0px 0px round 0px)', duration: 0.95, ease: 'expo.inOut' });
}

export async function fillReveal() {
  const el = $('[data-project-fill]');
  if (!reducedMotion()) await gsap.to(el, { opacity: 0, duration: 0.7, ease: 'power2.out' });
  el.style.visibility = 'hidden';
}
