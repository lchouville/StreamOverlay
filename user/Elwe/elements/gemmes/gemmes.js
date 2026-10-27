// =====================================================================================
// GEMMES MAGIQUES QUI ROULENT EN BAS DE L'ECRAN (lurkers et derniers soutiens du live)
// =====================================================================================
// Chaque gemme porte un pseudo grave tout autour et roule tranquillement sur le "sol" (bas de
// l'ecran) : elle avance, s'arrete, repart, rebondit sur les bords et sur les autres. Elle
// arrive en tombant au niveau du chat (zone annonce) et repart en y roulant doucement avant de
// s'elever et d'eclater en etincelles.
//
// LURKERS (../lurk/lurk.js) : une gemme taillee par lurker.
//   !lurk : la gemme tombe, une etiquette "Pseudo part en lurk" s'affiche.
//   !lurk 3 (ou !lurk rubis) : choisit sa pierre, numero dans l'ordre de PIERRES (1 saphir,
//           2 emeraude, 3 rubis, 4 amethyste, 5 diamant, 6 quartz, 7 obsidienne) ; deja en
//           lurk, ca change la pierre de sa gemme.
//   !here : la gemme repart, avec "Pseudo est de retour ! (apres 42 min)".
//   Sans choix, la pierre depend du pseudo (pierresImposees, sinon tiree d'apres le pseudo) :
//   la meme dans toutes les scenes et a chaque live.
//
// SOUTIENS (../derniers/derniers.js), element selon la categorie (ELEMENTS) : feu = sub,
// eau = don de subs, terre = bits, air = follow.
//   En bas (O.bas, sans les follows) : une gemme elementaire par personne et par categorie,
//   qui reste tout le live (symbole de l'element au centre, flammes, bulles ou poussiere en
//   continu). La meme personne qui recommence garde sa gemme, avec une gerbe d'etincelles
//   et un nouveau remerciement.
//   En haut, sur le panneau de quetes (O.haut) : une affiche par categorie avec le DERNIER
//   soutien, pseudo en grand.
//
// Ceux deja presents au chargement d'une scene sont poses au sol, sans chute.
// Page prete a l'emploi : secondary-frame/event-gemmes.html, une source navigateur a part posee
// dans chaque scene. Utilisation (apres twitch-chat.js, lurk.js et/ou derniers.js) :
//   Gemmes(document.getElementById('gemmes'), { sol: 1078 });   renvoie { demo }
// Ici tout bouge par transform/opacity (compositeur seul) ; seules les etincelles, particules
// et etiquettes, ajoutees ponctuellement, repeignent un petit rectangle.
// =====================================================================================
function Gemmes(conteneur, options) {
  var O = Object.assign({
    sol: 1078,            // y du sol (bas des gemmes)
    xMin: 12, xMax: 1908, // bords ou les gemmes rebondissent
    rayon: [28, 33],      // rayon min / max (px) des gemmes de lurk, tire par pseudo
    rayonElement: 34,     // rayon (px) des gemmes elementaires (soutiens de la session)
    // cartes des derniers soutiens en haut (coin haut gauche de chaque carte 380x76), placees
    // sur le panneau de quetes de la main-frame ; false : pas de cartes
    haut: { sub: [30, 20], don: [30, 108], bits: [1115, 20], follow: [1115, 108] },
    bas: ['sub', 'don', 'bits'],  // categories qui ont aussi leurs gemmes en bas (pas les follows)
    vitesse: 55,          // vitesse de promenade max (px/s)
    hauteurChute: 320,    // hauteur de depart de la chute a l'arrivee (px au-dessus du sol)
    annonce: [1564, 1904], // x min / max ou se font l'arrivee et le depart : le chat
    vitesseRetour: 120,   // vitesse moyenne (px/s) quand elle roule vers le chat pour repartir
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
  // Gemmes elementaires des derniers soutiens : memes reglages que PIERRES, plus le symbole
  // alchimique au centre (triangle pointe en haut/bas, barre ou non), la particule degagee en
  // continu (classe CSS gemme-particule.<nom>) et le remerciement affiche a l'arrivee.
  var ELEMENTS = {
    sub:    { nom: 'feu',   h: 14,  s: 90, d: 0,   k: 1,   lueur: '28,100%,58%',  haut: true,  barre: false,
              merci: function (s) { return 'Merci ' + s.nom + ' pour le sub ! (' + s.detail + ')'; } },
    don:    { nom: 'eau',   h: 205, s: 85, d: 0,   k: 1,   lueur: '195,100%,66%', haut: false, barre: false,
              merci: function (s) { return 'Merci ' + s.nom + ' pour ' + s.detail + ' !'; } },
    bits:   { nom: 'terre', h: 32,  s: 55, d: -12, k: 0.9, lueur: '42,95%,55%',   haut: false, barre: true,
              merci: function (s) { return 'Merci ' + s.nom + ' pour les ' + s.detail + ' !'; } },
    follow: { nom: 'air',   h: 172, s: 45, d: 20,  k: 0.7, lueur: '170,85%,85%',  haut: true,  barre: true,
              merci: function (s) { return 'Bienvenue ' + s.nom + ' !'; } }
  };
  var GRAVITE = 2200;
  var gemmes = {};          // id -> gemme ('lurk:pseudo', 'derniers:sub'...)
  var departs = [];
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
  // centre une taille "brillant" (table + facettes alternees) ou, pour une gemme elementaire,
  // le symbole de l'element grave et lumineux.
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
    var octo = function (r) { var p = []; for (var k = 0; k < 8; k++) p.push(pt(r, k * 45 + 22.5)); return p.join(' '); };

    var centre;
    if (pierre.haut !== undefined) {
      // symbole alchimique : triangle (pointe en haut : feu, air ; en bas : eau, terre),
      // barre pour l'air et la terre
      var sens = pierre.haut ? 1 : -1;
      var tri = '0,' + (-14 * sens) + ' 12.1,' + (7 * sens) + ' -12.1,' + (7 * sens);
      var barre = pierre.barre ? 'M-11,' + (-1 * sens) + 'H11' : '';
      var symbole = function (couleur, dx, dy, epais) {
        return '<g fill="none" stroke="' + couleur + '" stroke-width="' + epais + '" stroke-linejoin="round" stroke-linecap="round"' +
          (dx || dy ? ' transform="translate(' + dx + ',' + dy + ')"' : '') + '>' +
          '<polygon points="' + tri + '"/>' + (barre ? '<path d="' + barre + '"/>' : '') + '</g>';
      };
      centre =
        '<polygon points="' + octo(R_TAILLE) + '" fill="url(#' + id + ')"/>' +
        symbole('rgba(0,0,0,0.45)', 0.8, 1, 3.4) + symbole('hsl(' + pierre.lueur + ')', 0, 0, 2.6) +
        symbole('rgba(255,255,255,0.8)', 0, 0, 1);
    } else {
      centre = '';
      for (var k = 0; k < 8; k++) {
        var a0 = k * 45 + 22.5, a1 = a0 + 45, am = a0 + 22.5;
        var t0 = pt(R_TABLE, a0), t1 = pt(R_TABLE, a1), o0 = pt(R_TAILLE, a0), o1 = pt(R_TAILLE, a1), m = pt(R_TAILLE * 0.924, am);
        var j = function () { return Math.round((alea() - 0.5) * 12); };
        centre +=
          '<polygon points="' + t0 + ' ' + o0 + ' ' + m + '" fill="' + hsl(58 + j()) + '"/>' +
          '<polygon points="' + t0 + ' ' + m + ' ' + t1 + '" fill="' + hsl(32 + j()) + '"/>' +
          '<polygon points="' + t1 + ' ' + m + ' ' + o1 + '" fill="' + hsl(46 + j()) + '"/>';
      }
      centre +=
        '<polygon points="' + octo(R_TABLE) + '" fill="url(#' + id + ')"/>' +
        '<polygon points="' + octo(R_TABLE) + '" fill="none" stroke="rgba(255,255,255,0.35)" stroke-width="1"/>';
    }

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
      centre +
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
  // Particule d'une gemme elementaire (flamme, bulle, poussiere, souffle), lachee pres du bord
  // de la gemme ; son mouvement est dans le CSS (gemme-particule.<element>).
  function particule(g) {
    var feu = g.pierre.nom === 'feu';
    // les flammes partent du haut de la gemme, plus grosses ; le reste de tout le tour
    var a = feu ? -Math.PI * (0.2 + Math.random() * 0.6) : Math.random() * Math.PI * 2, d = g.r * (0.55 + Math.random() * 0.4);
    var taille = g.r * (0.22 + Math.random() * 0.22) * (feu ? 1.7 : 1);
    var p = div('gemme-particule ' + g.pierre.nom);
    p.style.cssText = 'left:' + (g.x + Math.cos(a) * d - taille / 2).toFixed(1) + 'px;top:' + (g.y + Math.sin(a) * d - taille / 2).toFixed(1) +
      'px;width:' + taille.toFixed(1) + 'px;height:' + taille.toFixed(1) + 'px;--c:hsl(' + g.pierre.lueur + ');--dx:' +
      ((Math.random() - 0.5) * 40).toFixed(0) + 'px;--dy:' + (-(20 + Math.random() * 40)).toFixed(0) + 'px';
    p.addEventListener('animationend', function () { p.remove(); });
  }

  // Etiquette au-dessus de la gemme. Plusieurs en meme temps (gemmes voisines) : chacune prend
  // la premiere rangee libre, empilees vers le haut, pour ne pas se recouvrir.
  var rangees = [];
  function etiquette(g, texte) {
    if (g.etiquette) { g.etiquette.remove(); rangees[g.rangee] = null; }
    var e = g.etiquette = div('gemme-etiquette');
    e.textContent = texte;
    g.largeurEtiquette = e.offsetWidth;
    g.rangee = rangees.indexOf(null) >= 0 ? rangees.indexOf(null) : rangees.length;
    rangees[g.rangee] = e;
    e.addEventListener('animationend', function () {
      if (rangees[g.rangee] === e) rangees[g.rangee] = null;
      if (g.etiquette === e) g.etiquette = null;
      e.remove();
    });
  }

  // Dessine la pierre de g (a la creation, et quand elle change).
  function habiller(g) {
    g.halo.style.background = 'radial-gradient(closest-side, hsla(' + g.pierre.lueur + ',0.6), hsla(' + g.pierre.lueur + ',0.18) 55%, transparent)';
    g.corps.innerHTML = svgGemme(g.pierre, aleaGraine(hachage(g.login)), 'gemme-' + g.id.replace(/\W/g, '_'), g.nom);
  }

  // ---- Creation / depart ----
  // s = { id, login, nom, pierre, r, arrivee (texte de l'etiquette, ou rien) }
  function creer(s, chute) {
    var r = s.r;
    var g = {
      id: s.id, login: s.login, nom: s.nom, r: r, pierre: s.pierre, element: !!s.element,
      // une nouvelle gemme tombe au niveau du chat, une gemme deja la est posee n'importe ou
      x: chute ? xAnnonce(r) : O.xMin + r + Math.random() * (O.xMax - O.xMin - 2 * r),
      y: chute ? O.sol - r - O.hauteurChute - Math.random() * 120 : O.sol - r,
      vx: 0, vy: 0, vCible: 0, prochainChoix: 0, prochaineEtincelle: 1 + Math.random() * 3, prochaineParticule: 0,
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
    gemmes[g.id] = g;
    if (chute && s.arrivee) etiquette(g, s.arrivee);
    dessiner(g);
    return g;
  }

  // x au hasard dans la zone des annonces (au niveau du chat)
  function xAnnonce(r) {
    var a = Math.max(O.xMin + r, O.annonce[0] + r), b = Math.min(O.xMax - r, O.annonce[1] - r);
    return a + Math.random() * Math.max(0, b - a);
  }

  // Depart : la gemme roule au sol jusqu'au chat (en passant derriere les autres), puis
  // s'eleve et eclate ; l'etiquette (texte, facultatif) s'affiche quand elle s'eleve.
  function partir(id, texte) {
    var g = gemmes[id];
    if (!g) return;
    delete gemmes[id];
    g.etat = 'depart';
    g.t = 0;
    g.x0 = g.x;
    g.xCible = xAnnonce(g.r);
    g.tRappel = Math.abs(g.xCible - g.x) / O.vitesseRetour;
    g.y0 = O.sol - g.r;
    g.annonce = texte || null;
    g.boite.classList.add('gemme-part');
    departs.push(g);
  }

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
    if (g.element) {
      g.prochaineParticule -= dt;
      if (g.prochaineParticule <= 0) { g.prochaineParticule = 0.18 + Math.random() * 0.25; particule(g); }
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

  // Depart : roule jusqu'au chat (demarre et freine en douceur), puis monte en accelerant sa
  // rotation, grossit un peu, et eclate.
  function avancerDepart(g, dt) {
    g.t += dt;
    if (g.t < g.tRappel) {
      var q = g.t / g.tRappel, xAvant = g.x;
      g.x = g.x0 + (g.xCible - g.x0) * q * q * (3 - 2 * q);
      g.y = g.y0;
      g.angle += (g.x - xAvant) / g.r * 180 / Math.PI;
      return true;
    }
    if (g.annonce) { etiquette(g, g.annonce); g.annonce = null; }
    var k = Math.min((g.t - g.tRappel) / 1.4, 1), e = k * k * (3 - 2 * k);
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
      g.etiquette.style.transform = 'translate3d(' + lx.toFixed(1) + 'px,' + (g.y - g.r - 50 - g.rangee * 46).toFixed(1) + 'px,0)';
    }
  }

  function boucle(t) {
    var dt = Math.min((t - dernier) / 1000, 0.05);
    dernier = t;
    for (var k in gemmes) avancer(gemmes[k], dt);
    chocs();
    for (k in gemmes) dessiner(gemmes[k]);
    for (k in cartes) {
      var c = cartes[k].g;
      if (!cartes[k].el.classList.contains('vide') && (c.prochaineParticule -= dt) <= 0) { c.prochaineParticule = 0.25 + Math.random() * 0.3; particule(c); }
    }
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
      '.gemme { z-index:1; } .gemme.gemme-part { z-index:0; }' +
      '.gemme-part .gemme-halo { animation:gemme-pulse .25s ease-in-out infinite alternate; }' +
      '.gemme-reflet { position:absolute; left:20%; top:12%; width:30%; height:20%; border-radius:50%;' +
      '  background:radial-gradient(closest-side, rgba(255,255,255,.5), rgba(255,255,255,0)); transform:rotate(-30deg); }' +
      '.gemme-ombre { border-radius:50%; background:radial-gradient(closest-side, rgba(10,5,2,.7), rgba(10,5,2,0)); }' +
      '.gemme-etincelle, .gemme-particule { position:absolute; pointer-events:none; }' +
      '.gemme-etincelle { filter:drop-shadow(0 0 3px currentColor); }' +
      '.gemme-etincelle.scintille { animation:gemme-scintille .8s ease-in-out forwards; }' +
      '.gemme-etincelle.gerbe { animation:gemme-gerbe 1.1s cubic-bezier(.2,.7,.4,1) forwards; }' +
      '.gemme-etiquette { white-space:nowrap; padding:4px 14px 6px; background:#efe2bf; color:#2a1608;' +
      '  font:22px "IM Fell English SC", Georgia, serif; letter-spacing:1px; border:2px solid #3a2210; border-radius:4px;' +
      '  box-shadow:2px 4px 6px rgba(0,0,0,.45); animation:gemme-etiquette 4.5s ease forwards; }' +
      // particules des gemmes elementaires
      // cartes des derniers soutiens (panneau de quetes)
      '.soutien-carte { position:absolute; width:380px; height:76px; box-sizing:border-box; padding:6px 14px 0 88px;' +
      '  background:#efe2bf radial-gradient(ellipse at 30% 20%, rgba(255,250,230,.6), transparent 60%);' +
      '  border:2px solid #3a2210; border-radius:4px; box-shadow:3px 6px 8px rgba(0,0,0,.5); color:#2a1608;' +
      '  font-family:"IM Fell English SC", Georgia, serif; transform:rotate(var(--penche)); }' +
      '.soutien-carte.maj { animation:soutien-maj .7s ease-out; }' +
      '.soutien-clou { position:absolute; left:50%; top:-5px; width:10px; height:10px; margin-left:-5px; border-radius:50%;' +
      '  background:radial-gradient(circle at 35% 35%, #9a948a, #3a362f 70%); box-shadow:1px 2px 2px rgba(0,0,0,.6); }' +
      '.soutien-gemme { position:absolute; left:8px; top:4px; width:68px; height:68px; }' +
      '.soutien-tourne { animation:soutien-tourne 24s linear infinite; }' +
      '.soutien-titre { font-size:17px; letter-spacing:1px; color:#6b4526; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }' +
      '.soutien-nom { font-size:34px; line-height:42px; letter-spacing:1px; white-space:nowrap; overflow:hidden; }' +
      '.soutien-carte.vide .soutien-nom { color:#9a7a55; font-style:italic; }' +
      '.soutien-carte.vide .soutien-gemme { opacity:.45; filter:grayscale(.6); }' +
      '@keyframes soutien-tourne { to { transform:rotate(360deg) } }' +
      '@keyframes soutien-maj { 0% { transform:rotate(var(--penche)) scale(1) } 30% { transform:rotate(var(--penche)) scale(1.08) }' +
      '  100% { transform:rotate(var(--penche)) scale(1) } }' +
      '.gemme-particule.feu { border-radius:50% 50% 50% 50% / 60% 60% 40% 40%;' +
      '  background:radial-gradient(circle at 50% 65%, #fff6c0, #ffb02e 35%, var(--c) 60%, rgba(200,40,0,0) 75%);' +
      '  animation:gemme-flamme .9s ease-out forwards; }' +
      '.gemme-particule.eau { border-radius:50%; border:1.5px solid rgba(220,245,255,.85);' +
      '  background:radial-gradient(circle at 35% 30%, rgba(255,255,255,.8) 0 15%, rgba(120,200,255,.15) 30%, rgba(120,200,255,.05));' +
      '  animation:gemme-bulle 1.6s ease-in-out forwards; }' +
      '.gemme-particule.terre { border-radius:30% 50% 40% 50%; background:linear-gradient(135deg, #e8c46a, #8a5a24 60%, #4e3214);' +
      '  animation:gemme-poussiere 1.1s cubic-bezier(.3,.6,.6,1) forwards; }' +
      '.gemme-particule.air { border-radius:50%; border-top:2px solid rgba(235,255,250,.9); border-left:1px solid rgba(235,255,250,.4);' +
      '  animation:gemme-souffle 1.3s ease-out forwards; }' +
      '@keyframes gemme-pulse { from { opacity:.55 } to { opacity:1 } }' +
      '@keyframes gemme-scintille { 0% { transform:scale(0) rotate(0) } 50% { transform:scale(1) rotate(45deg) } 100% { transform:scale(0) rotate(90deg) } }' +
      '@keyframes gemme-gerbe { 0% { transform:translate(0,0) scale(.3); opacity:1 }' +
      '  70% { opacity:1 } 100% { transform:translate(var(--dx),var(--dy)) scale(1) rotate(180deg); opacity:0 } }' +
      '@keyframes gemme-etiquette { 0% { opacity:0 } 10%, 80% { opacity:1 } 100% { opacity:0 } }' +
      '@keyframes gemme-flamme { 0% { transform:translate(0,0) scale(.6); opacity:0 } 15% { opacity:1 }' +
      '  100% { transform:translate(calc(var(--dx) * .4), calc(var(--dy) * 1.4)) scale(.15); opacity:0 } }' +
      '@keyframes gemme-bulle { 0% { transform:translate(0,0) scale(.3); opacity:0 } 20% { opacity:1 }' +
      '  50% { transform:translate(calc(var(--dx) * .5), calc(var(--dy) * .5)) scale(.9) }' +
      '  90% { transform:translate(calc(var(--dx) * -.2), var(--dy)) scale(1); opacity:1 }' +
      '  100% { transform:translate(calc(var(--dx) * -.2), var(--dy)) scale(1.4); opacity:0 } }' +
      '@keyframes gemme-poussiere { 0% { transform:translate(0,0) rotate(0); opacity:1 }' +
      '  40% { transform:translate(calc(var(--dx) * .6), calc(var(--dy) * .6)) rotate(120deg) }' +
      '  100% { transform:translate(var(--dx), 30px) rotate(300deg); opacity:0 } }' +
      '@keyframes gemme-souffle { 0% { transform:translate(0,0) rotate(0) scale(.5); opacity:0 } 25% { opacity:1 }' +
      '  100% { transform:translate(calc(var(--dx) * 1.5), calc(var(--dy) * .7)) rotate(-300deg) scale(1.6); opacity:0 } }';
    document.head.appendChild(s);
  }

  // ---- Lurkers ----
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
  function gemmeLurk(p, chute) {
    var alea = aleaGraine(hachage(p.login) + 1);
    creer({ id: 'lurk:' + p.login, login: p.login, nom: p.nom, pierre: choisirPierre(p),
            r: O.rayon[0] + alea() * (O.rayon[1] - O.rayon[0]), arrivee: p.nom + ' part en lurk' }, chute);
  }
  if (window.Lurk) {
    Lurk.liste().forEach(function (p) { gemmeLurk(p, false); });
    Lurk.quand('entree', function (p) { if (!gemmes['lurk:' + p.login]) gemmeLurk(p, true); });
    Lurk.quand('retour', function (p) {
      var d = duree(p.duree);
      partir('lurk:' + p.login, p.nom + ' est de retour !' + (d ? ' (après ' + d + ')' : ''));
    });
    // deja en lurk et refait "!lurk 5" : la gemme change de pierre dans une gerbe d'etincelles
    Lurk.quand('modif', function (p) {
      var g = gemmes['lurk:' + p.login];
      if (!g) return;
      var pierre = choisirPierre(p);
      if (pierre === g.pierre) return;
      g.pierre = pierre;
      habiller(g);
      gerbe(g.x, g.y, pierre, 10, 110);
    });
  }

  // ---- Soutiens de la session (gemmes elementaires, en bas) ----
  // Une gemme par personne et par categorie, qui reste tout le live. La meme personne qui
  // recommence garde sa gemme : gerbe d'etincelles et nouveau remerciement. Les soutiens
  // rattrapes dans l'historique du chat sont poses au sol sans chute ni etiquette.
  function gemmeSoutien(s, chute) {
    creer({ id: 'soutien:' + s.cat + ':' + s.login, login: s.login, nom: s.nom, pierre: ELEMENTS[s.cat], element: true,
            r: O.rayonElement, arrivee: ELEMENTS[s.cat].merci(s) }, chute);
  }
  if (window.Derniers) {
    Derniers.session().forEach(function (s) { if (O.bas.indexOf(s.cat) >= 0) gemmeSoutien(s, false); });
    Derniers.quand('soutien', function (s) {
      if (O.bas.indexOf(s.cat) < 0) return;
      var g = gemmes['soutien:' + s.cat + ':' + s.login];
      if (!g) { gemmeSoutien(s, !s.rattrape); return; }
      if (s.rattrape) return;
      gerbe(g.x, g.y, g.pierre, 12, 120);
      etiquette(g, ELEMENTS[s.cat].merci(s));
    });
  }

  // ---- Derniers soutiens (cartes en haut, sur le panneau de quetes) ----
  // Une affiche par categorie, clouee sur le panneau : la gemme de l'element qui tourne
  // doucement, "Dernier sub" et le pseudo en grand (reduit s'il est trop long pour tenir).
  // O.haut = { sub: [x, y], don: [x, y], bits: [x, y] } (coin haut gauche, carte 380x76),
  // ou false pour ne pas les afficher (scenes sans panneau).
  var TITRES = { sub: 'Dernier sub', don: 'Dernier don', bits: 'Derniers bits', follow: 'Dernier follow' };
  var cartes = {};
  function carte(cat, pos) {
    var c = { cat: cat, el: div('soutien-carte') };
    c.el.style.cssText = 'left:' + pos[0] + 'px;top:' + pos[1] + 'px;--penche:' + ((hachage(cat) % 5) - 2) * 0.6 + 'deg';
    div('soutien-clou', c.el);
    var gemme = div('soutien-gemme', c.el);
    c.halo = div('gemme-halo', gemme);
    c.halo.style.background = 'radial-gradient(closest-side, hsla(' + ELEMENTS[cat].lueur + ',0.6), hsla(' + ELEMENTS[cat].lueur + ',0.18) 55%, transparent)';
    c.corps = div('gemme-corps soutien-tourne', gemme);
    c.titre = div('soutien-titre', c.el);
    c.nom = div('soutien-nom', c.el);
    // centre de la gemme (pour les particules) : 8 + 34 dans la carte
    c.g = { x: pos[0] + 42, y: pos[1] + 38, r: 30, pierre: ELEMENTS[cat], prochaineParticule: Math.random() };
    cartes[cat] = c;
    return c;
  }
  function remplirCarte(c, s, anime) {
    c.titre.textContent = TITRES[c.cat] + (s && s.detail ? ' · ' + s.detail : '');
    c.nom.textContent = s ? s.nom : 'personne… pour l’instant';
    c.el.classList.toggle('vide', !s);
    c.corps.innerHTML = svgGemme(ELEMENTS[c.cat], aleaGraine(1), 'carte-' + c.cat, s ? s.nom : '');
    ajusterNom(c);
    if (anime) {
      c.el.classList.remove('maj');
      void c.el.offsetWidth;   // relance l'animation
      c.el.classList.add('maj');
      gerbe(c.g.x, c.g.y, c.g.pierre, 14, 120);
    }
  }
  // Pseudo en 34 px, reduit jusqu'a 16 px s'il depasse de la carte.
  function ajusterNom(c) {
    var taille = 34;
    c.nom.style.fontSize = taille + 'px';
    while (c.nom.scrollWidth > c.nom.clientWidth && taille > 16) c.nom.style.fontSize = --taille + 'px';
  }
  if (window.Derniers && O.haut) {
    var tous = Derniers.tous();
    Object.keys(O.haut).forEach(function (cat) { if (ELEMENTS[cat]) remplirCarte(carte(cat, O.haut[cat]), tous[cat], false); });
    Derniers.quand('change', function (cat, nouveau) { if (cartes[cat]) remplirCarte(cartes[cat], nouveau, !!nouveau); });
    // la police arrive apres le premier affichage : re-ajuste les pseudos
    if (document.fonts) document.fonts.ready.then(function () { Object.keys(cartes).forEach(function (k) { ajusterNom(cartes[k]); }); });
  }

  // ---- Tests ----
  // Gemme de demonstration, affichee seulement (rien n'est enregistre : ni la liste des
  // lurkers ni les derniers soutiens ne changent) ; elle repart d'elle-meme apres 'duree' s.
  //   quoi : 'sub' | 'don' | 'bits' | 'lurk' ; nom : pseudo grave ; arg : pierre pour 'lurk'
  //   ('3', 'rubis'...) ou nombre pour 'don' / 'bits'
  var numeroTest = 0;
  function demo(quoi, nom, arg, duree) {
    nom = nom || 'Test';
    var id = 'test:' + (++numeroTest), login = String(nom).toLowerCase();
    if (ELEMENTS[quoi]) {
      var n = parseInt(arg, 10);
      var s = { login: login, nom: nom, detail: quoi === 'bits' ? (n || 100) + ' bits' : quoi === 'don' ? (n || 5) + ' subs offerts' : 'Tier 1' };
      creer({ id: id, login: login, nom: nom, pierre: ELEMENTS[quoi], element: true, r: O.rayonElement, arrivee: ELEMENTS[quoi].merci(s) }, true);
    } else {
      var alea = aleaGraine(hachage(login) + 1);
      creer({ id: id, login: login, nom: nom, pierre: choisirPierre({ login: login, arg: arg }),
              r: O.rayon[0] + alea() * (O.rayon[1] - O.rayon[0]), arrivee: nom + ' part en lurk' }, true);
    }
    setTimeout(function () { partir(id, quoi === 'lurk' ? nom + ' est de retour !' : null); }, (duree || 15) * 1000);
  }

  requestAnimationFrame(boucle);
  return { demo: demo };
}
