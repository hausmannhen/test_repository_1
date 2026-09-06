/* Gemeinsame Geometrien und Materialien, einmal erzeugt, nie pro Bildschirm entsorgt */
import * as THREE from "three";

const mats = new Map();
const geos = new Map();

/* Standardmaterial (physikalisch, rau, matt). Der Name bleibt aus Kompatibilität. */
export function lambert(hex, opts = {}) {
  const key = hex + JSON.stringify(opts);
  if (!mats.has(key)) {
    const o = { color: new THREE.Color(hex), roughness: 0.88, metalness: 0.0, ...opts };
    if (typeof o.emissive === "string") o.emissive = new THREE.Color(o.emissive);
    mats.set(key, new THREE.MeshStandardMaterial(o));
  }
  return mats.get(key);
}
export const standard = lambert;
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
/* Vertices leicht verschieben, für unregelmäßige Steine und Laub (deterministisch je Variante) */
function roughen(g, amount, seed) {
  const pos = g.attributes.position;
  let h = seed | 0;
  const rnd = () => { h = (Math.imul(h ^ (h >>> 15), 2246822519) + 1) | 0; return ((h >>> 0) % 10000) / 10000 - 0.5; };
  for (let i = 0; i < pos.count; i++) {
    pos.setXYZ(i, pos.getX(i) * (1 + rnd() * amount), pos.getY(i) * (1 + rnd() * amount), pos.getZ(i) * (1 + rnd() * amount));
  }
  pos.needsUpdate = true;
  g.computeVertexNormals();
  return g;
}
export const G = {
  box: (w, h, d) => geo(`box${w},${h},${d}`, () => new THREE.BoxGeometry(w, h, d)),
  cyl: (rt, rb, h, seg = 8) => geo(`cyl${rt},${rb},${h},${seg}`, () => new THREE.CylinderGeometry(rt, rb, h, seg)),
  cone: (r, h, seg = 8) => geo(`cone${r},${h},${seg}`, () => new THREE.ConeGeometry(r, h, seg)),
  ico: (r, d = 1) => geo(`ico${r},${d}`, () => new THREE.IcosahedronGeometry(r, d), false),
  dodeca: (r) => geo(`dod${r}`, () => new THREE.DodecahedronGeometry(r, 0), false),
  sphere: (r, seg = 10) => geo(`sph${r},${seg}`, () => new THREE.SphereGeometry(r, seg, Math.max(5, seg - 2)), false),
  octa: (r) => geo(`oct${r}`, () => new THREE.OctahedronGeometry(r, 0), false),
  plane: (w, h) => geo(`pl${w},${h}`, () => new THREE.PlaneGeometry(w, h), false),
  ring: (ri, ro) => geo(`ring${ri},${ro}`, () => new THREE.RingGeometry(ri, ro, 32), false),
  torus: (r, t, arc = Math.PI * 2) => geo(`tor${r},${t},${arc}`, () => new THREE.TorusGeometry(r, t, 6, 16, arc), false),
  /* Kapsel, mittig (Gliedmaßen, Rumpf) */
  capsule: (r, len) => geo(`cap${r},${len}`, () => new THREE.CapsuleGeometry(r, len, 4, 10), false),
  /* Kapsel, die von einem Gelenk nach unten hängt */
  hangCapsule: (r, len) => geo(`hcap${r},${len}`, () => new THREE.CapsuleGeometry(r, len, 4, 10).translate(0, -len / 2 - r, 0), false),
  /* Box, die von einem Gelenk nach unten hängt */
  hang: (w, h, d) => geo(`hang${w},${h},${d}`, () => new THREE.BoxGeometry(w, h, d).translate(0, -h / 2, 0), false),
  /* Kegel mit Spitze nach unten, mittig (Geister) */
  icone: (r, h, seg = 8) => geo(`icone${r},${h},${seg}`, () => new THREE.ConeGeometry(r, h, seg).rotateX(Math.PI), false),
  /* Pyramide mit achsparallelen Kanten, Basis auf y = 0 */
  pyramid: (r, h) => geo(`pyr${r},${h}`, () => new THREE.ConeGeometry(r, h, 4).rotateY(Math.PI / 4)),
  /* Unregelmäßiger Stein, drei Varianten */
  rock: (r, v) => geo(`rock${r},${v}`, () => roughen(new THREE.DodecahedronGeometry(r, 1), 0.35, 11 + v * 97), false),
  /* Laubballen, drei Varianten */
  foliage: (r, v) => geo(`fol${r},${v}`, () => roughen(new THREE.IcosahedronGeometry(r, 1), 0.22, 5 + v * 31), false),
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

/* Prozedurale Rauschtextur (Graustufen), bricht flache Farbflächen auf */
let noiseTex = null;
export function noiseTexture() {
  if (noiseTex) return noiseTex;
  const size = 128;
  const canvas = document.createElement("canvas");
  canvas.width = size; canvas.height = size;
  const ctx = canvas.getContext("2d");
  const img = ctx.createImageData(size, size);
  let h = 7;
  const rnd = () => { h = (Math.imul(h ^ (h >>> 13), 1274126177) + 1) | 0; return ((h >>> 0) % 1000) / 1000; };
  const field = new Float32Array(size * size);
  for (let i = 0; i < field.length; i++) field[i] = rnd();
  // zweimal glätten für weiche Flecken
  for (let pass = 0; pass < 2; pass++) {
    const out = new Float32Array(size * size);
    for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
      let s = 0;
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) s += field[((y + dy + size) % size) * size + ((x + dx + size) % size)];
      out[y * size + x] = s / 9;
    }
    field.set(out);
  }
  for (let i = 0; i < field.length; i++) {
    const v = Math.round(205 + (field[i] - 0.5) * 100 + (rnd() - 0.5) * 30);
    img.data[i * 4] = v; img.data[i * 4 + 1] = v; img.data[i * 4 + 2] = v; img.data[i * 4 + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);
  noiseTex = new THREE.CanvasTexture(canvas);
  noiseTex.wrapS = noiseTex.wrapT = THREE.RepeatWrapping;
  noiseTex.colorSpace = THREE.NoColorSpace;
  return noiseTex;
}
