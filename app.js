import { LiveMap } from "./map.js";
import { loadPoints, addPoint, removePoint } from "./storage.js";
import { toast, initPanels, openModal, closeModal, renderPointsList } from "./ui.js";

let SIGHTS = [];
try {
  const mod = await import("./sights-data.js");
  SIGHTS = Array.isArray(mod.SIGHTS) ? mod.SIGHTS : [];
} catch (err) {
  console.warn("Не удалось загрузить sights-data.js — вкладка достопримечательностей отключена:", err);
  SIGHTS = [];
}
initPanels();

let points = loadPoints();
let pendingCoords = null;

const map = new LiveMap("map", {
  points,
  onAdd: (latlng) => {
    pendingCoords = latlng;
    openModal();
  }
});

document.getElementById("btnZoomIn").addEventListener("click", () => map.zoomIn());
document.getElementById("btnZoomOut").addEventListener("click", () => map.zoomOut());
document.getElementById("btnReset").addEventListener("click", () => map.reset());

const form = document.getElementById("pointForm");
form.addEventListener("submit", (e) => {
  e.preventDefault();
  if (!pendingCoords) return;

  const name = document.getElementById("pointName").value.trim();
  const category = document.getElementById("pointCategory").value;
  const desc = document.getElementById("pointDesc").value.trim();

  if (!name) {
    toast("Введите название точки", "err");
    return;
  }

  addPoint({
    name,
    category,
    desc,
    x: pendingCoords.lat,
    y: pendingCoords.lng
  });

  points = loadPoints();
  map.setPoints(points);
  renderPointsList(points, handleDelete);
  closeModal();
  pendingCoords = null;
  toast("Точка добавлена на карту", "ok");
});

document.getElementById("cancelBtn").addEventListener("click", () => {
  closeModal();
  pendingCoords = null;
});

document.getElementById("modalOverlay").addEventListener("click", (e) => {
  if (e.target.id === "modalOverlay") {
    closeModal();
    pendingCoords = null;
  }
});

function handleDelete(id) {
  if (!confirm("Удалить эту точку с карты?")) return;
  points = removePoint(id);
  map.setPoints(points);
  renderPointsList(points, handleDelete);
  toast("Точка удалена", "ok");
}

renderPointsList(points, handleDelete);

window.addEventListener("keydown", (e) => {
  if (e.key === "Escape") {
    closeModal();
    pendingCoords = null;
  }
  if (e.key === "+" || e.key === "=") map.zoomIn();
  if (e.key === "-") map.zoomOut();
  if (e.key === "0") map.reset();
});

