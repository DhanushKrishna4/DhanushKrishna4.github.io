import { useEffect, useRef } from 'react';
import { gsap, reduced, reveal } from '../lib/motion';
import { wipeLines } from '../lib/wipe';
import { PROJECTS, SOCIALS } from '../data/site';
import Frame from './Frame';
import Roll from './Roll';
import Arrow from './Arrow';
import Mark from './Mark';

/**
 * The gallery, mapped from HELMETS / HALL OF FAME.
 *
 * That section is the closest thing on the reference site to a portfolio: a dark
 * ground, a grid of named things, each on a card with the same cut corner, each
 * labelled with what it is and the year. It is the section this whole build was
 * worth doing for, because the mapping is exact.
 *
 * What is missing is the thing that makes his version sing: hovering one of his
 * cards swaps the isolated product render for a photograph of that helmet in
 * the car. Six cards, twelve images. The hover here changes the card's frame to
 * the accent and lifts it, which is the same gesture with a tenth of the
 * honest, and the obvious place to spend real assets when there are any.
 */
/* How far a deep column sits below a shallow one, in rem. One value, because
   the offset is per COLUMN and nothing else — see the note in the effect. */
const BY_COLUMN = 10;

/* The profile the projects above live in. Read from SOCIALS rather than written
   again, so the footer link and this button can never point at two places. */
const GITHUB = SOCIALS.find((s) => s.label === 'GitHub')?.href ?? '#';

