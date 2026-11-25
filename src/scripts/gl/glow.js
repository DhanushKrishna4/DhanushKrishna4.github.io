// Giant words behind a section, drawn and lit the way Lusion draws the title
// of their awards section (their AboutAwardSection, titleVert/titleFrag),
// with their screen paint (paint.js) under the pointer:
//  - the words are near-black shapes with faint grey outlines, both
//    brightening and dimming in a slow diagonal wave across the screen;
//  - where the pointer has painted, they take the colours of their gradient
//    (plum, red, orange, pink, cyan, blue, purple and round again), picked by
//    which way the paint moves and by that wave; the outlines take four times
//    as much, which washes them toward white;
//  - across the black sheet the paint also leaves a faint rainbow fringe,
//    the colour their screen distortion pass adds (ScreenPaintDistortion).
// Their outlines are round-ended lines max(1px, width / 1200) either side of
// each letter's edge, with the letters drawn over them. Here both come from a
// mask each line is drawn into: red is the inside, green the outline band.
// Each line is its own quad, drawn where the page's copy of that line is, so
// the lines slide sideways with it as you scroll (pages/about.js).
// Markup: an element with data-glow-words holding one <span> per line (see
// .glow-words). The paint runs while the black sheet is on screen.
//
// Where the browser scrolls the page itself (reduced motion; core/scroll.js
// browserScrolls), anything on the shared canvas trails the page by a frame
// in a fast flick: the words slid down behind the title under them, and the
// sheet's black edge (drawn by field.js) lagged its text. There the words, the
// fringe and the paint get their own see-through canvas inside the sheet,
// which the browser moves with the page (the screen's height and 30% more
// above and below it, moved back over the screen and redrawn each frame), and
// the sheet gets a black background of its own, so its edge is the page's.
import * as THREE from 'three';
import { fullscreenVert } from './glsl.js';
import { createPaint } from './paint.js';
import { browserScrolls } from '../core/scroll.js';

// Their gradient (award_gradient.png): 256 colours, read left to right,
// wrapping round from the last to the first.
const GRADIENT =
  '38072d3a082e3d082e40092e43092e460a2f4a0a2f4e0b2f520b2f570b2f5b0b2f600b2f640b2f690a2f6f0a2f74092f' +
  '79082f7f072e84062e8a052e90032d95012c9b002ca1002ba7002aac0029b20028b80026bd0025c20024c80022cd0020' +
  'd2001fd7001ddb001bdf0019e30017e70015ea0113ee0712f10e10f4150ef61b0cf9200afb2609fd2b07ff3007ff350d' +
  'ff3b11ff4015ff4419ff491cff4d1eff5221ff5623ff5a26ff5e28ff622aff662cff692eff6d30ff7031ff7333ff7735' +
  'ff7a36ff7d38ff8039ff833bff853cff883eff8a3fff8c40ff8f41ff9143ff9344ff9545ff9647ff984aff994dfe9b50' +
  'fe9c53fe9d57fe9e5afd9f5efda061fda165fca268fca36cfca46ffca573fba677fba67afaa77efaa881faa885f9a988' +
  'f9aa8cf8aa8ff8ab93f7ab96f7ac99f6ac9df5ada0f5ada3f4aea6f3aeaaf3afadf2afb0f1b0b2f0b0b5efb1b8eeb1bb' +
  'edb2beecb2c0ebb3c3eab4c5e8b4c7e7b5c9e6b6cce4b6cee3b7cfe1b8d2deb9d3dcbad5d9bbd6d7bcd8d4bdd9d1beda' +
  'cec0dbcac1ddc7c2dec3c3dfbfc4e0bcc6e1b8c7e2b4c8e2afcae3abcbe4a6cce5a2cde69dcfe798d0e893d1e88ed2e9' +
  '88d3ea83d4eb7dd5ec77d6ed71d7ee6bd8ef65d9f15edaf257daf350dbf549dbf641dcf839dcf930ddfb27ddfd1cddff' +
  '0fdcff00daff00d9ff00d7ff00d5ff00d3ff00d0ff00ceff00cbff00c8ff00c5ff00c2ff00beff00bbff00b7ff00b4ff' +
  '00b0ff00acff00a8ff00a4ff00a0ff009cff0098ff0094ff008fff008bff0087ff0082ff007eff007aff0076ff0072ff' +
  '006eff006aff0066ff0062ff005fff005bff0058ff0355fc0551f9064ef6064bf30548f00444ed0441ea033ee7013be4' +
  '0037e10034df0030dc002dd9002ad50028d10026ce0023ca0021c6001fc2001dbe001cba001ab60019b20017af0016ab' +
  '0015a70013a300129f00119c001198011095030f91060f8d090f890c0f850f0f8012107c14107816117319126f1b126b' +
  '1d12661f126221135d23125925125527125129124d2a114a2c11462e10422f0f3f310e3c320d39330c36340b33350931';

