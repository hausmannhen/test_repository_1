/* Effekte: Schadenszahlen als Sprites, Partikel als Points, Gegner-Projektile, Spielergeschosse, Zauberringe und Strahlen */
import * as THREE from "three";
import { basic, lambert, geo, G as GEO } from "./materials.js";

const MAX_PARTICLES = 512;
const textureCache = new Map();
const _v = new THREE.Vector3();

export function textTexture(text, color, size) {
  const key = text + "|" + color + "|" + size;
  if (textureCache.has(key)) return textureCache.get(key);
  const canvas = document.createElement("canvas");
  canvas.width = 256; canvas.height = 96;
  const ctx = canvas.getContext("2d");
  ctx.font = `bold ${size}px "Segoe UI", Arial, sans-serif`;
  ctx.textAlign = "center"; ctx.textBaseline = "middle";
  ctx.lineWidth = 8; ctx.strokeStyle = "rgba(0,0,0,0.85)"; ctx.lineJoin = "round";
  ctx.strokeText(text, 128, 48);
  ctx.fillStyle = color; ctx.fillText(text, 128, 48);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.minFilter = THREE.LinearFilter;
  textureCache.set(key, tex);
  if (textureCache.size > 400) { const first = textureCache.keys().next().value; textureCache.get(first).dispose(); textureCache.delete(first); }
  return tex;
}

/* Geschossformen, Längsachse entlang +z */
const SHOT = {
  pfeil:  () => { const g = new THREE.Group(); g.add(new THREE.Mesh(geo("arrow", () => new THREE.CylinderGeometry(0.012, 0.012, 0.55, 5).rotateX(Math.PI / 2), false), lambert("#8a6a3a")), new THREE.Mesh(geo("arrowtip", () => new THREE.ConeGeometry(0.03, 0.09, 5).rotateX(Math.PI / 2).translate(0, 0, 0.3), false), basic("#d8d8e0"))); return g; },
  bolzen: () => { const g = new THREE.Group(); g.add(new THREE.Mesh(geo("bolt", () => new THREE.CylinderGeometry(0.018, 0.018, 0.4, 5).rotateX(Math.PI / 2), false), lambert("#4a3a2a")), new THREE.Mesh(geo("bolttip", () => new THREE.ConeGeometry(0.035, 0.08, 5).rotateX(Math.PI / 2).translate(0, 0, 0.22), false), basic("#d8d8e0"))); return g; },
  messer: () => { const g = new THREE.Group(); g.add(new THREE.Mesh(geo("knifeb", () => new THREE.BoxGeometry(0.03, 0.015, 0.26), false), basic("#d8d8e0"))); return g; },
  axt:    () => { const g = new THREE.Group(); g.add(new THREE.Mesh(geo("axeh", () => new THREE.BoxGeometry(0.025, 0.36, 0.025), false), lambert("#7a5a36")), new THREE.Mesh(geo("axeb", () => new THREE.BoxGeometry(0.16, 0.14, 0.02).translate(0.06, 0.12, 0), false), basic("#d8d8e0"))); return g; },
};

