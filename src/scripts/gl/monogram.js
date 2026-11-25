// The opening screen's one object: Dhanush's DK monogram (the mark from his
// tab icon) as a solid, bevelled piece. Its face is ink black; its bevels and
// sides catch crimson light, and a light that follows the cursor slides a red
// sheen across it. It leans toward the cursor, drifts very slightly on its
// own, and tilts back and fades as the page scrolls past, handing the screen
// over to the background contour lines. How it is cut, coloured, opened and
// steered is exported for the 404 page's digits (gl/lost.js), so the two
// pieces stay the same.
import * as THREE from 'three';
import { gsap } from 'gsap';
import { clamp, smoothstep, isTouch, reducedMotion } from '../core/env.js';
import { browserScrolls } from '../core/scroll.js';

// The monogram's outline in its 256-unit drawing (public/favicon.svg): the D
// and K as one polygon, with the D's two stripes cut through it.
const OUTLINE = [
  [59.44, 63.46], [143.33, 63.46], [156.04, 79.6], [153.98, 89.28], [185.28, 63.46], [224, 63.46], [145.74, 128],
  [196.57, 192.54], [157.85, 192.54], [137.52, 166.72], [135.46, 176.4], [115.9, 192.54], [32, 192.54],
];
const STRIPES = [
  [[78.64, 102.19], [92.33, 90.89], [97.17, 90.89], [81.39, 165.11], [65.26, 165.11]],
  [[107.68, 102.19], [121.37, 90.89], [126.21, 90.89], [110.44, 165.11], [94.3, 165.11]],
];
export const WIDTH = 192; // the outline spans x 32..224 and y 63.46..192.54, centred on 128,128
// At rest it is turned a little, like a product shot, so one side wall shows
// even before the cursor moves.
export const REST = { x: 0.06, y: -0.12 };

// Moves every edge of a straight-sided polygon outward by `delta` (inward when
// negative), whichever way the points wind; corners stay sharp (mitred).
export function offsetPolygon(points, delta) {
  const n = points.length;
  let area = 0;
  for (let i = 0; i < n; i++) {
    const [x1, y1] = points[i];
    const [x2, y2] = points[(i + 1) % n];
    area += x1 * y2 - x2 * y1;
  }
  const side = area > 0 ? 1 : -1; // counter-clockwise: outward is to the right of each edge
  const edges = points.map(([x1, y1], i) => {
    const [x2, y2] = points[(i + 1) % n];
    const len = Math.hypot(x2 - x1, y2 - y1);
    const nx = (side * (y2 - y1)) / len;
    const ny = (side * -(x2 - x1)) / len;
    return { x: x1 + nx * delta, y: y1 + ny * delta, dx: x2 - x1, dy: y2 - y1, nx, ny };
  });
  return points.map(([x, y], i) => {
    const a = edges[(i + n - 1) % n];
    const b = edges[i];
    const cross = a.dx * b.dy - a.dy * b.dx;
    if (Math.abs(cross) < 1e-9) return [x + b.nx * delta, y + b.ny * delta];
    const t = ((b.x - a.x) * b.dy - (b.y - a.y) * b.dx) / cross;
    return [a.x + a.dx * t, a.y + a.dy * t];
  });
}

// A solid, bevelled piece from straight-sided outlines in drawing units (y
// down): parts is a list of { outer, holes }. Shared by the monogram and the
// 404 page's digits (gl/lost.js), so both are cut the same way.
export function solidGeometry(parts, flip = ([x, y]) => [x, -y]) {
  // The bevel grows the face outward by `bevel` on every side, so the face is
  // drawn that much smaller first (outline pulled in, stripes widened). The
  // bevel then lands exactly on the monogram's real outline, and slopes down
  // into the stripes as well as around the outside.
  const bevel = 3.2;
  // three.js wants the outline clockwise and the holes the other way round. It
  // only fixes a hole when it also has to flip the outline, which this outline
  // never needs, so both are set explicitly here.
  const wind = (points, clockwise) => {
    const area = points.reduce((a, [x1, y1], i) => {
      const [x2, y2] = points[(i + 1) % points.length];
      return a + x1 * y2 - x2 * y1;
    }, 0);
    return (area < 0) === clockwise ? points : [...points].reverse();
  };
  const toV = (p) => new THREE.Vector2(p[0], p[1]);
  const shapes = parts.map(({ outer, holes = [] }) => {
    const shape = new THREE.Shape(wind(offsetPolygon(outer.map(flip), -bevel), true).map(toV));
    shape.holes = holes.map((s) => new THREE.Path(wind(offsetPolygon(s.map(flip), bevel), false).map(toV)));
    return shape;
  });
  const geometry = new THREE.ExtrudeGeometry(shapes, {
    depth: 26,
    bevelEnabled: true,
    bevelThickness: 4,
    bevelSize: bevel,
    bevelSegments: 8,
    curveSegments: 1,
  });
  geometry.center();
  return geometry;
}

