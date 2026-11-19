// A small client-side router (the way Dennis's site uses Barba): every page
// is a real static HTML file, but internal links are fetched and swapped in
// place so the WebGL canvas, header and menu persist across pages and each
// change of page gets a transition.
import { html, reducedMotion, PAGE_CHANGE } from './env.js';
import { jumpTo, lockScroll, refreshScroll, smoothTo, scrollY } from './scroll.js';
import { fillCover, fillReveal, curtain, riseIn } from './transitions.js';
import { run, zoomFor, textIn, textOut, OPEN, CLOSE } from './projectZoom.js';
import { menuColours, pagePalette } from './palette.js';

const LABELS = { '/': 'Home', '/work/': 'Work', '/about/': 'About', '/contact/': 'Contact' };
const normalize = (p) => (p.endsWith('/') ? p : `${p}/`);
const isProjectPath = (p) => /^\/work\/[^/]+\/?$/.test(p);

const cache = new Map();
function fetchDoc(href) {
  const key = href.split('#')[0];
  if (!cache.has(key)) {
    const p = fetch(key, { credentials: 'same-origin' })
      .then((r) => {
        if (!r.ok && r.status !== 404) throw new Error(`HTTP ${r.status}`);
        return r.text();
      })
      .then((t) => new DOMParser().parseFromString(t, 'text/html'))
      .catch((e) => {
        cache.delete(key);
        throw e;
      });
    cache.set(key, p);
  }
  return cache.get(key);
}

function isInternal(a) {
  if (!a || !a.getAttribute) return false;
  const href = a.getAttribute('href');
  if (!href || href.startsWith('#') || href.startsWith('mailto:') || href.startsWith('tel:')) return false;
  if (a.target === '_blank' || a.hasAttribute('download')) return false;
  const u = new URL(a.href, location.href);
  return u.origin === location.origin && !/\.(pdf|jpg|png|svg|zip)$/i.test(u.pathname);
}

// Marks the current page in the persistent header and menu.
export function markCurrent(pathname = location.pathname) {
  const path = normalize(pathname);
  // Only the exact page counts, as on Lando's site: on a project page no
  // link is current, so the menu can still take you to Work. The menu's
  // current link can't be clicked or tabbed to (menu.js, ui.css).
  document.querySelectorAll('[data-nav-link], [data-menu-link]').forEach((a) => {
    const current = normalize(new URL(a.href).pathname) === path;
    if (current) a.setAttribute('aria-current', 'page');
    else a.removeAttribute('aria-current');
    if (a.hasAttribute('data-menu-link')) {
      if (current) a.setAttribute('tabindex', '-1');
      else a.removeAttribute('tabindex');
    }
  });
}

function swapDocument(doc, url) {
  // A copy, so the cached page stays whole for the next visit to it.
  const next = doc.getElementById('swap');
  document.getElementById('swap').replaceWith(document.importNode(next, true));
  document.title = doc.title;

  const nh = doc.documentElement;
  html.dataset.page = nh.dataset.page ?? 'page';
  html.dataset.tone = nh.dataset.tone ?? 'dark';
  const style = nh.getAttribute('style');
  if (style) html.setAttribute('style', style);
  else html.removeAttribute('style');

  for (const sel of [
    'meta[name="description"]',
    'meta[name="theme-color"]',
    'link[rel="canonical"]',
    'meta[property="og:title"]',
    'meta[property="og:description"]',
    'meta[property="og:url"]',
    'meta[name="twitter:title"]',
    'meta[name="twitter:description"]',
  ]) {
    const a = document.head.querySelector(sel);
    const b = doc.head.querySelector(sel);
    if (a && b) a.replaceWith(b.cloneNode(true));
  }
  doc.head.querySelectorAll('link[rel="stylesheet"]').forEach((l) => {
    const href = l.getAttribute('href');
    if (!document.head.querySelector(`link[rel="stylesheet"][href="${href}"]`)) document.head.append(l.cloneNode());
  });

  markCurrent(url.pathname);
}

