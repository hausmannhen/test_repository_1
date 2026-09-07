/* Renderer: Szene, Kamera, Licht, Bildschirm-Gruppen, Kamera-Slide beim Wechsel.
   Die Engine rechnet in Pixeln (16 px = 1 Tile); hier wird nach Welt (x, 0, y) umgerechnet. */
import * as THREE from "three";
import { TS, VW, VH } from "../game/constants.js";
import { buildTerrain, terrainHeight } from "./terrain.js";
import { buildDecor } from "./decor.js";
import { buildPlayerModel } from "./player.js";
import { buildMobModel, buildNpcModel } from "./monster.js";
import { textTexture } from "./effects.js";
import { NPCS } from "../data/npcs.js";
import { talkTo } from "../game/quests.js";
import { buildDropModel } from "./drops.js";
import { Effects } from "./effects.js";
import { disposeObject, lambert, G as GEO } from "./materials.js";

const SKY = {
  wiese:  { sky: "#9fd3ff", ground: "#4f7a3a", sun: "#fff1d0", sunI: 2.6, hemiI: 1.1 },
  wald:   { sky: "#6f9fb0", ground: "#2a4a2a", sun: "#e8f0d0", sunI: 2.0, hemiI: 1.0 },
  berg:   { sky: "#b8c8d8", ground: "#5a5a52", sun: "#fff4e0", sunI: 2.5, hemiI: 1.0 },
  wueste: { sky: "#ffd9a0", ground: "#a08a5a", sun: "#fff0c0", sunI: 3.2, hemiI: 1.1 },
  sumpf:  { sky: "#8a9a80", ground: "#2a3a22", sun: "#d8e0c0", sunI: 1.6, hemiI: 1.0 },
  eis:    { sky: "#dfeeff", ground: "#7a8a9a", sun: "#f0f6ff", sunI: 2.8, hemiI: 1.2 },
  vulkan: { sky: "#4a2a28", ground: "#3a1a10", sun: "#ff9a5a", sunI: 1.8, hemiI: 0.8 },
  dungeon:{ sky: "#07060a", ground: "#100c0a", sun: "#000000", sunI: 0, hemiI: 0.12 },
};
const CAM_DIR = new THREE.Vector3(0, 9, 7).normalize();
const BASE_DIST = Math.hypot(0, 9, 7);
const smoothstep = (t) => t <= 0 ? 0 : t >= 1 ? 1 : t * t * (3 - 2 * t);

