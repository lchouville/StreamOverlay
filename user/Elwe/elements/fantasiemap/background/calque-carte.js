// Calque 1 : ville vue du dessus + Carte du Maraudeur (chat Twitch).
// Modules repris du script de ville-medievale-croquis.svg ; outils communs (cfg, cfgMs,
// heureVirtuelle, setAttrSiChange...) et cycle jour/nuit dans calques-commun.js.
window.addEventListener('load', function () {
    (function () {
      // Ville vue du dessus, facon plan de ville ancien / Carte du Maraudeur : la vignette
      // ovale est le coeur de la ville ; autour, des quartiers en anneaux (rues qui suivent
      // l'ovale) coupes par des rues rayonnantes, avec des pates de maisons decoupes en
      // batiments serres le long des rues (cours interieures au milieu), quelques places, une
      // muraille a tours et, au-dela, les faubourgs : riviere, champs et grandes routes.
      // Rues larges pour que les pseudos de la Carte du Maraudeur y circulent. Visible
      // uniquement a l'exterieur de l'ovale (mask-hors-ovale). Generation deterministe (seed
      // villeDessus.seed) : meme plan a chaque chargement.
      var root = document.getElementById('ville-dessus');
      if (!root) return;
      var NS = 'http://www.w3.org/2000/svg';
      function el(tag, attrs, parent) { var e = document.createElementNS(NS, tag); for (var k in attrs) e.setAttribute(k, attrs[k]); if (parent) parent.appendChild(e); return e; }

      // PRNG seedable (mulberry32) : meme seed => meme suite de nombres a chaque fois.
      function mulberry32(seed) {
        return function () {
          seed |= 0; seed = seed + 0x6D2B79F5 | 0;
          var t = Math.imul(seed ^ seed >>> 15, 1 | seed);
          t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
          return ((t ^ t >>> 14) >>> 0) / 4294967296;
        };
      }
      // ?seed=1234 dans l'URL : essayer une autre seed sans toucher la config.
      var seedUrl = /[?&]seed=(-?\d+)/.exec(location.search);
      var rand = mulberry32(seedUrl ? +seedUrl[1] : cfg('villeDessus.seed', 1337));
      function r(a, b) { return a + rand() * (b - a); }
      function choix(liste) { return liste[Math.floor(rand() * liste.length)]; }

      // Geometrie reprise directement du DOM (clip-cadre / clip-coin-ovale) : si l'un des
      // deux change un jour, la generation suit sans reglage double a maintenir.
      var cadreRect = document.querySelector('#clip-cadre rect');
      var FX = +cadreRect.getAttribute('x'), FY = +cadreRect.getAttribute('y');
      var FW = +cadreRect.getAttribute('width'), FH = +cadreRect.getAttribute('height');
      var ovale = document.querySelector('#clip-coin-ovale ellipse');
      var OV_CX = +ovale.getAttribute('cx'), OV_CY = +ovale.getAttribute('cy');
      var OV_RX = +ovale.getAttribute('rx'), OV_RY = +ovale.getAttribute('ry');
      var rotMatch = /rotate\(([-\d.]+)/.exec(ovale.getAttribute('transform') || '');
      var OV_ROT = rotMatch ? (+rotMatch[1]) * Math.PI / 180 : 0;
      var cosR = Math.cos(OV_ROT), sinR = Math.sin(OV_ROT);
      // echelle : 1 = l'ovale principal lui-meme, >1 = un ovale agrandi autour.
      function dansOvale(x, y, echelle) {
        echelle = echelle || 1;
        var dx = x - OV_CX, dy = y - OV_CY;
        var lx = dx * cosR + dy * sinR, ly = -dx * sinR + dy * cosR;
        var rx = OV_RX * echelle, ry = OV_RY * echelle;
        return (lx * lx) / (rx * rx) + (ly * ly) / (ry * ry) <= 1;
      }
      function dansCadre(p, marge) { marge = marge || 0; return p[0] > FX + marge && p[0] < FX + FW - marge && p[1] > FY + marge && p[1] < FY + FH - marge; }
      function chemin(pts) { return 'M ' + pts.map(function (p) { return p[0].toFixed(1) + ',' + p[1].toFixed(1); }).join(' L '); }
      function aire(poly) { var a = 0; for (var i = 0; i < poly.length; i++) { var p = poly[i], q = poly[(i + 1) % poly.length]; a += p[0] * q[1] - q[0] * p[1]; } return Math.abs(a / 2); }
      function centre(poly) { var x = 0, y = 0; poly.forEach(function (p) { x += p[0]; y += p[1]; }); return [x / poly.length, y / poly.length]; }
      // Polygone resserre vers son centre de d px (espace entre deux batiments / champs).
      function resserrer(poly, d) {
        var c = centre(poly), k = Math.max(0.2, 1 - 2 * d / Math.sqrt(aire(poly)));
        return poly.map(function (p) { return [c[0] + (p[0] - c[0]) * k, c[1] + (p[1] - c[1]) * k]; });
      }
      function points(poly) { return poly.map(function (p) { return p[0].toFixed(1) + ',' + p[1].toFixed(1); }).join(' '); }

      var LARGEUR_RUE = cfg('villeDessus.largeurRue', 64);
      var LARGEUR_AVENUE = cfg('villeDessus.largeurAvenue', 80);
      var PROF = cfg('villeDessus.profondeurPate', [220, 270]);
      var LARG = cfg('villeDessus.largeurPate', [300, 460]);
      // La seed fait varier tout le plan, pas seulement les details : nombre de grandes
      // rues, position de la muraille et de la riviere, rythme des anneaux, noms tires au hasard.
      var N_GRANDES = Math.max(2, cfg('villeDessus.grandesRues', 5) + Math.floor(r(-1, 2)));
      var PROBA_PLACE = cfg('villeDessus.probaPlace', 0.07);
      var AIRE_BAT = cfg('villeDessus.aireBatiment', [3500, 9000]);
      var QUARTIERS = cfg('villeDessus.quartiers', ['La Halle', 'Les Tanneurs', 'Le Temple', 'La Butte', 'Les Forges']);
      var NOMS_RUES = cfg('villeDessus.rues', ['Grand-Rue', 'Rue des Forges', 'Voie du Pont', 'Rue du Septentrion', 'Chemin du Moulin']);
      var RIVIERE = cfg('villeDessus.riviere', 'La Vive');
      function melanger(liste) { liste = liste.slice(); for (var i = liste.length - 1; i > 0; i--) { var j = Math.floor(rand() * (i + 1)), x = liste[i]; liste[i] = liste[j]; liste[j] = x; } return liste; }
      QUARTIERS = melanger(QUARTIERS); NOMS_RUES = melanger(NOMS_RUES);
      var ENCRE = '#2a1a0a', SOL = '#e6d6ac', PIERRE = '#3d3631';
      var POLICE = "'IM Fell English', Georgia, 'Times New Roman', serif";
      var TOITS = ['#8f6b52', '#9a765b', '#84624a', '#a27f62', '#7a5a44'];
      var CHAMPS = ['#d6c99a', '#cdc48e', '#d9c48e', '#c4c290'];

      // ---- Forme de la ville, tiree par la seed (ou imposee par villeDessus.forme) :
      //  - 'ovale'         : quartiers en anneaux qui suivent l'ovale, la vignette au coeur ;
      //  - 'citadelle'     : petite ville fortifiee polygonale autour d'un donjon, posee
      //                      ailleurs sur la carte et entouree de campagne ;
      //  - 'grille'        : rues presque droites qui se croisent (ville neuve, bastide) ;
      //  - 'contre-courbe' : anneaux centres loin en bas a gauche, courbes a l'envers de l'ovale.
      // Toutes partagent le meme repere : un centre, deux rayons, une rotation et une
      // deformation polygonale ; un point du plan = un angle t et une taille d'anneau s.
      var FORMES = ['ovale', 'citadelle', 'grille', 'contre-courbe'];
      var forme = cfg('villeDessus.forme', 'hasard');
      if (FORMES.indexOf(forme) < 0) forme = choix(FORMES);
      var formeUrl = /[?&]forme=([a-z-]+)/.exec(location.search);
      if (formeUrl && FORMES.indexOf(formeUrl[1]) >= 0) forme = formeUrl[1];
      var MILIEU = [FX + FW / 2, FY + FH / 2];
      var G = { cx: OV_CX, cy: OV_CY, rx: OV_RX, ry: OV_RY, rot: OV_ROT, cotes: 0, poly: 0, phase: 0 };
      if (forme === 'citadelle') {
        // centre : un point visible, loin de l'ovale et des bords du cadre
        var cxC = MILIEU[0], cyC = MILIEU[1];
        for (var essai = 0; essai < 300; essai++) {
          cxC = r(FX + 500, FX + FW - 500); cyC = r(FY + 450, FY + FH - 400);
          if (!dansOvale(cxC, cyC, 1.25)) break;
        }
        G = { cx: cxC, cy: cyC, rx: 1, ry: r(0.8, 1), rot: r(0, 3.14), cotes: Math.floor(r(7, 12)), poly: r(0.5, 0.9), phase: r(0, 6.3) };
      } else if (forme === 'grille') {
        // centre tres lointain : anneaux et rues rayonnantes presque droits
        var dirG = r(0, 6.3), distG = r(9000, 20000);
        G = { cx: MILIEU[0] + Math.cos(dirG) * distG, cy: MILIEU[1] + Math.sin(dirG) * distG, rx: 1, ry: 1, rot: 0, cotes: 0, poly: 0, phase: 0 };
      } else if (forme === 'contre-courbe') {
        var dirC = r(1.9, 2.9), distC = r(2600, 4200);   // vers le bas a gauche (y vers le bas)
        G = { cx: MILIEU[0] + Math.cos(dirC) * distC, cy: MILIEU[1] + Math.sin(dirC) * distC, rx: r(1, 1.5), ry: 1, rot: r(0, 3.14), cotes: 0, poly: 0, phase: 0 };
      }
      var cosG = Math.cos(G.rot), sinG = Math.sin(G.rot);
      function deformation(t) {
        if (!G.cotes) return 1;
        var a = 2 * Math.PI / G.cotes, u = ((t - G.phase) % a + a) % a - a / 2;
        return 1 - G.poly + G.poly * Math.cos(a / 2) / Math.cos(u);
      }
      function pt(t, s) {
        var k = s * deformation(t), ex = Math.cos(t) * G.rx * k, ey = Math.sin(t) * G.ry * k;
        return [G.cx + ex * cosG - ey * sinG, G.cy + ex * sinG + ey * cosG];
      }
      function coord(x, y) {   // inverse de pt : [t, s]
        var dx = x - G.cx, dy = y - G.cy, lx = (dx * cosG + dy * sinG) / G.rx, ly = (-dx * sinG + dy * cosG) / G.ry, t = Math.atan2(ly, lx);
        return [t, Math.hypot(lx, ly) / deformation(t)];
      }
      function pxParRadian(t, s) { var a = pt(t, s), b = pt(t + 1e-4, s); return Math.max(1e-6, Math.hypot(b[0] - a[0], b[1] - a[1]) / 1e-4); }
      var UNITE = Math.min(G.rx, G.ry);   // px par unite de s (sur le petit axe)
      var PROF_MOY = (PROF[0] + PROF[1]) / 2;

      // Partie visible (dans le cadre, hors ovale) : plage d'angles et de tailles a couvrir.
      var angles = [], S_MIN = Infinity, S_MAX = -Infinity;
      for (var vx = FX; vx <= FX + FW; vx += 40) {
        for (var vy = FY; vy <= FY + FH; vy += 40) {
          if (dansOvale(vx, vy)) continue;
          var cv = coord(vx, vy);
          angles.push(cv[0]); S_MIN = Math.min(S_MIN, cv[1]); S_MAX = Math.max(S_MAX, cv[1]);
        }
      }
      angles.sort(function (a, b) { return a - b; });
      // le plus grand trou entre deux angles visibles (en faisant le tour) : la plage est le reste
      var trou = angles[0] + 2 * Math.PI - angles[angles.length - 1], debutPlage = angles[0];
      for (var ia = 1; ia < angles.length; ia++) if (angles[ia] - angles[ia - 1] > trou) { trou = angles[ia] - angles[ia - 1]; debutPlage = angles[ia]; }
      var PLEIN = trou < 0.3;   // le centre est dans la partie visible : la ville fait le tour complet
      var T0, T1;
      if (PLEIN) { T0 = r(0, 6.3); T1 = T0 + 2 * Math.PI; }
      else { T0 = debutPlage; T1 = debutPlage + 2 * Math.PI - trou; var margeT = (T1 - T0) * 0.03; T0 -= margeT; T1 += margeT; }

      // Premier anneau (coeur) et muraille. Parfois pas de muraille visible : la ville couvre tout.
      var S0 = forme === 'ovale' ? 1 : forme === 'citadelle' ? r(110, 170) : S_MIN - 0.3 * PROF_MOY / UNITE;
      var MUR = cfg('villeDessus.muraille', [0.35, 0.7]);
      if (!Array.isArray(MUR)) MUR = [0.35, 0.7];
      var MURAILLE = forme === 'citadelle' ? r(600, 950) / UNITE
        : S0 + (S_MAX - S0) * (rand() < 0.15 ? 1.15 : r(MUR[0], MUR[1]));

      // Rues en anneau : du coeur a la muraille, profondeur de pate PROF, chaque anneau
      // legerement ondule.
      var nBandes = Math.max(1, Math.round((MURAILLE - S0) * UNITE / PROF_MOY));
      var anneaux = [];
      for (var k = 0; k <= nBandes; k++) {
        var base = S0 + (MURAILLE - S0) * k / nBandes;
        if (k > 0 && k < nBandes) base += r(-0.3, 0.3) * (MURAILLE - S0) / nBandes;
        anneaux.push({ s: base, a: k ? r(11, 40) / UNITE : 0, p1: r(0, 6.3), p2: r(0, 6.3) });
      }
      function sAnneau(k, t) { var a = anneaux[k]; return a.s + a.a * (0.6 * Math.sin(3 * t + a.p1) + 0.4 * Math.sin(7 * t + a.p2)); }
      function ptAnneau(k, t) { return pt(t, sAnneau(k, t)); }

      // Grandes rues : rayonnent depuis le coeur de la ville et continuent en routes hors les
      // murs. Hors tour complet, deux rues "bornes" hors cadre ferment les quartiers des bords.
      var grandes = [];
      if (PLEIN) {
        for (var g = 0; g < N_GRANDES; g++) grandes.push(T0 + 2 * Math.PI * (g + r(-0.25, 0.25)) / N_GRANDES);
        grandes.push(grandes[0] + 2 * Math.PI);
      } else {
        grandes.push(T0 - (T1 - T0) * 0.06);
        for (g = 0; g < N_GRANDES; g++) grandes.push(T0 + (T1 - T0) * (g + 0.5) / N_GRANDES + r(-0.25, 0.25) * (T1 - T0) / N_GRANDES);
        grandes.push(T1 + (T1 - T0) * 0.06);
      }
      var J0 = PLEIN ? 0 : 1, J1 = grandes.length - 2;   // grandes rues reelles (hors bornes / doublon)
      function estGrande(j) { return PLEIN || (j > 0 && j < grandes.length - 1); }
      var ondes = grandes.map(function () { return [r(0, 6.3), r(40, 130)]; });
      if (PLEIN) ondes[ondes.length - 1] = ondes[0];
      // ondulation en px (et pas en angle) : meme allure pres du coeur et loin de lui
      function angleGrande(j, s) {
        var rayon = Math.max(1, s * UNITE);
        return grandes[j] + Math.min(ondes[j][1], rayon * 0.3) / rayon * Math.sin(s * UNITE / 370 + ondes[j][0]);
      }

      // Rues rayonnantes de chaque bande d'anneaux : les grandes rues + des rues secondaires
      // espacees d'une largeur de pate, legerement de biais (jamais alignees d'une bande a l'autre).
      var bandes = [];
      for (k = 0; k < nBandes; k++) {
        var sIn = anneaux[k].s, sOut = anneaux[k + 1].s, sMid = (sIn + sOut) / 2, rad = [];
        for (var j = 0; j < grandes.length; j++) {
          rad.push({ tIn: angleGrande(j, sIn), tOut: angleGrande(j, sOut), grande: estGrande(j), j: j });
          if (j === grandes.length - 1) break;
          var tFin = angleGrande(j + 1, sMid), t = angleGrande(j, sMid);
          for (;;) {
            t += r(LARG[0], LARG[1]) / pxParRadian(t, sMid);
            if ((tFin - t) * pxParRadian(t, sMid) < LARG[0] * 0.7) break;
            var biais = r(-0.25, 0.25) * LARG[0] / pxParRadian(t, sMid);
            rad.push({ tIn: t - biais, tOut: t + biais, grande: false });
          }
        }
        bandes.push(rad);
      }
      function ptsRadiale(k, R) {
        var a = ptAnneau(k, R.tIn), b = ptAnneau(k + 1, R.tOut), n = Math.max(2, Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) / 50)), pts = [a];
        for (var i = 1; i < n; i++) {
          var f = i / n, s = sAnneau(k, R.tIn) + (sAnneau(k + 1, R.tOut) - sAnneau(k, R.tIn)) * f;
          pts.push(pt(R.j !== undefined ? angleGrande(R.j, s) : R.tIn + (R.tOut - R.tIn) * f, s));
        }
        pts.push(b);
        return pts;
      }
      function ptsArc(k, ta, tb) {
        var n = Math.max(1, Math.ceil(Math.abs(tb - ta) * pxParRadian(ta, anneaux[k].s) / 50)), pts = [];
        for (var i = 0; i <= n; i++) pts.push(ptAnneau(k, ta + (tb - ta) * i / n));
        return pts;
      }

      // ---- Calques, du dessous vers le dessus
      var defs = el('defs', {}, root);
      [0, 45, 90, 135].forEach(function (a) {
        var pat = el('pattern', { id: 'hachures-champ-' + a, patternUnits: 'userSpaceOnUse', width: 14, height: 14, patternTransform: 'rotate(' + a + ')' }, defs);
        el('line', { x1: 0, y1: 0, x2: 0, y2: 14, stroke: ENCRE, 'stroke-width': 1.2, opacity: 0.35 }, pat);
      });
      var gChamps = el('g', { filter: 'url(#sketchyMedium)' }, root);
      var gRiviere = el('g', { fill: 'none', 'stroke-linecap': 'round', 'stroke-linejoin': 'round', filter: 'url(#sketchyMedium)' }, root);
      var gBati = el('g', { stroke: ENCRE, 'stroke-width': 1.6, 'stroke-linejoin': 'round', filter: 'url(#sketchyMedium)' }, root);
      var gMur = el('g', { fill: 'none', 'stroke-linecap': 'round', 'stroke-linejoin': 'round', filter: 'url(#sketchyMedium)' }, root);
      var gRues = el('g', { fill: 'none', 'stroke-linecap': 'round', 'stroke-linejoin': 'round', filter: 'url(#sketchyMedium)' }, root);
      var gRuesEncre = el('g', { stroke: ENCRE, opacity: 0.85 }, gRues), gRuesSol = el('g', { stroke: SOL }, gRues);
      var gTours = el('g', { fill: PIERRE, stroke: ENCRE, 'stroke-width': 2, filter: 'url(#sketchyMedium)' }, root);
      var gTextes = el('g', { fill: ENCRE, 'font-family': POLICE, 'font-style': 'italic', 'text-anchor': 'middle' }, root);

      // ---- Pates de maisons : chaque bande est coupee en pates par ses rues rayonnantes,
      // puis chaque pate est decoupe recursivement (coupe perpendiculaire a son plus long
      // cote) en batiments. Un batiment qui ne touche aucune rue devient parfois une cour (ou
      // un jardin) : ilots denses, avec ici et la un coeur d'ilot vide.
      function couper(poly, ext, cote, signe) {
        var out = [], oext = [];
        for (var i = 0; i < poly.length; i++) {
          var a = poly[i], b = poly[(i + 1) % poly.length], da = cote(a) * signe, db = cote(b) * signe;
          if (da >= 0) { out.push(a); oext.push(ext[i]); }
          if ((da >= 0) !== (db >= 0)) {
            var u = da / (da - db);
            out.push([a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u]);
            oext.push(da >= 0 ? false : ext[i]);
          }
        }
        return { p: out, ext: oext };
      }
      function decouper(poly, ext, profondeur, aireMax) {
        if (profondeur <= 0 || aire(poly) < aireMax) return [{ p: poly, ext: ext }];
        var iMax = 0, lMax = 0;
        for (var i = 0; i < poly.length; i++) {
          var q = poly[(i + 1) % poly.length], l = Math.hypot(q[0] - poly[i][0], q[1] - poly[i][1]);
          if (l > lMax) { lMax = l; iMax = i; }
        }
        var a = poly[iMax], b = poly[(iMax + 1) % poly.length], f = r(0.3, 0.7);
        var dx = (b[0] - a[0]) / lMax, dy = (b[1] - a[1]) / lMax, px = a[0] + (b[0] - a[0]) * f, py = a[1] + (b[1] - a[1]) * f;
        function cote(p) { return (p[0] - px) * dx + (p[1] - py) * dy; }
        var A = couper(poly, ext, cote, 1), B = couper(poly, ext, cote, -1);
        if (A.p.length < 3 || B.p.length < 3) return [{ p: poly, ext: ext }];
        return decouper(A.p, A.ext, profondeur - 1, aireMax).concat(decouper(B.p, B.ext, profondeur - 1, aireMax));
      }
      function arbres(c, n, rayon) {
        for (var i = 0; i < n; i++) {
          el('circle', { cx: (c[0] + r(-rayon, rayon)).toFixed(1), cy: (c[1] + r(-rayon, rayon)).toFixed(1), r: r(9, 15).toFixed(1), fill: '#8f9a68', 'stroke-width': 1.3 }, gBati);
        }
      }
      var places = [];
      var entrees = [];   // centres des batiments sur rue : les marcheurs du Maraudeur y rentrent
      function visibleUnPeu(poly) { return poly.some(function (p) { return dansCadre(p) && !dansOvale(p[0], p[1]); }); }

      bandes.forEach(function (rad, k) {
        for (var i = 0; i < rad.length - 1; i++) {
          var R1 = rad[i], R2 = rad[i + 1];
          var poly = ptsArc(k, R1.tIn, R2.tIn).concat(ptsRadiale(k, R2).slice(1, -1), ptsArc(k + 1, R2.tOut, R1.tOut), ptsRadiale(k, R1).slice(1, -1).reverse());
          if (!visibleUnPeu(poly)) continue;
          if (rand() < PROBA_PLACE) {
            // Place : pavee (sol nu) avec un puits au milieu et quelques arbres en bordure.
            var c = centre(poly);
            places.push(c);
            el('circle', { cx: c[0].toFixed(1), cy: c[1].toFixed(1), r: 16, fill: '#9aa7a0', 'stroke-width': 2.5 }, gBati);
            arbres([c[0] + r(-90, 90), c[1] + r(-60, 60)], 3, 30);
            continue;
          }
          decouper(poly, poly.map(function () { return true; }), 12, r(AIRE_BAT[0], AIRE_BAT[1])).forEach(function (lot) {
            var a = aire(lot.p);
            if (a < 500) return;
            if (!lot.ext.some(Boolean) && rand() < 0.3) { if (rand() < 0.5) arbres(centre(lot.p), 2 + Math.floor(rand() * 3), Math.sqrt(a) * 0.25); return; }
            el('polygon', { points: points(resserrer(lot.p, 3)), fill: choix(TOITS) }, gBati);
            if (lot.ext.some(Boolean)) entrees.push(centre(lot.p));
          });
        }
      });

      if (forme === 'citadelle') {
        // Donjon au coeur de la citadelle : enceinte carree a tours d'angle, cour au milieu.
        var donjon = [];
        for (var id = 0; id < 4; id++) donjon.push(pt(T0 + G.phase + id * Math.PI / 2 + Math.PI / 4, S0 * 0.62));
        el('polygon', { points: points(donjon), fill: '#a99d8a', 'stroke-width': 3 }, gBati);
        el('polygon', { points: points(resserrer(donjon, 22)), fill: '#d8c8a2', 'stroke-width': 2 }, gBati);
        donjon.forEach(function (p) { el('circle', { cx: p[0].toFixed(1), cy: p[1].toFixed(1), r: 14, fill: PIERRE, 'stroke-width': 2 }, gBati); });
        places.push(null);   // pas de "Place du Marche" sur le donjon
      }

      // ---- Faubourgs : hors les murs, des champs entre les grandes routes (decoupes en
      // parcelles hachurees), avec ici et la une ferme.
      var S_LOIN = S_MAX + 300 / UNITE, S_FAUBOURG = MURAILLE + 50 / UNITE;
      for (j = 0; j < grandes.length - 1; j++) {
        var bord = [], n = 24, i2;
        for (i2 = 0; i2 <= n; i2++) bord.push(pt(angleGrande(j, S_FAUBOURG) + (angleGrande(j + 1, S_FAUBOURG) - angleGrande(j, S_FAUBOURG)) * i2 / n, S_FAUBOURG));
        for (i2 = 1; i2 < n; i2++) { var s2 = S_FAUBOURG + (S_LOIN - S_FAUBOURG) * i2 / n; bord.push(pt(angleGrande(j + 1, s2), s2)); }
        for (i2 = n; i2 >= 0; i2--) bord.push(pt(angleGrande(j, S_LOIN) + (angleGrande(j + 1, S_LOIN) - angleGrande(j, S_LOIN)) * i2 / n, S_LOIN));
        for (i2 = n - 1; i2 > 0; i2--) { var s3 = S_FAUBOURG + (S_LOIN - S_FAUBOURG) * i2 / n; bord.push(pt(angleGrande(j, s3), s3)); }
        decouper(bord, bord.map(function () { return true; }), 10, r(45000, 90000)).forEach(function (champ) {
          if (!visibleUnPeu(champ.p)) return;
          var p = points(resserrer(champ.p, 7));
          el('polygon', { points: p, fill: choix(CHAMPS), stroke: '#6a5030', 'stroke-width': 1.4 }, gChamps);
          el('polygon', { points: p, fill: 'url(#hachures-champ-' + choix([0, 45, 90, 135]) + ')' }, gChamps);
          if (rand() < 0.25) {
            var c = centre(champ.p), coin = choix(champ.p), ferme = resserrer(champ.p, 0).map(function (q) { return [c[0] + (coin[0] - c[0]) * 0.45 + (q[0] - c[0]) * 0.16, c[1] + (coin[1] - c[1]) * 0.45 + (q[1] - c[1]) * 0.16]; });
            el('polygon', { points: points(ferme), fill: choix(TOITS), stroke: ENCRE, 'stroke-width': 1.6 }, gChamps);
          }
        });
      }

      // ---- Riviere : longe la muraille a distance, dans les faubourgs. Les routes passent
      // par-dessus (ponts).
      // 1 a 2 meandres sur la partie visible, quelle que soit la forme de la ville
      var rivP = [r(0, 6.3), r(0, 6.3), r(260, 550) / UNITE, r(37, 92) / UNITE, r(1, 2.2), r(4, 6)], ptsRiviere = [];
      var tRiv0 = PLEIN ? T0 : T0 - (T1 - T0) * 0.05, tRiv1 = PLEIN ? T1 + 0.01 : T1 + (T1 - T0) * 0.05;
      for (t = tRiv0; t <= tRiv1; t += 30 / pxParRadian(t, MURAILLE + rivP[2])) {
        var uRiv = 2 * Math.PI * (t - T0) / (T1 - T0);
        ptsRiviere.push(pt(t, MURAILLE + rivP[2] + rivP[3] * Math.sin(rivP[4] * uRiv + rivP[0]) + 28 / UNITE * Math.sin(rivP[5] * uRiv + rivP[1])));
      }
      var dRiviere = chemin(ptsRiviere);
      el('path', { d: dRiviere, stroke: ENCRE, 'stroke-width': 104, opacity: 0.8 }, gRiviere);
      el('path', { d: dRiviere, stroke: '#8fa79a', 'stroke-width': 92 }, gRiviere);
      el('path', { d: dRiviere, stroke: '#c4d2c6', 'stroke-width': 3, 'stroke-dasharray': '34 26', opacity: 0.8 }, gRiviere);

      // ---- Rues : anneaux, rues rayonnantes, grandes routes hors les murs. Trait d'encre large
      // dessous + sol clair dessus = rue cernee d'encre. Toutes les rues alimentent aussi le
      // graphe de la Carte du Maraudeur (memes points aux carrefours).
      var rues = [];
      function rue(pts, largeur) {
        rues.push(pts);
        var d = chemin(pts);
        el('path', { d: d, 'stroke-width': largeur + 6 }, gRuesEncre);
        el('path', { d: d, 'stroke-width': largeur }, gRuesSol);
      }
      for (k = 0; k <= nBandes; k++) {
        // angles des carrefours de cet anneau, ajoutes aux points reguliers pour que les rues
        // rayonnantes tombent exactement sur un point de l'anneau
        var ts = [], sk = anneaux[k].s;
        for (t = T0; t <= T1; t += 50 / pxParRadian(t, sk)) ts.push(t);
        if (k < nBandes) bandes[k].forEach(function (R) { ts.push(R.tIn); });
        if (k > 0) bandes[k - 1].forEach(function (R) { ts.push(R.tOut); });
        ts.sort(function (a, b) { return a - b; });
        rue(ts.filter(function (v, i) { return !i || v - ts[i - 1] > 1e-6; }).map(function (v) { return ptAnneau(k, v); }), LARGEUR_RUE);
      }
      bandes.forEach(function (rad, k) { rad.forEach(function (R) { rue(ptsRadiale(k, R), R.grande ? LARGEUR_AVENUE : LARGEUR_RUE); }); });
      var routes = {};
      for (j = J0; j <= J1; j++) {
        var route = [ptAnneau(nBandes, angleGrande(j, MURAILLE))];
        for (var s4 = MURAILLE + 70 / UNITE; s4 <= S_LOIN; s4 += 70 / UNITE) route.push(pt(angleGrande(j, s4), s4));
        routes[j] = route;
        rue(route, LARGEUR_AVENUE);
      }

      // ---- Muraille : juste au-dela du dernier anneau, tours rondes regulieres, portes
      // (deux tours) la ou passent les grandes routes. Les routes sont dessinees par-dessus le
      // mur : l'ouverture de la porte.
      function ptMur(t) {
        var a = ptAnneau(nBandes, t), b = pt(t, sAnneau(nBandes, t) + 10 / UNITE), l = Math.hypot(b[0] - a[0], b[1] - a[1]);
        return [a[0] + (b[0] - a[0]) / l * 46, a[1] + (b[1] - a[1]) / l * 46];
      }
      var ptsMur = [];
      for (t = T0; t <= T1; t += 30 / pxParRadian(t, MURAILLE)) ptsMur.push(ptMur(t));
      el('path', { d: chemin(ptsMur), stroke: PIERRE, 'stroke-width': 20 }, gMur);
      el('path', { d: chemin(ptsMur), stroke: '#7a7068', 'stroke-width': 5, opacity: 0.7 }, gMur);
      var portes = [];
      for (j = J0; j <= J1; j++) portes.push(angleGrande(j, MURAILLE));
      function tour(t, rayon) { var p = ptMur(t); el('circle', { cx: p[0].toFixed(1), cy: p[1].toFixed(1), r: rayon }, gTours); }
      portes.forEach(function (tp) { var dt = 62 / pxParRadian(tp, MURAILLE); tour(tp - dt, 20); tour(tp + dt, 20); });
      for (t = T0; t <= T1; t += 260 / pxParRadian(t, MURAILLE)) {
        if (portes.every(function (tp) { return Math.abs(tp - t) * pxParRadian(t, MURAILLE) > 150; })) tour(t, 15);
      }

      // ---- Noms a l'encre : quartiers (capitales espacees, en travers des pates), grandes
      // rues et riviere (le long du trace), places.
      function visibleTexte(p) { return dansCadre(p, 120) && !dansOvale(p[0], p[1], 1.06); }
      function texte(contenu, attrs) { var e = el('text', attrs, gTextes); e.textContent = contenu; return e; }
      var halo = { stroke: SOL, 'stroke-width': 8, 'paint-order': 'stroke', 'stroke-linejoin': 'round' };
      function avecHalo(attrs) { for (var h in halo) attrs[h] = halo[h]; return attrs; }
      // Texte le long d'une ligne : seulement sur la plus longue portion visible, lue de
      // gauche a droite.
      var nChemins = 0;
      function texteLe(pts, contenu, taille) {
        var meilleur = [], cour = [];
        pts.forEach(function (p) { if (visibleTexte(p)) { cour.push(p); if (cour.length > meilleur.length) meilleur = cour.slice(); } else cour = []; });
        if (meilleur.length < 2) return;
        if (meilleur[meilleur.length - 1][0] < meilleur[0][0]) meilleur.reverse();
        var id = 'trace-nom-' + (nChemins++);
        el('path', { id: id, d: chemin(meilleur) }, defs);
        var e = el('text', avecHalo({ 'font-size': taille, dy: (taille * 0.35).toFixed(1) }), gTextes);
        var tp = el('textPath', { href: '#' + id, startOffset: '50%' }, e);
        tp.textContent = contenu;
      }
      var iQuartier = 0;
      for (j = 0; j < grandes.length - 1 && iQuartier < QUARTIERS.length; j++) {
        for (k = 1; k < nBandes; k++) {
          var tq = (angleGrande(j, anneaux[k].s) + angleGrande(j + 1, anneaux[k].s)) / 2, sq = (anneaux[k].s + anneaux[k + 1].s) / 2;
          var pq = pt(tq, sq);
          if (!visibleTexte(pq)) continue;
          var tang = pt(tq + 0.001, sq), ang = Math.atan2(tang[1] - pq[1], tang[0] - pq[0]) * 180 / Math.PI;
          if (ang > 90) ang -= 180; else if (ang < -90) ang += 180;
          texte(QUARTIERS[iQuartier++].toUpperCase(), avecHalo({ x: pq[0].toFixed(1), y: pq[1].toFixed(1), 'font-size': 46, 'letter-spacing': 9, opacity: 0.85, transform: 'rotate(' + ang.toFixed(1) + ' ' + pq[0].toFixed(1) + ' ' + pq[1].toFixed(1) + ')' }));
          break;
        }
      }
      var iRue = 0;
      bandes[0].forEach(function (R, i) {
        if (!R.grande || R.j > J1 || iRue >= NOMS_RUES.length) return;
        var pts = [];
        bandes.forEach(function (rad, kb) { rad.forEach(function (R2) { if (R2.j === R.j) pts = pts.concat(ptsRadiale(kb, R2)); }); });
        texteLe(pts.concat(routes[R.j] || []), NOMS_RUES[iRue++], 32);
      });
      texteLe(ptsRiviere, RIVIERE, 34);
      if (forme === 'citadelle') texte('LE DONJON', avecHalo({ x: G.cx.toFixed(1), y: (G.cy + 12).toFixed(1), 'font-size': 34, 'letter-spacing': 5 }));
      places.forEach(function (c, i) {
        if (c && i < 2 && visibleTexte(c)) texte(i ? 'Place aux Herbes' : 'Place du Marché', avecHalo({ x: c[0].toFixed(1), y: (c[1] + 52).toFixed(1), 'font-size': 26 }));
      });

      // ---- Carte du Maraudeur : les spectateurs qui tapent la commande (maraudeur.commandes)
      // dans le chat Twitch apparaissent sur le plan pendant maraudeur.duree secondes : des
      // traces de pas a l'encre qui avancent de rue en rue, avec leur pseudo sur une banderole.
      var calque = document.getElementById('maraudeur');
      if (!calque) return;
      // Pas dessous, pseudos dessus : un nouveau pas ne recouvre jamais une banderole.
      var calquePas = el('g', {}, calque), calqueNoms = el('g', {}, calque);

      // Graphe des rues : chaque point de chaque rue est un noeud (les carrefours sont des
      // points partages entre rues), relie a ses voisins quand le troncon est visible (hors
      // ovale et loin des bords du cadre). Les marcheurs suivent ainsi les rues courbes.
      function visible(px, py) {
        return !dansOvale(px, py, 1.04) && px > FX + 30 && px < FX + FW - 30 && py > FY + 30 && py < FY + FH - 30;
      }
      var noeuds = {}, listeNoeuds = [];
      function noeud(p) {
        var cle = Math.round(p[0]) + ',' + Math.round(p[1]);
        return noeuds[cle] || (noeuds[cle] = { x: p[0], y: p[1], v: [] });
      }
      rues.forEach(function (pts) {
        for (var i = 0; i < pts.length - 1; i++) {
          var a = pts[i], b = pts[i + 1];
          if (!visible(a[0], a[1]) || !visible(b[0], b[1]) || !visible((a[0] + b[0]) / 2, (a[1] + b[1]) / 2)) continue;
          var na = noeud(a), nb = noeud(b);
          if (na === nb || na.v.indexOf(nb) >= 0) continue;
          na.v.push(nb); nb.v.push(na);
        }
      });
      Object.keys(noeuds).forEach(function (k) { if (noeuds[k].v.length) listeNoeuds.push(noeuds[k]); });
      if (!listeNoeuds.length) return;

      var DUREE = cfgMs('maraudeur.duree', 40), VITESSE = cfg('maraudeur.vitesse', 55);
      var MAX = cfg('maraudeur.maxPersonnes', 12), PAS = 30, ECART = 9, ENCRE = '#2a1a0a';
      var marcheurs = {}, enCours = false;
      function hasard(a, b) { return a + Math.random() * (b - a); }
      function choisir(liste) { return liste[Math.floor(Math.random() * liste.length)]; }

      // Empreinte de chaussure (semelle + talon) orientee dans le sens de la marche, decalee
      // a gauche ou a droite de l'axe de la rue ; s'efface seule (animation .pas-maraudeur).
      function empreinte(px, py, dx, dy, gauche) {
        var s = gauche ? -1 : 1;
        var g = el('g', {
          'class': 'pas-maraudeur', fill: ENCRE,
          transform: 'translate(' + (px - dy * ECART * s).toFixed(1) + ',' + (py + dx * ECART * s).toFixed(1) + ') rotate(' + (Math.atan2(dy, dx) * 180 / Math.PI + s * 8).toFixed(1) + ')'
        }, calquePas);
        el('ellipse', { cx: 4, cy: 0, rx: 8, ry: 4.2 }, g);
        el('ellipse', { cx: -9.5, cy: 0, rx: 3.8, ry: 3.4 }, g);
        g.addEventListener('animationend', function () { g.remove(); });
        return g;
      }

      // Croisements : deux personnes qui passent a moins de RAYON l'une de l'autre se
      // "croisent". Le score d'un spectateur se gagne en croisant des personnes differentes (voir
      // croisements() pour le bareme ; garde toute la session, meme s'il revient plus tard) ; il donne le contour de sa
      // banderole (RANGS). Le streamer se promene en continu, hors classement (bordure rubis) :
      // qui le croise gagne un petit bouclier sous son pseudo. Le meilleur score porte une couronne
      // (d'or s'il est seul en tete, d'argent pour chacun des ex aequo).
      // Statuts Twitch (tags du chat) : insigne a gauche du pseudo et teinte de la banderole.
      // Les modos restent en permanence et ne jouent pas (bordure verte) : les croiser sans
      // bouclier coute des points. Les VIP et les subs restent plus longtemps ; les subs gagnent
      // un bonus a chaque croisement.
      var RAYON = 70, RUBIS = '#b0123a', VERT_MODO = '#3d6e36';
      var BONUS_SUB = cfg('maraudeur.bonusSub', 1), MALUS_MODO = cfg('maraudeur.malusModo', 1);
      var DUREE_VIP = cfg('maraudeur.dureeVip', 3), DUREE_SUB = cfg('maraudeur.dureeSub', 2);
      var SEUILS = cfg('maraudeur.rangs', { bronze: 3, argent: 6, or: 10, diamant: 15 });
      var RANGS = [
        { nom: 'diamant', couleur: '#4fb8d0', halo: true },
        { nom: 'or', couleur: '#cfa22a', halo: true },
        { nom: 'argent', couleur: '#9aa4ac', halo: false },
        { nom: 'bronze', couleur: '#a0612b', halo: false }
      ];
      var infos = {};   // par pseudo (minuscules) : { score, croises: Set, bouclier: bool }
      function info(k) { return infos[k] || (infos[k] = { score: 0, croises: new Set(), bouclier: false }); }

      // Banderole au pseudo (petit parchemin a bouts arrondis), juste au-dessus des pas, avec
      // halo (rangs or / diamant, streamer), couronne au-dessus et bouclier en dessous.
      // Insignes (centres en 0,0, ~22 px) : epee pour les modos, diamant pour les VIP, sceau de
      // cire pour les subs.
      function insigne(type, parent) {
        var g = el('g', { 'stroke-linejoin': 'round', 'stroke-linecap': 'round' }, parent);
        if (type === 'mod') {
          el('path', { d: 'M 0,-12 L 3,-8 L 3,5 L -3,5 L -3,-8 Z', fill: '#c9ced4', stroke: ENCRE, 'stroke-width': 1.3 }, g);
          el('path', { d: 'M -8,5 L 8,5', stroke: '#7a5a2a', 'stroke-width': 3.2 }, g);
          el('path', { d: 'M 0,7 L 0,12', stroke: '#5a3a1a', 'stroke-width': 3 }, g);
        } else if (type === 'vip') {
          el('path', { d: 'M -9,-4 L -5,-10 L 5,-10 L 9,-4 L 0,10 Z', fill: '#e06aa8', stroke: ENCRE, 'stroke-width': 1.3 }, g);
          el('path', { d: 'M -9,-4 L 9,-4 M -2,-10 L -4,-4 L 0,10 M 2,-10 L 4,-4 L 0,10', fill: 'none', stroke: '#fbe3f0', 'stroke-width': 1, opacity: 0.85 }, g);
        } else {
          el('circle', { r: 9.5, fill: '#7d4bb3', stroke: ENCRE, 'stroke-width': 1.3 }, g);
          el('path', { d: 'M 0,-5 L 1.5,-1.5 L 5,-1.5 L 2.2,1 L 3.2,5 L 0,2.6 L -3.2,5 L -2.2,1 L -5,-1.5 L -1.5,-1.5 Z', fill: '#e8dcf6' }, g);
        }
        return g;
      }
      function banderole(nom, st) {
        var types = ['mod', 'vip', 'sub'].filter(function (t) { return st[t]; }), largeurInsignes = types.length * 26;
        var teinte = st.mod ? '#d6e2c0' : st.vip ? '#f0d6e6' : st.sub ? '#e0d8ee' : '#efe2bf';
        var g = el('g', { 'class': 'nom-maraudeur', opacity: 0 }, calqueNoms);
        var halo = el('rect', { y: -26, height: 50, rx: 16, fill: 'none', 'stroke-width': 7, opacity: 0 }, g);
        var fond = el('rect', { y: -21, height: 40, rx: 12, fill: teinte, stroke: ENCRE, 'stroke-width': 1.6, filter: 'url(#sketchyMedium)' }, g);
        var insignes = types.map(function (t) { return insigne(t, g); });
        var mois = null;
        if (st.sub && st.mois > 0) {
          mois = el('text', {
            'text-anchor': 'end', y: 38, fill: '#5a3a80', 'font-size': 17, 'font-style': 'italic',
            'font-family': "'IM Fell English', Georgia, 'Times New Roman', serif",
            stroke: '#efe2bf', 'stroke-width': 4, 'paint-order': 'stroke'
          }, g);
          mois.textContent = st.mois + ' mois';
        }
        var texte = el('text', {
          'text-anchor': 'middle', x: largeurInsignes / 2, y: 9, fill: ENCRE, 'font-size': 30, 'font-style': 'italic',
          'font-family': "'IM Fell English', Georgia, 'Times New Roman', serif"
        }, g);
        texte.textContent = nom;
        var couronne = el('path', {
          d: 'M -17,-24 L -20,-46 L -9,-35 L 0,-50 L 9,-35 L 20,-46 L 17,-24 Z',
          fill: '#d9b53a', stroke: ENCRE, 'stroke-width': 2, 'stroke-linejoin': 'round', display: 'none'
        }, g);
        var bouclier = el('g', { display: 'none' }, g);
        el('path', { d: 'M -10,22 L 10,22 L 10,31 Q 10,41 0,47 Q -10,41 -10,31 Z', fill: RUBIS, stroke: ENCRE, 'stroke-width': 1.8, 'stroke-linejoin': 'round' }, bouclier);
        el('path', { d: 'M 0,26 L 0,42 M -6,31 L 6,31', stroke: '#f0d9a0', 'stroke-width': 2, 'stroke-linecap': 'round' }, bouclier);
        function ajuster() {
          var w = texte.getComputedTextLength() + 28 + largeurInsignes;
          fond.setAttribute('x', (-w / 2).toFixed(1));
          fond.setAttribute('width', w.toFixed(1));
          halo.setAttribute('x', (-w / 2 - 5).toFixed(1));
          halo.setAttribute('width', (w + 10).toFixed(1));
          insignes.forEach(function (ins, i) { ins.setAttribute('transform', 'translate(' + (-w / 2 + 25 + i * 26).toFixed(1) + ',0)'); });
          // mois d'abonnement sous le bord droit ; le bouclier passe alors a gauche
          if (mois) { mois.setAttribute('x', (w / 2 - 8).toFixed(1)); bouclier.setAttribute('transform', 'translate(' + (-w / 2 + 22).toFixed(1) + ',0)'); }
        }
        ajuster();
        if (document.fonts) document.fonts.ready.then(ajuster);   // police web chargee apres coup
        requestAnimationFrame(function () { g.setAttribute('opacity', 1); });
        return { g: g, fond: fond, halo: halo, couronne: couronne, bouclier: bouclier };
      }
      // Contour selon le rang (ou rubis pour le streamer), bouclier si le streamer a ete croise.
      function habiller(m) {
        var b = m.nom, couleur = ENCRE, epaisseur = 1.6, avecHalo = false;
        if (m.streamer) { couleur = RUBIS; epaisseur = 4; avecHalo = true; }
        else if (m.mod) { couleur = VERT_MODO; epaisseur = 4; avecHalo = true; }
        else {
          var score = info(m.k).score;
          for (var i = 0; i < RANGS.length; i++) {
            if (score >= SEUILS[RANGS[i].nom]) { couleur = RANGS[i].couleur; epaisseur = 3.5; avecHalo = RANGS[i].halo; break; }
          }
          b.bouclier.setAttribute('display', info(m.k).bouclier ? 'inline' : 'none');
        }
        b.fond.setAttribute('stroke', couleur);
        b.fond.setAttribute('stroke-width', epaisseur);
        b.halo.setAttribute('stroke', couleur);
        b.halo.setAttribute('opacity', avecHalo ? 0.45 : 0);
      }
      // Couronne : meilleur score parmi les spectateurs presents. Seul en tete : couronne d'or ;
      // a egalite : tous les ex aequo portent une couronne d'argent.
      function couronner() {
        var max = 0, ex = 0;
        Object.keys(marcheurs).forEach(function (k) {
          var sc = marcheurs[k].horsJeu ? 0 : info(k).score;
          if (sc > max) { max = sc; ex = 1; } else if (sc === max && sc > 0) ex++;
        });
        Object.keys(marcheurs).forEach(function (k) {
          var m = marcheurs[k], enTete = !m.horsJeu && max > 0 && info(k).score === max;
          m.nom.couronne.setAttribute('display', enTete ? 'inline' : 'none');
          m.nom.couronne.setAttribute('fill', ex > 1 ? '#c4ccd2' : '#d9b53a');
        });
      }
      // Petit "+1" (ou bouclier gagne) qui monte et s'efface au-dessus de la banderole.
      function bulle(m, contenu, couleur) {
        var g = el('g', { transform: 'translate(' + m.x.toFixed(1) + ',' + (m.y - 90).toFixed(1) + ')' }, calqueNoms);
        var t = el('text', {
          'text-anchor': 'middle', fill: couleur || ENCRE, 'font-size': 30, 'font-style': 'italic',
          'font-family': "'IM Fell English', Georgia, 'Times New Roman', serif",
          stroke: '#efe2bf', 'stroke-width': 6, 'paint-order': 'stroke'
        }, g);
        t.textContent = contenu;
        t.animate([{ transform: 'translateY(0)', opacity: 1 }, { transform: 'translateY(-34px)', opacity: 0 }], { duration: 1400, easing: 'ease-out' })
          .onfinish = function () { g.remove(); };
      }
      // Un croisement compte au moment ou deux personnes se rapprochent (pas tant qu'elles
      // restent cote a cote). Regles :
      //  - premiere rencontre entre deux spectateurs : +1 chacun ; mais celui qui croise un
      //    porteur de bouclier marque +0, et le porteur perd son bouclier ;
      //  - premiere rencontre avec le streamer : +2 et un bouclier ; le recroiser rend le
      //    bouclier perdu, sans nouveaux points ;
      //  - croiser un modo : -1 (score jamais negatif) ; avec un bouclier, il protege (+0) et s'use ;
      //  - un sub gagne BONUS_SUB de plus a chaque croisement qui lui rapporte des points ;
      //  - streamer et modos ne marquent rien entre eux.
      var proches = new Set();
      function croisements() {
        var ks = Object.keys(marcheurs), maintenant = new Set();
        for (var i = 0; i < ks.length; i++) {
          for (var j = i + 1; j < ks.length; j++) {
            var a = marcheurs[ks[i]], b = marcheurs[ks[j]];
            if (Math.hypot(a.x - b.x, a.y - b.y) > RAYON) continue;
            var cle = a.k < b.k ? a.k + '|' + b.k : b.k + '|' + a.k;
            maintenant.add(cle);
            if (proches.has(cle)) continue;   // deja cote a cote
            if (a.horsJeu && b.horsJeu) continue;
            if (a.streamer || b.streamer) {
              var v = a.streamer ? b : a, iv = info(v.k), premiere = !iv.croises.has(a.streamer ? a.k : b.k);
              var gainS = 2 + (v.sub ? BONUS_SUB : 0);
              if (premiere) { iv.croises.add(a.streamer ? a.k : b.k); iv.score += gainS; }
              if (premiere || !iv.bouclier) {
                iv.bouclier = true; habiller(v); couronner();
                bulle(v, premiere ? '+' + gainS + ' ✦' : '✦', RUBIS);
              }
              continue;
            }
            if (a.mod || b.mod) {
              var vm = a.mod ? b : a, im = info(vm.k);
              if (im.bouclier) { im.bouclier = false; bulle(vm, '+0', '#8a7a6a'); }
              else { im.score = Math.max(0, im.score - MALUS_MODO); bulle(vm, '-' + MALUS_MODO, '#9a2a1a'); }
              habiller(vm); couronner();
              continue;
            }
            var ia = info(a.k), ib = info(b.k);
            if (ia.croises.has(b.k)) continue;
            ia.croises.add(b.k); ib.croises.add(a.k);
            var gainA = ib.bouclier ? 0 : 1 + (a.sub ? BONUS_SUB : 0), gainB = ia.bouclier ? 0 : 1 + (b.sub ? BONUS_SUB : 0);
            ia.score += gainA; ib.score += gainB;
            if (gainB === 0) ia.bouclier = false;   // le bouclier de a a protege : il est use
            if (gainA === 0) ib.bouclier = false;
            habiller(a); habiller(b);
            bulle(a, '+' + gainA, gainA ? ENCRE : '#8a7a6a'); bulle(b, '+' + gainB, gainB ? ENCRE : '#8a7a6a');
            couronner();
          }
        }
        proches = maintenant;
      }

      var ARRET = cfg('maraudeur.arret', [1.5, 4]), ENTRE_ARRETS = cfg('maraudeur.entreArrets', [6, 16]);
      // statut : { streamer, mod, vip, sub, mois } (true seul = streamer)
      function apparaitre(nom, statut) {
        var st = statut === true ? { streamer: true } : (statut || {});
        var k = nom.toLowerCase(), now = performance.now();
        if (marcheurs[k]) { if (!marcheurs[k].horsJeu) prolonger(marcheurs[k], now); return; }   // re-commande : prolonge
        var horsJeu = !!(st.streamer || st.mod);
        var spectateurs = Object.keys(marcheurs).filter(function (c) { return !marcheurs[c].horsJeu; }).length;
        if (!horsJeu && spectateurs >= MAX) return;
        var duree = DUREE * Math.max(1, st.vip ? DUREE_VIP : 1, st.sub ? DUREE_SUB : 1);
        var de = choisir(listeNoeuds);
        var m = marcheurs[k] = {
          k: k, streamer: !!st.streamer, mod: !!st.mod && !st.streamer, sub: !!st.sub, horsJeu: horsJeu, duree: duree,
          de: de, vers: choisir(de.v), s: 0, prochainPas: 0, gauche: false, x: de.x, y: de.y,
          fin: horsJeu ? Infinity : now + duree, nom: banderole(nom, st), vitesse: VITESSE * hasard(0.85, 1.15),
          pauseFin: 0, prochainePause: now + hasard(ENTRE_ARRETS[0], ENTRE_ARRETS[1]) * 1000
        };
        habiller(m);
        couronner();
        if (!enCours) { enCours = true; dernier = now; requestAnimationFrame(frame); }
      }

      // Temps ecoule : le marcheur ne s'evapore pas sur place, il s'en va. Soit il rentre dans
      // le premier batiment qu'il longe (les pas entrent dans la maison), soit il gagne la
      // sortie de la carte la plus proche (rue qui file hors du cadre) par le plus court chemin.
      function sortiePlusProche(depart) {
        var vus = new Map([[depart, null]]), file = [depart], secours = null;
        while (file.length) {
          var n = file.shift();
          if (n !== depart && n.v.length === 1) {
            var auBord = n.x < FX + 90 || n.x > FX + FW - 90 || n.y < FY + 90 || n.y > FY + FH - 90;
            if (auBord) { secours = n; break; }
          }
          n.v.forEach(function (w) { if (!vus.has(w)) { vus.set(w, n); file.push(w); } });
        }
        if (!secours) return null;
        var chemin = [];
        for (var c = secours; c && c !== depart; c = vus.get(c)) chemin.unshift(c);
        return chemin;
      }
      function partir(m, now) {
        m.etat = Math.random() < 0.5 ? 'rentre' : 'sort';
        m.limite = now + 40000;   // garde-fou : s'efface quoi qu'il arrive
        if (m.etat === 'sort') {
          // sortie trop loin (plus de ~1500 px de marche) : il rentre plutot dans une maison
          m.chemin = sortiePlusProche(m.vers);
          if (!m.chemin || m.chemin.length > 30) m.etat = 'rentre';
        }
      }
      // Point d'arrivee hors graphe (porte d'une maison, ou au-dela du bord de la carte).
      function versPoint(m, x, y) { m.cible = true; return { x: x, y: y, v: [] }; }
      function prochainNoeud(m) {
        if (m.cible) return null;                                        // arrive : on disparait
        if (m.etat === 'rentre') {
          var meilleur = null, dMin = 190;
          entrees.forEach(function (e) { var d = Math.hypot(e[0] - m.vers.x, e[1] - m.vers.y); if (d < dMin) { dMin = d; meilleur = e; } });
          if (meilleur) return versPoint(m, m.vers.x + (meilleur[0] - m.vers.x) * 0.85, m.vers.y + (meilleur[1] - m.vers.y) * 0.85);
        }
        if (m.etat === 'sort') {
          if (m.chemin.length) return m.chemin.shift();
          // bout de rue au bord du cadre : on continue tout droit hors de la carte
          var dx = m.vers.x - m.de.x, dy = m.vers.y - m.de.y, l = Math.hypot(dx, dy) || 1;
          return versPoint(m, m.vers.x + dx / l * 160, m.vers.y + dy / l * 160);
        }
        // Carrefour : on repart dans une rue au hasard, sans faire demi-tour sauf impasse.
        var suite = m.vers.v.filter(function (n) { return n !== m.de; });
        return choisir(suite.length ? suite : m.vers.v);
      }
      function disparaitre(k) {
        var m = marcheurs[k];
        m.nom.g.setAttribute('opacity', 0);
        setTimeout(function () { m.nom.g.remove(); }, 1600);
        delete marcheurs[k];
        couronner();
      }
      function prolonger(m, now) {
        m.fin = now + m.duree;
        if (!m.etat) return;
        if (m.cible) {
          // il allait rentrer / sortir : demi-tour vers le dernier carrefour
          var len = Math.hypot(m.vers.x - m.de.x, m.vers.y - m.de.y), de = m.de;
          m.de = m.vers; m.vers = de; m.s = len - m.s; m.prochainPas = m.s; m.cible = false;
        }
        m.etat = null; m.chemin = null;
      }

      var dernier = 0;
      function frame(now) {
        var dt = Math.min(0.1, (now - dernier) / 1000);
        dernier = now;
        Object.keys(marcheurs).forEach(function (k) {
          var m = marcheurs[k];
          if (now > m.fin && !m.etat) partir(m, now);
          if (m.etat && now > m.limite) { disparaitre(k); return; }
          var len = Math.hypot(m.vers.x - m.de.x, m.vers.y - m.de.y);
          var dx = (m.vers.x - m.de.x) / len, dy = (m.vers.y - m.de.y) / len;
          // Arret de temps en temps pendant la promenade : il s'immobilise, pieds joints.
          if (!m.etat && now > m.prochainePause) {
            m.pauseFin = now + hasard(ARRET[0], ARRET[1]) * 1000;
            m.prochainePause = m.pauseFin + hasard(ENTRE_ARRETS[0], ENTRE_ARRETS[1]) * 1000;
            m.pas = m.pas || [];
            m.pas.push(empreinte(m.x, m.y, dx, dy, m.gauche));
            if (m.pas.length > 3) m.pas.shift().classList.add('pas-fin');
          }
          if (now >= m.pauseFin) {
            m.s += m.vitesse * dt;
            while (m.s >= len) {
              var suivant = prochainNoeud(m);
              if (!suivant) { disparaitre(k); return; }   // entre dans la maison / sorti de la carte
              m.s -= len; m.prochainPas -= len;
              m.de = m.vers; m.vers = suivant;
              len = Math.hypot(m.vers.x - m.de.x, m.vers.y - m.de.y);
            }
            dx = (m.vers.x - m.de.x) / len; dy = (m.vers.y - m.de.y) / len;
            while (m.s >= m.prochainPas) {
              // 3 empreintes au plus par personne : la plus ancienne s'efface quand une nouvelle apparait
              m.pas = m.pas || [];
              m.pas.push(empreinte(m.de.x + dx * m.prochainPas, m.de.y + dy * m.prochainPas, dx, dy, m.gauche));
              if (m.pas.length > 3) m.pas.shift().classList.add('pas-fin');
              m.gauche = !m.gauche;
              m.prochainPas += PAS;
            }
          }
          m.x = m.de.x + dx * m.s; m.y = m.de.y + dy * m.s;
          m.nom.g.setAttribute('transform', 'translate(' + m.x.toFixed(1) + ',' + (m.y - 36).toFixed(1) + ')');
        });
        croisements();
        enCours = Object.keys(marcheurs).length > 0;
        if (enCours) requestAnimationFrame(frame);
      }

      // Test sans chat : ?carte=Pseudo1,Pseudo2 dans l'URL (statuts : Pseudo:mod, Pseudo:vip,
      // Pseudo:sub12...), ou carteMaraudeur('Pseudo', { vip: true }) en console.
      window.carteMaraudeur = apparaitre;
      // Le streamer se promene en permanence sur la carte (maraudeur.streamer, '' = absent).
      var STREAMER = String(cfg('maraudeur.streamer', 'Elwe'));
      if (STREAMER) apparaitre(STREAMER, true);
      var test = /[?&]carte=([^&?]*)/.exec(location.search);
      if (test) decodeURIComponent(test[1]).split(',').forEach(function (n) {
        var parts = n.trim().split(':'), st = {};
        parts.slice(1).forEach(function (p) { var sm = /^sub(\d*)$/.exec(p); if (sm) { st.sub = true; st.mois = +sm[1] || 0; } else st[p] = true; });
        if (parts[0]) apparaitre(parts[0], st);
      });

      // Modos et VIP de la chaine via l'API Twitch (identifiants dans twitch-secrets.js ou dans
      // l'URL, a obtenir avec "node twitch-connexion.js") : ils apparaissent d'office sur la carte au
      // chargement (modos permanents, VIP pour leur duree), et leur statut est reconnu quand
      // ils tapent la commande meme si le chat ne le precise pas. Sans identifiants : rien de plus.
      var modosChaine = new Set(), vipsChaine = new Set();
      // Sur GitHub Pages (pas de twitch-secrets.js publie), les identifiants passent dans l'URL
      // de la source OBS apres un # : ...#twitch=IDCLIENT:JETONRENOUVELLEMENT (le # n'est jamais
      // envoye au serveur ; valeur donnee par "node twitch-connexion.js obs").
      var SECRETS = window.TWITCH_SECRETS || {};
      var parUrl = /[#&]twitch=([^:&]+):([^&]+)/.exec(location.hash);
      // (un # mal colle ne doit pas empecher la suite : le chat et la commande marchent sans l'API)
      try { if (parUrl) SECRETS = { clientId: decodeURIComponent(parUrl[1]), refreshToken: decodeURIComponent(parUrl[2]) }; }
      catch (e) { console.warn('[Maraudeur] #twitch= illisible dans l\'URL'); }
      var jetonAcces = SECRETS.token;
      function memoire(cle, valeur) {
        try { if (valeur === undefined) return localStorage.getItem(cle); localStorage.setItem(cle, valeur); } catch (e) {}
        return null;
      }
      // Le token ne vit que 4 h : a chaque chargement on en demande un neuf avec le jeton de
      // renouvellement. Celui-ci ne sert qu'une fois : le suivant est garde dans le navigateur
      // (OBS), sauf si twitch-secrets.js a ete refait depuis (son jeton est alors plus recent).
      function renouveler() {
        var garde = memoire('maraudeur-refresh-source') === SECRETS.refreshToken ? memoire('maraudeur-refresh') : null;
        var essais = [garde, SECRETS.refreshToken].filter(function (j, i, l) { return j && l.indexOf(j) === i; });
        function essai(i) {
          if (i >= essais.length) return Promise.resolve(SECRETS.token);
          return fetch('https://id.twitch.tv/oauth2/token', { method: 'POST', body: new URLSearchParams({ client_id: SECRETS.clientId, grant_type: 'refresh_token', refresh_token: essais[i] }) })
            .then(function (rep) { return rep.json(); })
            .then(function (j) {
              if (!j.access_token) return essai(i + 1);
              memoire('maraudeur-refresh', j.refresh_token);
              memoire('maraudeur-refresh-source', SECRETS.refreshToken);
              return j.access_token;
            });
        }
        return essai(0);
      }
      function helix(url, liste) {
        liste = liste || [];
        return fetch(url, { headers: { 'Client-Id': SECRETS.clientId, Authorization: 'Bearer ' + jetonAcces } })
          .then(function (rep) { if (!rep.ok) throw new Error(url + ' : ' + rep.status); return rep.json(); })
          .then(function (rep) {
            liste = liste.concat(rep.data || []);
            var suite = rep.pagination && rep.pagination.cursor;   // plus de 100 : page suivante
            return suite ? helix(url.replace(/&after=[^&]*/, '') + '&after=' + suite, liste) : liste;
          });
      }
      function placerEquipe(modos, vips) {
        modos.forEach(function (u) { modosChaine.add(u.user_login); apparaitre(u.user_name, { mod: true }); });
        vips.forEach(function (u) { vipsChaine.add(u.user_login); apparaitre(u.user_name, { vip: true }); });
      }
      if (SECRETS.clientId && (SECRETS.token || SECRETS.refreshToken) && window.fetch) {
        renouveler()
          .then(function (jeton) {
            jetonAcces = jeton;
            return fetch('https://id.twitch.tv/oauth2/validate', { headers: { Authorization: 'OAuth ' + jeton } });
          })
          .then(function (rep) { return rep.json(); })
          .then(function (v) {
            if (!v.user_id) throw new Error('connexion expiree : relancer "node twitch-connexion.js"');
            var parChaine = '?broadcaster_id=' + v.user_id + '&first=100';
            return Promise.all([helix('https://api.twitch.tv/helix/moderation/moderators' + parChaine), helix('https://api.twitch.tv/helix/channels/vips' + parChaine)]);
          })
          .then(function (listes) {
            memoire('maraudeur-equipe', JSON.stringify(listes));   // derniere liste connue
            placerEquipe(listes[0], listes[1]);
          })
          .catch(function (e) {
            console.warn('[Maraudeur] API Twitch :', e.message);
            // Twitch injoignable ou connexion expiree : on reprend la derniere liste connue
            try { var equipe = JSON.parse(memoire('maraudeur-equipe')); if (equipe) placerEquipe(equipe[0], equipe[1]); } catch (err) {}
          });
      }

      // Pseudos de test (Test1, Test2...) : n de 0 a 10, certains VIP ou subs au hasard pour voir
      // les insignes. Aussi en console : pseudosDeTest(5).
      function pseudosDeTest(n) {
        n = Math.max(0, Math.min(10, n | 0));
        for (var i = 1; i <= n; i++) {
          var abo = Math.random() < 0.3;
          apparaitre('Test' + i, { vip: Math.random() < 0.2, sub: abo, mois: abo ? Math.floor(hasard(1, 25)) : 0 });
        }
      }
      window.pseudosDeTest = pseudosDeTest;

      // Chat Twitch en lecture seule (connexion anonyme "justinfan", sans token).
      var CHAINE = String(cfg('maraudeur.chaine', '')).replace(/^#/, '').toLowerCase();
      var COMMANDES = cfg('maraudeur.commandes', ['!carte']).map(function (c) { return String(c).toLowerCase(); });
      if (!CHAINE || !window.WebSocket) return;
      var attente = 1000;
      function connecter() {
        var ws = new WebSocket('wss://irc-ws.chat.twitch.tv:443');
        ws.onopen = function () {
          attente = 1000;
          ws.send('CAP REQ :twitch.tv/tags');
          ws.send('PASS SCHMOOPIIE');
          ws.send('NICK justinfan' + Math.floor(hasard(10000, 99999)));
          ws.send('JOIN #' + CHAINE);
        };
        ws.onmessage = function (ev) {
          String(ev.data).split('\r\n').forEach(function (ligne) {
            if (ligne.indexOf('PING') === 0) { ws.send('PONG' + ligne.slice(4)); return; }
            var msg = /^(?:@(\S+) )?:(\w+)!\S+ PRIVMSG #\S+ :(.*)$/.exec(ligne);
            if (!msg) return;
            var mot = msg[3].trim().split(/\s+/)[0].toLowerCase();
            if (COMMANDES.indexOf(mot) < 0) return;
            // tags IRC : statut du spectateur (modo, VIP, sub et mois d'abonnement)
            var tags = {};
            (msg[1] || '').split(';').forEach(function (t) { var i = t.indexOf('='); tags[t.slice(0, i)] = t.slice(i + 1); });
            var badges = tags.badges || '', mois = /(?:subscriber|founder)\/(\d+)/.exec(tags['badge-info'] || '');
            // Le streamer (deja sur la carte) qui tape la commande : pseudos de test, "!carte 5"
            // pour en avoir 5, sinon un nombre au hasard entre 0 et 10.
            if (msg[2] === CHAINE || /(^|,)broadcaster\//.test(badges)) {
              var demande = parseInt(msg[3].trim().split(/\s+/)[1], 10);
              pseudosDeTest(isFinite(demande) ? demande : Math.floor(hasard(0, 11)));
              return;
            }
            apparaitre(tags['display-name'] || msg[2], {
              mod: tags.mod === '1' || /(^|,)moderator\//.test(badges) || modosChaine.has(msg[2]),
              vip: tags.vip === '1' || /(^|,)vip\//.test(badges) || vipsChaine.has(msg[2]),
              sub: tags.subscriber === '1' || /(^|,)(subscriber|founder)\//.test(badges),
              mois: mois ? +mois[1] : 0
            });
          });
        };
        // Coupure (reseau, redemarrage Twitch) : reconnexion avec attente croissante.
        ws.onclose = function () { setTimeout(connecter, attente); attente = Math.min(attente * 2, 60000); };
      }
      connecter();
    })();
});
