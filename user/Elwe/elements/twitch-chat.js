// =====================================================================================
// CHAT TWITCH EN LECTURE SEULE, commun aux scenes d'Elwe (connexion anonyme "justinfan",
// sans token : on ne peut que lire, rien a renouveler ni a reconnecter a la main).
// =====================================================================================
// ecouterChatTwitch('chaine', surMessage, surEvenement)
//   surMessage(msg) a chaque message ; msg = {
//     login   : pseudo en minuscules (identifiant stable)
//     nom     : pseudo affiche (majuscules d'origine)
//     texte   : message complet
//     mot     : premier mot en minuscules (la commande, ex. '!lurk')
//     tags    : tags IRC bruts (badges, color, mod, vip, bits...)
//     streamer, mod, vip, sub : statut de la personne
//     bits    : nombre de bits envoyes avec ce message (0 sinon)
//   }
//   surEvenement(ev) (optionnel) pour les annonces de la chaine (USERNOTICE) ; ev = {
//     type    : 'sub' | 'resub' | 'subgift' | 'submysterygift' | 'giftpaidupgrade' | ... (msg-id)
//     login, nom : la personne (pour un don : celui qui offre ; anonyme : 'ananonymousgifter')
//     texte   : message joint (resub), tags : tags IRC bruts
//   }
// ecouterChatTwitch.historique('chaine', surMessage, surEvenement) : rejoue le chat recent
// (voir plus bas). Messages et evenements ont aussi ts = heure d'envoi (ms).
// Plusieurs scripts de la meme page partagent une seule connexion par chaine.
// Reconnexion automatique (attente croissante) en cas de coupure.
// Les follows ne passent PAS par le chat : Twitch ne les donne qu'avec un token.
// =====================================================================================
var ecouterChatTwitch = (function () {
  var connexions = {};   // chaine -> { messages: [], evenements: [] }

  function lireTags(brut) {
    var tags = {};
    (brut || '').split(';').forEach(function (t) {
      var i = t.indexOf('=');
      // valeurs echappees IRCv3 (\s = espace...)
      tags[t.slice(0, i)] = t.slice(i + 1).replace(/\\s/g, ' ').replace(/\\:/g, ';').replace(/\\\\/g, '\\');
    });
    return tags;
  }
  function appeler(liste, donnee) {
    liste.forEach(function (f) { try { f(donnee); } catch (e) { console.error(e); } });
  }

  // Ligne IRC brute -> message (PRIVMSG) ou evenement (USERNOTICE) passe aux ecouteurs de c.
  // ts : heure d'envoi donnee par Twitch (tmi-sent-ts), la meme pour toutes les sources.
  function traiter(CHAINE, c, ligne) {
    var m = /^(?:@(\S+) )?:(\w+)!\S+ PRIVMSG #\S+ :(.*)$/.exec(ligne);
    if (m) {
      var tags = lireTags(m[1]), badges = tags.badges || '', texte = m[3].trim();
      appeler(c.messages, {
        login: m[2], nom: tags['display-name'] || m[2], texte: texte,
        mot: texte.split(/\s+/)[0].toLowerCase(), tags: tags,
        streamer: m[2] === CHAINE || /(^|,)broadcaster\//.test(badges),
        mod: tags.mod === '1' || /(^|,)moderator\//.test(badges),
        vip: tags.vip === '1' || /(^|,)vip\//.test(badges),
        sub: tags.subscriber === '1' || /(^|,)(subscriber|founder)\//.test(badges),
        bits: parseInt(tags.bits, 10) || 0,
        ts: parseInt(tags['tmi-sent-ts'], 10) || Date.now()
      });
      return;
    }
    var u = /^@(\S+) :\S+ USERNOTICE #\S+(?: :(.*))?$/.exec(ligne);
    if (u) {
      var t = lireTags(u[1]);
      appeler(c.evenements, { type: t['msg-id'], login: t.login, nom: t['display-name'] || t.login, texte: (u[2] || '').trim(), tags: t,
                              ts: parseInt(t['tmi-sent-ts'], 10) || Date.now() });
    }
  }

  function connecter(CHAINE, c) {
    var attente = 1000;
    (function ouvrir() {
      var ws = new WebSocket('wss://irc-ws.chat.twitch.tv:443');
      ws.onopen = function () {
        attente = 1000;
        ws.send('CAP REQ :twitch.tv/tags twitch.tv/commands');
        ws.send('PASS SCHMOOPIIE');
        ws.send('NICK justinfan' + Math.floor(10000 + Math.random() * 90000));
        ws.send('JOIN #' + CHAINE);
      };
      ws.onmessage = function (ev) {
        String(ev.data).split('\r\n').forEach(function (ligne) {
          if (ligne.indexOf('PING') === 0) { ws.send('PONG' + ligne.slice(4)); return; }
          traiter(CHAINE, c, ligne);
        });
      };
      ws.onclose = function () { setTimeout(ouvrir, attente); attente = Math.min(attente * 2, 60000); };
    })();
  }

  function ecouter(chaine, surMessage, surEvenement) {
    var CHAINE = String(chaine || '').replace(/^#/, '').toLowerCase();
    if (!CHAINE || !window.WebSocket) return;
    var c = connexions[CHAINE];
    if (!c) { c = connexions[CHAINE] = { messages: [], evenements: [] }; connecter(CHAINE, c); }
    if (surMessage) c.messages.push(surMessage);
    if (surEvenement) c.evenements.push(surEvenement);
  }

  // Historique recent du chat (messages et annonces passes avant l'ouverture de la page), via
  // le service public recent-messages.robotty.de : simple lecture, sans compte ni token. Les
  // lignes sont passees aux rappels dans l'ordre, avec les memes champs qu'en direct (ts =
  // heure d'origine). Le service ne garde une chaine qu'apres une premiere demande : au tout
  // premier appel l'historique est vide. Renvoie une promesse, resolue meme en cas d'echec.
  ecouter.historique = function (chaine, surMessage, surEvenement) {
    var CHAINE = String(chaine || '').replace(/^#/, '').toLowerCase();
    if (!CHAINE || !window.fetch) return Promise.resolve();
    var c = { messages: surMessage ? [surMessage] : [], evenements: surEvenement ? [surEvenement] : [] };
    return fetch('https://recent-messages.robotty.de/api/v2/recent-messages/' + CHAINE)
      .then(function (r) { return r.json(); })
      .then(function (j) { (j.messages || []).forEach(function (ligne) { traiter(CHAINE, c, ligne); }); })
      .catch(function (e) { console.warn('[chat] historique indisponible', e); });
  };

  return ecouter;
})();
