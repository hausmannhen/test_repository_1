/* Gemeinsame Geometrien und Materialien, einmal erzeugt, nie pro Bildschirm entsorgt */
import * as THREE from "three";

const mats = new Map();
const geos = new Map();

export function lambert(hex, opts = {}) {
  const key = hex + JSON.stringify(opts);
  if (!mats.has(key)) mats.set(key, new THREE.MeshLambertMaterial({ color: new THREE.Color(hex), ...opts }));
  return mats.get(key);
}
export function basic(hex, opts = {}) {
  const key = "b" + hex + JSON.stringify(opts);
  if (!mats.has(key)) mats.set(key, new THREE.MeshBasicMaterial({ color: new THREE.Color(hex), ...opts }));
  return mats.get(key);
}
/* Geometrie mit Basis auf y = 0 (Zylinder, Kegel und Boxen sind sonst mittig) */
export function geo(key, make, liftToBase = true) {
  if (!geos.has(key)) {
    const g = make();
    if (liftToBase) { g.computeBoundingBox(); g.translate(0, -g.boundingBox.min.y, 0); }
    geos.set(key, g);
  }
  return geos.get(key);
}
export const G = {
  box: (w, h, d) => geo(`box${w},${h},${d}`, () => new THREE.BoxGeometry(w, h, d)),
  cyl: (rt, rb, h, seg = 6) => geo(`cyl${rt},${rb},${h},${seg}`, () => new THREE.CylinderGeometry(rt, rb, h, seg)),
  cone: (r, h, seg = 6) => geo(`cone${r},${h},${seg}`, () => new THREE.ConeGeometry(r, h, seg)),
  ico: (r, d = 0) => geo(`ico${r},${d}`, () => new THREE.IcosahedronGeometry(r, d), false),
  dodeca: (r) => geo(`dod${r}`, () => new THREE.DodecahedronGeometry(r, 0), false),
  sphere: (r, seg = 8) => geo(`sph${r},${seg}`, () => new THREE.SphereGeometry(r, seg, Math.max(4, seg - 2)), false),
  octa: (r) => geo(`oct${r}`, () => new THREE.OctahedronGeometry(r, 0), false),
  plane: (w, h) => geo(`pl${w},${h}`, () => new THREE.PlaneGeometry(w, h), false),
  /* Box, die von einem Gelenk nach unten hängt (Arme, Beine) */
  hang: (w, h, d) => geo(`hang${w},${h},${d}`, () => new THREE.BoxGeometry(w, h, d).translate(0, -h / 2, 0), false),
  /* Kegel mit Spitze nach unten, mittig (Geister) */
  icone: (r, h, seg = 6) => geo(`icone${r},${h},${seg}`, () => new THREE.ConeGeometry(r, h, seg).rotateX(Math.PI), false),
  /* Pyramide mit achsparallelen Kanten, Basis auf y = 0 */
  pyramid: (r, h) => geo(`pyr${r},${h}`, () => new THREE.ConeGeometry(r, h, 4).rotateY(Math.PI / 4)),
};

/* Farbe mit leichter Variation (deterministisch aus n) */
export function vary(hex, n, amount = 0.05) {
  const c = new THREE.Color(hex);
  const f = 1 + ((n * 9301 + 49297) % 233280 / 233280 - 0.5) * 2 * amount;
  c.multiplyScalar(f);
  return c;
}
export function disposeObject(root) {
  root.traverse(o => {
    if (o.isInstancedMesh) o.dispose();
    if (o.userData.ownGeometry && o.geometry) o.geometry.dispose();
    if (o.userData.ownMaterial && o.material) (Array.isArray(o.material) ? o.material : [o.material]).forEach(m => { if (m.map) m.map.dispose(); m.dispose(); });
  });
}
