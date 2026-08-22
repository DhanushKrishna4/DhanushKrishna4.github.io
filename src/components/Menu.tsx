import { useEffect, useRef } from 'react';
import { SITE, SOCIALS, NAV } from '../data/site';
import { smooth } from '../lib/scroll';
import { isolate } from '../lib/inert';
import Contours from './Contours';
import Mark from './Mark';
import Roll from './Roll';

/**
 * The full-screen menu.
 *
 * the reference site keeps two things on his bar — the store button and a toggle — and puts
 * everything else behind the toggle. That is the arrangement being copied here,
 * and the reason it works is not tidiness: a bar with one accent button on it
 * has one obvious thing to press, and a bar with six items has none. Every
 * section link that used to sit in the corner is in this panel now.
 *
 * The panel is olive, which is the site's own second ground, so opening the
 * menu is one more ground change rather than a modal appearing over the page.
 * The links are right-aligned and set at display size, as his are.
 *
 * The left of his panel is a photo collage. There are no photographs in this
 * project yet, so rather than fake one, that half is the monogram at very low
 * contrast running off the edge — ours, already drawn, and honest about being
 * a graphic rather than a picture.
 */
export default function Menu({
  open,
  closing,
  onClose,
  toggleRef,
}: {
  open: boolean;
  /* True for the length of the exit only. The panel has to stay rendered while
     it retracts, and the small-caps text has a wipe that belongs to leaving. */
  closing: boolean;
  onClose: () => void;
  toggleRef: React.RefObject<HTMLButtonElement | null>;
}) {
  const panel = useRef<HTMLDivElement>(null);
  const first = useRef<HTMLAnchorElement>(null);

  useEffect(() => {
    if (!open) return;
    const el = panel.current;
    if (!el) return;
    /* Captured now rather than read in the cleanup: the button is stable, but
       reading a ref during teardown is a habit that breaks the day the element
       it points at stops being. */
    const returnTo = toggleRef.current;

    document.body.classList.add('menu-open');

    /* Lenis keeps scrolling the page under a fixed overlay, because as far as
       it is concerned nothing has changed. Stopping it is the honest fix;
       overflow:hidden on the body does not reach a smooth-scroll library that
       is transforming a wrapper. */
    const lenis = smooth();
    lenis?.stop();

    /* The header is spared: the wordmark, the résumé button and the close
       button sit on top of the panel and have to stay reachable. */
    const restore = isolate(el, document.querySelector<HTMLElement>('.nav'));

    /* Focus the first link rather than the panel, so the first Tab goes to the
       second link instead of back to the top of a list nobody has entered.

       Retried across frames rather than called once, because the panel is
       `visibility: hidden` until it opens and an element that is not visible
       refuses focus *silently*. Calling focus() in the same tick as the state
       change leaves the user standing on the toggle with no error anywhere —
       measured, twice: once in the same tick and once on the following frame,
       and both times the first Tab after opening went to the close button
       instead of into the menu. Asking until it takes is the only version that
       does not depend on guessing how long the transition needs. */
    let frame = 0;
    let tries = 0;
    const grab = () => {
      first.current?.focus();
      if (document.activeElement !== first.current && tries++ < 20) {
        frame = requestAnimationFrame(grab);
      }
    };
    frame = requestAnimationFrame(grab);

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };
    document.addEventListener('keydown', onKey);

    return () => {
      cancelAnimationFrame(frame);
      document.removeEventListener('keydown', onKey);
      restore();
      lenis?.start();
      document.body.classList.remove('menu-open');
      /* Send focus back where it came from. Closing an overlay and dropping
         focus on <body> is the single most common way a keyboard user loses
         their place on a page. */
      returnTo?.focus();
    };
  }, [open, onClose, toggleRef]);

  return (
    <div className="menu" id="site-menu" data-open={open} data-closing={closing} ref={panel}>
      {/* Static, as his is. */}
      <Contours seed={41} count={8} still />

      <div className="menu-ghost" aria-hidden="true">
        <Mark height={520} />
      </div>

      <div className="menu-in">
        <nav className="menu-nav" aria-label="Sections">
          {NAV.map((l, i) => (
            <a
              key={l.id}
              ref={i === 0 ? first : undefined}
              className="menu-link"
              style={{ '--i': i } as React.CSSProperties}
              href={`#${l.id}`}
              onClick={onClose}
              /* Roll is aria-hidden, so the link has to carry its own name or a
                 screen reader gets a tree of single characters. */
              aria-label={l.label}
            >
              <Roll>{l.label}</Roll>
            </a>
          ))}

          {/* His emblem sits directly under the stack and says who he drives
              for. The equivalent fact here is what the work is and where. */}
          <p className="menu-badge">
            <Mark height={26} />
            {/* Index 0 of the six small-caps lines, matching his eyebrow. The
                staggers below continue from here in DOM order. */}
            <span className="wipe" style={{ '--i': 0 } as React.CSSProperties}>
              {SITE.role}
              <br />
              {SITE.location}
            </span>
          </p>
        </nav>

        <div className="menu-foot">
          <p className="menu-foot-k wipe" style={{ '--i': 1 } as React.CSSProperties}>
            Get in touch
          </p>
          <ul className="menu-socials">
            {/* Left to right, continuing the same run of six. It used to go
                right to left, from reading his frames as the last link being
                furthest along — but the block SHRINKS as a line arrives, so the
                widest bar is the one furthest through, not the narrowest, and
                his widest is TIKTOK. First in the row, first to move. */}
            {SOCIALS.map((s, i) => (
              <li key={s.label}>
                <a
                  className="wipe"
                  style={{ '--i': i + 2 } as React.CSSProperties}
                  href={s.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={s.label}
                >
                  <Roll>{s.label}</Roll>
                </a>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