const gradientTexture = () => {
  const data = new Uint8Array(256 * 4);
  for (let i = 0; i < 256; i++) {
    for (let k = 0; k < 3; k++) data[i * 4 + k] = parseInt(GRADIENT.substr((i * 3 + k) * 2, 2), 16);
    data[i * 4 + 3] = 255;
  }
  const texture = new THREE.DataTexture(data, 256, 1, THREE.RGBAFormat, THREE.UnsignedByteType);
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.minFilter = texture.magFilter = THREE.LinearFilter;
  texture.generateMipmaps = false;
  texture.needsUpdate = true;
  return texture;
};

// Their screen distortion pass's settings (site defaults, which their About
// page is back to by the awards): colour fringe strength, channel shift, shade.
const FRINGE = { colorMultiplier: 10, rgbShift: 0.5, shade: 1.25 };

const vert = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

// Their smooth (B-spline) lookup of the paint, from four filtered samples.
const bicubic = /* glsl */ `
vec4 cubic(float v) {
  vec4 n = vec4(1.0, 2.0, 3.0, 4.0) - v;
  vec4 s = n * n * n;
  float x = s.x;
  float y = s.y - 4.0 * s.x;
  float z = s.z - 4.0 * s.y + 6.0 * s.x;
  float w = 6.0 - x - y - z;
  return vec4(x, y, z, w);
}
vec4 textureBicubic(sampler2D t, vec2 texCoords, vec2 textureSize) {
  vec2 invTexSize = 1.0 / textureSize;
  texCoords = texCoords * textureSize - 0.5;
  vec2 fxy = fract(texCoords);
  texCoords -= fxy;
  vec4 xcubic = cubic(fxy.x);
  vec4 ycubic = cubic(fxy.y);
  vec4 c = texCoords.xxyy + vec2(-0.5, 1.5).xyxy;
  vec4 s = vec4(xcubic.xz + xcubic.yw, ycubic.xz + ycubic.yw);
  vec4 offset = c + vec4(xcubic.yw, ycubic.yw) / s;
  offset *= invTexSize.xxyy;
  vec4 sample0 = texture2D(t, offset.xz);
  vec4 sample1 = texture2D(t, offset.yz);
  vec4 sample2 = texture2D(t, offset.xw);
  vec4 sample3 = texture2D(t, offset.yw);
  float sx = s.x / (s.x + s.y);
  float sy = s.z / (s.z + s.w);
  return mix(mix(sample3, sample2, sx), mix(sample1, sample0, sx), sy);
}
`;

