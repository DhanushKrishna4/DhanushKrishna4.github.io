// The red line, made the way Lusion makes theirs (the Line class in
// lusion.co's code). It is a flat ribbon of even width, not a lit tube: the
// edges are smoothed over one pixel, and the colour runs along its length from
// a deep red to the accent (blended in hue, saturation and brightness, quickly
// at first). Where the line crosses itself, the stretch underneath darkens by
// up to a tenth near the crossing once the stretch on top has been drawn. A
// round cap rides the tip as it draws. The ribbon's width follows Lusion's
// formula: 0.8% of the screen's diagonal, doubled on narrow screens.
// The paths are Lusion's own pen strokes, placed as theirs are wherever our
// layout allows (see Paths).
// It draws itself as you scroll, eased in and out, and retracts on the way up.
import * as THREE from 'three';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { isSmall, reducedMotion } from '../core/env.js';
import { browserScrolls } from '../core/scroll.js';
import { LINE_SHAPES } from '../../data/lines.js';

gsap.registerPlugin(ScrollTrigger);

// From the brand red at its start to the accent (--ember) at its end.
const COLOR_START = '#c1121f';
const COLOR_END = '#f2475a';

const hsv = /* glsl */ `
vec3 hsv2rgb(in vec3 c) {
  vec3 rgb = clamp(abs(mod(c.x * 6.0 + vec3(0.0, 4.0, 2.0), 6.0) - 3.0) - 1.0, 0.0, 1.0);
  rgb = rgb * rgb * (3.0 - 2.0 * rgb);
  return c.z * mix(vec3(1.0), rgb, c.y);
}
vec3 rgb2hsv(vec3 c) {
  vec4 K = vec4(0.0, -1.0 / 3.0, 2.0 / 3.0, -1.0);
  vec4 p = mix(vec4(c.bg, K.wz), vec4(c.gb, K.xy), step(c.b, c.g));
  vec4 q = mix(vec4(p.xyw, c.r), vec4(c.r, p.yzx), step(p.x, c.r));
  float d = q.x - min(q.w, q.y);
  float e = 1.0e-10;
  return vec3(abs(q.z + (q.w - q.y) / (6.0 * d + e)), d / (q.x + e), q.x);
}
vec3 lerpHSV(in vec3 a, in vec3 b, in float x) {
  float hue = (mod(mod((b.x - a.x), 1.0) + 1.5, 1.0) - 0.5) * x + a.x;
  return vec3(hue, mix(a.yz, b.yz, x));
}
`;

// CP: the centre line's point (xy, px) and which side this vertex is (z: 0 or
// 1). position: the side's direction (xy) and how far along the line (z, 0..1).
// Cd: 1 where nothing crosses over this stretch, falling to 0 under a crossing.
const vert = /* glsl */ `
attribute vec3 CP;
attribute float Cd;
uniform float u_radius;
varying float v_cd;
varying float v_lineRatio;
varying float v_s;
void main() {
  vec3 pos = vec3(CP.xy + position.xy * u_radius, 0.0);
  gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
  v_cd = Cd;
  v_lineRatio = position.z;
  v_s = CP.z;
}
`;

const frag = /* glsl */ `
varying float v_cd;
varying float v_lineRatio;
varying float v_s;
uniform float u_showRatio;
uniform vec3 u_color0;
uniform vec3 u_color1;
uniform float u_aoThreshold;
float linearStep(float edge0, float edge1, float x) {
  return clamp((x - edge0) / (edge1 - edge0), 0.0, 1.0);
}
${hsv}
void main() {
  float ao = 0.9 + 0.1 * v_cd;
  float aoRatio = linearStep(u_aoThreshold - 0.02, u_aoThreshold + 0.02, u_showRatio);
  if (step(u_showRatio, v_lineRatio) > 0.5) discard;
  float mixRatio = 1.0 - pow(1.0 - clamp(v_lineRatio, 0.0, 1.0), 2.0);
  gl_FragColor.rgb = hsv2rgb(lerpHSV(rgb2hsv(u_color1), rgb2hsv(u_color0), mixRatio));
  gl_FragColor.rgb *= min(1.0, ao + 1.0 - aoRatio);
  float alpha = abs(v_s - 0.5);
  gl_FragColor.a = linearStep(0.5, 0.5 - fwidth(alpha), alpha);
}
`;

