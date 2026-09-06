/* Effekte: Schadenszahlen als Sprites, Partikel als Points, Projektile aus einem Pool */
import * as THREE from "three";
import { basic, G } from "./materials.js";

const MAX_PARTICLES = 512;
const textureCache = new Map();

function textTexture(text, color, size) {
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

export class Effects {
  constructor(scene) {
    this.scene = scene;
    this.sprites = [];
    this.spriteByFx = new Map();
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
    // Projektile
    this.projPool = [];
    this.projGroup = new THREE.Group();
    scene.add(this.projGroup);
  }
  color(hex) {
    if (!this.colorCache.has(hex)) this.colorCache.set(hex, new THREE.Color(hex));
    return this.colorCache.get(hex);
  }
  update(G, time, toWorld) {
    // --- Schadenszahlen ---
    const alive = new Set();
    for (const f of G.fx) {
      if (f.kind !== "num") continue;
      alive.add(f);
      let sp = this.spriteByFx.get(f);
      if (!sp) {
        const size = f.big ? 56 : f.small ? 34 : 44;
        const mat = new THREE.SpriteMaterial({ map: textTexture(f.text, f.color, size), transparent: true, depthTest: false });
        sp = new THREE.Sprite(mat);
        sp.renderOrder = 30;
        const sc = f.big ? 1.6 : f.small ? 1.0 : 1.3;
        sp.scale.set(sc, sc * 0.375, 1);
        sp.userData.maxT = f.t;
        this.scene.add(sp);
        this.spriteByFx.set(f, sp);
      }
      const p = toWorld(f.x, f.y);
      sp.position.set(p.x, p.y + 1.0 + f.rise / 16 * 1.4, p.z);
      sp.material.opacity = Math.min(1, f.t / 0.3);
    }
    for (const [f, sp] of this.spriteByFx) {
      if (!alive.has(f)) { this.scene.remove(sp); sp.material.dispose(); this.spriteByFx.delete(f); }
    }
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
    // --- Projektile ---
    for (let i = 0; i < G.projs.length; i++) {
      const pr = G.projs[i];
      let m = this.projPool[i];
      if (!m) {
        m = new THREE.Mesh(G_ico(), basic("#ffffff"));
        this.projPool.push(m); this.projGroup.add(m);
      }
      m.visible = true;
      m.material = basic(pr.color);
      const p = toWorld(pr.x, pr.y);
      m.position.set(p.x, p.y + 0.5, p.z);
      m.rotation.y = time * 6;
    }
    for (let i = G.projs.length; i < this.projPool.length; i++) this.projPool[i].visible = false;
  }
  clear() {
    for (const [, sp] of this.spriteByFx) { this.scene.remove(sp); sp.material.dispose(); }
    this.spriteByFx.clear();
    this.pGeo.setDrawRange(0, 0);
    for (const m of this.projPool) m.visible = false;
  }
}
function G_ico() { return G.ico(0.12, 0); }
