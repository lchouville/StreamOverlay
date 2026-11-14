// =====================================================================================
// SOUTIENS DU LIVE (subs, dons de subs, bits, follows), communs a toutes les scenes.
// =====================================================================================
// Categories :
//   sub    : sub ou resub (y compris Prime, et sub offert qu'on prolonge soi-meme)
//   don    : don de subs (un don groupe de 5 compte une fois, avec 5)
//   bits   : envoi de bits
//   follow : follow (voir plus bas)
// Garde pour tout le live :
//   - le DERNIER de chaque categorie (Derniers.tous) ;
//   - la SESSION : chaque personne qui a soutenu dans une categorie, une fois (Derniers.session),
//     avec son dernier soutien (detail) et son total du live (bits envoyes, subs offerts).
// Tout vient du chat Twitch en lecture anonyme (twitch-chat.js) : aucun token, rien a
// reconnecter. Les follows n'y passent pas (Twitch ne les donne qu'avec un token) ; ils sont
// donc pris :
//   - dans les messages d'un bot qui remercie les follows (CONFIG.followBots + followMotifs :
//     le 1er groupe capture est le pseudo), par ex. "Merci Pseudo pour le follow !" ;
//   - ou a la main par le streamer / un modo : "!follow Pseudo".
// Au chargement de la page (et donc a chaque !reload), les soutiens manques pendant que la
// page etait fermee sont rattrapes dans l'historique recent du chat
// (ecouterChatTwitch.historique, service public recent-messages.robotty.de, sans token) ;
// ils sont marques rattrape: true.
// Comme lurk.js : gardes dans le localStorage (partage entre les sources), une page rechargee
// les retrouve, et ils repartent de zero quand rien n'a change depuis 'dureeSession' heures.
//
// Un effet s'abonne avec
//   Derniers.quand('change', function (cat, nouveau, ancien) { ... })   dernier de cat change
//   Derniers.quand('soutien', function (s, premier) { ... })            nouveau soutien
//     s = { cat, login, nom, quand (ms), detail, total, rattrape } ; detail = texte court
//     ("Tier 1 - 12 mois", "500 bits", "5 subs offerts"...) ; premier : 1er de cette
//     personne dans cette categorie pendant le live
// Les evenements ne partent qu'une fois par page, meme si le soutien arrive a la fois par le
// chat et par une autre page (stockage).
// Charger apres ../twitch-chat.js. Reglages : window.DERNIERS_CONFIG (avant ce script).
// Tests sans chat : ?derniers=sub:Alice,bits:Bob:500,don:Dana:5,follow:Eli dans l'URL, ou en console
// Derniers.definir('bits', 'Bob', '500 bits'), Derniers.vider().
// =====================================================================================
(function () {
  var CONFIG = Object.assign({
    chaine: 'elwecelebrindal',
    dureeSession: 6,          // heures sans changement avant de repartir de zero (nouveau live)
    commandeFollow: '!follow', // "!follow Pseudo" (streamer ou modo seulement)
    // bots dont on lit les remerciements de follow (pseudos en minuscules)
    followBots: ['streamelements', 'streamlabs', 'nightbot', 'moobot', 'wizebot', 'fossabot', 'sery_bot', 'botrixoficial'],
    followMotifs: [
      /merci\s+(?:a\s+|à\s+)?@?(\w+)\s+pour\s+(?:le|ton|son)\s+follow/i,
      /@?(\w+)\s+(?:vient de (?:nous )?(?:suivre|follow)|just followed|is now following)/i,
      /thanks?\s+(?:you\s+)?@?(\w+)\s+for\s+(?:the\s+)?follow/i
    ]
  }, window.DERNIERS_CONFIG || {});
  var CLE = 'elwe-derniers';
  var CATEGORIES = ['sub', 'don', 'bits', 'follow'];

  var ecouteurs = { change: [], soutien: [] };
  var etat = vide();

  function vide() { var e = { session: {} }; CATEGORIES.forEach(function (c) { e[c] = null; }); return e; }
  function lire() {
    try {
      var e = JSON.parse(localStorage.getItem(CLE) || 'null');
      if (e && e.derniers && e.derniers.session && Date.now() - e.maj < CONFIG.dureeSession * 3600000) return Object.assign(vide(), e.derniers);
    } catch (err) { /* stockage indisponible : etat en memoire seulement */ }
    return vide();
  }
  function ecrire() {
    try { localStorage.setItem(CLE, JSON.stringify({ maj: Date.now(), derniers: etat })); } catch (err) { /* idem */ }
  }
  function emettre(type, a, b, c) {
    ecouteurs[type].forEach(function (f) { try { f(a, b, c); } catch (e) { console.error(e); } });
  }
  // Meme soutien : deux sources ouvertes recoivent le meme evenement du chat (meme heure Twitch)
  // et l'enregistrent chacune ; ca ne doit compter qu'une fois.
  function meme(a, b) {
    if (!a || !b) return a === b;
    return a.login === b.login && a.detail === b.detail && Math.abs(a.quand - b.quand) < 5000;
  }
  // Remplace l'etat et n'emet que ce qui a vraiment change.
  function appliquer(nouveau) {
    var avant = etat;
    etat = nouveau;
    Object.keys(nouveau.session).forEach(function (k) {
      var a = avant.session[k], n = nouveau.session[k];
      if (!a || !meme(a, n)) emettre('soutien', n, !a);
    });
    CATEGORIES.forEach(function (c) {
      if (!meme(avant[c], nouveau[c])) emettre('change', c, nouveau[c], avant[c]);
    });
  }

  var Derniers = window.Derniers = {
    config: CONFIG,
    categories: CATEGORIES,
    tous: function () { var t = {}; CATEGORIES.forEach(function (c) { t[c] = etat[c]; }); return t; },
    session: function () {
      return Object.keys(etat.session).map(function (k) { return etat.session[k]; }).sort(function (a, b) { return a.quand - b.quand; });
    },
    quand: function (type, f) { if (ecouteurs[type]) ecouteurs[type].push(f); },
    // quand : heure du soutien (ms, par defaut maintenant) ; ajout : quantite pour le total
    // (bits, subs offerts) ; rattrape : vient de l'historique du chat. Un soutien d'avant le
    // live (plus de dureeSession heures) ou deja compte est ignore.
    definir: function (cat, nom, detail, quand, ajout, rattrape) {
      if (CATEGORIES.indexOf(cat) < 0) return;
      quand = quand || Date.now();
      if (Date.now() - quand > CONFIG.dureeSession * 3600000) return;
      var n = lire(), login = String(nom).toLowerCase(), cle = cat + ':' + login, ancien = n.session[cle];
      var s = { cat: cat, login: login, nom: String(nom), quand: quand, detail: detail || '',
                total: (ancien ? ancien.total : 0) + (ajout || 1), rattrape: !!rattrape };
      if (ancien && (meme(ancien, s) || ancien.quand > quand)) return;   // deja compte
      n.session[cle] = s;
      if (!n[cat] || n[cat].quand <= quand) n[cat] = s;
      appliquer(n);
      ecrire();
    },
    vider: function () { appliquer(vide()); ecrire(); }
  };

  etat = lire();
  window.addEventListener('storage', function (e) { if (e.key === CLE) appliquer(lire()); });

  // ---- Chat ----
  var PLANS = { Prime: 'Prime', 1000: 'Tier 1', 2000: 'Tier 2', 3000: 'Tier 3' };
  function plan(t) { return PLANS[t['msg-param-sub-plan']] || 'Sub'; }
  function nomDonateur(ev) { return ev.login === 'ananonymousgifter' ? 'Anonyme' : ev.nom; }

  // Message / annonce du chat -> soutien { cat, nom, detail, quand, ajout }, ou rien.
  function soutienMessage(msg) {
    if (msg.bits > 0) return { cat: 'bits', nom: msg.nom, detail: msg.bits + ' bits', quand: msg.ts, ajout: msg.bits };
    var follow = function (nom) { return { cat: 'follow', nom: nom.replace(/^@/, ''), detail: '', quand: msg.ts }; };
    var mots = msg.texte.split(/\s+/);
    if (msg.mot === CONFIG.commandeFollow && (msg.streamer || msg.mod) && mots[1]) return follow(mots[1]);
    if (CONFIG.followBots.indexOf(msg.login) >= 0) {
      for (var i = 0; i < CONFIG.followMotifs.length; i++) {
        var m = CONFIG.followMotifs[i].exec(msg.texte);
        if (m) return follow(m[1]);
      }
    }
  }
  function soutienEvenement(ev) {
    var t = ev.tags, mois = parseInt(t['msg-param-cumulative-months'], 10) || 0;
    var s = function (cat, nom, detail, ajout) { return { cat: cat, nom: nom, detail: detail, quand: ev.ts, ajout: ajout || 1 }; };
    switch (ev.type) {
      case 'sub':
      case 'resub':
        return s('sub', ev.nom, plan(t) + (mois > 1 ? ' - ' + mois + ' mois' : ''));
      case 'giftpaidupgrade':
      case 'anongiftpaidupgrade':
      case 'primepaidupgrade':
        return s('sub', ev.nom, 'Sub prolonge');
      case 'submysterygift':
      case 'anonsubmysterygift':
        var n = parseInt(t['msg-param-mass-gift-count'], 10) || 1;
        return s('don', nomDonateur(ev), n + (n > 1 ? ' subs offerts' : ' sub offert'), n);
      case 'subgift':
      case 'anonsubgift':
        // un don groupe envoie aussi un subgift par destinataire : deja compte au-dessus
        if (t['msg-param-community-gift-id']) return;
        return s('don', nomDonateur(ev), '1 sub offert a ' + (t['msg-param-recipient-display-name'] || '?'));
    }
  }
  function enregistrer(s, rattrape) { if (s) Derniers.definir(s.cat, s.nom, s.detail, s.quand, s.ajout, rattrape); }

  if (typeof ecouterChatTwitch === 'function') {
    ecouterChatTwitch(CONFIG.chaine,
      function (msg) { enregistrer(soutienMessage(msg)); },
      function (ev) { enregistrer(soutienEvenement(ev)); });
    // Au chargement (donc aussi apres un !reload) : rattrape dans l'historique du chat les
    // soutiens passes pendant que la page etait fermee (dans l'ordre ; ceux deja comptes sont
    // ignores).
    var rattrapes = [];
    ecouterChatTwitch.historique(CONFIG.chaine,
      function (msg) { rattrapes.push(soutienMessage(msg)); },
      function (ev) { rattrapes.push(soutienEvenement(ev)); })
      .then(function () { rattrapes.forEach(function (s) { enregistrer(s, true); }); });
  }

  // Tests : ?derniers=sub:Alice,bits:Bob:500,don:Dana:5
  var test = /[?&]derniers=([^&#]*)/.exec(location.search);
  if (test) window.addEventListener('load', function () {
    decodeURIComponent(test[1]).split(',').filter(Boolean).forEach(function (s, i) {
      var p = s.split(':'), cat = p[0], n = parseInt(p[2], 10);
      var detail = cat === 'bits' ? (n || 100) + ' bits' : cat === 'don' ? (n || 1) + ' subs offerts' : cat === 'sub' ? 'Tier 1' : '';
      setTimeout(function () { Derniers.definir(cat, p[1], detail, 0, n || 1); }, 800 + i * 1500);
    });
  });
})();
