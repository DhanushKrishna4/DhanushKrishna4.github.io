// Loom: close in on a loom at night. Cream warp threads run away from us;
// the cloth woven so far is a teal twill; the next thread of light is being
// laid across the open warp. Shallow focus, dust in the lamp light.
export default async function ({ L, W, H }) {
  const S = W / 1600;
  const body = /* glsl */ `
const float ANG = -0.2;
const float ZF = 0.8;          // the fell: where the cloth ends
const float PX = 0.024;        // warp spacing
const float PZ = 0.016;        // weft spacing
vec2 toPlane(vec2 uv, out float v) {
  float asp = uRes.x / uRes.y;
  vec2 q = vec2((uv.x - 0.5) * asp, uv.y - 0.5);
  float c = cos(ANG), s = sin(ANG);
  q = vec2(c * q.x - s * q.y, s * q.x + c * q.y);
  v = 1.05 - q.y;
  float Z = 0.92 / v;
  return vec2(q.x * Z + 0.004, Z);
}
vec3 weftCol(float j) {
  float k = mod(j, 30.0);
  vec3 dark = C(9, 64, 60), teal = C(46, 204, 168), cream = C(222, 238, 228), deep = C(10, 36, 46);
  if (k < 7.0) return dark;
  if (k < 10.0) return teal;
  if (k < 12.0) return cream;
  if (k < 15.0) return teal;
  if (k < 22.0) return dark;
  if (k < 26.0) return deep;
  if (k < 27.0) return teal;
  return dark;
}
vec4 scene(vec2 p, vec2 uv) {
  float v;
  vec2 P = toPlane(uv, v);
  float X = P.x, Z = P.y;
  // light: a lamp up and to the left
  float lamp = exp(-length(vec2(uv.x - 0.34, uv.y - 0.5) * vec2(1.0, 1.4)) * 2.2);
  float light = 0.3 + 1.3 * lamp;
  vec3 warm = mix(vec3(1.0), C(255, 214, 160) * 1.15, lstep(0.6, 0.0, uv.x));
  // the dark bed under the warp
  vec3 col = mix(C(2, 8, 8), C(10, 22, 18), lamp);
  float depth = sat((Z - 0.5) / 1.5);
  float fi = X / PX;
  float i = floor(fi);
  float fx = fract(fi) - 0.5;
  float warpW = 0.3;
  float onWarp = 1.0 - smoothstep(warpW - 0.06, warpW + 0.02, abs(fx));
  float hw = sqrt(max(0.0, 1.0 - pow(fx / warpW, 2.0)));
  vec3 warpC = (C(226, 230, 214) * (0.25 + 0.75 * hw) + C(255, 250, 236) * pow(hw, 10.0) * 0.3) * warm;
  float twist = 0.92 + 0.08 * sin((Z * 900.0 + fx * 6.0));
  if (Z < ZF) {
    // the cloth: a 2/2 twill
    float fj = Z / PZ;
    float j = floor(fj);
    float fz = fract(fj) - 0.5;
    bool warpUp = mod(i + j, 4.0) < 2.0;
    float weftW = 0.44;
    float hz = sqrt(max(0.0, 1.0 - pow(fz / weftW, 2.0)));
    float onWeft = 1.0 - smoothstep(weftW - 0.06, weftW + 0.02, abs(fz));
    vec3 wc = weftCol(j) * (0.3 + 0.7 * hz) * (0.94 + 0.06 * sin(X * 1400.0 + fz * 5.0));
    wc += weftCol(j) * pow(hz, 8.0) * 0.4;
    vec3 gap = C(2, 8, 8);
    if (warpUp) {
      // the warp dips at the ends of its float
      float dip = mod(i + j, 4.0) < 1.0 ? smoothstep(-0.5, -0.2, fz) : smoothstep(0.5, 0.2, fz);
      col = mix(mix(gap, wc, onWeft), warpC * twist * mix(0.55, 1.0, dip), onWarp);
    } else {
      col = mix(mix(gap, warpC * 0.5, onWarp), wc, onWeft);
    }
    col *= light;
  } else {
    // the open warp, opened into two layers (the shed): every other thread
    // raised toward the light; the dark bed between them
    float raised = mod(i, 2.0);
    float fade = exp(-(Z - ZF) * 0.9);
    vec3 wc2 = warpC * twist * light * mix(0.3, 1.0, raised) * mix(0.4, 1.0, fade);
    col = mix(col, wc2, onWarp * 0.95);
    // the reed: a metal band across the warp, a fine slat between each thread
    float zr0 = 1.32, zr1 = 1.38;
    if (Z > zr0 && Z < zr1) {
      float k = (Z - zr0) / (zr1 - zr0);
      float slat = 1.0 - smoothstep(0.05, 0.16, abs(abs(fx) - 0.5));
      vec3 metal = mix(C(30, 52, 50), C(150, 176, 170), pow(sin(k * 3.14159), 3.0)) * light;
      col = mix(col, metal, 0.85 * (0.6 + 0.4 * slat));
      col = mix(col, C(200, 230, 222) * light, slat * 0.5 * sin(k * 3.14159));
    }
  }
  // the next thread, being laid across the open warp: it glows
  float zt = ZF + 0.022 + 0.006 * sin(X * 9.0 + 1.0);
  float dz = (Z - zt) / (PZ * 0.5);
  float pick = exp(-dz * dz * 2.2);
  bool under = mod(i + floor(ZF / PZ) + 1.0, 4.0) < 2.0 && onWarp > 0.5;
  vec3 glowC = C(70, 255, 206);
  if (!under) col = mix(col, glowC * 4.0, pick * 0.95);
  col += glowC * 0.3 * exp(-abs(Z - zt) / 0.025) * (0.6 + 0.8 * lamp);
  // fall-off into the dark far away
  col *= mix(1.0, 0.12, lstep(1.0, 1.85, Z));
  return vec4(col, depth);
}
`;
  const { color, depth } = L.shader(W, H, body, { ss: 3, seed: 9 });
  const g = color.ctx;
  const dp = L.depthFrom(depth);
  // Shallow focus on the fell.
  L.dof(color, dp, { focus: 0.2, range: 0.55, maxBlur: 12 * S, levels: 7, near: 1.6, far: 1 });
  // Dust in the lamp light, and a soft bloom of the glowing thread.
  const bloom = L.canvas(W, H);
  bloom.ctx.filter = `blur(${18 * S}px) brightness(1.2)`;
  bloom.ctx.drawImage(color.c, 0, 0);
  g.save();
  g.globalCompositeOperation = 'screen';
  g.globalAlpha = 0.22;
  g.drawImage(bloom.c, 0, 0);
  g.restore();
  const R = L.rng(4);
  L.motes(g, dp, W, H, R, { n: 70, area: [0.05, 0.05, 0.7, 0.55], color: [0.82, 0.96, 0.9], size: [0.8, 2.2], nearShare: 0.12, nearSize: [12, 30], alpha: 0.7 });
  L.finish(g, W, H, { grain: 0.05, vignette: 0.45, vigColor: [0, 0.02, 0.02] });
  return { color, depth: dp, depthBlur: 0.006 };
}
