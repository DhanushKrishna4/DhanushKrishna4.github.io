import { useEffect, useRef } from 'react';
import { gsap } from '../lib/motion';
import { wipeLines } from '../lib/wipe';
import { SITE, SOCIALS, NAV } from '../data/site';
import Contours from './Contours';
import Mark from './Mark';
import Roll from './Roll';
import Arrow from './Arrow';

/**
 * The sign-off, built on his footer rather than beside it.
 *
 * His inverts the page one last time: the accent becomes the GROUND, and the
 * dark that has carried most of the site is reduced to a single card floating
 * on it. A whole screen of accent used exactly once and last is what makes a
 * one-accent palette read as a decision rather than a shortage — and putting
 * the dark inside it, as an object, is what stops that screen being a slab.
 *
 * The card's outline is the piece worth having. Two features, both his, read
 * off the 1688x896 mask he ships and drawn at whatever size the card is:
 *
 *   a TAB raised out of the top edge, centred: 43.5 units proud, 185.6 flat
 *   across the top, with arc-line-arc shoulders either side
 *
 *   a TRAY dropped out of the bottom edge: 30.5 units deep, running most of the
 *   width and leaving both bottom corners standing proud
 *
 * At his 1440 rendering those are 36px and 155px and 25px. They are not written
 * as pixels here, because they are not pixels — see the note on the path.
 *
 * The tray is not decoration. The raised corners either side of it are the only
 * place on his footer where the accent ground reaches the bottom of the window,
 * and that is exactly where he puts his copyright and his legal links. The
 * shape exists to make room for them.
 */

/* His outline, in the units of the mask he ships — 1688 x 896 — rebuilt here as
   a path rather than as his file. Every number below is a control point read off
   it.

   Scaled to the card rather than frozen in pixels, which is the correction. The
   first version fixed the radius at 25 and the tab at 155 with a note arguing
   that a tab cut to hold a monogram should not grow with the window. That
   argument is wrong and the screen says so: his mask is stretched, so his
   corners and tab scale with the card, and at a 2000px window ours sat at
   radius 25 against his 33 and a tab of 155 against his 206. Fixed features on
   a card that grows do not read as restraint, they read as a smaller shape.

   x and y scale independently, as a stretched mask does. The aspect is locked
   to 1688/896 so they normally agree, and they part company only on narrow
   screens where the content makes the card taller than the ratio — which is
   also what would happen to his. */
const VB_W = 1688;
const VB_H = 896;
/* Where the tab tops out and how deep the tray cuts, in the same units. The
   card's padding and the bottom bar's height are derived from these at runtime
   so the three can never drift apart. */
const VB_TAB = 43.5;
const VB_TRAY = 30.5;

const SHAPE: (string | number)[] = [
  'M', 0, 73.5,
  'C', 0, 56.9315, 13.4315, 43.5, 30, 43.5,
  'H', 641.409,
  'C', 665.549, 43.5, 688.773, 34.2581, 706.312, 17.6719,
  'C', 718.313, 6.32341, 734.203, 0, 750.72, 0,
  'H', 936.302,
  'C', 954.204, 0, 971.543, 6.2503, 985.328, 17.6719,
  'C', 1005.47, 34.365, 1030.82, 43.5, 1056.98, 43.5,
  'H', 1658,
  'C', 1674.57, 43.5, 1688, 56.9315, 1688, 73.5,
  'V', 835.5,
  'C', 1688, 852.069, 1674.57, 865.5, 1658, 865.5,
  'H', 1499.48,
  'C', 1492.09, 865.5, 1484.96, 868.231, 1479.45, 873.169,
  'L', 1462.55, 888.331,
  'C', 1457.04, 893.269, 1449.91, 896, 1442.52, 896,
  'H', 302.72,
  'C', 294.59, 896, 286.809, 892.7, 281.157, 886.857,
  'L', 269.343, 874.643,
  'C', 263.691, 868.8, 255.91, 865.5, 247.78, 865.5,
  'H', 30,
  'C', 13.4315, 865.5, 0, 852.069, 0, 835.5,
  'V', 73.5,
  'Z',
];

const FLAT = () => window.innerWidth <= 620;

