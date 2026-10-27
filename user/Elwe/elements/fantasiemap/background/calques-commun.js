// Outils communs aux calques du fond (calque-*.svg), charges apres animations-config.js et
// avant le script du calque (calque-*.js). Repris de l'en-tete du script de
// ville-medievale-croquis.svg, plus le cycle jour/nuit, partage par le ciel (astres, calque 2)
// et le village (voile de nuit, lumieres, calque 4).
var CFG = window.ANIM_CONFIG || {};
// Valeur de reglage par chemin 'a.b.c', ou def si absente.
function cfg(path, def) {
  var v = CFG, parts = path.split('.');
  for (var i = 0; i < parts.length; i++) { if (v == null) return def; v = v[parts[i]]; }
  return v === undefined || v === null ? def : v;
}
// Duree en ms depuis un reglage en secondes : nombre fixe ou [min, max] tire au hasard.
function cfgMs(path, def) {
  var v = cfg(path, def);
  if (Array.isArray(v)) return (v[0] + Math.random() * (v[1] - v[0])) * 1000;
  return v * 1000;
}
var rootStyle = document.documentElement.style;
rootStyle.setProperty('--ble-balancement', cfg('ble.balancement', 3.4) + 's');
rootStyle.setProperty('--ble-rafale', cfg('ble.rafale', 11) + 's');
rootStyle.setProperty('--ble-force-balancement', cfg('ble.forceBalancement', 5));
rootStyle.setProperty('--ble-force-rafale', cfg('ble.forceRafale', 8));
rootStyle.setProperty('--arbre-force', cfg('ble.forceArbres', 0.35));
rootStyle.setProperty('--moulin-tour', cfg('moulin.tour', 16) + 's');
rootStyle.setProperty('--chat-queue', cfg('chat.queue', 3.7) + 's');
rootStyle.setProperty('--chat-respiration', cfg('chat.respiration', 2.9) + 's');
rootStyle.setProperty('--chat-tete', cfg('chat.tete', 11) + 's');
rootStyle.setProperty('--chat-oreille', cfg('chat.oreille', 7.3) + 's');

// Horloge virtuelle commune aux aiguilles de la tour et au cycle jour/nuit.
// mode 'reel' (par defaut) : suit l'heure de l'ordinateur.
// mode 'accelere' : une journee complete de 24h dure 'jourNuit.dureeCycle' minutes.
// Les calques sont des pages separees, chargees (ou actualisees) a des moments differents :
// l'horloge acceleree est donc calee sur l'heure de l'ordinateur et non sur le chargement,
// pour que le soleil du ciel (calque 2) et le voile de nuit du village (calque 4) restent
// synchronises. 'jourNuit.heureDepart' est l'heure affichee a minuit puis a chaque debut de
// cycle (toutes les dureeCycle minutes depuis minuit), plus l'heure au chargement.
var tempsMode = cfg('jourNuit.mode', 'reel'), tempsCycleMin = cfg('jourNuit.dureeCycle', 20);
var temps_startHour = cfg('jourNuit.heureDepart', 7);
var temps_minuit = new Date(); temps_minuit.setHours(0, 0, 0, 0); temps_minuit = temps_minuit.getTime();
function heureVirtuelle() {
  if (tempsMode === 'accelere') return (temps_startHour + (performance.timeOrigin + performance.now() - temps_minuit) / 60000 / tempsCycleMin * 24) % 24;
  var d = new Date(); return d.getHours() + d.getMinutes() / 60 + d.getSeconds() / 3600;
}
// setAttribute seulement si la valeur change : les animations tournent a chaque frame
// (requestAnimationFrame) et un attribut reecrit a l'identique forcerait quand meme un
// repaint de la zone (voire de toute la scene pour les voiles plein ecran).
// Element absent (il est dans un autre calque) : ignore.
function setAttrSiChange(el, name, val) {
  if (!el) return;
  var k = '_v_' + name;
  if (el[k] !== val) { el[k] = val; el.setAttribute(name, val); }
}