export class Effects {
  constructor(scene) {
    this.scene = scene;
    this.spriteByFx = new Map();
    this.meshByFx = new Map();
    // Partikel
    this.pGeo = new THREE.BufferGeometry();
    this.pPos = new Float32Array(MAX_PARTICLES * 3);
    this.pCol = new Float32Array(MAX_PARTICLES * 3);
    this.pGeo.setAttribute("position", new THREE.BufferAttribute(this.pPos, 3));
    this.pGeo.setAttribute("color", new THREE.BufferAttribute(this.pCol, 3));
    this.points = new THREE.Points(this.pGeo, new THREE.PointsMaterial({ size: 0.16, vertexColors: true, sizeAttenuation: true }));
    this.points.frustumCulled = false;
    scene.add(this.points);
    this.colorCache = new Map();
    // Gegner-Projektile
    this.projPool = [];
    this.projGroup = new THREE.Group();
    scene.add(this.projGroup);
    // Spielergeschosse: Pool je Form
    this.shotPools = {};
    this.shotGroup = new THREE.Group();
    scene.add(this.shotGroup);
    this.spellMats = new Map();
  }
  color(hex) {
    if (!this.colorCache.has(hex)) this.colorCache.set(hex, new THREE.Color(hex));
    return this.colorCache.get(hex);
  }
  spellMaterial(hex) {
    if (!this.spellMats.has(hex)) this.spellMats.set(hex, new THREE.MeshStandardMaterial({ color: new THREE.Color(hex), emissive: new THREE.Color(hex), emissiveIntensity: 1.6, roughness: 0.4 }));
    return this.spellMats.get(hex);
  }
  makeShot(kind) {
    if (kind === "spell") {
      const g = new THREE.Group();
      const core = new THREE.Mesh(GEO.ico(0.13, 1), this.spellMaterial("#ffffff"));
      const glow = new THREE.Mesh(GEO.ico(0.26, 1), new THREE.MeshBasicMaterial({ color: new THREE.Color("#ffffff"), transparent: true, opacity: 0.3, depthWrite: false }));
      glow.userData.ownMaterial = true;
      g.add(core, glow);
      g.userData.core = core; g.userData.glow = glow;
      return g;
    }
    return (SHOT[kind] || SHOT.pfeil)();
  }
  update(G, time, toWorld) {
    // --- Schadenszahlen ---
    const alive = new Set();
    for (const f of G.fx) {
      if (f.kind === "num") {
        alive.add(f);
        let sp = this.spriteByFx.get(f);
        if (!sp) {
          const size = f.big ? 56 : f.small ? 34 : 44;
          const mat = new THREE.SpriteMaterial({ map: textTexture(f.text, f.color, size), transparent: true, depthTest: false });
          sp = new THREE.Sprite(mat);
          sp.renderOrder = 30;
          const sc = f.big ? 1.6 : f.small ? 1.0 : 1.3;
          sp.scale.set(sc, sc * 0.375, 1);
          this.scene.add(sp);
          this.spriteByFx.set(f, sp);
        }
        const p = toWorld(f.x, f.y);
        sp.position.set(p.x, p.y + 1.0 + f.rise / 16 * 1.4, p.z);
        sp.material.opacity = Math.min(1, f.t / 0.3);
      } else if (f.kind === "ring") {
        alive.add(f);
        let m = this.meshByFx.get(f);
        if (!m) {
          m = new THREE.Mesh(GEO.ring(0.82, 1.0), new THREE.MeshBasicMaterial({ color: this.color(f.color), transparent: true, opacity: 0.8, side: THREE.DoubleSide, depthWrite: false }));
          m.rotation.x = -Math.PI / 2;
          m.renderOrder = 5;
          this.scene.add(m);
          this.meshByFx.set(f, m);
        }
        const prog = 1 - f.t / f.maxT;
        const p = toWorld(f.x, f.y);
        const r = (f.r / 16) * (0.2 + prog * 0.8);
        m.position.set(p.x, p.y + 0.06, p.z);
        m.scale.set(r, r, 1);
        m.material.opacity = 0.85 * (1 - prog);
      } else if (f.kind === "beam") {
        alive.add(f);
        let m = this.meshByFx.get(f);
        if (!m) {
          m = new THREE.Mesh(GEO.box(1, 1, 1), new THREE.MeshBasicMaterial({ color: this.color(f.color), transparent: true, opacity: 0.9, depthWrite: false }));
          this.scene.add(m);
          this.meshByFx.set(f, m);
        }
        const a = toWorld(f.x, f.y), b = toWorld(f.x2, f.y2);
        const len = Math.hypot(b.x - a.x, b.z - a.z) || 0.01;
        const th = (f.thin ? 0.06 : 0.14) * (0.5 + f.t / f.maxT);
        m.position.set((a.x + b.x) / 2, 0.55 - th / 2, (a.z + b.z) / 2);
        m.scale.set(th, th, len);
        m.lookAt(_v.set(b.x, 0.55 - th / 2, b.z));
        m.material.opacity = 0.9 * (f.t / f.maxT);
      }
    }
    for (const [f, sp] of this.spriteByFx) if (!alive.has(f)) { this.scene.remove(sp); sp.material.dispose(); this.spriteByFx.delete(f); }
    for (const [f, m] of this.meshByFx) if (!alive.has(f)) { this.scene.remove(m); m.material.dispose(); this.meshByFx.delete(f); }
    // --- Partikel ---
    let n = 0;
    for (const f of G.fx) {
      if (f.kind !== "part" || n >= MAX_PARTICLES) continue;
      const p = toWorld(f.x, f.y);
      const c = this.color(f.color);
      this.pPos[n * 3] = p.x; this.pPos[n * 3 + 1] = p.y + 0.3 + (0.5 - f.t) * 0.8; this.pPos[n * 3 + 2] = p.z;
      this.pCol[n * 3] = c.r; this.pCol[n * 3 + 1] = c.g; this.pCol[n * 3 + 2] = c.b;
      n++;
    }
    this.pGeo.setDrawRange(0, n);
    this.pGeo.attributes.position.needsUpdate = true;
    this.pGeo.attributes.color.needsUpdate = true;
    // --- Gegner-Projektile ---
    for (let i = 0; i < G.projs.length; i++) {
      const pr = G.projs[i];
      let m = this.projPool[i];
      if (!m) { m = new THREE.Mesh(GEO.ico(0.12, 0), basic("#ffffff")); this.projPool.push(m); this.projGroup.add(m); }
      m.visible = true;
      m.material = basic(pr.color);
      const p = toWorld(pr.x, pr.y);
      m.position.set(p.x, p.y + 0.5, p.z);
      m.rotation.y = time * 6;
    }
    for (let i = G.projs.length; i < this.projPool.length; i++) this.projPool[i].visible = false;
    // --- Spielergeschosse ---
    const used = {};
    for (const pr of G.pprojs || []) {
      const kind = pr.kind === "spell" ? "spell" : (SHOT[pr.kind] ? pr.kind : "pfeil");
      const pool = this.shotPools[kind] || (this.shotPools[kind] = []);
      const i = used[kind] || 0; used[kind] = i + 1;
      let m = pool[i];
      if (!m) { m = this.makeShot(kind); pool.push(m); this.shotGroup.add(m); }
      m.visible = true;
      const p = toWorld(pr.x, pr.y);
      m.position.set(p.x, p.y + 0.55, p.z);
      const len = Math.hypot(pr.vx, pr.vy) || 1;
      if (kind === "spell") {
        m.userData.core.material = this.spellMaterial(pr.color);
        m.userData.glow.material.color.set(pr.color);
        const pulse = 1 + Math.sin(time * 20) * 0.15;
        m.scale.setScalar(pulse);
      } else if (kind === "messer" || kind === "axt") {
        m.lookAt(_v.set(p.x + pr.vx / len, p.y + 0.55, p.z + pr.vy / len));
        m.rotateX(time * 25);
      } else {
        m.lookAt(_v.set(p.x + pr.vx / len, p.y + 0.55, p.z + pr.vy / len));
      }
    }
    for (const kind in this.shotPools) { const pool = this.shotPools[kind]; for (let i = used[kind] || 0; i < pool.length; i++) pool[i].visible = false; }
  }
  clear() {
    for (const [, sp] of this.spriteByFx) { this.scene.remove(sp); sp.material.dispose(); }
    this.spriteByFx.clear();
    for (const [, m] of this.meshByFx) { this.scene.remove(m); m.material.dispose(); }
    this.meshByFx.clear();
    this.pGeo.setDrawRange(0, 0);
    for (const m of this.projPool) m.visible = false;
    for (const kind in this.shotPools) for (const m of this.shotPools[kind]) m.visible = false;
  }
}
