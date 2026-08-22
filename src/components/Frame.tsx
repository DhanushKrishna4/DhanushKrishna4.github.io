import { useEffect, useRef, useState } from 'react';

/**
 * The card outline: a rounded rectangle with a bite out of the bottom-right.
 *
 * His numbers, read off `.helmet-grid-frame.is-base` and converted from his
 * viewBox units to rendered pixels (his 407x411 box draws into a 339x343 card,
 * so everything below is a viewBox figure times 0.83292):
 *
 *   corner radius   7.5   ->  6.25
 *   first arc      23.502 -> 19.58, running 15.31 across and 7.37 down
 *   the diagonal   16.499 -> 13.74 across, 20.695 -> 17.24 down
 *   second arc     22.502 -> 18.74, running 14.65 across and 7.06 down
 *   raised edge   143.671 -> 119.67 of bottom edge held clear of the corner
 *
 * The bite is not a chamfer. It is a step: the bottom edge runs along at full
 * height, lifts through an S — convex, straight, concave — and continues 31.67px
 * higher all the way to the bottom-right corner. On his that raised stretch is
 * where the date sits, outside the frame.
 *
 * Why this is drawn rather than declared: the features are all fixed sizes and
 * the cards are not a fixed shape. His are 339x343, near enough square that he
 * can ship one viewBox and let it scale; ours are 314x402, and the same viewBox
 * under the default `meet` would letterbox, while `none` would stretch every
 * corner into an ellipse and tilt the diagonal. Measuring the box and emitting
 * the path keeps the radii circular and the bite the same shape on a card of any
 * proportion.
 */
const STROKE = 2;
const R = 6.25;
const A1 = { r: 19.58, x: 15.31, y: 7.37 };
const DIAG = { x: 13.74, y: 17.24 };
const A2 = { r: 18.74, x: 14.65, y: 7.06 };
const RAISED = 119.67;
const DROP = A1.y + DIAG.y + A2.y;

const path = (w: number, h: number) => {
  /* Half the stroke, so the line sits inside the box rather than straddling its
     edge and losing a pixel to the card next to it. */
  const i = STROKE / 2;
  const lift = h - i - DROP;
  return [
    `M${i + R} ${i}`,
    `H${w - i - R}`,
    `A${R} ${R} 0 0 1 ${w - i} ${i + R}`,
    `V${lift - R}`,
    `A${R} ${R} 0 0 1 ${w - i - R} ${lift}`,
    /* leftward along the raised stretch, then the step down */
    `H${w - i - RAISED}`,
    `a${A1.r} ${A1.r} 0 0 0 ${-A1.x} ${A1.y}`,
    `l${-DIAG.x} ${DIAG.y}`,
    `a${A2.r} ${A2.r} 0 0 1 ${-A2.x} ${A2.y}`,
    `H${i + R}`,
    `A${R} ${R} 0 0 1 ${i} ${h - i - R}`,
    `V${i + R}`,
    `A${R} ${R} 0 0 1 ${i + R} ${i}`,
    'Z',
  ].join('');
};

export default function Frame() {
  const host = useRef<SVGSVGElement>(null);
  const [box, setBox] = useState<{ w: number; h: number } | null>(null);

  useEffect(() => {
    const card = host.current?.parentElement;
    if (!card) return;
    /* The card is a grid item whose height comes from the tallest card in its
       row, so it changes on reflow and on font load, not only on resize. */
    const ro = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      setBox({ w: Math.round(width), h: Math.round(height) });
    });
    ro.observe(card);
    return () => ro.disconnect();
  }, []);

  return (
    <svg className="frame" ref={host} aria-hidden="true" focusable="false">
      {/* Nothing to draw until the box has been measured — a path built from
          zeroes renders as a smear of arcs in the top-left corner for one
          frame. */}
      {box && box.w > 0 && box.h > DROP + 4 * R && <path d={path(box.w, box.h)} />}
    </svg>
  );
}
