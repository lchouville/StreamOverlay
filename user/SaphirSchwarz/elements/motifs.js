const SVG_NS = 'http://www.w3.org/2000/svg';
let motifId = 0; // ids de degrade uniques par medaillon (plusieurs SVG dans la meme page)

const GOLD = (id) => `<linearGradient id="${id}" x1="0" y1="0" x2="1" y2="1">
  <stop offset="0" stop-color="#fbf2c9"/><stop offset="0.5" stop-color="#d9c98a"/><stop offset="1" stop-color="#8a7a45"/></linearGradient>`;

// Rayons d'un soleil : n pointes alternant longues/courtes, du rayon r0 aux rayons rLong/rShort.
function sunRays(n, r0, rLong, rShort) {
  let d = '';
  for (let i = 0; i < n; i++) {
    const a = (i / n) * 2 * Math.PI, w = Math.PI / n * 0.55;
    const r1 = i % 2 === 0 ? rLong : rShort;
    const p = (r, ang) => `${(50 + r * Math.sin(ang)).toFixed(1)},${(50 - r * Math.cos(ang)).toFixed(1)}`;
    d += `<polygon points="${p(r0, a - w)} ${p(r1, a)} ${p(r0, a + w)}"/>`;
  }
  return d;
}

function makeMedallion(kind, size) {
  const el = document.createElementNS(SVG_NS, 'svg');
  const g = 'g' + (++motifId), s = 's' + motifId;
  el.setAttribute('viewBox', '0 0 100 100');
  el.setAttribute('width', size);
  el.setAttribute('height', size);
  el.classList.add('motif', 'motif-' + kind);

  if (kind === 'sunburst') {
    // soleil a 16 rayons, double anneau, coeur saphir
    el.innerHTML = `
      <defs>${GOLD(g)}
        <radialGradient id="${s}" cx="0.35" cy="0.3"><stop offset="0" stop-color="#9fb6ff"/><stop offset="0.5" stop-color="#3452e0"/><stop offset="1" stop-color="#1c2f8f"/></radialGradient>
      </defs>
      <g fill="url(#${g})">${sunRays(16, 30, 49, 41)}</g>
      <circle cx="50" cy="50" r="31" fill="#0a1033" stroke="url(#${g})" stroke-width="3.5"/>
      <circle cx="50" cy="50" r="24" fill="none" stroke="url(#${g})" stroke-width="1.2" stroke-dasharray="2 2.6"/>
      <circle cx="50" cy="50" r="17" fill="none" stroke="url(#${g})" stroke-width="2"/>
      <circle cx="50" cy="50" r="10" fill="url(#${s})" stroke="#f3e6b3" stroke-width="1.2"/>
      <circle cx="46.5" cy="46.5" r="2.6" fill="#fff" opacity="0.7"/>`;
  } else if (kind === 'crescent') {
    // croissant epais avec contour fonce et petite etoile a 4 branches
    el.innerHTML = `
      <defs>${GOLD(g)}</defs>
      <path d="M62 10 A40 40 0 1 0 62 90 A46 46 0 0 1 62 10 Z" fill="url(#${g})" stroke="#6b5a2c" stroke-width="1.2"/>
      <path d="M62 15 A35 35 0 1 0 62 85" fill="none" stroke="#fbf2c9" stroke-width="0.9" opacity="0.7"/>
      <path d="M76 22 L78.4 29.6 L86 32 L78.4 34.4 L76 42 L73.6 34.4 L66 32 L73.6 29.6 Z" fill="#fbf2c9" stroke="#a68f4c" stroke-width="0.8"/>
      <circle cx="86" cy="56" r="2" fill="#fbf2c9"/>`;
  } else if (kind === 'sapphire') {
    // gemme facettee sertie d'or
    el.innerHTML = `
      <defs>${GOLD(g)}
        <linearGradient id="${s}" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stop-color="#8a6bff"/><stop offset="0.5" stop-color="#3452e0"/><stop offset="1" stop-color="#16206b"/></linearGradient>
      </defs>
      <polygon points="50,4 78,36 64,96 36,96 22,36" fill="url(#${s})" stroke="url(#${g})" stroke-width="4" stroke-linejoin="round"/>
      <polygon points="50,4 78,36 50,46 22,36" fill="#cfe0ff" opacity="0.35"/>
      <polygon points="22,36 50,46 36,96" fill="#000" opacity="0.18"/>
      <polygon points="78,36 50,46 64,96" fill="#fff" opacity="0.10"/>
      <g stroke="#cfe0ff" stroke-width="1" opacity="0.6" fill="none"><path d="M50 4 L50 46 M22 36 L78 36 M50 46 L36 96 M50 46 L64 96"/></g>
      <path d="M40 20 L46 14" stroke="#fff" stroke-width="2.4" stroke-linecap="round" opacity="0.85"/>`;
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
