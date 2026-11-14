function spawnStarField(container, count) {
  for (let i = 0; i < count; i++) {
    const star = document.createElement('div');
    star.className = 'star';
    const size = Math.random() * 2 + 1;
    star.style.width = size + 'px';
    star.style.height = size + 'px';
    star.style.left = Math.random() * 100 + '%';
    star.style.top = Math.random() * 100 + '%';
    if (Math.random() < 0.2) star.classList.add('gold');
    if (Math.random() < 0.08) { star.classList.add('bright'); star.style.width = star.style.height = (size + 1.5) + 'px'; }
    star.style.animationDelay = (Math.random() * 3.2).toFixed(2) + 's';
    star.style.animationDuration = (2.4 + Math.random() * 2.4).toFixed(2) + 's';
    container.appendChild(star);
  }
}

// Etoile filante rare (toutes les 12 a 25 s), uniquement sur les grands fonds.
function spawnShootingStars(container) {
  const tir = () => {
    const s = document.createElement('div');
    s.className = 'shooting-star';
    s.style.left = Math.random() * 60 + '%';
    s.style.top = Math.random() * 40 + '%';
    s.addEventListener('animationend', () => s.remove());
    container.appendChild(s);
    setTimeout(tir, 12000 + Math.random() * 13000);
  };
  setTimeout(tir, 4000);
}
