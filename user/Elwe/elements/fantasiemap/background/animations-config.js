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
    actives: { forge: true, boulangerie: true, cabane: true, paysan: true, hobbit: true },  // false = pas de fumee
    changement: [4, 14],   // toutes les combien de secondes l'intensite change
    probaForte: 0.2,       // chance (0 a 1) de passer en grosses bouffees
    probaCalme: 0.3,       // chance (0 a 1) de passer presque eteint (le reste = normal)
    densite: 1,            // multiplicateur du nombre de bouffees (2 = deux fois plus)
    vent: 1                // force avec laquelle le vent couche la fumee (0 = fumee droite)
  },

  // ---------------------------------------------------------------- VENT (commun)
  // Le ble, l'herbe, les arbres, les fumees, les fanions et les auvents suivent le meme vent :
  // memes rafales (cycle 'ble.rafale'), meme sens, meme vague qui traverse de gauche a droite.
  vent: {
    puissance: 1,          // force du vent pour les fanions et les auvents (0.5 = brise, 1.5 = fort)
    tentes: 0.4            // amplitude du mouvement des toiles de tente (1 = autant que les fanions)
  },

  // ---------------------------------------------------------------- BLE / HERBE (vent)
  ble: {
    balancement: 3.4,      // duree d'une oscillation douce
    rafale: 11,            // duree du cycle des rafales (plus grand = rafales plus rares)
    forceBalancement: 5,   // inclinaison max du balancement, en degres (0 = immobile)
    forceRafale: 8,        // inclinaison supplementaire pendant une rafale, en degres
    forceArbres: 0.35      // les arbres ploient a cette fraction du ble (0 = immobiles)
  },

  // ---------------------------------------------------------------- PUITS
  puits: {
    premiere:   [10, 30],  // delai avant le premier puisage
    intervalle: [40, 90],  // attente entre deux puisages
    descente:   3,         // duree de la descente du seau
    remontee:   4.5,       // duree de la remontee (plus lente : seau plein)
    vidage:     7          // le seau remonte plein puis se vide par en dessous en tant de secondes
  },

  // ---------------------------------------------------------------- JOUR / NUIT (+ HORLOGE)
  // mode et dureeCycle pilotent aussi bien le cycle jour/nuit que les aiguilles de la
  // tour de l'horloge (les deux restent toujours synchronises sur la meme heure).
  jourNuit: {
    mode: 'accelere',          // 'reel' = suit l'heure de l'ordinateur ; 'accelere' = cycle rapide
    dureeCycle: 10,        // (mode 'accelere') duree d'une journee complete de 24h, en minutes
    lever: null,           // heure du lever du soleil ; null = calculee automatiquement selon le
                           // mois en cours (heure reelle du lever en France) ; mettre un nombre
                           // (ex. 7) pour la forcer
    coucher: null,         // heure du coucher du soleil ; null = automatique selon le mois (France) ;
                           // mettre un nombre (ex. 20) pour la forcer
    obscurite: 0.6,        // force de l'assombrissement la nuit (0 = aucun, 1 = tres sombre)
    lumiereAmbiante: 1     // force de la lueur du soleil / de la lune sur la scene (0 = aucune)
  },

  // ---------------------------------------------------------------- CIEL
  ciel: {
    traverseeNuages: 240,  // duree moyenne pour qu'un nuage traverse le ciel (plus grand = plus lent)
    nuages: [15, 70],      // attente entre l'apparition de deux nuages
    premierVol: [3, 10],   // delai avant le premier vol d'oiseaux
    oiseaux: [20, 60],     // attente entre deux vols d'oiseaux

    // Nuages speciaux : de temps en temps, au lieu d'un nuage normal, une silhouette piochee
    // au hasard dans layers/02-nature/clouds/ apparait (clin d'oeil jeux/identite : char
    // Warthunder, creeper Minecraft, etc.). Pour en ajouter un : deposer un SVG (fond
    // transparent, dessine sur un canevas ~300x200) dans ce dossier, puis ajouter son nom
    // de fichier dans la liste ci-dessous.
    nuagesSpeciaux: {
      probabilite: 0.15,  // chance (0 a 1) qu'un nuage soit une forme speciale plutot qu'un nuage normal
      fichiers: [
        // 'char-warthunder.svg',
        // 'creeper-minecraft.svg'
      ]
    }
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
    eteintes: 0.35,        // part des fenetres qui restent eteintes (0 = toutes vivantes)
    duree: 1               // multiplie la duree des cycles allume/eteint
                           // (2 = deux fois plus lent, 0.5 = deux fois plus rapide)
  }
};
