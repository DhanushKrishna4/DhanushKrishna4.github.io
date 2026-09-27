import { createRoot, type Root } from 'react-dom/client';
import Core from '../src/components/Core';
import '../src/styles/index.css';

// Every interception below is confined to this standalone audit entry point.
// The regular index.html never imports this file or its test controls.
const MOTION_QUERY = '(prefers-reduced-motion: reduce)';
const nativeMatchMedia = window.matchMedia.bind(window);
const motionChanges = new EventTarget();
let reducedForTest = false;
const motionQuery = {
  media: MOTION_QUERY,
  get matches() { return reducedForTest; },
  onchange: null,
  addEventListener: motionChanges.addEventListener.bind(motionChanges),
  removeEventListener: motionChanges.removeEventListener.bind(motionChanges),
  dispatchEvent: motionChanges.dispatchEvent.bind(motionChanges),
  addListener(listener: EventListener) { motionChanges.addEventListener('change', listener); },
  removeListener(listener: EventListener) { motionChanges.removeEventListener('change', listener); },
} as unknown as MediaQueryList;
window.matchMedia = query => query === MOTION_QUERY ? motionQuery : nativeMatchMedia(query);

function setReducedMotion(value: boolean) {
  reducedForTest = value;
  motionChanges.dispatchEvent(new MediaQueryListEvent('change', { matches: value, media: MOTION_QUERY }));
}

// All RAF calls in this entry point belong to the imported scene: this harness
// polls with timers, so an orphaned scene loop cannot hide behind our own loop.
const nativeRequestFrame = window.requestAnimationFrame.bind(window);
const nativeCancelFrame = window.cancelAnimationFrame.bind(window);
const pendingFrames = new Set<number>();
let scheduled = 0;
let cancelled = 0;
let fired = 0;
window.requestAnimationFrame = callback => {
  const id = nativeRequestFrame(time => {
    pendingFrames.delete(id);
    fired++;
    callback(time);
  });
  pendingFrames.add(id);
  scheduled++;
  return id;
};
window.cancelAnimationFrame = id => {
  if (pendingFrames.delete(id)) cancelled++;
  nativeCancelFrame(id);
};

const style = document.createElement('style');
style.textContent = `
  body { background:#101116; color:#e9ebef; font:15px/1.5 system-ui,sans-serif; }
  .audit-page { max-width:1440px; margin:0 auto; padding:24px; }
  .audit-header { max-width:1000px; }
  .audit-eyebrow { color:#aeb5c2; font-size:12px; text-transform:uppercase; letter-spacing:.08em; }
  .audit-header h1 { font-size:28px; margin:8px 0; }
  .audit-header p { margin:8px 0 14px; }
  .audit-actions { display:flex; flex-wrap:wrap; gap:10px; margin:16px 0; }
  .audit-actions button { padding:10px 14px; background:#242934; color:#fff; border:1px solid #535b6d; border-radius:6px; font:inherit; cursor:pointer; }
  .audit-actions button:first-child { background:#a40e29; border-color:#d32b49; }
  .audit-actions button:disabled { opacity:.5; cursor:wait; }
  #audit-status { display:block; margin:12px 0 18px; font-weight:650; }
  .audit-grid { display:grid; grid-template-columns:minmax(0,1.65fr) minmax(280px,1fr); gap:20px; align-items:start; }
  .audit-stage { position:relative; height:min(66svh,640px); min-height:340px; overflow:hidden; background:#16161c; border:1px solid #313642; border-radius:10px; }
  #hero-mount { position:absolute; inset:0; }
  #hero-mount .hero-sculpture { width:100%; height:100%; }
  .audit-results { background:#191c24; padding:18px; border:1px solid #313642; border-radius:10px; }
  #audit-checks { margin:0; padding:0; list-style:none; }
  #audit-checks li { margin:0 0 14px; padding-left:12px; border-left:3px solid #616975; }
  #audit-checks strong,#audit-checks span { display:block; }
  #audit-checks span { color:#aeb5c2; font-size:13px; margin-top:3px; }
  #audit-checks [data-state=pass] { border-color:#7bdcaa; }
  #audit-checks [data-state=pass] span { color:#7bdcaa; }
  #audit-checks [data-state=fail] { border-color:#ff8794; }
  #audit-checks [data-state=fail] span { color:#ff8794; }
  #audit-checks [data-state=running] { border-color:#f0cc70; }
  .audit-metrics,.audit-note { font-size:12px; color:#aeb5c2; }
  #audit-log { white-space:pre-wrap; overflow-wrap:anywhere; font:12px/1.5 ui-monospace,monospace; color:#c4cbd7; max-height:220px; overflow:auto; }
  @media(max-width:800px) { .audit-page {padding:16px;} .audit-grid {grid-template-columns:1fr;} .audit-stage {height:54svh;} }
`;
document.head.append(style);