export default function Work() {
  const root = useRef<HTMLElement>(null);
  const head = useRef<HTMLElement>(null);

  /* The heading wipes in, his HELMETS / HALL OF FAME exactly — all three lines
     in the accent, and a threshold EACH rather than one staggered group. Told
     apart by measuring his: Helmets fires at 0.897 of the window and Hall of
     Fame at 0.890, both sitting on the line, where a stagger would have put the
     second one well below it. The eyebrow is ours rather than his — he has no
     line above HELMETS — and it takes a trigger of its own on the same rule,
     which puts it first because it sits highest. */
  useEffect(() => {
    const host = root.current;
    if (!host) return;
    /* The heading's three lines and the sign-off's two, all on the same rule.
       His sign-off copy is wiped exactly like his heading — both lines of "See
       more helmets and highlights / from the reference site on the track" carry a #d2ff00
       block — and the button below them carries none, the same as his footer
       pill. */
    return wipeLines({ rows: gsap.utils.toArray<HTMLElement>(host.querySelectorAll('.rv')) });
  }, []);

  useEffect(() => {
    const el = root.current;
    if (!el) return;
    const grid = el.querySelector<HTMLElement>('.wk-grid');

    const ctx = gsap.context(() => {
      if (!reduced()) {
        reveal('.wk-card', {
          y: 34,
          opacity: 0,
          duration: 0.85,
          ease: 'power3.out',
          stagger: 0.06,
          scrollTrigger: { trigger: '.wk-grid', start: 'top 82%' },
        });
      }
    }, el);

    /* The cards arrive out of step and square up as the grid goes past, which
       is his: every offset scrubs linearly to 0 across the grid's whole passage
       through the window — its top meeting the bottom of the screen, to its
       bottom meeting the top. So the grid is never square until you have
       scrolled past it. Linear, because any other ease makes the convergence
       arrive early and then sit there waiting.

       The offset belongs to the COLUMN, not the card. Every card in a column
       carries the same one, so a column slides as a rigid unit and the spacing
       between two cards in it is the grid's row gap, always, everywhere. The
       scatter is columns moving against each other and nothing else.

       This was previously read out of his bundle as two parities — a column
       term plus a row term, so cards within a column alternated as well. That
       is wrong, and it showed as soon as there were three rows: the gap between
       cards 1 and 5, 5 and 9, and 2 and 6 all came out different sizes. A
       single per-column offset is what his grid actually does.

       The column is taken from where the card actually landed rather than from
       its index, which is what survives the column count changing: the grid is
       auto-fill, four columns at 1440 and three at 1100, and anything keyed to
       the index is only right at one of those. */
    const mm = gsap.matchMedia();
    if (grid) {
      /* Above 1100px only. Below it the grid is one or two columns and there is
         nothing to scatter against. matchMedia rather than a width check so it
         tears itself down and rebuilds on resize. */
      mm.add('(min-width: 1100px)', () => {
        const cells = gsap.utils.toArray<HTMLElement>(grid.querySelectorAll('.wk-cell'));
        /* Layout positions, so they are read before any transform is applied
           and are unaffected by the ones that follow. */
        const xs = [...new Set(cells.map((c) => c.offsetLeft))].sort((a, b) => a - b);
        /* ONE offset per column, and every card in that column carries it.
           A column therefore moves as a rigid unit: the distance between two
           cards in the same column is always the grid's row gap and nothing
           else, and the scatter comes entirely from columns sliding against
           each other. That is the reference site's arrangement.

           What this replaced also varied the offset BY ROW, so two cards in one
           column sat at different offsets and the gap between them was a
           different size in every column — visibly so once there were three
           rows: 0 to 35px between cards 1 and 5, 35 back to 0 between 5 and 9,
           160 to 176 between 2 and 6.

           It also makes the overlap that prompted this structurally
           impossible rather than merely clamped. Cards can only ever collide
           with the card above or below them, which is to say within a column —
           and within a column every card now moves by the same amount, so the
           distance between them cannot change at all, at rest or at any point
           in the scrub. The clamp that used to live here is gone with it. */
        cells.forEach((cell) => {
          const col = xs.indexOf(cell.offsetLeft);
          const y = (col % 2) * BY_COLUMN;
          if (!y) return;
          gsap.set(cell, { y: `${y}rem` });
          /* Reduced motion keeps the offsets and loses the scrub, so the grid
             is a static composition — which is what it was before any of this,
             so nothing is lost there. */
          if (reduced()) return;
          gsap.to(cell, {
            y: 0,
            ease: 'none',
            scrollTrigger: { trigger: grid, start: 'top bottom', end: 'bottom top', scrub: true },
          });
        });
      });
    }

    return () => {
      mm.revert();
      ctx.revert();
    };
  }, []);

  /* No contour field in this section. His helmets ground is the one dark ground
     on the page he leaves completely plain, and it has to be: the cards are
     outlines with the ground showing straight through them, so a pattern behind
     them reads through every card at once. Ours drew a field and it was
     competing with the frames for the same pixels. */
  return (
    <section className="sec t-ink on-dark slides-over" id="work" data-tone="dark" data-ground="ink" ref={root}>
      <div className="wrap">
        {/* The inner span carries the reveal, not .eyebrow/.a/.b themselves —
            those are full-width blocks, so a block covering one would sweep in
            from the column's edge with nothing under it for most of its travel.
            Wrapping the words leaves this header's geometry untouched. */}
        <header className="sec-title" ref={head}>
          <p className="eyebrow">
            <span className="rv">
              Selected
              <span className="rv-b" />
            </span>
          </p>
          <h2 className="sec-head lockup">
            <span className="a">
              <span className="rv">
                The
                <span className="rv-b" />
              </span>
            </span>
            <span className="b">
              <span className="rv">
                Work
                <span className="rv-b" />
              </span>
            </span>
          </h2>
        </header>

        <div className="wk-grid">
          {PROJECTS.map((p) => (
            /* The cell carries the column offset, the card inside carries the
               entrance. Two elements because they would otherwise both be
               animating `y` and the last tween to run would win. */
            <div className="wk-cell" key={p.n}>
            {/* A div, not an anchor. Four of these projects have a live build as
                well as a repository, and an anchor cannot legally contain
                another one. The title's link stretches an invisible layer over
                the whole card instead, so the card is still a single click to
                the repo, and the live link sits above that layer to take its
                own. */}
            <div className="wk-card">
              {/* The card IS this outline — there is no fill behind it. Drawn
                  rather than a clip-path, because a clip gives a shape and this
                  needs a stroke with the ground visible on both sides of it. */}
              <Frame shot={p.shot} />
              <div className="wk-in">
                <div className="wk-top">
                  <span>{p.n}</span>
                  <span>{p.year}</span>
                </div>
                <h3 className="wk-title">
                  {/* The live build where there is one, the repository
                      otherwise. Four of these projects ARE a page you can open,
                      so that is what the card should hand you; the source moves
                      to its own link below. */}
                  <a
                    className="wk-link"
                    href={p.live ?? p.href}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {p.title}
                  </a>
                </h3>
                <p className="wk-kind">{p.kind}</p>
                <p className="wk-blurb">{p.blurb}</p>
                <ul className="wk-stack">
                  {p.stack.map((s) => (
                    <li key={s}>{s}</li>
                  ))}
                </ul>
                {/* Drawn only when there is one. A card with no outcome simply
                    does not have the rule — "used by teams across the region"
                    under a repository with no stars is the one kind of lie on a
                    portfolio that gets checked, and checked easily. */}
                {p.outcome && <p className="wk-out">{p.outcome}</p>}
                {/* Only on the four the card now points at a demo for, so the
                    repository stays one click away rather than being lost to
                    the swap. Last in the card so it lands on the bottom edge: it
                    stays above the screenshot on hover, and the bottom edge is
                    the one place the scrim can keep it legible over a capture
                    as pale as Orrery's. The label is identical on all four, so the
                    accessible name carries the project. */}
                {p.live && (
                  <a
                    className="wk-src"
                    href={p.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={`${p.title} source on GitHub`}
                  >
                    Source
                  </a>
                )}
              </div>
            </div>
            </div>
          ))}
        </div>

        {/* His "See more helmets and highlights / from the reference site on the track", in
            the same place and doing the same job: the gallery above is a
            selection, and this is the door to the rest of it. His goes to his
            on-track page; ours goes to the profile the projects above live in.

            Badge, two serif lines, pill — his order, and his 33px between each
            of the three, which is the one measurement that makes this read as a
            stacked unit rather than three centred things. */}
        <div className="wk-more">
          <span className="wk-more-mark" aria-hidden="true">
            <Mark height={34} />
          </span>
          <p className="wk-more-copy">
            <span className="wk-more-line">
              <span className="rv">
                See more projects and experiments
                <span className="rv-b" />
              </span>
            </span>
            <span className="wk-more-line">
              <span className="rv">
                from Dhanush on GitHub
                <span className="rv-b" />
              </span>
            </span>
          </p>
          <a
            className="wk-cta arrowed"
            href={GITHUB}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="View on GitHub"
          >
            <Roll>View on GitHub</Roll>
            <span className="ico-arrow" aria-hidden="true">
              <Arrow />
            </span>
          </a>
        </div>
      </div>
    </section>
  );
}
