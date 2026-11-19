// Lando's cursor trail, ported from his site's code with his settings: a
// small fluid simulation (stable fluids, as in mnmxmx's fluid-three) that the
// pointer stirs. Each step the velocity is carried along itself (with BFECC
// error correction) and fades to 96%, the pointer's movement since the last
// step is added in a soft disc around it, and the result is made free of
// divergence (4 pressure passes). It steps at most 60 times a second.
// The velocity is then drawn as his colour, white where still, into a
// screen-sized texture; field.js fills the bands where that colour's red
// falls below 0.9. Because the red channel is used, the shape depends on the
// direction: moving left fills a solid smear, moving right fills a ring round
// a hollow where the flow is fastest, as on his site.
// When the pointer has been still for 2 seconds (2.5 after the page loads), a
// make-believe pointer takes over and sweeps the screen in a zigzag, top to
// bottom and back, every 9.5 seconds, as his does.
// His 404 has neither: there the lines move on their own and nothing stirs
// them. setCalm(true) does that (pages/notfound.js): the trail is wiped and
// the fluid stands still until setCalm(false).
import * as THREE from 'three';
import { gsap } from 'gsap';
import { reducedMotion } from '../core/env.js';

// His settings (unused ones left out: viscosity is off, the edges don't bounce).
const SIM = {
  iterations: 4, // pressure passes per step
  dissipation: 0.96, // velocity kept per step
  force: 50, // mouse_force
  resolution: 0.1, // simulation cells per CSS pixel
  cursor: 18, // cursor_size, in cells
  straightness: 1,
  dt: 0.014,
  interval: 1 / 60, // seconds between steps
};

// A full-screen quad, shrunk by one cell on each side so the edge cells are
// never written (they stay at rest, which walls the fluid in).
const faceVert = /* glsl */ `
attribute vec3 position;
uniform vec2 px;
uniform vec2 boundarySpace;
varying vec2 uv;
precision highp float;
void main() {
  vec3 pos = position;
  vec2 scale = 1.0 - boundarySpace * 2.0;
  pos.xy = pos.xy * scale;
  uv = vec2(0.5) + (pos.xy) * 0.5;
  gl_Position = vec4(pos, 1.0);
}
`;

const advectionFrag = /* glsl */ `
precision highp float;
uniform sampler2D velocity;
uniform float dt;
uniform float dissipation;
uniform bool isBFECC;
uniform vec2 fboSize;
uniform vec2 px;
varying vec2 uv;
void main() {
  vec2 ratio = max(fboSize.x, fboSize.y) / fboSize;
  if (isBFECC == false) {
    vec2 vel = texture2D(velocity, uv).xy;
    vec2 uv2 = uv - vel * dt * ratio;
    vec2 newVel = texture2D(velocity, uv2).xy;
    gl_FragColor = vec4(newVel, 0.0, 0.0);
  } else {
    vec2 spot_new = uv;
    vec2 vel_old = texture2D(velocity, uv).xy;
    vec2 spot_old = spot_new - vel_old * dt * ratio;
    vec2 vel_new1 = texture2D(velocity, spot_old).xy;
    vec2 spot_new2 = spot_old + vel_new1 * dt * ratio;
    vec2 error = spot_new2 - spot_new;
    vec2 spot_new3 = spot_new - error / 2.0;
    vec2 vel_2 = texture2D(velocity, spot_new3).xy;
    vec2 spot_old2 = spot_new3 - vel_2 * dt * ratio;
    vec2 newVel2 = texture2D(velocity, spot_old2).xy * dissipation;
    gl_FragColor = vec4(newVel2, 0.0, 0.0);
  }
}
`;

// The pointer's push: a disc of cursor-size cells round the pointer, added
// on top of the velocity, strongest in the middle.
const forceVert = /* glsl */ `
precision highp float;
attribute vec3 position;
attribute vec2 uv;
uniform vec2 center;
uniform vec2 scale;
uniform vec2 px;
varying vec2 vUv;
void main() {
  vec2 pos = position.xy * scale * 2.0 * px + center;
  vUv = uv;
  gl_Position = vec4(pos, 0.0, 1.0);
}
`;

