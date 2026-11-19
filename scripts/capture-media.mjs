// Captures screenshots of each live demo for the project cards and pages.
// Uses the Chrome already installed on this Mac (no browser download).
//   node scripts/capture-media.mjs            all projects
//   node scripts/capture-media.mjs forge loom  just these
// Writes JPGs to public/media/<slug>/ and the list to src/data/media.json.
import puppeteer from 'puppeteer-core';
import { mkdir, readFile, writeFile, rm } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import path from 'node:path';

const CHROME = process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const MEDIA = path.join(ROOT, 'public/media');
const MANIFEST = path.join(ROOT, 'src/data/media.json');
const TMP = path.join(process.env.TMPDIR || tmpdir(), 'dk-capture');

const DEMOS = [
  { slug: 'forge', name: 'Forge', url: 'https://dhanushkrishna4.github.io/Forge/' },
  { slug: 'meridian', name: 'Meridian', url: 'https://dhanushkrishna4.github.io/Meridian/' },
  { slug: 'mycelium', name: 'Mycelium', url: 'https://dhanushkrishna4.github.io/Mycelium/' },
  { slug: 'posterior', name: 'Posterior', url: 'https://dhanushkrishna4.github.io/Posterior/' },
  { slug: 'loom', name: 'Loom', url: 'https://dhanushkrishna4.github.io/Loom/' },
  { slug: 'escapement', name: 'Escapement', url: 'https://dhanushkrishna4.github.io/Escapement/' },
  { slug: 'orrery', name: 'Orrery', url: 'https://dhanushkrishna4.github.io/Orrery/' },
  { slug: 'lucida', name: 'Lucida', url: 'https://dhanushkrishna4.github.io/Lucida/' },
];

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// PNG -> JPG, longest side capped.
function toJpg(png, jpg, maxSide) {
  execFileSync('sips', ['-s', 'format', 'jpeg', '-s', 'formatOptions', '82', '-Z', String(maxSide), png, '--out', jpg], { stdio: 'ignore' });
  const out = execFileSync('sips', ['-g', 'pixelWidth', '-g', 'pixelHeight', jpg]).toString();
  const w = Number(/pixelWidth: (\d+)/.exec(out)[1]);
  const h = Number(/pixelHeight: (\d+)/.exec(out)[1]);
  return { w, h };
}

async function shoot(page, file) {
  await page.screenshot({ path: file, type: 'png' });
}

// Waits until the demo stops saying it is loading (Pyodide, WASM, models).
async function waitReady(page, maxMs = 60000) {
  const start = Date.now();
  while (Date.now() - start < maxMs) {
    const loading = await page.evaluate(() =>
      /loading python runtime|preparing your|preparing a place|loading pyodide|loading runtime|initiali[sz]ing|loading wasm|loading\.\.\.|loading…/i.test(document.body.innerText),
    );
    if (!loading) return true;
    await sleep(1000);
  }
  return false;
}

// Presses the demo's main action so the screenshot shows it working.
async function runDemo(page) {
  return page.evaluate(() => {
    const re = /^(train model|train|run query|run sampler|run sampling|run simulation|run|grow|start|render|simulate|sample|discover|execute|play|step)\b/i;
    const buttons = [...document.querySelectorAll('button, [role="button"]')].filter(
      (b) => !b.disabled && b.offsetParent && re.test((b.innerText || b.getAttribute('aria-label') || '').trim()),
    );
    const b = buttons[0];
    if (!b) return null;
    b.scrollIntoView({ block: 'center' });
    b.click();
    return (b.innerText || b.getAttribute('aria-label')).trim();
  });
}

async function capture(browser, demo) {
  const dir = path.join(MEDIA, demo.slug);
  const tmp = path.join(TMP, demo.slug);
  await rm(dir, { recursive: true, force: true });
  await mkdir(dir, { recursive: true });
  await mkdir(tmp, { recursive: true });
  const shots = [];

  const page = await browser.newPage();
  await page.setViewport({ width: 1600, height: 1000, deviceScaleFactor: 1 });
  await page.goto(demo.url, { waitUntil: 'networkidle2', timeout: 120000 });
  await sleep(3000);
  const ready = await waitReady(page);
  const action = ready ? await runDemo(page) : null;
  await sleep(action ? 9000 : 2000);
  await page.evaluate(() => window.scrollTo(0, 0));
  await sleep(1200);
  process.stdout.write(`${ready ? 'ready' : 'still loading'}${action ? `, pressed "${action}"` : ''} … `);

  // 1: top of the page (also the card cover)
  await shoot(page, path.join(tmp, '1.png'));
  shots.push({ n: 1, max: 1600, alt: `${demo.name} demo, top of the page`, cover: true });

  const height = await page.evaluate(() => document.documentElement.scrollHeight);
  const room = Math.max(0, height - 1000);
  const stops = room > 600 ? [0.34, 0.7] : room > 0 ? [1] : [];
  let n = 2;
  for (const s of stops) {
    await page.evaluate((y) => window.scrollTo(0, y), Math.round(room * s));
    await sleep(2200);
    await shoot(page, path.join(tmp, `${n}.png`));
    shots.push({ n, max: 1600, alt: `${demo.name} demo, further down the page` });
    n++;
  }

  // A phone-sized view gives the gallery a tall image.
  await page.setViewport({ width: 430, height: 900, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  await page.evaluate(() => window.scrollTo(0, 0));
  await sleep(3500);
  await shoot(page, path.join(tmp, `${n}.png`));
  shots.push({ n, max: 1400, alt: `${demo.name} demo on a phone-sized screen` });
  await page.close();

  const list = [];
  for (const s of shots) {
    const jpg = path.join(dir, `${s.n}.jpg`);
    const { w, h } = toJpg(path.join(tmp, `${s.n}.png`), jpg, s.max);
    list.push({ src: `/media/${demo.slug}/${s.n}.jpg`, w, h, alt: s.alt, ...(s.cover ? { cover: true } : {}) });
  }
  return list;
}

const only = process.argv.slice(2);
const manifest = JSON.parse(await readFile(MANIFEST, 'utf8').catch(() => '{}'));
const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: true,
  args: ['--hide-scrollbars', '--force-color-profile=srgb', '--enable-unsafe-webgpu', '--ignore-gpu-blocklist', '--enable-gpu-rasterization'],
});

try {
  for (const demo of DEMOS.filter((d) => !only.length || only.includes(d.slug))) {
    process.stdout.write(`${demo.slug} … `);
    try {
      manifest[demo.slug] = await capture(browser, demo);
      console.log(`${manifest[demo.slug].length} images`);
    } catch (err) {
      console.log(`failed: ${err.message}`);
    }
  }
} finally {
  await browser.close();
}

await writeFile(MANIFEST, `${JSON.stringify(manifest, null, 2)}\n`);
console.log('Wrote', path.relative(ROOT, MANIFEST));
