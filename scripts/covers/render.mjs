// Draws the project cards' cover pictures (scripts/covers/scenes/<slug>.js),
// each with a depth map for the cards' hover (near is dark, far is light),
// with the Chrome already on this Mac.
//   node scripts/covers/render.mjs                 every scene, into the site
//   node scripts/covers/render.mjs forge loom      just these
//   node scripts/covers/render.mjs --preview forge  a quick 800px look, as PNGs
//                                                   in $TMPDIR/dk-covers
// Into the site: public/media/<slug>/card.webp (1600 x 1040),
// public/media/<slug>/card-depth.webp (800 x 520), and src/data/card-art.json.
import { createServer } from 'node:http';
import { readFile, writeFile, mkdir, readdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import puppeteer from 'puppeteer-core';
import sharp from 'sharp';

const CHROME = process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const HERE = path.dirname(new URL(import.meta.url).pathname);
const ROOT = path.resolve(HERE, '../..');
const MANIFEST = path.join(ROOT, 'src/data/card-art.json');

const args = process.argv.slice(2);
const preview = args.includes('--preview');
let names = args.filter((a) => !a.startsWith('--'));
if (!names.length) names = (await readdir(path.join(HERE, 'scenes'))).filter((f) => f.endsWith('.js')).map((f) => f.slice(0, -3)).sort();
const W = preview ? 800 : 1600;
const H = Math.round((W * 13) / 20); // the cards' picture box is 20:13
const OUT = preview ? path.join(process.env.TMPDIR || tmpdir(), 'dk-covers') : null;

// The lab page, its library and the scenes, served from this folder.
const types = { '.html': 'text/html', '.js': 'text/javascript' };
const server = createServer(async (req, res) => {
  const file = path.join(HERE, decodeURIComponent(req.url.split('?')[0]));
  if (!file.startsWith(HERE)) return res.writeHead(403).end();
  try {
    const body = await readFile(file);
    res.writeHead(200, { 'content-type': types[path.extname(file)] || 'application/octet-stream', 'cache-control': 'no-store' });
    res.end(body);
  } catch {
    res.writeHead(404).end();
  }
});
await new Promise((r) => server.listen(0, r));
const port = server.address().port;

const manifest = JSON.parse(await readFile(MANIFEST, 'utf8').catch(() => '{}'));
const browser = await puppeteer.launch({ executablePath: CHROME, headless: true, args: ['--ignore-gpu-blocklist', '--force-color-profile=srgb'] });
try {
  if (OUT) await mkdir(OUT, { recursive: true });
  for (const name of names) {
    const page = await browser.newPage();
    const errors = [];
    page.on('pageerror', (e) => errors.push(String(e)));
    await page.goto(`http://localhost:${port}/lab.html?cover=${name}&w=${W}&h=${H}`);
    await page.waitForFunction(() => window.__result, { timeout: 120000 });
    const res = await page.evaluate(() => window.__result);
    await page.close();
    if (res.error || errors.length) {
      console.error(`${name}: ${res.error || errors.join('\n')}`);
      process.exitCode = 1;
      continue;
    }
    const color = Buffer.from(res.color.split(',')[1], 'base64');
    const depth = Buffer.from(res.depth.split(',')[1], 'base64');
    if (OUT) {
      await writeFile(path.join(OUT, `${name}.png`), color);
      await sharp(depth).greyscale().png().toFile(path.join(OUT, `${name}-depth.png`));
      console.log(`${name}: ${path.join(OUT, name + '.png')}`);
      continue;
    }
    const dir = path.join(ROOT, 'public/media', name);
    await mkdir(dir, { recursive: true });
    await sharp(color).webp({ quality: 86, effort: 6 }).toFile(path.join(dir, 'card.webp'));
    await sharp(depth).greyscale().resize(W / 2, H / 2).webp({ quality: 90, effort: 6 }).toFile(path.join(dir, 'card-depth.webp'));
    manifest[name] = { src: `/media/${name}/card.webp`, depth: `/media/${name}/card-depth.webp`, w: W, h: H };
    console.log(`${name}: public/media/${name}/card.webp`);
  }
  if (!OUT) {
    const sorted = Object.fromEntries(Object.keys(manifest).sort().map((k) => [k, manifest[k]]));
    await writeFile(MANIFEST, JSON.stringify(sorted, null, 2) + '\n');
  }
} finally {
  await browser.close();
  server.close();
}
