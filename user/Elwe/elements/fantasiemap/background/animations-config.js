// =====================================================================================
// REGLAGES DES ANIMATIONS du fond "ville medievale" (calques calque-*.svg, et l'archive
// tout-en-un ville-medievale-croquis.svg)
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
    dureeCycle: 5,        // (mode 'accelere') duree d'une journee complete de 24h, en minutes
    heureDepart: 8,       // (mode 'accelere') heure au chargement (ex. 7 = 7h00, 21.5 = 21h30) ;
                          // calques separes (calque-*.svg) : heure a chaque debut de cycle depuis
                          // minuit (horloge calee sur l'ordi pour garder les calques synchronises)
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
    etoilesFilantes: [25, 90], // attente entre deux etoiles filantes (seulement en pleine nuit)

    // Nuages speciaux : de temps en temps, en plus des nuages normaux, une silhouette piochee
    // au hasard dans layers/02-nature/clouds/ traverse le ciel (clin d'oeil jeux/identite :
    // char Warthunder, creeper Minecraft, etc.), jamais deux fois la meme a la suite. Pour en
    // ajouter un : deposer un SVG (fond transparent, dessine sur un canevas ~300x200) dans ce
    // dossier, puis ajouter son nom de fichier dans la liste ci-dessous.
    nuagesSpeciaux: {
      attente: [60, 120], // attente entre deux nuages speciaux (le premier aussi)
      maxVisibles: 2,     // nombre max de nuages speciaux a l'ecran en meme temps
      fichiers: [
        'tank.svg',               // char d'assaut (War Thunder)
        'creeper.svg'             // tete de creeper (Minecraft)
      ]
    }
  },

  // ---------------------------------------------------------------- VILLE VUE DU DESSUS
  // Plan de la ville (vu de dessus) autour de l'ovale principal, facon plan de ville ancien /
  // Carte du Maraudeur : quartiers en anneaux autour de la vignette, coupes par des rues
  // rayonnantes ; batiments serres le long des rues, cours interieures, places ; muraille a
  // tours ; hors les murs, riviere, champs et grandes routes. Les rues sont assez larges
  // pour les pseudos de la Carte du Maraudeur. Meme seed = meme plan a chaque chargement
  // (changer la seed pour tirer un autre plan ; pour essayer sans toucher ce fichier, ajouter
  // ?seed=1234 a l URL du SVG, et ?forme=grille pour forcer une forme). Toutes les tailles
  // sont en px (canevas 3840x2160).
  villeDessus: {
    seed: 13122000,
    // Forme de la ville : 'hasard' (tiree par la seed) ou l'une de : 'ovale' (anneaux autour
    // de la vignette), 'citadelle' (petite ville fortifiee polygonale autour d'un donjon, dans
    // la campagne), 'grille' (rues presque droites), 'contre-courbe' (anneaux courbes a l'envers).
    forme: 'hasard',
    largeurRue: 64,               // largeur des rues
    largeurAvenue: 80,            // largeur des grandes rues et des routes
    profondeurPate: [220, 270],   // distance entre deux rues en anneau (plus grand = plan moins zoome)
    largeurPate: [300, 460],      // distance entre deux rues rayonnantes
    grandesRues: 5,               // grandes rues qui traversent la ville et sortent par une porte
    aireBatiment: [3500, 9000],   // taille des batiments (aire en px^2 en dessous de laquelle on ne recoupe plus)
    probaPlace: 0.07,             // chance qu'un pate de maisons soit une place
    muraille: [0.35, 0.7],        // position de la muraille entre le coeur de la ville (0) et le bord de la carte (1) ;
                                  // parfois (15 %) pas de muraille visible : la ville couvre toute la carte
    quartiers: ['La Halle', 'Les Tanneurs', 'Le Temple', 'La Butte', 'Les Forges'],
    rues: ['Grand-Rue', 'Rue des Forges', 'Voie du Pont', 'Rue du Septentrion', 'Chemin du Moulin'],
    riviere: 'La Vive'
  },

  // ---------------------------------------------------------------- CARTE DU MARAUDEUR
  // Les spectateurs qui tapent la commande dans le chat Twitch apparaissent sur le plan vu du
  // dessus : traces de pas a l'encre qui se promenent dans les rues, avec leur pseudo.
  // Test sans chat : ajouter ?carte=Pseudo1,Pseudo2 a l'URL du SVG.
  maraudeur: {
    chaine: 'elwecelebrindal',       // nom de la chaine Twitch a ecouter ('' = desactive)
    commandes: ['!carte', '/carte'], // mots qui declenchent l'apparition (debut du message)
    duree: 40,                       // temps de promenade (une nouvelle commande prolonge) ; ensuite
                                     // la personne rentre dans une maison ou sort de la carte
    vitesse: 55,                     // vitesse de marche (px/s, sur le canevas 3840x2160)
    maxPersonnes: 12,                // nombre max de personnes sur la carte en meme temps
    arret: [1.5, 4],                 // duree d'un arret pendant la promenade
    entreArrets: [6, 16],            // temps de marche entre deux arrets

    // Le streamer se promene en continu sur la carte (bordure rubis, hors classement) ;
    // un spectateur qui le croise gagne un petit bouclier sous son pseudo. ('' = absent)
    streamer: 'Elwe',
    // Score (pendant la session) : +1 par personne differente croisee ; +2 la premiere fois
    // qu'on croise le streamer (et un bouclier). Croiser un porteur de bouclier rapporte +0 et
    // lui fait perdre son bouclier ; recroiser le streamer rend le bouclier. Contour de la
    // banderole selon le score : standard (encre), puis bronze / argent / or / diamant a
    // partir de ces seuils. Le meilleur score present sur la carte porte une couronne.
    rangs: { bronze: 3, argent: 6, or: 10, diamant: 15 },

    // Statuts Twitch (lus dans le chat de ceux qui tapent la commande) : insigne a cote du
    // pseudo (epee = modo, diamant = VIP, sceau = sub, + mois d'abonnement) et teinte de la
    // banderole. Les modos restent sur la carte en permanence et ne jouent pas ; les croiser
    // sans bouclier fait perdre des points (avec un bouclier : +0, et le bouclier s'use).
    malusModo: 1,          // points perdus en croisant un modo sans bouclier
    bonusSub: 1,           // points en plus pour un sub a chaque croisement qui lui rapporte
    dureeVip: 3,           // les VIP restent 3x plus longtemps sur la carte
    dureeSub: 2            // les subs 2x plus longtemps (VIP + sub : le plus long des deux)
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

  // ---------------------------------------------------------------- SOURIS (place)
  // Une souris traverse le bas de la place au trot de temps en temps en passant derriere le
  // puits, avec un arret pour renifler a cote du puits (et parfois un autre avant).
  // Test : ajouter ?souris a l'URL du SVG pour la faire passer tout de suite.
  souris: {
    premiere: [5, 20],     // delai avant la premiere traversee
    pause: [40, 120],      // attente entre deux traversees
    arret: [1.5, 4],       // duree d'un arret pour renifler
    vitesse: 45,           // vitesse de trot (px/s, sur le canevas 3840x2160)
    taille: 0.17           // echelle du dessin de layers/02-animals/mouse.svg
  },

  // ---------------------------------------------------------------- LUMIERES DES FENETRES
  lumieres: {
    eteintes: 0.35,        // part des fenetres qui restent eteintes (0 = toutes vivantes)
    duree: 1               // multiplie la duree des cycles allume/eteint
                           // (2 = deux fois plus lent, 0.5 = deux fois plus rapide)
  }
};
