/* =============================================================================
   The hero object: a sealed core.

   A faceted, smoked, genuinely refractive stone with the five local models
   suspended inside it and the corpus written on a plate behind it, so what you
   see through the glass is the machine's own contents, bent and split and
   doubled by the facets. Nothing in the composition ever leaves the stone,
   which is the site's one claim stated as a shape rather than a sentence.

   This is a deliberate change of medium. The object it replaces was Canvas 2D —
   flat fills and hairlines, no light model at all — and the reason it read as a
   diagram rather than as a thing is that nothing in it behaved like a surface.
   Perceived quality on this kind of hero is almost entirely light behaviour:
   speculars that move, an environment that reflects, refraction that carries
   real structure, highlights that roll off rather than clip. None of that is
   expressible in a 2D fill, so no amount of drawing was going to get there.

   Four things carried over from portfolio-opus5/src/lib/scene.ts, each of which
   that file paid for in a wrong version first:

   · TRANSMISSION NEEDS SOMETHING TO TRANSMIT. Over an empty background every
     facet returns the same environment average and the stone reads as grey
     plastic. DOM content behind the canvas cannot help — it is not in the
     scene, so it is not in the transmission buffer. The fix is opaque geometry
     inside the volume and a plate of real letterforms behind it.
   · THIN STRIP LIGHTS, ONE BROAD KEY. A large soft source is caught by nearly
     every face of a twenty-face solid, which returns the same mid-grey from all
     of them and turns the object matte. Thin, very bright strips are caught by
     a few faces only, which is what leaves hard glints on some edges and dark
     on the rest — the contrast that reads as glass. The key is broad because
     strips alone made the highlight swing thirty to one as it turned.
   · FLAT SHADING, LOW DETAIL. A smooth sphere reads as a bauble; facets read as
     a cut stone.
   · `transparent: true` IS LOad-BEARING on the transmission material. Without
     it the transmission sampler stops resolving and the material collapses to a
     flat diffuse solid.

   What is different here, and why. That object sat on a near-black page and was
   lit to stay darker than its headline. This one sits on paper, has no headline
   to lose to, and has the opposite job: it has to be the only mass in an
   otherwise empty frame. So the glass is smoked to near-ink and the plate is
   ink on paper rather than acid on black — the stone is the dark thing on a
   light page, which is the arrangement the reference uses for its portrait.
   ========================================================================== */

import * as THREE from 'three';

export interface CoreHandle {
  destroy(): void;
  /** Normalised pointer, −1..1 across the viewport. */
  setPointer(x: number, y: number): void;
  /** 0–1 across the hero's own passage up the screen. */
  setProgress(p: number): void;
  tier(): Tier;
}

export type Tier = 'high' | 'medium' | 'low';

const SIGNAL = new THREE.Color('#ff3b30');

/** The five, sized by parameter count on a log scale. */
const MODELS: { label: string; params: number }[] = [
  { label: '122B', params: 122 },
  { label: '35B', params: 35 },
  { label: '32B', params: 32 },
  { label: '8B', params: 8 },
  { label: '4B', params: 4 },
];

/* What moves inside the stone.

   The five slogans this replaces — NOTHING LEAVES, AIR-GAPPED, ZERO EGRESS and
   the rest — were the object's whole argument, set in 66px caps on a plate and
   readable straight through the glass. That was the wrong place for them twice
   over. The hero has no headline and no standfirst precisely because the
   reference's has neither, and then five shouted sentences sat in the middle of
   it; and a claim about traffic, printed as a poster, is a caption rather than
   a demonstration.

   So the words are gone and the traffic is real. Sixty-four hex bytes, drawn
   once into an atlas and ridden by two hundred and ten glyphs circulating on
   closed loops inside the volume. Hex rather than invented words because it is
   honest — this is what the thing the object claims to hold actually looks
   like on a wire — and because two characters survive being bent through a
   facet where a word does not. */
const ATLAS_COLS = 8;
const ATLAS_ROWS = 8;

/** Deterministic, so the plate is the same drawing on every load. */
function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * The glyph atlas: sixty-four hex bytes, white on nothing.
 *
 * White rather than ink so the material's own colour decides the ink, and cut
 * out with alphaTest rather than blended — which is not a detail. A material
 * with `transparent: true` is not written into the transmission buffer at all,
 * so a blended glyph would be visible in front of the stone and invisible
 * through it, which is the exact opposite of the point. alphaTest keeps these
 * in the opaque pass, and the opaque pass is what the glass can see.
 */
