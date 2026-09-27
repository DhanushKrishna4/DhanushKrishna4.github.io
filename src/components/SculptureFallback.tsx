import { useId, useLayoutEffect, useRef, useState } from 'react';
import { MARK_H, MARK_PATH, MARK_W } from './Mark';
import { sculptureLayout } from '../lib/sculpture-layout';

type Point = [number, number];
type Size = { width: number; height: number; viewport: number; stageHeight: number };
const WORLD_SCALE = 2.8 / MARK_H;
const RED = '#f21840';

// Parse only the original path. In particular, the two counters are never
// approximated, redrawn, or filled by a separate decorative shape.
const contours: Point[][] = (MARK_PATH.match(/M[^Z]+Z/g) ?? []).map(contour => {
  const values = (contour.match(/-?\d+(?:\.\d+)?/g) ?? []).map(Number);
  return Array.from({ length: values.length / 2 }, (_, i) => [values[i * 2], values[i * 2 + 1]]);
});
const areaSign = (points: Point[]) => Math.sign(points.reduce((area, p, i) => {
  const next = points[(i + 1) % points.length];
  return area + p[0] * next[1] - next[0] * p[1];
}, 0));

function inset(points: Point[], distance: number): Point[] {
  const side = areaSign(points);
  return points.map((p, i) => {
    const previous = points[(i + points.length - 1) % points.length];
    const next = points[(i + 1) % points.length];
    const beforeLength = Math.hypot(p[0] - previous[0], p[1] - previous[1]);
    const afterLength = Math.hypot(next[0] - p[0], next[1] - p[1]);
    const a = [side * (previous[1] - p[1]) / beforeLength, side * (p[0] - previous[0]) / beforeLength];
    const b = [side * (p[1] - next[1]) / afterLength, side * (next[0] - p[0]) / afterLength];
    const factor = distance / Math.max(0.01, 1 + a[0] * b[0] + a[1] * b[1]);
    return [p[0] + (a[0] + b[0]) * factor, p[1] + (a[1] + b[1]) * factor];
  });
}

// Match core.ts's assembled camera and XYZ Euler pose without eagerly loading
// Three. This is a perspective projection of the same plates, not a skew of a
// flat logo: its top edge, depth and counters meet the first WebGL frame.
function projection({ width, height, viewport }: Size) {
  const aspect = width / height;
  const { fit, x: offset, y: verticalOffset } = sculptureLayout(viewport, aspect);
  const tangent = Math.tan(31 * Math.PI / 360);
  const cameraZ = Math.max(MARK_W * WORLD_SCALE * fit / (2 * tangent * aspect), 3.7 / (2 * tangent));
  const focal = height / (2 * tangent);
  const a = Math.cos(-0.14), b = Math.sin(-0.14);
  const c = Math.cos(0.34), d = Math.sin(0.34);
  const e = Math.cos(0.04), f = Math.sin(0.04);
  const rotate = (x: number, y: number, z: number) => [
    c * e * x - c * f * y + d * z,
    (a * f + b * e * d) * x + (a * e - b * f * d) * y - b * c * z,
    (b * f - a * e * d) * x + (b * e + a * f * d) * y + a * c * z,
  ];
  const projectWorld = (x: number, y: number, z: number): Point => {
    const p = rotate(x, y, z);
    const scale = focal / (cameraZ - p[2]);
    return [width / 2 + (p[0] + offset) * scale, height / 2 - (p[1] + verticalOffset - 0.06) * scale];
  };
  const point = (p: Point, z: number) => projectWorld((p[0] - MARK_W / 2) * WORLD_SCALE, (MARK_H / 2 - p[1]) * WORLD_SCALE, z);
  const path = (points: Point[], z: number, close = true) => points.map((p, i) => {
    const projected = point(p, z);
    return `${i ? 'L' : 'M'}${projected[0].toFixed(3)},${projected[1].toFixed(3)}`;
  }).join(' ') + (close ? 'Z' : '');
  const compound = (loops: Point[][], z: number) => loops.map(loop => path(loop, z)).join(' ');
  const shade = (p: Point, next: Point, side: number, bevel: boolean) => {
    const length = Math.hypot(next[0] - p[0], next[1] - p[1]);
    const n = rotate(side * (next[1] - p[1]) / length, side * (next[0] - p[0]) / length, bevel ? 0.9 : 0);
    const light = Math.max(0, Math.min(1, (-0.48 * n[0] + 0.70 * n[1] + 0.53 * n[2]) / Math.hypot(...n)));
    const value = Math.round((bevel ? 51 : 24) + light * (bevel ? 147 : 42));
    return `rgb(${value},${value + 2},${value + 7})`;
  };
  return { point, path, compound, projectWorld, shade, pixelsPerWorld: focal / cameraZ };
}

