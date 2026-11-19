// The contour lines inside the menu: the same field as the background (his
// shapes, spacing and line weight) on deep red, or on a project page in the
// project's colours (menu.js sets them). They hold still, as Lando's
// menu lines do (his are a still image): drawn once when the menu opens and
// again if the window is resized, with no clock and no cursor effect.
// It has its own small canvas.
import * as THREE from 'three';
import { snoiseClassic, contourField, isoLine, CONTOUR, fullscreenVert } from './glsl.js';

// The moment of the field the menu shows (the background's clock, in seconds).
const MOMENT = 40;

const frag = /* glsl */ `
precision highp float;
uniform vec2 uRes;
uniform vec3 uBg;
uniform vec3 uLine;
uniform float uLinePx;
varying vec2 vUv;
${snoiseClassic}
${contourField}
${isoLine}
void main() {
  vec2 p = gl_FragCoord.xy / uRes.y;
  float f = contourField(p * ${CONTOUR.scale.toFixed(2)}, ${MOMENT.toFixed(1)}) * ${CONTOUR.bands.toFixed(1)} + 0.5;
  gl_FragColor = vec4(mix(uBg, uLine, isoLine(f, uLinePx)), 1.0);
}
`;

export function createMenuField(canvas) {
  if (!canvas) return null;
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, alpha: false });
  const dpr = Math.min(devicePixelRatio || 1, 1.5);
  renderer.setPixelRatio(dpr);
  const uniforms = {
    uRes: { value: new THREE.Vector2(1, 1) },
    uBg: { value: new THREE.Color('#5c0a14') },
    uLine: { value: new THREE.Color('#3f0610') },
    uLinePx: { value: CONTOUR.lineCss * dpr },
  };
  const material = new THREE.ShaderMaterial({ vertexShader: fullscreenVert, fragmentShader: frag, uniforms });
  const scene = new THREE.Scene();
  const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  scene.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), material));

  const draw = () => {
    renderer.setSize(innerWidth, innerHeight, false);
    uniforms.uRes.value.set(innerWidth * dpr, innerHeight * dpr);
    renderer.render(scene, camera);
  };
  let open = false;

  return {
    // The panel and line colours (hex); redrawn at once if the menu is open.
    setColours(bg, line) {
      uniforms.uBg.value.set(bg);
      uniforms.uLine.value.set(line);
      if (open) draw();
    },
    start() {
      if (open) return;
      open = true;
      draw();
      addEventListener('resize', draw);
    },
    stop() {
      if (!open) return;
      open = false;
      removeEventListener('resize', draw);
    },
  };
}