const forceFrag = /* glsl */ `
precision highp float;
uniform vec2 force;
uniform vec2 center;
uniform vec2 scale;
uniform vec2 px;
varying vec2 vUv;
void main() {
  vec2 circle = (vUv - 0.5) * 2.0;
  float d = 1.0 - min(length(circle), 1.0);
  d *= d;
  gl_FragColor = vec4(force * d, 0, 1);
}
`;

const divergenceFrag = /* glsl */ `
precision highp float;
uniform sampler2D velocity;
uniform float dt;
uniform vec2 px;
varying vec2 uv;
void main() {
  float x0 = texture2D(velocity, uv - vec2(px.x, 0)).x;
  float x1 = texture2D(velocity, uv + vec2(px.x, 0)).x;
  float y0 = texture2D(velocity, uv - vec2(0, px.y)).y;
  float y1 = texture2D(velocity, uv + vec2(0, px.y)).y;
  float divergence = (x1 - x0 + y1 - y0) / 2.0;
  gl_FragColor = vec4(divergence / dt);
}
`;

const poissonFrag = /* glsl */ `
precision highp float;
uniform sampler2D pressure;
uniform sampler2D divergence;
uniform float straightness;
uniform vec2 px;
varying vec2 uv;
void main() {
  float p0 = texture2D(pressure, uv + vec2(px.x * 2.0, 0)).r;
  float p1 = texture2D(pressure, uv - vec2(px.x * 2.0, 0)).r;
  float p2 = texture2D(pressure, uv + vec2(0, px.y * 2.0)).r;
  float p3 = texture2D(pressure, uv - vec2(0, px.y * 2.0)).r;
  float div = texture2D(divergence, uv).r;
  float newP = (p0 + p1 + p2 + p3) / (4.0 + straightness) - div;
  gl_FragColor = vec4(newP);
}
`;

const pressureFrag = /* glsl */ `
precision highp float;
uniform sampler2D pressure;
uniform sampler2D velocity;
uniform vec2 px;
uniform float dt;
varying vec2 uv;
void main() {
  float step = 1.0;
  float p0 = texture2D(pressure, uv + vec2(px.x * step, 0)).r;
  float p1 = texture2D(pressure, uv - vec2(px.x * step, 0)).r;
  float p2 = texture2D(pressure, uv + vec2(0, px.y * step)).r;
  float p3 = texture2D(pressure, uv - vec2(0, px.y * step)).r;
  vec2 v = texture2D(velocity, uv).xy;
  vec2 gradP = vec2(p0 - p1, p2 - p3) * 0.5;
  v = v - gradP * dt;
  gl_FragColor = vec4(v, 0.0, 1.0);
}
`;

// His output: white where still, tinted by the direction where moving.
const colorFrag = /* glsl */ `
precision highp float;
uniform sampler2D velocity;
varying vec2 uv;
void main() {
  vec2 vel = texture2D(velocity, uv).xy;
  float len = length(vel);
  vel = vel * 0.5 + 0.5;
  vec3 color = vec3(vel.x, vel.y, 1.0);
  color = mix(vec3(1.0), color, len);
  gl_FragColor = vec4(color, 1.0);
}
`;

// His make-believe pointer for when the real one is still.
function createIdle() {
  const idle = { moving: true, cursor: new THREE.Vector2() };
  const progress = { x: 0, y: 0 };
  let previous = true;
  let later = 0;
  const tl = gsap.timeline({ paused: true, repeat: -1, repeatDelay: 3 });
  tl.fromTo(progress, { y: 0 }, { y: 1, duration: 2.5, ease: 'none' }, 0);
  tl.fromTo(progress, { x: 0 }, { x: 1, duration: 2.5, ease: 'power1.inOut' }, 0);
  tl.fromTo(progress, { y: 1 }, { y: 0, duration: 2.5, ease: 'none' }, 4);
  tl.fromTo(progress, { x: 1 }, { x: 0, duration: 2.5, ease: 'power1.inOut' }, 4);
  // It is motion nobody asked for, so not for those who prefer less.
  const rest = () => {
    if (!reducedMotion()) idle.moving = false;
  };
  let initial = setTimeout(rest, 2500);
  const move = () => {
    idle.moving = true;
    clearTimeout(initial);
    clearTimeout(later);
    later = setTimeout(rest, 2000);
  };
  addEventListener('mousemove', move, { passive: true });
  addEventListener('touchmove', move, { passive: true });
  idle.update = () => {
    if (!idle.moving) {
      idle.cursor.set(-Math.cos(progress.x * Math.PI * 4) * 0.75, Math.cos(progress.y * Math.PI) * 0.5);
    }
    if (idle.moving !== previous) {
      if (!idle.moving) {
        tl.seek(0);
        tl.play();
      } else tl.pause();
    }
    previous = idle.moving;
  };
  return idle;
}

