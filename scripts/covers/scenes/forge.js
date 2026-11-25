// Forge: a desert at golden hour. A great dune ridge snakes toward us out of
// the dune sea, its face toward the low sun glowing orange and rippled by the
// wind, the other in deep shadow; dunes behind it fade into warm haze under a
// gold and rose sky.
export default async function ({ L, W, H }) {
  const body = /* glsl */ `
const vec2 SUN = vec2(0.705, 0.452);
const float HZ = 0.432;

vec3 skyCol(vec2 uv, vec2 p) {
  float asp = uRes.x / uRes.y;
  vec2 sd = vec2((uv.x - SUN.x) * asp, uv.y - SUN.y);
  float r = length(sd);
  float y = uv.y;
  vec3 col = mix(C(255, 222, 168), C(253, 170, 104), lstep(0.43, 0.55, y));
  col = mix(col, C(226, 120, 98), lstep(0.5, 0.7, y));
  col = mix(col, C(140, 72, 96), lstep(0.66, 0.9, y));
  col = mix(col, C(54, 28, 52), lstep(0.86, 1.12, y));
  float toward = exp(-abs(uv.x - SUN.x) * 1.8);
  col *= 0.7 + 0.55 * toward;
  // a few long thin clouds, lit from below near the sun
  float band = lstep(0.53, 0.6, y) * (1.0 - lstep(0.72, 0.9, y));
  vec2 cp = vec2(p.x * 0.9 + 6.0, y * 19.0);
  float cn = fbm(cp + vec2(fbm(cp * 0.3 + 5.0) * 2.6, 0.0));
  float cloud = smoothstep(0.52, 0.78, cn) * band;
  vec3 cloudCol = mix(C(150, 62, 84), C(255, 184, 124), toward) * (0.85 + 1.6 * exp(-r * 3.0));
  col = mix(col, cloudCol, cloud * 0.9);
  // and a lower, warmer bank of haze-clouds just above the horizon
  float band2 = lstep(HZ + 0.02, HZ + 0.05, y) * (1.0 - lstep(HZ + 0.08, HZ + 0.15, y));
  float cn2 = fbm(vec2(p.x * 1.6 + 1.0, y * 26.0));
  col = mix(col, mix(C(214, 112, 90), C(255, 206, 150), toward) * (1.0 + 0.8 * exp(-r * 4.0)), smoothstep(0.55, 0.8, cn2) * band2 * 0.55);
  col += C(255, 190, 118) * 1.7 * exp(-r * 8.0);
  col += C(255, 146, 70) * 0.7 * exp(-r * 2.3);
  // the disc, veiled by haze toward the horizon
  float veil = lstep(HZ - 0.005, HZ + 0.05, y);
  col = mix(col, C(255, 226, 168) * mix(2.6, 6.5, veil), smoothstep(0.041, 0.037, r));
  return col;
}

// --- the dune sea behind ---------------------------------------------------
float duneShape(float x, float seed, out float crest) {
  float i = floor(x), f = fract(x);
  float c = 0.58 + 0.24 * (hash(i * 3.7 + seed) - 0.5);
  float a = 0.4 + 0.6 * hash(i * 1.3 + seed * 7.1);
  crest = i + c;
  float h;
  if (f < c) { float g = f / c; h = g * g * (1.5 - 0.5 * g); }
  else { float k = (f - c) / (1.0 - c); h = (1.0 - k) * (1.0 - k); }
  return h * a;
}
const int NL = 6;
float layerY(int i, float x, out float crestX, out float amp, out float freq) {
  float t = float(i) / float(NL - 1);
  float base = mix(HZ + 0.002, 0.19, pow(t, 0.9));
  amp = mix(0.016, 0.095, pow(t, 1.2));
  freq = mix(6.5, 1.6, pow(t, 0.7));
  float off = float(i) * 3.17 + 0.4;
  float cr;
  float d = duneShape(x * freq + off, float(i) * 13.1, cr);
  crestX = (cr - off) / freq;
  float und = fbm1(x * freq * 0.3 + float(i) * 5.0) - 0.5;
  return base + amp * (d * 0.9 + und * 0.7);
}

// --- the great dune in front -------------------------------------------------
const vec2 PK = vec2(0.285, 0.362);
float leftEdge(float x) { float d = PK.x - x; return PK.y - 0.5 * d - 0.3 * d * d + 0.006 * (fbm1(x * 9.0) - 0.5); }
float rightEdge(float x) { float d = x - PK.x; return PK.y - 0.2 * pow(d, 1.05) - 0.05 * d * d + 0.006 * (fbm1(x * 7.0 + 3.0) - 0.5); }
float crestX(float y) { float d = PK.y - y; return PK.x + d * 0.74 + 0.038 * sin(d * 8.5); }

vec3 haze(float x) {
  float toward = exp(-abs(x - SUN.x) * 2.4);
  return mix(C(214, 118, 82), C(255, 200, 146), toward);
}

vec4 scene(vec2 p, vec2 uv) {
  float asp = uRes.x / uRes.y;
  float x = uv.x, y = uv.y;
  float toward = exp(-abs(x - SUN.x) * 2.4);
  vec2 sd = vec2((x - SUN.x) * asp, y - SUN.y);
  float sunR = length(sd);

  // The great dune.
  float yl = leftEdge(x), yr = rightEdge(x);
  float cx = crestX(y);
  bool onLeft = x < cx && y < yl;
  bool onRight = x >= cx && y < yr;
  if (y < PK.y && (onLeft || onRight)) {
    float dc = (x - cx);                       // + toward the lit side
    vec3 col;
    if (onRight) {
      // the lit face: brightest just below the crest, then evening out,
      // rippled by the wind (seen in this grazing light)
      float k = lstep(0.0, 0.5, dc);
      vec3 hot = C(255, 172, 84), warm = C(240, 116, 44), deep = C(170, 62, 26);
      col = mix(hot, warm, smoothstep(0.0, 0.16, dc));
      col = mix(col, deep, smoothstep(0.1, 0.62, dc) * (0.6 + 0.4 * lstep(PK.y, 0.0, y)));
      col *= 0.9 + 0.18 * fbm(vec2(x * 5.0, y * 9.0));
      float ripY = y + dc * 0.32 + 0.012 * fbm(vec2(x * 7.0, y * 3.0));
      float rf = mix(260.0, 620.0, lstep(0.0, PK.y, y));
      float rip = sin(ripY * rf + fbm(vec2(x * 16.0, y * 36.0)) * 7.0);
      float ripW = smoothstep(-0.2, 0.9, rip);
      col *= 0.82 + 0.26 * ripW;
      // the far edge of the face catches more light toward the sun
      float edge = yr - y;
      col += C(255, 196, 128) * exp(-edge / 0.0045) * (0.4 + 1.6 * toward) * 1.4;
      col *= 1.0 + 0.35 * toward;
    } else {
      // the shadow face: deep, warmed by light bounced off the lit sand and
      // cooled by the sky; a hairline of light along the crest
      float k = lstep(0.0, 0.25, -dc);
      col = mix(C(92, 38, 32), C(48, 20, 22), k);
      col += C(70, 40, 70) * 0.12 * (1.0 - lstep(0.0, 0.2, PK.y - y));
      float rip = sin((y - dc * 0.2) * 420.0 + fbm(vec2(x * 14.0, y * 30.0)) * 6.0);
      col *= 0.95 + 0.06 * rip;
      col += C(255, 190, 120) * exp(dc / 0.0016) * 1.6;
      float edge = yl - y;
      col += C(255, 170, 110) * exp(-edge / 0.003) * 0.35 * (1.0 - k);
    }
    col *= 0.965 + 0.07 * hash2(floor(uv * uRes * 1.3));
    float depth = mix(0.36, 0.04, lstep(0.0, PK.y, PK.y - y)) + 0.05 * lstep(0.0, 0.4, abs(dc));
    return vec4(col, depth);
  }

  // The dune sea behind.
  for (int i = NL - 1; i >= 0; i--) {
    float crX, amp, freq;
    float Y = layerY(i, x, crX, amp, freq);
    if (y >= Y) continue;
    float t = float(i) / float(NL - 1);
    float below = Y - y;
    float d1, d2, d3;
    float Yc = layerY(i, crX, d1, d2, d3);
    float sideOfSun = sign(SUN.x - crX);
    float slant = mix(1.6, 0.9, t) * (0.55 + 0.9 * hash(floor(crX * freq) + float(i) * 7.0));
    float ridgeX = crX + sideOfSun * (Yc - y) * slant * 0.6;
    float lit = smoothstep(-0.0015, 0.0015, (x - ridgeX) * sideOfSun) * step(0.0, Yc - y);
    vec3 shadowCol = mix(C(168, 78, 62), C(96, 40, 34), t);
    vec3 litCol = mix(C(252, 162, 92), C(238, 112, 46), t) * (0.8 + 0.5 * toward);
    vec3 col = mix(shadowCol, litCol, lit * (1.0 - 0.5 * lstep(0.0, amp * 1.5, below)));
    float dY = (layerY(i, x + 0.002, d1, d2, d3) - layerY(i, x - 0.002, d1, d2, d3)) / 0.004;
    vec2 n = normalize(vec2(-dY * asp, 1.0));
    vec2 Ld = normalize(vec2((SUN.x - x) * asp, SUN.y - Y));
    float lam = max(0.0, dot(n, Ld));
    col += C(255, 204, 140) * exp(-below / mix(0.0012, 0.003, t)) * (0.15 + 0.85 * lam) * (0.25 + 1.6 * toward) * 1.6;
    float hz = mix(0.8, 0.18, pow(t, 0.85));
    hz = sat(hz + (1.0 - t) * 0.25 * lstep(0.0, amp, below));
    col = mix(col, haze(x), hz);
    // light scattered in the air toward the sun
    col += C(255, 170, 100) * 0.35 * exp(-sunR * 3.0) * (1.0 - t);
    col *= 0.975 + 0.05 * hash2(floor(uv * uRes * 1.3));
    float depth = mix(0.94, 0.52, t) - 0.06 * lstep(0.0, amp * 2.0, below);
    return vec4(col, depth);
  }
  return vec4(skyCol(uv, p), 1.0);
}
`;
  const { color, depth } = L.shader(W, H, body, { ss: 3, seed: 2, exposure: 1.0 });
  // A soft bloom from the bright parts.
  const bloom = L.canvas(W, H);
  bloom.ctx.filter = `blur(${W * 0.02}px) brightness(1.1)`;
  bloom.ctx.drawImage(color.c, 0, 0);
  color.ctx.save();
  color.ctx.globalCompositeOperation = 'screen';
  color.ctx.globalAlpha = 0.22;
  color.ctx.drawImage(bloom.c, 0, 0);
  color.ctx.restore();
  // A few birds high over the sun.
  const g = color.ctx;
  const birds = [[0.585, 0.255, 1.0], [0.612, 0.236, 0.82], [0.634, 0.27, 0.7], [0.56, 0.226, 0.62], [0.655, 0.248, 0.55]];
  for (const [bx, by, s] of birds) {
    const x = bx * W, y = by * H, w = 0.011 * W * s;
    g.save();
    g.strokeStyle = 'rgba(70,30,30,0.72)';
    g.lineWidth = Math.max(1, 0.0016 * W * s);
    g.beginPath();
    g.moveTo(x - w, y - w * 0.18);
    g.quadraticCurveTo(x - w * 0.45, y - w * 0.55, x, y);
    g.quadraticCurveTo(x + w * 0.45, y - w * 0.55, x + w, y - w * 0.22);
    g.stroke();
    g.restore();
  }
  L.finish(color.ctx, W, H, { grain: 0.05, vignette: 0.34, vigColor: [0.08, 0.025, 0.02] });
  return { color, depth: L.depthFrom(depth), depthBlur: 0.004 };
}
