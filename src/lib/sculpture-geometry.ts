import * as THREE from 'three';
import { MARK_H, MARK_PATH, MARK_W } from '../components/Mark';

/** The sculpture uses the same coordinates and aspect ratio as every DK mark. */
export const MARK_HEIGHT = 2.8;
export const MARK_WIDTH = MARK_HEIGHT * MARK_W / MARK_H;

const scale = MARK_HEIGHT / MARK_H;

/** Convert the mark's SVG coordinates to a centred, upright world coordinate. */
export function markPoint(x: number, y: number, z = 0): THREE.Vector3 {
  return new THREE.Vector3((x - MARK_W / 2) * scale, (MARK_H / 2 - y) * scale, z);
}

function readContours(): THREE.Vector2[][] {
  const tokens = MARK_PATH.match(/[A-Za-z]|[-+]?(?:\d*\.)?\d+(?:[eE][-+]?\d+)?/g) ?? [];
  const contours: THREE.Vector2[][] = [];
  let current: THREE.Vector2[] | undefined;

  for (let i = 0; i < tokens.length;) {
    const command = tokens[i++];
    if (command === 'Z') {
      if (!current || current.length < 3) throw new Error('Invalid closed DK contour');
      contours.push(current);
      current = undefined;
      continue;
    }
    if (command !== 'M' && command !== 'L') {
      throw new Error(`Unsupported DK path command: ${command}`);
    }
    const x = Number(tokens[i++]);
    const y = Number(tokens[i++]);
    if (!Number.isFinite(x) || !Number.isFinite(y)) throw new Error('Invalid DK path coordinate');
    if (command === 'M') {
      if (current) throw new Error('Unclosed DK contour');
      current = [];
    }
    if (!current) throw new Error('DK contour must start with M');
    const point = markPoint(x, y);
    current.push(new THREE.Vector2(point.x, point.y));
  }

  if (current || contours.length !== 3) throw new Error('DK mark must have one outline and two counters');

  // Extrusion expects an outer clockwise contour and anticlockwise counters.
  // Reversing traversal does not alter any logo coordinates.
  contours.forEach((contour, index) => {
    if (THREE.ShapeUtils.isClockWise(contour) !== (index === 0)) contour.reverse();
  });
  return contours;
}

const contours = readContours();

/** Exact polygon vertices: exterior first, then both counters. Safe to mutate. */
export function getMarkContours(closed = false): THREE.Vector2[][] {
  return contours.map(contour => {
    const points = contour.map(point => point.clone());
    if (closed) points.push(points[0].clone());
    return points;
  });
}

export function createMarkShape(): THREE.Shape {
  const paths = contours.map(contour => {
    const path = new THREE.Path();
    path.moveTo(contour[0].x, contour[0].y);
    contour.slice(1).forEach(point => path.lineTo(point.x, point.y));
    path.closePath();
    return path;
  });
  const shape = new THREE.Shape();
  shape.curves = paths[0].curves;
  shape.holes = paths.slice(1);
  return shape;
}

/**
 * A machined solid with cap material 0 and wall/bevel material 1. Passing
 * `splitWalls` moves only the straight vertical walls to material 2, allowing
 * a dark edge finish independently of the polished bevels.
 * `depth` includes both bevels, keeping stacked layers easy to place accurately.
 * The bevel cuts inward: the maximum silhouette remains the exact logo rather
 * than growing outside its outline or narrowing its two open counters.
 */
export function createMarkExtrusion(depth: number, bevel = 0.025, splitWalls = false): THREE.ExtrudeGeometry {
  if (!Number.isFinite(depth) || depth <= 0) throw new RangeError('Sculpture depth must be positive');
  if (!Number.isFinite(bevel) || bevel < 0 || bevel > 0.05) {
    throw new RangeError('Sculpture bevel must be between 0 and 0.05 world units');
  }
  const thickness = Math.min(bevel, depth / 4);
  const bodyDepth = depth - 2 * thickness;
  const geometry = new THREE.ExtrudeGeometry(createMarkShape(), {
    depth: bodyDepth,
    steps: 1,
    curveSegments: 1,
    bevelEnabled: bevel > 0,
    bevelSegments: 3,
    bevelThickness: thickness,
    bevelSize: bevel,
    bevelOffset: -bevel,
  });
  // Three of the exact outline points are collinear. Earcut can retain their
  // zero-area cap triangle; Float32 conversion turns it into a tiny sliver.
  // Remove that triangle without moving any outline or counter coordinates.
  const positions = geometry.getAttribute('position');
  const normals = geometry.getAttribute('normal');
  const batches: number[][] = splitWalls ? [[], [], []] : [[], []];
  const a = new THREE.Vector3();
  const b = new THREE.Vector3();
  const c = new THREE.Vector3();
  geometry.groups.forEach(group => {
    for (let i = group.start; i < group.start + group.count; i += 3) {
      if (group.materialIndex === 0) {
        a.fromBufferAttribute(positions, i);
        b.fromBufferAttribute(positions, i + 1).sub(a);
        c.fromBufferAttribute(positions, i + 2).sub(a);
        if (b.cross(c).lengthSq() < 1e-14) continue;
      }
      let material = group.materialIndex ?? 0;
      if (splitWalls && material === 1 &&
          Math.abs(normals.getZ(i)) < 1e-6 &&
          Math.abs(normals.getZ(i + 1)) < 1e-6 &&
          Math.abs(normals.getZ(i + 2)) < 1e-6) material = 2;
      batches[material].push(i, i + 1, i + 2);
    }
  });
  // Batch each finish once instead of introducing a draw call per polygon.
  // Only triangle order changes; positions, normals and UVs stay paired.
  const retained = batches.flat();
  geometry.clearGroups();
  let start = 0;
  batches.forEach((vertices, material) => {
    if (vertices.length) geometry.addGroup(start, vertices.length, material);
    start += vertices.length;
  });
  for (const [name, attribute] of Object.entries(geometry.attributes)) {
    const filtered = new Float32Array(retained.length * attribute.itemSize);
    retained.forEach((source, target) => {
      for (let component = 0; component < attribute.itemSize; component++) {
        filtered[target * attribute.itemSize + component] =
          attribute.array[source * attribute.itemSize + component];
      }
    });
    geometry.setAttribute(name, new THREE.BufferAttribute(filtered, attribute.itemSize));
  }
  geometry.translate(0, 0, -bodyDepth / 2);
  geometry.computeBoundingBox();
  geometry.computeBoundingSphere();
  return geometry;
}

/** Includes the outside boundary, excludes the two counters and their edges. */
export function containsMarkPoint(x: number, y: number): boolean {
  if (!Number.isFinite(x) || !Number.isFinite(y)) return false;
  const inside = (contour: THREE.Vector2[]) => {
    let contained = false;
    for (let i = 0, j = contour.length - 1; i < contour.length; j = i++) {
      const a = contour[j];
      const b = contour[i];
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const cross = (x - a.x) * dy - (y - a.y) * dx;
      if (Math.abs(cross) < 1e-10 &&
          x >= Math.min(a.x, b.x) - 1e-10 && x <= Math.max(a.x, b.x) + 1e-10 &&
          y >= Math.min(a.y, b.y) - 1e-10 && y <= Math.max(a.y, b.y) + 1e-10) return true;
      if ((a.y > y) !== (b.y > y) && x < dx * (y - a.y) / dy + a.x) contained = !contained;
    }
    return contained;
  };
  return inside(contours[0]) && !contours.slice(1).some(inside);
}
