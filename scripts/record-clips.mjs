// Records a short clip of each live demo in use, for the first slot of its
// project page's gallery (the screenshots follow; see capture-media.mjs).
// Uses the Chrome already installed on this Mac and Chrome's own H.264
// encoder, so no ffmpeg is needed.
//   node scripts/record-clips.mjs            all demos
//   node scripts/record-clips.mjs forge loom  just these
// Loom needs its model (Qwen2.5-0.5B-Instruct, q4_k_m GGUF, about 491 MB,
// from huggingface.co/Qwen/Qwen2.5-0.5B-Instruct-GGUF). Its in-page download
// fails in headless Chrome, so point LOOM_MODEL at a downloaded copy:
//   LOOM_MODEL=~/Downloads/qwen2.5-0.5b-instruct-q4_k_m.gguf node scripts/record-clips.mjs loom
// Without it, Loom is skipped.
// Writes public/media/<slug>/clip.mp4 (1280x800, 30fps) and clip.jpg (its
// poster), and puts the clip first in that project's list in
// src/data/media.json.
import puppeteer from 'puppeteer-core';
import { createServer } from 'node:http';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

const CHROME = process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const MEDIA = path.join(ROOT, 'public/media');
const MANIFEST = path.join(ROOT, 'src/data/media.json');
// The muxer's browser build (its package exports don't list the file).
const MUXER = path.join(ROOT, 'node_modules/mp4-muxer/build/mp4-muxer.js');
const W = 1600; // recorded at the screenshots' size
const H = 1000;
const OW = 1280; // encoded size
const OH = 800;
const FPS = 30;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const url = (name) => `https://dhanushkrishna4.github.io/${name}/`;

// Presses the first enabled button or link whose text matches, with a real
// mouse click where it is on screen (some demos listen for pointer presses).
const press = async (page, re) => {
  const hit = await page.evaluate((src) => {
    const re = new RegExp(src, 'i');
    const b = [...document.querySelectorAll('button, [role="button"], a')].find(
      (e) => re.test((e.innerText || e.getAttribute('aria-label') || '').trim()) && !e.disabled && e.offsetParent,
    );
    if (!b) return null;
    const r = b.getBoundingClientRect();
    const on = r.top >= 0 && r.bottom <= innerHeight && r.left >= 0 && r.right <= innerWidth;
    if (!on) b.click();
    return { on, x: r.left + r.width / 2, y: r.top + r.height / 2, text: (b.innerText || b.getAttribute('aria-label') || '').trim() };
  }, re.source);
  if (hit?.on) await page.mouse.click(hit.x, hit.y);
  return hit?.text ?? null;
};

// Picks the option matching `match` in whichever <select> has one.
const choose = (page, match) =>
  page.evaluate((src) => {
    const re = new RegExp(src, 'i');
    const s = [...document.querySelectorAll('select')].find((e) => [...e.options].some((o) => re.test(o.text)));
    if (!s) return null;
    const o = [...s.options].find((x) => re.test(x.text));
    s.value = o.value;
    s.dispatchEvent(new Event('input', { bubbles: true }));
    s.dispatchEvent(new Event('change', { bubbles: true }));
    return o.text;
  }, match.source);

// Types a value into a number field found by its label.
const fill = (page, label, value) =>
  page.evaluate(
    (src, value) => {
      const re = new RegExp(src, 'i');
      const i = [...document.querySelectorAll('input')].find((e) => re.test(e.getAttribute('aria-label') || e.name || e.id || e.closest('label')?.innerText || ''));
      if (!i) return false;
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(i, value);
      i.dispatchEvent(new Event('input', { bubbles: true }));
      i.dispatchEvent(new Event('change', { bubbles: true }));
      return true;
    },
    label.source,
    value,
  );

