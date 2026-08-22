import { WORDMARK } from '../brand/wordmark';

/**
 * The two-line logotype, drawn rather than typeset.
 *
 * It was typeset until now — Bodoni over Archivo, sized by eye until the two
 * lines came out roughly the same width. That was a decent imitation of the
 * reference site's lockup and it was still an imitation: the letters were a
 * font, the widths were mine, and the K had nothing to do with the monogram's
 * K. This is the drawn mark, and its KRISHNA's K *is* the monogram's K.
 *
 * Two cuts, and picking the wrong one is the mistake this component exists to
 * prevent. The display cut is spaced for size; below about 40px its tracking
 * closes up and the counters start to fill. The small cut is drawn looser with
 * tighter leading for exactly that range, down to a floor of 22px — below which
 * the handoff says drop the wordmark entirely and run the mark alone.
 *
 * Sized by height in CSS with `width: auto`, so the aspect ratio comes from the
 * viewBox and the non-proportional stretching the handoff forbids is not
 * expressible here.
 */
export default function Wordmark({
  cut = 'display',
  label,
  className = '',
}: {
  cut?: 'display' | 'small';
  /* Labelled when it stands alone; decorative when a heading or a link's own
     label already says the name, so a screen reader does not read it twice. */
  label?: string;
  className?: string;
}) {
  const { viewBox, d } = WORDMARK[cut];
  return (
    <svg
      className={`wm ${className}`}
      viewBox={viewBox}
      role={label ? 'img' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      focusable="false"
    >
      <path fill="currentColor" fillRule="evenodd" d={d} />
    </svg>
  );
}
