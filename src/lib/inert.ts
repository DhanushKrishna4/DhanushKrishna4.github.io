/**
 * Take everything except one subtree out of the page.
 *
 * `inert` removes a subtree from the tab order *and* the accessibility tree in
 * one attribute, which is the whole reason to use it here. The obvious
 * alternative — `aria-modal` on the panel — does neither: it is a hint to
 * assistive technology about what to announce, and a sighted keyboard user can
 * still tab straight out of the open menu into the page behind it.
 *
 * Walking up from the panel and marking siblings at every level, rather than
 * marking the children of <body>, because React renders into a single root
 * element: body has exactly one child, so a single pass would either inert the
 * whole app or nothing at all.
 *
 * `spare` exists for the bar. The menu covers the page but the header stays on
 * top of it — the wordmark, the résumé button and the close button all have to
 * stay reachable, exactly as they do on the reference — and the header is not
 * inside the panel.
 *
 * Anything already inert before the call is left alone and left out of the undo
 * list, so two overlapping isolations cannot un-inert each other's work.
 */
export function isolate(panel: HTMLElement, spare?: HTMLElement | null): () => void {
  const undo: HTMLElement[] = [];
  let node: HTMLElement | null = panel;

  while (node && node.parentElement) {
    for (const sib of Array.from(node.parentElement.children) as HTMLElement[]) {
      if (sib === node) continue;
      if (spare && (sib === spare || sib.contains(spare))) continue;
      if (sib.inert) continue;
      sib.inert = true;
      undo.push(sib);
    }
    node = node.parentElement;
    if (node === document.body) break;
  }

  return () => {
    for (const el of undo) el.inert = false;
    undo.length = 0;
  };
}