// What each demo does on camera. `before` sets it up off camera; `run` is
// recorded, in real time.
const DEMOS = {
  forge: {
    name: 'Forge',
    before: async (p) => {
      await press(p, /^configure experiment/);
      await sleep(600);
      await press(p, /spiral/);
      await sleep(400);
      // A gentler learning rate, so the spiral boundary forms over seconds.
      await fill(p, /learning rate/, '0.002');
      await sleep(400);
      await press(p, /^close experiment settings/);
      await sleep(600);
      await press(p, /^reset experiment/);
    },
    run: async (p) => {
      await sleep(700);
      await press(p, /^train model/);
      await sleep(11500);
    },
  },
  // Flips between the three causal explanations of the same data, then
  // scrolls down and replays how the discovery reached its graph.
  meridian: {
    name: 'Meridian',
    run: async (p) => {
      await sleep(600);
      await press(p, /^notears$/);
      await sleep(1600);
      await press(p, /^selected model$/);
      await sleep(1600);
      await press(p, /^pc-stable$/);
      await sleep(1300);
      await p.evaluate(() => window.scrollTo({ top: 1180, behavior: 'smooth' }));
      await sleep(1500);
      await press(p, /^replay$/);
      await sleep(5200);
    },
  },
  // Its point: damage heals. A stroke erases part of the ring and it grows
  // back; then the rosette, cut and regrown the same way.
  mycelium: {
    name: 'Mycelium',
    run: async (p) => {
      // A drag across the culture (32x32 cells at x 862-1218, y 395-755).
      const cut = async (x0, y0, x1, y1) => {
        await p.mouse.move(x0, y0);
        await p.mouse.down();
        for (let i = 1; i <= 16; i++) {
          await p.mouse.move(x0 + ((x1 - x0) * i) / 16, y0 + ((y1 - y0) * i) / 16);
          await sleep(30);
        }
        await p.mouse.up();
      };
      await sleep(700);
      await cut(930, 470, 1150, 690);
      await sleep(3300);
      await press(p, /^rosette$/);
      await sleep(2600);
      await cut(1150, 470, 930, 690);
      await sleep(3600);
    },
  },
  // Picks the two-mode problem with the chart in view, runs inference and
  // lets the samples land, then shows the sampler's path.
  posterior: {
    name: 'Posterior',
    before: async (p) => {
      await press(p, /^05\s*find the missing mode/);
      await sleep(1500);
      await p.evaluate(() => window.scrollTo(0, 430));
      await sleep(600);
    },
    run: async (p) => {
      await sleep(600);
      await press(p, /^run inference/);
      await sleep(7200);
      await press(p, /^trajectory$/);
      await sleep(4400);
    },
  },
  // Loads the model from a local file, turns on attention capture, then
  // generates a paragraph while the attention, distribution, KV cache and
  // timing charts fill in.
  loom: {
    name: 'Loom',
    needs: () => (process.env.LOOM_MODEL ? null : 'set LOOM_MODEL to the downloaded .gguf file'),
    before: async (p) => {
      const input = await p.$('#file');
      await input.uploadFile(process.env.LOOM_MODEL.replace(/^~(?=\/)/, process.env.HOME));
      for (let i = 0; i < 120; i++) {
        if (await p.evaluate(() => /ready in/i.test(document.body.innerText) && !!document.querySelector('#run')?.offsetParent)) break;
        await sleep(1000);
      }
      await p.evaluate(() => {
        const set = (sel, v) => {
          const e = document.querySelector(sel);
          if (!e) return;
          const proto = e.tagName === 'TEXTAREA' ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
          Object.getOwnPropertyDescriptor(proto, 'value').set.call(e, v);
          e.dispatchEvent(new Event('input', { bubbles: true }));
          e.dispatchEvent(new Event('change', { bubbles: true }));
        };
        set('#prompt', 'In a short paragraph, explain what quantising a neural network does to its weights.');
        set('#ntok', '200');
        const capture = document.querySelector('#capture');
        if (capture && !capture.checked) capture.click();
      });
      await p.evaluate(() => window.scrollTo(0, 1440));
      await sleep(800);
    },
    run: async (p) => {
      await sleep(600);
      await press(p, /^generate$/);
      await sleep(4800);
      await p.evaluate(() => window.scrollTo({ top: 1880, behavior: 'smooth' }));
      await sleep(6800);
    },
  },
  // Plays the Raft replay with the whole cluster in view, then crashes the
  // leader (node 4: the run is deterministic for seed 1) to force an election.
  escapement: {
    name: 'Escapement',
    before: async (p) => {
      await press(p, /^restart$/);
      await sleep(400);
      await p.evaluate(() => window.scrollTo(0, 470));
      await sleep(600);
    },
    run: async (p) => {
      await sleep(600);
      await press(p, /^play$/);
      await sleep(5200);
      await press(p, /^crash$/);
      await sleep(350);
      await p.mouse.click(210, 418);
      await sleep(6300);
    },
  },
  // With the built-in tables: picks a query, runs it, then steps through
  // the pipeline (parse tree, bound plan, physical plan, execution).
  orrery: {
    name: 'Orrery',
    before: async (p) => { await p.evaluate(() => window.scrollTo(0, 1740)); await sleep(800); },
    run: async (p) => {
      await sleep(600);
      await p.evaluate(() => {
        const s = [...document.querySelectorAll('select')].find((e) => [...e.options].some((o) => /filter and a sort/i.test(o.text)));
        if (!s) return;
        const o = [...s.options].find((x) => /join/i.test(x.text)) || s.options[Math.min(2, s.options.length - 1)];
        s.value = o.value;
        s.dispatchEvent(new Event('input', { bubbles: true }));
        s.dispatchEvent(new Event('change', { bubbles: true }));
      });
      await sleep(1300);
      await press(p, /^run$/);
      await sleep(2200);
      await press(p, /^3\s*parse tree/);
      await sleep(1900);
      await press(p, /^4\s*bound plan/);
      await sleep(1900);
      await press(p, /^6\s*physical plan/);
      await sleep(1900);
      await press(p, /^7\s*execution/);
      await sleep(2300);
    },
  },
  // Restarts the path tracer's accumulation, so the noise clears on camera,
  // then switches to the glass scene.
  lucida: {
    name: 'Lucida',
    before: async (p) => { await sleep(2500); },
    run: async (p) => {
      await sleep(500);
      await press(p, /^reset accumulation/);
      await sleep(6200);
      await choose(p, /^glass-box/);
      await sleep(6000);
    },
  },
};