const mountPoint = document.querySelector<HTMLDivElement>('#hero-mount')!;
const status = document.querySelector<HTMLOutputElement>('#audit-status')!;
const logOutput = document.querySelector<HTMLPreElement>('#audit-log')!;
const buttons = [...document.querySelectorAll<HTMLButtonElement>('.audit-actions button')];
const wait = (ms: number) => new Promise<void>(resolve => setTimeout(resolve, ms));
let root: Root | null = null;
let busy = false;

function log(message: string) {
  logOutput.textContent += `${message}\n`;
}

function mount() {
  if (root) throw new Error('Unmount the prior component before mounting');
  root = createRoot(mountPoint);
  root.render(<Core />);
}

function unmount() {
  root?.unmount();
  root = null;
}

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

async function until(check: () => boolean, description: string, timeout = 12000) {
  const started = performance.now();
  while (!check()) {
    if (performance.now() - started > timeout) throw new Error(`Timed out: ${description}`);
    await wait(40);
  }
}

const sculpture = () => mountPoint.querySelector<HTMLElement>('.hero-sculpture');
const canvas = () => mountPoint.querySelector<HTMLCanvasElement>('canvas.hero-core');
const liveReady = () => sculpture()?.dataset.ready === 'true' && canvas()?.dataset.sculpture === 'ready';
const fallbackVisible = () => {
  const svg = mountPoint.querySelector<SVGSVGElement>('.sculpture-fallback');
  const currentCanvas = canvas();
  return !!svg && !!currentCanvas && sculpture()?.dataset.ready === 'false'
    && Number(getComputedStyle(svg).opacity) > 0.99
    && Number(getComputedStyle(currentCanvas).opacity) < 0.01;
};

async function expectIdle(label: string) {
  await wait(220);
  assert(pendingFrames.size === 0, `${label}: ${pendingFrames.size} animation frames remain pending`);
  const firedBefore = fired;
  await wait(220);
  assert(pendingFrames.size === 0 && fired === firedBefore, `${label}: a scene animation loop restarted after cleanup`);
  log(`${label}: zero pending frames; no callbacks during the observation interval.`);
}

async function check(id: string, action: () => Promise<string>) {
  const row = document.querySelector<HTMLElement>(`[data-check="${id}"]`)!;
  const detail = row.querySelector('span')!;
  row.dataset.state = 'running';
  detail.textContent = 'RUNNING';
  try {
    const result = await action();
    row.dataset.state = 'pass';
    detail.textContent = `PASS — ${result}`;
  } catch (error) {
    row.dataset.state = 'fail';
    detail.textContent = `FAIL — ${error instanceof Error ? error.message : String(error)}`;
    throw error;
  }
}

async function exclusive(action: () => Promise<void>) {
  if (busy) return;
  busy = true;
  buttons.forEach(button => { button.disabled = true; });
  try { await action(); }
  catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    status.textContent = `Check failed: ${message}`;
    log(`FAIL: ${message}`);
  } finally {
    busy = false;
    buttons.forEach(button => { button.disabled = false; });
  }
}

