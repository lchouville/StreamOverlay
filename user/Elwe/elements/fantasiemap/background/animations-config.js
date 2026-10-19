// =====================================================================================
// REGLAGES DES ANIMATIONS du fond "ville medievale" (ville-medievale-croquis.svg)
// =====================================================================================
// - Toutes les durees sont en SECONDES.
// - [min, max] : une valeur est tiree au hasard entre les deux a chaque fois.
//   On peut aussi mettre un seul nombre pour une valeur fixe (ex. pause: 30).
// - Apres modification : recharger la source dans OBS
//   (clic droit sur la source navigateur > "Actualiser le cache de la page actuelle").
// - Si ce fichier est absent ou qu'une valeur manque, la valeur par defaut est utilisee.
// =====================================================================================

window.ANIM_CONFIG = {

  // ---------------------------------------------------------------- PORTES
  portes: {
    // premiere : delai avant la toute premiere ouverture apres le chargement
    // pause    : attente entre la fin d'une ouverture et la suivante
    tour:    { premiere: [4, 15],  pause: [15, 45] },   // tour de l'horloge (double porte)
    guilde:  { premiere: [6, 20],  pause: [15, 40] },   // guilde des aventuriers (double porte)
    auberge: { premiere: [8, 25],  pause: [18, 50] },   // boulangerie (porte simple)

    // Vitesse d'une ouverture (commun a toutes les portes)
    ouverture: [2.2, 4],     // temps pour s'ouvrir
    ouverte:   [1.2, 4.5],   // temps pendant lequel la porte reste ouverte
    fermeture: [2.2, 4.5]    // temps pour se refermer
  },

  // ---------------------------------------------------------------- CLOCHE (chapelle)
  cloche: {
    premiere:    [20, 60],    // delai avant la premiere volee
    intervalle:  [35, 85],  // attente entre deux volees (~2 min)
    duree:       12,     // duree d'une volee
    balancement: 1.5,         // duree d'un aller-retour de la cloche
    amplitude:   10           // angle max en degres (au-dela de ~12 la cloche touche la baie)
  },

  // ---------------------------------------------------------------- FUMEES
  fumee: {
    actives: { forge: true, boulangerie: true, cabane: true },  // false = pas de fumee
    changement: [4, 14],   // toutes les combien de secondes l'intensite change
    probaForte: 0.2,       // chance (0 a 1) de passer en grosses bouffees
    probaCalme: 0.3,       // chance (0 a 1) de passer presque eteint (le reste = normal)
    densite: 1             // multiplicateur du nombre de bouffees (2 = deux fois plus)
  },

  // ---------------------------------------------------------------- BLE / HERBE (vent)
  ble: {
    balancement: 3.4,      // duree d'une oscillation douce
    rafale: 11,            // duree du cycle des rafales (plus grand = rafales plus rares)
    forceBalancement: 5,   // inclinaison max du balancement, en degres (0 = immobile)
    forceRafale: 8         // inclinaison supplementaire pendant une rafale, en degres
  },

  // ---------------------------------------------------------------- MOULIN
  moulin: {
    tour: 16               // duree d'un tour complet des ailes (plus grand = plus lent)
  },

  // ---------------------------------------------------------------- CHAT (boulangerie)
  chat: {
    queue: 3.7,            // balancement de la queue
    respiration: 2.9,
    tete: 11,              // cycle ou il penche la tete
    oreille: 7.3           // cycle ou l'oreille fremit
  },

  // ---------------------------------------------------------------- LUMIERES DES FENETRES
  lumieres: {
    duree: 1               // multiplie la duree des cycles allume/eteint
                           // (2 = deux fois plus lent, 0.5 = deux fois plus rapide)
  }
};