// Waits until the demo stops saying it is loading (Pyodide, WASM, models).
async function waitReady(page, maxMs = 90000) {
  const start = Date.now();
  while (Date.now() - start < maxMs) {
    const loading = await page.evaluate(() =>
      /loading python|preparing your|preparing a place|loading pyodide|loading runtime|initiali[sz]ing|loading wasm|loading\.\.\.|loading…/i.test(document.body.innerText),
    );
    if (!loading) return;
    await sleep(1000);
  }
}

async function record(browser, encoderUrl, slug) {
  const demo = DEMOS[slug];
  const page = await browser.newPage();
  await page.setViewport({ width: W, height: H, deviceScaleFactor: 1 });
  await page.goto(url(demo.name), { waitUntil: 'networkidle2', timeout: 120000 });
  await waitReady(page);
  await demo.before?.(page);
  await sleep(1500);

  // Real-time screencast frames while the demo runs.
  const client = await page.target().createCDPSession();
  const frames = [];
  client.on('Page.screencastFrame', async (f) => {
    frames.push([f.metadata.timestamp, f.data]);
    try {
      await client.send('Page.screencastFrameAck', { sessionId: f.sessionId });
    } catch {}
  });
  await client.send('Page.startScreencast', { format: 'jpeg', quality: 90, maxWidth: W, maxHeight: H, everyNthFrame: 1 });
  await sleep(400);
  const t0 = Date.now() / 1000;
  await demo.run(page);
  const t1 = Date.now() / 1000;
  await client.send('Page.stopScreencast');
  await page.close();

  // A steady 30fps: each output frame shows the latest frame captured by then.
  const list = frames.filter(([t]) => t <= t1).sort((a, b) => a[0] - b[0]);
  const count = Math.floor((t1 - t0) * FPS);
  const picks = [];
  for (let i = 0, j = 0; i < count; i++) {
    while (j < list.length - 1 && list[j + 1][0] <= t0 + i / FPS) j++;
    picks.push(j);
  }

  const dir = path.join(MEDIA, slug);
  await mkdir(dir, { recursive: true });
  // Poster: the frame a second in.
  const poster = Buffer.from(list[picks[Math.min(picks.length - 1, FPS)]][1], 'base64');
  await sharp(poster).resize(OW, OH).jpeg({ quality: 82, mozjpeg: true }).toFile(path.join(dir, 'clip.jpg'));

  // Encode with WebCodecs on a local page (it needs a secure origin).
  const enc = await browser.newPage();
  await enc.goto(encoderUrl);
  await enc.addScriptTag({ content: await readFile(MUXER, 'utf8') });
  await enc.evaluate(
    (OW, OH, FPS) => {
      const target = new Mp4Muxer.ArrayBufferTarget();
      const muxer = new Mp4Muxer.Muxer({ target, video: { codec: 'avc', width: OW, height: OH, frameRate: FPS }, fastStart: 'in-memory' });
      const encoder = new VideoEncoder({ output: (chunk, meta) => muxer.addVideoChunk(chunk, meta), error: (e) => (window.__err = String(e)) });
      encoder.configure({ codec: 'avc1.640028', width: OW, height: OH, bitrate: 3_000_000, framerate: FPS, latencyMode: 'quality', avc: { format: 'avc' } });
      const canvas = new OffscreenCanvas(OW, OH);
      const ctx = canvas.getContext('2d');
      ctx.imageSmoothingQuality = 'high';
      window.__enc = { muxer, encoder, target, canvas, ctx, i: 0, bitmaps: {} };
    },
    OW,
    OH,
    FPS,
  );
  for (let start = 0; start < picks.length; start += 24) {
    const batch = picks.slice(start, start + 24);
    const data = Object.fromEntries([...new Set(batch)].map((k) => [k, list[k][1]]));
    const keep = [...new Set(picks.slice(start + 24, start + 48))];
    await enc.evaluate(
      async (batch, data, keep, FPS) => {
        const E = window.__enc;
        for (const [k, b64] of Object.entries(data)) {
          if (E.bitmaps[k]) continue;
          const bytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
          E.bitmaps[k] = await createImageBitmap(new Blob([bytes], { type: 'image/jpeg' }));
        }
        for (const k of batch) {
          E.ctx.drawImage(E.bitmaps[k], 0, 0, E.canvas.width, E.canvas.height);
          const frame = new VideoFrame(E.canvas, { timestamp: Math.round((E.i * 1e6) / FPS), duration: Math.round(1e6 / FPS) });
          E.encoder.encode(frame, { keyFrame: E.i % (FPS * 2) === 0 });
          frame.close();
          E.i++;
          for (let w = 0; E.encoder.encodeQueueSize > 8 && w < 2000 && !window.__err; w++) await new Promise((r) => setTimeout(r, 5));
        }
        for (const k of Object.keys(E.bitmaps)) {
          if (!keep.includes(+k)) {
            E.bitmaps[k].close();
            delete E.bitmaps[k];
          }
        }
      },
      batch,
      data,
      keep,
      FPS,
    );
  }
  const out = await enc.evaluate(async () => {
    const E = window.__enc;
    await E.encoder.flush();
    E.muxer.finalize();
    const bytes = new Uint8Array(E.target.buffer);
    let s = '';
    for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
    return { data: btoa(s), err: window.__err || null };
  });
  await enc.close();
  if (out.err) throw new Error(out.err);
  const mp4 = Buffer.from(out.data, 'base64');
  await writeFile(path.join(dir, 'clip.mp4'), mp4);
  return { frames: picks.length, mb: mp4.length / 1e6 };
}

