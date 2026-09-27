import * as THREE from 'three';
import { createMarkExtrusion, getMarkContours, markPoint, containsMarkPoint, MARK_WIDTH } from './sculpture-geometry';
import { sculptureLayout } from './sculpture-layout';

export type Tier = 'high' | 'medium' | 'low';
export interface CoreHandle {
  destroy(): void;
  setPointer(x: number, y: number): void;
  setProgress(p: number): void;
  tier(): Tier;
}

const RED = '#f21840';
const clamp = THREE.MathUtils.clamp;
const smoothstep = (a: number, b: number, x: number) => THREE.MathUtils.smoothstep(x, a, b);

/** A studio-lit physical assembly built from the brand's original path. */
export function createCore(
  canvas: HTMLCanvasElement,
  opts: { animate?: boolean; onLost?: () => void; onReady?: () => void } = {},
): CoreHandle | null {
  let renderer: THREE.WebGLRenderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true, powerPreference: 'default' });
  } catch {
    return null;
  }

  const animate = opts.animate !== false;
  const coarse = matchMedia('(pointer: coarse)').matches;
  let tier: Tier = coarse ? 'medium' : 'high';
  const pixelRatio = () => Math.min(devicePixelRatio, tier === 'high' ? 1.8 : tier === 'medium' ? 1.35 : 1);
  renderer.setPixelRatio(pixelRatio());
  renderer.setClearColor(0x000000, 0);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.08;
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(31, 1, 0.1, 60);
  const assembly = new THREE.Group();
  scene.add(assembly);
  const textures = new Set<THREE.Texture>();
  const geometries = new Set<THREE.BufferGeometry>();
  const materials = new Set<THREE.Material>();
  const ownGeo = <T extends THREE.BufferGeometry>(g: T): T => { geometries.add(g); return g; };
  const ownMat = <T extends THREE.Material>(m: T): T => { materials.add(m); return m; };
  const ownTex = <T extends THREE.Texture>(t: T): T => { textures.add(t); return t; };

  // Broad softboxes establish the form; slim cards put deliberate highlights on
  // the machined chamfers. No downloaded environment or refraction render pass.
  const studio = new THREE.Scene();
  studio.background = new THREE.Color('#15151a');
  const softbox = (w: number, h: number, color: string, power: number, xyz: [number, number, number]) => {
    const card = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ color: new THREE.Color(color).multiplyScalar(power), side: THREE.DoubleSide }));
    card.position.set(...xyz);
    card.lookAt(0, 0, 0);
    studio.add(card);
  };
  softbox(7, 5, '#f5f5f4', 4.0, [-3, 4, 5]);
  softbox(5, 6, '#dde0e4', 1.8, [5, 1, 3]);
  softbox(8, 3, '#ffffff', 3.0, [0, 5, -2]);
  softbox(0.42, 6, '#ffffff', 8.0, [-4, 0, 2]);
  softbox(0.28, 5, '#ff8077', 3.0, [4, -1, 2]);
  softbox(4, 2, '#babcc2', 1.0, [1, -4, 4]);
  const pmrem = new THREE.PMREMGenerator(renderer);
  const environment = pmrem.fromScene(studio, 0.02, 0.1, 30);
  scene.environment = environment.texture;
  studio.traverse(o => {
    if (o instanceof THREE.Mesh) {
      o.geometry.dispose();
      (o.material as THREE.Material).dispose();
    }
  });
  pmrem.dispose();

  const key = new THREE.DirectionalLight('#f5f5f4', 3.2);
  key.position.set(-3, 5, 6);
  scene.add(key);
  const fill = new THREE.DirectionalLight('#c0c4cc', 1.3);
  fill.position.set(4, 0, 3);
  scene.add(fill);
  const rim = new THREE.DirectionalLight('#ff4b39', 1.5);
  rim.position.set(3, -2, -2);
  scene.add(rim);

  // Very shallow directional roughness is visible only in the moving highlights.
  // The texture is deterministic and generated once, not recomputed per frame.
  const roughData = new Uint8Array(128 * 128 * 4);
  let seed = 17;
  for (let y = 0; y < 128; y++) for (let x = 0; x < 128; x++) {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    const v = Math.round(190 + Math.sin(y * 2.4) * 12 + (seed / 4294967296 - 0.5) * 16);
    const i = (y * 128 + x) * 4;
    roughData[i] = roughData[i + 1] = roughData[i + 2] = v;
    roughData[i + 3] = 255;
  }
  const machining = ownTex(new THREE.DataTexture(roughData, 128, 128));
  machining.wrapS = machining.wrapT = THREE.RepeatWrapping;
  machining.repeat.set(3.5, 3.5);
  machining.needsUpdate = true;

  const graphite = ownMat(new THREE.MeshPhysicalMaterial({ color: '#29292d', metalness: 0.78, roughness: 0.34, roughnessMap: machining, clearcoat: 0.24, clearcoatRoughness: 0.24, envMapIntensity: 1.2 }));
  const graphiteRear = ownMat(new THREE.MeshStandardMaterial({ color: '#202126', metalness: 0.82, roughness: 0.34, envMapIntensity: 1.4 }));
  const bevel = ownMat(new THREE.MeshStandardMaterial({ color: '#aeb5c1', metalness: 0.94, roughness: 0.19, envMapIntensity: 1.65 }));
  const darkEdge = ownMat(new THREE.MeshStandardMaterial({ color: '#34343b', metalness: 0.9, roughness: 0.27, envMapIntensity: 1.35 }));
  const boardMat = ownMat(new THREE.MeshStandardMaterial({ color: '#18191e', metalness: 0.58, roughness: 0.44, envMapIntensity: 1 }));
  const seamMat = ownMat(new THREE.MeshBasicMaterial({ color: RED, toneMapped: false }));
  const recessed = ownMat(new THREE.MeshStandardMaterial({ color: '#080b10', metalness: 0.52, roughness: 0.4 }));
  const screwMat = ownMat(new THREE.MeshStandardMaterial({ color: '#6e7785', metalness: 0.92, roughness: 0.23, envMapIntensity: 1.5 }));

  const rear = new THREE.Group();
  const middle = new THREE.Group();
  const front = new THREE.Group();
  assembly.add(rear, middle, front);
  function plate(parent: THREE.Group, depth: number, face: THREE.Material, edge: THREE.Material, bevelSize: number, z = 0) {
    const splitWalls = depth > 0.05;
    const mesh = new THREE.Mesh(ownGeo(createMarkExtrusion(depth, bevelSize, splitWalls)), splitWalls ? [face, edge, darkEdge] : [face, edge]);
    mesh.position.z = z;
    parent.add(mesh);
    return mesh;
  }
  plate(rear, 0.18, graphiteRear, bevel, 0.025);
  plate(middle, 0.10, boardMat, darkEdge, 0.015);
  plate(front, 0.17, graphite, bevel, 0.027);
  // Thin gaskets follow the same path and leave the two numeral slots open.
  plate(rear, 0.019, graphiteRear, seamMat, 0.004, 0.113);
  plate(front, 0.014, recessed, darkEdge, 0.006, -0.109);

  const contours = getMarkContours();
  function contourLines(parent: THREE.Group, z: number, color: string, opacity: number) {
    const mat = ownMat(new THREE.LineBasicMaterial({ color, transparent: opacity < 1, opacity }));
    for (const loop of contours) {
      const points = loop.map(p => new THREE.Vector3(p.x, p.y, z));
      points.push(points[0].clone());
      parent.add(new THREE.Line(ownGeo(new THREE.BufferGeometry().setFromPoints(points)), mat));
    }
  }
  contourLines(front, 0.087, '#b6c0ce', 0.30);
  contourLines(middle, 0.069, RED, 0.6);

  // Screw pockets, contact pads and traces are dimensioned in the source mark's
  // coordinates. This keeps all machining aligned with its actual silhouette.
  const screwGeo = ownGeo(new THREE.CylinderGeometry(0.028, 0.028, 0.011, 20));
  screwGeo.rotateX(Math.PI / 2);
  const pocketGeo = ownGeo(new THREE.CylinderGeometry(0.044, 0.044, 0.008, 24));
  pocketGeo.rotateX(Math.PI / 2);
  const slotGeo = ownGeo(new THREE.BoxGeometry(0.032, 0.004, 0.003));
  const screws = [[45, 16], [128, 16], [21, 143], [105, 140], [208, 12], [176, 147]];
  for (const [x, y] of screws) {
    const p = markPoint(x, y, 0.087);
    const pocket = new THREE.Mesh(pocketGeo, recessed);
    pocket.position.copy(p);
    const screw = new THREE.Mesh(screwGeo, screwMat);
    screw.position.copy(p).add(new THREE.Vector3(0, 0, 0.006));
    const slot = new THREE.Mesh(slotGeo, recessed);
    slot.position.copy(p).add(new THREE.Vector3(0, 0, 0.013));
    slot.rotation.z = (x + y) * 0.011;
    front.add(pocket, screw, slot);
  }

  // Closed, physically routed paths. Light advances along a route rather than
  // throwing unrelated particles around the emblem.
  const routes: number[][][] = [
    [[48, 23], [123, 23], [136, 32], [132, 49]],
    [[31, 51], [15, 133], [24, 139], [93, 139]],
    [[89, 42], [74, 116], [72, 135]],
    [[127, 59], [118, 106], [111, 133]],
    [[159, 45], [191, 18], [204, 18]],
    [[149, 99], [179, 138], [170, 138]],
    [[137, 92], [154, 112], [158, 128]],
  ];
  const pulses: THREE.ShaderMaterial[] = [];
  const traceMetal = ownMat(new THREE.MeshStandardMaterial({ color: '#52606b', metalness: 0.86, roughness: 0.29 }));
  const viaGeo = ownGeo(new THREE.CylinderGeometry(0.025, 0.025, 0.012, 14));
  viaGeo.rotateX(Math.PI / 2);
  routes.forEach((route, index) => {
    const pts = route.map(([x, y]) => markPoint(x, y, 0.09));
    // Reject any routing segment that enters a numeral slot or leaves the mark.
    for (let k = 1; k < pts.length; k++) for (let j = 0; j <= 12; j++) {
      const p = pts[k - 1].clone().lerp(pts[k], j / 12);
      if (!containsMarkPoint(p.x, p.y)) return;
    }
    const path = new THREE.CurvePath<THREE.Vector3>();
    for (let k = 1; k < pts.length; k++) path.add(new THREE.LineCurve3(pts[k - 1], pts[k]));
    const bed = new THREE.Mesh(ownGeo(new THREE.TubeGeometry(path, 36, 0.023, 6, false)), recessed);
    middle.add(bed);
    const pulse = ownMat(new THREE.ShaderMaterial({
      uniforms: { uTime: { value: 0 }, uPhase: { value: index * 0.17 }, uEnergy: { value: 1 }, uColor: { value: new THREE.Color(RED) } },
      vertexShader: 'varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }',
      fragmentShader: `uniform float uTime; uniform float uPhase; uniform float uEnergy; uniform vec3 uColor; varying vec2 vUv;
        void main(){ float t=fract(uTime*.17+uPhase); float d=abs(vUv.x-t);
        float head=exp(-d*d*1100.); float tail=exp(-pow(max(0.,t-vUv.x),2.)*95.)*step(vUv.x,t);
        float power=.13+uEnergy*(head*2.2+tail*.65);
        gl_FragColor=vec4(uColor*power,1.); #include <tonemapping_fragment>\n#include <colorspace_fragment> }`,
      toneMapped: true,
    }));
    // Shader includes must begin on their own lines for Three's chunk expander.
    pulse.fragmentShader = pulse.fragmentShader.replace('; #include', ';\n#include');
    pulses.push(pulse);
    const wire = new THREE.Mesh(ownGeo(new THREE.TubeGeometry(path, 36, 0.010, 6, false)), pulse);
    wire.position.z = 0.019;
    middle.add(wire);
    for (const p of [pts[0], pts[pts.length - 1]]) {
      const via = new THREE.Mesh(viaGeo, traceMetal);
      via.position.copy(p).add(new THREE.Vector3(0, 0, 0.01));
      middle.add(via);
    }
  });

  // Gold-free, restrained metal contacts and micro-components sit inside the
  // casing, visible when the front lifts. They are repeated with shared geometry.
  const contactGeo = ownGeo(new THREE.BoxGeometry(0.075, 0.026, 0.020));
  const chipGeo = ownGeo(new THREE.BoxGeometry(0.16, 0.12, 0.052));
  for (let i = 0; i < 15; i++) {
    const p = markPoint(52 + i * 4.4, 13, 0.072);
    const contact = new THREE.Mesh(contactGeo, screwMat);
    contact.position.copy(p);
    middle.add(contact);
  }
  for (const [x, y] of [[42, 34], [67, 137], [125, 80], [165, 35], [161, 116]]) {
    const p = markPoint(x, y, 0.08);
    if (!containsMarkPoint(p.x, p.y)) continue;
    const chip = new THREE.Mesh(chipGeo, graphiteRear);
    chip.position.copy(p);
    middle.add(chip);
  }

  // Surface machining follows three short routes, leaving the broad faces calm.
  const faceRoutes = [ [[52, 12], [121, 12]], [[18, 138], [93, 138]], [[167, 39], [199, 12]] ];
  const faceLineMat = ownMat(new THREE.LineBasicMaterial({ color: '#080d14', transparent: true, opacity: 0.68 }));
  for (const route of faceRoutes) {
    front.add(new THREE.Line(ownGeo(new THREE.BufferGeometry().setFromPoints(route.map(([x, y]) => markPoint(x, y, 0.088)))), faceLineMat));
  }

  // A soft red bounce stays underneath the object; it is a local light spill,
  // not a backdrop that changes the site's contour field or page composition.
  const haloCanvas = document.createElement('canvas');
  haloCanvas.width = haloCanvas.height = 128;
  const hc = haloCanvas.getContext('2d')!;
  const glow = hc.createRadialGradient(64, 64, 0, 64, 64, 64);
  glow.addColorStop(0, 'rgba(255,45,30,.18)');
  glow.addColorStop(0.45, 'rgba(160,10,12,.06)');
  glow.addColorStop(1, 'rgba(0,0,0,0)');
  hc.fillStyle = glow;
  hc.fillRect(0, 0, 128, 128);
  const haloTexture = ownTex(new THREE.CanvasTexture(haloCanvas));
  haloTexture.colorSpace = THREE.SRGBColorSpace;
  const halo = new THREE.Sprite(ownMat(new THREE.SpriteMaterial({ map: haloTexture, transparent: true, depthWrite: false, toneMapped: false })));
  halo.scale.set(4.8, 2.1, 1);
  halo.position.set(0, -0.9, -0.6);
  assembly.add(halo);

  let width = 1, height = 1;
  let baseZ = 8;
  let horizontalOffset = 0;
  let verticalOffset = 0;
  const resize = () => {
    // Layout size excludes the parent's scroll-driven transform. Measuring its
    // bounding rectangle while contracted would leave a blurry drawing buffer
    // after the hero expands again, until the next actual window resize.
    width = Math.max(1, canvas.clientWidth);
    height = Math.max(1, canvas.clientHeight);
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    // Leave room for the exploded pose at both aspect ratios. The mobile hero
    // identity remains above the sculpture because its canvas footprint is kept.
    const { fit, x, y } = sculptureLayout(window.innerWidth, camera.aspect);
    horizontalOffset = x;
    verticalOffset = y;
    const horizontal = (MARK_WIDTH * fit) / (2 * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * camera.aspect);
    const vertical = 3.7 / (2 * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)));
    baseZ = Math.max(horizontal, vertical);
    camera.position.set(0, 0.06, baseZ);
    camera.lookAt(0, 0.06, 0);
    camera.updateProjectionMatrix();
  };
  resize();
  const ro = new ResizeObserver(() => { resize(); invalidate(); });
  ro.observe(canvas);

  let visible = true;
  let destroyed = false;
  let raf = 0;
  let prev = 0;
  let elapsed = 0;
  let ready = false;
  let slowFrames = 0;
  let wantProgress = 0;
  let progress = 0;
  const want = new THREE.Vector2();
  const have = new THREE.Vector2();

  function frame(now: number) {
    raf = 0;
    if (destroyed || document.hidden || !visible) { prev = 0; return; }
    const dt = prev ? Math.min(0.06, (now - prev) / 1000) : 1 / 60;
    prev = now;
    elapsed += dt;
    const ease = 1 - Math.exp(-dt * 5);
    have.lerp(want, ease);
    progress += (wantProgress - progress) * (1 - Math.exp(-dt * 8));

    // One introduction, then rest. Scroll performs the same deliberate reveal
    // before the existing hero contracts, and reverses naturally on the way up.
    const intro = animate ? smoothstep(2.6, 4.5, elapsed) * (1 - smoothstep(6.4, 8.5, elapsed)) : 0;
    const scrollReveal = smoothstep(0.04, 0.27, progress) * (1 - smoothstep(0.47, 0.90, progress));
    const spread = Math.max(intro * (1 - smoothstep(0, 0.13, progress)), scrollReveal);
    const breath = animate ? Math.sin(elapsed * 0.48) : 0;
    const freeMotion = 1 - smoothstep(0, 0.85, progress);
    assembly.rotation.set(-0.14 - spread * 0.10 + have.y * 0.055 * freeMotion, 0.34 + spread * 0.18 + have.x * 0.12 * freeMotion, 0.04 + breath * 0.008 * freeMotion);
    assembly.position.x = horizontalOffset;
    assembly.position.y = verticalOffset + breath * 0.025 * freeMotion;
    rear.position.set(-spread * 0.08, -spread * 0.10, -0.24 - spread * 0.36);
    middle.position.set(0, 0, -0.015);
    front.position.set(spread * 0.12, spread * 0.15, 0.24 + spread * 0.66);
    for (const pulse of pulses) {
      pulse.uniforms.uTime.value = animate ? elapsed : 2;
      pulse.uniforms.uEnergy.value = 0.6 + spread;
    }
    const pose = spread > 0.88 ? 'open' : spread < 0.04 ? 'assembled' : 'transition';
    if (canvas.dataset.sculpturePose !== pose) canvas.dataset.sculpturePose = pose;
    renderer.render(scene, camera);
    if (!ready) { ready = true; canvas.dataset.sculpture = 'ready'; opts.onReady?.(); }

    // A sustained slow device can shed resolution, never geometry or content.
    if (animate && dt > 0.032 && tier !== 'low') {
      if (++slowFrames > 100) {
        tier = tier === 'high' ? 'medium' : 'low';
        renderer.setPixelRatio(pixelRatio());
        renderer.setSize(width, height, false);
        slowFrames = 0;
      }
    } else slowFrames = Math.max(0, slowFrames - 1);
    if (animate) raf = requestAnimationFrame(frame);
  }
  function invalidate() {
    if (!destroyed && !raf && visible && !document.hidden) raf = requestAnimationFrame(frame);
  }
  const io = new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting;
    if (visible) invalidate();
    else { cancelAnimationFrame(raf); raf = 0; prev = 0; }
  }, { rootMargin: '80px' });
  io.observe(canvas);
  const visibility = () => {
    if (document.hidden) { cancelAnimationFrame(raf); raf = 0; prev = 0; }
    else invalidate();
  };
  const lost = (event: Event) => {
    event.preventDefault();
    cancelAnimationFrame(raf);
    raf = 0;
    opts.onLost?.();
  };
  canvas.addEventListener('webglcontextlost', lost);
  document.addEventListener('visibilitychange', visibility);
  invalidate();

  return {
    setPointer(x, y) { want.set(clamp(x, -1, 1), clamp(y, -1, 1)); },
    setProgress(p) { wantProgress = clamp(p, 0, 1); if (!animate) { progress = wantProgress; invalidate(); } },
    tier: () => tier,
    destroy() {
      destroyed = true;
      cancelAnimationFrame(raf);
      ro.disconnect();
      io.disconnect();
      canvas.removeEventListener('webglcontextlost', lost);
      document.removeEventListener('visibilitychange', visibility);
      geometries.forEach(g => g.dispose());
      materials.forEach(m => m.dispose());
      textures.forEach(t => t.dispose());
      environment.dispose();
      renderer.dispose();
      delete canvas.dataset.sculpture;
      delete canvas.dataset.sculpturePose;
    },
  };
}
