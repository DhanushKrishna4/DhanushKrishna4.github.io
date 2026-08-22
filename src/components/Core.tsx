import { useEffect, useRef, useState } from 'react';
import { reduced } from '../lib/motion';
import type { CoreHandle } from '../lib/core';
import Machine from './Machine';

/**
 * The hero object, with the old one kept as its fallback.
 *
 * WebGL is not guaranteed: it can be disabled, blocked by an extension, absent
 * on a locked-down machine, or taken away mid-session when the GPU resets. All
 * four end the same way — a hole where the only thing in the frame should be —
 * so the Canvas 2D drawing this replaced is still here and still correct, and
 * takes over in each of those cases. It is a worse object and a working page,
 * which is the right way round.
 *
 * The context is probed before the scene is built rather than after. Building
 * first and catching the failure means a WebGLRenderer constructor has already
 * run, and on some drivers that is the thing that hangs.
 *
 * three is imported dynamically, which is worth the asynchrony. Measured, in one
 * chunk it was 897kB raw and 258kB gzipped; split, the entry is 366kB / 125kB
 * and the scene is a separate 532kB / 133kB. That second half would otherwise
 * sit in front of the first paint of a page whose opening two seconds are a
 * loader with no use for it — this way the chunk arrives during the entry
 * animation instead. The fallback covers it never arriving at all.
 */
function hasWebGL(): boolean {
  try {
    const c = document.createElement('canvas');
    return !!(c.getContext('webgl2') || c.getContext('webgl'));
  } catch {
    return false;
  }
}

export default function Core() {
  const canvas = useRef<HTMLCanvasElement>(null);
  const [fallback, setFallback] = useState(() => !hasWebGL());

  useEffect(() => {
    if (fallback) return;
    const el = canvas.current;
    if (!el) return;

    let handle: CoreHandle | null = null;
    let dead = false;
    let onMove: ((e: PointerEvent) => void) | null = null;
    let onScroll: (() => void) | null = null;

    import('../lib/core')
      .then(({ createCore }) => {
        /* The effect can be torn down while the chunk is in flight — in
           development that happens on every hot update, and in production it
           happens if the object falls back before the import resolves. Building
           the scene then would leak a WebGL context with no one holding it. */
        if (dead) return;

        handle = createCore(el, {
          /* Reduced motion gets one painted frame rather than an empty box. The
             preference is about movement, not about content. */
          animate: !reduced(),
          onLost: () => setFallback(true),
        });
        if (!handle) {
          setFallback(true);
          return;
        }

        const h = handle;
        onMove = (e: PointerEvent) =>
          h.setPointer(
            (e.clientX - window.innerWidth / 2) / (window.innerWidth / 2),
            (e.clientY - window.innerHeight / 2) / (window.innerHeight / 2),
          );
        window.addEventListener('pointermove', onMove, { passive: true });

        /* Progress across the hero's own passage up the screen, read off the
           section rather than off a share of total page scroll — a percentage
           of the document silently means something different the moment any
           section above it changes height. */
        onScroll = () => {
          const hero = el.closest('section');
          if (!hero) return;
          const r = hero.getBoundingClientRect();
          h.setProgress(Math.min(1, Math.max(0, -r.top / Math.max(1, r.height))));
        };
        onScroll();
        window.addEventListener('scroll', onScroll, { passive: true });
      })
      .catch(() => {
        if (!dead) setFallback(true);
      });

    return () => {
      dead = true;
      if (onMove) window.removeEventListener('pointermove', onMove);
      if (onScroll) window.removeEventListener('scroll', onScroll);
      handle?.destroy();
    };
  }, [fallback]);

  if (fallback) return <Machine />;

  return <canvas ref={canvas} className="hero-canvas hero-core" aria-hidden="true" />;
}
