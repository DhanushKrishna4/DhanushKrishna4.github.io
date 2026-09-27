/** Geometry-only checks; no DOM, GPU, browser, or extra dependencies required. */
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import ts from 'typescript';
import * as THREE from 'three';

const markSource = await readFile(new URL('../src/components/Mark.tsx', import.meta.url), 'utf8');
const source = await readFile(new URL('../src/lib/sculpture-geometry.ts', import.meta.url), 'utf8');
const mark = {
  MARK_PATH: markSource.match(/export const MARK_PATH\s*=\s*'([^']+)'/)[1],
  MARK_W: +markSource.match(/export const MARK_W\s*=\s*([\d.]+)/)[1],
  MARK_H: +markSource.match(/export const MARK_H\s*=\s*([\d.]+)/)[1],
};
const dataModule = text => `data:text/javascript;base64,${Buffer.from(text).toString('base64')}`;
const markModule = dataModule(Object.entries(mark).map(([key, value]) =>
  `export const ${key} = ${JSON.stringify(value)};`).join('\n'));
const javascript = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2023 },
}).outputText.replace("'three'", JSON.stringify(import.meta.resolve('three')))
  .replace("'../components/Mark'", JSON.stringify(markModule));
const { MARK_WIDTH, MARK_HEIGHT, markPoint, getMarkContours, createMarkShape,
  createMarkExtrusion, containsMarkPoint } = await import(dataModule(javascript));

const near = (a, b, tolerance = 1e-6) => assert.ok(Math.abs(a - b) <= tolerance, `${a} != ${b}`);
const contours = getMarkContours();
assert.deepEqual(contours.map(points => points.length), [13, 5, 5]);
assert.equal(createMarkShape().holes.length, 2);
near(MARK_HEIGHT, 2.8);
near(MARK_WIDTH / MARK_HEIGHT, mark.MARK_W / mark.MARK_H);

const cross = (a, b, c) => (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x);
const segmentsIntersect = (a, b, c, d) =>
  cross(a, b, c) * cross(a, b, d) < 0 && cross(c, d, a) * cross(c, d, b) < 0;
const edges = contours.flatMap((points, ring) => points.map((point, index) => ({
  a: point, b: points[(index + 1) % points.length], ring, index, length: points.length,
})));
for (let i = 0; i < edges.length; i++) for (let j = i + 1; j < edges.length; j++) {
  const a = edges[i], b = edges[j];
  if (a.ring === b.ring && (Math.abs(a.index - b.index) === 1 ||
      Math.abs(a.index - b.index) === a.length - 1)) continue;
  assert.equal(segmentsIntersect(a.a, a.b, b.a, b.b), false, 'Contours must not intersect');
}

for (const [x, y, expected] of [[20, 120, true], [130, 80, true],
  [60, 80, false], [95, 80, false], [230, 150, false], [0, 0, false]]) {
  const point = markPoint(x, y);
  assert.equal(containsMarkPoint(point.x, point.y), expected, `SVG point ${x},${y}`);
}
assert.equal(containsMarkPoint(...contours[0][0].toArray()), true);
assert.equal(containsMarkPoint(...contours[1][0].toArray()), false);
assert.equal(containsMarkPoint(NaN, 0), false);
const copiedContours = getMarkContours(true);
assert.equal(copiedContours[0].length, 14);
copiedContours[0][0].x = 100;
assert.notEqual(getMarkContours()[0][0].x, 100, 'Exported contours must not mutate the source');

const expectedArea = Math.abs(THREE.ShapeUtils.area(contours[0])) -
  contours.slice(1).reduce((sum, points) => sum + Math.abs(THREE.ShapeUtils.area(points)), 0);