/* The phone card is built in PIXELS, not by scaling the mask.
 *
 * card() scales x by w/1688 and y by h/865.7, and on a phone those disagree by
 * more than three to one — 0.216 against 0.672 at 365x582. Every curve in the
 * path is stretched by that ratio, so a 30-unit corner comes out 6.5px wide and
 * 20px tall: an ellipse where his is a circle. Measured against his at 393:
 *
 *   corner   his settles in 12px across and drops 10 — ours 6 across, 15 down
 *   tray     his 14px deep — ours 21
 *   tab      his 77 x 9 — ours 78 x 9, the one feature that matched
 *
 * The tab matched only because it was hand-fitted to his earlier. Everything
 * that was not hand-fitted is stretched, which is what reads as the wrong angle
 * and the wrong rounding.
 *
 * So the features are stated at his size and scaled by ONE factor, w/365, which
 * keeps a circle a circle at any phone width. The straight edges take up the
 * slack in height, exactly as his do. Desktop still uses the mask — there the
 * two scales agree, and it is right already. */
const FLAT_REF_W = 365;
const FLAT_R = 12;
const FLAT_TAB_W = 87;
const FLAT_TAB_D = 9;
const FLAT_TRAY_W = 264;
const FLAT_TRAY_D = 14;

/* His shoulders, normalised off the mask's own control points so the curvature
   is his and not an approximation of it. u runs along the shoulder, v is the
   height gained (tab) or the depth lost (tray), both 0 at the straight edge and
   1 at the apex or floor. A first pass fitted a single cubic by eye and it came
   out visibly steeper than his — 8px of rise where he has 6 — which narrowed the
   tab to 69px against his 77. These are read, not fitted.

   Tab: two cubics. Tray: cubic, line, cubic — the flat in the middle is his. */
const TAB_SH: [number, number][] = [
  [0.2208, 0], [0.4333, 0.2125], [0.5937, 0.5937],
  [0.7035, 0.8546], [0.8489, 1], [1, 1],
];
const TRAY_SH: [number, number][] = [
  [0.1297, 0], [0.2549, 0.0895], [0.3517, 0.2514],
  [0.6483, 0.7486],
  [0.7451, 0.9105], [0.8703, 1], [1, 1],
];
/* Both shoulders keep his share of the whole feature, so they grow with it. */
const TAB_SH_FRAC = 0.263;
const TRAY_SH_FRAC = 0.0455;
/* Circular-arc approximation for a cubic — the corner would otherwise need an
   A command, and the whole path is cubics already. */
const KAPPA = 0.5523;

const flatCard = (w: number, h: number) => {
  const k = w / FLAT_REF_W;
  const r = FLAT_R * k;
  const c = r * KAPPA;
  const tabW = FLAT_TAB_W * k;
  const tabD = FLAT_TAB_D * k;
  const tabSh = tabW * TAB_SH_FRAC;
  const trayW = FLAT_TRAY_W * k;
  const trayD = FLAT_TRAY_D * k;
  const traySh = trayW * TRAY_SH_FRAC;
  const top = tabD;
  const bot = h - trayD;
  const tabA = (w - tabW) / 2;
  const tabB = tabA + tabW;
  const trayA = (w - trayW) / 2;
  const trayB = trayA + trayW;
  const n = (v: number) => Math.round(v * 100) / 100;

  /* Left shoulder reads u forwards from the outer edge; the right one reads the
     same list backwards, which mirrors it exactly rather than re-deriving it. */
  const tx = (u: number) => tabA + u * tabSh;
  const txm = (u: number) => tabB - u * tabSh;
  const ty = (v: number) => top - v * tabD;
  const yx = (u: number) => trayB - u * traySh;
  const yxm = (u: number) => trayA + u * traySh;
  const yy = (v: number) => bot + v * trayD;
  const C = (p: string[]) => `C ${p.join(' ')}`;
  const pt = (x: number, y: number) => `${n(x)} ${n(y)}`;

  return [
    `M 0 ${n(top + r)}`,
    C([pt(0, top + r - c), pt(r - c, top), pt(r, top)]),
    `L ${pt(tabA, top)}`,
    C([0, 1, 2].map((i) => pt(tx(TAB_SH[i][0]), ty(TAB_SH[i][1])))),
    C([3, 4, 5].map((i) => pt(tx(TAB_SH[i][0]), ty(TAB_SH[i][1])))),
    `L ${pt(tabB - tabSh, 0)}`,
    C([4, 3, 2].map((i) => pt(txm(TAB_SH[i][0]), ty(TAB_SH[i][1])))),
    C([1, 0].map((i) => pt(txm(TAB_SH[i][0]), ty(TAB_SH[i][1]))).concat(pt(tabB, top))),
    `L ${pt(w - r, top)}`,
    C([pt(w - r + c, top), pt(w, top + r - c), pt(w, top + r)]),
    `L ${pt(w, bot - r)}`,
    C([pt(w, bot - r + c), pt(w - r + c, bot), pt(w - r, bot)]),
    `L ${pt(trayB, bot)}`,
    C([0, 1, 2].map((i) => pt(yx(TRAY_SH[i][0]), yy(TRAY_SH[i][1])))),
    `L ${pt(yx(TRAY_SH[3][0]), yy(TRAY_SH[3][1]))}`,
    C([4, 5, 6].map((i) => pt(yx(TRAY_SH[i][0]), yy(TRAY_SH[i][1])))),
    `L ${pt(trayA + traySh, h)}`,
    C([5, 4, 3].map((i) => pt(yxm(TRAY_SH[i][0]), yy(TRAY_SH[i][1])))),
    `L ${pt(yxm(TRAY_SH[2][0]), yy(TRAY_SH[2][1]))}`,
    C([1, 0].map((i) => pt(yxm(TRAY_SH[i][0]), yy(TRAY_SH[i][1]))).concat(pt(trayA, bot))),
    `L ${pt(r, bot)}`,
    C([pt(r - c, bot), pt(0, bot - r + c), pt(0, bot - r)]),
    'Z',
  ].join(' ');
};

