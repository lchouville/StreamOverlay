// Box d'alerte animee. Necessite shared/stars.js et shared/alert-box.css.
const ALERT_ICONS = {
  follow:      '<svg viewBox="0 0 24 24" fill="#f3e6b3"><path d="M12 21s-7.5-4.6-10-9.2C.4 8.6 2 5 5.5 5 8 5 9.6 6.4 12 9c2.4-2.6 4-4 6.5-4C22 5 23.6 8.6 22 11.8 19.5 16.4 12 21 12 21z"/></svg>',
  newfollower: '<svg viewBox="0 0 24 24" fill="none" stroke="#f3e6b3" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="8" r="4"/><path d="M2 21c0-4 3-6.5 7-6.5s7 2.5 7 6.5"/><path d="M19 8v6M16 11h6"/></svg>',
  gift:        '<svg viewBox="0 0 24 24" fill="#f3e6b3"><path d="M12 2l2.9 6 6.6.9-4.8 4.6 1.1 6.5L12 16.9 6.2 20l1.1-6.5L2.5 8.9l6.6-.9L12 2z"/></svg>',
  donation:    '<svg viewBox="0 0 24 24" fill="none" stroke="#f3e6b3" stroke-width="2"><circle cx="12" cy="12" r="9"/><path d="M12 7v10M15 9.5c0-1.4-1.3-2.5-3-2.5s-3 1-3 2.3c0 3 6 1.4 6 4.3 0 1.4-1.3 2.4-3 2.4s-3-1-3-2.4" stroke-linecap="round"/></svg>'
};

const ALERT_KINDS = {
  follow:      { label: 'Nouveau follow',   detail: () => 'Bienvenue dans la constellation !' },
  newfollower: { label: 'Nouveau follower', detail: () => 'Une nouvelle etoile rejoint le ciel' },
  gift:        { label: 'Gift sub',         detail: () => 'Merci pour le cadeau !' },
  donation:    { label: 'Don',              detail: () => 'Merci pour ta generosite !' }
};

const ALERT_DEMO = {
  follow:      { type: 'follow', user: 'yuuki__vt' },
  newfollower: { type: 'newfollower', user: 'yuuki__vt' },
  gift:        { type: 'gift', user: 'Tiwi64', amount: 5 },
  donation:    { type: 'donation', user: 'StarGazer', amount: 10, message: 'Merci pour le live !' }
};

const ALERT_DISPLAY_MS = Number(new URLSearchParams(location.search).get('ms')) || 6000;
const ALERT_GAP_MS = 400;

function _alertEsc(s) {
  const d = document.createElement('div');
  d.textContent = s == null ? '' : String(s);
  return d.innerHTML;
}

function _alertBurst(el) {
  for (let i = 0; i < 18; i++) {
    const s = document.createElement('div');
    s.className = 'spark';
    const angle = Math.random() * Math.PI * 2;
    const dist = 40 + Math.random() * 60;
    s.style.setProperty('--dx', Math.cos(angle) * dist + 'px');
    s.style.setProperty('--dy', Math.sin(angle) * dist + 'px');
    s.style.animationDelay = (0.5 + Math.random() * 0.2) + 's';
    el.appendChild(s);
  }
}

// Joue une alerte dans `stage` (element positionne 350x80), appelle `done` a la fin.
function playAlert(stage, a, done) {
  const kind = ALERT_KINDS[a.type];
  const el = document.createElement('div');
  el.className = 'alert';
  el.innerHTML =
    '<div class="star-field"></div>' +
    `<div class="icon-circle">${ALERT_ICONS[a.type]}</div>` +
    '<div class="content">' +
      `<div class="kind">${_alertEsc(kind.label)}</div>` +
      '<div class="slot"></div>' +
      `<div class="detail">${_alertEsc(kind.detail(a))}</div>` +
    '</div>';
  stage.appendChild(el);
  spawnStarField(el.querySelector('.star-field'), 16);
  // scintillement bref : chaque etoile finit avant 3,2 s, ensuite la box est totalement fixe
  el.querySelectorAll('.star').forEach(s => {
    s.style.animationDelay = (Math.random() * 1.2).toFixed(2) + 's';
    s.style.animationDuration = (1.2 + Math.random() * 0.8).toFixed(2) + 's';
  });
  _alertBurst(el);
  el.classList.add('in');

  setTimeout(() => {
    el.remove();
    if (done) done();
  }, ALERT_DISPLAY_MS);
}

// File d'attente : retourne pushAlert(a). Une alerte a la fois.
function createAlertQueue(stage) {
  const queue = [];
  let busy = false;
  function next() {
    const a = queue.shift();
    if (!a) { busy = false; return; }
    playAlert(stage, a, () => setTimeout(next, ALERT_GAP_MS));
  }
  return function pushAlert(a) {
    if (!a || !ALERT_KINDS[a.type]) return;
    queue.push(a);
    if (!busy) { busy = true; next(); }
  };
}