if (SIGHTS.length > 0 && typeof map !== "undefined") {
  try {
    const sightsListEl = document.getElementById("sightsList");
    const sightsCountEl = document.getElementById("sightsCount");
    const sightsSearchEl = document.getElementById("sightsSearch");
    const filterChips = document.querySelectorAll(".filter-chip");

    let activeFilter = "all";
    let searchQuery = "";
    const sightMarkers = new Map();

    function renderSights() {
      if (!sightsListEl) return;
      const filtered = SIGHTS.filter(s => {
        if (activeFilter === "moscow" && s.region !== "moscow") return false;
        if (activeFilter === "mo" && s.region !== "mo") return false;
        if (activeFilter !== "all" && activeFilter !== "moscow" && activeFilter !== "mo") {
          if (!s.tags.includes(activeFilter)) return false;
        }
        if (searchQuery) {
          const q = searchQuery.toLowerCase();
          const hay = (s.name + " " + s.place + " " + s.desc + " " + s.tags.join(" ")).toLowerCase();
          if (!hay.includes(q)) return false;
        }
        return true;
      });

      if (sightsCountEl) sightsCountEl.textContent = filtered.length;

      if (filtered.length === 0) {
        sightsListEl.innerHTML = `<div class="sights-empty">Ничего не найдено.</div>`;
        return;
      }

      sightsListEl.innerHTML = filtered.map(s => `
        <div class="sight-card" data-sight-id="${s.id}">
          <button class="sight-focus" data-focus="${s.id}" title="Показать на карте">⌖</button>
          <h3>${escapeHtml(s.name)}</h3>
          <div class="sight-place">${escapeHtml(s.place)} · ${s.region === "moscow" ? "Москва" : "Московская область"}</div>
          <div class="sight-desc">${escapeHtml(s.desc)}</div>
          <div class="sight-tags">
            ${s.tags.map(t => `<span class="sight-tag">${tagLabel(t)}</span>`).join("")}
          </div>
        </div>
      `).join("");

      sightsListEl.querySelectorAll(".sight-card").forEach(card => {
        card.addEventListener("click", (e) => {
          if (e.target.closest(".sight-focus")) return;
          focusSight(card.dataset.sightId);
        });
      });
      sightsListEl.querySelectorAll(".sight-focus").forEach(btn => {
        btn.addEventListener("click", (e) => {
          e.stopPropagation();
          focusSight(btn.dataset.focus);
        });
      });
    }

    function tagLabel(tag) {
      return {
        kremlin: "Кремль", church: "Храм", estate: "Усадьба",
        nature: "Природа", museum: "Музей", tech: "Техника", monument: "Монумент"
      }[tag] || tag;
    }

    function escapeHtml(str) {
      return String(str).replace(/[&<>"']/g, m => ({
        "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
      }[m]));
    }

    function focusSight(id) {
      const sight = SIGHTS.find(s => s.id === id);
      if (!sight) return;

      document.querySelectorAll(".nav-btn").forEach(b => b.classList.remove("active"));
      document.querySelectorAll(".panel").forEach(p => p.classList.remove("active"));
      const mapBtn = document.querySelector('.nav-btn[data-panel="map"]');
      const mapPanel = document.getElementById("panel-map");
      if (mapBtn) mapBtn.classList.add("active");
      if (mapPanel) mapPanel.classList.add("active");

      map.focusOn(sight.lat, sight.lng, 15);

      setTimeout(() => {
        const marker = sightMarkers.get(id);
        if (marker) marker.openPopup();
      }, 450);
    }

    function renderSightMarkers() {
      for (const m of sightMarkers.values()) {
        map.map.removeLayer(m);
      }
      sightMarkers.clear();

      SIGHTS.forEach(s => {
        const icon = L.divIcon({
          className: "sight-marker-wrapper",
          html: `<div class="sight-marker"></div>`,
          iconSize: [14, 14],
          iconAnchor: [7, 7]
        });
        const marker = L.marker([s.lat, s.lng], {
          icon, title: s.name, riseOnHover: true, zIndexOffset: -100
        });
        marker.bindPopup(`
          <div style="min-width:220px;max-width:280px">
            <b style="color:#fbbf24;font-size:14px">${escapeHtml(s.name)}</b><br/>
            <span style="color:#8b7fa8;font-size:11px;text-transform:uppercase;letter-spacing:0.08em">${escapeHtml(s.place)}</span>
            <div style="margin-top:8px;color:#e9e3f5;font-size:13px;line-height:1.5">${escapeHtml(s.desc)}</div>
          </div>
        `);
        marker.on("click", (e) => {
          L.DomEvent.stopPropagation(e);
          if (e.originalEvent) e.originalEvent._fromMarker = true;
        });
        marker.addTo(map.map);
        sightMarkers.set(s.id, marker);
      });
    }

    filterChips.forEach(chip => {
      chip.addEventListener("click", () => {
        filterChips.forEach(c => c.classList.remove("active"));
        chip.classList.add("active");
        activeFilter = chip.dataset.filter;
        renderSights();
      });
    });

    if (sightsSearchEl) {
      sightsSearchEl.addEventListener("input", (e) => {
        searchQuery = e.target.value.trim();
        renderSights();
      });
    }

    renderSights();
    renderSightMarkers();
  } catch (err) {
    console.error("Ошибка инициализации вкладки достопримечательностей:", err);
  }
}