// uScreen: the screen's size, and uOrigin its bottom-left corner in the canvas
// drawn to (device px), so the wave and the paint stay put on the screen.
// The words are taller than their section and run on under the ones below
// it, but stop at the page's bottom edge, where the footer shows (as the
// fringe below; uTop is how far the canvas's top is above the screen's).
const wordsFrag = /* glsl */ `
precision highp float;
uniform sampler2D uMask;
uniform sampler2D uPaint;
uniform vec2 uPaintSize;
uniform sampler2D uGradient;
uniform vec2 uScreen;
uniform vec2 uOrigin;
uniform float uTime;
uniform float uSeed;
uniform vec2 uRes;
uniform float uTop;
uniform float uFootEdge;
uniform float uFootDepth;
uniform float uFootW;
varying vec2 vUv;
${bicubic}
// A grain of 1/250 that moves every frame (their blue noise does the same).
float grain(vec2 p) {
  p += uSeed;
  return fract(52.9829189 * fract(dot(p, vec2(0.06711056, 0.00583715))));
}

void main() {
  float fx = clamp(gl_FragCoord.x / uFootW, 0.0, 1.0);
  if (uRes.y - gl_FragCoord.y - uTop >= uFootEdge + uFootDepth * 4.0 * fx * (1.0 - fx)) discard;
  vec4 mask = texture2D(uMask, vUv);
  float fillA = mask.r;
  float edgeA = mask.g * (1.0 - fillA);
  float alpha = fillA + edgeA;
  if (alpha < 0.002) discard;
  vec2 screenUv = (gl_FragCoord.xy - uOrigin) / uScreen;
  vec4 paint = textureBicubic(uPaint, screenUv, uPaintSize);
  float painted = max(paint.z, paint.w);
  float hue = (paint.x + paint.y) * 1.5;
  float noise = grain(gl_FragCoord.xy) * 0.004;
  // The letters: next to black, the wave adding up to 1.5%, and the
  // gradient as far as there is paint.
  float d = cos((screenUv.x + screenUv.y) * 4.0 + uTime) * 0.5 + 0.5;
  vec3 fill = mix(vec3(0.004 + d * d * 0.015), texture2D(uGradient, vec2(hue + d * 2.0, 0.5)).rgb, painted) + noise;
  // The outlines: the wave half a turn on, adding up to 15% grey and, where
  // it is high, a touch of the gradient; the paint counts four times over.
  d = cos((screenUv.x + screenUv.y) * 4.0 + uTime + 3.1415926) * 0.5 + 0.5;
  vec3 edge = mix(vec3(0.004 + d * d * 0.15), texture2D(uGradient, vec2(hue + d * 2.0, 0.5)).rgb, painted * 4.0 + max(0.0, d * 2.0 - 1.0) * 0.15) + noise;
  // The outlines first, then the letters over them.
  gl_FragColor = vec4(clamp(edge, 0.0, 1.0) * edgeA + clamp(fill, 0.0, 1.0) * fillA, alpha);
}
`;

// The colour their distortion pass adds where the paint is fading, on the
// black sheet only (the region field.js leaves without lines). y is measured
// from the screen's top (device px; uTop is how far the canvas's top is above
// it), and nothing is read from the paint beyond the screen.
const fringeFrag = /* glsl */ `
precision highp float;
uniform sampler2D uPaint;
uniform vec2 uRes;
uniform vec2 uScreen;
uniform float uTop;
uniform float uSheetTop;
uniform float uFootEdge;
uniform float uFootDepth;
uniform float uFootW;
void main() {
  float fx = clamp(gl_FragCoord.x / uFootW, 0.0, 1.0);
  float foot = uFootEdge + uFootDepth * 4.0 * fx * (1.0 - fx);
  float y = uRes.y - gl_FragCoord.y - uTop;
  if (y < uSheetTop || y >= foot) discard;
  vec2 screenUv = vec2(gl_FragCoord.x / uScreen.x, 1.0 - y / uScreen.y);
  vec4 data = screenUv.y < 0.0 || screenUv.y > 1.0 ? vec4(0.5, 0.5, 0.0, 0.0) : texture2D(uPaint, screenUv);
  float weight = (data.z + data.w) * 0.5;
  vec2 vel = (0.5 - data.xy - 0.001) * 2.0 * weight;
  // Their smoothstep(0.4, -0.9, weight), written out: strongest as it fades.
  float t = clamp((weight - 0.4) / -1.3, 0.0, 1.0);
  vec3 colour = sin(vec3(vel.x + vel.y) * 40.0 + vec3(0.0, 2.0, 4.0) * ${FRINGE.rgbShift.toFixed(2)})
    * t * t * (3.0 - 2.0 * t) * ${FRINGE.shade.toFixed(2)} * max(abs(vel.x), abs(vel.y)) * ${FRINGE.colorMultiplier.toFixed(1)};
  gl_FragColor = vec4(max(colour, 0.0), 1.0);
}
`;

