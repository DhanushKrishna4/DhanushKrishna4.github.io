import { gsap, ScrollTrigger, reduced } from './motion';

/**
 * His line reveal, in one place.
 *
 * The line is clipped from the right and a solid block sits over it, and what
 * you watch is the block leaving. The clip opening from the left makes the block
 * appear to grow out of nothing, and then the block's own left edge overtakes it
 * and the words come out behind. One wipe, two elements.
 *
 * His three numbers: the clip and the block are the same length, and the block
 * starts at LINE/2 — halfway through the clip — which is what makes the block
 * look like the leading edge of one wipe rather than two animations that happen
 * to overlap.
 *
 * Two ways to fire it, and his site uses BOTH, which is the thing worth knowing:
 *
 *   rows    each line on its own trigger, at the same threshold. The lines then
 *           arrive as you scroll past them, and anything level with anything
 *           else arrives with it — which is why his two footer columns land in
 *           pairs without a line of code pairing them.
 *
 *   groups  one trigger, lines staggered behind it.
 *
 * Measured on his, by stepping the page down and recording where each line sat
 * in the window the moment its clip opened. Every footer row and both lines of
 * his HELMETS heading fire between 0.888 and 0.897 — a threshold each. His
 * footer HEADLINE is the exception: its second line fires 12px of scroll after
 * the first while sitting at 0.956, far below the threshold, which only a
 * stagger can do.
 *
 * once, so it never replays and never runs backwards on the way up. A
 * toggleActions string would re-fire it on the way back down.
 *
 * The start state lives in CSS — see .rv — so the first paint is already
 * covered. Writing it from here shows one frame of finished text, which on a
 * reveal is the whole surprise given away. The cost is that CSS has to be the
 * thing that un-hides it for reduced motion too, and this function still sets
 * both explicitly in case it is called on something CSS has not covered.
 */
export const LINE = 0.6;
export const BLOCK = 0.6;
export const STAGGER = 0.15;

type Group = { at: Element; lines: HTMLElement[] };

export function wipeLines(spec: { rows?: HTMLElement[]; groups?: Group[] }): () => void {
  const rows = spec.rows ?? [];
  const groups = spec.groups ?? [];
  const all = [...rows, ...groups.flatMap((g) => g.lines)];
  if (!all.length) return () => {};

  const blocks = all.map((l) => l.querySelector('.rv-b')).filter(Boolean) as Element[];

  if (reduced()) {
    gsap.set(all, { clipPath: 'inset(0 0% 0 0)' });
    if (blocks.length) gsap.set(blocks, { scaleX: 0 });
    return () => {};
  }

  const wipe = (line: HTMLElement, tl: gsap.core.Timeline, at: number) => {
    tl.to(line, { clipPath: 'inset(0 0% 0 0)', duration: LINE, ease: 'power2.out' }, at);
    const block = line.querySelector('.rv-b');
    if (block) tl.to(block, { scaleX: 0, duration: BLOCK, ease: 'power2.inOut' }, at + LINE / 2);
  };

  const triggers: ScrollTrigger[] = [];
  const tls: gsap.core.Timeline[] = [];
  const fire = (trigger: Element, build: (tl: gsap.core.Timeline) => void) => {
    const tl = gsap.timeline({ paused: true });
    build(tl);
    tls.push(tl);
    triggers.push(
      ScrollTrigger.create({ trigger, start: 'top 90%', once: true, onEnter: () => tl.play() }),
    );
  };

  for (const g of groups) fire(g.at, (tl) => g.lines.forEach((l, i) => wipe(l, tl, i * STAGGER)));
  for (const line of rows) fire(line, (tl) => wipe(line, tl, 0));

  return () => {
    triggers.forEach((t) => t.kill());
    tls.forEach((t) => t.kill());
  };
}
