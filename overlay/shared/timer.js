// Timer d'overlay. Le temps est calcule a partir de Date.now() (pas d'accumulation
// de ticks), donc il reste exact meme si l'onglet/source OBS est throttle.

// "90" -> 90 s ; "5:00" -> 300 s ; "1:02:03" -> 3723 s
function parseDuration(str) {
  if (str == null || str === '') return 0;
  const parts = String(str).split(':').map(Number);
  if (parts.some(n => !isFinite(n) || n < 0)) return 0;
  return parts.reduce((acc, n) => acc * 60 + n, 0) * 1000;
}

function formatTime(ms) {
  const total = Math.max(0, Math.ceil(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const pad = n => String(n).padStart(2, '0');
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
}

/**
 * createTimer(container, opts)
 *   opts.mode       'down' (compte a rebours) | 'up' (chronometre)
 *   opts.duration   duree en ms (mode 'down')
 *   opts.label      texte au-dessus du temps
 *   opts.warnAt     ms restantes sous lesquelles le timer passe en "warning" (0 = jamais)
 *   opts.endText    texte affiche a la fin du compte a rebours (defaut : 00:00)
 *   opts.onFinish   callback a la fin du compte a rebours
 * Retourne { start, pause, toggle, reset, set, isRunning }.
 */
function createTimer(container, opts) {
  const o = Object.assign({ mode: 'down', duration: 300000, label: '', warnAt: 10000, endText: '', onFinish: null }, opts);
  const down = o.mode !== 'up';

  container.innerHTML = `
    <div class="timer-box">
      <div class="ring ring-outer"></div>
      <div class="ring ring-dotted"></div>
      <div class="ring ring-inner"></div>
      <div class="star-field"></div>
      <div class="timer-label label-font"></div>
      <div class="timer-time"></div>
    </div>`;
  const box = container.querySelector('.timer-box');
  const labelEl = container.querySelector('.timer-label');
  const timeEl = container.querySelector('.timer-time');
  labelEl.textContent = o.label;
  labelEl.style.display = o.label ? '' : 'none';
  if (typeof spawnStarField === 'function') spawnStarField(container.querySelector('.star-field'), 18);

  let elapsedBefore = 0;   // ms accumules avant le dernier start
  let startedAt = null;    // Date.now() du dernier start, null si en pause
  let finished = false;
  let raf = null;

  const elapsed = () => elapsedBefore + (startedAt != null ? Date.now() - startedAt : 0);

  function render() {
    const e = elapsed();
    const remaining = o.duration - e;

    if (down && remaining <= 0) {
      if (!finished) {
        finished = true;
        elapsedBefore = o.duration;
        startedAt = null;
        if (o.onFinish) o.onFinish();
      }
      timeEl.textContent = o.endText || formatTime(0);
    } else {
      timeEl.textContent = formatTime(down ? remaining : e);
    }

    box.classList.toggle('finished', finished);
    box.classList.toggle('paused', startedAt == null && !finished);
    box.classList.toggle('warning', down && !finished && o.warnAt > 0 && remaining <= o.warnAt);
  }

  function loop() {
    render();
    raf = startedAt != null ? requestAnimationFrame(loop) : null;
  }

  const api = {
    start() {
      if (startedAt != null || finished) return;
      startedAt = Date.now();
      if (raf == null) loop();
    },
    pause() {
      if (startedAt == null) return;
      elapsedBefore = elapsed();
      startedAt = null;
      render();
    },
    toggle() { startedAt != null ? api.pause() : api.start(); },
    reset() {
      elapsedBefore = 0;
      startedAt = null;
      finished = false;
      render();
    },
    // Ajoute du temps au compte a rebours ; relance le timer s'il etait termine.
    add(ms) {
      if (!down) return;
      const wasFinished = finished;
      o.duration += ms;
      finished = false;
      if (wasFinished) api.start(); else render();
    },
    // Change la duree (ms) et remet a zero.
    set(ms) { o.duration = ms; api.reset(); },
    isRunning() { return startedAt != null; }
  };

  render();
  return api;
}
