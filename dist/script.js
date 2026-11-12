"use strict";
const config = window.PRESENTE || {};
const start = new Date(2026, 4, 16);
const anniversary = new Date(2026, 10, 16);
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
(config.fotos || []).slice(0, 3).forEach((photo, i) => {
  if (!photo.arquivo) return;
  const slot = document.getElementById(`photo-${i + 1}`);
  const img = new Image();
  img.alt = photo.descricao || "Uma lembrança nossa";
  img.addEventListener("load", () => slot.replaceChildren(img));
  img.src = photo.arquivo;
});
const text = document.getElementById("letter-text");
(config.carta || []).forEach(paragraph => { const p = document.createElement("p"); p.textContent = paragraph; text.appendChild(p); });
const dialog = document.getElementById("letter-dialog");
document.getElementById("open-letter").addEventListener("click", () => { dialog.showModal(); dialog.scrollTop = 0; document.body.classList.add("modal-open"); });
document.getElementById("close-letter").addEventListener("click", () => dialog.close());
dialog.addEventListener("close", () => document.body.classList.remove("modal-open"));
dialog.addEventListener("click", e => { const r = dialog.getBoundingClientRect(); if (e.target === dialog && (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom)) dialog.close(); });