function initialSize(): Size {
  const viewport = typeof window === 'undefined' ? 1440 : window.innerWidth;
  const viewportHeight = typeof window === 'undefined' ? 900 : window.innerHeight;
  return { width: viewport <= 860 ? viewport : Math.min(viewport * 0.92, 940), height: Math.min(viewportHeight * 0.86, 860), viewport, stageHeight: viewportHeight };
}

/** Static counterpart of the assembled sculpture, including its material layers. */
export default function SculptureFallback() {
  const id = `sculpture-${useId().replace(/:/g, '')}`;
  const svg = useRef<SVGSVGElement>(null);
  const solid = useRef<SVGGElement>(null);
  const [size, setSize] = useState(initialSize);
  const ref = (name: string) => `url(#${id}-${name})`;

  useLayoutEffect(() => {
    const element = svg.current;
    if (!element) return;
    const update = () => {
      // clientWidth excludes the hero's animated scale transform. The SVG and
      // canvas then contract together exactly once with their parent panel.
      const width = element.clientWidth;
      const height = element.clientHeight;
      const stageHeight = element.closest('.hero-figure')?.clientHeight ?? height;
      if (!width || !height) return;
      setSize(previous => previous.width === width && previous.height === height && previous.stageHeight === stageHeight && previous.viewport === window.innerWidth
        ? previous : { width, height, stageHeight, viewport: window.innerWidth });
    };
    update();
    const observer = new ResizeObserver(update);
    observer.observe(element);
    window.addEventListener('resize', update, { passive: true });
    return () => { observer.disconnect(); window.removeEventListener('resize', update); };
  }, []);

  useLayoutEffect(() => {
    const wrapper = svg.current?.parentElement;
    const bounds = solid.current?.getBBox();
    if (!wrapper || !bounds) return;
    // Native SVG bounds give the projected solid's centre, including the rear
    // layers but excluding the light spill. Both renderers share this rest pose.
    // Layout sizes deliberately exclude the ancestor's animated scale.
    wrapper.style.setProperty('--sculpture-center-x', `${size.width / 2 - bounds.x - bounds.width / 2}px`);
    wrapper.style.setProperty('--sculpture-center-y', `${size.height - size.stageHeight / 2 - bounds.y - bounds.height / 2}px`);
    wrapper.style.setProperty('--sculpture-stage-height', `${size.stageHeight}px`);
  }, [size]);

  const p = projection(size);
  const frontZ = 0.325;
  const frontInset = contours.map((loop, index) => inset(loop, (index ? -1 : 1) * 0.027 / WORLD_SCALE));
  const polygon = (points: Point[]) => points.map(point => point.map(value => value.toFixed(3)).join(',')).join(' ');
  const circle = (center: Point, radius: number, z: number) => p.path(Array.from({ length: 24 }, (_, i) => {
    const angle = i * Math.PI / 12;
    return [center[0] + Math.cos(angle) * radius / WORLD_SCALE, center[1] + Math.sin(angle) * radius / WORLD_SCALE];
  }), z);

  const plate = (key: string, z: number, depth: number, bevel: number, face: string, signal = false) => {
    const front = z + depth / 2;
    const back = z - depth / 2;
    const edge = Math.min(bevel, depth / 4);
    const cap = contours.map((loop, index) => inset(loop, (index ? -1 : 1) * bevel / WORLD_SCALE));
    return (
      <g key={key}>
        <path d={p.compound(contours, back)} fill="#101117" fillRule="evenodd" />
        {contours.flatMap((loop, index) => loop.map((point, i) => {
          const next = loop[(i + 1) % loop.length];
          const side = areaSign(loop) * (index ? -1 : 1);
          const capPoint = cap[index][i], capNext = cap[index][(i + 1) % loop.length];
          return (
            <g key={`${index}-${i}`}>
              <polygon points={polygon([p.point(point, back), p.point(next, back), p.point(next, front - edge), p.point(point, front - edge)])} fill={signal ? RED : p.shade(point, next, side, false)} />
              <polygon points={polygon([p.point(point, front - edge), p.point(next, front - edge), p.point(capNext, front), p.point(capPoint, front)])} fill={signal ? RED : p.shade(point, next, side, true)} />
            </g>
          );
        }))}
        <path d={p.compound(cap, front)} fill={face} fillRule="evenodd" />
      </g>
    );
  };

  const glowCenter = p.projectWorld(0, -0.9, -0.6);
  const faceDetail = [[[52, 12], [121, 12]], [[18, 138], [93, 138]], [[167, 39], [199, 12]]] as Point[][];
  const screws: Point[] = [[45, 16], [128, 16], [21, 143], [105, 140], [208, 12], [176, 147]];

  return (
    <svg ref={svg} className="sculpture-fallback" viewBox={`0 0 ${size.width} ${size.height}`} aria-hidden="true" focusable="false">
      <defs>
        <linearGradient id={`${id}-face`} x1="0" y1="0" x2="0.72" y2="1">
          <stop offset="0" stopColor="#525156" />
          <stop offset="0.32" stopColor="#434147" />
          <stop offset="0.62" stopColor="#3b3940" />
          <stop offset="1" stopColor="#45424a" />
        </linearGradient>
        <linearGradient id={`${id}-rear`} x1="0" y1="0" x2="0.75" y2="1">
          <stop offset="0" stopColor="#444650" />
          <stop offset="1" stopColor="#262831" />
        </linearGradient>
        <linearGradient id={`${id}-screw`} x1="0" y1="0" x2="0.9" y2="1">
          <stop offset="0" stopColor="#999aa0" />
          <stop offset="0.44" stopColor="#5a5b63" />
          <stop offset="1" stopColor="#383942" />
        </linearGradient>
        <radialGradient id={`${id}-bounce`}>
          <stop offset="0" stopColor={RED} stopOpacity="0.105" />
          <stop offset="0.5" stopColor={RED} stopOpacity="0.027" />
          <stop offset="1" stopColor={RED} stopOpacity="0" />
        </radialGradient>
        <clipPath id={`${id}-face-clip`}>
          <path d={p.compound(frontInset, frontZ)} fillRule="evenodd" clipRule="evenodd" />
        </clipPath>
      </defs>

      <ellipse cx={glowCenter[0]} cy={glowCenter[1]} rx={2.4 * p.pixelsPerWorld} ry={1.05 * p.pixelsPerWorld} fill={ref('bounce')} />
      <g ref={solid} data-sculpture-solid="">
        {plate('rear', -0.24, 0.18, 0.025, ref('rear'))}
        {plate('gasket', -0.127, 0.019, 0.004, ref('rear'), true)}
        {plate('middle', -0.015, 0.10, 0.015, '#292a32')}
        <path d={p.compound(contours, 0.054)} fill="none" stroke={RED} strokeOpacity="0.6" strokeWidth={Math.max(0.45, p.pixelsPerWorld * 0.007)} />
        {plate('front-gasket', 0.131, 0.014, 0.006, '#13151b')}
        {plate('front', 0.24, 0.17, 0.027, ref('face'))}

        <g clipPath={ref('face-clip')}>
          {faceDetail.map((route, i) => <path key={i} d={p.path(route, 0.328, false)} fill="none" stroke="#19181e" strokeOpacity="0.68" strokeWidth={Math.max(0.35, p.pixelsPerWorld * 0.004)} />)}
          {screws.map(center => {
            const angle = (center[0] + center[1]) * 0.011;
            const dx = Math.cos(angle) * 0.016 / WORLD_SCALE;
            const dy = -Math.sin(angle) * 0.016 / WORLD_SCALE;
            return (
              <g key={center.join('-')}>
                <path d={circle(center, 0.044, 0.327)} fill="#17171e" />
                <path d={circle(center, 0.028, 0.333)} fill={ref('screw')} />
                <path d={p.path([[center[0] - dx, center[1] - dy], [center[0] + dx, center[1] + dy]], 0.34, false)} fill="none" stroke="#191a21" strokeWidth={Math.max(0.35, p.pixelsPerWorld * 0.004)} />
              </g>
            );
          })}
        </g>
      </g>
    </svg>
  );
}
