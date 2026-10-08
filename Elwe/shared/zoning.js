// Cree une zone rectangulaire etiquetee (voir shared/zoning.css). Utilise pour
// previsualiser le placement des elements avant de definir le theme visuel.
function makeZone(label) {
  const zone = document.createElement('div');
  zone.className = 'zone';
  const tag = document.createElement('span');
  tag.className = 'zone-label';
  tag.textContent = label;
  zone.appendChild(tag);
  return zone;
}
