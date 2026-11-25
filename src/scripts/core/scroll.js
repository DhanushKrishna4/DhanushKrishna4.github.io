// Smooth scrolling with Lenis, driven by GSAP's ticker so every animation
// (ScrollTrigger, WebGL, marquee) reads the same scroll value each frame. A
// finger moves the page with Lusion's touch scrolling (below), from the same
// ticker.
import Lenis from 'lenis';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { reducedMotion, isTouch, clamp } from './env.js';

gsap.registerPlugin(ScrollTrigger);

export let lenis = null;

// Whether the browser moves the page itself: with reduced motion (no Lenis).
// It moves the page a frame before any script can redraw the fixed WebGL
// canvas behind it, so whatever is drawn there to follow the page trails it
// in a fast flick (measured 30 to 50px). Pieces that must stay with the page
// (the home page's monogram, the red lines, the cards) then get their own
// canvas inside the page, which scrolls with it. Wheels and fingers don't
// count: Lenis and the touch scrolling below move the page in the same frame
// as everything drawn to follow it.
export const browserScrolls = () => !lenis;

// Lusion's touch scrolling (their ScrollPane, with their input's drag), in
// place of the browser's: the page follows the finger exactly, and the first
// move decides the drag's direction (a sideways one doesn't scroll). Let go
// and it glides on at the drag's speed over its last 0.1s, the latest counting
// most, slowed by their friction: 2.1 a second, down to 1.9 at 5 screens a
// second or more, close to an iPhone's own. A touch stops the glide (and, as
// on an iPhone, the tap that stops one isn't a click). Their frame time is
// capped at 1/20s. The page is moved from the ticker before anything is
// drawn, so it and everything drawn to follow it move together; with the
// browser scrolling, our pictures fell behind whenever a frame ran late.
// Form fields, text selection, anything marked data-lenis-prevent, two
// fingers and a zoomed-in page keep the browser's own scrolling.
const HISTORY = 0.1;
const FRICTION_FROM = 2.1;
const FRICTION_TO = 1.9;
const FRICTION_SPEED = 5;
const MAX_DT = 1 / 20;
// A glide faster than this (px/s) is stopped by a tap rather than clicked.
const STOP_TAP = 40;

const pane = {
  down: false,
  axis: 0, // set by the first move: 1 up and down (scrolls), 2 sideways
  x: 0,
  y: 0,
  pending: 0, // the finger's movement since the last frame (px, + scrolls down)
  history: [], // the drag's last 0.1s: { time, dt, delta }
  clock: 0,
  velocity: 0, // px/s, while gliding
  at: 0, // where it last put the page (px, unrounded)
  delta: 0, // how far it moved the page this frame
  drag: 0, // how far the finger dragged it this frame, moved or not
  noClick: false,
};

const keepsNative = (e) =>
  e.touches.length !== 1 ||
  !!e.target?.closest?.('input, textarea, select, [contenteditable]:not([contenteditable="false"]), [data-lenis-prevent], [data-lenis-prevent-touch]') ||
  (window.visualViewport?.scale ?? 1) > 1.01 ||
  !!lenis.isTouchOnSelectionHandle?.(e);

const stopPane = () => {
  pane.velocity = 0;
  pane.pending = 0;
  pane.history.length = 0;
};

function onTouchStart(e) {
  pane.noClick = false;
  if (lenis.isStopped || keepsNative(e)) {
    pane.down = false;
    return;
  }
  const t = e.touches[0];
  pane.down = true;
  pane.axis = 0;
  pane.x = t.clientX;
  pane.y = t.clientY;
  pane.noClick = Math.abs(pane.velocity) > STOP_TAP;
  stopPane();
  // A smooth scroll under way stops too.
  if (lenis.isScrolling === 'smooth') lenis.reset();
  pane.at = lenis.animatedScroll;
}

function onTouchMove(e) {
  if (!pane.down) return;
  if (e.touches.length !== 1) {
    // A second finger: the browser's pinch, and no glide after it.
    pane.down = false;
    stopPane();
    return;
  }
  if (e.cancelable) e.preventDefault();
  const t = e.touches[0];
  const dx = t.clientX - pane.x;
  const dy = t.clientY - pane.y;
  pane.x = t.clientX;
  pane.y = t.clientY;
  if (!pane.axis && (dx || dy)) pane.axis = Math.abs(dx) > Math.abs(dy) ? 2 : 1;
  if (pane.axis === 1) pane.pending -= dy;
}

function onTouchEnd(e) {
  if (e.touches.length) return;
  pane.down = false;
  if (pane.noClick) setTimeout(() => (pane.noClick = false), 500);
}

function onClick(e) {
  if (!pane.noClick) return;
  pane.noClick = false;
  e.preventDefault();
  e.stopImmediatePropagation();
}