function monogramGeometry() {
  return solidGeometry([{ outer: OUTLINE, holes: STRIPES }], ([x, y]) => [x - 128, 128 - y]);
}

// Both passes (depth, then colour) use this same vertex shader, so they agree
// on depth to the last bit and the colour pass never flickers against it.
const vert = /* glsl */ `
varying vec3 vNormal;
varying vec3 vWorld;
varying float vFront;
void main() {
  vec4 world = modelMatrix * vec4(position, 1.0);
  vWorld = world.xyz;
  vNormal = normalize(mat3(modelMatrix) * normal);
  // 1 on the flat face, 0 on the side walls, in between along the bevel.
  vFront = normal.z;
  gl_Position = projectionMatrix * viewMatrix * world;
}
`;

const depthFrag = /* glsl */ `
void main() {
  gl_FragColor = vec4(0.0);
}
`;

const frag = /* glsl */ `
precision highp float;
uniform vec3 uInk;
uniform vec3 uCrimson;
uniform vec3 uEmber;
uniform vec3 uBone;
uniform vec3 uCursor;
uniform float uLight;
uniform float uSheen;
uniform float uOpacity;
varying vec3 vNormal;
varying vec3 vWorld;
varying float vFront;
void main() {
  vec3 N = normalize(vNormal);
  vec3 V = normalize(cameraPosition - vWorld);
  vec3 Lc = normalize(uCursor - vWorld);
  float nh = max(dot(N, normalize(Lc + V)), 0.0);

  // The flat face: ink black, with only a faint red gloss where the cursor
  // light reflects off it.
  vec3 faceCol = uInk + uCrimson * (pow(nh, 24.0) * 0.1 + pow(nh, 90.0) * 0.08) * uSheen;
  // Lacquer: the face mirrors a soft studio, a warm light overhead and red
  // bouncing up from below, so its tone shifts as the piece leans.
  vec3 R = reflect(-V, N);
  vec3 studio = uBone * smoothstep(0.12, 0.8, R.y) * 0.12 + uCrimson * smoothstep(0.08, 0.85, -R.y) * 0.3;
  float fres = 0.18 + 0.82 * pow(1.0 - clamp(dot(N, V), 0.0, 1.0), 5.0);
  faceCol += studio * fres * uSheen;
  // A long softbox off to the upper right: one soft diagonal band of
  // reflected light that sweeps across the face as the piece turns.
  float band = dot(R, normalize(vec3(0.62, 0.78, 0.0)));
  float streak = smoothstep(0.0, 0.07, band - 0.02) * (1.0 - smoothstep(0.07, 0.2, band - 0.02));
  faceCol += (uBone * 0.05 + uCrimson * 0.06) * streak * uSheen;

  // Bevels and side walls: crimson that never goes fully dark, so the whole
  // outline reads, and brighter wherever a light falls on it. One light skims
  // in from the upper left, a weaker one from the lower right, plus the cursor.
  vec3 L1 = normalize(vec3(-0.9, 0.62, 0.12));
  vec3 L2 = normalize(vec3(0.85, -0.52, 0.1));
  float lit = max(dot(N, L1), 0.0) * 0.85 + max(dot(N, L2), 0.0) * 0.4 + max(dot(N, Lc), 0.0) * 0.45;
  float s1 = pow(max(dot(N, normalize(L1 + V)), 0.0), 30.0);
  vec3 edgeCol = uInk + uCrimson * (0.3 + 0.95 * lit) * uLight + uEmber * s1 * 0.45 * uLight;
  edgeCol += mix(uEmber, uBone, 0.45) * pow(nh, 70.0) * 0.8 * uSheen;

  float face = smoothstep(0.93, 0.995, vFront);
  vec3 col = mix(edgeCol, faceCol, face);
  gl_FragColor = vec4(col * uOpacity, uOpacity);
}
`;

const rgb = (hex) => new THREE.Color(hex);

// The colours and lights of a solid piece.
export function solidUniforms() {
  return {
    uInk: { value: rgb('#0b0809') },
    uCrimson: { value: rgb('#c8102e') },
    uEmber: { value: rgb('#f2475a') },
    uBone: { value: rgb('#efe7e2') },
    uCursor: { value: new THREE.Vector3() },
    uLight: { value: 0 },
    uSheen: { value: 0 },
    uOpacity: { value: 0 },
  };
}

