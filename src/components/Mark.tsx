/**
 * The DK monogram.
 *
 * A ligature: one vertical bar closes the bowl of the D and doubles as the stem
 * of the K, so neither letter can be lifted out on its own. The whole form is
 * sheared −12°. Drawn on a 20-unit grid — cap height 160, stroke 34, chamfer
 * 20, every diagonal exactly 45°. See design/dk-monogram-handoff.md.
 *
 * Three things here are load-bearing and none of them are style choices:
 *
 *   `fillRule="evenodd"` is required. The second subpath is the counter of the
 *   D; without it the counter fills and the mark is a solid blob.
 *
 *   The flattened path is used rather than the construction file's
 *   `translate(40,0) skewX(-12)`. They produce identical geometry, but the
 *   handoff warns that some icon pipelines drop transforms, and a mark that
 *   silently un-shears itself in one build target is worse than one that never
 *   sheared. The construction file stays out of the bundle.
 *
 *   Height is set and width follows. The mark is 1.4876:1 and the handoff
 *   forbids non-proportional stretching, so there is no width prop to get wrong.
 *
 * Inline rather than an <img>, so `currentColor` reaches it and the mark takes
 * the tone of whichever ground it is sitting on.
 */

/* Exported so the loader can punch the same geometry out of a mask. One copy of
   the path, one place to change it. */
export const MARK_PATH =
  'M34.01,0 L 138.01,0 L 153.76,20 L 151.21,32 L 190.01,0 L 238.01,0 L 141,80 L 204,160 L 156,160 L 130.8,128 L 128.25,140 L 104,160 L 0,160 Z M57.81,48 L 74.78,34 L 80.78,34 L 61.23,126 L 41.23,126 Z M93.81,48 L 110.78,34 L 116.78,34 L 97.23,126 L 77.23,126 Z';


export const MARK_W = 238.01;
export const MARK_H = 160;
export const MARK_RATIO = MARK_W / MARK_H;

/* The upright construction, before the shear.
   Rendered inside `translate(40,0) skewX(-12)` this is the primary path. The
   handoff is explicit that any animation of the mark must animate the shear on
   this group rather than morph the flattened path, so the loader uses it and
   nothing else does. Its own box is 280 x 200 — the 20-unit grid padding is
   part of the coordinate system, hence the centre at (140,100). */
export const MARK_CONSTRUCTION =
  'M20,20 H124 L144,40 V52 L176,20 H224 L144,100 L224,180 H176 L144,148 V160 L124,180 H20 Z M54,68 L68,54 H74 V146 H54 Z M90,68 L104,54 H110 V146 H90 Z';
export const CONSTRUCTION_CX = 140;
export const CONSTRUCTION_CY = 100;
export const SHEAR = -12;

/**
 * The two slots of the 11, lifted straight out of the mark's own construction.
 *
 * These are subpaths two and three of MARK_CONSTRUCTION — not a copy, not a
 * redraw, the identical coordinates. The loader opens the counter that is
 * already inside the monogram rather than cutting to a separate numeral, so the
 * geometry has to be the same geometry or the aperture would not line up with
 * the mark it comes out of.
 *
 * Kept in the same coordinate system as the construction, which means they take
 * the identical `translate(40,0) skewX(-12)` and sit exactly where the mark's
 * counter sits with no arithmetic on this side at all.
 */
export const SLOT_L = 'M54,68 L68,54 H74 V146 H54 Z';
export const SLOT_R = 'M90,68 L104,54 H110 V146 H90 Z';

/* The gap between the two slots, and the bar they become once it closes.

   The loader shuts the gap by moving the left slot onto the right one rather
   than converging both on the midpoint, so the merged bar is the right slot
   grown leftwards: 70 → 110, centred on 90, 40 wide. The right slot is the one
   nearer the middle of the screen, so anchoring it is the shorter move and
   leaves the least drift for the growth to correct.

   MERGED_W and SLOTS_H are the bar's real dimensions and the loader sizes the
   growth off them. Note that the width is 40 and not 56 — 56 is the span from
   the outer edge of one slot to the outer edge of the other, gap included, and
   the gap is not there by the time any of this matters. */
export const SLOT_GAP = 16;
export const MERGED_CX = 90;
export const MERGED_W = 40;
export const SLOTS_H = 92;

export default function Mark({
  height = 24,
  /* `aria-hidden` when the mark sits next to a logotype that already says the
     name, labelled when it stands alone. Defaulted to decorative because in
     this page it always accompanies the wordmark. */
  label,
  className,
}: {
  height?: number;
  label?: string;
  className?: string;
}) {
  return (
    <svg
      className={className}
      viewBox={`0 0 ${MARK_W} ${MARK_H}`}
      height={height}
      width={height * MARK_RATIO}
      role={label ? 'img' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      focusable="false"
    >
      <path fill="currentColor" fillRule="evenodd" d={MARK_PATH} />
    </svg>
  );
}
