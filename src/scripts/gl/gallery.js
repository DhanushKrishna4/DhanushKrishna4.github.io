// A project page's gallery, drawn the way Lusion draws theirs (their
// ProjectDetailsItem and ProjectDetailsScreen). Each image or clip is a quad
// on top of its place in the page:
//  - it opens as it comes into view: the rounded frame grows from 60% to its
//    full size about its middle while the picture inside settles from a 1/0.6
//    zoom (project.js times it: a second, expo out, from when it appears);
//  - until its picture has loaded it is a plain panel, then the picture fades
//    in over a second.
// The whole gallery is drawn off screen and copied to it through their
// screen pass: while it moves, it bends in a slow wave and smears along the
// way it moves, by how far it went since the last frame (a share of the
// screen, at most 0.15). The first image keeps its glowing edge, drawn here
// too: a 2px ring and a soft halo in the project's colours, turning slowly.
// The page's own elements stay underneath for layout, links and readers.
import * as THREE from 'three';
import { fullscreenVert } from './glsl.js';

const vert = /* glsl */ `
uniform vec4 uQuad; // x, y, w, h in CSS px, y down
varying vec2 vPx;
void main() {
  vPx = uQuad.xy + vec2(uv.x, 1.0 - uv.y) * uQuad.zw;
  gl_Position = projectionMatrix * viewMatrix * vec4(vPx.x, -vPx.y, 0.0, 1.0);
}
`;

const frag = /* glsl */ `
precision highp float;
uniform sampler2D uTexture;
uniform vec4 uRect; // the frame: x, y, w, h in CSS px
uniform float uOpen; // 0.6 .. 1
uniform float uReady; // 0 .. 1
uniform float uOpacity;
uniform float uRadius;
uniform vec3 uPanel;
uniform float uGlow;
uniform float uTime;
uniform vec3 uAccent;
uniform vec3 uFg;
varying vec2 vPx;

float roundedBox(vec2 p, vec2 b, float r) {
  vec2 q = abs(p) - b + r;
  return min(max(q.x, q.y), 0.0) + length(max(q, 0.0)) - r;
}
// The CSS glow's conic gradient: accent, accent toward the text colour,
// accent toward blue, accent, turning once every 8 seconds.
vec3 conic(vec2 p) {
  float a = fract(atan(p.x, -p.y) / 6.2831853 - uTime / 8.0);
  vec3 c0 = uAccent;
  vec3 c1 = mix(uFg, uAccent, 0.4);
  vec3 c2 = mix(vec3(0.42, 0.55, 1.0), uAccent, 0.6);
  vec3 c = a < 1.0 / 3.0 ? mix(c0, c1, a * 3.0) : a < 2.0 / 3.0 ? mix(c1, c2, a * 3.0 - 1.0) : mix(c2, c0, a * 3.0 - 2.0);
  return c;
}
float erfc_(float x) {
  // Abramowitz-Stegun: good to 1e-4, plenty for a glow.
  float t = 1.0 / (1.0 + 0.5 * abs(x));
  float y = t * exp(-x * x - 1.26551223 + t * (1.00002368 + t * (0.37409196 + t * (0.09678418 + t * (-0.18628806 + t * (0.27886807 + t * (-1.13520398 + t * (1.48851587 + t * (-0.82215223 + t * 0.17087277)))))))));
  return x >= 0.0 ? y : 2.0 - y;
}

void main() {
  vec2 centre = uRect.xy + uRect.zw * 0.5;
  vec2 p = vPx - centre;
  // Their mask: the rounded frame at uOpen of its size, about its middle.
  float d = roundedBox(p, uRect.zw * 0.5 * uOpen, uRadius);
  float inside = clamp(0.5 - d / max(fwidth(d), 1e-4), 0.0, 1.0);
  // Their picture: sampled with its coordinates scaled by uOpen (a zoom).
  vec2 uv = (p / uRect.zw) * uOpen + 0.5;
  vec3 picture = texture2D(uTexture, vec2(uv.x, 1.0 - uv.y)).rgb;
  vec3 colour = mix(uPanel, picture, uReady);
  vec4 outColour = vec4(colour * inside, inside);
  if (uGlow > 0.5) {
    vec3 g = conic(p);
    // The 2px ring just outside the frame...
    float ring = clamp(2.0 - d, 0.0, 1.0) * clamp(d + 0.5, 0.0, 1.0);
    // ...and the halo: the frame grown 6px, blurred by 18px, at 0.75.
    float halo = 0.75 * 0.5 * erfc_((d - 6.0) / (18.0 * 1.41421356));
    float a = max(ring, halo) * (1.0 - inside);
    outColour += vec4(g * a, a);
  }
  gl_FragColor = outColour * uOpacity;
}
`;