// One frame of it (their ScrollPane.update): dtMs from the ticker.
function stepPane(dtMs) {
  pane.delta = 0;
  pane.drag = 0;
  if (lenis.isStopped) {
    stopPane();
    return;
  }
  const dt = Math.min(dtMs / 1000, MAX_DT);
  pane.clock += dt;
  // Moved by something else since (a link, the router, the browser): carry
  // on from there.
  if (Math.abs(lenis.animatedScroll - pane.at) > 1) {
    pane.at = lenis.animatedScroll;
    if (!pane.down) stopPane();
  }
  let move = 0;
  if (pane.down && pane.axis === 1) {
    pane.history.push({ time: pane.clock, dt, delta: pane.pending });
    while (pane.history.length && pane.clock - pane.history[0].time > HISTORY) pane.history.shift();
    move = pane.drag = pane.pending;
  } else if (pane.down) {
    stopPane();
  } else {
    const h = pane.history;
    if (h.length) {
      let sum = 0;
      let weight = 0;
      for (const s of h) {
        if (s.dt <= 0) continue;
        const w = s.dt * (h.length === 1 ? 1 : (s.time - h[0].time) / HISTORY);
        sum += (s.delta / s.dt) * w;
        weight += w;
      }
      pane.velocity = weight > 0 ? sum / weight : 0;
      h.length = 0;
    }
    if (pane.velocity) {
      const k = FRICTION_FROM + (FRICTION_TO - FRICTION_FROM) * clamp(Math.abs(pane.velocity) / innerHeight / FRICTION_SPEED, 0, 1);
      pane.velocity -= k * pane.velocity * dt;
      if (Math.abs(pane.velocity) < 1) pane.velocity = 0;
      move = pane.velocity * dt;
    }
  }
  pane.pending = 0;
  if (!move) return;
  const next = clamp(pane.at + move, 0, lenis.limit);
  // A glide stops at either end of the page.
  if (next !== pane.at + move) pane.velocity = 0;
  pane.delta = next - pane.at;
  pane.at = next;
  if (pane.delta) lenis.scrollTo(next, { immediate: true });
}

// Touch screens: Safari on an iPhone draws the scrolling page under its
// see-through bars but not fixed elements, the WebGL canvas behind the page
// among them, and with the page moved by script its bars stay out. So under
// them the text went on while the pictures and lines stopped short. Two
// blocks of the page's background now move with the page and cover what lies
// just past the top and bottom of the screen, so only the area between the
// bars shows anything. They are sized from the page's own height (#swap),
// never past its ends, so the page gets no longer. Where the screen ends is
// taken from the canvas itself (fixed to the whole viewport): its box stops
// where Safari stops drawing fixed elements, the top of its controls, whatever
// innerHeight says.
const EDGE = 0.4; // how far past the screen they reach, in screen heights
const edges = { top: null, bottom: null, key: '' };

function makeEdges() {
  const make = (side) => {
    const el = document.createElement('div');
    el.className = `screen-edge screen-edge--${side}`;
    el.setAttribute('aria-hidden', 'true');
    document.body.append(el);
    return el;
  };
  edges.top = make('top');
  edges.bottom = make('bottom');
}

function placeEdges() {
  const swap = document.getElementById('swap');
  if (!swap) return;
  const y = window.scrollY;
  const screen = document.getElementById('gl')?.getBoundingClientRect();
  const shown = screen && screen.height > 0 ? screen : { top: 0, bottom: innerHeight };
  const top = y + shown.top;
  const bottom = y + shown.bottom;
  const reach = Math.ceil(innerHeight * EDGE);
  const above = Math.min(reach, Math.max(0, top));
  const below = Math.max(0, Math.min(reach, swap.offsetHeight - bottom));
  const key = `${top}|${bottom}|${above}|${below}`;
  if (key === edges.key) return;
  edges.key = key;
  edges.top.style.transform = `translate3d(0, ${top - above}px, 0)`;
  edges.top.style.height = `${above}px`;
  edges.bottom.style.transform = `translate3d(0, ${bottom}px, 0)`;
  edges.bottom.style.height = `${below}px`;
}

export function initScroll() {
  history.scrollRestoration = 'manual';
  if (reducedMotion()) return;
  lenis = new Lenis({ lerp: 0.1, wheelMultiplier: 1, touchMultiplier: 1.4, autoRaf: false });
  lenis.on('scroll', ScrollTrigger.update);
  addEventListener('touchstart', onTouchStart, { passive: true });
  addEventListener('touchmove', onTouchMove, { passive: false });
  addEventListener('touchend', onTouchEnd, { passive: true });
  addEventListener('touchcancel', onTouchEnd, { passive: true });
  document.addEventListener('click', onClick, true);
  const covered = isTouch();
  if (covered) makeEdges();
  gsap.ticker.add((time, deltaTime) => {
    stepPane(deltaTime);
    lenis.raf(time * 1000);
    // Where the page is now, before anything is drawn.
    if (covered) placeEdges();
  });
  gsap.ticker.lagSmoothing(0);
}

export const scrollY = () => (lenis ? lenis.scroll : window.scrollY);
// How far the page moved this frame (px).
export const scrollVelocity = () => pane.delta || (lenis ? lenis.velocity : 0);
// How far a finger dragged the page this frame (px, + down the page), even
// where it could go no further (their input.deltaDragScrollY).
export const touchDrag = () => pane.drag;

export function jumpTo(y = 0) {
  stopPane();
  if (lenis) lenis.scrollTo(y, { immediate: true, force: true });
  else window.scrollTo(0, y);
}

export function smoothTo(y = 0) {
  stopPane();
  if (lenis) lenis.scrollTo(y, { duration: 1.4 });
  else window.scrollTo({ top: y, behavior: reducedMotion() ? 'auto' : 'smooth' });
}

export function lockScroll(locked) {
  if (locked) stopPane();
  if (lenis) (locked ? lenis.stop() : lenis.start());
  document.documentElement.style.overflow = locked ? 'hidden' : '';
}

export function refreshScroll() {
  if (lenis) lenis.resize();
  ScrollTrigger.refresh();
}