// A solid piece ready to pose: depth first, then colour on the nearest
// surface only, so the piece can fade out without its far walls showing
// through.
export function solidPiece(geometry, uniforms) {
  const depthMesh = new THREE.Mesh(geometry, new THREE.ShaderMaterial({ vertexShader: vert, fragmentShader: depthFrag, colorWrite: false }));
  const colorMesh = new THREE.Mesh(
    geometry,
    new THREE.ShaderMaterial({
      vertexShader: vert,
      fragmentShader: frag,
      uniforms,
      transparent: true,
      premultipliedAlpha: true,
      depthWrite: false,
      depthFunc: THREE.LessEqualDepth,
    }),
  );
  depthMesh.renderOrder = 0;
  colorMesh.renderOrder = 1;
  const piece = new THREE.Group();
  piece.add(depthMesh, colorMesh);
  return {
    piece,
    dispose() {
      depthMesh.material.dispose();
      colorMesh.material.dispose();
    },
  };
}

// The lean toward the cursor, the slow drift and the cursor light, eased the
// same way for every solid piece. step() takes the piece's centre on screen
// and its size (for the light's circle on touch screens), and returns the
// turn and lift to add to its pose, and where the cursor light now is.
export function createSteer(state) {
  const motion = !reducedMotion();
  const lean = { x: 0, y: 0 };
  const light = { x: state.width / 2, y: state.height * 0.4 };
  return {
    step(cx, cy, size) {
      const t = state.time;
      const k = 1 - Math.exp(-state.delta * 3.5);

      // Lean toward the cursor, measured from the piece's own centre.
      const p = state.pointer;
      const follow = motion && !isTouch();
      const tx = follow ? clamp((p.y - cy) / (state.height / 2), -1, 1) * 0.14 : 0;
      const ty = follow ? clamp((p.x - cx) / (state.width / 2), -1, 1) * 0.2 : 0;
      lean.x += (tx - lean.x) * k;
      lean.y += (ty - lean.y) * k;

      // The cursor light follows the pointer; on touch screens it circles slowly.
      const lx = follow ? p.x : cx + Math.cos(t * 0.35) * size * 0.6;
      const ly = follow ? p.y : cy + Math.sin(t * 0.35) * size * 0.35;
      light.x += (lx - light.x) * k;
      light.y += (ly - light.y) * k;

      // A slow drift so it never sits completely still.
      return {
        x: lean.x + (motion ? Math.sin(t * 0.43) * 0.022 : 0),
        y: lean.y + (motion ? Math.sin(t * 0.31 + 1.3) * 0.035 : 0),
        z: motion ? Math.sin(t * 0.27 + 0.6) * 0.01 : 0,
        lift: motion ? Math.sin(t * 0.7) * 3 : 0,
        light,
      };
    },
  };
}

// The opening: it turns up into place from lying back, and its edges light up.
export function riseUp(intro, uniforms, fromLoader = false) {
  gsap.killTweensOf([intro, uniforms.uLight, uniforms.uSheen]);
  if (reducedMotion()) {
    gsap.to(intro, { opacity: 1, duration: 0.8, ease: 'power2.out' });
    gsap.to([uniforms.uLight, uniforms.uSheen], { value: 1, duration: 0.8 });
    return;
  }
  Object.assign(intro, { rx: -0.95, ry: 0.42, y: 70, scale: 0.9, opacity: 0 });
  uniforms.uLight.value = 0;
  uniforms.uSheen.value = 0;
  const d = fromLoader ? 2.4 : 1.8;
  gsap
    .timeline()
    .to(intro, { rx: 0, ry: 0, y: 0, scale: 1, duration: d, ease: 'power3.inOut' }, 0)
    .to(intro, { opacity: 1, duration: 0.9, ease: 'power1.out' }, 0)
    .to(uniforms.uLight, { value: 1, duration: 1.4, ease: 'power2.out' }, d * 0.2)
    .to(uniforms.uSheen, { value: 1, duration: d, ease: 'power2.out' }, d * 0.35);
}