export function createRouter({ mount, onLeave, gl = null }) {
  let busy = false;
  let current = null;
  // Back on a project page returns to the list you came from, as Lusion's does.
  let lastList = isProjectPath(location.pathname) ? '/work/' : normalize(location.pathname);
  // The page on screen. By the time the browser's back or forward reaches
  // us, the address already shows where it is going.
  let here = normalize(location.pathname);
  const shield = document.createElement('div');
  shield.className = 'nav-shield';
  shield.setAttribute('aria-hidden', 'true');
  document.body.append(shield);
  // Lando's: the clicked link (and anything else under the mouse) goes back
  // to its unhovered look while the page changes. A link tapped on a phone
  // keeps its look, as his do, so only a change begun with a mouse or pen
  // unhovers (ui.css, core/env.js unhovered). The shield goes up either way.
  let lastPointer = 'mouse';
  addEventListener('pointerdown', (e) => (lastPointer = e.pointerType), { capture: true, passive: true });
  const changing = (on) => {
    html.classList.toggle('is-transitioning', on);
    html.classList.toggle('is-unhovered', on && lastPointer !== 'touch');
    dispatchEvent(new Event(PAGE_CHANGE));
  };

  async function go(href, { trigger = null, pop = false } = {}) {
    const url = new URL(href, location.href);
    if (busy) return;

    if (!pop && normalize(url.pathname) === normalize(location.pathname)) {
      await onLeave?.({ samePage: true });
      smoothTo(0);
      return;
    }

    busy = true;
    changing(true);
    let cover = null;
    const fromPath = pop ? here : normalize(location.pathname);
    const toPath = normalize(url.pathname);
    const toProject = isProjectPath(url.pathname) && !pop;
    const docPromise = fetchDoc(url.href);
    lockScroll(true);

    try {
      // Lusion's open and close (core/projectZoom.js): into a project from a
      // grid that shows its card, and out of one to a page that does.
      const zooming = gl && !reducedMotion();
      const opening = zooming && isProjectPath(toPath) && !isProjectPath(fromPath) && current?.cards ? await current.cards.find(toPath) : null;
      const closing =
        zooming && !opening && isProjectPath(fromPath) && !isProjectPath(toPath) && !!(await docPromise).querySelector(`#swap [data-card][href="${fromPath}"]`);
      if (opening) {
        await openProject(opening, url, docPromise, pop);
        return;
      }
      if (closing) {
        lastList = toPath;
        await closeProject(fromPath, url, docPromise, pop);
        return;
      }

      if (toProject) {
        const doc = await docPromise;
        const theme = JSON.parse(doc.getElementById('swap')?.dataset.theme || '{}');
        const source = trigger?.closest('[data-card], [data-next-panel]') ?? trigger;
        const rect = source?.getBoundingClientRect();
        await Promise.all([fillCover(rect, theme.bg || '#000'), onLeave?.({ type: 'project' })]);
      } else {
        const label = LABELS[normalize(url.pathname)] ?? (await docPromise).getElementById('swap')?.dataset.label ?? '';
        // Leaving a project page, in its colours, as its menu is.
        cover = curtain(label, menuColours(pagePalette()));
        // An open menu stays until the panel has covered it.
        await cover.covered;
        await onLeave?.({ type: 'curtain' });
      }

      const doc = await docPromise;
      current?.destroy();
      swapDocument(doc, url);
      if (!pop) history.pushState({}, '', url.href);
      jumpTo(0);

      current = await mount(document.getElementById('swap'), { first: false });
      refreshScroll();
      lockScroll(false);

      if (toProject) {
        current.intro?.();
        await fillReveal();
      } else {
        // As on Dennis's: the new page's blocks rise into place under the
        // panel, which then lifts; this page's own entrance starts just
        // after the lift begins.
        riseIn([...document.querySelectorAll('#main > *')], cover.elapsed());
        const lift = Math.max(0, 1.15 - cover.elapsed());
        setTimeout(() => current.intro?.(), (lift + 0.38) * 1000);
        cover.ready();
        await cover.done;
      }
      if (!isProjectPath(toPath)) lastList = toPath;
    } catch (err) {
      console.error('Navigation failed, loading the page directly.', err);
      location.href = url.href;
    } finally {
      lockScroll(false);
      busy = false;
      changing(false);
      here = normalize(location.pathname);
    }
  }

  // Lusion's open (core/projectZoom.js): the list leaves over 1.5s, its text
  // fading as the grid zooms into the card; the project page then arrives.
  async function openProject(card, url, docPromise, pop) {
    await onLeave?.({ type: 'project' });
    const leaving = document.getElementById('swap');
    await run(OPEN, (hide) => {
      const text = textOut(hide);
      leaving.style.opacity = String(text);
      current.cards.zoom(card, zoomFor(1 - hide), text);
    });
    // The card now fills the screen in the project's colour; the page under
    // it changes, taking the project's colours at once, its lines hidden.
    const doc = await docPromise;
    current?.destroy();
    swapDocument(doc, url);
    if (!pop) history.pushState({}, '', url.href);
    jumpTo(0);
    const root = document.getElementById('swap');
    root.style.opacity = '0';
    if (gl?.field) gl.field.uniforms.uFade.value = 0;
    current = await mount(root, { first: false, instant: true });
    refreshScroll();
    if (current.show) await current.show();
    else {
      root.style.opacity = '';
      current.intro?.();
    }
  }

  // Lusion's close: the project page leaves over 1s; the list comes back
  // scrolled so the card sits a quarter of the way down, and the card,
  // filling the screen in the project's colour, zooms back into its place
  // over 1.5s while the list's text fades in.
  async function closeProject(fromPath, url, docPromise, pop) {
    await onLeave?.({ type: 'project' });
    await current?.hide?.();
    const doc = await docPromise;
    current?.destroy();
    swapDocument(doc, url);
    if (!pop) history.pushState({}, '', url.href);
    const root = document.getElementById('swap');
    root.style.opacity = '0';
    // Keep the project's colours (lines hidden) until the card covers the screen.
    current = await mount(root, { first: false, keepTheme: true });
    current.settle?.();
    const card = await current.cards?.find(fromPath);
    if (!card) {
      gl?.setTheme(null, true);
      if (gl?.field) gl.field.uniforms.uFade.value = 1;
      root.style.opacity = '';
      jumpTo(0);
      refreshScroll();
      current.intro?.();
      return;
    }
    jumpTo(Math.max(0, card.card.getBoundingClientRect().top + scrollY() - innerHeight * 0.25));
    // Below the line where cards start to tip back, so it lands flat.
    const flat = current.cards.flatLine?.();
    const low = flat == null ? 0 : flat - card.card.getBoundingClientRect().top;
    if (low > 0) jumpTo(Math.max(0, scrollY() - low));
    refreshScroll();
    current.cards.zoom(card, 1, 0);
    await current.cards.imageReady(card);
    gl.setTheme(null, true);
    gl.field.uniforms.uFade.value = 1;
    await run(CLOSE, (show) => {
      const text = textIn(show);
      root.style.opacity = show >= 1 ? '' : String(text);
      current.cards.zoom(card, zoomFor(show), text);
    });
    current.cards.zoom(null);
    current.intro?.();
  }

  document.addEventListener('click', (e) => {
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    const a = e.target.closest('a');
    if (!isInternal(a)) return;
    e.preventDefault();
    // Back returns to the list you came from (Work, or the home page's grid).
    go(a.hasAttribute('data-back') ? lastList : a.href, { trigger: a });
  });

  // Start fetching a page as soon as the pointer rests on its link.
  document.addEventListener(
    'pointerover',
    (e) => {
      const a = e.target.closest?.('a');
      if (isInternal(a)) fetchDoc(new URL(a.href, location.href).href).catch(() => {});
    },
    { passive: true },
  );

  addEventListener('popstate', () => go(location.href, { pop: true }));

  return {
    go,
    setCurrent(c) {
      current = c;
    },
  };
}
