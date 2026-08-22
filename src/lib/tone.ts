import { ScrollTrigger } from './motion';

/**
 * Keep the fixed bar legible as the page changes ground.
 *
 * The page runs cream, sage, olive, ink and acid. Every section declares what
 * it is with `data-tone`, and whichever one is currently under the bar wins.
 *
 * A trigger per section rather than one scroll listener doing arithmetic: the
 * sections are different heights, some are pinned later, and ScrollTrigger
 * already knows where everything is after a refresh. Reimplementing that with
 * offsetTop reads simpler and is wrong the moment anything pins.
 */
export function initNavTone(): () => void {
  const nav = document.querySelector<HTMLElement>('.nav');
  if (!nav) return () => {};

  const sections = [...document.querySelectorAll<HTMLElement>('[data-tone]')];
  const set = (tone: string) => nav.setAttribute('data-tone', tone);
  set(sections[0]?.dataset.tone ?? 'light');

  /* His bar has two states, and the boundary is not a section — it is the top of
     the page. Measured across his whole scroll: the centre monogram is gone by
     40px and never returns, the wordmark is white from 75px down, and the toggle
     stops being an outline and becomes a filled plate over the same 75px.

     The consequence is the part worth keeping, because it looks like a bug and
     is not: all of that happens while the hero behind it is still paper, so for
     about 150px of scroll his bar is white on white and very nearly invisible.
     It comes back as the ground turns olive underneath it. Waiting for a legible
     moment to switch would be the safer choice and would lose the effect
     entirely — the bar is meant to belong to what is arriving, not to what is
     leaving.

     Its own attribute rather than a second meaning for data-tone: "am I at the
     top" and "what am I sitting on" are different questions with different
     answers, and the two were briefly conflated here, which put the centre mark
     back on every light section further down. */
  /* The bar also SHRINKS, over the same first eighty pixels, and this is the
     part I missed twice — the first time by reading it off frames, the second by
     measuring his controls' boxes once at the top and then reusing those numbers
     for every later sample, which is a way of guaranteeing you cannot see a size
     change. Re-read at each scroll position his bar is:

       scrollY      0     25     50     75    100+
       STORE    118.3   106.0  100.3   98.6   98.5   wide
       height    60.0    53.8   50.9   50.0   50.0
       brand    scale 1.200   1.075  1.018  1.001  1.000

     Every one of those is the same ratio, 0.8333, and his controls carry no
     transform of their own — so it is not a font or a padding change, it is the
     two ends of the bar scaling about their own corners. The right-hand pair
     keeps its right edge (his toggle's right stays at 1423 throughout) and the
     wordmark keeps its top left.

     Eighty pixels, eased out hard: a third of the way through the distance it is
     already 62% of the way through the change. */
  const bar = () => {
    const y = Math.min(1, Math.max(0, window.scrollY / 80));
    nav.style.setProperty('--nav-k', String(1 - (1 - y) ** 2.5));
    nav.setAttribute('data-top', window.scrollY < 40 ? 'true' : 'false');
    /* A second, earlier line, on the root so it is not the bar's private
       business: his next-race card starts leaving on any scroll at all — it is
       already going by 10px, where the bar's own changes do not begin until 40.
       Two thresholds because they are two events, not one. */
    document.documentElement.setAttribute('data-scrolled', window.scrollY < 8 ? 'false' : 'true');
  };
  bar();
  window.addEventListener('scroll', bar, { passive: true });

  const triggers = sections.map((el) =>
    ScrollTrigger.create({
      trigger: el,
      /* The bar is at the very top, so the handover happens when a section's
         top edge reaches it — not when the section enters the viewport. */
      start: 'top 8%',
      end: 'bottom 8%',
      onToggle: (self) => {
        if (self.isActive) set(el.dataset.tone ?? 'light');
      },
    }),
  );

  return () => {
    window.removeEventListener('scroll', bar);
    triggers.forEach((t) => t.kill());
  };
}