/* H takes one x, V takes one y, everything else takes pairs — so the walk has
   to know which command it is under to scale the right axis. */
const card = (w: number, h: number) => {
  const shape = SHAPE;
  const sx = w / VB_W;
  const sy = h / VB_H;
  const out: string[] = [];
  let cmd = '';
  let axis = 0;
  for (const t of shape) {
    if (typeof t === 'string') {
      cmd = t;
      axis = cmd === 'V' ? 1 : 0;
      out.push(t);
      continue;
    }
    const scaled = t * (axis ? sy : sx);
    out.push(`${Math.round(scaled * 100) / 100}`);
    if (cmd !== 'H' && cmd !== 'V') axis = axis ? 0 : 1;
  }
  return out.join(' ');
};

export default function Contact() {
  const shape = useRef<HTMLDivElement>(null);
  const root = useRef<HTMLElement>(null);

  useEffect(() => {
    const el = shape.current;
    if (!el) return;
    /* Measured rather than declared, for the same reason the work cards are:
       the features are fixed sizes and the card is not a fixed shape, so a
       viewBox would have to stretch and every radius with it.

       offset sizes, NOT entry.contentRect. contentRect is the CONTENT box and
       this card carries its padding on itself, so the rect came back 1290x523
       against a real 1405x696 — the clip was drawn 115px narrow and 173px short
       and quietly ate the call to action off the bottom. Frame.tsx reads
       contentRect and is fine only because the work cards put their padding on
       an inner element, which is luck rather than a rule. */
    const ro = new ResizeObserver(() => {
      const width = el.offsetWidth;
      const height = el.offsetHeight;
      if (width < 1 || height < 1) return;
      const flatNow = FLAT();
      el.style.clipPath = `path('${flatNow ? flatCard(width, height) : card(width, height)}')`;
      /* Published so the card's top padding and the bottom bar's height come
         from the same two numbers the shape does. They were a CSS constant and
         a script constant that had to be kept equal by hand, which is a note in
         two files and a bug waiting for the day one of them moves. */
      const host = el.parentElement ?? el;
      /* On a phone these come from the pixel builder's own numbers rather than
         from the mask's units, so the padding and the bottom bar still cannot
         drift away from the shape they are cut to. */
      const k = width / FLAT_REF_W;
      host.style.setProperty(
        '--ct-tab',
        `${flatNow ? FLAT_TAB_D * k : (height * VB_TAB) / VB_H}px`,
      );
      host.style.setProperty(
        '--ct-tray',
        `${flatNow ? FLAT_TRAY_D * k : (height * VB_TRAY) / VB_H}px`,
      );
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    const host = root.current;
    if (!host) return;
    const q = (sel: string) => gsap.utils.toArray<HTMLElement>(host.querySelectorAll(sel));
    const title = host.querySelector('.ct-title');
    const heads = q('.ct-title .rv');
    /* Both columns, so this is the four section links, the accent link and the
       three socials. NOT the pill: his Business Enquiries button is absent from
       the reveal list on his own footer, where Store and Sign Up are both on it. */
    return wipeLines({
      /* His footer headline is his one staggered pair — see the note in
         lib/wipe.ts for how that was told apart from a threshold each. */
      groups: title && heads.length ? [{ at: title, lines: heads }] : [],
      rows: q('.ct-col .rv'),
    });
  }, []);

  return (
    <footer className="ct" id="contact" data-tone="light" data-ground="signal" ref={root}>
      {/* Capped, as his is. His card is the viewport x 0.9769 until the
          container hits 1920, and then it simply stops — 1876x996 at 2000 wide
          and still 1876x996 at 2560. Ours grew without limit, which at a 2000px
          window made it 1965 against his 1876 on top of the shape being wrong.
          The bar lives in here too so it stays aligned with the card's edges
          instead of the window's. */}
      <div className="ct-shell">
      {/* The card. t-olive so it picks up the olive ground AND the field colour
          that goes with it — the panel ink at 0.66, not the paper ink, which is
          the mistake this ground has now made twice. */}
      <div className="ct-card t-olive on-dark" ref={shape}>
        {/* Still. His footer field does not move at all — two frames 2.2s
            apart differ by 0.00% of their pixels, where every other ground on
            his page drifts. Ours was animating at 4.15%. It is the right call
            and not only a copied one: this card is the one place the page stops,
            and a ground that keeps moving underneath it argues with that. */}
        <Contours seed={17} count={8} still />

        {/* Sits in the tab, which is cut to hold exactly this. */}
        <span className="ct-badge" aria-hidden="true">
          <Mark height={22} />
        </span>

        <div className="ct-in">
          {/* The inner span is what carries the reveal, NOT .a and .b
              themselves. Those are display:block and full-width, so a block
              covering one would sweep in from the card's edge with nothing
              under it for most of its travel — the statement hit exactly this
              and fixed it the same way. Wrapping the words instead leaves .a
              and .b untouched, so none of the spacing on this lockup moves. */}
          {/* display: contents on desktop, so the layout there is exactly what it
              was — the h2 stays a direct flex child of .ct-in — and a block on a
              phone, where it carries the headline's own order and spacing. */}
          <div className="ct-head">
            <h2 className="ct-title lockup">
              <span className="a">
                <span className="rv">
                  Let’s build
                  <span className="rv-b" />
                </span>
              </span>
              <span className="b">
                <span className="rv">
                  Something that runs.
                  <span className="rv-b" />
                </span>
              </span>
            </h2>
          </div>

          <div className="ct-cols">
            <nav className="ct-col" aria-label="Sections">
              <p className="ct-lab">Pages</p>
              {NAV.map((l) => (
                <a key={l.id} href={`#${l.id}`} aria-label={l.label}>
                  <Roll cover>{l.label}</Roll>
                </a>
              ))}
              <a
                className="ct-accent"
                href={SITE.resume}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Résumé"
              >
                <Roll cover>Résumé</Roll>
              </a>
            </nav>
            <div className="ct-col">
              <p className="ct-lab">Find me on</p>
              {SOCIALS.map((s) => (
                <a
                  key={s.label}
                  href={s.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={s.label}
                >
                  <Roll cover>{s.label}</Roll>
                </a>
              ))}
            </div>
          </div>

          {/* His BUSINESS ENQUIRIES pill, in the same place: centred on the
              bottom edge, sitting in the tray. The line above it is the
              availability note, which used to be down in the bottom bar — it
              has to move because the raised corners the tray leaves are small,
              and a sentence does not fit in one. */}
          <p className="ct-avail">{SITE.available}</p>
          <a className="ct-cta arrowed" href={`mailto:${SITE.email}`} aria-label={SITE.email}>
            <Roll>{SITE.email}</Roll>
            {/* The arrow un-draws and re-draws itself, tail first, and keeps
                doing it for as long as the pointer is on the button — his, off
                the frames Dhanush recorded. The label beside it rolls once, as
                every other roll on the page does. */}
            <span className="ico-arrow" aria-hidden="true">
              <Arrow />
            </span>
          </a>
        </div>
      </div>

      {/* On the accent, in the two corners the tray leaves standing. */}
      <div className="ct-foot">
        <span>
          © {SITE.year} {SITE.name}
        </span>
        <span>{SITE.location}</span>
      </div>
      </div>
    </footer>
  );
}
