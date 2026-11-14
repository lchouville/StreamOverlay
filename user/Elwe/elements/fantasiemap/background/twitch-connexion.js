// =====================================================================================
// CONNEXION TWITCH de la Carte du Maraudeur (a lancer avec node, une fois par mois environ)
// =====================================================================================
//   node twitch-connexion.js            (reprend l'ID client deja dans twitch-secrets.js)
//   node twitch-connexion.js <ID client>
//   node twitch-connexion.js obs        (pour OBS sur GitHub Pages : ecrit dans twitch-obs.txt
//                                        la fin d'URL #twitch=... a coller dans la source OBS)
// Affiche un code a valider sur twitch.tv/activate (connecte avec le compte de la chaine),
// puis ecrit le token et son jeton de renouvellement dans twitch-secrets.js, ou en mode obs
// dans twitch-obs.txt (tous deux ignores par git).
// Aucune URL de redirection a declarer : flux "code d'appareil" de Twitch (application de
// type Public sur dev.twitch.tv). Le fond renouvelle ensuite le token tout seul.
// =====================================================================================

const fs = require('fs');
const path = require('path');
const FICHIER = path.join(__dirname, 'twitch-secrets.js');
const MODELE = path.join(__dirname, 'twitch-secrets.exemple.js');
const FICHIER_OBS = path.join(__dirname, 'twitch-obs.txt');
const DROITS = 'moderation:read channel:read:vips';

function lireSecrets() {
  if (!fs.existsSync(FICHIER)) return {};
  const window = {};
  new Function('window', fs.readFileSync(FICHIER, 'utf8'))(window);
  return window.TWITCH_SECRETS || {};
}
function ecrireSecrets(valeurs) {
  let texte = fs.readFileSync(fs.existsSync(FICHIER) ? FICHIER : MODELE, 'utf8');
  for (const [cle, valeur] of Object.entries(valeurs)) {
    const ligne = new RegExp(cle + ":\\s*'[^']*'");
    if (ligne.test(texte)) texte = texte.replace(ligne, cle + ": '" + valeur + "'");
    else texte = texte.replace(/window\.TWITCH_SECRETS = \{/, "window.TWITCH_SECRETS = {\n  " + cle + ": '" + valeur + "',");
  }
  fs.writeFileSync(FICHIER, texte);
}

(async function () {
  // mode obs : connexion a part (son jeton de renouvellement ne sert qu'a la source OBS)
  const modeObs = process.argv.includes('obs');
  const clientId = process.argv.slice(2).find(a => a !== 'obs') || lireSecrets().clientId;
  if (!clientId) { console.log("Donne l'ID client : node twitch-connexion.js <ID client>"); process.exit(1); }

  const demande = await fetch('https://id.twitch.tv/oauth2/device', { method: 'POST', body: new URLSearchParams({ client_id: clientId, scopes: DROITS }) });
  const code = await demande.json();
  if (!demande.ok) { console.log('Twitch refuse la demande :', code.message || demande.status, "(l'application doit etre de type Public)"); process.exit(1); }
  console.log('\n  Ouvre ' + code.verification_uri + '\n  et valide le code ' + code.user_code + ' (expire dans ' + Math.round(code.expires_in / 60) + ' min).\n');

  const fin = Date.now() + code.expires_in * 1000;
  while (Date.now() < fin) {
    await new Promise(r => setTimeout(r, (code.interval || 5) * 1000));
    const rep = await fetch('https://id.twitch.tv/oauth2/token', {
      method: 'POST',
      body: new URLSearchParams({ client_id: clientId, scopes: DROITS, device_code: code.device_code, grant_type: 'urn:ietf:params:oauth:grant-type:device_code' })
    });
    const jeton = await rep.json();
    if (rep.ok && jeton.access_token) {
      if (modeObs) {
        fs.writeFileSync(FICHIER_OBS, '#twitch=' + encodeURIComponent(clientId) + ':' + encodeURIComponent(jeton.refresh_token) + '\n\n'
          + "A coller a la fin de l'URL de la source navigateur d'OBS (apres .html ou .svg).\n"
          + 'Ne pas montrer en live : donne acces en lecture aux modos / VIP de la chaine.\n');
      } else ecrireSecrets({ clientId: clientId, token: jeton.access_token, refreshToken: jeton.refresh_token });
      const v = await (await fetch('https://id.twitch.tv/oauth2/validate', { headers: { Authorization: 'OAuth ' + jeton.access_token } })).json();
      console.log('C\'est bon : connecte en tant que ' + v.login + ' (' + (v.scopes || []).join(', ') + ').');
      console.log(modeObs ? "Ouvre twitch-obs.txt et colle sa premiere ligne a la fin de l'URL de la source OBS." : 'twitch-secrets.js est a jour ; actualise la source dans OBS.');
      return;
    }
    if (jeton.message !== 'authorization_pending') { console.log('Arret :', jeton.message || rep.status); process.exit(1); }
  }
  console.log('Code expire : relance la commande.');
  process.exit(1);
})();
