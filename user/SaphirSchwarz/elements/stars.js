function spawnStarField(container, count) {
  for (let i = 0; i < count; i++) {
    const star = document.createElement('div');
    star.className = 'star';
    const size = Math.random() * 2 + 1;
    star.style.width = size + 'px';
    star.style.height = size + 'px';
    star.style.left = Math.random() * 100 + '%';
    star.style.top = Math.random() * 100 + '%';
    star.style.animationDelay = (Math.random() * 3.2).toFixed(2) + 's';
    star.style.animationDuration = (2.4 + Math.random() * 2.4).toFixed(2) + 's';
    container.appendChild(star);
  }
}
