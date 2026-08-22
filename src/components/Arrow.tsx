/* The return arrow, shared: the footer's mail pill and the work section's
   GitHub button both carry it, and both run the same draw on hover.

His icon fills 64% of its 14px box at a 2.50px stroke; ours filled 57% at
   2.25. The viewBox is tightened rather than the path rescaled — same effect,
   one number, and it grows the stroke with the drawing instead of leaving it
   behind. Centred on the glyph's own middle, not the box's.

   The two pathLengths are the whole trick, and they are not 1 each.

   His arrow is ONE continuous stroke as far as the animation is concerned: it
   erases from the tail's free bottom end, up round the bend, along the top, and
   the head goes last — then it draws back in that same order, bottom end first
   and head last again. Not a rewind. It never runs backwards at any point.

   Ours has to be two subpaths, because the chevron branches off the line and a
   single stroke could only reach one of its two arms without doubling back. So
   the two are put on ONE shared ruler instead. pathLength lets each path declare
   how long it should be considered, so the tail is declared 71 and the head 29
   out of a combined 100, in proportion to their real arc lengths (20.86 and
   8.50). A dash pattern written in those shared units then means the same thing
   to both, and offsetting the head by exactly 71 — the tail's share — makes it
   behave as the last 29 units of a single 100-unit path. Same sweep, one stroke,
   two elements.

   Written bottom-end first, which is the direction the sweep travels. */
export default function Arrow() {
  return (
  <svg width="14" height="14" viewBox="0.46 1.11 17.78 17.78" fill="none" aria-hidden="true">
    <path
      className="ct-arrow-tail"
      d="M11.8 14.4H6.4C3.5 14.4 3.5 8.4 6.4 8.4H13.6"
      pathLength="71"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      className="ct-arrow-head"
      d="M11.1 5.6L14.3 8.4L11.1 11.2"
      pathLength="29"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
  );
}
