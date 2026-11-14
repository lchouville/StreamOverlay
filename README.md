# StreamOverlay

Overlays OBS (theme saphir/or). Le dossier `user/` est publie sur GitHub Pages
par `.github/workflows/pages.yml` a chaque push sur `main`.

URLs (source Navigateur OBS) : `https://<user>.github.io/<repo>/<chemin>` ou `<chemin>` est relatif a `user/` (ex. `SaphirSchwarz/primary-frame/game-frame.html`, `Elwe/primary-frame/main-frame.html`).

| Page | Chemin | Taille source |
|---|---|---|
| Frame jeu + cam | `SaphirSchwarz/primary-frame/game-frame.html` | 1920x1080 |
| Frame sans cam (blabla) | `SaphirSchwarz/primary-frame/blabla-frame.html` | 1920x1080 |
| Fond plein | `SaphirSchwarz/primary-frame/full-frame.html` | 1920x1080 |
| Timer | `SaphirSchwarz/secondary-frame/timer.html?time=5:00&label=PAUSE` | 320x110 |

Timer : `time` (s, m:s, h:m:s), `mode=up`, `label`, `warn`, `end`, `manual`. Clic = +1 min.

Apres un push, utiliser "Actualiser le cache de la page actuelle" dans la source OBS.
Les WebM d'alertes (`export/`) se regenerent avec `export-alertes.bat` et ne sont pas versionnes.
