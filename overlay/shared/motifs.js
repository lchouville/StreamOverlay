const SVG_NS = 'http://www.w3.org/2000/svg';

function makeMedallion(kind, size) {
  const el = document.createElementNS(SVG_NS, 'svg');
  el.setAttribute('viewBox', '0 0 100 100');
  el.setAttribute('width', size);
  el.setAttribute('height', size);
  el.classList.add('motif', 'motif-' + kind);

  if (kind === 'sunburst') {
    el.innerHTML = `
      <g fill="none" stroke="url(#goldGrad)" stroke-width="4" stroke-linecap="round">
        <path d="M50 6 L50 24 M50 76 L50 94 M6 50 L24 50 M76 50 L94 50
                 M17 17 L29 29 M71 71 L83 83 M83 17 L71 29 M29 71 L17 83" />
      </g>
      <circle cx="50" cy="50" r="14" fill="none" stroke="url(#goldGrad)" stroke-width="3"/>
      <circle cx="50" cy="50" r="5" fill="url(#goldGrad)"/>
      <defs>
        <linearGradient id="goldGrad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stop-color="#f3e6b3"/>
          <stop offset="1" stop-color="#a68f4c"/>
        </linearGradient>
      </defs>`;
  } else if (kind === 'crescent') {
    el.innerHTML = `
      <path d="M62 12 A38 38 0 1 0 62 88 A30 30 0 1 1 62 12 Z"
            fill="url(#goldGrad2)"/>
      <circle cx="78" cy="26" r="2.4" fill="#f3e6b3"/>
      <circle cx="84" cy="40" r="1.5" fill="#f3e6b3"/>
      <defs>
        <linearGradient id="goldGrad2" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stop-color="#f3e6b3"/>
          <stop offset="1" stop-color="#a68f4c"/>
        </linearGradient>
      </defs>`;
  } else if (kind === 'sapphire') {
    el.innerHTML = `
      <polygon points="50,6 74,38 62,94 38,94 26,38" fill="url(#sapGrad)" stroke="#cfe0ff" stroke-width="1.5"/>
      <polygon points="50,6 74,38 50,46 26,38" fill="#ffffff" opacity="0.25"/>
      <line x1="50" y1="6" x2="50" y2="94" stroke="#cfe0ff" stroke-width="1" opacity="0.5"/>
      <line x1="26" y1="38" x2="74" y2="38" stroke="#cfe0ff" stroke-width="1" opacity="0.5"/>
      <defs>
        <linearGradient id="sapGrad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stop-color="#6a3fe0"/>
          <stop offset="0.5" stop-color="#3452e0"/>
          <stop offset="1" stop-color="#1c2f8f"/>
        </linearGradient>
      </defs>`;
    el.classList.add('sapphire');
  }
  return el;
}

function placeMedallion(container, kind, size, xPercent, yPercent) {
  const el = makeMedallion(kind, size);
  el.style.position = 'absolute';
  el.style.left = `calc(${xPercent}% - ${size / 2}px)`;
  el.style.top = `calc(${yPercent}% - ${size / 2}px)`;
  container.appendChild(el);
  return el;
}