// Their screen pass: a wave across the gallery and a smear along the way it
// moves, both by the strength of the movement (their u_scrollXStrength).
const postFrag = /* glsl */ `
precision highp float;
uniform sampler2D uScene;
uniform float uStrength;
uniform float uVertical;
varying vec2 vUv;
float noise(vec2 p) {
  return fract(52.9829189 * fract(dot(p, vec2(0.06711056, 0.00583715))));
}
void main() {
  vec2 uv = vUv;
  float moveAxis = uVertical > 0.5 ? 1.0 - vUv.y : vUv.x;
  float wave = cos(moveAxis * 6.2831853) * 2.0 * uStrength * uStrength;
  vec2 bit = vec2(0.0);
  if (uVertical > 0.5) {
    uv.x += wave;
    bit.y = uStrength / 8.0;
  } else {
    uv.y += wave;
    bit.x = uStrength / 8.0;
  }
  uv += bit * noise(gl_FragCoord.xy);
  vec4 sum = vec4(0.0);
  for (int i = 0; i < 8; i++) {
    sum += texture2D(uScene, uv);
    uv += bit;
  }
  gl_FragColor = sum / 8.0;
}
`;

// Any CSS colour to a 0..1 triple, through the canvas's own parser.
const toRgb = (() => {
  const ctx = document.createElement('canvas').getContext('2d');
  return (css, fallback = [0, 0, 0]) => {
    ctx.fillStyle = '#000';
    ctx.fillStyle = css || '#000';
    const v = ctx.fillStyle;
    if (v.startsWith('#')) return [1, 3, 5].map((i) => parseInt(v.slice(i, i + 2), 16) / 255);
    const m = v.match(/[\d.]+/g);
    return m ? m.slice(0, 3).map((n) => +n / 255) : fallback;
  };
})();

