// The loader's backdrop: Active Theory's (their LoaderGLUI and its
// LoaderBGShader, with the helpers it pulls in), ported line for line, in our
// red. Around the count:
//  - twenty thin bars (24 on phones, turned upright), bent into petal-like
//    curves by a ripple running out from the middle, in shifting tints, from
//    the ring out to 0.4 of the way;
//  - a pulsing ring, and three arcs about it;
//  - grain and a vignette.
// It brightens as its progress passes 0.4; that progress follows the loader's
// count, closing 2% of the gap a frame (at 60 a second), and also moves the
// pattern on. At the end it turns and shrinks away as it fades. On touch
// screens it is drawn twice as large, as theirs is. HUE turns their sky blue
// (204 degrees) to our ember (353); set it to 0 for their colours.
import * as THREE from 'three';
import { isTouch, isSmall } from '../core/env.js';

const HUE = 0.4148;

const vert = /* glsl */ `
varying vec2 vScreen;
void main() {
  vScreen = uv;
  gl_Position = vec4(position.xy, 0.0, 1.0);
}
`;

const frag = /* glsl */ `
precision highp float;
uniform float time;
uniform vec2 resolution;
uniform float uProgress;
uniform float uVisible;
uniform float uAlpha;
uniform float uBars;
uniform float uMobile;
uniform float uScale;
uniform float uHue;
varying vec2 vScreen;

#define sinf sin
const float PI = 3.141592653589793;

vec2 rotateUV(vec2 uv, float r, vec2 origin) {
  float c = cos(r);
  float s = sin(r);
  mat2 m = mat2(c, -s, s, c);
  vec2 st = uv - origin;
  st = m * st;
  return st + origin;
}
vec2 scaleUV(vec2 uv, vec2 scale, vec2 origin) {
  vec2 st = uv - origin;
  st /= scale;
  return st + origin;
}
vec2 rotateUV(vec2 uv, float r) { return rotateUV(uv, r, vec2(0.5)); }
vec2 scaleUV(vec2 uv, vec2 scale) { return scaleUV(uv, scale, vec2(0.5)); }

float getNoise(vec2 uv, float time) {
  float x = uv.x * uv.y * time * 1000.0;
  x = mod(x, 13.0) * mod(x, 123.0);
  float dx = mod(x, 0.01);
  float amount = clamp(0.1 + dx * 100.0, 0.0, 1.0);
  return amount;
}
float cnoise(vec2 v) {
  float t = v.x * 0.3;
  v.y *= 0.8;
  float noise = 0.0;
  float s = 0.5;
  noise += (sinf(v.x * 0.9 / s + t * 10.0) + sinf(v.x * 2.4 / s + t * 15.0) + sinf(v.x * -3.5 / s + t * 4.0) + sinf(v.x * -2.5 / s + t * 7.1)) * 0.3;
  noise += (sinf(v.y * -0.3 / s + t * 18.0) + sinf(v.y * 1.6 / s + t * 18.0) + sinf(v.y * 2.6 / s + t * 8.0) + sinf(v.y * -2.6 / s + t * 4.5)) * 0.3;
  return noise;
}

vec3 rgb2hsv(vec3 c) {
  vec4 K = vec4(0.0, -1.0 / 3.0, 2.0 / 3.0, -1.0);
  vec4 p = mix(vec4(c.bg, K.wz), vec4(c.gb, K.xy), step(c.b, c.g));
  vec4 q = mix(vec4(p.xyw, c.r), vec4(c.r, p.yzx), step(p.x, c.r));
  float d = q.x - min(q.w, q.y);
  float e = 1.0e-10;
  return vec3(abs(q.z + (q.w - q.y) / (6.0 * d + e)), d / (q.x + e), q.x);
}
vec3 hsv2rgb(vec3 c) {
  vec4 K = vec4(1.0, 2.0 / 3.0, 1.0 / 3.0, 3.0);
  vec3 p = abs(fract(c.xxx + K.xyz) * 6.0 - K.www);
  return c.z * mix(K.xxx, clamp(p - K.xxx, 0.0, 1.0), c.y);
}

float drawLine(vec2 uv, float offset) {
  vec2 circleUv = uv - 0.5;
  float r = 0.2;
  float t = 0.0015;
  vec2 up = vec2(cos(1.0 * t + offset), sin(-1.0 * t + offset));
  float c = -0.4;
  float d1 = abs(length(circleUv) - r) - t;
  float w1 = 2.0 * fwidth(d1);
  float s1 = smoothstep(w1 / 2.0, -w1 / 2.0, d1);
  float d2 = dot(up, normalize(circleUv)) - c;
  float w2 = 2.0 * fwidth(d2);
  float s2 = smoothstep(w2 / 2.0, -w2 / 2.0, d2);
  return s1 * (1.0 - s2);
}

void main() {
  // Their quad is uScale times the screen, about its middle.
  vec2 vUv = (vScreen - 0.5) / uScale + 0.5;

  float t = time * 0.1 + uProgress * 4.0 + 1.6;
  vec2 uv = scaleUV(vUv, vec2(1.0, resolution.x / resolution.y));
  uv = scaleUV(uv, vec2(mix(0.9, 1.5, uMobile) + (1.0 - uVisible) * 0.2));
  uv = rotateUV(uv, uVisible * 3.0);
  vec4 color = vec4(vec3(0.0), 1.0);

  vec2 barUV = scaleUV(vUv, vec2(1.0, 1.0));
  barUV = scaleUV(barUV, vec2(1.0 + sin(t * 0.5 - length(barUV - 0.5) * 30.0) * mix(0.1, 0.4, smoothstep(0.3, 0.1, length(uv - 0.5)))));
  barUV = rotateUV(barUV, radians(mix(0.0, 90.0, uMobile)));

  float bars = fract(barUV.x * uBars);
  bars *= (0.5 + sin(t + bars * 10.0 - length(uv - 0.5) * 30.0 + t * 1.0) * 0.5);

  vec3 rainbow = vec3(0.5, 0.8, 1.0);
  rainbow = rgb2hsv(rainbow);
  rainbow.x += (0.5 - bars) * 0.12 + 0.05 + sin(t * 1.0 - bars * 2.0) * 0.05;
  rainbow.x -= length(uv - 0.5) * 0.2;
  rainbow.x += uHue;
  rainbow.y *= 0.9;
  rainbow = hsv2rgb(rainbow);

  rainbow *= step(0.85, bars) * smoothstep(0.5, 0.3, length(uv - 0.5));
  rainbow = mix(rainbow, vec3(1.0), step(0.98, bars) - step(0.9, bars));

  color.rgb += rainbow * step(0.02 * uProgress, length(uv - 0.5)) * step(0.08, length(uv - 0.5)) * (1.0 - step(0.4, length(uv - 0.5))) * 0.9;

  vec3 gradient = vec3(0.5, 0.4, 1.0);
  gradient = rgb2hsv(gradient);
  gradient.x += cnoise(vUv * 2.5 - t * 0.04) * 0.05 + 0.87;
  gradient.x += uHue;
  gradient.y *= 0.9;
  gradient = hsv2rgb(gradient);
  color.rgb += gradient * step(0.08, length(uv - 0.5)) * smoothstep(0.09, 0.08, length(uv - 0.5)) * (0.5 + sin(t * 4.0) * 0.3) * 0.5;

  color.rgb += drawLine(scaleUV(uv, vec2(0.4)), 0.0) * gradient * 0.5;
  color.rgb += drawLine(scaleUV(uv, vec2(0.4)), 2.0) * gradient * 0.5;
  color.rgb += drawLine(scaleUV(uv, vec2(0.4)), 4.0) * gradient * 0.5;
  color.rgb += step(0.2, bars) * 0.06 * smoothstep(0.5, 0.0, length(uv - 0.5)) * step(0.08, length(uv - 0.5));

  color.rgb *= smoothstep(0.0, 0.4, uProgress);
  color.rgb *= uVisible;
  color.rgb -= getNoise(uv, t) * 0.2;
  color.rgb += 0.03;

  color.rgb *= smoothstep(0.4, 0.0, length(vUv - 0.5));

  // Theirs is laid over black at uAlpha.
  gl_FragColor = vec4(clamp(color.rgb, 0.0, 1.0) * uAlpha, 1.0);
}
`;

