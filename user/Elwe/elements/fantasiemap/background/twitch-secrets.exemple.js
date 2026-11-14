// =====================================================================================
// SECRETS TWITCH (modele) - rempli automatiquement par : node twitch-connexion.js <ID client>
// =====================================================================================
// Le fichier rempli s'appelle twitch-secrets.js (meme dossier) et est ignore par git
// (.gitignore) : ces jetons donnent acces a la liste des modos / VIP de la chaine, ils ne
// doivent jamais etre publies. Sans ce fichier, la carte fonctionne quand meme (statuts lus
// seulement dans le chat).
// =====================================================================================

window.TWITCH_SECRETS = {
  clientId: '',       // ID client de l'application creee sur dev.twitch.tv (type Public)
  token: '',          // token d'acces (valable 4 h, renouvele tout seul par le fond)
  refreshToken: ''    // jeton de renouvellement
};