// items: [{ fig, frame, el, open, ready, hero }], shared with project.js,
// which keeps open (0.6..1) and ready (0..1) up to date.
// motion(): how far the gallery moved this frame, as a share of the screen.
// root: the page (its opacity fades the gallery during project transitions).
export function createGallery(engine, items, { root = null, motion = () => 0, vertical = () => false } = {}) {
  const { state, renderer } = engine;
  const html = document.documentElement;
  const scene = new THREE.Scene();
  const camera = new THREE.OrthographicCamera(0, 1, 0, -1, -10, 10);
  const geometry = new THREE.PlaneGeometry(1, 1);
  const rt = new THREE.WebGLRenderTarget(1, 1, { depthBuffer: false });
  const bufferSize = new THREE.Vector2();
  const post = new THREE.Mesh(
    new THREE.PlaneGeometry(2, 2),
    new THREE.ShaderMaterial({
      vertexShader: fullscreenVert,
      fragmentShader: postFrag,
      uniforms: { uScene: { value: rt.texture }, uStrength: { value: 0 }, uVertical: { value: 0 } },
      transparent: true,
      premultipliedAlpha: true,
      depthTest: false,
      depthWrite: false,
    }),
  );
  const postScene = new THREE.Scene();
  postScene.add(post);
  const postCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  const time = { value: 0 };
  const accent = new THREE.Color();
  const fg = new THREE.Color();

  const meshes = items.map((it) => {
    const isVideo = it.el?.tagName === 'VIDEO';
    let texture = null;
    if (it.el) {
      texture = isVideo ? new THREE.VideoTexture(it.el) : new THREE.Texture(it.el);
      texture.minFilter = isVideo ? THREE.LinearFilter : THREE.LinearMipmapLinearFilter;
      texture.generateMipmaps = !isVideo;
      texture.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
      if (!isVideo) {
        const upload = () => (texture.needsUpdate = true);
        if (it.el.complete && it.el.naturalWidth) upload();
        else it.el.addEventListener('load', upload, { once: true });
      }
    }
    const uniforms = {
      uTexture: { value: texture },
      uQuad: { value: new THREE.Vector4() },
      uRect: { value: new THREE.Vector4() },
      uOpen: { value: 1 },
      uReady: { value: 0 },
      uOpacity: { value: 1 },
      uRadius: { value: 12 },
      uPanel: { value: new THREE.Color() },
      uGlow: { value: it.hero ? 1 : 0 },
      uTime: time,
      uAccent: { value: accent },
      uFg: { value: fg },
    };
    const mesh = new THREE.Mesh(
      geometry,
      new THREE.ShaderMaterial({ vertexShader: vert, fragmentShader: frag, uniforms, transparent: true, premultipliedAlpha: true, depthTest: false, depthWrite: false }),
    );
    mesh.frustumCulled = false;
    mesh.visible = false;
    scene.add(mesh);
    return { it, mesh, uniforms, texture };
  });

  // Colours from the page (project pages bring their own), read before the
  // page's own frames are emptied; the corner radius whenever it may change.
  const page = getComputedStyle(html);
  accent.setRGB(...toRgb(page.getPropertyValue('--accent')));
  fg.setRGB(...toRgb(page.getPropertyValue('--fg'), [1, 1, 1]));
  meshes.forEach(({ it, uniforms }) => uniforms.uPanel.value.setRGB(...toRgb(getComputedStyle(it.frame).backgroundColor)));
  const readRadius = () =>
    meshes.forEach(({ it, uniforms }) => (uniforms.uRadius.value = parseFloat(getComputedStyle(it.fig).borderTopLeftRadius) || 12));
  readRadius();
  html.classList.add('gl-gallery');

  const layer = {
    order: 4,
    visible: true,
    resize() {
      camera.left = 0;
      camera.right = state.width;
      camera.top = 0;
      camera.bottom = -state.height;
      camera.updateProjectionMatrix();
      renderer.getDrawingBufferSize(bufferSize);
      rt.setSize(bufferSize.x, bufferSize.y);
      readRadius();
    },
    update() {
      time.value = state.time;
      const pageOpacity = parseFloat(root?.style.opacity);
      const fade = Number.isFinite(pageOpacity) ? pageOpacity : 1;
      let any = false;
      for (const { it, mesh, uniforms } of meshes) {
        const r = it.frame.getBoundingClientRect();
        const pad = it.hero ? 60 : 2;
        const show = r.right + pad > 0 && r.left - pad < state.width && r.bottom + pad > 0 && r.top - pad < state.height;
        mesh.visible = show;
        if (!show) continue;
        any = true;
        uniforms.uRect.value.set(r.left, r.top, r.width, r.height);
        uniforms.uQuad.value.set(r.left - pad, r.top - pad, r.width + pad * 2, r.height + pad * 2);
        uniforms.uOpen.value = it.open > 0 ? it.open : 1;
        uniforms.uReady.value = it.ready;
        const o = parseFloat(it.fig.style.opacity);
        uniforms.uOpacity.value = (Number.isFinite(o) ? o : 1) * fade;
      }
      layer.visible = any;
      post.material.uniforms.uStrength.value = Math.min(0.15, motion());
      post.material.uniforms.uVertical.value = vertical() ? 1 : 0;
    },
    render(r) {
      r.setRenderTarget(rt);
      r.setClearColor(0x000000, 0);
      r.clear(true, false, false);
      r.render(scene, camera);
      r.setRenderTarget(null);
      r.setClearColor(0x000000, 1);
      r.render(postScene, postCamera);
    },
    dispose() {
      html.classList.remove('gl-gallery');
      meshes.forEach(({ mesh, texture }) => {
        mesh.material.dispose();
        texture?.dispose();
      });
      geometry.dispose();
      rt.dispose();
      post.material.dispose();
    },
  };
  return layer;
}
