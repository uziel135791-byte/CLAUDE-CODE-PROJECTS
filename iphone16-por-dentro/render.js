// Renderiza la animación cuadro por cuadro en Chromium sin interfaz y la codifica con ffmpeg.
//   node render.js preview 3 18 30            -> PNG en ./preview/ en esos segundos
//   node render.js video <inicio> <fin> <salida.mp4>   -> segmento de video (30 fps)
const http = require('http');
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const { chromium } = require('playwright');

const ROOT = __dirname;
const FPS = 30;
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json' };

function serve() {
  const server = http.createServer((req, res) => {
    let p = decodeURIComponent(req.url.split('?')[0]);
    if (p === '/') p = '/index.html';
    const f = path.join(ROOT, p);
    if (!f.startsWith(ROOT)) { res.writeHead(403); return res.end(); }
    fs.readFile(f, (err, data) => {
      if (err) { res.writeHead(404); return res.end(); }
      res.writeHead(200, { 'Content-Type': TYPES[path.extname(f)] || 'application/octet-stream' });
      res.end(data);
    });
  });
  return new Promise((r) => server.listen(0, '127.0.0.1', () => r(server)));
}

async function open(server) {
  const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
  page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') console.error('[page]', m.text()); });
  page.on('pageerror', (e) => console.error('[pageerror]', e.message));
  await page.goto(`http://127.0.0.1:${server.address().port}/index.html`);
  await page.waitForFunction(() => window.READY === true, null, { timeout: 120000 });
  return { browser, page };
}

(async () => {
  const [mode, ...args] = process.argv.slice(2);
  const server = await serve();
  const { browser, page } = await open(server);
  const duration = await page.evaluate(() => window.DURATION);
  if (mode === 'duration') console.log(duration);

  if (mode === 'preview') {
    fs.mkdirSync(path.join(ROOT, 'preview'), { recursive: true });
    for (const s of args.map(Number)) {
      await page.evaluate((t) => window.renderAt(t), s);
      const out = path.join(ROOT, 'preview', `t${String(s.toFixed(1)).padStart(6, '0')}.png`);
      await page.screenshot({ path: out });
      console.log(out);
    }
  }

  if (mode === 'video') {
    const start = Number(args[0]), end = Math.min(Number(args[1]), duration), out = args[2];
    const f0 = Math.round(start * FPS), f1 = Math.round(end * FPS);
    const ff = spawn('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(FPS), '-c:v', 'png', '-i', '-',
      '-c:v', 'libx264', '-preset', 'medium', '-crf', '15', '-pix_fmt', 'yuv420p', '-r', String(FPS), out], { stdio: ['pipe', 'inherit', 'inherit'] });
    const t0 = Date.now();
    for (let f = f0; f < f1; f++) {
      await page.evaluate((t) => window.renderAt(t), f / FPS);
      const buf = await page.screenshot({ type: 'png' });
      if (!ff.stdin.write(buf)) await new Promise((r) => ff.stdin.once('drain', r));
      if ((f - f0) % 60 === 0) console.log(`${out}: cuadro ${f - f0 + 1}/${f1 - f0} · ${((Date.now() - t0) / 1000).toFixed(0)} s`);
    }
    ff.stdin.end();
    await new Promise((r) => ff.on('close', r));
    console.log(`${out}: listo en ${((Date.now() - t0) / 1000).toFixed(0)} s`);
  }

  await browser.close();
  server.close();
})().catch((e) => { console.error(e); process.exit(1); });