export class Renderer3D {
  constructor(canvas) {
    this.canvas = canvas;
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: "high-performance" });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.05;
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(35, 1, 0.5, 80);
    this.width = 1; this.height = 1;

    this.sun = new THREE.DirectionalLight(0xfff1d0, 2.6);
    this.sun.position.set(VW / 2 + 5, 14, VH / 2 + 6);
    this.sun.target.position.set(VW / 2, 0, VH / 2);
    this.sun.castShadow = true;
    this.sun.shadow.mapSize.set(1536, 1536);
    const sc = this.sun.shadow.camera;
    sc.left = -10; sc.right = 10; sc.top = 8; sc.bottom = -8; sc.near = 1; sc.far = 40;
    sc.updateProjectionMatrix();
    this.sun.shadow.bias = -0.0008;
    this.sun.shadow.normalBias = 0.02;
    this.scene.add(this.sun, this.sun.target);
    this.hemi = new THREE.HemisphereLight(0x9fd3ff, 0x4f7a3a, 1.1);
    this.scene.add(this.hemi);
    // Aufhelllicht von der Gegenseite, ohne Schatten, nimmt den Schatten die Härte
    this.fill = new THREE.DirectionalLight(0xcfe0ff, 0.5);
    this.fill.position.set(VW / 2 - 8, 6, VH / 2 - 4);
    this.scene.add(this.fill);
    this.playerLight = new THREE.PointLight(0xffb070, 0, 9, 1.6);
    this.scene.add(this.playerLight);

    // weite Bodenfläche unter dem Bildschirm, damit hinter den Rändern kein Leerraum sichtbar wird
    this.floor = new THREE.Mesh(new THREE.PlaneGeometry(80, 80), new THREE.MeshStandardMaterial({ color: new THREE.Color("#4f7a3a"), roughness: 1 }));
    this.floor.rotation.x = -Math.PI / 2;
    this.floor.position.set(VW / 2, -0.5, VH / 2);
    this.floor.receiveShadow = true;
    this.scene.add(this.floor);

    this.player = buildPlayerModel();
    this.scene.add(this.player.group);
    this.mobs = new Map();
    this.drops = new Map();
    this.npcs = [];
    this.markerMats = {};
    // Palisaden an den vier Dorfausgängen, sichtbar während eines Überfalls
    this.palisades = new THREE.Group();
    const post = GEO.cyl(0.09, 0.11, 1.3, 6), beam = GEO.box(1, 0.12, 0.12);
    const wood = lambert("#6a4a2a", { roughness: 1 });
    const spots = [[6, 0.5, true], [7, 0.5, true], [8, 0.5, true], [6, VH - 0.5, true], [7, VH - 0.5, true], [8, VH - 0.5, true], [0.5, 4, false], [0.5, 5, false], [0.5, 6, false], [VW - 0.5, 4, false], [VW - 0.5, 5, false], [VW - 0.5, 6, false]];
    for (const [x, z, horizontal] of spots) {
      for (let i = -0.35; i <= 0.36; i += 0.35) {
        const p = new THREE.Mesh(post, wood);
        p.position.set(horizontal ? x + i : x, -0.1, horizontal ? z : z + i);
        p.rotation.z = (Math.random() - 0.5) * 0.12;
        p.castShadow = true;
        this.palisades.add(p);
      }
      const b = new THREE.Mesh(beam, wood);
      b.position.set(horizontal ? x : x, 0.7, horizontal ? z : z);
      if (!horizontal) b.rotation.y = Math.PI / 2;
      this.palisades.add(b);
    }
    this.palisades.visible = false;
    this.scene.add(this.palisades);
    this.effects = new Effects(this.scene);

    this.screenKey = null;
    this.current = null;     // { group, heights, liquids, chests }
    this.prev = null;        // Vorheriger Bildschirm während des Kamera-Slides
    this.camTarget = new THREE.Vector3(VW / 2, 0, VH / 2);
    this.camFrom = new THREE.Vector3();
    this.camDist = BASE_DIST;
    this.shakeT = 0;
    this._v = new THREE.Vector3();
    this._pos = new THREE.Vector3();
  }

  resize(w, h) {
    this.width = Math.max(1, w); this.height = Math.max(1, h);
    this.renderer.setSize(this.width, this.height, false);
    this.camera.aspect = this.width / this.height;
    // Horizontales Sichtfeld halten: Hochformat bekommt ein weiteres vertikales FOV
    const tanH = Math.tan(THREE.MathUtils.degToRad(35) / 2) * 1.5;
    let fov = THREE.MathUtils.radToDeg(2 * Math.atan(tanH / this.camera.aspect));
    fov = THREE.MathUtils.clamp(fov, 35, 62);
    this.camera.fov = fov;
    const tanV = Math.tan(THREE.MathUtils.degToRad(fov) / 2);
    this.camDist = Math.max(BASE_DIST, 11.5 / (2 * tanV * this.camera.aspect));
    this.halfW = this.camDist * tanV * this.camera.aspect;
    this.halfH = this.camDist * tanV * 0.75;
    this.camera.updateProjectionMatrix();
    if (this.current) this.applyEnvironment(this.current.screen);
  }

  /* ---------- Bildschirm ---------- */
  buildScreen(screen) {
    const terrain = buildTerrain(screen);
    const decor = buildDecor(screen, terrain.heights);
    terrain.group.add(decor.group);
    return { group: terrain.group, heights: terrain.heights, liquids: terrain.liquids, chests: decor.chests, screen };
  }
  disposeScreen(s) {
    if (!s) return;
    this.scene.remove(s.group);
    disposeObject(s.group);
  }
  markerMaterial(kind) {
    if (!this.markerMats[kind]) {
      const spec = { offer: ["!", "#ffd23f"], complete: ["✓", "#6fe28a"], progress: ["…", "#a8977a"] }[kind];
      this.markerMats[kind] = new THREE.SpriteMaterial({ map: textTexture(spec[0], spec[1], 64), transparent: true, depthTest: false });
    }
    return this.markerMats[kind];
  }
  buildNpcs(screen) {
    for (const n of this.npcs) { this.scene.remove(n.model.group, n.marker); n.model.dispose(); }
    this.npcs = [];
    for (const ref of screen.npcs || []) {
      const npc = NPCS[ref.id];
      if (!npc) continue;
      const model = buildNpcModel(npc);
      const marker = new THREE.Sprite(this.markerMaterial("offer"));
      marker.scale.set(0.5, 0.5, 1); marker.renderOrder = 25; marker.visible = false;
      this.scene.add(model.group, marker);
      this.npcs.push({ id: npc.id, x: ref.x + 0.5, z: ref.y + 0.5, model, marker });
    }
  }
  applyEnvironment(screen) {
    const env = screen.dungeonRoom ? SKY.dungeon : SKY[screen.region] || SKY.wiese;
    const sky = new THREE.Color(env.sky);
    this.scene.background = sky;
    const d = this.camDist;
    if (screen.dungeonRoom) {
      this.scene.fog = new THREE.Fog(sky, d + 2, d + 8);
      this.sun.intensity = 0; this.sun.castShadow = false; this.fill.intensity = 0;
      this.playerLight.intensity = 45;
      this.playerLight.color.set(screen.dungeonRoom.d.id === 2 ? "#ff8a50" : "#ffb070");
    } else {
      this.scene.fog = new THREE.Fog(sky, d + 2, d + 13);
      this.sun.intensity = env.sunI; this.sun.castShadow = true; this.fill.intensity = env.sunI * 0.2;
      this.sun.color.set(env.sun);
      this.playerLight.intensity = 0;
    }
    this.hemi.color.set(env.sky); this.hemi.groundColor.set(env.ground); this.hemi.intensity = env.hemiI;
    this.floor.material.color.set(env.ground);
  }
  syncScreen(G) {
    const screen = G.screen;
    if (screen.key === this.screenKey) return;
    const tr = G.transition;
    const slide = !!(tr && this.current && this.current.screen === tr.prevScreen);
    this.disposeScreen(this.prev); this.prev = null;
    if (slide) {
      // alten Bildschirm für den Slide behalten, um eine Bildschirmbreite versetzt
      this.prev = this.current;
      this.prev.group.position.set(-tr.dx * VW, 0, -tr.dy * VH);
      this.camFrom.copy(this.camTarget).add(this._v.set(-tr.dx * VW, 0, -tr.dy * VH));
    } else {
      this.disposeScreen(this.current);
    }
    this.current = this.buildScreen(screen);
    this.scene.add(this.current.group);
    this.screenKey = screen.key;
    this.applyEnvironment(screen);
    this.buildNpcs(screen);
    // Mobs und Drops des alten Bildschirms entfernen
    for (const [, mm] of this.mobs) { this.scene.remove(mm.group, mm.bar); mm.dispose(); }
    this.mobs.clear();
    for (const [, dm] of this.drops) this.scene.remove(dm.group);
    this.drops.clear();
    this.effects.clear();
    if (!slide) {
      // harter Wechsel (Dungeon, Respawn): Kamera direkt setzen
      this.camTarget.copy(this.clampedTarget(G.P.x / TS, G.P.y / TS));
    }
  }

  /* ---------- Kamera ---------- */
  clampedTarget(px, pz) {
    const hw = this.halfW || 6, hh = this.halfH || 4;
    const x = hw * 2 >= VW ? VW / 2 : THREE.MathUtils.clamp(px, hw, VW - hw);
    const z = hh * 2 >= VH ? VH / 2 : THREE.MathUtils.clamp(pz, hh, VH - hh);
    return this._v.set(x, 0, z);
  }
  groundY(x, z) {
    return this.current ? terrainHeight(this.current.heights, x, z) : 0;
  }
  toWorld(px, py) {
    const x = px / TS, z = py / TS;
    return { x, y: Math.max(-0.05, this.groundY(x, z)), z };
  }

  render(G, dt) {
    if (!G || !G.screen) return;
    this.syncScreen(G);
    const P = G.P;
    const time = G.time;
    const tr = G.transition;
    if (!tr && this.prev) { this.disposeScreen(this.prev); this.prev = null; }

    // Spielerposition (während des Slides interpoliert)
    let px = P.x / TS, pz = P.y / TS;
    let k = 1;
    if (tr && this.prev) {
      k = smoothstep(tr.t / tr.dur);
      const fx = tr.fromX / TS - tr.dx * VW, fz = tr.fromY / TS - tr.dy * VH;
      px = fx + (px - fx) * k; pz = fz + (pz - fz) * k;
    }
    const py = px >= 0 && px <= VW && pz >= 0 && pz <= VH ? this.groundY(px, pz) : 0;
    this._pos.set(px, Math.max(-0.05, py), pz);
    this.player.update(G, time, this._pos);
    this.playerLight.position.set(px, 2.2, pz);

    // Kamera folgt weich, beim Slide von alter zu neuer Position
    const want = this.clampedTarget(P.x / TS, P.y / TS).clone();
    if (tr && this.prev) this.camTarget.lerpVectors(this.camFrom, want, k);
    else this.camTarget.lerp(want, 1 - Math.pow(0.001, dt));
    this.camera.position.copy(this.camTarget).addScaledVector(CAM_DIR, this.camDist);
    if (G.shake > 0) { this.camera.position.x += (Math.random() - 0.5) * 0.15; this.camera.position.z += (Math.random() - 0.5) * 0.15; }
    this.camera.lookAt(this.camTarget);

    // Monster
    const seen = new Set();
    for (const m of G.mobs) {
      seen.add(m.id);
      let mm = this.mobs.get(m.id);
      if (!mm) { mm = buildMobModel(m); this.scene.add(mm.group, mm.bar); this.mobs.set(m.id, mm); }
      const p = this.toWorld(m.x, m.y);
      mm.update(m, time, dt, this._pos.set(p.x, p.y, p.z));
      mm.bar.quaternion.copy(this.camera.quaternion);
    }
    for (const [id, mm] of this.mobs) {
      if (!seen.has(id)) { this.scene.remove(mm.group, mm.bar); mm.dispose(); this.mobs.delete(id); }
    }
    // Palisaden
    this.palisades.visible = !!(G.raid && G.raid.state !== "done");
    // Bewohner
    for (const n of this.npcs) {
      const y = this.groundY(n.x, n.z);
      n.model.update(time, this._v.set(n.x, y, n.z), this._pos.set(P.x / TS, 0, P.y / TS));
      const mode = talkTo(G, n.id).mode;
      const show = mode === "offer" || mode === "complete" || mode === "progress";
      n.marker.visible = show;
      if (show) { n.marker.material = this.markerMaterial(mode); n.marker.position.set(n.x, y + 1.55 + Math.sin(time * 3) * 0.05, n.z); }
    }
    // Drops
    const seenD = new Set();
    for (const dr of G.drops) {
      seenD.add(dr);
      let dm = this.drops.get(dr);
      if (!dm) { dm = buildDropModel(dr); this.scene.add(dm.group); this.drops.set(dr, dm); }
      const p = this.toWorld(dr.x, dr.y);
      dm.update(dr, time, this._pos.set(p.x, p.y, p.z));
    }
    for (const [dr, dm] of this.drops) {
      if (!seenD.has(dr)) { this.scene.remove(dm.group); this.drops.delete(dr); }
    }
    // Truhen
    if (this.current) for (const ch of this.current.chests) ch.userData.setOpened(!!(ch.userData.chestId && P.chests[ch.userData.chestId]));
    // Wasser, Lava
    for (const s of [this.current, this.prev]) if (s) for (const l of s.liquids) l.material.uniforms.uTime.value = time;
    // Effekte
    this.effects.update(G, time, (x, y) => this.toWorld(x, y));

    this.renderer.render(this.scene, this.camera);
  }

  dispose() {
    for (const n of this.npcs) n.model.dispose();
    this.disposeScreen(this.current); this.disposeScreen(this.prev);
    for (const [, mm] of this.mobs) mm.dispose();
    this.renderer.dispose();
  }
}
