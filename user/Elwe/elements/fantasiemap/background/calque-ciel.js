// Calque 2 : nuages, oiseaux, etoiles filantes.
// Modules repris du script de ville-medievale-croquis.svg ; outils communs (cfg, cfgMs,
// heureVirtuelle, setAttrSiChange...) et cycle jour/nuit dans calques-commun.js.
window.addEventListener('load', function () {
    (function () {
      // Ciel : nuages et vols d'oiseaux apparaissent au hasard.
      var NS = 'http://www.w3.org/2000/svg';
      function rand(a, b) { return a + Math.random() * (b - a); }
      function el(tag, attrs, parent) { var e = document.createElementNS(NS, tag); for (var k in attrs) e.setAttribute(k, attrs[k]); parent.appendChild(e); return e; }
      var X0 = 1350, X1 = 3950;   // couloir de vol / de derive (le coin ovale coupe le reste)

      // ---- Nuages : forme festonnee aleatoire, derive vers la droite (sens du vent)
      var nuages = document.getElementById('nuages');
      function cloudPath(w, h) {
        var n = Math.max(3, Math.round(w / rand(45, 70))), d = 'M 0,0';
        for (var i = 0; i < n; i++) {
          var hh = h * (0.45 + 0.55 * Math.sin(Math.PI * (i + 0.5) / n)) * rand(0.75, 1.15);
          d += ' Q ' + (w * (i + 0.5) / n).toFixed(1) + ',' + (-hh * 1.25).toFixed(1) + ' ' + (w * (i + 1) / n).toFixed(1) + ',' + (i === n - 1 ? 0 : -hh * rand(0.2, 0.45)).toFixed(1);
        }
        return d + ' Q ' + (w / 2).toFixed(1) + ',' + (h * rand(0.1, 0.25)).toFixed(1) + ' 0,0 Z';
      }
      var CROSS = cfg('ciel.traverseeNuages', 240);   // secondes pour traverser (moyenne)

      // ---- Nuages speciaux : silhouettes piochees au hasard dans layers/02-nature/clouds/
      // (voir ciel.nuagesSpeciaux dans animations-config.js pour la liste des fichiers).
      // Programmes a part des nuages normaux : un toutes les nuagesSpeciaux.attente secondes,
      // jamais deux fois le meme a la suite, et pas plus de maxVisibles a l'ecran a la fois.
      var SPECIAUX_FICHIERS = cfg('ciel.nuagesSpeciaux.fichiers', []);
      var SPECIAUX_MAX = cfg('ciel.nuagesSpeciaux.maxVisibles', 2);
      var speciauxVisibles = 0, dernierSpecial = null;
      function spawnSpecialCloud(startFrac) {
        var choix = SPECIAUX_FICHIERS.filter(function (f) { return f !== dernierSpecial; });
        if (!choix.length) choix = SPECIAUX_FICHIERS;
        var file = dernierSpecial = choix[Math.floor(Math.random() * choix.length)];
        speciauxVisibles++;
        var w = rand(160, 300), h = w * 0.66, y = rand(110, 470), sc = rand(0.7, 1.3);
        var g = el('g', {}, nuages);
        var inner = el('g', { transform: 'translate(0,' + y.toFixed(1) + ') scale(' + sc.toFixed(2) + ')' }, g);
        el('image', { href: 'layers/02-nature/clouds/' + file, x: 0, y: (-h).toFixed(1), width: w.toFixed(1), height: h.toFixed(1), opacity: rand(0.85, 1).toFixed(2) }, inner);
        var from = X0 - w * sc - 50, to = X1 + 50, dur = CROSS * rand(0.7, 1.4) * 1000;
        var anim = g.animate([{ transform: 'translateX(' + from + 'px)' }, { transform: 'translateX(' + to + 'px)' }], { duration: dur, easing: 'linear' });
        if (startFrac) anim.currentTime = dur * startFrac;
        anim.onfinish = function () { g.remove(); speciauxVisibles--; };
      }
      // deja assez de nuages speciaux a l'ecran : on reessaie un peu plus tard
      function nextSpecialCloud() {
        if (speciauxVisibles >= SPECIAUX_MAX) return setTimeout(nextSpecialCloud, 10000);
        spawnSpecialCloud(0);
        setTimeout(nextSpecialCloud, cfgMs('ciel.nuagesSpeciaux.attente', [60, 120]));
      }
      if (SPECIAUX_FICHIERS.length) setTimeout(nextSpecialCloud, cfgMs('ciel.nuagesSpeciaux.attente', [60, 120]));

      function spawnCloud(startFrac) {
        var w = rand(160, 480), h = rand(40, 95), y = rand(110, 470), sc = rand(0.55, 1.2);
        var g = el('g', {}, nuages);
        var inner = el('g', { transform: 'translate(0,' + y.toFixed(1) + ') scale(' + sc.toFixed(2) + ')' }, g);
        el('path', { d: cloudPath(w, h), fill: '#efe4c6', stroke: '#6a5030', 'stroke-width': 2.5, 'stroke-linejoin': 'round', opacity: rand(0.8, 0.95).toFixed(2) }, inner);
        el('path', { d: 'M ' + (w * 0.12).toFixed(1) + ',-6 Q ' + (w / 2).toFixed(1) + ',4 ' + (w * 0.88).toFixed(1) + ',-6', fill: 'none', stroke: '#b8a070', 'stroke-width': 5, opacity: 0.5, 'stroke-linecap': 'round' }, inner);
        var from = X0 - w * sc - 50, to = X1 + 50, dur = CROSS * rand(0.7, 1.4) * 1000;
        var anim = g.animate([{ transform: 'translateX(' + from + 'px)' }, { transform: 'translateX(' + to + 'px)' }], { duration: dur, easing: 'linear' });
        if (startFrac) anim.currentTime = dur * startFrac;   // nuages deja en place au demarrage
        anim.onfinish = function () { g.remove(); };
      }
      var nInit = Math.round(rand(3, 6));
      for (var i = 0; i < nInit; i++) spawnCloud(rand(0.05, 0.95));
      (function nextCloud() { spawnCloud(0); setTimeout(nextCloud, cfgMs('ciel.nuages', [25, 70])); })();

      // ---- Oiseaux : vol lent, formation lache qui se deforme, aile lointaine plus petite
      var root = document.getElementById('oiseaux');
      function flock() {
        var n = Math.floor(rand(3, 8)), dir = Math.random() < 0.7 ? 1 : -1;
        var yBase = rand(120, 430), speed = rand(40, 75) * dir, birds = [];
        var x0 = dir > 0 ? X0 - 80 : X1 + 80;
        for (var i = 0; i < n; i++) {
          var s0 = rand(5, 12), e = el('path', { 'stroke-width': (s0 / 5).toFixed(1) }, root);
          birds.push({
            e: e, s: s0,
            dx: -dir * (i * rand(14, 34)) + rand(-12, 12),      // ecart variable, pas de V parfait
            dy: rand(-45, 45),                                  // altitude propre a chaque oiseau
            v: speed * rand(0.9, 1.1),                          // vitesses legerement differentes
            far: rand(0.45, 0.75),                              // aile lointaine plus petite
            curve: rand(0.15, 0.4), ph: rand(0, 6), f: rand(3, 5), bob: rand(5, 16), bobF: rand(0.25, 0.6), glide: rand(0, 10)
          });
        }
        var start = performance.now(), life = ((X1 - X0 + 400) / Math.abs(speed)) * 1000;
        function frame(now) {
          var t = (now - start) / 1000;
          birds.forEach(function (b) {
            // plane de temps en temps (ailes immobiles, legerement relevees)
            var gliding = Math.sin(t * 0.35 + b.glide) > 0.75;
            var flap = gliding ? 0.25 : Math.sin(b.ph + t * b.f);
            var x = x0 + b.dx + b.v * t, y = yBase + b.dy + b.bob * Math.sin(t * b.bobF + b.ph) + 6 * Math.sin(t * 0.17 + b.glide);
            var wy = -b.s * (0.15 + 0.55 * flap), near = b.s, farW = b.s * b.far;
            // aile proche (dans le sens de vol) plus grande, aile lointaine plus petite et plus courte
            var nx = dir, fx = -dir;
            b.e.setAttribute('d',
              'M ' + (x + fx * farW).toFixed(1) + ',' + (y + wy * b.far).toFixed(1) +
              ' Q ' + (x + fx * farW * 0.4).toFixed(1) + ',' + (y + wy * 0.2 * b.far - farW * b.curve).toFixed(1) + ' ' + x.toFixed(1) + ',' + y.toFixed(1) +
              ' Q ' + (x + nx * near * 0.4).toFixed(1) + ',' + (y + wy * 0.2 - near * b.curve).toFixed(1) + ' ' + (x + nx * near).toFixed(1) + ',' + (y + wy).toFixed(1));
          });
          if (t * 1000 < life) requestAnimationFrame(frame);
          else birds.forEach(function (b) { b.e.remove(); });
        }
        requestAnimationFrame(frame);
        setTimeout(flock, cfgMs('ciel.oiseaux', [20, 60]));   // un vol peut en croiser un autre
      }
      setTimeout(flock, cfgMs('ciel.premierVol', [3, 10]));
    })();

    (function () {
      // Etoiles filantes : de temps en temps, une trainee lumineuse traverse le ciel en
      // diagonale descendante. Seulement quand les etoiles sont bien visibles (pleine nuit).
      var SVGNS = 'http://www.w3.org/2000/svg';
      var root = document.getElementById('etoiles-filantes'), etoiles = document.getElementById('etoiles');
      function rand(a, b) { return a + Math.random() * (b - a); }
      function shoot() {
        var dir = Math.random() < 0.5 ? 1 : -1;
        var x0 = rand(2000, 3500), y0 = rand(110, 330);
        var ang = rand(18, 40) * dir;                       // inclinaison sous l'horizontale
        var dist = rand(320, 650), dur = rand(0.7, 1.3) * 1000, maxTail = rand(110, 220), w = rand(1.6, 2.6);
        var rad = ang * Math.PI / 180, dx = Math.cos(rad) * dir, dy = Math.abs(Math.sin(rad));
        var g = document.createElementNS(SVGNS, 'g');
        var tail = document.createElementNS(SVGNS, 'polygon');
        tail.setAttribute('fill', 'url(#trainee-filante)');
        var head = document.createElementNS(SVGNS, 'circle');
        head.setAttribute('r', (w * 0.9).toFixed(1));
        head.setAttribute('fill', '#fffaea');
        g.appendChild(tail); g.appendChild(head); root.appendChild(g);
        var rot = Math.atan2(dy, dx) * 180 / Math.PI, start = performance.now();
        function frame(now) {
          var t = Math.min(1, (now - start) / dur);
          var e = 1 - Math.pow(1 - t, 2);                   // ralentit en fin de course
          var x = x0 + dx * dist * e, y = y0 + dy * dist * e;
          // la trainee s'allonge au depart puis se resorbe quand l'etoile s'eteint
          var L = maxTail * Math.sin(Math.PI * Math.min(1, t * 1.4 + 0.05));
          g.setAttribute('transform', 'translate(' + x.toFixed(1) + ',' + y.toFixed(1) + ') rotate(' + rot.toFixed(1) + ')');
          tail.setAttribute('points', (-L).toFixed(1) + ',-0.3 0,' + (-w / 2).toFixed(2) + ' 0,' + (w / 2).toFixed(2) + ' ' + (-L).toFixed(1) + ',0.3');
          g.setAttribute('opacity', Math.sin(Math.PI * t).toFixed(3));
          if (t < 1) requestAnimationFrame(frame);
          else g.remove();
        }
        requestAnimationFrame(frame);
      }
      function next() {
        if (parseFloat(etoiles.getAttribute('opacity')) > 0.6) shoot();
        setTimeout(next, cfgMs('ciel.etoilesFilantes', [25, 90]));
      }
      setTimeout(next, cfgMs('ciel.etoilesFilantes', [25, 90]));
    })();
});
