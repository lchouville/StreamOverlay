// Calque 3 : champs de ble, herbe, forets et chemin du moulin.
// Modules repris du script de ville-medievale-croquis.svg ; outils communs (cfg, cfgMs,
// heureVirtuelle, setAttrSiChange...) et cycle jour/nuit dans calques-commun.js.
window.addEventListener('load', function () {
    (function () {
      // Champs de ble sur les collines (calque 02-hill-bg.svg), herbe, forets et chemin du moulin
      // (calque 02-buildings/02-windmill-bg.svg, porte en (1990,560)). Les epis sont plantes en rangs qui
      // suivent la crete (perspective : rangs et epis de plus en plus espaces/grands vers le
      // bas), avec la teinte de la parcelle dessinee dans le calque ; parcelles labourees et
      // chemin laisses nus. Generation deterministe (PRNG fixe). Chaque segment de rang
      // (~220u) est un seul <path>, anime par wheat-sway / wheat-gust (voir <style>).
      var NS = 'http://www.w3.org/2000/svg';
      var root = document.getElementById('champs-ble');
      var seed = 4242;
      function rnd() { seed = (seed * 1103515245 + 12345) % 2147483648; return seed / 2147483648; }
      function r1(v) { return Math.round(v * 10) / 10; }

      // Cretes : memes beziers quadratiques que #colline-pres / #colline-loin du calque.
      var NEAR = [[[-20, 660], [700, 565], [1500, 545]], [[1500, 545], [2100, 535], [2500, 600]],
                  [[2500, 600], [2900, 665], [3300, 688]], [[3300, 688], [3600, 700], [3860, 712]]];
      var FAR = [[[-20, 690], [600, 650], [1300, 625]], [[1300, 625], [2100, 600], [2650, 565]],
                 [[2650, 565], [3250, 525], [3860, 610]]];
      function crest(segs, x) {
        for (var i = 0; i < segs.length; i++) {
          var a = segs[i][0], c = segs[i][1], b = segs[i][2];
          if (x < a[0] || x > b[0]) continue;
          var lo = 0, hi = 1;
          for (var k = 0; k < 24; k++) {
            var t = (lo + hi) / 2, xt = (1 - t) * (1 - t) * a[0] + 2 * t * (1 - t) * c[0] + t * t * b[0];
            if (xt < x) lo = t; else hi = t;
          }
          return (1 - lo) * (1 - lo) * a[1] + 2 * lo * (1 - lo) * c[1] + lo * lo * b[1];
        }
        return null;
      }

      // Parcelles de la colline proche (limites penchees : x en haut y=500 / en bas y=800).
      var PARCELS = [[-20, -20, 'dark'], [520, 470, 'light'], [1050, 1010, 'earth'], [1450, 1430, 'dark'],
                     [2000, 2010, 'light'], [2550, 2580, 'forest'], [3100, 3150, 'earth'], [3860, 3860, null]];
      function nearKind(x, y) {
        var t = (y - 500) / 300;
        for (var i = 0; i < PARCELS.length - 1; i++) {
          var xr = PARCELS[i + 1][0] + (PARCELS[i + 1][1] - PARCELS[i + 1][0]) * t;
          if (x < xr) return PARCELS[i][2];
        }
        return null;
      }
      function farKind(x) {
        return x < 2680 ? 'light' : x < 3000 ? 'earth' : x < 3420 ? 'forest' : 'light';
      }
      var COLORS = { dark: '#6a5030', light: '#8a6a3a', grass: '#7d6c3c' };

      // Chemin du moulin : ligne centrale [x, y, demi-largeur], du pied du rempart a la porte.
      var PATH = [[2075, 810, 30], [2030, 770, 25], [1955, 738, 19], [1925, 705, 15],
                  [1975, 672, 12], [2035, 640, 10], [2025, 606, 8], [1995, 580, 6], [1990, 562, 5]];
      // Echantillonnage lisse (Catmull-Rom) de la ligne centrale.
      var pts = [];
      for (var i = 0; i < PATH.length - 1; i++) {
        var p0 = PATH[Math.max(0, i - 1)], p1 = PATH[i], p2 = PATH[i + 1], p3 = PATH[Math.min(PATH.length - 1, i + 2)];
        for (var s = 0; s < 8; s++) {
          var t = s / 8, t2 = t * t, t3 = t2 * t, q = [];
          for (var k = 0; k < 3; k++)
            q.push(0.5 * (2 * p1[k] + (-p0[k] + p2[k]) * t + (2 * p0[k] - 5 * p1[k] + 4 * p2[k] - p3[k]) * t2 +
                          (-p0[k] + 3 * p1[k] - 3 * p2[k] + p3[k]) * t3));
          pts.push(q);
        }
      }
      pts.push(PATH[PATH.length - 1]);
      function onPath(x, y, margin) {
        for (var i = 0; i < pts.length; i++) {
          var dx = x - pts[i][0], dy = y - pts[i][1], r = pts[i][2] + margin;
          if (dx * dx + dy * dy < r * r) return true;
        }
        return false;
      }
      function offsetLine(f) {
        var left = [], right = [];
        for (var i = 0; i < pts.length; i++) {
          var a = pts[Math.max(0, i - 1)], b = pts[Math.min(pts.length - 1, i + 1)];
          var tx = b[0] - a[0], ty = b[1] - a[1], n = Math.sqrt(tx * tx + ty * ty) || 1;
          var nx = -ty / n, ny = tx / n, w = pts[i][2] * f;
          left.push(r1(pts[i][0] + nx * w) + ',' + r1(pts[i][1] + ny * w));
          right.push(r1(pts[i][0] - nx * w) + ',' + r1(pts[i][1] - ny * w));
        }
        return [left, right];
      }
      function el(tag, attrs, parent) {
        var e = document.createElementNS(NS, tag);
        for (var k in attrs) e.setAttribute(k, attrs[k]);
        parent.appendChild(e);
        return e;
      }
      var chemin = root.querySelector('.chemin');
      var edge = offsetLine(1);
      el('path', { d: 'M ' + edge[0].join(' L ') + ' L ' + edge[1].reverse().join(' L ') + ' Z',
                   fill: '#b08a56', stroke: '#5a4028', 'stroke-width': 1.8, 'stroke-linejoin': 'round',
                   filter: 'url(#sketchyMedium)' }, chemin);
      var ruts = offsetLine(0.4);
      el('path', { d: 'M ' + ruts[0].join(' L ') + ' M ' + ruts[1].join(' L '), fill: 'none',
                   stroke: '#7a5a32', 'stroke-width': 1.3, opacity: 0.7 }, chemin);

      // Epi au pied (x,y), hauteur ~30*s, legere inclinaison l.
      function ear(x, y, s, l) {
        function px(h) { return r1(x + l * h / 30); }
        var d = 'M' + r1(x) + ',' + r1(y) + 'Q' + r1(x + 1.5 * s) + ',' + r1(y - 14 * s) + ' ' + px(30 * s) + ',' + r1(y - 30 * s);
        [26, 21, 16].forEach(function (h) {
          var cx = px(h * s), cy = y - h * s;
          d += 'M' + r1(cx - 4 * s) + ',' + r1(cy) + 'L' + r1(cx) + ',' + r1(cy - 3 * s) + 'L' + r1(cx + 4 * s) + ',' + r1(cy);
        });
        var tx = px(26 * s), ty = y - 26 * s;
        d += 'M' + r1(tx - 4 * s) + ',' + r1(ty) + 'L' + r1(tx - 7 * s) + ',' + r1(ty - 7 * s) +
             'M' + r1(tx + 4 * s) + ',' + r1(ty) + 'L' + r1(tx + 7 * s) + ',' + r1(ty - 7 * s);
        return d;
      }

      // Rangs -> segments {cle: {d, x, s, kind}}
      var X0 = 1300, X1 = 3860, CHUNK = 220, segs = {};
      function plant(key, kind, x, y, s) {
        var g = segs[key] || (segs[key] = { d: '', x: x, s: s, kind: kind });
        if (kind === 'grass') g.d += tuft(x + (rnd() - 0.5) * 4, y + (rnd() - 0.5) * 2, s * (0.8 + rnd() * 0.4));
        else g.d += ear(x + (rnd() - 0.5) * 3, y + (rnd() - 0.5) * 2, s * (0.85 + rnd() * 0.3), (rnd() - 0.3) * 4 * s);
      }
      // Touffe d'herbe au pied (x,y), hauteur ~11*s : trois brins.
      function tuft(x, y, s) {
        var b = r1(x) + ',' + r1(y);
        return 'M' + b + 'Q' + r1(x - 2 * s) + ',' + r1(y - 5 * s) + ' ' + r1(x - 4.5 * s) + ',' + r1(y - 9 * s) +
               'M' + b + 'L' + r1(x + 0.8 * s) + ',' + r1(y - 11 * s) +
               'M' + b + 'Q' + r1(x + 2 * s) + ',' + r1(y - 5 * s) + ' ' + r1(x + 4.5 * s) + ',' + r1(y - 8 * s);
      }
      // Clairiere de la cabane du bucheron (calque 02-buildings/02-cabin-bg.svg) : ni arbre ni herbe
      // devant elle (les arbres plus loin, pieds au-dessus de y0, restent derriere elle).
      var CLAIRIERE = [2640, 2755, 630, 812];
      function inClearing(x, y) { return x > CLAIRIERE[0] && x < CLAIRIERE[1] && y > CLAIRIERE[2] && y < CLAIRIERE[3]; }

      // Colline lointaine : pas de ble ; herbe hors de la foret.
      for (var d = 4, row = 0; d < 120; d += 5 + 0.05 * d, row++) {
        for (var x = X0; x < X1; x += 8 + rnd() * 5) {
          var cf = crest(FAR, x), cn = crest(NEAR, x);
          if (cf === null || cn === null) continue;
          var y = cf + d;
          if (y > cn + 2 || farKind(x) === 'forest') continue;
          plant('f' + row + '_' + Math.floor(x / CHUNK), 'grass', x, y, 0.4 + 0.005 * d);
        }
      }
      // Colline proche : de la crete jusque sous le rempart (y=805).
      for (var d2 = 5, row2 = 0; d2 < 280; d2 += 6 + 0.07 * d2, row2++) {
        for (var x2 = X0; x2 < X1; x2 += 7 + 0.05 * d2 + rnd() * 3) {
          var c2 = crest(NEAR, x2);
          if (c2 === null) continue;
          var y2 = c2 + d2;
          if (y2 > 805) continue;
          var kind2 = nearKind(x2, y2);
          if (!kind2 || kind2 === 'forest' || onPath(x2, y2, 4)) continue;
          // Parcelles sans ble (anciennes jacheres) : herbe.
          if (kind2 === 'earth') kind2 = 'grass';
          if (kind2 === 'grass' && inClearing(x2, y2)) continue;
          plant('n' + row2 + '_' + Math.floor(x2 / CHUNK) + kind2, kind2, x2, y2, (kind2 === 'grass' ? 0.6 : 0.38) + 0.0032 * d2);
        }
      }

      // Un <path> par segment, dans deux groupes animes (rafale > balancement). Delais negatifs
      // croissants avec x : la vague traverse le champ de gauche a droite.
      var epis = root.querySelector('.epis');
      var GUST = cfg('ble.rafale', 11), SWAY = cfg('ble.balancement', 3.4);
      Object.keys(segs).forEach(function (k) {
        var g = segs[k];
        var gust = el('g', { 'class': 'wheat-gust' }, epis);
        gust.style.animationDelay = (-(GUST - (g.x / 450) % GUST)).toFixed(2) + 's';   // phase = t - x/450
        var sway = el('g', { 'class': 'wheat-sway' }, gust);
        sway.style.animationDelay = (-(SWAY - (g.x / 900) % SWAY) + (rnd() - 0.5) * 0.4).toFixed(2) + 's';
        el('path', { d: g.d, stroke: COLORS[g.kind], 'stroke-width': r1(0.9 + 0.5 * g.s) }, sway);
      });

      // Forets : parcelles 'forest' (colline proche x~2550-3150, colline lointaine x~3000-3420).
      // Feuillus (houppier en 3 boules) et conifères (2 etages), plantes en rangs comme le ble,
      // tries par y pour que les arbres proches passent devant.
      var trees = [];
      // Lisiere : de moins en moins d'arbres a moins de 'w' unites du bord de la parcelle.
      function edgeKeep(dist, w) { return rnd() < Math.min(1, 0.15 + dist / w); }
      for (var fd = 6; fd < 120; fd += 17) {
        for (var fx = X0; fx < X1; fx += 33 + rnd() * 16) {
          var fcf = crest(FAR, fx), fcn = crest(NEAR, fx);
          if (fcf === null || fcn === null || farKind(fx) !== 'forest') continue;
          var fy = fcf + fd;
          if (fy > fcn + 4 || !edgeKeep(Math.min(fx - 3000, 3420 - fx), 140)) continue;
          trees.push([fx, fy, 1.0 + 0.01 * fd]);
        }
      }
      for (var nd = 10; nd < 280; nd += 25 + 0.18 * nd) {
        for (var nx = X0; nx < X1; nx += 42 + 0.25 * nd + rnd() * 18) {
          var ncn = crest(NEAR, nx);
          if (ncn === null) continue;
          var ny = ncn + nd;
          if (ny > 812 || nearKind(nx, ny) !== 'forest' || inClearing(nx, ny)) continue;
          var nt = (ny - 500) / 300, nl0 = 2550 + 30 * nt, nr0 = 3100 + 50 * nt;
          if (!edgeKeep(Math.min(nx - nl0, nr0 - nx), 110)) continue;
          trees.push([nx, ny, 1.4 + 0.009 * nd]);
        }
      }
      var FILLS = ['#6e5a34', '#7d6a3e', '#5e4c2c', '#857246'];
      function circle(cx, cy, r) {
        return 'M' + r1(cx - r) + ',' + r1(cy) + 'a' + r1(r) + ',' + r1(r) + ' 0 1,0 ' + r1(2 * r) + ',0' +
               'a' + r1(r) + ',' + r1(r) + ' 0 1,0 ' + r1(-2 * r) + ',0';
      }
      var foret = root.querySelector('.foret');
      trees.sort(function (a, b) { return a[1] - b[1]; }).forEach(function (t) {
        var x = t[0] + (rnd() - 0.5) * 4, y = t[1] + (rnd() - 0.5) * 3, s = t[2] * (0.85 + rnd() * 0.35);
        var fill = FILLS[Math.floor(rnd() * FILLS.length)], sw = r1(0.8 + 0.6 * s);
        // Vent : meme phase que le ble a cette abscisse (la vague traverse aussi la foret)
        var tg = el('g', { 'class': 'tree-gust' }, foret);
        tg.style.animationDelay = (-(GUST - (x / 450) % GUST)).toFixed(2) + 's';
        var tree = el('g', { 'class': 'tree-sway' }, tg);
        tree.style.animationDelay = (-(SWAY - (x / 900) % SWAY) + (rnd() - 0.5) * 0.6).toFixed(2) + 's';
        el('path', { d: 'M' + r1(x) + ',' + r1(y) + 'L' + r1(x) + ',' + r1(y - 12 * s), fill: 'none',
                     stroke: '#3a2a14', 'stroke-width': r1(1.2 + 1.5 * s) }, tree);
        if (rnd() < 0.3) {
          // Conifere
          el('path', { d: 'M' + r1(x - 9 * s) + ',' + r1(y - 7 * s) + 'L' + r1(x) + ',' + r1(y - 26 * s) + 'L' + r1(x + 9 * s) + ',' + r1(y - 7 * s) + 'Z' +
                          'M' + r1(x - 7 * s) + ',' + r1(y - 19 * s) + 'L' + r1(x) + ',' + r1(y - 38 * s) + 'L' + r1(x + 7 * s) + ',' + r1(y - 19 * s) + 'Z',
                       fill: fill, 'stroke-width': sw }, tree);
        } else {
          // Feuillu
          el('path', { d: circle(x - 6 * s, y - 16 * s, 8 * s) + circle(x + 6 * s, y - 17 * s, 8 * s) + circle(x, y - 25 * s, 9 * s),
                       fill: fill, 'stroke-width': sw }, tree);
        }
      });
    })();
});
