// =====================================================================================
// CHAT TWITCH EN LECTURE SEULE, commun aux scenes d'Elwe (connexion anonyme "justinfan",
// sans token : on ne peut que lire). Meme connexion que la Carte du Maraudeur.
// =====================================================================================
// ecouterChatTwitch('chaine', function (msg) { ... }) ; msg = {
//   login   : pseudo en minuscules (identifiant stable)
//   nom     : pseudo affiche (majuscules d'origine)
//   texte   : message complet
//   mot     : premier mot en minuscules (la commande, ex. '!lurk')
//   tags    : tags IRC bruts (badges, color, mod, vip...)
//   streamer, mod, vip, sub : statut de la personne
// }
// Reconnexion automatique (attente croissante) en cas de coupure.
// =====================================================================================
function ecouterChatTwitch(chaine, rappel) {
  var CHAINE = String(chaine || '').replace(/^#/, '').toLowerCase();
  if (!CHAINE || !window.WebSocket) return;
  var attente = 1000;
  function connecter() {
    var ws = new WebSocket('wss://irc-ws.chat.twitch.tv:443');
    ws.onopen = function () {
      attente = 1000;
      ws.send('CAP REQ :twitch.tv/tags');
      ws.send('PASS SCHMOOPIIE');
      ws.send('NICK justinfan' + Math.floor(10000 + Math.random() * 90000));
      ws.send('JOIN #' + CHAINE);
    };
    ws.onmessage = function (ev) {
      String(ev.data).split('\r\n').forEach(function (ligne) {
        if (ligne.indexOf('PING') === 0) { ws.send('PONG' + ligne.slice(4)); return; }
        var m = /^(?:@(\S+) )?:(\w+)!\S+ PRIVMSG #\S+ :(.*)$/.exec(ligne);
        if (!m) return;
        var tags = {};
        (m[1] || '').split(';').forEach(function (t) { var i = t.indexOf('='); tags[t.slice(0, i)] = t.slice(i + 1); });
        var badges = tags.badges || '', texte = m[3].trim();
        rappel({
          login: m[2], nom: tags['display-name'] || m[2], texte: texte,
          mot: texte.split(/\s+/)[0].toLowerCase(), tags: tags,
          streamer: m[2] === CHAINE || /(^|,)broadcaster\//.test(badges),
          mod: tags.mod === '1' || /(^|,)moderator\//.test(badges),
          vip: tags.vip === '1' || /(^|,)vip\//.test(badges),
          sub: tags.subscriber === '1' || /(^|,)(subscriber|founder)\//.test(badges)
        });
      });
    };
    ws.onclose = function () { setTimeout(connecter, attente); attente = Math.min(attente * 2, 60000); };
  }
  connecter();
}