document.querySelector('#run-checks')!.addEventListener('click', () => {
  void exclusive(async () => {
    logOutput.textContent = '';
    for (const row of document.querySelectorAll<HTMLElement>('[data-check]')) {
      row.dataset.state = 'pending';
      row.querySelector('span')!.textContent = 'Not run';
    }
    status.textContent = 'Running actual component lifecycle checks. Keep this tab visible.';
    unmount();
    await expectIdle('Initial cleanup');
    setReducedMotion(false);

    await check('first-frame', async () => {
      mount();
      await until(liveReady, 'the first rendered WebGL frame');
      assert(canvas()!.width > 0 && canvas()!.height > 0, 'Canvas has no drawing buffer');
      return 'Core reported its first rendered frame and revealed its canvas.';
    });

    await check('reduced-motion', async () => {
      setReducedMotion(true);
      await until(fallbackVisible, 'SVG after a simulated reduced-motion change', 6000);
      await expectIdle('Reduced motion');
      return 'Actual preference listener switched to visible SVG and stopped rendering.';
    });

    await check('restoration', async () => {
      setReducedMotion(false);
      await until(liveReady, 'WebGL after restoring the motion preference');
      return 'The same mounted Core created a new working scene.';
    });

    await check('context-loss', async () => {
      const gl = canvas()!.getContext('webgl2');
      assert(gl, 'The active canvas has no WebGL2 context');
      const loss = gl.getExtension('WEBGL_lose_context');
      assert(loss, 'This browser does not expose WEBGL_lose_context; the check cannot run');
      loss.loseContext();
      await until(fallbackVisible, 'SVG after real WebGL context loss', 6000);
      await expectIdle('Lost context');
      return 'WEBGL_lose_context triggered the real handler; SVG is visible and RAF is stopped.';
    });

    await check('cleanup', async () => {
      for (let cycle = 1; cycle <= 3; cycle++) {
        unmount();
        await expectIdle(`Before cycle ${cycle}`);
        mount();
        await until(liveReady, `rendered frame in mount cycle ${cycle}`);
        await wait(120);
        assert(pendingFrames.size > 0, `Cycle ${cycle} never scheduled ongoing animation`);
        unmount();
        assert(mountPoint.childElementCount === 0, `Cycle ${cycle} left component nodes mounted`);
        await expectIdle(`Unmount cycle ${cycle}`);
      }
      return 'All three fresh scenes rendered, then left no nodes or animation callbacks.';
    });

    mount();
    await until(liveReady, 'live view after checks');
    status.textContent = 'PASS — all five checks completed. Live sculpture restored for inspection.';
  });
});

document.querySelector('#show-fallback')!.addEventListener('click', () => {
  void exclusive(async () => {
    unmount();
    setReducedMotion(true);
    mount();
    await until(fallbackVisible, 'fallback-only view', 6000);
    await expectIdle('Fallback-only view');
    status.textContent = 'SVG fallback only — actual Core with simulated reduced motion; no scene RAF running.';
  });
});

document.querySelector('#show-live')!.addEventListener('click', () => {
  void exclusive(async () => {
    unmount();
    setReducedMotion(false);
    mount();
    await until(liveReady, 'live sculpture');
    status.textContent = 'Live sculpture — move the pointer to inspect the material and watch the introductory separation.';
  });
});

setInterval(() => {
  document.querySelector('#raf-metrics')!.textContent = `Animation frames: ${pendingFrames.size} pending · ${scheduled} scheduled · ${fired} fired · ${cancelled} cancelled`;
}, 250);

void exclusive(async () => {
  mount();
  await until(liveReady, 'initial live view');
  status.textContent = 'Live sculpture ready. Run checks to test its actual lifecycle and fallback.';
});