// progress(): the loader's count, 0..1.
export function createLoaderScene(engine, progress = () => 0) {
  const { state } = engine;
  const phone = isTouch() && isSmall();
  const uniforms = {
    time: { value: 0 },
    resolution: { value: new THREE.Vector2(1, 1) },
    uProgress: { value: 0 },
    uVisible: { value: 1 },
    uAlpha: { value: 0 },
    uBars: { value: phone ? 24 : 20 },
    uMobile: { value: phone ? 1 : 0 },
    uScale: { value: isTouch() ? 2 : 1 },
    uHue: { value: HUE },
  };
  const material = new THREE.ShaderMaterial({ vertexShader: vert, fragmentShader: frag, uniforms, depthTest: false, depthWrite: false });
  const scene = new THREE.Scene();
  const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), material);
  quad.frustumCulled = false;
  scene.add(quad);

  return {
    order: 100,
    uniforms,
    resize() {
      uniforms.resolution.value.set(state.width * state.dpr, state.height * state.dpr);
    },
    update() {
      uniforms.time.value = state.time;
      // Their lerp: 2% of the gap a frame, at 60 frames a second.
      const k = 1 - Math.pow(1 - 0.02, Math.min(state.delta, 0.1) * 60);
      uniforms.uProgress.value += (progress() - uniforms.uProgress.value) * k;
    },
    render(renderer) {
      renderer.render(scene, camera);
    },
    dispose() {
      material.dispose();
      quad.geometry.dispose();
    },
  };
}
