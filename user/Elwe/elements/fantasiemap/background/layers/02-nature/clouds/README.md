# Nuages speciaux

Silhouettes qui remplacent de temps en temps un nuage normal (clin d'oeil jeux / identite :
char Warthunder, creeper Minecraft, etc.).

Pour en ajouter un :
1. Deposer un fichier `.svg` ici, fond transparent, dessine sur un canevas d'environ
   `300x200` (ratio largeur/hauteur ~1.5 : le script l'affiche a une largeur aleatoire et
   deduit la hauteur avec ce ratio).
2. Ajouter son nom de fichier dans `ciel.nuagesSpeciaux.fichiers` (`animations-config.js`).

La frequence se regle avec `ciel.nuagesSpeciaux.attente` (secondes entre deux nuages speciaux) et
`ciel.nuagesSpeciaux.maxVisibles` (nombre max a l'ecran) dans le meme fichier. Le meme nuage ne
passe jamais deux fois de suite.
