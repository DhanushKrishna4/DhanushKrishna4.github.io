import { useEffect, useRef, useState } from 'react';
import type { CoreHandle } from '../lib/core';
import SculptureFallback from './SculptureFallback';
import '../styles/sculpture.css';

const MOTION_QUERY = '(prefers-reduced-motion: reduce)';
const POINTER_QUERY = '(hover: hover) and (pointer: fine)';
const clamp = (value: number) => Math.max(-1, Math.min(1, value));

/**
 * A complete SVG sculpture is present from first paint. The transparent WebGL
 * scene replaces it only after its first rendered frame; the same SVG remains
 * available if the context is lost or the visitor requests reduced motion.
 */
export default function Core() {
  const canvas = useRef<HTMLCanvasElement>(null);
  const [ready, setReady] = useState(false);
  const [unavailable, setUnavailable] = useState(false);
  const [motionReduced, setMotionReduced] = useState(() =>
    typeof matchMedia === 'function' && matchMedia(MOTION_QUERY).matches,
  );

  useEffect(() => {
    const preference = window.matchMedia(MOTION_QUERY);
    const update = () => setMotionReduced(preference.matches);
    preference.addEventListener('change', update);
    update();
    return () => preference.removeEventListener('change', update);
  }, []);

  useEffect(() => {
    setReady(false);
    if (motionReduced || unavailable) return;
    const el = canvas.current;
    if (!el) return;

    let handle: CoreHandle | null = null;
    let disposed = false;
    const finePointer = window.matchMedia(POINTER_QUERY);
    const band = el.closest('.open');

    const onPointer = (event: PointerEvent) => {
      if (!finePointer.matches || event.pointerType === 'touch') return;
      // The sculpture itself travels into its panel; using that moving box as
      // the input frame would feed its own translation back into the pointer.
      const bounds = (el.closest('.hero') ?? el).getBoundingClientRect();
      handle?.setPointer(
        clamp((event.clientX - bounds.left - bounds.width / 2) / Math.max(1, bounds.width / 2)),
        clamp((event.clientY - bounds.top - bounds.height / 2) / Math.max(1, bounds.height / 2)),
      );
    };
    const resetPointer = () => handle?.setPointer(0, 0);
    const onScroll = () => {
      if (!band || !handle) return;
      // .hero itself sticks at top:0, so its rectangle cannot measure scroll
      // progress. The enclosing opening band remains in normal document flow.
      // Match Hero.tsx's 70%-of-viewport shrink; the renderer eases this target.
      const bandDocumentTop = band.getBoundingClientRect().top + window.scrollY;
      const progress = (window.scrollY - bandDocumentTop) / Math.max(1, window.innerHeight * 0.7);
      handle.setProgress(Math.max(0, Math.min(1, progress)));
    };

    import('../lib/core')
      .then(({ createCore }) => {
        // Strict Mode and a changed motion preference can dispose this effect
        // while the chunk is loading. Never create an orphaned WebGL context.
        if (disposed) return;
        handle = createCore(el, {
          animate: true,
          onReady: () => {
            if (!disposed) setReady(true);
          },
          onLost: () => {
            if (!disposed) {
              setReady(false);
              setUnavailable(true);
            }
          },
        });
        if (!handle) {
          setUnavailable(true);
          return;
        }

        onScroll();
        window.addEventListener('pointermove', onPointer, { passive: true });
        window.addEventListener('blur', resetPointer);
        document.documentElement.addEventListener('pointerleave', resetPointer);
        finePointer.addEventListener('change', resetPointer);
        window.addEventListener('scroll', onScroll, { passive: true });
        window.addEventListener('resize', onScroll, { passive: true });
      })
      .catch(() => {
        if (!disposed) setUnavailable(true);
      });

    return () => {
      disposed = true;
      window.removeEventListener('pointermove', onPointer);
      window.removeEventListener('blur', resetPointer);
      document.documentElement.removeEventListener('pointerleave', resetPointer);
      finePointer.removeEventListener('change', resetPointer);
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
      handle?.destroy();
    };
  }, [motionReduced, unavailable]);

  return (
    <div className="hero-sculpture" data-ready={ready ? 'true' : 'false'} aria-hidden="true">
      <SculptureFallback />
      <canvas ref={canvas} className="hero-canvas hero-core" aria-hidden="true" />
    </div>
  );
}