const triangleA = new THREE.Vector3(), triangleB = new THREE.Vector3(), triangleC = new THREE.Vector3();
const triangleSignatures = geometry => {
  const attributes = Object.values(geometry.attributes);
  const triangles = [];
  for (let i = 0; i < geometry.getAttribute('position').count; i += 3) {
    // Preserve winding and per-vertex normals/UVs, while allowing group order
    // to change for batching the three finishes into three draw calls.
    triangles.push(attributes.map(attribute => Array.from(attribute.array.slice(
      i * attribute.itemSize, (i + 3) * attribute.itemSize)).join(',')).join('|'));
  }
  return triangles.sort();
};
const surfaceArea = geometry => {
  const positions = geometry.getAttribute('position');
  let area = 0;
  for (let i = 0; i < positions.count; i += 3) {
    const a = new THREE.Vector3().fromBufferAttribute(positions, i);
    const b = new THREE.Vector3().fromBufferAttribute(positions, i + 1).sub(a);
    const c = new THREE.Vector3().fromBufferAttribute(positions, i + 2).sub(a);
    area += b.cross(c).length() / 2;
  }
  return area;
};
for (const [depth, bevel] of [[0.28, 0], [0.28, 0.025], [0.024, 0.01], [0.5, 0.05]]) {
  const geometry = createMarkExtrusion(depth, bevel);
  const { min, max } = geometry.boundingBox;
  near(max.x - min.x, MARK_WIDTH);
  near(max.y - min.y, MARK_HEIGHT);
  near(max.z - min.z, depth);
  near(max.z + min.z, 0);
  assert.deepEqual(geometry.groups.map(group => group.materialIndex), [0, 1]);
  const positions = geometry.getAttribute('position');
  const normals = geometry.getAttribute('normal');
  const meshEdges = [];
  const weldedVertices = new Map();
  let frontCapArea = 0;
  const key = v => [v.x, v.y, v.z].map(value => Math.round(value * 1e7)).join(',');
  for (let i = 0; i < positions.count; i += 3) {
    triangleA.fromBufferAttribute(positions, i);
    triangleB.fromBufferAttribute(positions, i + 1);
    triangleC.fromBufferAttribute(positions, i + 2);
    const ab = triangleB.clone().sub(triangleA);
    const ac = triangleC.clone().sub(triangleA);
    const normal = ab.cross(ac);
    assert.ok(normal.length() > 1e-10, 'No degenerate triangles');
    const triangle = [triangleA, triangleB, triangleC];
    for (let v = 0; v < 3; v++) {
      const point = triangle[v];
      assert.ok(point.toArray().every(Number.isFinite));
      const faceNormal = new THREE.Vector3().fromBufferAttribute(normals, i + v);
      near(faceNormal.length(), 1);
      assert.ok(faceNormal.dot(normal) > 0, 'Normals must follow the triangle winding');
      weldedVertices.set(key(point), point.clone());
      meshEdges.push([point.clone(), triangle[(v + 1) % 3].clone()]);
    }
    if (i < geometry.groups[0].count && triangleA.z > 0) {
      assert.ok(normal.z > 0, 'Front cap must face outwards');
      frontCapArea += normal.length() / 2;
      const center = triangleA.clone().add(triangleB).add(triangleC).divideScalar(3);
      assert.equal(containsMarkPoint(center.x, center.y), true, 'Caps must not fill either counter');
    }
  }
  // Earcut can join aligned counter edges with a longer triangle edge. Split
  // those T junctions before counting edge coverage, so coincident segments are
  // compared geometrically instead of mistaking the triangulation for a crack.
  const weldedEdges = new Map();
  for (const [a, b] of meshEdges) {
    const direction = b.clone().sub(a);
    const lengthSquared = direction.lengthSq();
    const splits = [...weldedVertices.values()].flatMap(point => {
      const relative = point.clone().sub(a);
      const t = relative.dot(direction) / lengthSquared;
      if (t < -1e-7 || t > 1 + 1e-7) return [];
      if (relative.addScaledVector(direction, -t).length() > 2e-7) return [];
      return [{ point, t }];
    }).sort((a, b) => a.t - b.t);
    for (let i = 1; i < splits.length; i++) {
      const edge = [key(splits[i - 1].point), key(splits[i].point)].sort().join('|');
      weldedEdges.set(edge, (weldedEdges.get(edge) ?? 0) + 1);
    }
  }
  assert.ok([...weldedEdges.values()].every(count => count === 2),
    `Solid must be watertight at depth ${depth}, bevel ${bevel}: ${JSON.stringify([...weldedEdges.entries()].filter(([,n])=>n!==2).slice(0,12))}`);
  if (bevel === 0) near(frontCapArea, expectedArea);
  else assert.ok(frontCapArea < expectedArea, 'Bevel must cut inward from the exact silhouette');

  const split = createMarkExtrusion(depth, bevel, true);
  assert.deepEqual(triangleSignatures(split), triangleSignatures(geometry),
    'Separating finishes must preserve every triangle, normal and UV');
  assert.ok(split.boundingBox.equals(geometry.boundingBox), 'Finish groups must not change dimensions');
  near(surfaceArea(split), surfaceArea(geometry), 1e-12);
  assert.deepEqual(split.groups.map(group => group.materialIndex), bevel ? [0, 1, 2] : [0, 2]);
  const splitNormals = split.getAttribute('normal');
  let groupEnd = 0;
  split.groups.forEach(group => {
    assert.equal(group.start, groupEnd, 'Finish groups must cover the geometry without gaps');
    assert.equal(group.count % 3, 0);
    groupEnd += group.count;
    for (let i = group.start; i < groupEnd; i++) {
      const normalZ = Math.abs(splitNormals.getZ(i));
      if (group.materialIndex === 0) near(normalZ, 1);
      else if (group.materialIndex === 1) assert.ok(normalZ > 1e-6 && normalZ < 1 - 1e-6);
      else near(normalZ, 0);
    }
  });
  assert.equal(groupEnd, split.getAttribute('position').count);
  assert.equal(split.groups.find(group => group.materialIndex === 2).count,
    contours.reduce((sum, contour) => sum + contour.length, 0) * 6,
    'Exactly the two broad sidewall triangles per polygon edge use the edge finish');
  split.dispose();
  geometry.dispose();
}
assert.throws(() => createMarkExtrusion(0), RangeError);
assert.throws(() => createMarkExtrusion(0.2, -1), RangeError);
console.log('DK geometry verified: exact logo ratio, separate counters, nonintersecting contours, cap area, watertight solids, outward unit normals, centred total depth, and optional wall finish with unchanged topology and surface area.');
