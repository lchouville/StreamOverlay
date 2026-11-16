// =====================================================================================
// CONSTELLATIONS DU CHAT : chaque personne qui ecrit dans le chat a sa constellation dans
// le fond (forme unique, calculee a partir du pseudo), avec son pseudo en dessous.
//  - elle glisse doucement du bas-gauche vers le haut-droite, en boucle sur toute la page
//    (elle passe derriere le jeu / la cam, puis reapparait dans les zones visibles) ;
//  - elle reste affichee 1 min apres le DERNIER message (chaque message relance le delai) ;
//  - !lurk : elle reste, plus petite et moins brillante, et derive plus lentement, en boucle ;
//    !here : fin du lurk, elle redevient normale.
// Charger apres twitch-chat.js, dans la page, avec un conteneur : <div id="constellations">.
//   Constellations.init(conteneur, options)   options (toutes facultatives) :
//     chaine   : chaine Twitch ecoutee (defaut 'saphirschwarz', ou ?chaine= dans l'URL)
//     duree    : ms d'affichage apres le dernier message (defaut 60000, ou ?duree=secondes)
//     zones    : trajets (voir CONFIG ci-dessous) ; ignores : pseudos (minuscules) jamais affiches
// Tests sans chat : ?test=Alice,Bob (messages), ?testlurk=Dan,Eve ; ?vitesse=10 accelere la
// derive (x10) ; en console : Constellations.message('Alice'), .lurk('Alice'), .here('Alice').
// Les lurkers sont gardes dans le localStorage (partage entre les sources/pages du live,
// vide apres 12 h sans changement). Au chargement, l'historique recent du chat est aussi rejoue
// (!lurk / !here manques pendant que la source etait fermee ; messages de moins d'1 min). Les constellations passent derriere les trous du fond
// (zone de jeu, cam) grace au masque de #bg-layer.
// =====================================================================================
var Constellations = (function () {
  var CLE = 'saphir-lurk', SESSION_H = 12;
  var CONFIG, racine, vivants = {}, vitesse = 1;
  var LARG = 130, HAUT = 96, CW = 170;       // dessin / largeur de la boite (dessin + pseudo)
  var NS = 'http://www.w3.org/2000/svg';
  var idDefs = 0;

  // ---- forme deterministe a partir du pseudo -------------------------------------------
  function graine(texte) { var h = 2166136261; for (var i = 0; i < texte.length; i++) { h ^= texte.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
  function alea(g) { return function () { g |= 0; g = g + 0x6D2B79F5 | 0; var t = Math.imul(g ^ g >>> 15, 1 | g); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
  function el(nom, attrs, parent) {
    var e = document.createElementNS(NS, nom);
    for (var k in attrs) e.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(e);
    return e;
  }

  function dessin(login) {
    var r = alea(graine(login)), n = 5 + Math.floor(r() * 4), pts = [], i;
    for (i = 0; i < n; i++) pts.push({
      x: 10 + (LARG - 20) * i / (n - 1) + (r() - .5) * 14,
      y: 10 + r() * (HAUT - 20), r: 1.3 + r() * 1.9,
      c: r() < .25 ? '#f3e6b3' : r() < .3 ? '#b9ccff' : '#ffffff'
    });
    var liens = [];                                    // chaine continue + 1 ou 2 raccourcis
    for (i = 1; i < n; i++) liens.push([i - 1, i]);
    for (var k = r() < .5 ? 2 : 1; k > 0; k--) { var a = Math.floor(r() * n), b = Math.floor(r() * n); if (Math.abs(a - b) > 1) liens.push([a, b]); }
    var plus = 0; pts.forEach(function (p, j) { if (p.r > pts[plus].r) plus = j; });   // l'etoile principale

    var id = 'cg' + (++idDefs);
    var svg = el('svg', { viewBox: '0 0 ' + LARG + ' ' + HAUT, width: LARG, height: HAUT });
    var defs = el('defs', {}, svg);
    var glow = el('radialGradient', { id: id }, defs);                                       // halo des etoiles
    el('stop', { offset: 0, 'stop-color': '#cfe0ff', 'stop-opacity': 0.55 }, glow);
    el('stop', { offset: 1, 'stop-color': '#cfe0ff', 'stop-opacity': 0 }, glow);

    liens.forEach(function (l, j) {
      var p = pts[l[0]], q = pts[l[1]];
      var ln = el('line', { x1: p.x, y1: p.y, x2: q.x, y2: q.y }, svg);
      ln.style.animationDelay = (j * 0.12) + 's';
    });
    pts.forEach(function (p, j) {
      var g = el('g', {}, svg);
      g.style.animationDelay = (j * 0.12) + 's';
      var halo = el('circle', { cx: p.x, cy: p.y, r: p.r * 4.2, fill: 'url(#' + id + ')', class: 'halo' }, g);
      halo.style.animationDelay = (r() * 4).toFixed(2) + 's';                               // scintillement decale
      el('circle', { cx: p.x, cy: p.y, r: p.r, fill: p.c, class: 'coeur' }, g);
      if (j === plus) {                                                                      // eclat a 4 branches
        var d = p.r * 4.2;
        el('path', { d: 'M' + (p.x - d) + ' ' + p.y + 'L' + (p.x + d) + ' ' + p.y + 'M' + p.x + ' ' + (p.y - d) + 'L' + p.x + ' ' + (p.y + d),
                     stroke: '#fff', 'stroke-width': 0.8, 'stroke-linecap': 'round', opacity: 0.8, class: 'eclat' }, g);
      }
    });
    return svg;
  }

  // ---- placement ------------------------------------------------------------------------
  // Point de depart tire au hasard sur toute la page. 'visible' : la constellation (boite complete,
  // a l'echelle e) ne doit pas tomber derriere un trou du fond ni sous le chat (CONFIG.cachees).
  function visible(c, e) {
    var l = CW * e, h = 124 * e;
    return !CONFIG.cachees.some(function (r) { return c.x + l / 2 > r.x && c.x - l / 2 < r.x + r.w && c.y + h > r.y && c.y < r.y + r.h; });
  }
  // 24 points tires ; on garde, parmi les visibles si 'seulementVisible', celui qui est le plus loin des autres.
  function pointLibre(z, exclu, seulementVisible) {
    var meilleur = null, dmax = -1;
    for (var i = 0; i < 24; i++) {
      var c = { x: Math.random() * 1900 + 10, y: Math.random() * 1000 }, dmin = 1e9;
      if (seulementVisible && !visible(c, z.echelle)) continue;
      Object.keys(vivants).forEach(function (k) {
        var o = vivants[k]; if (o === exclu) return;
        dmin = Math.min(dmin, Math.hypot((o.x - c.x) * 0.6, o.y - c.y));
      });
      if (dmax < 0 || dmin > dmax) { dmax = dmin; meilleur = c; }
    }
    return meilleur || { x: 200, y: 40 };
  }
  function trajet(v) { return v.lurk ? CONFIG.zones.lurk : CONFIG.zones.actif; }
  function cadrer(v, direct) {
    var z = trajet(v), p = pointLibre(z, v, !v.lurk);
    v.vx = z.vx; v.vy = z.vy; v.cibleS = z.echelle;
    if (direct) { v.x = p.x; v.y = p.y; v.s = z.echelle; } else v.cible = p;   // sinon : glisse jusqu'au nouveau trajet
  }

  // ---- cycle de vie ---------------------------------------------------------------------
  function retirer(v) {
    if (v.parti) return;
    v.parti = true; clearTimeout(v.minuteur);
    delete vivants[v.login];
    remplir();
    v.el.style.opacity = '';
    v.el.classList.add('part');
    setTimeout(function () { v.el.remove(); }, 2200);
  }
  function armer(v) {
    clearTimeout(v.minuteur);
    if (!v.lurk) v.minuteur = setTimeout(function () { retirer(v); }, CONFIG.duree);
  }
  function creer(login, nom, lurk) {
    var e = document.createElement('div');
    e.className = 'constellation' + (lurk ? ' lurk' : '');
    e.appendChild(dessin(login));
    var lab = document.createElement('div'); lab.className = 'constellation-nom label-font'; lab.textContent = nom;
    e.appendChild(lab);
    var v = vivants[login] = { login: login, nom: nom, el: e, lurk: lurk, x: 0, y: 0, s: 1, vx: 0, vy: 0, cible: null, cibleS: 1, dernier: Date.now(), minuteur: 0, parti: false, rang: ++rang };
    cadrer(v, true);
    v.attente = Object.keys(vivants).filter(function (k) { return !vivants[k].attente; }).length > MAX;   // vivants contient deja v
    place(v);
    racine.appendChild(e);
    return v;
  }
  function message(nom) {
    var login = String(nom).toLowerCase();
    if (CONFIG.ignores.indexOf(login) >= 0) return;
    var v = vivants[login] || creer(login, nom, false);
    v.dernier = Date.now();
    if (!v.lurk) { v.el.classList.remove('pulse'); void v.el.offsetWidth; v.el.classList.add('pulse'); armer(v); }
  }
  function lurk(nom) {
    var login = String(nom).toLowerCase();
    if (CONFIG.ignores.indexOf(login) >= 0) return;
    var v = vivants[login];
    if (!v) creer(login, nom, true);
    else if (!v.lurk) { v.lurk = true; v.el.classList.add('lurk'); clearTimeout(v.minuteur); cadrer(v, false); }
    sauver();
  }
  function here(nom) {
    var v = vivants[String(nom).toLowerCase()];
    if (v && v.lurk) { v.lurk = false; v.el.classList.remove('lurk'); v.dernier = Date.now(); cadrer(v, false); armer(v); }
    sauver();
  }

  // ---- mouvement : derive continue du bas-gauche au haut-droite, en boucle -----------------
  // Sortie par la droite ou par le haut -> retour par la gauche ou par le bas (meme droite).
  var BORD = { xmin: -100, xmax: 1960, ymin: -150, ymax: 1180 };
  // Au plus MAX constellations affichees ; les autres attendent (invisibles). Quand une sort, elle prend la
  // file d'attente et la premiere en attente reapparait. Le point d'entree est tire au hasard sur le bord
  // gauche ou bas (au prorata du flux), pour ne pas toujours repartir du coin le plus loin.
  var MAX = 20, rang = 0;
  function entree(v) {
    var a = v.vx * (BORD.ymax - BORD.ymin), b = -v.vy * (BORD.xmax - BORD.xmin), dmax = -1;
    for (var i = 0; i < 24; i++) {                      // 24 candidats ; on garde le plus loin des autres (pas de superposition)
      var c = Math.random() < a / (a + b)
        ? { x: BORD.xmin, y: BORD.ymin + Math.random() * (BORD.ymax - BORD.ymin) }
        : { x: BORD.xmin + Math.random() * (BORD.xmax - BORD.xmin), y: BORD.ymax }, dmin = 1e9;
      Object.keys(vivants).forEach(function (k) {
        var o = vivants[k]; if (o === v || o.attente) return;
        dmin = Math.min(dmin, Math.hypot((o.x - c.x) * 0.6, o.y - c.y));
      });
      if (dmin > dmax) { dmax = dmin; v.x = c.x; v.y = c.y; }
    }
  }
  // Une place se libere (retrait, depart) : la file d'attente comble jusqu'a MAX affichees, depuis la zone de depart.
  function remplir() {
    var tous = Object.keys(vivants).map(function (k) { return vivants[k]; });
    var libres = MAX - tous.filter(function (o) { return !o.attente; }).length;
    tous.filter(function (o) { return o.attente; }).sort(function (a, b) { return a.rang - b.rang; }).slice(0, Math.max(0, libres)).forEach(function (w) { w.attente = false; entree(w); });
  }
  function reapparaitre(v) {
    var w = Object.keys(vivants).map(function (k) { return vivants[k]; }).filter(function (o) { return o.attente; }).sort(function (a, b) { return a.rang - b.rang; })[0];
    if (w) { v.attente = true; v.rang = ++rang; w.attente = false; }   // la sortante passe en fin de file : chacune son tour
    entree(w || v);
  }
  function place(v) {
    if (v.attente) { v.el.style.opacity = 0; return; }
    var f = Math.max(0, Math.min((v.x - BORD.xmin) / 40, (BORD.xmax - v.x) / 40, (BORD.ymax - v.y) / 40, (v.y - BORD.ymin) / 40, 1));   // fondu aux bords (court : réapparition rapide)
    v.el.style.transform = 'translate(' + (v.x - CW / 2).toFixed(1) + 'px,' + v.y.toFixed(1) + 'px) scale(' + v.s.toFixed(3) + ')';
    if (!v.parti) v.el.style.opacity = f;
  }
  var dernierImage = performance.now();
  function image(t) {
    var dt = Math.min((t - dernierImage) / 1000, 0.1); dernierImage = t;
    Object.keys(vivants).forEach(function (k) {
      var v = vivants[k];
      v.s += (v.cibleS - v.s) * Math.min(1, dt * 1.5);
      if (v.attente) { place(v); return; }
      if (v.cible) {                                   // changement de statut : rejoint son nouveau trajet
        v.x += (v.cible.x - v.x) * Math.min(1, dt * 1.2); v.y += (v.cible.y - v.y) * Math.min(1, dt * 1.2);
        if (Math.hypot(v.cible.x - v.x, v.cible.y - v.y) < 6) v.cible = null;
      } else {
        v.x += v.vx * dt * vitesse; v.y += v.vy * dt * vitesse;
        if (v.x > BORD.xmax || v.y < BORD.ymin) reapparaitre(v);
      }
      place(v);
    });
    requestAnimationFrame(image);
  }

  // ---- lurkers partages entre pages -----------------------------------------------------
  function sauver() {
    try {
      var l = {}; Object.keys(vivants).forEach(function (k) { if (vivants[k].lurk) l[k] = vivants[k].nom; });
      localStorage.setItem(CLE, JSON.stringify({ maj: Date.now(), lurkers: l }));
    } catch (e) { /* stockage indisponible : lurkers gardes seulement par cette page */ }
  }
  function charger() {
    try {
      var etat = JSON.parse(localStorage.getItem(CLE) || 'null');
      if (!etat || Date.now() - etat.maj > SESSION_H * 3600000) return {};
      return etat.lurkers || {};
    } catch (e) { return {}; }
  }
  function synchroniser() {
    var l = charger();
    Object.keys(l).forEach(function (k) { if (!vivants[k] || !vivants[k].lurk) lurk(l[k]); });
    Object.keys(vivants).forEach(function (k) { if (vivants[k].lurk && !l[k]) here(vivants[k].nom); });
  }

  function init(conteneur, options) {
    var q = new URLSearchParams(location.search);
    vitesse = parseFloat(q.get('vitesse')) || 1;
    CONFIG = Object.assign({
      chaine: q.get('chaine') || 'saphirschwarz',
      duree: (parseFloat(q.get('duree')) || 60) * 1000,
      // Vitesses en px/s sur le canvas 1920x1080 (vy < 0 : vers le haut). Tout le monde suit la meme
      // diagonale et repasse en boucle ; les actifs naissent dans une zone visible, les lurkers n'importe ou.
      zones: {
        actif: { vx: 18, vy: -10, echelle: 0.82 },
        lurk: { vx: 8, vy: -4.4, echelle: 0.42 }
      },
      // Rectangles ou une constellation ne doit pas NAITRE (derriere le jeu, la cam, le chat) : cf. trous du fond.
      cachees: [],
      ignores: ['nightbot', 'streamelements', 'streamlabs', 'moobot', 'fossabot', 'wizebot']
    }, options || {});
    racine = conteneur;

    var l = charger();                                 // lurkers du live en cours
    Object.keys(l).forEach(function (k) { lurk(l[k]); });
    window.addEventListener('storage', function (e) { if (e.key === CLE) synchroniser(); });

    if (typeof ecouterChatTwitch === 'function') ecouterChatTwitch(CONFIG.chaine, function (msg) {
      if (msg.mot === '!lurk') lurk(msg.nom);
      else if (msg.mot === '!here') here(msg.nom);
      else message(msg.nom);
    });

    // Historique du chat : retrouve les !lurk / !here envoyes pendant que cette page n'etait pas ouverte.
    // Seuls les messages de la session (SESSION_H) comptent ; les messages normaux ne recreent une
    // constellation que s'ils datent de moins de 'duree'.
    if (typeof ecouterChatTwitch === 'function' && ecouterChatTwitch.historique) ecouterChatTwitch.historique(CONFIG.chaine, function (msg) {
      var age = Date.now() - msg.ts;
      if (age > SESSION_H * 3600000) return;
      if (msg.mot === '!lurk') lurk(msg.nom);
      else if (msg.mot === '!here') here(msg.nom);
      else if (age < CONFIG.duree) message(msg.nom);
    });

    var test = q.get('test'), testLurk = q.get('testlurk');
    window.addEventListener('load', function () {
      (test ? test.split(',') : []).filter(Boolean).forEach(function (n, i) { setTimeout(function () { message(n); }, 400 + i * 500); });
      (testLurk ? testLurk.split(',') : []).filter(Boolean).forEach(function (n, i) { setTimeout(function () { lurk(n); }, 400 + i * 500); });
    });
    requestAnimationFrame(image);
  }

  return { init: init, message: message, lurk: lurk, here: here, dessin: dessin };
})();