export function createFluid(renderer, state) {
  const ext = renderer.extensions;
  // Float velocities, as his; half floats where full ones can't be smoothed.
  if (!ext.has('EXT_color_buffer_float') && !ext.has('EXT_color_buffer_half_float')) return null;
  const type = ext.has('EXT_color_buffer_float') && ext.has('OES_texture_float_linear') ? THREE.FloatType : THREE.HalfFloatType;
  const target = () => new THREE.WebGLRenderTarget(1, 1, { type, depthBuffer: false, stencilBuffer: false });
  const fbo = { vel0: target(), vel1: target(), div: target(), p0: target(), p1: target() };
  // The trail texture field.js reads, at the page's CSS size.
  const out = new THREE.WebGLRenderTarget(1, 1, { depthBuffer: false, stencilBuffer: false });

  // Cell size in clip units: fixed to a 1100px-wide page, whatever the size.
  const size = new THREE.Vector2();
  const cell = new THREE.Vector2();
  const boundary = new THREE.Vector2();
  const calcSize = () => {
    const w = Math.max(1, Math.round(SIM.resolution * state.width));
    const h = Math.max(1, Math.round(SIM.resolution * state.height));
    const k = w / (1100 * SIM.resolution);
    cell.set((1 / w) * k, (1 / h) * k);
    size.set(w, h);
  };

  const camera = new THREE.Camera();
  const quad = new THREE.PlaneGeometry(2, 2);
  const pass = (fragmentShader, uniforms, { vertexShader = faceVert, geometry = quad, blending = THREE.NormalBlending } = {}) => {
    const material = new THREE.RawShaderMaterial({ vertexShader, fragmentShader, uniforms, blending, depthTest: false, depthWrite: false });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.frustumCulled = false;
    const scene = new THREE.Scene();
    scene.add(mesh);
    return {
      uniforms,
      render(dst) {
        renderer.setRenderTarget(dst);
        renderer.render(scene, camera);
      },
    };
  };

  const advection = pass(advectionFrag, {
    boundarySpace: { value: cell },
    px: { value: cell },
    fboSize: { value: size },
    velocity: { value: fbo.vel0.texture },
    dt: { value: SIM.dt },
    isBFECC: { value: true },
    dissipation: { value: SIM.dissipation },
  });
  const force = pass(
    forceFrag,
    {
      px: { value: cell },
      force: { value: new THREE.Vector2() },
      center: { value: new THREE.Vector2() },
      scale: { value: new THREE.Vector2(SIM.cursor, SIM.cursor) },
    },
    { vertexShader: forceVert, geometry: new THREE.PlaneGeometry(1, 1), blending: THREE.AdditiveBlending },
  );
  const divergence = pass(divergenceFrag, {
    boundarySpace: { value: boundary },
    velocity: { value: fbo.vel1.texture },
    px: { value: cell },
    dt: { value: SIM.dt },
  });
  const poisson = pass(poissonFrag, {
    boundarySpace: { value: boundary },
    pressure: { value: fbo.p0.texture },
    divergence: { value: fbo.div.texture },
    px: { value: cell },
    straightness: { value: SIM.straightness },
  });
  const pressure = pass(pressureFrag, {
    boundarySpace: { value: boundary },
    pressure: { value: fbo.p0.texture },
    velocity: { value: fbo.vel1.texture },
    px: { value: cell },
    dt: { value: SIM.dt },
  });
  const color = pass(colorFrag, {
    velocity: { value: fbo.vel0.texture },
    boundarySpace: { value: new THREE.Vector2() },
  });

  // His pointer, in -1..1 with y up. While it is moving, the push is how far
  // it went since the last step (nothing while it still sits at the centre,
  // where it starts); while it rests, the make-believe pointer pushes instead.
  const idle = createIdle();
  const mouse = { coords: new THREE.Vector2(), old: new THREE.Vector2(), diff: new THREE.Vector2() };
  const setCoords = (x, y) => mouse.coords.set((x / state.width) * 2 - 1, -(y / state.height) * 2 + 1);
  addEventListener('mousemove', (e) => setCoords(e.clientX, e.clientY), { passive: true });
  const onTouch = (e) => e.touches.length === 1 && setCoords(e.touches[0].clientX, e.touches[0].clientY);
  addEventListener('touchstart', onTouch, { passive: true });
  addEventListener('touchmove', onTouch, { passive: true });
  const follow = () => {
    if (!idle.moving) mouse.coords.copy(idle.cursor);
    mouse.diff.subVectors(mouse.coords, mouse.old);
    mouse.old.copy(mouse.coords);
    if (idle.moving && mouse.old.x === 0 && mouse.old.y === 0) mouse.diff.set(0, 0);
  };

  const step = () => {
    boundary.copy(cell);
    advection.render(fbo.vel1);

    follow();
    const ex = SIM.cursor * cell.x;
    const ey = SIM.cursor * cell.y;
    const u = force.uniforms;
    u.force.value.set((mouse.diff.x / 2) * SIM.force, (mouse.diff.y / 2) * SIM.force);
    u.center.value.set(
      Math.min(Math.max(mouse.coords.x, -1 + ex + cell.x * 2), 1 - ex - cell.x * 2),
      Math.min(Math.max(mouse.coords.y, -1 + ey + cell.y * 2), 1 - ey - cell.y * 2),
    );
    force.render(fbo.vel1);

    divergence.render(fbo.div);
    let written = fbo.p1;
    for (let i = 0; i < SIM.iterations; i++) {
      const [from, to] = i % 2 === 0 ? [fbo.p0, fbo.p1] : [fbo.p1, fbo.p0];
      poisson.uniforms.pressure.value = from.texture;
      poisson.render(to);
      written = to;
    }
    pressure.uniforms.pressure.value = written.texture;
    pressure.render(fbo.vel0);

    color.render(out);
    renderer.setRenderTarget(null);
  };

  // Still fluid: no velocity anywhere, and the trail texture white.
  const wipe = () => {
    const clear = renderer.getClearColor(new THREE.Color());
    const alpha = renderer.getClearAlpha();
    renderer.setClearColor(0x000000, 0);
    for (const t of Object.values(fbo)) {
      renderer.setRenderTarget(t);
      renderer.clear(true, false, false);
    }
    renderer.setRenderTarget(out);
    renderer.setClearColor(0xffffff, 1);
    renderer.clear(true, false, false);
    renderer.setClearColor(clear, alpha);
    renderer.setRenderTarget(null);
  };

  let pending = 0;
  let last = performance.now();
  let calm = false;
  const api = {
    get texture() {
      return out.texture;
    },
    // Calm: wiped, and nothing stirs it (the 404). Coming back, the pointer
    // picks up from where it is now, so it doesn't jump-start a trail.
    setCalm(on) {
      if (on === calm) return;
      calm = on;
      if (on) wipe();
      else {
        idle.update();
        if (!idle.moving) mouse.coords.copy(idle.cursor);
        mouse.old.copy(mouse.coords);
        pending = 0;
        last = performance.now();
      }
    },
    resize() {
      calcSize();
      Object.values(fbo).forEach((t) => t.setSize(size.x, size.y));
      out.setSize(state.width, state.height);
    },
    // Every frame, as his: the make-believe pointer moves on, and once a
    // sixtieth of a second has built up, the fluid takes one step.
    update() {
      const now = performance.now();
      pending += (now - last) / 1000;
      last = now;
      idle.update();
      if (calm) {
        pending = 0;
        return;
      }
      if (pending > SIM.interval) {
        step();
        pending %= SIM.interval;
      }
    },
  };
  api.resize();
  // Start from still fluid: white.
  const clear = renderer.getClearColor(new THREE.Color());
  const alpha = renderer.getClearAlpha();
  renderer.setRenderTarget(out);
  renderer.setClearColor(0xffffff, 1);
  renderer.clear(true, false, false);
  renderer.setClearColor(clear, alpha);
  renderer.setRenderTarget(null);
  return api;
}