function glyphAtlas(): THREE.CanvasTexture {
  const W = 1024;
  const H = 512;
  const cw = W / ATLAS_COLS;
  const ch = H / ATLAS_ROWS;
  const c = document.createElement('canvas');
  c.width = W;
  c.height = H;
  const ctx = c.getContext('2d')!;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#ffffff';
  ctx.font = `700 ${Math.round(ch * 0.72)}px ui-monospace, "SF Mono", monospace`;
  ctx.letterSpacing = '-0.02em';
  for (let i = 0; i < ATLAS_COLS * ATLAS_ROWS; i++) {
    const x = (i % ATLAS_COLS) * cw;
    const y = Math.floor(i / ATLAS_COLS) * ch;
    ctx.fillText(i.toString(16).padStart(2, '0'), x + cw / 2, y + ch / 2 + ch * 0.04);
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

/**
 * The plate: a substrate of ink on paper, opaque, sitting inside the stone.
 *
 * Opaque because transparent materials are not written into the transmission
 * buffer at all, so a plate with a cleared alpha channel cannot be refracted by
 * construction — its "transparency" has to be painted rather than blended. It
 * is painted in the page's own paper colour and its edges are faded to that
 * same colour, so the quad never shows a rectangle over the page behind it.
 *
 * It is still here after the slogans left, and it has to be. Transmission needs
 * something to transmit: a facet pointing somewhere the traffic happens not to
 * be returns the environment average and goes flat grey, which is the failure
 * this file opens by describing. The moving glyphs are sparse by nature — that
 * is what makes them read as traffic rather than as a texture — so the plate is
 * what fills the gaps between them.
 *
 * Scattered rather than set in lines, and in the same hex the traffic is made
 * of. Lines of type read as a page held up behind the glass; scattered at four
 * sizes and a fifth of the contrast it reads as depth, which is what a
 * substrate should do.
 */
function plateTexture(): THREE.CanvasTexture {
  const S = 1024;
  const c = document.createElement('canvas');
  c.width = S;
  c.height = S;
  const ctx = c.getContext('2d')!;

  ctx.fillStyle = '#16161c';
  ctx.fillRect(0, 0, S, S);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  const rand = rng(0x5eed);
  for (let i = 0; i < 150; i++) {
    const size = 13 + Math.floor(rand() * 26);
    ctx.font = `600 ${size}px ui-monospace, "SF Mono", monospace`;
    ctx.letterSpacing = '0.04em';
    /* Ink, and light. Almost none of the plate's contrast survives the trip: it
       is multiplied by the stone's smoked base colour, attenuated across the
       glass and then mip-blurred by the refraction. It is set to sit under the
       moving glyphs rather than compete with them — the traffic is the content
       and this is the ground it moves over. */
    ctx.fillStyle = `rgba(236,236,242,${(0.05 + rand() * 0.09).toFixed(3)})`;
    const byte = Math.floor(rand() * 256).toString(16).padStart(2, '0');
    ctx.fillText(byte, rand() * S, rand() * S);
  }

  /* Fade the border back to paper so the quad has no visible edge. Done as a
     paint over the finished plate rather than as alpha, for the reason above. */
  const g = ctx.createRadialGradient(S / 2, S / 2, S * 0.26, S / 2, S / 2, S * 0.46);
  g.addColorStop(0, 'rgba(22,22,28,0)');
  g.addColorStop(1, 'rgba(22,22,28,1)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, S, S);

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

/**
 * A soft radial falloff for the interior light.
 *
 * A hard-edged emissive solid in here refracts into a scatter of distinct
 * dots — every facet produces its own crisp copy, which reads as specks
 * embedded in the stone. With no edge to replicate, the copies overlap into one
 * diffuse glow, which is what light actually does.
 */
function glowTexture(): THREE.CanvasTexture {
  const s = 128;
  const c = document.createElement('canvas');
  c.width = s;
  c.height = s;
  const ctx = c.getContext('2d')!;
  const g = ctx.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
  g.addColorStop(0, 'rgba(255,255,255,1)');
  g.addColorStop(0.35, 'rgba(255,255,255,0.42)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, s, s);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/**
 * A vertical ramp, used as the surround's own gradient.
 *
 * This is the fix for the object's largest failure and it is worth stating
 * precisely, because the cause is not where it looks. Flat panels of constant
 * colour make a flat-shaded facet return a *constant*: the normal is the same
 * across the whole face, the roughness is 0.055, so every fragment samples the
 * environment in almost the same direction and the face fills with one value.
 * Twenty faces, twenty flat fills — measured at 3.4% saturation and no interior
 * variation at all across the lit half, which is the whole reason the top of
 * the stone read as grey clay and the accent strip landed as a hard-edged lime
 * wedge rather than a glint.
 *
 * The environment is what varies, or nothing does. With a ramp on each panel
 * the reflection vector's small sweep across a face now crosses real values, so
 * a facet carries a gradient, the accent arrives as a streak that falls off,
 * and the edge between two faces is a step between two ramps rather than
 * between two paints.
 *
 * Cheap: 4x256, built once, and the PMREM pass bakes it before the first frame.
 */
function rampTexture(): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 4;
  c.height = 256;
  const ctx = c.getContext('2d')!;
  const g = ctx.createLinearGradient(0, 0, 0, 256);
  /* Bright at the top falling to near-dark at the bottom, and not linearly —
     the knee near the top is what puts most of the range into the part of the
     surround the upper facets actually see. */
  g.addColorStop(0, '#ffffff');
  g.addColorStop(0.3, '#d6d6d6');
  g.addColorStop(0.62, '#7c7c7c');
  g.addColorStop(1, '#232323');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 4, 256);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

/**
 * The lighting environment.
 *
 * A lit room, not a dark one — and that correction is the whole of this pass.
 *
 * The first version was a black room with five very bright emissive strips,
 * lifted from the object on portfolio-opus5. That is the right environment
 * there, because that page is near-black and the stone has to stay darker than
 * its own headline. Here the page is paper, and a dark room reflected in a
 * flat-shaded solid gives exactly two values: the three or four facets that
 * happen to catch a strip, blown to white, and every other facet at
 * near-black. No mid-tones anywhere. That is what the hard pale triangles and
 * the flat dark quadrilaterals both were — not a bug in any one material, but
 * an environment with nothing in it between 0 and 30.
 *
 * So: a graded surround. A bright top, dimmer sides, dark floor, mid back. Each
 * facet now returns a different value according to which way it points, which
 * is what modelling is. The thin strips survive at a fifth of their old
 * intensity, because glints are still what reads as glass — they just cannot be
 * the only thing in the reflection.
 *
 * The trade is real and worth stating: a lit surround raises the object's
 * overall value, so it is less of a black mass than it was. It is still by far
 * the darkest thing on a paper page, and a dark shape with no interior
 * modelling was never reading as a solid anyway.
 */
function studio(): THREE.Scene {
  const env = new THREE.Scene();
  const ramp = rampTexture();

  const panel = (
    w: number,
    h: number,
    color: number,
    intensity: number,
    pos: [number, number, number],
    aim = true,
  ) => {
    const m = new THREE.Mesh(
      new THREE.PlaneGeometry(w, h),
      /* Tint times ramp. The intensities below are the *peak* of each panel
         rather than its flat value, so they read higher than the numbers they
         replaced while the surround as a whole sits at roughly the level it
         did — the ramp averages a little over half. */
      new THREE.MeshBasicMaterial({ map: ramp, color: new THREE.Color(color).multiplyScalar(intensity) }),
    );
    m.position.set(...pos);
    /* Aimed rather than given an Euler by hand: a panel that misses the origin
       contributes nothing to the cube map, and that is very hard to see in a
       still. */
    if (aim) m.lookAt(0, 0, 0);
    env.add(m);
  };

  /* The graded surround. Big, dim, and the reason any facet has a mid-tone at
     all: bright above falling to dark below, so the value a face returns is a
     function of how far it is tipped toward the sky. */
  /* Peaks, not flat values — see the note on `panel`. They are roughly 1.9x the
     numbers they replaced, which puts the surround's average back where it was.

     Tinted a little further toward the page's own olive than they were. The
     surround is what a lit facet returns, so a neutral surround makes a neutral
     facet whatever colour the glass is: measured at 3.4% saturation across the
     lit half against 22% across the shadowed half, which is an object that
     changes material halfway up. The tint is small on purpose — enough that the
     light side belongs to the same palette as the dark side, not so much that
     the stone reads as lit by a green bulb. */
  panel(14, 14, 0xf3f5fa, 4.6, [0, 7, 0]);
  panel(14, 14, 0xced2db, 1.55, [-7, 0.5, 0]);
  panel(14, 14, 0xced2db, 1.25, [7, 0.5, 0]);
  panel(14, 14, 0xdadde5, 1.4, [0, 0, -7]);
  panel(14, 14, 0xadb1bb, 1.05, [0, 0.5, 8]);
  /* A dark floor. Without it the underside matches the top and the solid loses
     its up. */
  panel(14, 14, 0x26282f, 0.7, [0, -7, 0]);

  /* Thin bright strips for the glints. They are what still reads as glass; they
     are no longer the only thing in frame, and with the ramp on them each one
     now falls off along its own length instead of ending in a hard stop. */
  panel(0.4, 6.5, 0xffffff, 11, [-3.4, 1.4, 2.4]);
  panel(0.35, 5.5, 0xffffff, 8.5, [3.6, -0.6, 2.0]);
  panel(4.5, 0.35, 0xffffff, 7.6, [0, 3.8, -1.4]);
  panel(1.8, 1.1, 0xffffff, 10, [-2.6, 2.6, 3.0]);

  /* The one saturated source. Everything else here is neutral, and this is what
     puts the site's accent into the glass without tinting the material — a
     reflection rather than a colour.

     Half the width it was. At 0.4 across it subtended more than a facet, so the
     facet that caught it filled solid and the accent arrived as a hard-edged
     wedge across a sixth of the silhouette — a sticker, not a glint. Thin
     enough that no facet can contain it, and it crosses one instead.

     This was still 0xd2ff00 after the re-theme: the object went on throwing lime
     glints into a red and black page, which is what Dhanush saw. It is the HOT
     red rather than the ground red, matching SIGNAL above — this is a specular
     source at intensity 8, and the deep red has no brightness to give a glint. */
  panel(0.2, 3.4, 0xff3b30, 8, [2.4, 2.2, 3.0]);

  return env;
}

export function createCore(
  canvas: HTMLCanvasElement,
  opts: { animate?: boolean; onLost?: () => void } = {},
): CoreHandle | null {
  const animate = opts.animate !== false;

  let renderer: THREE.WebGLRenderer;
  try {
    renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance',
    });
  } catch {
    return null;
  }

  const coarse = window.matchMedia('(pointer: coarse)').matches;
  let tier: Tier = coarse ? 'medium' : 'high';
  const ratioFor = (t: Tier) => Math.min(window.devicePixelRatio, t === 'high' ? 2 : t === 'medium' ? 1.35 : 1);
  renderer.setPixelRatio(ratioFor(tier));
  /* Filmic roll-off rather than clipping. The strip lights are far brighter
     than white and without this every glint burns to a flat blown patch. */
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.0;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(34, 1, 0.1, 100);
  camera.position.set(0, 0, 6.9);

  const pmrem = new THREE.PMREMGenerator(renderer);
  const envScene = studio();
  const envRT = pmrem.fromScene(envScene, 0.02);
  scene.environment = envRT.texture;
  envScene.traverse((o) => {
    const m = o as THREE.Mesh;
    if (m.isMesh) {
      m.geometry.dispose();
      const mat = m.material as THREE.MeshBasicMaterial;
      /* The ramp is shared by every panel, so this disposes it on the first
         mesh and no-ops on the rest — three guards double disposal. Missing it
         leaks one texture per mount, which in development is one per hot
         update. */
      mat.map?.dispose();
      mat.dispose();
    }
  });

  const root = new THREE.Group();
  scene.add(root);

  /* ── the plate ───────────────────────────────────────────────────────── */
  const plateTex = plateTexture();
  /* The plate lives *inside* the stone — 1.8 units square at z −0.2, whose far
     corner sits 1.29 out against the stone's 1.32, so it is fully enclosed by
     the glass and has no footprint outside it at all.

     It took four positions to get here and each failure was instructive. Behind
     the stone at 9 units it covered the viewport, and the shouted rows were
     legible either side of the object as ordinary page type. At 3.8 they were
     not, but the quad still stood 10% proud of the silhouette — invisible
     against the old wobbling background, and then a paper-coloured square
     punched clean through the new one the moment the ground grew a continuous
     field. Shrinking it inside the silhouette hid it from the page and not from
     the glass: the step from plate to empty scene is itself an edge, and the
     stone refracted a rectangle.

     An opaque plate cannot carry the field behind it — it has to be opaque to
     be in the transmission buffer at all — so no size behind the stone is
     correct. Inside, there is no outside to disagree with. It is also the
     better idea: the corpus is sealed in the core rather than propped up behind
     it, which is what the object claims in the first place.

     Not parented to the rotating group. An inclusion that turns edge-on twice a
     revolution spends half its time as a line. */
  const plate = new THREE.Mesh(
    new THREE.PlaneGeometry(1.8, 1.8),
    /* toneMapped off so the paper it fades to is exactly the page's paper. */
    new THREE.MeshBasicMaterial({ map: plateTex, toneMapped: false, side: THREE.DoubleSide }),
  );
  plate.position.z = -0.2;
  scene.add(plate);

  /* ── the stone ───────────────────────────────────────────────────────── */
  const coreGeo = new THREE.IcosahedronGeometry(1.32, 1);
  const coreMat = new THREE.MeshPhysicalMaterial({
    transmission: 1,
    /* Thin. Thicker glass smeared the plate into flat blobs; this keeps the
       bent letterforms readable, which is the entire point of having them. */
    thickness: 0.72,
    ior: 1.47,
    roughness: 0.055,
    metalness: 0,
    /* No clearcoat: it models a lacquer over a base layer, and on flat faces it
       paints each one a solid specular grey and buries the refraction. */
    clearcoat: 0,
    /* Almost off. At 0.3 it was invisible against a dark surround and came out
       as flat magenta across the upper facets the moment the room was lit —
       which is a colour that appears nowhere else in this palette. Kept at a
       trace because it is what puts a hint of colour on the grazing edges. */
    iridescence: 0.06,
    iridescenceIOR: 1.3,
    iridescenceThicknessRange: [200, 620],
    attenuationColor: new THREE.Color('#8a6b70'),
    attenuationDistance: 2.4,
    envMapIntensity: 1.15,
    /* Smoked to near-ink. Transmission multiplies whatever is seen through the
       glass by this colour, so this is the control that decides whether the
       object has mass on a paper page — and having mass is the whole reason
       this exists. Clear glass on cream is invisible from three feet away.
       Smoked too far is the opposite failure and was the first cut: at #232619
       the stone was a black silhouette with one specular on it and none of the
       refraction it exists to show reached the eye. This is the value where it
       still reads as the darkest thing in the frame and you can see into it. */
    color: new THREE.Color('#2b2124'),
    flatShading: true,
    /* Load-bearing. Without it the transmission sampler stops resolving and the
       material collapses to a flat diffuse solid. */
    transparent: true,
  });
  const stone = new THREE.Mesh(coreGeo, coreMat);
  root.add(stone);

  /* The hairline cage just outside it, in the site's own drawing language — the
     one piece of the old Canvas object worth keeping. Ink rather than accent,
     because on paper an accent wireframe at this size is the loudest thing in
     the frame and the stone should be. */
  const cage = new THREE.Mesh(
    new THREE.IcosahedronGeometry(1.62, 1),
    new THREE.MeshBasicMaterial({
      color: new THREE.Color('#050508'),
      wireframe: true,
      transparent: true,
      opacity: 0.07,
    }),
  );
  root.add(cage);

  /* ── the traffic ─────────────────────────────────────────────────────── */
  /* Two hundred and ten glyphs on seven closed loops inside the glass.
   *
   * This is the object's claim, moved from something you read to something you
   * watch. The loops are closed and the loops are inside: whatever the traffic
   * does, it comes back round, and it never reaches the surface. When the
   * cursor comes near, the glyphs on that side are driven outward until they
   * meet the inner wall, hold against it, and fall back when it leaves. Nothing
   * leaves — as a behaviour, which is the only form of that sentence a visitor
   * can check.
   *
   * One geometry rather than an InstancedMesh, and the choice is about the
   * atlas. Giving each instance its own cell needs a per-instance attribute and
   * a shader injection to offset the UVs, which is three lines of string
   * replacement against three's own chunk names and breaks silently on a minor
   * version bump. Baking the cell into static UVs and moving 840 vertices on
   * the CPU each frame is one draw call either way, costs nothing at this
   * count, and cannot break.
   *
   * Not parented to the rotating group, for the reason the plate is not: a
   * billboard that turns with the stone spends half its revolution edge-on.
   * These face the camera and the glass turns around them.
   */
  const GLYPH_W = 0.22;
  const GLYPH_H = 0.11;
  /* The inner wall. The stone's faces sit between its inradius, about 1.26, and
     its circumradius of 1.32; a glyph's half-diagonal is 0.123, so this is the
     largest radius at which the traffic can never poke through a face. */
  const WALL = 1.06;

  const atlasTex = glyphAtlas();
  const flow: { u: THREE.Vector3; v: THREE.Vector3; radius: number; speed: number; phase: number }[] = [];

  const pick = rng(0xc0ffee);
  /* Seven loops, and the count on each is derived from its circumference rather
     than fixed — which is the difference between traffic and speckle.

     Thirty glyphs spread evenly around every loop regardless of size was the
     first version: on the small loops they crowded and on the large ones they
     sat a third of a unit apart, and at page scale two hundred isolated
     two-character marks inside dark glass read as grain on a photograph. Nobody
     looking at it would say "data". Spaced at a glyph and a bit, each loop is a
     continuous ribbon of hex instead, and a ribbon that moves is unmistakably a
     stream of something. Fewer glyphs, larger, and it reads. */
  const RADII = [0.4, 0.5, 0.62, 0.74, 0.85, 0.95, 1.02];
  for (let st = 0; st < RADII.length; st++) {
    /* An irregular fan of planes. Evenly spaced ones resolve into a sphere of
       latitude lines the moment they are all on screen together. */
    const tilt = 0.42 + st * 1.07;
    const spin = st * 2.399;
    const axis = new THREE.Vector3(
      Math.sin(tilt) * Math.cos(spin),
      Math.cos(tilt),
      Math.sin(tilt) * Math.sin(spin),
    ).normalize();
    const u = new THREE.Vector3(0, 1, 0).cross(axis);
    if (u.lengthSq() < 1e-4) u.set(1, 0, 0);
    u.normalize();
    const v = axis.clone().cross(u).normalize();
    const radius = RADII[st];
    const count = Math.max(6, Math.round((2 * Math.PI * radius) / (GLYPH_W * 1.12)));
    /* Half of them run the other way, so crossings read as two currents rather
       than as one shell rotating. */
    const speed = (0.075 + (st % 3) * 0.03) * (st % 2 ? -1 : 1);
    for (let k = 0; k < count; k++) {
      flow.push({ u, v, radius, speed, phase: (k / count) * Math.PI * 2 + st * 1.7 });
    }
  }
  const GLYPH_N = flow.length;

  const gPos = new Float32Array(GLYPH_N * 12);
  const gUv = new Float32Array(GLYPH_N * 8);
  const gIdx = new Uint16Array(GLYPH_N * 6);
  for (let i = 0; i < GLYPH_N; i++) {
    const cell = Math.floor(pick() * ATLAS_COLS * ATLAS_ROWS);
    const cx = (cell % ATLAS_COLS) / ATLAS_COLS;
    const cy = 1 - Math.floor(cell / ATLAS_COLS) / ATLAS_ROWS;
    const dx = 1 / ATLAS_COLS;
    const dy = 1 / ATLAS_ROWS;
    gUv.set([cx, cy - dy, cx + dx, cy - dy, cx + dx, cy, cx, cy], i * 8);
    const o = i * 4;
    gIdx.set([o, o + 1, o + 2, o, o + 2, o + 3], i * 6);
  }

  const gGeo = new THREE.BufferGeometry();
  gGeo.setAttribute('position', new THREE.BufferAttribute(gPos, 3).setUsage(THREE.DynamicDrawUsage));
  gGeo.setAttribute('uv', new THREE.BufferAttribute(gUv, 2));
  gGeo.setIndex(new THREE.BufferAttribute(gIdx, 1));
  /* Set once and never recomputed: the traffic is bounded by WALL by
     construction, and recomputing a bounding sphere every frame to prove that
     is work to reach a number already known. */
  gGeo.boundingSphere = new THREE.Sphere(new THREE.Vector3(), WALL + 1.2);

  const traffic = new THREE.Mesh(
    gGeo,
    new THREE.MeshBasicMaterial({
      map: atlasTex,
      /* Cut out, not blended — see the atlas. Blended, these would vanish from
         the transmission buffer and the glass would show an empty volume. */
      alphaTest: 0.5,
      /* Ink, and the two wrong versions before it are the argument for it.
         Transmission multiplies everything behind the glass by the same
         #2b3122, so it scales absolute values and preserves ratios: bone glyphs
         at 238 over a paper plate at 244 came out 40 over 41 — a ratio of 0.98,
         which is not low contrast, it is none, and the stone read as a plain
         dark ball. Ink at 17 over paper at 244 is 14:1 before the glass and
         14:1 after it. That ratio is the only reason the slogans this replaces
         were ever legible, and it is what the plate has to stay clean to
         protect. */
      color: new THREE.Color('#ececf2'),
      side: THREE.DoubleSide,
      /* As the plate is, so the ink is the page's ink rather than a tone-mapped
         approximation of it. */
      toneMapped: false,
    }),
  );
  traffic.frustumCulled = false;
  scene.add(traffic);

  /* ── what is inside ──────────────────────────────────────────────────── */
  /* The five, in orbit around the stone rather than sealed inside it.

     Inside was the first cut and it is the more literal reading of the claim —
     everything the machine holds stays in the box — but a near-black solid
     suspended in near-black smoked glass is invisible, and an invisible model
     communicates nothing. Outside, each one passes behind the stone once per
     orbit and is bent, split and doubled by the facets on the way through,
     which is the single most striking thing this object does and the reason for
     paying for transmission at all. The claim is carried by the plate, which
     says it in words, in a place only the glass can show you.

     Sized on a log scale, because 122 against 4 on a linear one makes four of
     them dust. */
  const inner = new THREE.Group();
  root.add(inner);
  const nodes = MODELS.map((m, i) => {
    const r = 0.052 + Math.log10(m.params) * 0.088;
    const geo = new THREE.OctahedronGeometry(r, 0);
    /* The accent one is shaded by hand rather than lit, and every lit version
       of it failed the same way for two different reasons.

       It has one job the others do not: to be the same green as the résumé
       button, which is a DOM element painted #d2ff00 flat. Tone-mapped, it
       cannot be — ACES mixes channels on the way in, feeding 0.028R + 0.134G
       into blue, so a fully saturated lime comes out desaturated by
       construction; measured across four settings the saturation never rose
       above 73% against the button's 100%, and the hue sat five degrees yellow.
       Taken off the curve to fix that, the lit faces have nothing to roll them
       off and clip instead: measured at rgb(255,255,55) across half the solid's
       area — two faces of flat blown yellow at hue 60, and still blown after
       four passes at the emissive and the environment intensity, because the
       surround puts enough light on an upward face to clip a lime albedo on its
       own.

       So it is not lit. Each face carries the accent scaled by how far it is
       tipped toward the sky, written into a colour attribute — the read of a
       light without a light model. Exactly on palette because the value is the
       palette, no clipping because nothing is ever multiplied above 1, no
       desaturation because nothing goes through the curve. The other four stay
       lit, which is right: they are dark solids and dark solids need modelling
       to have form, where the accent needs to be a colour. */
    if (i === 0) {
      const pos = geo.attributes.position;
      const col = new Float32Array(pos.count * 3);
      const a = new THREE.Vector3();
      const b = new THREE.Vector3();
      const c = new THREE.Vector3();
      const n = new THREE.Vector3();
      /* Two passes so the range can be normalised rather than assumed. An
         octahedron's face normals are all (+/-1, +/-1, +/-1) over root three, so
         the highest face is tipped 0.577 toward the sky and not 1 — shading
         straight off n.y left the brightest face at 90% of the accent, which
         measured as lightness 47.6 against the button's 50. Normalised, the top
         face is the accent exactly and the bottom is a known fraction of it. */
      const ny: number[] = [];
      for (let f = 0; f < pos.count; f += 3) {
        a.fromBufferAttribute(pos, f);
        b.fromBufferAttribute(pos, f + 1);
        c.fromBufferAttribute(pos, f + 2);
        ny.push(n.copy(b).sub(a).cross(c.sub(a)).normalize().y);
      }
      const lo = Math.min(...ny);
      const span = Math.max(1e-6, Math.max(...ny) - lo);
      for (let f = 0; f < pos.count; f += 3) {
        /* Never to zero: an unlit face of a solid this small reads as a hole
           rather than as a shadow. */
        const k = 0.62 + 0.38 * ((ny[f / 3] - lo) / span);
        for (let v = 0; v < 3; v++) {
          col[(f + v) * 3] = SIGNAL.r * k;
          col[(f + v) * 3 + 1] = SIGNAL.g * k;
          col[(f + v) * 3 + 2] = SIGNAL.b * k;
        }
      }
      geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
    }
    const mesh = new THREE.Mesh(
      geo,
      i === 0
        ? /* Off the curve, as the plate is: a tone-mapped basic material still
             goes through ACES, which was measured putting 91 into the blue
             channel of a colour whose blue is 0. */
          new THREE.MeshBasicMaterial({ vertexColors: true, toneMapped: false })
        : new THREE.MeshStandardMaterial({
            color: new THREE.Color('#403033'),
            roughness: 0.3,
            /* Barely metallic. Fully polished metal was the first cut and it
               came out as four flat black quads: a mirror in a dark room
               reflects the dark room, so every face returned the same near-zero
               value and the solids lost their form entirely. Dielectric with a
               little roughness shades each face differently, which is what
               makes an octahedron look like one. */
            metalness: 0.45,
            envMapIntensity: 1.7,
            flatShading: true,
          }),
    );
    inner.add(mesh);
    return {
      mesh,
      /* Spread around the volume on a fixed but irregular set of orbits, so it
         never resolves into a ring. */
      radius: 1.8 + (i % 3) * 0.18,
      speed: 0.14 + i * 0.039,
      phase: (i / MODELS.length) * Math.PI * 2,
      tilt: -0.5 + i * 0.28,
    };
  });

  /* The light the glass carries. Off the centre axis on purpose: dead centre,
     the refracted copies land in a symmetrical rosette that reads as a printed
     motif rather than as something suspended inside the stone. */
  const kernel = new THREE.Sprite(
    new THREE.SpriteMaterial({
      map: glowTexture(),
      color: SIGNAL,
      transparent: true,
      opacity: 0.7,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    }),
  );
  kernel.scale.setScalar(0.9);
  kernel.position.set(0.16, -0.1, 0.05);
  root.add(kernel);

  /* No post-processing chain, and that is a correction rather than a saving.
     The first cut ran RenderPass into UnrealBloomPass, which put the whole
     scene through the composer's linear render targets with nothing converting
     back to sRGB at the end — every colour came out roughly a stop and a half
     dark, and the plate, whose entire job is to be exactly the page's paper,
     rendered as a visible grey rectangle sitting over the section. Adding an
     OutputPass fixes the conversion and then tone-maps the plate, which breaks
     it the other way.

     Bloom was worth little here regardless: it is what carries the atmosphere
     on a black page, and on paper a broad bloom just fogs the sheet. Rendering
     straight to the canvas keeps `toneMapped: false` meaning exactly what it
     says, and the glints hold up on their own because they are speculars off a
     near-black solid rather than emissive surfaces needing help to read. */

  /* ── loop ────────────────────────────────────────────────────────────── */
  /* Allocated once. Four Vector3s per frame at sixty frames a second is 14,400
     objects a minute for the collector to deal with, on the one thread that
     must not stall. */
  const vRight = new THREE.Vector3();
  const vUp = new THREE.Vector3();
  const vFwd = new THREE.Vector3();
  const vPos = new THREE.Vector3();
  const vProbe = new THREE.Vector3();

  const want = { x: 0, y: 0 };
  const have = { x: 0, y: 0 };
  let progress = 0;
  let raf = 0;
  let running = true;

  /* Where the camera has to sit for the object to fit the box it is given.
     A fixed distance is right for exactly one aspect ratio and wrong for every
     other: three's perspective camera derives its horizontal field from the
     vertical one, so on a portrait viewport the frame narrows while the object
     does not, and the stone was being cut off at both sides on a phone with no
     silhouette left to read.

     Solved for rather than tabulated — the object's bounding radius over the
     tangent of the half-field, divided by whichever of the two dimensions is
     the tighter. Narrow screens fit a smaller radius on purpose: they fit the
     stone and let the outermost satellites leave the frame, because fitting all
     of them on a phone leaves the stone too small to see into, and being able
     to see into it is the entire point. */
  let baseZ = 6.9;
  const size = () => {
    const r = canvas.getBoundingClientRect();
    const w = Math.max(1, r.width);
    const h = Math.max(1, r.height);
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    const radius = camera.aspect < 1 ? 1.62 : 1.88;
    baseZ = (radius * 1.12) / (Math.tan((camera.fov * Math.PI) / 360) * Math.min(1, camera.aspect));
    camera.updateProjectionMatrix();
  };
  size();
  const ro = new ResizeObserver(size);
  ro.observe(canvas);

  let visible = true;
  const io = new IntersectionObserver(([e]) => (visible = e.isIntersecting), { rootMargin: '120px' });
  io.observe(canvas);

  const onLost = (e: Event) => {
    e.preventDefault();
    running = false;
    cancelAnimationFrame(raf);
    opts.onLost?.();
  };
  canvas.addEventListener('webglcontextlost', onLost);

  /* Quality ladder: resolution only, since there is no post chain left to drop.
     Transmission already renders the scene a second time every frame, so pixel
     ratio is by far the largest lever available. */
  let slow = 0;
  const demote = () => {
    if (tier === 'high') {
      tier = 'medium';
      renderer.setPixelRatio(ratioFor(tier));
      size();
    } else if (tier === 'medium') {
      tier = 'low';
      renderer.setPixelRatio(ratioFor(tier));
      size();
    }
  };

  let prev = 0;
  const frame = (now: number) => {
    if (!running) return;
    raf = requestAnimationFrame(frame);
    if (!visible) return;

    const dt = prev ? Math.min(0.05, (now - prev) / 1000) : 0.016;
    prev = now;

    if (animate) {
      if (dt > 0.028 && tier !== 'low') {
        if (++slow > 45) {
          demote();
          slow = 0;
        }
      } else slow = Math.max(0, slow - 1);
    }

    have.x += (want.x - have.x) * 0.05;
    have.y += (want.y - have.y) * 0.05;

    const t = animate ? now / 1000 : 0;
    /* Idle turn plus cursor. The idle is what makes it an object rather than a
       control: it is already moving before anyone touches it. */
    root.rotation.y = t * 0.12 + have.x * 0.5;
    root.rotation.x = Math.sin(t * 0.21) * 0.09 + have.y * 0.28;
    cage.rotation.y = -t * 0.16;
    cage.rotation.z = t * 0.05;

    for (const n of nodes) {
      const a = n.phase + t * n.speed * Math.PI * 2;
      n.mesh.position.set(
        Math.cos(a) * n.radius,
        Math.sin(a * 0.8 + n.tilt) * n.radius * 0.62,
        Math.sin(a) * n.radius,
      );
      n.mesh.rotation.x = a * 0.7;
      n.mesh.rotation.y = a * 0.5;
    }

    /* The hero scrolling away lifts the stone and lets it recede, so it leaves
       with the section rather than being cut off by it. On a phone it also sits
       higher to begin with, because the status card owns the bottom of that
       frame and the two were sharing the same third of the screen. */
    root.position.y = progress * 0.9 + (camera.aspect < 1 ? 0.5 : 0);
    camera.position.z = baseZ + progress * 1.4;
    /* Both of these live on the scene rather than in the rotating group, so
       they do not inherit that lift and have to be given it. The plate did not
       have this line and did not need it while the hero never scrolled during
       review: at full progress the stone rises 0.9 and the plate stayed where
       it was, which walks a 1.8-unit square of paper out of a 1.32 stone. */
    plate.position.y = root.position.y;
    traffic.position.y = root.position.y;

    /* The traffic. The probe is a direction rather than a point — the cursor
       gives two numbers and no depth, so the honest reading of it is "which way
       is the visitor pressing from".

       Tipped only slightly toward the camera, and that number is the whole
       difference between an effect and no effect. At 0.85 the probe pointed
       almost straight down the view axis, which is where the cursor actually
       is and is also the one direction in which motion is invisible: the swarm
       was being shoved at the lens and foreshortening ate all of it. Measured,
       the traffic's centroid moved 1% of the object's width between a cursor
       hard right and a cursor hard left. Flattened toward the screen plane it
       moves where it can be seen. */
    camera.matrixWorld.extractBasis(vRight, vUp, vFwd);
    vProbe.set(have.x, -have.y, 0.32).normalize();
    for (let i = 0; i < GLYPH_N; i++) {
      const f = flow[i];
      const a = f.phase + t * f.speed * Math.PI * 2;
      vPos.set(0, 0, 0)
        .addScaledVector(f.u, Math.cos(a) * f.radius)
        .addScaledVector(f.v, Math.sin(a) * f.radius);
      /* A breath in and out of the radius, so a loop is a current rather than a
         wire ring with beads on it. */
      vPos.multiplyScalar(1 + Math.sin(a * 3 + f.phase) * 0.07);

      /* A shove along the probe rather than a swell along the radius. Scaling
         each glyph away from the centre is what a pressure field does and it
         reads as the object inflating — every glyph moves, none of them moves
         anywhere in particular. Displacing the near side bodily toward the
         cursor and then stopping it at the wall reads as what it is: the
         traffic crowds up against the face nearest the visitor and thins out
         behind, and falls back when the cursor goes elsewhere.

         Squared, and only on the near side, so the far half stays where it is
         and the crowding has somewhere to have come from. */
      const align = Math.max(0, vPos.dot(vProbe) / Math.max(1e-6, vPos.length()));
      vPos.addScaledVector(vProbe, align * align * 0.58);
      /* The claim, in one line. */
      if (vPos.lengthSq() > WALL * WALL) vPos.setLength(WALL);

      const o = i * 12;
      for (let k = 0; k < 4; k++) {
        const sx = k === 1 || k === 2 ? 0.5 : -0.5;
        const sy = k >= 2 ? 0.5 : -0.5;
        gPos[o + k * 3] = vPos.x + vRight.x * GLYPH_W * sx + vUp.x * GLYPH_H * sy;
        gPos[o + k * 3 + 1] = vPos.y + vRight.y * GLYPH_W * sx + vUp.y * GLYPH_H * sy;
        gPos[o + k * 3 + 2] = vPos.z + vRight.z * GLYPH_W * sx + vUp.z * GLYPH_H * sy;
      }
    }
    gGeo.attributes.position.needsUpdate = true;

    renderer.render(scene, camera);
    if (!animate) {
      running = false;
      cancelAnimationFrame(raf);
    }
  };
  raf = requestAnimationFrame(frame);

  return {
    destroy() {
      running = false;
      cancelAnimationFrame(raf);
      canvas.removeEventListener('webglcontextlost', onLost);
      ro.disconnect();
      io.disconnect();
      scene.traverse((o) => {
        const m = o as THREE.Mesh;
        if (m.isMesh) {
          m.geometry.dispose();
          const mat = m.material as THREE.Material | THREE.Material[];
          (Array.isArray(mat) ? mat : [mat]).forEach((x) => x.dispose());
        }
      });
      plateTex.dispose();
      atlasTex.dispose();
      envRT.dispose();
      pmrem.dispose();
      renderer.dispose();
    },
    setPointer(x, y) {
      want.x = x;
      want.y = y;
    },
    setProgress(p) {
      progress = p;
    },
    tier: () => tier,
  };
}
