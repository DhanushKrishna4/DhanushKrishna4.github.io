/**
 * The rolling label — every one on the site, nav button included.
 *
 * One clipped column per letter, each holding two copies of its own character,
 * each starting a beat after the one before it. Rolling the word as a single
 * block is visibly not the gesture: in his frames the letters sit at different
 * heights mid-roll, which only happens if each is on its own clock.
 *
 * His footer links do exactly this — measured on hover, the characters travel
 * together but out of step: -11.5, -9.7, -7.6, -5.4 at 80ms, all arriving at
 * -22.2, which is one font-size. And the colour never changes at any point in
 * it, which is the part ours was getting wrong.
 *
 * The visible text is aria-hidden, so whatever uses this has to carry the label
 * itself — a screen reader should never be handed a tree of single characters.
 *
 * The beat is a fixed step PER LETTER and lives in --roll-step, one place, so a
 * long label takes longer than a short one. It was briefly a fixed total spread
 * divided across the word, which is not the same thing: that makes every label
 * finish together whatever its length, and the per-letter beat came out
 * anywhere between 8.6ms on the email address and 60ms on "Work" — a slower
 * beat on the shorter word. Only six-letter labels matched the nav button,
 * which is how the two drifted without looking wrong.
 */
export default function Roll({ children, cover }: { children: string; cover?: boolean }) {
  return (
    <span className={cover ? 'roll rv' : 'roll'} aria-hidden="true">
      {[...children].map((ch, i) => (
        <span className="rl" key={i} style={{ '--i': i } as React.CSSProperties}>
          {/* A real space collapses inside an inline-block, which closes the gap
              between words and turns "Track Record" into one. */}
          <span>{ch === ' ' ? '\u00A0' : ch}</span>
          <span>{ch === ' ' ? '\u00A0' : ch}</span>
        </span>
      ))}
      {/* The block the scroll reveal wipes away, opted into rather than always
          present: the nav button uses this same component and is not part of any
          cascade. It is absolutely positioned, so it is out of the flex flow and
          adds no column of its own. */}
      {cover && <span className="rv-b" />}
    </span>
  );
}
