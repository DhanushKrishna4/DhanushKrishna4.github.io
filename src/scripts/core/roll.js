// Lando's link hover (landonorris.com, their "text-hover" links): on hover the
// letters roll up one line, a fiftieth of a second apart, and the same word
// rolls in from below; when the pointer leaves they roll back down. Each
// letter carries a copy of itself one line lower (a text-shadow) and the word
// is clipped to its line, so only one copy shows at a time. Same timing as
// theirs: 0.6s, power3.out, 0.02s between letters. Links opt in with data-roll;
// keyboard focus rolls them too. Nothing moves with reduced motion.
import { gsap } from 'gsap';
import { reducedMotion, changingPage, PAGE_CHANGE } from './env.js';

const TIMING = { duration: 0.6, stagger: 0.02, ease: 'power3.out', overwrite: true };

// Splits a link's text into one box per letter. Separate boxes lose the
// kerning between letters (up to a pixel across a long word), so each letter
// is nudged back to where it sat in the unsplit text. Done on first use, when
// the link is on screen and its font has loaded, so the measurements hold.
function split(link) {
  const node = [...link.childNodes].find((n) => n.nodeType === Node.TEXT_NODE && n.textContent.trim());
  if (!node) return null;
  const text = node.textContent.trim();
  const letters = Array.from(text);
  const range = document.createRange();
  let at = node.textContent.indexOf(text);
  const before = letters.map((ch) => {
    range.setStart(node, at);
    range.setEnd(node, (at += ch.length));
    return range.getBoundingClientRect().left;
  });

  const word = document.createElement('span');
  word.className = 'roll';
  word.setAttribute('aria-hidden', 'true');
  const boxes = letters.map((ch) => {
    const box = document.createElement('span');
    box.className = 'roll__char';
    box.textContent = ch === ' ' ? ' ' : ch;
    word.append(box);
    return box;
  });
  // The text itself stays for screen readers and text search.
  const label = document.createElement('span');
  label.className = 'visually-hidden';
  label.textContent = text;
  node.replaceWith(word, label);

  const size = parseFloat(getComputedStyle(word).fontSize);
  const after = boxes.map((b) => b.getBoundingClientRect().left);
  let shift = 0;
  boxes.forEach((box, i) => {
    const need = before[i] - before[0] - (after[i] - after[0]);
    if (Math.abs(need - shift) > 0.01) box.style.marginLeft = `${((need - shift) / size).toFixed(4)}em`;
    shift = need;
  });
  return boxes;
}

export function setupRoll(scope) {
  if (!scope || reducedMotion()) return () => {};
  const links = [...scope.querySelectorAll('[data-roll]')];
  const offs = links.map((link) => {
    let boxes = null;
    let pointer = false;
    let focus = false;
    let up = false;
    // Up while the pointer is on it (not once a page change has started,
    // as on Lando's: core/env.js) or keyboard focus is.
    const sync = () => {
      const want = (pointer && !changingPage()) || focus;
      if (want === up) return;
      up = want;
      if (want) boxes ||= split(link);
      if (boxes) gsap.to(boxes, { yPercent: want ? -100 : 0, ...TIMING });
    };
    const enter = () => {
      pointer = true;
      sync();
    };
    const leave = () => {
      pointer = false;
      sync();
    };
    const onFocus = () => {
      focus = link.matches(':focus-visible');
      sync();
    };
    const onBlur = () => {
      focus = false;
      sync();
    };
    link.addEventListener('mouseenter', enter);
    link.addEventListener('mouseleave', leave);
    link.addEventListener('focus', onFocus);
    link.addEventListener('blur', onBlur);
    addEventListener(PAGE_CHANGE, sync);
    return () => {
      link.removeEventListener('mouseenter', enter);
      link.removeEventListener('mouseleave', leave);
      link.removeEventListener('focus', onFocus);
      link.removeEventListener('blur', onBlur);
      removeEventListener(PAGE_CHANGE, sync);
      if (boxes) gsap.killTweensOf(boxes);
    };
  });
  return () => offs.forEach((off) => off());
}
