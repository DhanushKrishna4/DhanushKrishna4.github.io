// One WebGL canvas, fixed behind the page, shared by every page.
// The contour field is always drawn first; pages add their own layers on top
// (the 3D landscape, the red line, the glowing letters, the curling cards)
// and remove them when they leave.
import * as THREE from 'three';
import { gsap } from 'gsap';
import { createFluid } from './fluid.js';
import { createField } from './field.js';
import { scrollY } from '../core/scroll.js';

// Every shader here works in plain sRGB values, so colour management is off.
THREE.ColorManagement.enabled = false;

export function createEngine(canvas) {
  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    alpha: false,
    powerPreference: 'high-performance',
    stencil: false,
  });
  renderer.autoClear = false;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.setClearColor(0x000000, 1);

  const state = {
    width: innerWidth,
    height: innerHeight,
    // Full density on Retina screens (2x): at less, the browser stretches the
    // canvas and everything drawn in WebGL, the project cards above all, goes soft.
    dpr: Math.min(devicePixelRatio || 1, 2),
    time: 0,
    delta: 1 / 60,
    scroll: 0,
    pointer: { x: innerWidth / 2, y: innerHeight / 2, nx: 0.5, ny: 0.5, px: 0.5, py: 0.5, vx: 0, vy: 0, moved: false, lastMove: -10 },
  };

  renderer.setPixelRatio(state.dpr);
  renderer.setSize(state.width, state.height, false);

  // Lando's cursor trail through the contour lines (null without float textures).
  const fluid = createFluid(renderer, state);
  const field = createField(state, fluid);
  field.resize();
  const layers = new Set();
  let running = true;

  // Pointer, in pixels and in 0..1 (y up) for the shaders.
  const onPointer = (e) => {
    const p = state.pointer;
    p.x = e.clientX;
    p.y = e.clientY;
    p.nx = e.clientX / state.width;
    p.ny = 1 - e.clientY / state.height;
    p.moved = true;
    p.lastMove = state.time;
  };
  addEventListener('pointermove', onPointer, { passive: true });
  addEventListener('pointerdown', onPointer, { passive: true });

  const resize = () => {
    state.width = innerWidth;
    state.height = innerHeight;
    renderer.setSize(state.width, state.height, false);
    fluid?.resize();
    field.resize();
    layers.forEach((l) => l.resize?.(state));
  };
  let resizeRaf = 0;
  addEventListener('resize', () => {
    cancelAnimationFrame(resizeRaf);
    resizeRaf = requestAnimationFrame(resize);
  });

  document.addEventListener('visibilitychange', () => {
    running = document.visibilityState === 'visible';
  });

  const ordered = () => [...layers].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

  const tick = (time, deltaMs) => {
    if (!running && !window.__forceRender) return;
    const dt = Math.min(deltaMs / 1000, 1 / 20);
    state.delta = dt;
    state.time = time;
    state.scroll = scrollY();

    const p = state.pointer;
    p.vx = p.nx - p.px;
    p.vy = p.ny - p.py;
    p.px = p.nx;
    p.py = p.ny;

    layers.forEach((l) => l.update?.(state));
    fluid?.update();

    renderer.setRenderTarget(null);
    renderer.clear(true, true, true);
    // While the first-visit loader is up the screen is black behind it, as
    // Active Theory's is (the contour lines would show before it starts).
    if (!document.documentElement.classList.contains('is-loading')) field.render(renderer);
    for (const l of ordered()) {
      if (l.visible === false) continue;
      l.render(renderer, state);
    }
    p.moved = false;
  };
  gsap.ticker.add(tick);

  return {
    THREE,
    renderer,
    state,
    fluid,
    field,
    layers,
    add(layer) {
      if (layer) {
        layers.add(layer);
        layer.resize?.(state);
      }
      return layer;
    },
    remove(layer) {
      if (!layer) return;
      layers.delete(layer);
      layer.dispose?.();
    },
    setTheme(theme, immediate = false) {
      field.setTheme(theme, immediate);
    },
  };
}
