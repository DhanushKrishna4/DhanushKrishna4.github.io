// Dennis's button fill (dennissnellenberg.com, his index-new.js), for the
// footer's contact pills. The fill is an oval half again as wide as the pill
// and twice as tall, centred on it and parked above it (76% of its own height
// up, see .pill__fill). When the pointer comes in, the oval jumps to just
// below the pill and rises over it; when it leaves, the oval carries on up and
// out of the top. Both take 0.6s, power2.inOut, as his do. His magnetic pull
// is left out. Keyboard focus fills the pill too; with reduced motion the
// fill comes and goes at once.
import { gsap } from 'gsap';
import { reducedMotion, unhovered, PAGE_CHANGE } from './env.js';

export function setupPills(scope) {
  if (!scope) return () => {};
  const pills = [...scope.querySelectorAll('.pill')];
  const offs = pills.map((pill) => {
    const fill = pill.querySelector('.pill__fill');
    if (!fill) return () => {};
    const duration = () => (reducedMotion() ? 0 : 0.6);
    let pointer = false;
    let focus = false;
    let filled = false;
    // Filled while the pointer is on it (not once a page change has
    // started, as on Lando's: core/env.js) or keyboard focus is.
    const sync = () => {
      const want = (pointer && !unhovered()) || focus;
      if (want === filled) return;
      filled = want;
      if (want) gsap.to(fill, { duration: duration(), startAt: { y: '76%' }, y: '0%', ease: 'power2.inOut' });
      else gsap.to(fill, { duration: duration(), y: '-76%', ease: 'power2.inOut' });
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
      focus = pill.matches(':focus-visible');
      sync();
    };
    const onBlur = () => {
      focus = false;
      sync();
    };
    pill.addEventListener('mouseenter', enter);
    pill.addEventListener('mouseleave', leave);
    pill.addEventListener('focus', onFocus);
    pill.addEventListener('blur', onBlur);
    addEventListener(PAGE_CHANGE, sync);
    return () => {
      pill.removeEventListener('mouseenter', enter);
      pill.removeEventListener('mouseleave', leave);
      pill.removeEventListener('focus', onFocus);
      pill.removeEventListener('blur', onBlur);
      removeEventListener(PAGE_CHANGE, sync);
      gsap.killTweensOf(fill);
    };
  });
  return () => offs.forEach((off) => off());
}