window.addEventListener('load', function () {
  // Jour et nuit : suit la meme horloge virtuelle que les aiguilles de la tour
  // (mode 'reel' ou 'accelere', voir heureVirtuelle ci-dessus). Chaque calque ne pilote que
  // les elements qu'il contient : astres et etoiles (ciel), voiles, lueur et classe .nuit
  // des lumieres (village).
  //
  // Heures de lever/coucher du soleil en France (heure legale civile, changements
  // d'heure ete/hiver inclus) par mois, valeurs moyennes approchees pour la France
  // metropolitaine. Utilisees quand jourNuit.lever / jourNuit.coucher ne sont pas
  // fixes explicitement dans la config (valeur null = automatique selon le mois en cours).
  var soleil = document.getElementById('soleil'), lune = document.getElementById('lune');
  var etoiles = document.getElementById('etoiles');
  var voile = document.getElementById('voile-nuit'), crep = document.getElementById('voile-crepuscule');
  var lueur = document.getElementById('lueur-astre'), vign = document.getElementById('vignette-nuit');
  if (!soleil && !voile) return;
  var SOLEIL_FRANCE = [
    [8.6, 17.4], [7.9, 18.3], [7.2, 19.1], [7.0, 20.6], [6.2, 21.3], [5.8, 21.9],
    [6.0, 21.8], [6.7, 21.1], [7.4, 20.1], [8.0, 19.0], [7.7, 17.2], [8.4, 16.9]
  ];
  var soleilMois = SOLEIL_FRANCE[new Date().getMonth()];
  var leverCfg = cfg('jourNuit.lever', null), coucherCfg = cfg('jourNuit.coucher', null);
  var LEVER = leverCfg === null ? soleilMois[0] : leverCfg;
  var COUCHER = coucherCfg === null ? soleilMois[1] : coucherCfg;
  var NUIT = cfg('jourNuit.obscurite', 0.6);
  var AMB = cfg('jourNuit.lumiereAmbiante', 1);
  function smooth(a, b, x) { var t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); }
  // Position sur l'arc du ciel (p : 0 lever -> 1 coucher) : vrai arc de cercle (vitesse
  // angulaire constante) d'un coin a l'autre de l'ovale du ciel. Extremites ARC_A (bord
  // gauche de l'ovale) et ARC_B (bord droit du cadre) a l'horizon ARC_Y, sommet a ARC_HAUT ;
  // au-dela de p = 0 / p = 1 l'astre continue sur le meme cercle et passe sous les collines.
  var ARC_A = 1620, ARC_B = 3780, ARC_Y = 650, ARC_HAUT = 170;
  var arcDemi = (ARC_B - ARC_A) / 2, arcFleche = ARC_Y - ARC_HAUT;
  var arcR = (arcDemi * arcDemi + arcFleche * arcFleche) / (2 * arcFleche);
  var arcCx = (ARC_A + ARC_B) / 2, arcCy = ARC_HAUT + arcR;
  var arcTheta = Math.asin(arcDemi / arcR);
  function arc(p) {
    var t = arcTheta * (2 * p - 1);
    return [arcCx + arcR * Math.sin(t), arcCy - arcR * Math.cos(t)];
  }
  function update() {
    var h = heureVirtuelle(), dayLen = COUCHER - LEVER, nightLen = 24 - dayLen;
    var pd = (h - LEVER) / dayLen;                                   // soleil
    var pn = ((h - COUCHER + 24) % 24) / nightLen;                   // lune
    // Juste avant le coucher du soleil, pn vaut ~24/nightLen : on le ramene en negatif
    // pour que la lune se leve progressivement derriere les collines au lieu d'apparaitre
    // d'un coup sur l'horizon.
    if (pn > 1.5) pn -= 24 / nightLen;
    var sunUp = pd > -0.05 && pd < 1.05, moonUp = pn > -0.05 && pn < 1.05;
    if (sunUp) { var a = arc(pd); setAttrSiChange(soleil, 'transform', 'translate(' + a[0].toFixed(1) + ',' + a[1].toFixed(1) + ')'); }
    if (moonUp) { var m = arc(pn); setAttrSiChange(lune, 'transform', 'translate(' + m[0].toFixed(1) + ',' + m[1].toFixed(1) + ')'); }
    setAttrSiChange(soleil, 'opacity', sunUp ? '1' : '0');
    setAttrSiChange(lune, 'opacity', moonUp ? '1' : '0');
    // obscurite : 0 le jour, 1 la nuit, transitions d'environ 1 h autour du lever et du coucher
    var dark = 1 - smooth(LEVER - 0.5, LEVER + 0.75, h) * (1 - smooth(COUCHER - 0.75, COUCHER + 0.5, h));
    // teinte chaude : pic au lever et au coucher
    var warm = Math.max(Math.exp(-Math.pow((h - LEVER) / 0.7, 2)), Math.exp(-Math.pow((h - COUCHER) / 0.7, 2)));
    setAttrSiChange(voile, 'opacity', (dark * NUIT).toFixed(3));
    setAttrSiChange(crep, 'opacity', (warm * 0.22).toFixed(3));
    // Lueur ambiante : centree sur le soleil le jour, sur la lune la nuit ; plus forte quand
    // l'astre est haut, chaude et rasante au lever/coucher.
    var src = null, amb = 0;
    if (sunUp && dark < 0.6) { src = arc(pd); amb = (1 - dark) * (0.55 + 0.45 * Math.sin(Math.PI * Math.min(1, Math.max(0, pd)))); setAttrSiChange(lueur, 'fill', 'url(#lueur-soleil)'); }
    else if (moonUp) { src = arc(pn); amb = dark * 0.25 * Math.sin(Math.PI * Math.min(1, Math.max(0, pn))); setAttrSiChange(lueur, 'fill', 'url(#lueur-lune)'); }
    if (src) { setAttrSiChange(lueur, 'cx', src[0].toFixed(1)); setAttrSiChange(lueur, 'cy', src[1].toFixed(1)); }
    setAttrSiChange(lueur, 'opacity', (AMB * amb).toFixed(3));
    setAttrSiChange(vign, 'opacity', (dark * 0.7).toFixed(3));
    setAttrSiChange(etoiles, 'opacity', Math.max(0, (dark - 0.4) / 0.6).toFixed(2));
    document.documentElement.classList.toggle('nuit', dark > 0.5);
  }
  // Mode accelere : a chaque frame pour un deplacement fluide des astres (l'ancien pas de
  // 100 ms donnait des sauts de plusieurs pixels). Mode reel : le ciel bouge a peine,
  // un rafraichissement toutes les 5 s suffit.
  if (tempsMode === 'accelere') (function loop() { update(); requestAnimationFrame(loop); })();
  else { update(); setInterval(update, 5000); }
});
