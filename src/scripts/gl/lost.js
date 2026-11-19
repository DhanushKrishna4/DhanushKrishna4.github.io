// The 404 page's one object: "404" as a solid piece, made exactly as the
// opening screen's DK monogram is (gl/monogram.js): the same depth and bevel,
// the ink face and crimson edges, the same opening, lean toward the cursor,
// drift and cursor light. The digits are drawn in the monogram's own
// geometry (data/digits.js). It stands where Lando's 404 has his two 4s and
// helmet, filling the width of his row ([data-lost-stage], pages.css).
import * as THREE from 'three';
import { gsap } from 'gsap';
import { solidGeometry, solidPiece, solidUniforms, createSteer, riseUp, REST, WIDTH } from './monogram.js';
import { notFoundShapes } from '../../data/digits.js';

// The face's distance in front of the piece's middle, in drawing units: half
// the depth plus the bevel (solidGeometry).
const FRONT = 26 / 2 + 4;

export function createLost(engine, stage) {
  if (!stage) return null;
  const { state } = engine;
  const { width: WORD, shapes } = notFoundShapes();

  const geometry = solidGeometry(shapes);
  const uniforms = solidUniforms();
  const solid = solidPiece(geometry, uniforms);
  const scene = new THREE.Scene();
  scene.add(solid.piece);
  const camera = new THREE.PerspectiveCamera(30, 1, 1, 10000);

  const intro = { rx: 0, ry: 0, y: 0, scale: 1, opacity: 0 };
  const steer = createSteer(state);
  let started = false;

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
    },
    intro({ fromLoader = false } = {}) {
      started = true;
      riseUp(intro, uniforms, fromLoader);
    },
    update() {
      const opacity = started ? intro.opacity : 0;
      uniforms.uOpacity.value = opacity;
      layer.visible = opacity > 0.002;
      if (!layer.visible) return;

      const r = stage.getBoundingClientRect();
      const cx = r.left + r.width / 2;
      const cy = r.top + r.height / 2;
      // One drawing unit in pixels, so the face spans the stage. The face
      // sits nearer the camera than the piece's middle, so the piece is drawn
      // that much smaller to land there.
      const unit = r.width / WORD;
      const dist = camera.position.z;
      const scale = (unit * (dist - FRONT * unit)) / dist;
      // The monogram's size in these units, so the light circles and sits as
      // far off as it does for the monogram.
      const size = WIDTH * unit;
      const s = steer.step(cx, cy, size);

      solid.piece.rotation.set(REST.x + intro.rx + s.x, REST.y + intro.ry + s.y, s.z);
      solid.piece.scale.setScalar(scale * intro.scale);
      solid.piece.position.set(cx, -(cy + intro.y - s.lift), 0);
      uniforms.uCursor.value.set(s.light.x, -s.light.y, size * 1.6);
    },
    render(renderer) {
      renderer.clearDepth();
      renderer.render(scene, camera);
      renderer.clearDepth();
    },
    dispose() {
      gsap.killTweensOf([intro, uniforms.uLight, uniforms.uSheen]);
      geometry.dispose();
      solid.dispose();
    },
  };
  return layer;
}
