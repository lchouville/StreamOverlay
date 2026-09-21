// Exporte chaque alerte en WebM (VP9 + alpha), 350x80, pour une source Media dans OBS.
// Usage : node export-webm.js [--ms 4000] [--fps 30] [--scale 1]
// Les animations CSS sont figees puis avancees image par image : rendu fluide et deterministe.
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');
const { pathToFileURL } = require('url');
const puppeteer = require('puppeteer-core');
const ffmpeg = require('ffmpeg-static');

const arg = (n, d) => { const i = process.argv.indexOf('--' + n); return i > 0 ? Number(process.argv[i + 1]) : d; };
const MS = arg('ms', 4000);        // duree de la video
const FPS = arg('fps', 30);
const SCALE = arg('scale', 1);
const W = 350, H = 80;
const TYPES = ['follow', 'newfollower', 'gift', 'donation'];
const CHROME = ['C:/Program Files/Google/Chrome/Application/chrome.exe',
                'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'].find(fs.existsSync);

// ms=10 minutes : la page ne retire pas la box pendant la capture.
const page_url = pathToFileURL(path.resolve(__dirname, '../overlay/alert-popup.html')).href + '?ms=600000';
const outDir = path.resolve(__dirname, '../export');
fs.mkdirSync(outDir, { recursive: true });

(async () => {
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: true, args: ['--allow-file-access-from-files'] });
  for (const type of TYPES) {
    const page = await browser.newPage();
    await page.setViewport({ width: W, height: H, deviceScaleFactor: SCALE });
    await page.goto(page_url, { waitUntil: 'networkidle0' });
    await page.evaluate(() => document.fonts.ready);

    await page.evaluate(t => window.pushAlert(ALERT_DEMO[t]), type);
    // fige toutes les animations (y compris ::before / ::after)
    await page.evaluate(() => document.getAnimations().forEach(a => a.pause()));

    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), `alert-${type}-`));
    const frames = Math.round(MS / 1000 * FPS);
    for (let i = 0; i < frames; i++) {
      await page.evaluate(t => document.getAnimations().forEach(a => { a.currentTime = t; }), i * 1000 / FPS);
      await page.screenshot({ path: path.join(tmp, `f${String(i).padStart(4, '0')}.png`), omitBackground: true });
    }

    const out = path.join(outDir, `${type}.webm`);
    const r = spawnSync(ffmpeg, ['-y', '-framerate', String(FPS), '-i', path.join(tmp, 'f%04d.png'),
      '-c:v', 'libvpx-vp9', '-pix_fmt', 'yuva420p', '-auto-alt-ref', '0', '-b:v', '0', '-crf', '20', out], { encoding: 'utf8' });
    if (r.status !== 0) { console.error(r.stderr); process.exit(1); }
    fs.rmSync(tmp, { recursive: true, force: true });
    console.log(`${type}.webm  ${frames} frames  ${(fs.statSync(out).size / 1024).toFixed(0)} Ko`);
    await page.close();
  }
  await browser.close();
})();
