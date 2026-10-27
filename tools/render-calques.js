// Pre-rend en PNG les calques statiques (layers/*.svg) utilises par les calques du fond d'Elwe
// (user/Elwe/elements/fantasiemap/background/calque-*.svg), puis y remplace chaque <image> SVG
// par son PNG. Pourquoi : dans un SVG, chaque animation (lumiere, fanion, fumee...) fait
// re-rasteriser la zone qu'elle touche, y compris les batiments en dessous ; en vectoriel avec
// leurs filtres de turbulence, ce re-raster occupait un thread a plein temps (~850 ms/s pour le
// village). Un PNG ne coute qu'une copie de pixels.
// Chaque PNG est recadre sur ses pixels non transparents (moins de memoire dans Streamlabs).
// Le <image> garde le SVG d'origine dans data-source : relancer apres toute modification d'un
// fichier de layers/ (node render-calques.js, ou rendu-calques.bat a la racine).
const fs = require('fs');
const os = require('os');
const path = require('path');
const { pathToFileURL } = require('url');
const puppeteer = require('puppeteer-core');

const W = 3840, H = 2160;
const BG = path.resolve(__dirname, '../user/Elwe/elements/fantasiemap/background');
const CHROME = ['C:/Program Files/Google/Chrome/Application/chrome.exe',
                'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'].find(fs.existsSync);
// <image href="layers/x.svg" ...> (premier passage) ou <image data-source="layers/x.svg" ...>
const IMAGE = /<image (?:data-source="(layers\/[^"]+\.svg)" href="[^"]*"|href="(layers\/[^"]+\.svg)") x="[^"]*" y="[^"]*" width="[^"]*" height="[^"]*"/g;

(async () => {
  const calques = fs.readdirSync(BG).filter(f => /^calque-.*\.svg$/.test(f));
  const sources = new Set();
  calques.forEach(f => { for (const m of fs.readFileSync(path.join(BG, f), 'utf8').matchAll(IMAGE)) sources.add(m[1] || m[2]); });

  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'calques-'));
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: true, args: ['--allow-file-access-from-files'] });
  const page = await browser.newPage();
  await page.setViewport({ width: W, height: H });
  const boites = {};
  for (const src of sources) {
    // Rendu en <img>, comme un <image> : memes regles (pas de script ni de ressource externe).
    const html = path.join(tmp, 'rendu.html');
    fs.writeFileSync(html, `<!DOCTYPE html><style>html,body{margin:0;background:transparent}img{display:block}</style>` +
      `<img src="${pathToFileURL(path.join(BG, src)).href}" width="${W}" height="${H}">`);
    await page.goto(pathToFileURL(html).href, { waitUntil: 'load' });
    await page.evaluate(() => document.querySelector('img').decode());
    const plein = await page.screenshot({ omitBackground: true, encoding: 'base64' });
    // Boite des pixels non transparents (lue sur la capture : une image data: ne "salit" pas le canvas).
    const b = await page.evaluate(async (data, W, H) => {
      const img = new Image(); img.src = 'data:image/png;base64,' + data; await img.decode();
      const c = document.createElement('canvas'); c.width = W; c.height = H;
      const ctx = c.getContext('2d'); ctx.drawImage(img, 0, 0);
      const a = ctx.getImageData(0, 0, W, H).data;
      let x0 = W, y0 = H, x1 = -1, y1 = -1;
      for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (a[(y * W + x) * 4 + 3]) {
        if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y;
      }
      return x1 < 0 ? null : { x: x0, y: y0, width: x1 - x0 + 1, height: y1 - y0 + 1 };
    }, plein, W, H);
    if (!b) { console.log(src, ': vide, ignore'); continue; }
    const png = src.replace(/^layers\//, 'layers-png/').replace(/\.svg$/, '.png');
    fs.mkdirSync(path.dirname(path.join(BG, png)), { recursive: true });
    await page.screenshot({ path: path.join(BG, png), omitBackground: true, clip: b });
    boites[src] = { png, b };
    console.log(png.padEnd(48), `${b.width}x${b.height} en (${b.x},${b.y})`, (fs.statSync(path.join(BG, png)).size / 1024).toFixed(0) + ' Ko');
  }
  await browser.close();
  fs.rmSync(tmp, { recursive: true, force: true });

  calques.forEach(f => {
    const p = path.join(BG, f);
    const txt = fs.readFileSync(p, 'utf8').replace(IMAGE, (tout, a, c) => {
      const r = boites[a || c];
      if (!r) return tout;
      return `<image data-source="${a || c}" href="${r.png}" x="${r.b.x}" y="${r.b.y}" width="${r.b.width}" height="${r.b.height}"`;
    });
    fs.writeFileSync(p, txt);
  });
  console.log('Calques mis a jour :', calques.join(', '));
})();
