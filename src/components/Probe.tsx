import { useEffect, useState } from 'react';

/**
 * A readout of everything that decides how tall this page thinks the screen is.
 *
 * Temporary, and behind ?probe=1 so it is never part of a normal visit.
 *
 * It exists because the bug it is chasing cannot be reproduced on the machine
 * this was written on. Every browser available here — Chromium and WebKit, at
 * any emulated device size — has no notch and no retracting toolbar, reports
 * every env(safe-area-inset-*) as 0, and resolves vh, svh, lvh and dvh to the
 * same number. So four separate theories about why the page stops short of the
 * bottom of a phone were each shipped, each looked right in every measurement
 * available locally, and each turned out to be wrong on the actual device. This
 * replaces that loop with one screenshot.
 *
 * The units are measured rather than computed: a probe element is given the
 * height and its offsetHeight is read back, because that is what the layout
 * actually did with it. Same for the insets, which are read off the resolved
 * padding of a probe rather than from the env() text.
 */

type Row = [string, string];

const box = (style: Partial<CSSStyleDeclaration>) => {
  const el = document.createElement('div');
  Object.assign(el.style, {
    position: 'absolute',
    left: '-9999px',
    top: '0',
    width: '1px',
    pointerEvents: 'none',
    ...style,
  } as CSSStyleDeclaration);
  document.body.appendChild(el);
  return el;
};

function read(): Row[] {
  const unit = (h: string) => {
    const el = box({ height: h });
    const v = el.getBoundingClientRect().height;
    el.remove();
    return `${v.toFixed(1)}px`;
  };

  /* The insets come back through padding because env() is not readable any
     other way — getPropertyValue on a custom property holding env() returns the
     literal text, not the resolved number. */
  const inset = box({
    padding:
      'env(safe-area-inset-top) env(safe-area-inset-right) env(safe-area-inset-bottom) env(safe-area-inset-left)',
    height: '1px',
  });
  const ip = getComputedStyle(inset);
  const insets = `${ip.paddingTop} / ${ip.paddingRight} / ${ip.paddingBottom} / ${ip.paddingLeft}`;
  inset.remove();

  const vv = window.visualViewport;
  const ground = document.querySelector('.ground-light')?.getBoundingClientRect();
  const doc = document.documentElement;

  return [
    ['window.inner', `${window.innerWidth} x ${window.innerHeight}`],
    ['visualViewport', vv ? `${Math.round(vv.width)} x ${Math.round(vv.height)}` : 'none'],
    ['vv.offsetTop', vv ? `${vv.offsetTop.toFixed(1)}  scale ${vv.scale.toFixed(2)}` : '—'],
    ['doc.clientHeight', `${doc.clientHeight}`],
    ['screen', `${window.screen.width} x ${window.screen.height}  dpr ${window.devicePixelRatio}`],
    ['—insets t/r/b/l', insets],
    ['100vh', unit('100vh')],
    ['100svh', unit('100svh')],
    ['100lvh', unit('100lvh')],
    ['100dvh', unit('100dvh')],
    ['.ground-light h', ground ? `${ground.height.toFixed(1)}  top ${ground.top.toFixed(1)}` : 'absent'],
    ['scrollHeight', `${doc.scrollHeight}`],
    ['scrollY / max', `${Math.round(window.scrollY)} / ${doc.scrollHeight - window.innerHeight}`],
  ];
}

export default function Probe() {
  const [rows, setRows] = useState<Row[]>([]);

  useEffect(() => {
    const tick = () => setRows(read());
    tick();
    const on = ['resize', 'scroll', 'orientationchange'];
    on.forEach((e) => window.addEventListener(e, tick, { passive: true }));
    window.visualViewport?.addEventListener('resize', tick);
    window.visualViewport?.addEventListener('scroll', tick);
    return () => {
      on.forEach((e) => window.removeEventListener(e, tick));
      window.visualViewport?.removeEventListener('resize', tick);
      window.visualViewport?.removeEventListener('scroll', tick);
    };
  }, []);

  return (
    <>
      {/* The readout. */}
      <div
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          zIndex: 99999,
          background: '#000',
          color: '#d2ff00',
          font: '600 10px/1.45 ui-monospace, Menlo, monospace',
          padding: '6px 8px',
          pointerEvents: 'none',
          maxWidth: '82vw',
        }}
      >
        {rows.map(([k, v]) => (
          <div key={k}>
            <span style={{ color: '#8a9a00' }}>{k.padEnd(17, ' ')}</span>
            {v}
          </div>
        ))}
      </div>

      {/* Two rulers, which is the part a screenshot answers on its own.
          MAGENTA is pinned to the bottom of the fixed viewport. CYAN is at the
          very end of the document. If the page reaches the bottom of the screen
          both sit on the physical bottom edge; if it stops short, the gap
          between them — or between magenta and the edge — is the bug, measured
          in pixels you can see. */}
      <div
        style={{
          position: 'fixed',
          left: 0,
          right: 0,
          bottom: 0,
          height: '4px',
          background: '#ff00ff',
          zIndex: 99999,
          pointerEvents: 'none',
        }}
      />
      <div
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: 0,
          height: '4px',
          background: '#00ffff',
          zIndex: 99999,
          pointerEvents: 'none',
        }}
      />
    </>
  );
}
