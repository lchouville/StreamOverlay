// Calque 4 : lumieres, horloge, portes, fumees, cloche, puits, vent, souris.
// Modules repris du script de ville-medievale-croquis.svg ; outils communs (cfg, cfgMs,
// heureVirtuelle, setAttrSiChange...) et cycle jour/nuit dans calques-commun.js.
window.addEventListener('load', function () {
    // ~1/3 des fenetres restent eteintes (decale au hasard a chaque chargement)
    Array.prototype.forEach.call(document.querySelectorAll('.win-light'), function (e) { if (!e.querySelector('.lanterne') && Math.random() < cfg('lumieres.eteintes', 0.35)) e.style.display = 'none'; });
    Array.prototype.forEach.call(document.querySelectorAll('.flame-glow.lanterne'), function (e) { e.parentNode.classList.add('exterieur'); var h = e.parentNode.querySelector('.lum-halo'); if (h) h.setAttribute('fill', 'url(#lum-lanterne)'); e.style.animationDelay = (-Math.random()).toFixed(2) + 's'; });
    // Lumieres des fenetres : multiplicateur des durees/delais inline.
    var lightK = cfg('lumieres.duree', 1);
    if (lightK !== 1) {
      Array.prototype.forEach.call(document.querySelectorAll('.win-light'), function (e) {
        e.style.animationDuration = (parseFloat(e.style.animationDuration) * lightK) + 's';
        e.style.animationDelay = (parseFloat(e.style.animationDelay) * lightK) + 's';
      });
    }

    (function () {
      // Mouvement "a l'ancienne" : l'aiguille des secondes avance par a-coups
      // (un tic par seconde), comme une horloge mecanique a echappement,
      // plutot qu'un balayage continu de montre a quartz.
      var hourHand = document.getElementById('hand-hour');
      var minuteHand = document.getElementById('hand-minute');
      var secondHand = document.getElementById('hand-second');
      // En mode accelere, l'aiguille des secondes tournerait bien trop vite pour etre
      // lisible : on la masque et on ne s'occupe plus que des heures/minutes.
      if (tempsMode === 'accelere') secondHand.style.display = 'none';

      // Mise a jour a chaque frame : en mode accelere l'aiguille des minutes fait un tour en
      // quelques secondes, un rafraichissement a la seconde la faisait sauter par a-coups.
      // En mode reel, heureVirtuelle() ne change qu'a chaque seconde : setAttrSiChange evite
      // alors les ecritures inutiles et l'aiguille des secondes garde son tic mecanique.
      function update() {
        var h = heureVirtuelle();
        var totalSec = h * 3600;

        var minAngle = (totalSec % 3600) / 3600 * 360;
        var hourAngle = (h % 12) / 12 * 360;

        setAttrSiChange(hourHand, 'transform', 'rotate(' + hourAngle.toFixed(2) + ')');
        setAttrSiChange(minuteHand, 'transform', 'rotate(' + minAngle.toFixed(2) + ')');
        if (tempsMode !== 'accelere') {
          var secAngle = (totalSec % 60) / 60 * 360;
          setAttrSiChange(secondHand, 'transform', 'rotate(' + secAngle.toFixed(2) + ')');
        }
        requestAnimationFrame(update);
      }

      update();
    })();

    (function () {
      // Portes : ouvertures aleatoires (quand, quel battant, de combien, a quelle vitesse).
      // Chaque battant est redessine a chaque image : ses points (contour, hachures du bois,
      // traverses, heurtoir) sont tournes en 3D autour de la charniere puis projetes en
      // perspective (oeil au centre de la porte, a la distance eye.d). Les hachures suivent
      // donc le battant au lieu d'etre etirees comme une image.
      var NS = 'http://www.w3.org/2000/svg';
      var defs = document.querySelector('defs');
      var clipCount = 0;

      function rand(a, b) { return a + Math.random() * (b - a); }
      function ease(t) { return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; }
      function el(tag, attrs, parent) {
        var e = document.createElementNS(NS, tag);
        for (var k in attrs) e.setAttribute(k, attrs[k]);
        if (parent) parent.appendChild(e);
        return e;
      }
      function quad(p0, c, p1, n) {
        var out = [];
        for (var i = 1; i <= n; i++) {
          var t = i / n, a = (1 - t) * (1 - t), b = 2 * (1 - t) * t, d = t * t;
          out.push([a * p0[0] + b * c[0] + d * p1[0], a * p0[1] + b * c[1] + d * p1[1]]);
        }
        return out;
      }
      function r2(v) { return Math.round(v * 100) / 100; }

      // Rotation autour de l'axe vertical x = hinge, puis projection perspective.
      // Renvoie [x, y, facteur d'echelle].
      function project(c, ang, x, y) {
        var u = x - c.hinge;
        var X = c.hinge + u * Math.cos(ang);
        var Z = (c.outward ? 1 : -1) * Math.abs(u) * Math.sin(ang);
        var s = c.eye.d / (c.eye.d - Z);
        return [c.eye.x + (X - c.eye.x) * s, c.eye.y + (y - c.eye.y) * s, s];
      }
      function setLine(e, p, q) {
        e.setAttribute('x1', r2(p[0])); e.setAttribute('y1', r2(p[1]));
        e.setAttribute('x2', r2(q[0])); e.setAttribute('y2', r2(q[1]));
      }

      function makeLeaf(parent, c) {
        var leaf = { c: c, angle: -1, tl: null };
        var id = 'battant-clip-' + (clipCount++);
        leaf.clip = el('path', {}, el('clipPath', { id: id, clipPathUnits: 'userSpaceOnUse' }, defs));

        // Corps du battant : meme rendu que le motif hatchWood + sketchyHeavy du calque.
        var g = el('g', { filter: 'url(#sketchyHeavy)' }, parent);
        leaf.fill = el('path', { fill: '#6b4a2e' }, g);
        var hatch = el('g', { 'clip-path': 'url(#' + id + ')', stroke: '#2a1a0a' }, g);
        var xmin = Math.min(c.hinge, c.free), xmax = Math.max(c.hinge, c.free);
        leaf.hLines = []; leaf.vLines = [];
        for (var y = Math.floor(c.top / 8) * 8 + 4; y <= c.bottom; y += 8)
          leaf.hLines.push({ y: y, e: el('line', { 'stroke-width': 1.5, opacity: 0.7 }, hatch) });
        for (var x = Math.floor(xmin / 8) * 8 + 4; x <= xmax; x += 8)
          leaf.vLines.push({ x: x, e: el('line', { opacity: 0.5 }, hatch) });
        leaf.shade = el('path', { fill: '#000', opacity: 0 }, g);
        leaf.edge = el('path', { fill: 'none', stroke: '#1a0f05', 'stroke-width': c.stroke }, g);

        // Traverses et anneaux/heurtoir (sketchyMedium, comme dans le calque).
        var det = el('g', { filter: 'url(#sketchyMedium)', stroke: '#1a0f05' }, parent);
        // p = [x1, y1, x2, y2] (traverse) ou [x1, y1, x2, y2, epaisseur, couleur] (penture).
        leaf.planks = c.planks.map(function (p) {
          return { p: p, e: el('line', p[4] ? { 'stroke-width': p[4], stroke: p[5], 'stroke-linecap': 'round' }
                                            : { 'stroke-width': 3 }, det) };
        });
        leaf.rings = c.rings.map(function (r) {
          return { r: r, e: el('ellipse', r.fill ? { fill: '#1a0f05', stroke: 'none' }
                                                 : { fill: 'none', 'stroke-width': r.w }, det) };
        });
        return leaf;
      }

      function render(leaf, ang) {
        if (ang === leaf.angle) return;
        leaf.angle = ang;
        var c = leaf.c;
        var d = 'M ' + c.outline.map(function (p) {
          var q = project(c, ang, p[0], p[1]);
          return r2(q[0]) + ',' + r2(q[1]);
        }).join(' L ') + ' Z';
        leaf.fill.setAttribute('d', d);
        leaf.clip.setAttribute('d', d);
        leaf.shade.setAttribute('d', d);
        leaf.edge.setAttribute('d', d);
        // Le battant s'assombrit en tournant (il quitte la lumiere de la rue).
        leaf.shade.setAttribute('opacity', r2((c.outward ? 0.2 : 0.45) * Math.sin(ang)));

        leaf.hLines.forEach(function (h) {
          setLine(h.e, project(c, ang, c.hinge, h.y), project(c, ang, c.free, h.y));
        });
        var vw = r2(Math.max(0.35, Math.cos(ang)));
        leaf.vLines.forEach(function (v) {
          setLine(v.e, project(c, ang, v.x, c.top), project(c, ang, v.x, c.bottom));
          v.e.setAttribute('stroke-width', vw);
        });
        leaf.planks.forEach(function (pl) {
          setLine(pl.e, project(c, ang, pl.p[0], pl.p[1]), project(c, ang, pl.p[2], pl.p[3]));
        });
        leaf.rings.forEach(function (rg) {
          var q = project(c, ang, rg.r.x, rg.r.y);
          rg.e.setAttribute('cx', r2(q[0])); rg.e.setAttribute('cy', r2(q[1]));
          rg.e.setAttribute('rx', r2(Math.max(0.5, rg.r.r * Math.cos(ang) * q[2])));
          rg.e.setAttribute('ry', r2(rg.r.r * q[2]));
        });
      }

      // Fondu (ms) entre la porte peinte du calque et l'overlay anime, porte encore fermee :
      // un basculement instantane faisait "sauter" la porte a l'apparition et a la disparition
      // (le rendu des battants ne peut pas etre identique au pixel pres a celui du calque).
      var FONDU = 250;

      // Angle courant d'un battant selon sa sequence ouverture / pause / fermeture.
      // tl.start = debut du mouvement ; l'overlay apparait FONDU ms avant et disparait FONDU ms
      // apres, battant ferme.
      function angleAt(leaf, now) {
        var tl = leaf.tl;
        if (!tl) return 0;
        var t = now - tl.start;
        if (t < 0) return 0;
        if (t < tl.open) return tl.max * ease(t / tl.open);
        t -= tl.open;
        if (t < tl.hold) return tl.max;
        t -= tl.hold;
        if (t < tl.close) return tl.max * (1 - ease(t / tl.close));
        if (t > tl.close + FONDU) leaf.tl = null;
        return 0;
      }
      // Opacite de l'overlay pour ce battant : 0 -> 1 avant le mouvement, 1 -> 0 apres.
      function alphaAt(leaf, now) {
        var tl = leaf.tl;
        if (!tl) return 0;
        var t = now - tl.start, total = tl.open + tl.hold + tl.close;
        return Math.max(0, Math.min(1, (t + FONDU) / FONDU, (total + FONDU - t) / FONDU));
      }

      var doors = [];
      var running = false;
      function tick(now) {
        var active = false;
        doors.forEach(function (door) {
          var any = false, alpha = 0;
          door.leaves.forEach(function (leaf) {
            render(leaf, angleAt(leaf, now));
            alpha = Math.max(alpha, alphaAt(leaf, now));
            if (leaf.tl) any = true;
          });
          // Porte fermee : on masque l'overlay et c'est la porte du calque qui s'affiche.
          door.group.setAttribute('display', any ? 'inline' : 'none');
          door.group.setAttribute('opacity', alpha.toFixed(3));
          if (any) active = true;
        });
        running = active;
        if (active) requestAnimationFrame(tick);
      }

      // amount : 0..1 (fraction de l'ouverture maxi c.maxDeg). Renvoie la duree totale (ms),
      // fondus compris.
      function swing(leaf, amount, delay) {
        leaf.tl = {
          start: performance.now() + delay + FONDU,
          max: amount * leaf.c.maxDeg * Math.PI / 180,
          open: cfgMs('portes.ouverture', [2.2, 4]), hold: cfgMs('portes.ouverte', [1.2, 4.5]),
          close: cfgMs('portes.fermeture', [2.2, 4.5])
        };
        if (!running) { running = true; requestAnimationFrame(tick); }
        return delay + 2 * FONDU + leaf.tl.open + leaf.tl.hold + leaf.tl.close;
      }

      // --- Tour : double battant, s'ouvre vers l'interieur ---
      var tourGroup = document.getElementById('porte-tour');
      var tourEye = { x: 2520, y: 1505, d: 900 };
      var tourParent = tourGroup.querySelector('.battants');
      var tourG = makeLeaf(tourParent, {
        hinge: 2380, free: 2520, top: 1340, bottom: 1670, stroke: 6, maxDeg: 85, outward: false, eye: tourEye,
        outline: [[2380, 1670], [2380, 1420]]
          .concat(quad([2380, 1420], [2380, 1340], [2520, 1340], 10)).concat([[2520, 1670]]),
        // traverses + pentures en fer forge (presentes sur la porte peinte du calque)
        planks: [[2400, 1400, 2500, 1400], [2400, 1500, 2500, 1500], [2400, 1600, 2500, 1600],
                 [2384, 1450, 2470, 1450, 5, '#2a1a0a'], [2384, 1560, 2470, 1560, 5, '#2a1a0a']],
        rings: [{ x: 2510, y: 1520, r: 8, w: 3 }]
      });
      var tourD = makeLeaf(tourParent, {
        hinge: 2660, free: 2520, top: 1340, bottom: 1670, stroke: 6, maxDeg: 85, outward: false, eye: tourEye,
        outline: [[2660, 1670], [2660, 1420]]
          .concat(quad([2660, 1420], [2660, 1340], [2520, 1340], 10)).concat([[2520, 1670]]),
        planks: [[2540, 1400, 2640, 1400], [2540, 1500, 2640, 1500], [2540, 1600, 2640, 1600],
                 [2656, 1450, 2570, 1450, 5, '#2a1a0a'], [2656, 1560, 2570, 1560, 5, '#2a1a0a']],
        rings: [{ x: 2530, y: 1520, r: 8, w: 3 }]
      });
      doors.push({ group: tourGroup, leaves: [tourG, tourD] });

      // --- Auberge : battant unique, charniere a droite, pousse depuis l'interieur (vers la rue) ---
      var aubGroup = document.getElementById('porte-auberge');
      var auberge = makeLeaf(aubGroup.querySelector('.battants'), {
        hinge: 1300, free: 1200, top: 1570, bottom: 1750, stroke: 5, maxDeg: 70, outward: true,
        eye: { x: 1250, y: 1660, d: 450 },
        outline: [[1200, 1750], [1200, 1600]]
          .concat(quad([1200, 1600], [1200, 1570], [1250, 1570], 6))
          .concat(quad([1250, 1570], [1300, 1570], [1300, 1600], 6)).concat([[1300, 1750]]),
        planks: [],
        rings: [{ x: 1220, y: 1660, r: 6, w: 2.5 }, { x: 1220, y: 1660, r: 3, fill: true }]
      });
      doors.push({ group: aubGroup, leaves: [auberge] });

      // --- Guilde : double battant, s'ouvre vers l'interieur (comme la tour) ---
      var guildeGroup = document.getElementById('porte-guilde');
      var guildeEye = { x: 190, y: 390, d: 400 };
      var guildeParent = guildeGroup.querySelector('.battants');
      var guildeG = makeLeaf(guildeParent, {
        hinge: 130, free: 190, top: 310, bottom: 470, stroke: 5, maxDeg: 85, outward: false, eye: guildeEye,
        outline: [[130, 470], [130, 340]]
          .concat(quad([130, 340], [130, 310], [190, 310], 8)).concat([[190, 470]]),
        planks: [[150, 340, 190, 340], [150, 400, 190, 400], [150, 450, 190, 450]],
        rings: [{ x: 170, y: 390, r: 7, w: 3 }]
      });
      var guildeD = makeLeaf(guildeParent, {
        hinge: 250, free: 190, top: 310, bottom: 470, stroke: 5, maxDeg: 85, outward: false, eye: guildeEye,
        outline: [[250, 470], [250, 340]]
          .concat(quad([250, 340], [250, 310], [190, 310], 8)).concat([[190, 470]]),
        planks: [[190, 340, 230, 340], [190, 400, 230, 400], [190, 450, 230, 450]],
        rings: [{ x: 210, y: 390, r: 7, w: 3 }]
      });
      doors.push({ group: guildeGroup, leaves: [guildeG, guildeD] });

      // Double porte (tour, guilde) : un battant, l'autre, les deux ensemble ou les deux en
      // decale, chacun ouvert plus ou moins (pas toujours completement).
      function cycleDouble(g, d, pauseKey, pauseDef) {
        var mode = Math.floor(Math.random() * 4);
        var end = 0;
        function go(leaf, delay) { end = Math.max(end, swing(leaf, rand(0.3, 1), delay)); }
        if (mode === 0) go(g, 0);
        else if (mode === 1) go(d, 0);
        else if (mode === 2) { go(g, 0); go(d, rand(0, 300)); }
        else {
          var first = Math.random() < 0.5 ? g : d;
          go(first, 0);
          go(first === g ? d : g, rand(800, 3000));
        }
        setTimeout(function () { cycleDouble(g, d, pauseKey, pauseDef); }, end + cfgMs(pauseKey, pauseDef));
      }
      function cycleTour() { cycleDouble(tourG, tourD, 'portes.tour.pause', [15, 45]); }
      function cycleGuilde() { cycleDouble(guildeG, guildeD, 'portes.guilde.pause', [15, 40]); }

      function cycleAuberge() {
        var end = swing(auberge, rand(0.4, 1), 0);
        setTimeout(cycleAuberge, end + cfgMs('portes.auberge.pause', [18, 50]));
      }

      setTimeout(cycleTour, cfgMs('portes.tour.premiere', [4, 15]));
      setTimeout(cycleAuberge, cfgMs('portes.auberge.premiere', [8, 25]));
      setTimeout(cycleGuilde, cfgMs('portes.guilde.premiere', [6, 20]));
    })();

    (function () {
      // Fumees de cheminee a intensite variable : un niveau (0..1) derive lentement vers une
      // cible tiree au hasard toutes les 4-14 s (moments calmes, fumee normale, grosses
      // bouffees). Plus le niveau est haut, plus les bouffees sont frequentes, grosses,
      // opaques et montent haut.
      var NS = 'http://www.w3.org/2000/svg';
      function rand(a, b) { return a + Math.random() * (b - a); }

      // Force du vent a l'abscisse x (0..1) : meme rafale que le ble (keyframes wheatGust :
      // calme jusqu'a 55 %, pic a 70 %, retombee 82 %), meme vague qui traverse de gauche a droite.
      var GUSTD = cfg('ble.rafale', 11);
      function gustAt(x) {
        var t = (document.timeline ? document.timeline.currentTime : performance.now()) / 1000;
        var p = (((t - x / 450) % GUSTD) + GUSTD) % GUSTD / GUSTD;
        if (p < 0.55) return 0;
        if (p < 0.70) return (p - 0.55) / 0.15;
        if (p < 0.82) return 1 - 0.625 * (p - 0.70) / 0.12;
        return 0.375 * (1 - (p - 0.82) / 0.18);
      }
      var WIND = cfg('fumee.vent', 1);
      function smoke(id, wind) {
        var g = document.querySelector('#' + id + ' .puffs');
        var gx = document.getElementById(id).getBoundingClientRect().left;
        var level = rand(0.3, 0.6), target = level, nextChange = 0;

        function retarget(now) {
          var r = Math.random();
          var pForte = cfg('fumee.probaForte', 0.2), pCalme = cfg('fumee.probaCalme', 0.3);
          if (r < pForte) target = rand(0.85, 1);                 // grosse bouffee
          else if (r < pForte + pCalme) target = rand(0.05, 0.25); // presque eteint
          else target = rand(0.3, 0.6);                // normal
          nextChange = now + cfgMs('fumee.changement', [4, 14]);
        }

        function puff() {
          var I = level, k = 0.8 + 0.5 * I;
          var e = document.createElementNS(NS, 'ellipse');
          e.setAttribute('class', 'smoke-puff');
          e.setAttribute('cx', rand(-4, 4).toFixed(1));
          e.setAttribute('rx', (rand(9, 13) * k).toFixed(1));
          e.setAttribute('ry', (rand(7, 10) * k).toFixed(1));
          e.setAttribute('fill', Math.random() < 0.5 ? '#3a2a1a' : '#4a3826');
          e.setAttribute('opacity', 0);
          g.appendChild(e);
          // Vent de fond (vers la droite, comme le ble) + rafale : la fumee se couche et monte moins
          var gu = gustAt(gx);
          var dx = WIND * (20 + 110 * gu) + rand(-12, 12) + wind * 0.3, dy = -rand(140, 190) * k * (1 - 0.35 * gu);
          var a = e.animate([
            { transform: 'translate(0px,0px) scale(0.5)', opacity: 0 },
            { opacity: 0.15 + 0.45 * I, offset: 0.12 },
            { transform: 'translate(' + dx.toFixed(1) + 'px,' + dy.toFixed(1) + 'px) scale(' + (1.5 + I).toFixed(2) + ')', opacity: 0 }
          ], { duration: rand(3800, 5200) * (1 + 0.3 * I), easing: 'ease-out' });
          a.onfinish = function () { e.remove(); };
        }

        function step() {
          var now = performance.now();
          if (now > nextChange) retarget(now);
          level += (target - level) * 0.25;
          puff();
          setTimeout(step, (1800 - 1500 * level) * rand(0.8, 1.2) / Math.max(0.1, cfg('fumee.densite', 1)));
        }
        step();
      }

      if (cfg('fumee.actives.forge', true)) smoke('forge-smoke', 0);
      if (cfg('fumee.actives.boulangerie', true)) smoke('boulangerie-smoke', 0);
      if (cfg('fumee.actives.cabane', true)) smoke('cabane-smoke', 0);
      if (cfg('fumee.actives.paysan', true)) smoke('paysan-smoke', 0);
      if (cfg('fumee.actives.hobbit', true)) smoke('hobbit-smoke', 0);
    })();

    (function () {
      // Cloche de la chapelle : une volee environ toutes les 2 minutes. Balancement amorti
      // autour de l'anse (montee ~1 s, ~4 s de volee, extinction ~3 s), amplitude limitee pour
      // rester dans la baie ; le battant suit avec un retard, ce qui le fait frapper la robe.
      var robe = document.querySelector('#cloche-chapelle .robe');
      var battant = document.querySelector('#cloche-chapelle .battant');
      var A = cfg('cloche.amplitude', 10), T = cfg('cloche.balancement', 1.5) * 1000;
      var DUR = cfg('cloche.duree', 8) * 1000, LAG = 180;
      // Enveloppe : montee 1/8, volee jusqu'a 5/8, extinction sur le reste.
      function env(t) {
        if (t < 0 || t > DUR) return 0;
        if (t < DUR / 8) return t / (DUR / 8);
        if (t < DUR * 5 / 8) return 1;
        return 1 - (t - DUR * 5 / 8) / (DUR * 3 / 8);
      }
      function angle(t) { return A * env(t) * Math.sin(2 * Math.PI * t / T); }
      var start = 0;
      function frame(now) {
        var t = now - start;
        var a = angle(t);
        robe.setAttribute('transform', 'rotate(' + a.toFixed(2) + ' -10 -125)');
        battant.setAttribute('transform', 'rotate(' + (1.6 * (angle(t - LAG) - a)).toFixed(2) + ' -10 -114)');
        if (t < DUR + LAG) requestAnimationFrame(frame);
        else { robe.removeAttribute('transform'); battant.removeAttribute('transform'); }
      }
      function ring() {
        start = performance.now();
        requestAnimationFrame(frame);
        setTimeout(ring, DUR + cfgMs('cloche.intervalle', [105, 135]));
      }
      setTimeout(ring, cfgMs('cloche.premiere', [20, 60]));
    })();

    (function () {
      // Puits : de temps en temps, on tourne la manivelle, le seau descend dans le puits
      // (disparait derriere la margelle), reste un instant, puis remonte plein, plus lentement.
      var root = document.getElementById('puits-treuil');
      var corde = root.querySelector('.corde'), seau = root.querySelector('.seau');
      var eau = root.querySelector('.eau'), bras = root.querySelector('.bras'), poignee = root.querySelector('.poignee');
      var gouttes = root.querySelectorAll('.goutte');
      var DOWN = cfg('puits.descente', 3) * 1000, WAIT = 1500, UP = cfg('puits.remontee', 4.5) * 1000;
      var DRAIN = cfg('puits.vidage', 7) * 1000;
      var DEPTH = 85, TURNS_PER_UNIT = 1 / 30, R = 18;  // 1 tour de manivelle par 30u de corde
      function ease(t) { return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2; }
      var start = 0, moving = DOWN + WAIT + UP, total = moving + DRAIN;
      function setCrank(angle) {
        var ky = -70 + R * Math.cos(angle);
        bras.setAttribute('y2', ky.toFixed(1));
        poignee.setAttribute('y1', ky.toFixed(1)); poignee.setAttribute('y2', ky.toFixed(1));
        // poignee derriere l'axe (sin<0) : plus fine, comme en retrait
        poignee.setAttribute('stroke-width', Math.sin(angle) < 0 ? 4 : 5.5);
      }
      function frame(now) {
        var t = now - start, off;
        if (t < DOWN) off = DEPTH * ease(t / DOWN);
        else if (t < DOWN + WAIT) off = DEPTH;
        else if (t < moving) off = DEPTH * (1 - ease((t - DOWN - WAIT) / UP));
        else off = 0;
        seau.setAttribute('transform', 'translate(0,' + off.toFixed(1) + ')');
        corde.setAttribute('y2', (56 + off).toFixed(1));
        setCrank(off * TURNS_PER_UNIT * 2 * Math.PI);
        // Eau : pleine a la remontee, puis le seau se vide par en dessous (niveau qui baisse, gouttes)
        var L = t < DOWN ? -1 : t < moving ? 0 : Math.min(1, (t - moving) / DRAIN);
        if (L < 0) { eau.setAttribute('opacity', 0); }
        else {
          eau.setAttribute('cy', (61 + 7 * L).toFixed(1));
          eau.setAttribute('rx', (13 - 3.5 * L).toFixed(1));
          eau.setAttribute('ry', (3.5 - 1.5 * L).toFixed(1));
          eau.setAttribute('opacity', (0.8 * (1 - L * L)).toFixed(2));
        }
        for (var i = 0; i < gouttes.length; i++) {
          if (t < moving || L >= 1) { gouttes[i].setAttribute('opacity', 0); continue; }
          var ph = ((t - moving) / (420 + 160 * i) + i * 0.5) % 1;   // une goutte toutes les ~0.5 s
          gouttes[i].setAttribute('cy', (91 + 14 * ph * ph).toFixed(1));
          gouttes[i].setAttribute('opacity', (0.9 * (1 - ph) * (1 - L)).toFixed(2));
        }
        if (t < total) requestAnimationFrame(frame);
        else { seau.removeAttribute('transform'); corde.setAttribute('y2', 56); setCrank(0); eau.setAttribute('opacity', 0); }
      }
      function cycle() {
        start = performance.now();
        requestAnimationFrame(frame);
        setTimeout(cycle, total + cfgMs('puits.intervalle', [40, 90]));
      }
      setTimeout(cycle, cfgMs('puits.premiere', [10, 30]));
    })();

    (function () {
      // Vent commun : force du vent (0..1) a l'abscisse x, au meme instant et avec les memes
      // cycles que le ble (rafale 'ble.rafale', balancement 'ble.balancement'), vague qui
      // traverse de gauche a droite. Pilote les fanions et les auvents des tentes.
      var GUSTD = cfg('ble.rafale', 11), SWAYD = cfg('ble.balancement', 3.4);
      var PUISSANCE = cfg('vent.puissance', 1);
      function now() { return (document.timeline ? document.timeline.currentTime : performance.now()) / 1000; }
      function gustAt(x, t) {
        var p = (((t - x / 450) % GUSTD) + GUSTD) % GUSTD / GUSTD;
        if (p < 0.55) return 0;
        if (p < 0.70) return (p - 0.55) / 0.15;
        if (p < 0.82) return 1 - 0.625 * (p - 0.70) / 0.12;
        return 0.375 * (1 - (p - 0.82) / 0.18);
      }
      function windAt(x, t) {
        var sway = 0.5 + 0.5 * Math.sin(2 * Math.PI * (t - x / 900) / SWAYD);
        return Math.min(1, PUISSANCE * (0.25 + 0.15 * sway + 0.6 * gustAt(x, t)));
      }
      function r1(v) { return Math.round(v * 10) / 10; }

      // --- Fanions : angle de chute (pend quand le vent tombe), ondulation plus ample et plus
      // rapide pendant les rafales.
      var flags = Array.prototype.map.call(document.querySelectorAll('#fanions .fanion'), function (e) {
        return { e: e, band: e.nextElementSibling && e.nextElementSibling.classList.contains('fanion-bande') ? e.nextElementSibling : null,
                 px: +e.dataset.px, py: +e.dataset.py, hp: +e.dataset.hp, L: +e.dataset.l, h: +e.dataset.h, ph: Math.random() * 6 };
      });
      var N = 16;
      function drawFlag(f, w) {
        var top = f.py - f.hp, a = (1 - w) * 0.85;               // 0 = horizontal, ~50 deg quand calme
        var ca = Math.cos(a), sa = Math.sin(a), amp = (0.2 + 0.6 * w) * f.h;
        var T = [], B = [], M = [];
        for (var i = 0; i <= N; i++) {
          var u = i / N, al = f.L * u * (0.85 + 0.15 * w);
          var off = amp * Math.sin(2 * Math.PI * 1.15 * u - f.ph) * u;
          var bx = f.px + al * ca, by = top + al * sa;
          var hw = f.h * (1 - u * 0.92);
          // perpendiculaire a la direction du fanion
          T.push([bx - sa * off, by + ca * off]);
          B.push([bx - sa * (off + hw), by + ca * (off + hw)]);
          M.push([bx - sa * (off + hw / 2), by + ca * (off + hw / 2)]);
        }
        var d = 'M ' + T.map(function (p) { return r1(p[0]) + ',' + r1(p[1]); }).join(' L ') + ' L ' +
                B.reverse().map(function (p) { return r1(p[0]) + ',' + r1(p[1]); }).join(' L ') + ' Z';
        f.e.setAttribute('d', d);
        if (f.band) f.band.setAttribute('d', 'M ' + M.slice(0, N).map(function (p) { return r1(p[0]) + ',' + r1(p[1]); }).join(' L '));
      }

      // --- Auvents : le bord festonne est souleve et pousse vers la droite selon le vent.
      var awnings = Array.prototype.map.call(document.querySelectorAll('#tentes-auvents .auvent'), function (e) {
        var g = e.dataset.geo.split(',').map(Number);
        var box = e.parentNode.getBoundingClientRect();
        return { e: e, W: g[0], T: g[1], B: g[2], dip: g[3], x: box.left + box.width / 2, ph: Math.random() * 6,
                 plis: e.parentNode.querySelector('.auvent-plis') };
      });
      function drawAwning(a, w) {
        var K = cfg('vent.tentes', 0.4);   // les toiles, lourdes et tendues, bougent peu
        var lift = K * (1.5 + 6 * w) * Math.sin(a.ph), dx = K * (2 + 9 * w + (1 + 2 * w) * Math.sin(a.ph + 0.6));
        var puff = -a.T - K * (1 + 4 * w) * Math.sin(a.ph + 1.2), W = a.W, B = a.B;
        var xs = [W + 10, W * 0.5 + 10, W * 0.07 - 10, -W * 0.36 - 10, -W * 0.86, -W - 10];
        var d = 'M ' + (-W) + ',20 Q 0,' + r1(puff) + ' ' + W + ',20 L ' + r1(xs[0] + dx) + ',' + r1(B + lift);
        for (var i = 0; i < 5; i++) {
          var p = xs[i] + dx * (1 - i * 0.12), q = xs[i + 1] + dx * (1 - (i + 1) * 0.12);
          var wv = K * (1 + 3 * w) * Math.sin(a.ph + i * 0.9);
          d += ' Q ' + r1((p + q) / 2) + ',' + r1(B + a.dip + lift + wv) + ' ' + r1(q) + ',' + r1(B + lift + wv * 0.5);
        }
        a.e.setAttribute('d', d + ' Z');
        if (a.plis) a.plis.setAttribute('transform', 'translate(' + r1(dx * 0.5) + ',' + r1(lift * 0.5) + ')');
      }

      var last = performance.now();
      function frame(t) {
        var dt = Math.min(0.1, (t - last) / 1000); last = t;
        var tn = now();
        flags.forEach(function (f) { var w = windAt(f.px, tn); f.ph += dt * 2 * Math.PI * (0.5 + 1.3 * w); drawFlag(f, w); });
        awnings.forEach(function (a) { var w = windAt(a.x, tn); a.ph += dt * 2 * Math.PI * (0.18 + 0.35 * w); drawAwning(a, w); });
        requestAnimationFrame(frame);
      }
      requestAnimationFrame(frame);
    })();

    (function () {
      // Souris : de temps en temps, une souris traverse le bas de la place au trot, du bord de
      // l'ovale jusqu'au bord droit du cadre (dans un sens ou dans l'autre), en passant derriere
      // le puits. Elle s'arrete renifler a cote du puits (et parfois une fois avant), puis repart. Trot : patte arriere d'un cote en phase avec la patte
      // avant de l'autre ; chaque patte plie le genou pendant qu'elle revient vers l'avant.
      var place = document.getElementById('souris-place');
      if (!place) return;
      var pos = place.querySelector('.pos');
      function rand(a, b) { return a + Math.random() * (b - a); }
      function part(id) { return document.getElementById('souris-' + id); }
      // rotation autour du pivot donne par l'attribut transform-origin de l'element
      function rot(e, a) { e.setAttribute('transform', 'rotate(' + a.toFixed(1) + ')'); }
      var pattes = [['arriere-d', 0], ['avant-g', 0], ['arriere-g', Math.PI], ['avant-d', Math.PI]].map(function (p) {
        return { c: part('cuisse-' + p[0]), j: part('jambe-' + p[0]), p: part('pied-' + p[0]), ph: p[1], avant: p[0].indexOf('avant') === 0 };
      });
      var corps = part('corps'), tete = part('tete'), queue = part('queue'), oreille = part('oreille');
      var XG = 2980, XD = 3820;            // bord gauche (cache par l'ovale) / hors du cadre a droite
      var PUITS_G = 3490, PUITS_D = 3710;  // arrets juste a gauche / a droite du puits
      var CENTRE_X = 140, PIED_Y = 149;    // point d'appui de la souris dans mouse.svg

      function traversee() {
        var dir = Math.random() < 0.5 ? 1 : -1;
        var taille = cfg('souris.taille', 0.17), vMax = cfg('souris.vitesse', 45);
        // juste derriere la margelle (elle passe cachee par le puits)
        var y = rand(1500, 1515), x = dir > 0 ? XG : XD, xFin = dir > 0 ? XD : XG;
        // arret pour renifler au pied du puits, avant de passer derriere ; parfois un autre sur
        // la partie gauche de la place (la seule assez large)
        var arrets = [dir > 0 ? PUITS_G : PUITS_D];
        if (Math.random() < 0.5) arrets.push(rand(3150, 3400));
        arrets.sort(function (a, b) { return (a - b) * dir; });
        var foulee = taille * 48;            // distance parcourue par cycle de pattes
        var v = vMax, ph = 0, pause = 0, t = 0, last = performance.now();
        place.removeAttribute('display');
        function frame(now) {
          var dt = Math.min(0.1, Math.max(0, now - last) / 1000); last = now; t += dt;
          if (pause > 0) {
            pause -= dt; v = Math.max(0, v - vMax * 4 * dt);
          } else {
            if (arrets.length && (arrets[0] - x) * dir <= 0) { arrets.shift(); pause = cfgMs('souris.arret', [1.5, 4]) / 1000; }
            v = Math.min(vMax, v + vMax * 3 * dt);
          }
          x += dir * v * dt;
          ph += dt * v / foulee * 2 * Math.PI;
          var k = v / vMax;                  // 0 a l'arret, 1 au trot : amplitude des mouvements
          pattes.forEach(function (p) {
            var a = ph + p.ph;
            var c = (p.avant ? 22 : 28) * Math.sin(a) * k;
            var j = -(p.avant ? 16 : 22) * Math.max(0, Math.cos(a)) * k;
            rot(p.c, c); rot(p.j, j); rot(p.p, -(c + j) * 0.6);
          });
          var bond = (-2.5 * Math.abs(Math.sin(ph)) * k).toFixed(2);
          corps.setAttribute('transform', 'translate(0,' + bond + ')');
          // a l'arret : museau baisse qui renifle (petits hochements rapides)
          var renifle = (1 - k) * (4 + 3 * Math.sin(t * 22));
          tete.setAttribute('transform', 'translate(0,' + bond + ') rotate(' + (renifle + 2 * Math.sin(ph) * k).toFixed(1) + ')');
          queue.setAttribute('transform', 'translate(0,' + bond + ') rotate(' + (4 * k + 5 * Math.sin(t * 2.3) + 2 * Math.sin(ph * 0.5)).toFixed(1) + ')');
          rot(oreille, Math.sin(t * 9) > 0.96 ? -12 : 0);
          pos.setAttribute('transform', 'translate(' + x.toFixed(1) + ',' + y.toFixed(1) + ') scale(' + (taille * dir) + ',' + taille + ') translate(' + -CENTRE_X + ',' + -PIED_Y + ')');
          if ((xFin - x) * dir > 0) requestAnimationFrame(frame);
          else { place.setAttribute('display', 'none'); setTimeout(traversee, cfgMs('souris.pause', [40, 120])); }
        }
        requestAnimationFrame(frame);
      }
      // ?souris dans l'URL : premiere traversee tout de suite (test)
      setTimeout(traversee, /[?&]souris\b/.test(location.search) ? 0 : cfgMs('souris.premiere', [5, 20]));
    })();
});