export function createMonogram(engine, hero) {
  if (!hero) return null;
  const { state } = engine;

  const geometry = monogramGeometry();
  const uniforms = solidUniforms();
  const solid = solidPiece(geometry, uniforms);
  const { piece } = solid;

  const scene = new THREE.Scene();
  scene.add(piece);
  const camera = new THREE.PerspectiveCamera(30, 1, 1, 10000);

  // Where the browser scrolls the page itself (core/scroll.js browserScrolls),
  // a piece drawn on the shared canvas trails the page by about a frame in a
  // fast flick. There the monogram gets its own see-through canvas at the top
  // of the opening screen instead, which the browser scrolls along with the
  // page, and it moves exactly with the page, as Dennis's photo does on his
  // phone. It still tilts back and fades as it goes.
  const own = browserScrolls();
  let ownCanvas = null;
  let ownRenderer = null;
  let drawn = false;
  if (own) {
    ownCanvas = document.createElement('canvas');
    ownCanvas.className = 'hero__gl';
    ownCanvas.setAttribute('aria-hidden', 'true');
    hero.prepend(ownCanvas);
    ownRenderer = new THREE.WebGLRenderer({ canvas: ownCanvas, antialias: true, alpha: true, powerPreference: 'high-performance', stencil: false });
    ownRenderer.outputColorSpace = THREE.SRGBColorSpace;
    ownRenderer.setClearColor(0x000000, 0);
    ownRenderer.setPixelRatio(state.dpr);
  }

  // Pose pieces, each eased on its own: the opening, and the lean toward the
  // cursor with the cursor light.
  const intro = { rx: 0, ry: 0, y: 0, scale: 1, opacity: 0 };
  const steer = createSteer(state);
  let introStarted = false;

  // Size and place, in CSS pixels: centred on the page between the location
  // pill and the role, clear of the big name; larger and higher on phones.
  const layout = () => {
    const w = state.width;
    const h = state.height;
    // Same breakpoint as the hero's phone layout in pages.css.
    const small = w <= 720;
    return {
      width: small ? clamp(w * 0.64, 220, 380) : clamp(Math.min(w * 0.3, h * 0.5), 240, 540),
      cy: h * (small ? 0.34 : 0.47),
    };
  };

  const layer = {
    order: 1,
    visible: true,
    resize() {
      const w = state.width;
      const h = state.height;
      // Pixel camera: one unit is one CSS pixel on the z = 0 plane.
      const dist = h / 2 / Math.tan((camera.fov * Math.PI) / 360);
      camera.aspect = w / h;
      camera.near = dist * 0.2;
      camera.far = dist * 3;
      camera.position.set(w / 2, -h / 2, dist);
      camera.lookAt(w / 2, -h / 2, 0);
      camera.updateProjectionMatrix();
      // Its own canvas covers the first screen, so the same camera fits it.
      ownRenderer?.setSize(w, h);
      drawn = false;
    },
    intro({ fromLoader = false } = {}) {
      introStarted = true;
      riseUp(intro, uniforms, fromLoader);
    },
    update() {
      const rect = hero.getBoundingClientRect();
      const progress = clamp(-rect.top / Math.max(rect.height, 1), 0, 1);
      // The opening screen shows only the monogram. The background lines fade
      // in once it has scrolled mostly away, and stay for the rest of the page.
      engine.field.uniforms.uFade.value = smoothstep(0.45, 0.95, progress);

      const opacity = (introStarted ? intro.opacity : 0) * (1 - smoothstep(0.15, 0.6, progress));
      uniforms.uOpacity.value = opacity;
      const showing = opacity > 0.002 && rect.bottom > 0;
      // With its own canvas the shared one draws nothing of it.
      layer.visible = showing && !own;
      if (!showing) {
        // Its own canvas keeps its last picture until told otherwise.
        if (own && drawn) {
          ownRenderer.clear();
          drawn = false;
        }
        return;
      }

      const { width, cy } = layout();
      const cx = state.width / 2;
      // On its own canvas it stays put on the opening screen and the browser
      // scrolls it; on the shared one it is moved to follow the page.
      const centerY = own ? cy : rect.top + cy;
      const s = steer.step(cx, centerY, width);

      // Scrolling away: it tilts back, lags a little behind the page (not on
      // touch screens, where it moves with the page as Dennis's photo does on
      // his phone, nor on its own canvas) and fades.
      const tiltBack = progress * 0.8;
      const lag = own || isTouch() ? 0 : progress * rect.height * 0.28;

      piece.rotation.set(REST.x + intro.rx + s.x - tiltBack, REST.y + intro.ry + s.y, s.z);
      piece.scale.setScalar((width / WIDTH) * intro.scale);
      piece.position.set(cx, -(centerY + intro.y + lag - s.lift), 0);
      uniforms.uCursor.value.set(s.light.x, -s.light.y, width * 1.6);

      if (own) {
        ownRenderer.render(scene, camera);
        drawn = true;
      }
    },
    render(renderer) {
      renderer.clearDepth();
      renderer.render(scene, camera);
      renderer.clearDepth();
    },
    dispose() {
      gsap.killTweensOf([intro, uniforms.uLight, uniforms.uSheen]);
      engine.field.uniforms.uFade.value = 1;
      geometry.dispose();
      solid.dispose();
      // Hand its WebGL context back, or each visit to the home page would
      // leave one more behind.
      if (ownRenderer) {
        ownRenderer.dispose();
        ownRenderer.forceContextLoss();
        ownCanvas.remove();
      }
    },
  };
  return layer;
}
