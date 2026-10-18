const CATEGORY_COLORS = {
  mystic: "#a855f7",
  nature: "#34d399",
  urban:  "#38bdf8",
  history:"#fbbf24"
};

const BOUNDS = {
  north: 57.0,
  south: 54.4,
  west:  35.0,
  east:  40.0
};

const CENTER = [55.7558, 37.6173];
const DEFAULT_ZOOM = 10;
const MIN_ZOOM = 8;
const MAX_ZOOM = 19;

export class LiveMap {
  constructor(elementId, opts = {}) {
    this.elementId = elementId;
    this.onAdd = opts.onAdd || (() => {});
    this.onHover = opts.onHover || (() => {});

    this.points = opts.points || [];
    this.markers = new Map(); 

    this._initMap();
    this._initEvents();
    this._renderAllPoints();
  }

  _initMap() {
    this.map = L.map(this.elementId, {
      center: CENTER,
      zoom: DEFAULT_ZOOM,
      minZoom: MIN_ZOOM,
      maxZoom: MAX_ZOOM,
      zoomControl: false,
      attributionControl: true,
      preferCanvas: true,
      maxBounds: [
        [BOUNDS.south - 0.5, BOUNDS.west - 0.5],
        [BOUNDS.north + 0.5, BOUNDS.east + 0.5]
      ]
    });

    this.tileLayer = L.tileLayer(
      "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
      {
        maxZoom: 19,
        minZoom: 8,
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank">OpenStreetMap</a>',
        crossOrigin: true
      }
    ).addTo(this.map);

    this.humanitarianLayer = L.tileLayer(
      "https://tile-{s}.openstreetmap.fr/hot/{z}/{x}/{y}.png",
      {
        maxZoom: 19,
        minZoom: 16,
        attribution: '&copy; <a href="https://www.hotosm.org/" target="_blank">HOT</a>',
        opacity: 0.85
      }
    );

    this.map.on("zoomend", () => {
      const z = this.map.getZoom();
      if (z >= 16) {
        if (!this.map.hasLayer(this.humanitarianLayer)) {
          this.humanitarianLayer.addTo(this.map);
        }
      } else {
        if (this.map.hasLayer(this.humanitarianLayer)) {
          this.map.removeLayer(this.humanitarianLayer);
        }
      }
    });

    this.map.attributionControl.setPrefix(false);
  }

  _initEvents() {
    this.map.on("click", (e) => {
      if (e.originalEvent && e.originalEvent._fromMarker) return;
      this.onAdd({ lat: e.latlng.lat, lng: e.latlng.lng });
    });

    this.map.on("mousemove", (e) => {
      const el = document.getElementById("mapCoords");
      if (el) {
        el.textContent = `широта: ${e.latlng.lat.toFixed(6)} | долгота: ${e.latlng.lng.toFixed(6)} | zoom: ${this.map.getZoom()}`;
      }
    });
  }

  setPoints(points) {
    this.points = points;
    this._renderAllPoints();
  }

  zoomIn()  { this.map.zoomIn(1); }
  zoomOut() { this.map.zoomOut(1); }

  reset() {
    this.map.setView(CENTER, DEFAULT_ZOOM);
  }

  focusOn(lat, lng, zoom = 16) {
    this.map.setView([lat, lng], zoom);
  }

  _renderAllPoints() {
    for (const m of this.markers.values()) {
      this.map.removeLayer(m);
    }
    this.markers.clear();

    for (const p of this.points) {
      this._addMarker(p);
    }
  }

  _addMarker(p) {
    const color = CATEGORY_COLORS[p.category] || "#a855f7";

    const icon = L.divIcon({
      className: "user-marker-wrapper",
      html: `<div class="user-marker" style="color:${color}"></div>`,
      iconSize: [16, 16],
      iconAnchor: [8, 8]
    });

    const marker = L.marker([p.x, p.y], {
      icon,
      title: p.name,
      riseOnHover: true
    });

    marker.on("click", (e) => {
      L.DomEvent.stopPropagation(e);
      if (e.originalEvent) e.originalEvent._fromMarker = true;
    });

    marker.bindPopup(`
      <div style="min-width:180px">
        <b style="color:${color};font-size:14px">${escapeHtml(p.name)}</b><br/>
        <span style="color:#8b7fa8;font-size:12px">${escapeHtml(p.desc || "Без описания")}</span><br/>
        <span style="color:${color};font-size:11px;text-transform:uppercase;letter-spacing:0.1em">${categoryLabel(p.category)}</span>
      </div>
    `);

    marker.addTo(this.map);
    this.markers.set(p.id, marker);
  }
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

export { CATEGORY_COLORS };