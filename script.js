"use strict";
const config = window.PRESENTE || {};
const start = new Date(2026, 4, 16);
function updateTime() {
  const now = new Date();
  // Compare calendar days in UTC to avoid daylight-saving changes.
  const calendarDays = Math.max(0, Math.floor((Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()) - Date.UTC(2026, 4, 16)) / 86400000));
  const elapsed = Math.max(0, now - start);
  document.getElementById("days").textContent = calendarDays;
  document.getElementById("hours").textContent = String(Math.floor(elapsed / 3600000) % 24).padStart(2, "0");
  document.getElementById("minutes").textContent = String(Math.floor(elapsed / 60000) % 60).padStart(2, "0");
  const remaining = Math.ceil((Date.UTC(2026, 10, 16) - Date.UTC(now.getFullYear(), now.getMonth(), now.getDate())) / 86400000);
  document.getElementById("anniversary").textContent = remaining > 0 ? `Faltam ${remaining} ${remaining === 1 ? "dia" : "dias"} para os nossos 6 meses. 16.11.2026 ♡` : remaining === 0 ? "Hoje completamos 6 meses. Feliz nosso dia, meu amor! ♡" : "Seis meses em 16.11.2026. E a nossa história continua. ♡";
}
updateTime();
setInterval(updateTime, 30000);
const memory = document.getElementById("memory");
if (config.lembranca?.trim()) { memory.textContent = config.lembranca; memory.hidden = false; }
// ISO dates sort chronologically. Files without a date go at the end.
const photos = (config.fotos || []).filter(photo => photo.arquivo).slice().sort((a, b) =>
  (a.data || "9999").localeCompare(b.data || "9999") ||
  a.arquivo.localeCompare(b.arquivo, "pt-BR", { numeric: true })
);
function formatPhotoDate(photo) {
  if (!photo.data) return "";
  const date = new Date(photo.data);
  return Number.isNaN(date.getTime()) ? "" : date.toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" });
}
const grid = document.getElementById("photo-grid");
const photoDialog = document.getElementById("photo-dialog");
const largePhoto = document.getElementById("large-photo");
let activePhoto = 0;
function showPhoto(index) {
  if (!photos.length) return;
  activePhoto = (index + photos.length) % photos.length;
  const photo = photos[activePhoto];
  largePhoto.src = photo.arquivo;
  largePhoto.alt = photo.descricao || "Emmanuel e Carol";
  document.getElementById("photo-caption").textContent = [formatPhotoDate(photo), photo.legenda].filter(Boolean).join(" · ") || "Emmanuel & Carol";
  document.getElementById("photo-position").textContent = `${String(activePhoto + 1).padStart(2, "0")} / ${String(photos.length).padStart(2, "0")}`;
}
if (photos.length) {
  grid.replaceChildren();
  photos.forEach((photo, i) => {
    const figure = document.createElement("figure");
    figure.className = "polaroid album-photo" + (photo.destaque ? " album-featured" : "");
    const button = document.createElement("button");
    button.type = "button";
    button.className = "photo-open";
    button.setAttribute("aria-label", `Ampliar foto ${i + 1}: ${photo.descricao || "Emmanuel e Carol"}`);
    button.setAttribute("aria-haspopup", "dialog");
    const img = document.createElement("img");
    img.alt = photo.descricao || "Emmanuel e Carol";
    img.loading = "lazy";
    img.decoding = "async";
    img.src = photo.arquivo;
    img.addEventListener("error", () => {
      const fallback = document.createElement("span");
      fallback.className = "photo-fallback";
      fallback.textContent = "Não consegui abrir esta foto. Confira o arquivo na pasta fotos.";
      button.replaceChildren(fallback);
      button.disabled = true;
    });
    button.appendChild(img);
    const caption = document.createElement("figcaption");
    const number = document.createElement("span");
    number.className = "photo-number";
    number.textContent = String(i + 1).padStart(2, "0");
    const captionCopy = document.createElement("span");
    captionCopy.className = "photo-caption-copy";
    if (photo.data && formatPhotoDate(photo)) {
      const date = document.createElement("time");
      date.dateTime = photo.data;
      date.textContent = formatPhotoDate(photo);
      date.title = photo.origemData === "exif" ? "Data de captura registrada na foto" : "Data indicada pelo nome do arquivo";
      captionCopy.appendChild(date);
    }
    if (photo.legenda) captionCopy.appendChild(document.createTextNode(photo.legenda));
    if (!photo.data && !photo.legenda) captionCopy.textContent = "Mais um pedacinho de nós.";
    caption.append(number, captionCopy);
    figure.append(button, caption);
    grid.appendChild(figure);
    button.addEventListener("click", () => {
      showPhoto(i);
      photoDialog.showModal();
      document.body.classList.add("modal-open");
    });
  });
}
document.getElementById("previous-photo").addEventListener("click", () => showPhoto(activePhoto - 1));
document.getElementById("next-photo").addEventListener("click", () => showPhoto(activePhoto + 1));
document.getElementById("close-photo").addEventListener("click", () => photoDialog.close());
photoDialog.addEventListener("close", () => document.body.classList.remove("modal-open"));
photoDialog.addEventListener("keydown", event => {
  if (event.key === "ArrowRight" || event.key === "ArrowLeft") {
    event.preventDefault();
    showPhoto(activePhoto + (event.key === "ArrowRight" ? 1 : -1));
  }
});
let touchStartX = null;
let touchStartY = null;
largePhoto.addEventListener("touchstart", event => {
  touchStartX = event.changedTouches[0].clientX;
  touchStartY = event.changedTouches[0].clientY;
}, { passive: true });
largePhoto.addEventListener("touchend", event => {
  if (touchStartX === null) return;
  const deltaX = event.changedTouches[0].clientX - touchStartX;
  const deltaY = event.changedTouches[0].clientY - touchStartY;
  if (Math.abs(deltaX) > 50 && Math.abs(deltaX) > Math.abs(deltaY)) showPhoto(activePhoto + (deltaX < 0 ? 1 : -1));
  touchStartX = touchStartY = null;
}, { passive: true });
const text = document.getElementById("letter-text");
(config.carta || []).forEach(paragraph => {
  const p = document.createElement("p");
  // Support crossed-out words and emphasis while keeping the letter as safe text.
  paragraph.split(/(~~[^~]+~~|\*\*[^*]+\*\*)/g).forEach(part => {
    if (part.startsWith("~~") || part.startsWith("**")) {
      const word = document.createElement(part.startsWith("~~") ? "del" : "strong");
      word.textContent = part.slice(2, -2);
      p.appendChild(word);
    } else {
      p.appendChild(document.createTextNode(part));
    }
  });
  text.appendChild(p);
});
const dialog = document.getElementById("letter-dialog");
document.getElementById("open-letter").addEventListener("click", () => { dialog.showModal(); dialog.scrollTop = 0; document.body.classList.add("modal-open"); });
document.getElementById("close-letter").addEventListener("click", () => dialog.close());
dialog.addEventListener("close", () => document.body.classList.remove("modal-open"));
dialog.addEventListener("click", e => { const r = dialog.getBoundingClientRect(); if (e.target === dialog && (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom)) dialog.close(); });
