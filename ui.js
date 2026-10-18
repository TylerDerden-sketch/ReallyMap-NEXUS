let toastTimer = null;

export function toast(message, type = "ok") {
  const container = document.getElementById("toastContainer");
  const el = document.createElement("div");
  el.className = `toast ${type}`;
  el.textContent = message;
  container.appendChild(el);
  setTimeout(() => {
    el.style.opacity = "0";
    el.style.transition = "opacity 0.4s";
    setTimeout(() => el.remove(), 400);
  }, 2600);
}

export function initPanels() {
  const navBtns = document.querySelectorAll(".nav-btn");
  const panels = document.querySelectorAll(".panel");
  navBtns.forEach(btn => {
    btn.addEventListener("click", () => {
      navBtns.forEach(b => b.classList.remove("active"));
      panels.forEach(p => p.classList.remove("active"));
      btn.classList.add("active");
      const target = document.getElementById("panel-" + btn.dataset.panel);
      if (target) target.classList.add("active");
    });
  });
}

export function openModal() {
  document.getElementById("modalOverlay").hidden = false;
  document.getElementById("pointName").focus();
}

export function closeModal() {
  document.getElementById("modalOverlay").hidden = true;
  document.getElementById("pointForm").reset();
}

export function renderPointsList(points, onDelete) {
  const list = document.getElementById("pointsList");
  const count = document.getElementById("pointsCount");
  count.textContent = points.length;

  if (points.length === 0) {
    list.innerHTML = `<div class="empty">Пока пусто. Отметьте первую точку на карте.</div>`;
    return;
  }

  list.innerHTML = points.map(p => `
    <div class="point-card" data-id="${p.id}">
      <button class="point-del" data-del="${p.id}" title="Удалить">✕</button>
      <h4>${escapeHtml(p.name)}</h4>
      <p>${escapeHtml(p.desc || "Без описания")}</p>
      <span class="point-tag tag-${p.category}">${categoryLabel(p.category)}</span>
    </div>
  `).join("");

  list.querySelectorAll("[data-del]").forEach(btn => {
    btn.addEventListener("click", () => onDelete(btn.dataset.del));
  });
}

function categoryLabel(cat) {
  return {
    mystic: "Мистика",
    nature: "Природа",
    urban: "Город",
    history: "История"
  }[cat] || cat;
}

function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, m => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  }[m]));
}