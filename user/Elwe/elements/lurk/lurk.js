// =====================================================================================
// LISTE DES LURKERS, commune a toutes les scenes du live (debut, live, fin).
// =====================================================================================
// Un spectateur tape !lurk : il entre dans la liste ; !here : il en sort ("il est revenu").
// La liste dure tout le live : elle est gardee dans le localStorage (partage entre les
// sources navigateur de Streamlabs/OBS, qui ouvrent les fichiers locaux avec la meme origine),
// donc changer de scene ou actualiser une source ne la vide pas. Chaque page ecoute aussi le
// chat elle-meme : si le stockage n'etait pas partage, toutes les pages ouvertes depuis le
// debut du live auraient quand meme la meme liste.
// Nouveau live : la liste est videe si personne ne l'a modifiee depuis 'dureeSession' heures.
//
// arg = ce qui suit la commande ("!lurk 3" -> '3'), libre a chaque effet de l'interpreter.
//
// Aucun effet visuel ici : un effet (ex. ../gemmes/gemmes.js) s'abonne aux evenements avec
//   Lurk.quand('entree', function (p) { ... })   p = { login, nom, depuis (ms), arg }
//   Lurk.quand('retour', function (p) { ... })   p = idem + duree (ms passees en lurk)
//   Lurk.quand('modif', function (p) { ... })    p = lurker deja dans la liste qui a refait
//                                                    !lurk avec un autre argument
//   Lurk.quand('change', function (liste) { ... })
// et lit la liste avec Lurk.liste(). Les evenements ne partent qu'une fois par page, meme si
// le changement arrive a la fois par le chat et par une autre page (stockage).
//
// Charger apres ../twitch-chat.js. Reglages : window.LURK_CONFIG (avant ce script), sinon
// valeurs ci-dessous.
// Tests sans chat : ?lurk=Pseudo1,Pseudo2 dans l'URL, ou en console Lurk.entrer('Pseudo', 'arg'),
// Lurk.revenir('Pseudo'), Lurk.vider(). ?lurk-debug affiche la liste dans un coin.
// =====================================================================================
(function () {
  var CONFIG = Object.assign({
    chaine: 'elwecelebrindal',        // chaine Twitch ecoutee ('' = pas de chat, tests seulement)
    commandesEntree: ['!lurk'],
    commandesRetour: ['!here'],
    retourSiMessage: false,           // true : tout autre message d'un lurker le fait revenir
    dureeSession: 6                   // heures sans changement avant de repartir d'une liste vide
  }, window.LURK_CONFIG || {});
  var CLE = 'elwe-lurk';

  var ecouteurs = { entree: [], retour: [], modif: [], change: [] };
  var liste = {};                     // login -> { login, nom, depuis }

  function emettre(type, donnee) {
    ecouteurs[type].forEach(function (f) { try { f(donnee); } catch (e) { console.error(e); } });
  }
  function lire() {
    try {
      var etat = JSON.parse(localStorage.getItem(CLE) || 'null');
      if (etat && Date.now() - etat.maj < CONFIG.dureeSession * 3600000) return etat.pseudos || {};
    } catch (e) { /* stockage indisponible : liste en memoire seulement */ }
    return {};
  }
  function ecrire() {
    try { localStorage.setItem(CLE, JSON.stringify({ maj: Date.now(), pseudos: liste })); } catch (e) { /* idem */ }
  }
  // Remplace la liste par 'nouvelle' et n'emet que les differences reelles.
  function appliquer(nouvelle) {
    var avant = liste, change = false;
    liste = nouvelle;
    Object.keys(nouvelle).forEach(function (k) {
      if (!avant[k]) { change = true; emettre('entree', nouvelle[k]); }
      else if (avant[k].arg !== nouvelle[k].arg) { change = true; emettre('modif', nouvelle[k]); }
    });
    Object.keys(avant).forEach(function (k) {
      if (!nouvelle[k]) { change = true; emettre('retour', Object.assign({ duree: Date.now() - avant[k].depuis }, avant[k])); }
    });
    if (change) emettre('change', Lurk.liste());
  }
  function modifier(f) {
    var copie = Object.assign({}, lire());
    f(copie);
    appliquer(copie);
    ecrire();
  }

  var Lurk = window.Lurk = {
    config: CONFIG,
    liste: function () {
      return Object.keys(liste).map(function (k) { return liste[k]; }).sort(function (a, b) { return a.depuis - b.depuis; });
    },
    contient: function (pseudo) { return !!liste[String(pseudo).toLowerCase()]; },
    quand: function (type, f) { ecouteurs[type].push(f); },
    // arg : ce qui suit la commande ; refaire !lurk en etant deja dans la liste ne change que arg
    entrer: function (nom, arg) {
      var login = String(nom).toLowerCase();
      arg = String(arg || '').slice(0, 40);
      modifier(function (l) {
        if (!l[login]) l[login] = { login: login, nom: String(nom), depuis: Date.now(), arg: arg };
        else if (arg) l[login] = Object.assign({}, l[login], { arg: arg });
      });
    },
    revenir: function (nom) {
      var login = String(nom).toLowerCase();
      modifier(function (l) { delete l[login]; });
    },
    vider: function () { modifier(function (l) { Object.keys(l).forEach(function (k) { delete l[k]; }); }); }
  };

  // Etat deja enregistre (live en cours) : charge sans evenement d'entree.
  liste = lire();
  // Changement fait par une autre page (autre scene / source).
  window.addEventListener('storage', function (e) { if (e.key === CLE) appliquer(lire()); });

  if (typeof ecouterChatTwitch === 'function') ecouterChatTwitch(CONFIG.chaine, function (msg) {
    if (CONFIG.commandesEntree.indexOf(msg.mot) >= 0) Lurk.entrer(msg.nom, msg.texte.split(/\s+/).slice(1).join(' '));
    else if (CONFIG.commandesRetour.indexOf(msg.mot) >= 0) Lurk.revenir(msg.nom);
    else if (CONFIG.retourSiMessage && Lurk.contient(msg.login)) Lurk.revenir(msg.nom);
  });

  // Tests : ?lurk=Pseudo1,Pseudo2 / ?lurk-debug
  // (ajoutes apres le chargement, un par un, pour que les effets voient leurs arrivees)
  var test = /[?&]lurk=([^&#]*)/.exec(location.search);
  if (test) window.addEventListener('load', function () {
    decodeURIComponent(test[1]).split(',').filter(Boolean).forEach(function (nom, i) {
      var morceaux = nom.split(':');   // Pseudo:arg, comme "!lurk arg"
      setTimeout(function () { Lurk.entrer(morceaux[0], morceaux[1]); }, 500 + i * 700);
    });
  });
  if (/[?&]lurk-debug\b/.test(location.search)) {
    var boite = document.createElement('pre');
    boite.style.cssText = 'position:fixed;left:8px;bottom:8px;margin:0;padding:6px 10px;z-index:99;' +
      'background:rgba(0,0,0,.7);color:#efe2bf;font:14px monospace;pointer-events:none';
    var maj = function () {
      boite.textContent = 'Lurk (' + Lurk.liste().length + ')\n' + Lurk.liste().map(function (p) {
        return p.nom + '  ' + Math.round((Date.now() - p.depuis) / 60000) + ' min';
      }).join('\n');
    };
    Lurk.quand('change', maj);
    Lurk.quand('entree', function (p) { console.log('[lurk] entree', p.nom); });
    Lurk.quand('retour', function (p) { console.log('[lurk] retour', p.nom, Math.round(p.duree / 1000) + ' s'); });
    var poser = function () { document.body.appendChild(boite); maj(); };
    if (document.body) poser(); else document.addEventListener('DOMContentLoaded', poser);
    setInterval(maj, 30000);
  }
})();
