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

  /* The canvas, which is the only thing iOS has to colour the status bar
     with. It paints nothing you can see inside the page — every section
     draws its own ground over it — so this exists purely for the strip
     above the page and the strip below it. Nailed to --paper by
     body.is-ready, that strip stayed one fixed cream no matter which
     section was under it. The reference moves his with the section, and
     that is the entire difference. */
  /* The colour under the top of the window, resolved against the elements that
     actually PAINT a ground rather than the sections that sit on them. That
     distinction is the whole difficulty here and it cost several passes:

       .ground-olive   one wrapper painting the olive for the hero, the marquee
                       and the statement together — three sections, one ground
       .ground-light   a FIXED paper canvas behind about and record, which is
                       not an ancestor of either, so it can only be read directly
       #work, .ct      the two that really do paint their own

     Asked of elementFromPoint rather than computed from rectangles. The rect
     version agreed with the screen at 12 of 16 scroll positions and disagreed at
     four, every one of them over a pinned or slides-over section: those are held
     by transforms while their document rects say something else, so it reported
     ink over the work cards where the screen was plainly sage. Pins, transforms
     and stacking order are the browser's answer here, not a model of it.

     Written as an inline colour rather than an attribute because the light run
     is not a fixed token — record moves that canvas — so it has to be read at
     the moment it is needed.

     Three x positions: the centre one can land on a child of the bar that has
     taken its pointer-events back. */
  const lightGround = document.querySelector<HTMLElement>('.ground-light');
  const ground = () => {
    let color = '';
    for (const fx of [0.5, 0.06, 0.94]) {
      const hit = document.elementFromPoint(window.innerWidth * fx, 1);
      const el = hit?.closest<HTMLElement>('[data-ground]');
      const name = el && el !== document.body ? el.dataset.ground : undefined;
      if (!name) continue;
      color =
        name === 'light' && lightGround
          ? getComputedStyle(lightGround).backgroundColor
          : getComputedStyle(document.documentElement).getPropertyValue(`--${name}`).trim();
      if (color) break;
    }
    if (color && document.body.style.backgroundColor !== color) {
      document.body.style.backgroundColor = color;
    }
  };

  /* One more pass on the next frame. ground() runs from the scroll handler, and
     the hero rewrites its own data-ground from a ScrollTrigger onUpdate that can
     land later in the same frame — so the last scroll event of a gesture could
     leave the canvas one state behind with nothing coming to correct it.
     Flagged so a fast scroll queues one, not hundreds. */
  let queued = false;
  const groundSoon = () => {
    if (queued) return;
    queued = true;
    requestAnimationFrame(() => {
      queued = false;
      ground();
    });
  };
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
    ground();
    groundSoon();
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