export function createGlow(engine, section) {
  const words = section?.querySelector('[data-glow-words]');
  if (!words) return null;
  const { state, field } = engine;
  const sheet = section.closest('[data-about-sheet]') ?? section;

  // Reduced motion: the own canvas (see the top of this file), its top
  // `win.margin` above the screen's. Its height comes from the tallest the
  // screen has been at this width, so the browser bar never resizes it.
  const own = browserScrolls();
  let ownCanvas = null;
  let ownRenderer = null;
  let ownDrawn = false;
  const win = { w: 0, tall: 0, margin: 0, height: 0 };
  if (own) {
    ownCanvas = document.createElement('canvas');
    ownCanvas.className = 'glow-gl';
    ownCanvas.setAttribute('aria-hidden', 'true');
    sheet.prepend(ownCanvas);
    sheet.classList.add('has-glow-gl');
    ownRenderer = new THREE.WebGLRenderer({ canvas: ownCanvas, antialias: false, alpha: true, premultipliedAlpha: true, powerPreference: 'high-performance', stencil: false });
    ownRenderer.outputColorSpace = THREE.SRGBColorSpace;
    ownRenderer.setClearColor(0x000000, 0);
    ownRenderer.setPixelRatio(state.dpr);
  }
  const renderer = ownRenderer ?? engine.renderer;
  const paint = createPaint(renderer, state);
  const gradient = gradientTexture();

  const res = { value: new THREE.Vector2(1, 1) };
  // The screen in the canvas drawn to (device px): its size, and where its
  // bottom-left corner is (wordsFrag), or how far the canvas's top is above
  // the screen's (fringeFrag).
  const screen = { value: new THREE.Vector2(1, 1) };
  const origin = { value: new THREE.Vector2() };
  const canvasTop = { value: 0 };
  const paintTexture = { value: paint.texture };
  const shared = {
    uPaint: paintTexture,
    uPaintSize: { value: paint.size },
    uGradient: { value: gradient },
    uScreen: screen,
    uOrigin: origin,
    uTime: { value: 0 },
    uSeed: { value: 0 },
    uRes: res,
    uTop: canvasTop,
    uFootEdge: field.uniforms.uFootEdge,
    uFootDepth: field.uniforms.uFootDepth,
    uFootW: field.uniforms.uFootW,
  };
  const plane = new THREE.PlaneGeometry(1, 1);
  const scene = new THREE.Scene();
  const camera = new THREE.OrthographicCamera(0, 1, 0, -1, -10, 10);

  // One mask and one quad per line, so each line can slide on its own (see
  // setupWordsSlide in pages/about.js). Each mask holds its whole line,
  // including the part past the edge of the screen.
  const lines = [...words.querySelectorAll('span')].map((span) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const mask = new THREE.CanvasTexture(canvas);
    mask.minFilter = THREE.LinearFilter;
    mask.generateMipmaps = false;
    // Upload the canvas as it is stored, so red and green are the coverage of
    // the inside and of the outline band.
    mask.premultiplyAlpha = true;
    const material = new THREE.ShaderMaterial({
      vertexShader: vert,
      fragmentShader: wordsFrag,
      uniforms: { ...shared, uMask: { value: mask } },
      transparent: true,
      premultipliedAlpha: true,
      depthTest: false,
      depthWrite: false,
    });
    const mesh = new THREE.Mesh(plane, material);
    mesh.frustumCulled = false;
    mesh.visible = false;
    scene.add(mesh);
    // w, h: the mask's size; ox: where the text starts in it; pad: its margin
    // (CSS pixels); padLeft: the line's own left padding on the page.
    return { span, canvas, ctx, mask, material, mesh, w: 0, h: 0, ox: 0, pad: 0, padLeft: 0 };
  });

  // On the own canvas the sheet's top is measured here, this frame; on the
  // shared one it is the background's (pages/about.js sets it).
  const sheetTop = own ? { value: 1e6 } : field.uniforms.uSheetTop;
  const fringeMaterial = new THREE.ShaderMaterial({
    vertexShader: fullscreenVert,
    fragmentShader: fringeFrag,
    uniforms: {
      uPaint: paintTexture,
      uRes: res,
      uScreen: screen,
      uTop: canvasTop,
      uSheetTop: sheetTop,
      uFootEdge: field.uniforms.uFootEdge,
      uFootDepth: field.uniforms.uFootDepth,
      uFootW: field.uniforms.uFootW,
    },
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthTest: false,
    depthWrite: false,
  });
  const fringe = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), fringeMaterial);
  fringe.frustumCulled = false;
  const fringeScene = new THREE.Scene();
  fringeScene.add(fringe);
  const fringeCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

  // Draw each line into its mask: red = inside, green = their outline, a
  // round-jointed line max(1px, width / 1200) either side of the edge.
  const draw = () => {
    const dpr = state.dpr;
    const radius = Math.max(1, state.width / 1200);
    const pad = Math.ceil(radius) + 4;
    for (const line of lines) {
      const { span, canvas, ctx } = line;
      const cs = getComputedStyle(span);
      const size = parseFloat(cs.fontSize);
      const font = `${cs.fontStyle} ${cs.fontWeight} ${size}px ${cs.fontFamily}`;
      const spacing = cs.letterSpacing === 'normal' ? '0px' : cs.letterSpacing;
      const setFont = () => {
        ctx.font = font;
        if ('letterSpacing' in ctx) ctx.letterSpacing = spacing;
      };
      const text = span.textContent.toUpperCase();
      setFont();
      const m = ctx.measureText(text);
      const ascent = m.fontBoundingBoxAscent ?? size * 0.95;
      const descent = m.fontBoundingBoxDescent ?? size * 0.25;
      const overhang = Math.max(0, m.actualBoundingBoxLeft ?? 0);
      const extent = Math.max(m.width, m.actualBoundingBoxRight ?? m.width);
      const lineH = span.getBoundingClientRect().height;
      line.pad = pad;
      line.ox = pad + overhang;
      line.w = Math.ceil(line.ox + extent + pad);
      line.h = Math.ceil(lineH + pad * 2);
      line.padLeft = parseFloat(cs.paddingLeft) || 0;
      canvas.width = Math.max(2, Math.round(line.w * dpr));
      canvas.height = Math.max(2, Math.round(line.h * dpr));
      // (Resizing the canvas resets its state, so the font is set again.)
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, line.w, line.h);
      ctx.globalCompositeOperation = 'lighter';
      ctx.textBaseline = 'alphabetic';
      ctx.lineJoin = 'round';
      setFont();
      // Put the baseline where CSS puts it: the font's content box is centred
      // in the line box, and the baseline sits one ascent below its top.
      const y = pad + (lineH - (ascent + descent)) / 2 + ascent;
      ctx.fillStyle = 'rgb(255,0,0)';
      ctx.fillText(text, line.ox, y);
      ctx.strokeStyle = 'rgb(0,255,0)';
      ctx.lineWidth = radius * 2;
      ctx.strokeText(text, line.ox, y);
      line.mask.needsUpdate = true;
    }
  };

  let ready = false;
  // Every line's face loaded first (two lines are italic, a face the page may
  // not have needed yet), or its mask would be drawn in a stand-in font.
  const faces = lines.map(({ span }) => {
    const cs = getComputedStyle(span);
    return document.fonts.load(`${cs.fontStyle} ${cs.fontWeight} 16px ${cs.fontFamily}`, span.textContent);
  });
  Promise.allSettled([document.fonts.ready, ...faces]).then(() => {
    draw();
    ready = true;
    // Drawn here now, so the page's own outline copy can hide.
    words.classList.add('is-drawn');
  });

  let lastW = 0;
  let running = false;
  let anyLine = false;

  // The camera shows the screen, or on the own canvas the screen and its
  // margins (`top` is the canvas's top on screen, CSS px), and the shaders
  // are told where the screen is in it.
  const frame = (top, height) => {
    const dpr = state.dpr;
    camera.left = 0;
    camera.right = state.width;
    camera.top = -top;
    camera.bottom = -(top + height);
    camera.updateProjectionMatrix();
    res.value.set(state.width * dpr, height * dpr);
    screen.value.set(state.width * dpr, state.height * dpr);
    origin.value.set(0, (top + height - state.height) * dpr);
    canvasTop.value = -top * dpr;
  };

  // The own canvas: the screen's width, and as tall as the tallest the screen
  // has been at this width plus 30% of that above and below. Resized only
  // when that changes.
  const sizeOwn = () => {
    if (win.w !== state.width) win.tall = 0;
    win.tall = Math.max(win.tall, state.height);
    const margin = Math.round(win.tall * 0.3);
    const height = win.tall + 2 * margin;
    if (win.w === state.width && margin === win.margin && height === win.height) return;
    win.w = state.width;
    win.margin = margin;
    win.height = height;
    ownRenderer.setSize(win.w, height);
    ownDrawn = false;
  };

  // Moves the own canvas back over the screen, its top `margin` whole pixels
  // above the screen's, and draws the fringe and the words on it.
  let moved = '';
  const drawOwn = (s) => {
    const top = -win.margin;
    const move = `translate3d(${-s.left}px, ${top - s.top}px, 0)`;
    if (move !== moved) ownCanvas.style.transform = moved = move;
    frame(top, win.height);
    sheetTop.value = s.top * state.dpr;
    ownRenderer.setRenderTarget(null);
    ownRenderer.setClearColor(0x000000, 0);
    ownRenderer.clear(true, false, false);
    ownRenderer.render(fringeScene, fringeCamera);
    if (anyLine) ownRenderer.render(scene, camera);
    ownDrawn = true;
  };

  const layer = {
    order: 3,
    visible: false,
    resize() {
      if (own) sizeOwn();
      else frame(0, state.height);
      paint.resize();
      if (ready && lastW !== state.width) draw();
      lastW = state.width;
    },
    update() {
      // The paint runs while the black sheet is on screen, and starts afresh
      // each time it comes back.
      const s = sheet.getBoundingClientRect();
      const on = s.bottom > 0 && s.top < state.height;
      if (on && !running) paint.reset();
      running = on;
      // With its own canvas nothing is drawn on the shared one.
      layer.visible = on && !own;
      if (!on) {
        if (own && ownDrawn) {
          // The own canvas keeps its last picture until told otherwise.
          ownRenderer.setRenderTarget(null);
          ownRenderer.clear(true, false, false);
          ownDrawn = false;
        }
        return;
      }
      if (own) sizeOwn();
      paint.update();
      paintTexture.value = paint.texture;
      // Each line's quad goes where the page's copy of the line is now (it
      // slides sideways as you scroll); on the own canvas its margins count.
      const reach = own ? win.margin : 0;
      anyLine = false;
      for (const line of lines) {
        const r = line.span.getBoundingClientRect();
        const x = r.left + line.padLeft - line.ox;
        const y = r.top - line.pad;
        line.mesh.visible = ready && y + line.h > -reach && y < state.height + reach && x + line.w > 0 && x < state.width;
        anyLine ||= line.mesh.visible;
        line.mesh.scale.set(line.w, line.h, 1);
        line.mesh.position.set(x + line.w / 2, -(y + line.h / 2), 0);
      }
      shared.uTime.value = state.time;
      shared.uSeed.value = Math.random() * 128;
      if (own) drawOwn(s);
    },
    render(r) {
      r.render(fringeScene, fringeCamera);
      if (anyLine) r.render(scene, camera);
    },
    dispose() {
      words.classList.remove('is-drawn');
      paint.dispose();
      gradient.dispose();
      lines.forEach(({ mask, material }) => {
        mask.dispose();
        material.dispose();
      });
      plane.dispose();
      fringeMaterial.dispose();
      fringe.geometry.dispose();
      // Hand its own canvas's WebGL context back, or each visit would leave one.
      if (ownRenderer) {
        ownRenderer.dispose();
        ownRenderer.forceContextLoss();
        ownCanvas.remove();
        sheet.classList.remove('has-glow-gl');
      }
    },
  };
  return layer;
}