const only = process.argv.slice(2);
const manifest = JSON.parse(await readFile(MANIFEST, 'utf8').catch(() => '{}'));
const server = createServer((req, res) => res.end('<!doctype html><title>encoder</title>')).listen(0, '127.0.0.1');
await new Promise((r) => server.once('listening', r));
const encoderUrl = `http://127.0.0.1:${server.address().port}/`;
const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: true,
  args: ['--hide-scrollbars', '--force-color-profile=srgb', '--enable-unsafe-webgpu', '--ignore-gpu-blocklist', '--enable-gpu-rasterization'],
});

try {
  for (const slug of Object.keys(DEMOS).filter((s) => !only.length || only.includes(s))) {
    process.stdout.write(`${slug} … `);
    const missing = DEMOS[slug].needs?.();
    if (missing) {
      console.log(`skipped: ${missing}`);
      continue;
    }
    try {
      const limit = new Promise((_, reject) => setTimeout(() => reject(new Error('timed out after 4 minutes')), 240000));
      const { frames, mb } = await Promise.race([record(browser, encoderUrl, slug), limit]);
      const list = (manifest[slug] ?? []).filter((m) => !m.video);
      list.unshift({ src: `/media/${slug}/clip.mp4`, poster: `/media/${slug}/clip.jpg`, w: OW, h: OH, alt: `${DEMOS[slug].name} demo in use`, video: true });
      manifest[slug] = list;
      console.log(`${frames} frames, ${mb.toFixed(1)} MB`);
    } catch (err) {
      console.log(`failed: ${err.message}`);
    }
  }
} finally {
  await browser.close();
  server.close();
}

await writeFile(MANIFEST, `${JSON.stringify(manifest, null, 2)}\n`);
console.log('Wrote', path.relative(ROOT, MANIFEST));
