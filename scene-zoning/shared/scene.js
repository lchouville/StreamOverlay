// Dessine une zone etiquetee (voir shared/scene.css) en (x, y), taille w x h.
// `kind` : 'pdv1' / 'pdv2' (ecran + cam d'un meme point de vue) ou 'element'.
function zone(label, x, y, w, h, kind = 'element') {
  const el = document.createElement('div');
  el.className = 'zone ' + kind;
  Object.assign(el.style, { left: x + 'px', top: y + 'px', width: w + 'px', height: h + 'px' });
  const tag = document.createElement('span');
  tag.className = 'zone-label';
  tag.textContent = `${label}\n${w}x${h} @ (${x},${y})`;
  el.appendChild(tag);
  document.body.appendChild(el);
}

// Reduit le canvas 1920x1080 pour qu il tienne entier dans la fenetre.
function fitCanvas() {
  const k = Math.min(1, innerWidth / 1920, innerHeight / 1080);
  document.body.style.transform = `scale(${k})`;
}
addEventListener('resize', fitCanvas);
addEventListener('DOMContentLoaded', fitCanvas);

function sceneName(name) {
  const tag = document.createElement('span');
  tag.className = 'scene-name';
  tag.textContent = name;
  document.body.appendChild(tag);
}

// Formats de base (Elwe/primary-frame/windows+cam-frame.html) a conserver :
// - fenetre jeu 16:9 (1440x810 en simple, 704x396 en dual)
// - cam 420x240 (7:4)
// Boite d alertes : meme taille que overlay/ (box 350x80). 4 max affichees
// en ligne, 5px entre chaque : rangee de 4x350 + 3x5 = 1415x80.
const ALERT = { w: 350, h: 80 };
const ROW_MAX = 4;
const ROW_GAP = 5;
const ROW_W = ROW_MAX * ALERT.w + (ROW_MAX - 1) * ROW_GAP;

// Rangee d alertes centree horizontalement sur [left, left + width].
function alertRow(left, width, y) {
  const x0 = left + Math.floor((width - ROW_W) / 2);
  for (let i = 0; i < ROW_MAX; i++) {
    zone(`ALERTE ${i + 1}`, x0 + i * (ALERT.w + ROW_GAP), y, ALERT.w, ALERT.h);
  }
}

// Elements secondaires communs aux scenes en jeu (pas de timer : il est
// reserve aux scenes de depart et de pause) :
// - rangee d alertes en haut (y 20-100), centree sur la zone jeu (x 30-1470) ;
// - colonne de droite (x 1500-1920) : chat.
// Zone disponible pour les ecrans : x 30-1470, y 110-1050 (1440x940).
function elements({ chat = [1500, 360, 420, 700] } = {}) {
  alertRow(30, 1440, 20);
  zone('CHAT', ...chat);
}
