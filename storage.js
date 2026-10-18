const KEY = "live_map_points_v1";

export function loadPoints() {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    console.error("Ошибка загрузки точек:", e);
    return [];
  }
}

export function savePoints(points) {
  try {
    localStorage.setItem(KEY, JSON.stringify(points));
  } catch (e) {
    console.error("Ошибка сохранения точек:", e);
  }
}

export function addPoint(point) {
  const points = loadPoints();
  point.id = crypto.randomUUID ? crypto.randomUUID() : String(Date.now() + Math.random());
  point.createdAt = new Date().toISOString();
  points.push(point);
  savePoints(points);
  return point;
}

export function removePoint(id) {
  const points = loadPoints().filter(p => p.id !== id);
  savePoints(points);
  return points;
}