// The round cap at the tip, in the colour the line has there.
const capVert = /* glsl */ `
uniform vec3 u_color0;
uniform vec3 u_color1;
uniform float u_mixRatio;
uniform float u_ao;
${hsv}
varying vec3 v_color;
varying vec2 v_uv;
void main() {
  v_color = u_ao * hsv2rgb(lerpHSV(rgb2hsv(u_color1), rgb2hsv(u_color0), u_mixRatio));
  v_uv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

const capFrag = /* glsl */ `
varying vec3 v_color;
varying vec2 v_uv;
void main() {
  float d = length(v_uv - 0.5) * 2.0;
  gl_FragColor.rgb = v_color;
  gl_FragColor.a = smoothstep(1.0, 1.0 - fwidth(d), d);
}
`;

// --- Paths -----------------------------------------------------------------
// Each line is one of Lusion's own pen strokes (data/lines.js), placed as they
// place theirs: drawn at the size of the screen's diagonal (the same shape on
// any screen, and always wider than it, so it runs in and out past the
// edges), with its corner `at` (x, y) diagonals from the section's top-left,
// y down (their margin), and drawing itself in from when the section's top
// is `start` of the way down the screen, over `span` screens of scrolling
// (their scrollToRatioFactors). `spot` picks the stroke and its corner for a
// screen w by h (d its diagonal), since on narrow screens only part of a
// stroke fits across and the layout changes under it.
// Their pages grow with the screen; ours stop growing at about 1700px wide.
// So on screens wider for their height than the 1512 by 982 one these were
// set on, a stroke is no taller than it is there next to the part of the page
// it runs through (`frame`, its section if not given): at most 1.73 times
// that part's height. Only its width follows the diagonal, so it still runs
// in and out past both edges without dipping into the next section.
const DEPTH = 1.73;
const LINES = {
  // Their intro's line (line_reel, in the section with their reel): in from
  // past the left edge behind the heading, one loop, and out past the right.
  // Where they put it, its way out runs behind our About me button (they have
  // no button there), so it sits 0.06 diagonals higher and passes beside it,
  // at least 30px clear on any screen. On phones (760px wide and below, where
  // the intro goes to one column) it sits a quarter of a diagonal higher than
  // theirs, so the loop rides the heading as theirs does on their phone
  // layout. Either way it starts drawing as much sooner as it sits higher
  // (`lead`), so it draws where theirs would on the screen.
  home: {
    start: 0.4,
    span: 1.3,
    spot: () =>
      isSmall() ? { shape: 'reel', at: [-0.05, 0.55], lead: 0.25 } : { shape: 'reel', at: [-0.05, 0.74], lead: 0.06 },
  },
  // Their About page's line (line_goal): in from the top right behind the
  // heading's first line, round past the left edge and back under the intro,
  // then up in an arch and down again between the intro and the facts. It
  // keeps this page's own timing, mostly drawn on arrival and finished before
  // the sheet comes up (theirs sits further down their page).
  // The nearer the screen is to square, the wider the stroke is next to it,
  // and the arch would reach round the Contact button (which starts 65% of
  // the way across or further): there the stroke moves left until the arch
  // (its right side 0.562 diagonals right of the corner) ends 62% across.
  // On screens taller than wide (their About lines don't show on phones or
  // tablets) the arch would land round the button whatever the shift, so it
  // is the last third of their intro's line instead, the stretch that draws
  // as the page starts to scroll: in from the left under the Contact button,
  // across the intro, and out past the right with its end just beyond it.
  // It starts drawing a touch later (a negative lead), so that on arrival its
  // tip is still off the left edge and none of it shows until the page moves.
  about: {
    frame: '[data-about-top]',
    start: 0.4,
    span: 0.667,
    spot: (w, h, d) =>
      w < h
        ? { shape: 'reel', at: [w / d - 0.97, 0.78], lead: -0.03 }
        : { shape: 'goal', at: [Math.min(-0.05, (0.62 * w - ribbonRadius(w, h)) / d - 0.562), 0.8] },
  },
};

// The stroke in px from the section's top-left: d across (the screen's
// diagonal) and dy down (the same, or less on wide screens; see DEPTH).
function place({ shape, at }, d, dy) {
  return LINE_SHAPES[shape].map(([x, y]) => [(at[0] + x) * d, (at[1] - y) * dy]);
}

// Points evenly spaced along a path, about `step` px apart, as Lusion's are
// (each point's share of the length is its place along it).
function resample(dense, step) {
  const acc = [0];
  for (let i = 1; i < dense.length; i++) {
    acc.push(acc[i - 1] + Math.hypot(dense[i][0] - dense[i - 1][0], dense[i][1] - dense[i - 1][1]));
  }
  const length = acc[acc.length - 1];
  const n = Math.max(2, Math.round(length / step) + 1);
  const pts = [];
  let j = 0;
  for (let i = 0; i < n; i++) {
    const d = (length * i) / (n - 1);
    while (j < acc.length - 2 && acc[j + 1] < d) j++;
    const f = (d - acc[j]) / Math.max(1e-9, acc[j + 1] - acc[j]);
    pts.push([dense[j][0] + (dense[j + 1][0] - dense[j][0]) * f, dense[j][1] + (dense[j + 1][1] - dense[j][1]) * f]);
  }
  return pts;
}

// Lusion's ribbon width: 0.8% of the screen's diagonal, times 2 at 540px wide
// and below, easing to 1 at 1920px.
const ribbonRadius = (w, h) => 0.008 * (2 - Math.min(1, Math.max(0, (w - 540) / (1920 - 540)))) * Math.hypot(w, h);

const quadInOut = (t) => (t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2);

// The ribbon: two vertices per point, one each side of the centre line.
// Where a later stretch passes over an earlier one, the earlier one gets a
// soft shadow (Cd), and the shadow appears once the later stretch is drawn.
function buildRibbon(pts, radius) {
  const n = pts.length;
  const cp = new Float32Array(n * 6);
  const pos = new Float32Array(n * 6);
  const cd = new Float32Array(n * 2);
  const index = [];
  const ratio = new Float32Array(n);
  const shade = new Float32Array(n).fill(1);
  const step = Math.hypot(pts[1][0] - pts[0][0], pts[1][1] - pts[0][1]) || 1;
  const gap = Math.ceil((radius * 8) / step);
  let threshold = 2;
  for (let i = 0; i < n; i++) {
    for (let j = i + gap; j < n; j++) {
      const d = Math.hypot(pts[j][0] - pts[i][0], pts[j][1] - pts[i][1]);
      if (d < radius * 4.4) {
        const t = Math.min(1, Math.max(0, (d - radius * 0.2) / (radius * 4.2)));
        const v = t * t * (3 - 2 * t);
        if (v < shade[i]) shade[i] = v;
        if (v < 0.5) threshold = Math.min(threshold, j / (n - 1));
      }
    }
  }
  for (let i = 0; i < n; i++) {
    const a = pts[Math.max(0, i - 1)];
    const b = pts[Math.min(n - 1, i + 1)];
    let tx = b[0] - a[0];
    let ty = -(b[1] - a[1]);
    const len = Math.hypot(tx, ty) || 1;
    tx /= len;
    ty /= len;
    const nx = -ty;
    const ny = tx;
    const x = pts[i][0];
    const y = -pts[i][1];
    ratio[i] = i / (n - 1);
    cp.set([x, y, 1, x, y, 0], i * 6);
    pos.set([-nx, -ny, ratio[i], nx, ny, ratio[i]], i * 6);
    cd[i * 2] = cd[i * 2 + 1] = shade[i];
    if (i < n - 1) {
      const k = i * 2;
      index.push(k, k + 2, k + 1, k + 1, k + 2, k + 3);
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geometry.setAttribute('CP', new THREE.BufferAttribute(cp, 3));
  geometry.setAttribute('Cd', new THREE.BufferAttribute(cd, 1));
  geometry.setIndex(index);
  return { geometry, points: pts.map(([x, y]) => [x, -y]), shade, threshold: threshold > 1 ? 2 : threshold };
}

export function createLine(engine, section, kind = 'home') {
  if (!section || !LINES[kind]) return null;
  const { state } = engine;
  // The part of the page the line runs through, which sets its height on
  // wide screens (DEPTH).
  const frame = (LINES[kind].frame && section.closest(LINES[kind].frame)) || section;

  const colors = { u_color0: { value: new THREE.Color(COLOR_END) }, u_color1: { value: new THREE.Color(COLOR_START) } };
  const material = new THREE.ShaderMaterial({
    vertexShader: vert,
    fragmentShader: frag,
    uniforms: { ...colors, u_showRatio: { value: 0 }, u_aoThreshold: { value: 2 }, u_radius: { value: 10 } },
    transparent: true,
    depthTest: false,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
  const capMaterial = new THREE.ShaderMaterial({
    vertexShader: capVert,
    fragmentShader: capFrag,
    uniforms: { ...colors, u_mixRatio: { value: 0 }, u_ao: { value: 1 } },
    transparent: true,
    depthTest: false,
    depthWrite: false,
    side: THREE.DoubleSide,
  });

  const scene = new THREE.Scene();
  const group = new THREE.Group();
  scene.add(group);
  const camera = new THREE.OrthographicCamera(0, 1, 0, -1, -10, 10);
  const cap = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), capMaterial);
  cap.frustumCulled = false;
  cap.renderOrder = 1;
  group.add(cap);
  let mesh = null;
  let line = null;
  const progress = { value: reducedMotion() ? 1 : 0 };

  // Where the browser scrolls the page itself (core/scroll.js browserScrolls),
  // a line drawn on the shared canvas trails the page by about a frame in a
  // fast flick (measured: 30 to 45px). There it gets its own see-through
  // canvas inside its section instead, just tall enough for its path, which
  // the browser scrolls with the page; on About it also pins and is cut off
  // with the top part that holds it. It sits behind the section's text, as
  // the shared canvas does.
  const own = browserScrolls();
  let ownCanvas = null;
  let ownRenderer = null;
  let drawn = false;
  let box = null; // its own canvas in the section: top, width, height (px)
  // There its drawing also eases toward where the scroll puts it, at our
  // desktop smooth scroll's pace (Lenis, lerp 0.1: 1 - e^(-6t)), so it draws
  // in and out as fluidly as on desktop even when the phone reports the
  // scroll in uneven steps or a frame is missed.
  const pace = { to: 0, at: 0 };
  // And the browser bar showing or hiding, which only changes the screen's
  // height, neither rebuilds it nor changes its width: that is worked out
  // from the tallest the screen has been at this width.
  let tall = { w: 0, h: 0 };
  if (own) {
    ownCanvas = document.createElement('canvas');
    ownCanvas.className = 'line-gl';
    ownCanvas.setAttribute('aria-hidden', 'true');
    section.prepend(ownCanvas);
    ownRenderer = new THREE.WebGLRenderer({ canvas: ownCanvas, antialias: true, alpha: true, powerPreference: 'high-performance', stencil: false });
    ownRenderer.outputColorSpace = THREE.SRGBColorSpace;
    ownRenderer.setClearColor(0x000000, 0);
    ownRenderer.setPixelRatio(state.dpr);
  }
  // The camera shows the screen (shared canvas), or the strip of the section
  // its own canvas covers.
  const fit = () => {
    camera.left = 0;
    camera.right = own && box ? box.width : state.width;
    camera.top = own && box ? -box.top : 0;
    camera.bottom = own && box ? -(box.top + box.height) : -state.height;
    camera.updateProjectionMatrix();
  };

  // The screen (on its own canvas, the tallest it has been at this width) and
  // where the stroke goes on it.
  const measure = () => {
    const vw = innerWidth;
    let vh = innerHeight;
    if (own) {
      if (tall.w !== vw) tall = { w: vw, h: 0 };
      vh = tall.h = Math.max(tall.h, vh);
    }
    const d = Math.hypot(vw, vh);
    return { vw, vh, d, dy: Math.min(d, DEPTH * (frame.offsetHeight || Infinity)), spot: LINES[kind].spot(vw, vh, d) };
  };

  const build = () => {
    const { vw, vh, d, dy, spot } = measure();
    const radius = ribbonRadius(vw, vh);
    const next = buildRibbon(resample(place(spot, d, dy), 6), radius);
    if (mesh) {
      group.remove(mesh);
      mesh.geometry.dispose();
    }
    line = next;
    mesh = new THREE.Mesh(line.geometry, material);
    mesh.frustumCulled = false;
    group.add(mesh);
    material.uniforms.u_radius.value = radius;
    material.uniforms.u_aoThreshold.value = line.threshold;
    cap.scale.set(radius, radius, 1);
    if (own) {
      // From just above the path's highest point to just below its lowest,
      // the ribbon and its round tip included; the section's full width.
      const ys = line.points.map(([, y]) => -y);
      const pad = radius * 1.5 + 4;
      const top = Math.floor(Math.min(...ys) - pad);
      box = { top, width: section.clientWidth, height: Math.ceil(Math.max(...ys) + pad) - top };
      ownCanvas.style.top = `${top}px`;
      ownRenderer.setSize(box.width, box.height);
      drawn = false;
      fit();
    }
  };

  const { start, span } = LINES[kind];
  const trigger = ScrollTrigger.create({
    trigger: section,
    start: () => {
      const { dy, spot } = measure();
      return `top ${start * innerHeight + (spot.lead || 0) * dy}px`;
    },
    end: () => `+=${span * innerHeight}`,
    onUpdate: (self) => {
      if (reducedMotion()) return;
      if (own) pace.to = self.progress;
      else progress.value = quadInOut(self.progress);
    },
    onRefresh: (self) => {
      build();
      if (reducedMotion()) return;
      // A refresh puts it straight where it belongs.
      pace.to = pace.at = self.progress;
      progress.value = quadInOut(self.progress);
    },
  });
  let disposed = false;
  build();
  if (!reducedMotion()) {
    pace.to = pace.at = trigger.progress;
    progress.value = quadInOut(trigger.progress);
  }
  // Text settles once the fonts arrive; measure again then.
  document.fonts?.ready.then(() => !disposed && build());
  let built = { w: state.width, h: state.height, s: frame.offsetHeight };

  const layer = {
    order: 2,
    visible: true,
    resize() {
      fit();
    },
    update() {
      const rect = section.getBoundingClientRect();
      if (own && !reducedMotion()) {
        pace.at += (pace.to - pace.at) * (1 - Math.exp(-6 * state.delta));
        if (Math.abs(pace.to - pace.at) < 1e-4) pace.at = pace.to;
        progress.value = quadInOut(pace.at);
      }
      const t = progress.value;
      const showing = !!line && t > 0.0005 && rect.bottom > -state.height && rect.top < state.height * 2;
      // With its own canvas the shared one draws nothing of it.
      layer.visible = showing && !own;
      // On its own canvas a change in the screen's height alone (the browser
      // bar) is no reason to rebuild.
      if (state.width !== built.w || (!own && state.height !== built.h) || frame.offsetHeight !== built.s) {
        build();
        built = { w: state.width, h: state.height, s: frame.offsetHeight };
      }
      if (own && !showing && drawn) {
        // Its own canvas keeps its last picture until told otherwise.
        ownRenderer.clear();
        drawn = false;
      }
      if (!line) return;
      // On its own canvas the path stays in the section's own coordinates
      // and the browser scrolls it; on the shared one it follows the section.
      group.position.set(own ? 0 : rect.left, own ? 0 : -rect.top, 0);
      material.uniforms.u_showRatio.value = t;
      // The cap sits where the drawing has reached, in the line's colour there.
      const pts = line.points;
      const f = Math.min(1, Math.max(0, t)) * (pts.length - 1);
      const i = Math.min(pts.length - 2, Math.floor(f));
      const k = f - i;
      cap.position.set(pts[i][0] + (pts[i + 1][0] - pts[i][0]) * k, pts[i][1] + (pts[i + 1][1] - pts[i][1]) * k, 0);
      const th = material.uniforms.u_aoThreshold.value;
      const shade = line.shade[i] + (line.shade[i + 1] - line.shade[i]) * k;
      const on = Math.min(1, Math.max(0, (t - (th - 0.02)) / 0.04));
      capMaterial.uniforms.u_ao.value = Math.min(1, 0.9 + 0.1 * shade + 1 - on);
      capMaterial.uniforms.u_mixRatio.value = 1 - (1 - Math.min(1, t)) ** 2;
      if (own && showing) {
        ownRenderer.render(scene, camera);
        drawn = true;
      }
    },
    render(renderer) {
      renderer.clearDepth();
      renderer.render(scene, camera);
    },
    dispose() {
      disposed = true;
      trigger.kill();
      mesh?.geometry.dispose();
      cap.geometry.dispose();
      material.dispose();
      capMaterial.dispose();
      // Hand its WebGL context back, or each visit would leave one behind.
      if (ownRenderer) {
        ownRenderer.dispose();
        ownRenderer.forceContextLoss();
        ownCanvas.remove();
      }
    },
  };
  return layer;
}
