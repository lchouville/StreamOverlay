// =====================================================================================
// EFFET LURK : GEMMES MAGIQUES QUI ROULENT EN BAS DE L'ECRAN
// =====================================================================================
// Chaque lurker (liste de lurk.js) est une gemme taillee, son pseudo grave tout autour, qui
// roule tranquillement sur le "sol" (bas de l'ecran) : elle avance, s'arrete, repart, rebondit
// sur les bords et sur les autres.
//   !lurk : la gemme tombe d'en haut, rebondit, une etiquette "Pseudo part en lurk" s'affiche.
//   !lurk 3 (ou !lurk rubis) : choisit sa pierre, numero dans l'ordre de PIERRES (1 saphir,
//           2 emeraude, 3 rubis, 4 amethyste, 5 diamant, 6 quartz, 7 obsidienne) ; deja en
//           lurk, ca change la pierre de sa gemme.
//   !here : la gemme s'eleve en tournant de plus en plus vite puis eclate en etincelles,
//           avec "Pseudo est de retour ! (apres 42 min)".
// Sans choix, la pierre depend du pseudo (pierresImposees, sinon tiree d'apres le pseudo) :
// la meme dans toutes les scenes et a chaque live.
// Les lurkers deja dans la liste au chargement de la scene sont poses au sol, sans chute.
//
// Page prete a l'emploi : secondary-frame/lurk-gemmes.html, une source navigateur a part posee
// dans chaque scene. Utilisation (apres twitch-chat.js et lurk.js) :
//   GemmesLurk(document.getElementById('gemmes'), { sol: 1078 });
// Ici tout bouge par transform/opacity (compositeur seul) ; seules les etincelles et
// etiquettes, ajoutees ponctuellement, repeignent un petit rectangle.
// =====================================================================================
function GemmesLurk(conteneur, options) {
  var O = Object.assign({
    sol: 1078,            // y du sol (bas des gemmes)
    xMin: 12, xMax: 1908, // bords ou les gemmes rebondissent
    rayon: [28, 33],      // rayon min / max (px), tire par pseudo (assez grand pour lire le pseudo grave)
    vitesse: 55,          // vitesse de promenade max (px/s)
    hauteurChute: 320,    // hauteur de depart de la chute a l'arrivee (px au-dessus du sol)
    // pierre imposee pour certains pseudos (sinon tiree au hasard d'apres le pseudo) ;
    // le pseudo est compare sans majuscules ni caracteres speciaux (Saphir_Schartz = saphirschartz)
    pierresImposees: {
      elwecelebrindal: 'saphir',
      saphirschartz: 'saphir'
    }
  }, options || {});

  // Pierres : teinte (h), saturation (s), decalage (d) et contraste (k) de la luminosite des
  // facettes, couleur du halo et des etincelles (lueur). Une gravure claire (gravureClaire) se
  // lit mieux sur une pierre sombre.
  var PIERRES = [
    { nom: 'saphir',     h: 222, s: 75, d: 0,   k: 1,   lueur: '220,95%,65%' },
    { nom: 'emeraude',   h: 145, s: 70, d: 0,   k: 1,   lueur: '145,90%,58%' },
    { nom: 'rubis',      h: 352, s: 78, d: 0,   k: 1,   lueur: '352,95%,62%' },
    { nom: 'amethyste',  h: 278, s: 58, d: 0,   k: 1,   lueur: '278,85%,68%' },
    { nom: 'diamant',    h: 200, s: 18, d: 24,  k: 0.7, lueur: '195,80%,92%' },
    { nom: 'quartz',     h: 335, s: 45, d: 18,  k: 0.7, lueur: '335,85%,82%' },
    { nom: 'obsidienne', h: 265, s: 14, d: -30, k: 0.6, lueur: '270,70%,55%', gravureClaire: true }
  ];
  var GRAVITE = 2200;
  var gemmes = {};          // login -> gemme
  var dernier = performance.now();

  injecterStyle();

  // ---- Utilitaires ----
  function hachage(s) {
    var h = 2166136261;
    for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
    return h >>> 0;
  }
  function aleaGraine(graine) {
    var g = graine % 2147483647 || 1;
    return function () { return (g = (g * 16807) % 2147483647) / 2147483647; };
  }
  function div(classe, parent) {
    var d = document.createElement('div');
    d.className = classe;
    (parent || conteneur).appendChild(d);
    return d;
  }
  function duree(ms) {
    var min = Math.round(ms / 60000);
    if (min < 1) return '';
    if (min < 60) return min + ' min';
    return Math.floor(min / 60) + ' h ' + String(min % 60).padStart(2, '0');
  }

  // Gemme vue de dessus : contour octogonal, anneau poli ou le pseudo est grave tout autour
  // (comme la tranche d'une piece : une partie reste toujours lisible quand elle roule), et au
  // centre une taille "brillant" (table + facettes alternees).
  function svgGemme(pierre, alea, id, nom) {
    var pt = function (r, deg) {
      var a = deg * Math.PI / 180;
      return (r * Math.cos(a)).toFixed(1) + ',' + (r * Math.sin(a)).toFixed(1);
    };
    var hsl = function (l) {
      l = Math.max(3, Math.min(97, 50 + (l - 50) * pierre.k + pierre.d));
      return 'hsl(' + pierre.h + ',' + pierre.s + '%,' + l.toFixed(0) + '%)';
    };
    var R_TABLE = 10, R_TAILLE = 21, R_BORD = 46, R_TEXTE = 32, POLICE = 18;
    var facettes = '';
    for (var k = 0; k < 8; k++) {
      var a0 = k * 45 + 22.5, a1 = a0 + 45, am = a0 + 22.5;
      var t0 = pt(R_TABLE, a0), t1 = pt(R_TABLE, a1), o0 = pt(R_TAILLE, a0), o1 = pt(R_TAILLE, a1), m = pt(R_TAILLE * 0.924, am);
      var j = function () { return Math.round((alea() - 0.5) * 12); };
      facettes +=
        '<polygon points="' + t0 + ' ' + o0 + ' ' + m + '" fill="' + hsl(58 + j()) + '"/>' +
        '<polygon points="' + t0 + ' ' + m + ' ' + t1 + '" fill="' + hsl(32 + j()) + '"/>' +
        '<polygon points="' + t1 + ' ' + m + ' ' + o1 + '" fill="' + hsl(46 + j()) + '"/>';
    }
    var octo = function (r) { var p = []; for (var k = 0; k < 8; k++) p.push(pt(r, k * 45 + 22.5)); return p.join(' '); };

    // Inscription : le pseudo, repete s'il est court, etale sur tout le tour de l'anneau.
    var tour = 2 * Math.PI * R_TEXTE, motif = String(nom) + ' ✦ ';
    var largeurMotif = motif.length * POLICE * 0.6;
    var texte = motif.repeat(Math.max(1, Math.min(3, Math.floor(tour / largeurMotif))));
    var echappe = texte.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    var ajuste = texte.length * POLICE * 0.6 > tour ? 'spacingAndGlyphs' : 'spacing';
    var cercle = 'M0,' + -R_TEXTE + 'A' + R_TEXTE + ',' + R_TEXTE + ' 0 1 1 0,' + R_TEXTE + 'A' + R_TEXTE + ',' + R_TEXTE + ' 0 1 1 0,' + -R_TEXTE;
    // une couche de l'inscription ; epais : contour de la meme couleur pour epaissir le trait
    var inscription = function (couleur, dx, dy, epais) {
      return '<text font-family="\'IM Fell English SC\', Georgia, serif" font-size="' + POLICE + '" dominant-baseline="central"' +
        ' fill="' + couleur + '"' + (epais ? ' stroke="' + couleur + '" stroke-width="' + epais + '" stroke-linejoin="round"' : '') +
        (dx || dy ? ' transform="translate(' + dx + ',' + dy + ')"' : '') + '>' +
        '<textPath href="#' + id + '-cercle" textLength="' + (tour - 2).toFixed(1) + '" lengthAdjust="' + ajuste + '">' + echappe + '</textPath></text>';
    };

    return '<svg viewBox="-50 -50 100 100" width="100%" height="100%">' +
      '<defs><radialGradient id="' + id + '" cx="35%" cy="35%" r="75%">' +
      '<stop offset="0" stop-color="' + hsl(82) + '"/><stop offset="0.5" stop-color="' + hsl(55) + '"/>' +
      '<stop offset="1" stop-color="' + hsl(34) + '"/></radialGradient>' +
      '<radialGradient id="' + id + '-anneau" r="50%">' +
      '<stop offset="0.42" stop-color="' + hsl(52) + '"/><stop offset="0.7" stop-color="' + hsl(68) + '"/>' +
      '<stop offset="1" stop-color="' + hsl(50) + '"/></radialGradient>' +
      '<path id="' + id + '-cercle" d="' + cercle + '"/></defs>' +
      // anneau poli + pseudo grave en creux : bord eclaire en bas a droite, ombre en haut a
      // gauche, fond du creux sombre et epaissi pour rester lisible en petit
      '<polygon points="' + octo(R_BORD) + '" fill="url(#' + id + '-anneau)"/>' +
      (pierre.gravureClaire
        ? inscription('#000', 1, 1.2, 0.8) + inscription('hsl(' + pierre.lueur + ')', 0, 0, 0.5)
        : inscription('rgba(255,255,255,0.75)', 1, 1.2, 0.6) + inscription(hsl(4), -0.4, -0.5, 0) +
          inscription(hsl(14), 0, 0, 0.6)) +
      // taille brillant au centre
      facettes +
      '<polygon points="' + octo(R_TABLE) + '" fill="url(#' + id + ')"/>' +
      '<polygon points="' + octo(R_TABLE) + '" fill="none" stroke="rgba(255,255,255,0.35)" stroke-width="1"/>' +
      '<polygon points="' + octo(R_TAILLE) + '" fill="none" stroke="' + hsl(18) + '" stroke-width="1.5" stroke-linejoin="round"/>' +
      '<polygon points="' + octo(R_BORD) + '" fill="none" stroke="#1a0f07" stroke-width="3" stroke-linejoin="round"/>' +
      '</svg>';
  }

  // Etoile a 4 branches (etincelles)
  var ETOILE = '<svg viewBox="-10 -10 20 20" width="100%" height="100%"><path d="M0-10Q1.2-1.2 10 0Q1.2 1.2 0 10Q-1.2 1.2-10 0Q-1.2-1.2 0-10Z" fill="currentColor"/></svg>';

  function etincelle(parent, x, y, taille, couleur, classe, dx, dy) {
    var e = div('gemme-etincelle ' + classe, parent);
    e.innerHTML = ETOILE;
    e.style.cssText = 'left:' + (x - taille / 2) + 'px;top:' + (y - taille / 2) + 'px;width:' + taille + 'px;height:' + taille +
      'px;color:' + couleur + ';--dx:' + (dx || 0) + 'px;--dy:' + (dy || 0) + 'px';
    e.addEventListener('animationend', function () { e.remove(); });
    return e;
  }
  function gerbe(x, y, pierre, n, force) {
    for (var i = 0; i < n; i++) {
      var a = Math.PI * 2 * (i + Math.random() * 0.6) / n, f = force * (0.5 + Math.random() * 0.7);
      etincelle(conteneur, x, y, 10 + Math.random() * 14, i % 3 ? 'hsl(' + pierre.lueur + ')' : '#fff8e0', 'gerbe',
        Math.cos(a) * f, Math.sin(a) * f - force * 0.25);
    }
  }

  function etiquette(g, texte) {
    if (g.etiquette) g.etiquette.remove();
    var e = g.etiquette = div('gemme-etiquette');
    e.textContent = texte;
    g.largeurEtiquette = e.offsetWidth;
    e.addEventListener('animationend', function () { if (g.etiquette === e) g.etiquette = null; e.remove(); });
  }

  // Pierre choisie dans le chat ("!lurk 3" ou "!lurk rubis", numero dans l'ordre de PIERRES),
  // sinon pierre imposee pour ce pseudo, sinon tiree d'apres le pseudo.
  function sansAccent(s) { return String(s || '').toLowerCase().normalize('NFD').replace(/[^a-z0-9]/g, ''); }
  function choisirPierre(p) {
    var arg = sansAccent(String(p.arg || '').split(' ')[0]), n = parseInt(arg, 10);
    var parNom = function (nom) { return PIERRES.filter(function (x) { return x.nom === nom; })[0]; };
    return (n >= 1 && n <= PIERRES.length ? PIERRES[n - 1] : parNom(arg)) ||
           parNom(O.pierresImposees[sansAccent(p.login)]) ||
           PIERRES[hachage(p.login) % PIERRES.length];
  }
  // Dessine la pierre de g (a la creation, et quand le lurker en change).
  function habiller(g) {
    g.halo.style.background = 'radial-gradient(closest-side, hsla(' + g.pierre.lueur + ',0.6), hsla(' + g.pierre.lueur + ',0.18) 55%, transparent)';
    g.corps.innerHTML = svgGemme(g.pierre, aleaGraine(hachage(g.p.login)), 'gemme-' + g.p.login.replace(/\W/g, '_'), g.p.nom);
  }

  // ---- Creation / depart ----
  function creer(p, chute) {
    var alea = aleaGraine(hachage(p.login) + 1);
    var r = O.rayon[0] + alea() * (O.rayon[1] - O.rayon[0]);
    var g = {
      p: p, r: r, pierre: choisirPierre(p),
      x: O.xMin + r + Math.random() * (O.xMax - O.xMin - 2 * r),
      y: chute ? O.sol - r - O.hauteurChute - Math.random() * 120 : O.sol - r,
      vx: 0, vy: 0, vCible: 0, prochainChoix: 0, prochaineEtincelle: 1 + Math.random() * 3,
      etat: chute ? 'chute' : 'sol', rebonds: 0, angle: Math.random() * 360, t: 0
    };
    g.ombre = div('gemme-ombre');
    g.ombre.style.cssText = 'width:' + (r * 2.2) + 'px;height:' + (r * 0.55) + 'px;margin:' + (-r * 0.275) + 'px 0 0 ' + (-r * 1.1) + 'px';
    g.boite = div('gemme');
    g.boite.style.cssText = 'width:' + 2 * r + 'px;height:' + 2 * r + 'px;margin:' + -r + 'px 0 0 ' + -r + 'px';
    g.halo = div('gemme-halo', g.boite);
    g.halo.style.animationDelay = (-Math.random() * 3) + 's';
    g.corps = div('gemme-corps', g.boite);
    div('gemme-reflet', g.boite);
    habiller(g);
    gemmes[p.login] = g;
    if (chute) etiquette(g, p.nom + ' part en lurk');
    dessiner(g);
    return g;
  }

  function partir(p) {
    var g = gemmes[p.login];
    if (!g) return;
    delete gemmes[p.login];
    g.etat = 'depart';
    g.t = 0;
    g.y0 = g.y;
    var d = duree(p.duree);
    etiquette(g, p.nom + ' est de retour !' + (d ? ' (après ' + d + ')' : ''));
    g.boite.classList.add('gemme-part');
    departs.push(g);
  }
  var departs = [];

  // ---- Mouvement ----
  function avancer(g, dt) {
    if (g.etat === 'chute') {
      g.vy += GRAVITE * dt;
      g.y += g.vy * dt;
      var bas = O.sol - g.r;
      if (g.y >= bas) {
        g.y = bas;
        if (g.rebonds === 0) gerbe(g.x, O.sol - 4, g.pierre, 8, 90);
        g.rebonds++;
        g.vy = -g.vy * 0.42;
        if (Math.abs(g.vy) < 90) { g.vy = 0; g.etat = 'sol'; }
        else g.vx = (Math.random() - 0.5) * 60;   // un rebond la fait partir un peu de cote
      }
    } else if (g.etat === 'sol') {
      g.prochainChoix -= dt;
      if (g.prochainChoix <= 0) {
        g.prochainChoix = 3 + Math.random() * 6;
        g.vCible = Math.random() < 0.35 ? 0 : (Math.random() < 0.5 ? -1 : 1) * O.vitesse * (0.3 + Math.random() * 0.7);
      }
      var acc = 45 * dt;
      g.vx += Math.max(-acc, Math.min(acc, g.vCible - g.vx));
    }
    g.x += g.vx * dt;
    if (g.x < O.xMin + g.r) { g.x = O.xMin + g.r; g.vx = Math.abs(g.vx); g.vCible = Math.abs(g.vCible); }
    if (g.x > O.xMax - g.r) { g.x = O.xMax - g.r; g.vx = -Math.abs(g.vx); g.vCible = -Math.abs(g.vCible); }
    // roule sans glisser : angle = distance / rayon
    g.angle += g.vx * dt / g.r * 180 / Math.PI;

    g.prochaineEtincelle -= dt;
    if (g.prochaineEtincelle <= 0) {
      g.prochaineEtincelle = 1.2 + Math.random() * 3.5;
      var a = Math.random() * Math.PI * 2, d = Math.random() * g.r * 0.7;
      etincelle(g.boite, g.r + Math.cos(a) * d, g.r + Math.sin(a) * d, 9 + Math.random() * 9, '#fffbe8', 'scintille');
    }
  }

  // Chocs entre gemmes posees : masses egales, on echange les vitesses (un peu amorties).
  function chocs() {
    var l = Object.keys(gemmes).map(function (k) { return gemmes[k]; })
      .filter(function (g) { return g.etat === 'sol' || g.rebonds > 0; })
      .sort(function (a, b) { return a.x - b.x; });
    for (var i = 1; i < l.length; i++) {
      var a = l[i - 1], b = l[i], recouvre = a.r + b.r - (b.x - a.x);
      if (recouvre <= 0) continue;
      a.x -= recouvre / 2; b.x += recouvre / 2;
      if (a.vx > b.vx) {
        var va = a.vx;
        a.vx = b.vx * 0.85; b.vx = va * 0.85;
        a.vCible = -Math.abs(a.vCible); b.vCible = Math.abs(b.vCible);
      }
    }
  }

  // Depart : monte en accelerant sa rotation, grossit un peu, puis eclate.
  function avancerDepart(g, dt) {
    g.t += dt;
    var k = Math.min(g.t / 1.4, 1), e = k * k * (3 - 2 * k);
    g.y = g.y0 - 140 * e;
    g.angle += (90 + 900 * k) * dt;
    g.echelle = 1 + 0.35 * e;
    if (k >= 1 && !g.eclate) {
      g.eclate = true;
      gerbe(g.x, g.y, g.pierre, 16, 160);
      g.boite.remove();
      g.ombre.remove();
      return false;
    }
    return true;
  }

  function dessiner(g) {
    g.boite.style.transform = 'translate3d(' + g.x.toFixed(1) + 'px,' + g.y.toFixed(1) + 'px,0) scale(' + (g.echelle || 1) + ')';
    g.corps.style.transform = 'rotate(' + (g.angle % 360).toFixed(1) + 'deg)';
    var h = Math.max(0, O.sol - g.r - g.y), f = Math.max(0.25, 1 - h / 300);
    g.ombre.style.transform = 'translate3d(' + g.x.toFixed(1) + 'px,' + O.sol + 'px,0) scale(' + f.toFixed(2) + ')';
    g.ombre.style.opacity = f.toFixed(2);
    if (g.etiquette) {
      var w = g.largeurEtiquette, lx = Math.max(6, Math.min(1914 - w, g.x - w / 2));
      g.etiquette.style.transform = 'translate3d(' + lx.toFixed(1) + 'px,' + (g.y - g.r - 50).toFixed(1) + 'px,0)';
    }
  }

  function boucle(t) {
    var dt = Math.min((t - dernier) / 1000, 0.05);
    dernier = t;
    for (var k in gemmes) avancer(gemmes[k], dt);
    chocs();
    for (k in gemmes) dessiner(gemmes[k]);
    departs = departs.filter(function (g) {
      var vivant = avancerDepart(g, dt);
      if (vivant || g.etiquette) dessiner(g);
      return vivant || !!g.etiquette;
    });
    requestAnimationFrame(boucle);
  }

  function injecterStyle() {
    var s = document.createElement('style');
    s.textContent =
      '.gemme, .gemme-ombre, .gemme-etiquette { position:absolute; left:0; top:0; will-change:transform; }' +
      '.gemme-corps { position:absolute; inset:0; will-change:transform; filter:drop-shadow(0 0 1px rgba(26,15,7,.6)); }' +
      '.gemme-halo { position:absolute; left:-65%; top:-65%; width:230%; height:230%; will-change:opacity;' +
      '  animation:gemme-pulse 2.6s ease-in-out infinite alternate; }' +
      '.gemme-part .gemme-halo { animation:gemme-pulse .25s ease-in-out infinite alternate; }' +
      '.gemme-reflet { position:absolute; left:20%; top:12%; width:30%; height:20%; border-radius:50%;' +
      '  background:radial-gradient(closest-side, rgba(255,255,255,.5), rgba(255,255,255,0)); transform:rotate(-30deg); }' +
      '.gemme-ombre { border-radius:50%; background:radial-gradient(closest-side, rgba(10,5,2,.7), rgba(10,5,2,0)); }' +
      '.gemme-etincelle { position:absolute; pointer-events:none; filter:drop-shadow(0 0 3px currentColor); }' +
      '.gemme-etincelle.scintille { animation:gemme-scintille .8s ease-in-out forwards; }' +
      '.gemme-etincelle.gerbe { animation:gemme-gerbe 1.1s cubic-bezier(.2,.7,.4,1) forwards; }' +
      '.gemme-etiquette { white-space:nowrap; padding:4px 14px 6px; background:#efe2bf; color:#2a1608;' +
      '  font:22px "IM Fell English SC", Georgia, serif; letter-spacing:1px; border:2px solid #3a2210; border-radius:4px;' +
      '  box-shadow:2px 4px 6px rgba(0,0,0,.45); animation:gemme-etiquette 4.5s ease forwards; }' +
      '@keyframes gemme-pulse { from { opacity:.55 } to { opacity:1 } }' +
      '@keyframes gemme-scintille { 0% { transform:scale(0) rotate(0) } 50% { transform:scale(1) rotate(45deg) } 100% { transform:scale(0) rotate(90deg) } }' +
      '@keyframes gemme-gerbe { 0% { transform:translate(0,0) scale(.3); opacity:1 }' +
      '  70% { opacity:1 } 100% { transform:translate(var(--dx),var(--dy)) scale(1) rotate(180deg); opacity:0 } }' +
      '@keyframes gemme-etiquette { 0% { opacity:0 } 10%, 80% { opacity:1 } 100% { opacity:0 } }';
    document.head.appendChild(s);
  }

  // ---- Branchement sur la liste ----
  Lurk.liste().forEach(function (p) { creer(p, false); });
  Lurk.quand('entree', function (p) { if (!gemmes[p.login]) creer(p, true); });
  Lurk.quand('retour', partir);
  // deja en lurk et refait "!lurk 5" : la gemme change de pierre dans une gerbe d'etincelles
  Lurk.quand('modif', function (p) {
    var g = gemmes[p.login];
    if (!g) return;
    g.p = p;
    var pierre = choisirPierre(p);
    if (pierre === g.pierre) return;
    g.pierre = pierre;
    habiller(g);
    gerbe(g.x, g.y, pierre, 10, 110);
  });
  requestAnimationFrame(boucle);
}
