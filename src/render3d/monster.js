/* Monster-Shapes: blob, quad, ghost, bat, golem, skel, human. Farben aus MOBS. */
import * as THREE from "three";
import { lambert, basic, G } from "./materials.js";

function mesh(geometry, material, x = 0, y = 0, z = 0) {
  const m = new THREE.Mesh(geometry, material);
  m.position.set(x, y, z);
  m.castShadow = true;
  return m;
}

export function buildMobModel(m) {
  const s = m.size / 16;
  const c1 = new THREE.MeshStandardMaterial({ color: new THREE.Color(m.color), roughness: 0.85 });
  const c2 = new THREE.MeshStandardMaterial({ color: new THREE.Color(m.color2), roughness: 0.85 });
  const mats = [c1, c2];
  const group = new THREE.Group();
  const parts = {};
  const red = basic("#ff3b3b"), dark = lambert("#1a1a24"), skin = lambert("#e0b48a");

  switch (m.shape) {
    case "blob": {
      parts.body = mesh(G.ico(0.5, 2), c1, 0, s * 0.35, 0);
      parts.body.scale.set(s, s * 0.7, s);
      group.add(parts.body);
      group.add(mesh(G.box(0.1 * s, 0.1 * s, 0.04), c2, -0.15 * s, s * 0.42, -0.45 * s));
      group.add(mesh(G.box(0.1 * s, 0.1 * s, 0.04), c2, 0.15 * s, s * 0.42, -0.45 * s));
      break;
    }
    case "quad": {
      const body = mesh(G.capsule(0.22, 0.5), c1, 0, 0.52 * s, 0); body.rotation.x = Math.PI / 2; body.scale.setScalar(s);
      group.add(body);
      const headM = mesh(G.sphere(0.2, 10), c1, 0, 0.66 * s, -0.5 * s); headM.scale.set(s, s * 0.9, s * 1.1);
      group.add(headM);
      group.add(mesh(G.box(0.1 * s, 0.14 * s, 0.06 * s), c1, -0.14 * s, 0.86 * s, -0.5 * s));
      group.add(mesh(G.box(0.1 * s, 0.14 * s, 0.06 * s), c1, 0.14 * s, 0.86 * s, -0.5 * s));
      group.add(mesh(G.box(0.06 * s, 0.06 * s, 0.03), red, -0.1 * s, 0.7 * s, -0.7 * s));
      group.add(mesh(G.box(0.06 * s, 0.06 * s, 0.03), red, 0.1 * s, 0.7 * s, -0.7 * s));
      parts.legs = [];
      for (const [lx, lz] of [[-0.3, -0.18], [0.3, -0.18], [-0.3, 0.18], [0.3, 0.18]]) {
        const hip = new THREE.Group(); hip.position.set(lx * s, 0.32 * s, lz * s);
        hip.add(mesh(G.hang(0.12 * s, 0.32 * s, 0.12 * s), c2));
        group.add(hip); parts.legs.push(hip);
      }
      parts.tail = mesh(G.box(0.08 * s, 0.08 * s, 0.4 * s), c2, 0, 0.5 * s, 0.45 * s);
      group.add(parts.tail);
      break;
    }
    case "ghost": {
      parts.body = new THREE.Group();
      const skirt = mesh(G.icone(0.45, 0.8), c1, 0, 0.55 * s, 0); skirt.scale.set(s, s, s);
      const head = mesh(G.ico(0.42, 1), c1, 0, 0.95 * s, 0); head.scale.set(s, s * 0.9, s);
      const eyeL = mesh(G.box(0.1 * s, 0.14 * s, 0.04), c2, -0.14 * s, 0.98 * s, -0.4 * s);
      const eyeR = mesh(G.box(0.1 * s, 0.14 * s, 0.04), c2, 0.14 * s, 0.98 * s, -0.4 * s);
      parts.body.add(skirt, head, eyeL, eyeR);
      group.add(parts.body);
      c1.transparent = true; c1.opacity = 0.85;
      break;
    }
    case "bat": {
      parts.body = new THREE.Group();
      parts.body.position.y = 0.9;
      parts.body.add(mesh(G.box(0.26 * s, 0.34 * s, 0.2 * s), c1, 0, -0.17 * s, 0));
      parts.body.add(mesh(G.box(0.05 * s, 0.05 * s, 0.03), red, -0.06 * s, 0.05 * s, -0.11 * s));
      parts.body.add(mesh(G.box(0.05 * s, 0.05 * s, 0.03), red, 0.06 * s, 0.05 * s, -0.11 * s));
      parts.wings = [];
      for (const side of [-1, 1]) {
        const pivot = new THREE.Group(); pivot.position.set(side * 0.12 * s, 0, 0);
        const wing = mesh(G.box(0.55 * s, 0.03, 0.3 * s), c2, side * 0.3 * s, 0, 0);
        pivot.add(wing); parts.body.add(pivot); parts.wings.push(pivot);
      }
      group.add(parts.body);
      break;
    }
    case "golem": {
      const eye = basic("#ffb03a");
      group.add(mesh(G.box(0.28 * s, 0.4 * s, 0.3 * s), c2, -0.22 * s, 0, 0));
      group.add(mesh(G.box(0.28 * s, 0.4 * s, 0.3 * s), c2, 0.22 * s, 0, 0));
      group.add(mesh(G.box(0.82 * s, 0.7 * s, 0.5 * s), c1, 0, 0.36 * s, 0));
      group.add(mesh(G.box(0.4 * s, 0.34 * s, 0.4 * s), c2, 0, 1.06 * s, -0.05 * s));
      group.add(mesh(G.box(0.08 * s, 0.06 * s, 0.03), eye, -0.1 * s, 1.2 * s, -0.26 * s));
      group.add(mesh(G.box(0.08 * s, 0.06 * s, 0.03), eye, 0.1 * s, 1.2 * s, -0.26 * s));
      parts.arms = [];
      for (const side of [-1, 1]) {
        const sh = new THREE.Group(); sh.position.set(side * 0.55 * s, 1.0 * s, 0);
        sh.add(mesh(G.hang(0.24 * s, 0.7 * s, 0.26 * s), c2));
        group.add(sh); parts.arms.push(sh);
      }
      break;
    }
    case "skel": {
      group.add(mesh(G.box(0.08 * s, 0.38 * s, 0.08 * s), c1, -0.1 * s, 0, 0));
      group.add(mesh(G.box(0.08 * s, 0.38 * s, 0.08 * s), c1, 0.1 * s, 0, 0));
      group.add(mesh(G.box(0.3 * s, 0.08 * s, 0.12 * s), c1, 0, 0.38 * s, 0));
      group.add(mesh(G.box(0.08 * s, 0.3 * s, 0.08 * s), c1, 0, 0.46 * s, 0));
      group.add(mesh(G.box(0.36 * s, 0.28 * s, 0.2 * s), c1, 0, 0.56 * s, 0));
      group.add(mesh(G.box(0.26 * s, 0.26 * s, 0.26 * s), c1, 0, 0.86 * s, 0));
      group.add(mesh(G.box(0.06 * s, 0.07 * s, 0.03), c2, -0.06 * s, 1.0 * s, -0.13 * s));
      group.add(mesh(G.box(0.06 * s, 0.07 * s, 0.03), c2, 0.06 * s, 1.0 * s, -0.13 * s));
      parts.arms = [];
      for (const side of [-1, 1]) {
        const sh = new THREE.Group(); sh.position.set(side * 0.24 * s, 0.82 * s, 0);
        sh.add(mesh(G.hang(0.07 * s, 0.36 * s, 0.07 * s), c1));
        group.add(sh); parts.arms.push(sh);
      }
      parts.legs = [];
      break;
    }
    case "human":
    default: {
      const hipL = new THREE.Group(), hipR = new THREE.Group();
      hipL.position.set(-0.1 * s, 0.4 * s, 0); hipR.position.set(0.1 * s, 0.4 * s, 0);
      hipL.add(mesh(G.hang(0.15 * s, 0.4 * s, 0.15 * s), c2)); hipR.add(mesh(G.hang(0.15 * s, 0.4 * s, 0.15 * s), c2));
      group.add(hipL, hipR);
      group.add(mesh(G.box(0.42 * s, 0.42 * s, 0.26 * s), c1, 0, 0.38 * s, 0));
      group.add(mesh(G.box(0.32 * s, 0.3 * s, 0.3 * s), skin, 0, 0.8 * s, 0));
      group.add(mesh(G.box(0.4 * s, 0.12 * s, 0.38 * s), c2, 0, 1.08 * s, 0));
      group.add(mesh(G.cone(0.2 * s, 0.35 * s, 5), c2, 0, 1.18 * s, 0));
      group.add(mesh(G.box(0.04 * s, 0.05 * s, 0.02), dark, -0.07 * s, 0.95 * s, -0.16 * s));
      group.add(mesh(G.box(0.04 * s, 0.05 * s, 0.02), dark, 0.07 * s, 0.95 * s, -0.16 * s));
      parts.legs = [hipL, hipR];
      parts.arms = [];
      for (const side of [-1, 1]) {
        const sh = new THREE.Group(); sh.position.set(side * 0.27 * s, 0.78 * s, 0);
        sh.add(mesh(G.hang(0.12 * s, 0.38 * s, 0.12 * s), c1));
        group.add(sh); parts.arms.push(sh);
      }
      // Stab in der rechten Hand
      const staff = mesh(G.hang(0.05 * s, 1.1 * s, 0.05 * s), lambert("#6b4a2e"), 0.1 * s, 0.6 * s, -0.1 * s);
      const orb = mesh(G.ico(0.08 * s, 0), c2, 0.1 * s, 0.62 * s, -0.1 * s);
      parts.arms[1].add(staff, orb);
      break;
    }
  }
  group.traverse(o => { if (o.isMesh) o.castShadow = true; });

  // Lebensbalken (wird vom Renderer zur Kamera gedreht)
  const barW = m.boss ? 2.2 : m.mini ? 1.6 : s + 0.3;
  const bar = new THREE.Group();
  const barH = m.boss ? 0.2 : 0.16;
  const barEdge = new THREE.Mesh(G.plane(barW + 0.06, barH + 0.06), basic("#000000", { depthTest: false, transparent: true, opacity: 0.9 }));
  const barBg = new THREE.Mesh(G.plane(barW, barH), basic("#3a1010", { depthTest: false }));
  const barFg = new THREE.Mesh(G.plane(barW, barH), basic(m.boss ? "#ff1e1e" : m.mini ? "#ff4a2a" : "#e8302c", { depthTest: false }));
  barEdge.renderOrder = 19; barBg.renderOrder = 20; barFg.renderOrder = 21;
  barEdge.position.z = -0.001; barFg.position.z = 0.001;
  bar.add(barEdge, barBg, barFg);
  bar.visible = false;
  const height = m.shape === "bat" ? 1.3 : m.shape === "golem" ? 1.5 * s : m.shape === "ghost" ? 1.5 * s : 1.2 * s;

  const state = { rot: Math.PI, lastX: m.x, lastY: m.y };
  function update(m, time, dt, pos) {
    group.position.copy(pos);
    // Blickrichtung aus Bewegung
    const dx = m.x - state.lastX, dy = m.y - state.lastY;
    const moving = Math.hypot(dx, dy) > 0.05;
    if (moving) {
      const target = Math.atan2(-dx, -dy);
      let diff = target - state.rot;
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      state.rot += diff * 0.2;
    }
    state.lastX = m.x; state.lastY = m.y;
    group.rotation.y = state.rot;
    // Trefferblitz
    const flash = m.hitT > 0;
    for (const mat of mats) mat.emissive.setScalar(flash ? 0.9 : 0);
    // Animation
    const ph = time * 6 + m.t;
    if (m.shape === "blob") {
      const w = Math.sin(ph) * 0.08;
      parts.body.scale.set(s * (1 + w), s * 0.7 * (1 - w * 1.5), s * (1 + w));
    } else if (m.shape === "ghost") {
      parts.body.position.y = 0.15 + Math.sin(time * 4 + m.t) * 0.1;
      parts.body.rotation.y = Math.sin(time * 2 + m.t) * 0.2;
    } else if (m.shape === "bat") {
      parts.body.position.y = 0.9 + Math.sin(time * 5 + m.t) * 0.12;
      const f = Math.sin(time * 18 + m.t) * 0.7;
      parts.wings[0].rotation.z = f; parts.wings[1].rotation.z = -f;
    } else {
      const sw = moving ? Math.sin(time * 12 + m.t) * 0.5 : 0;
      if (parts.legs) parts.legs.forEach((l, i) => { l.rotation.x = i % 2 ? sw : -sw; });
      if (parts.arms) parts.arms.forEach((a, i) => { a.rotation.x = (i % 2 ? -sw : sw) * 0.6; });
      if (parts.tail) parts.tail.rotation.y = Math.sin(time * 8 + m.t) * 0.3;
      if (m.shape === "golem" && parts.arms) parts.arms.forEach(a => { a.rotation.x -= 0.2; });
    }
    // Lebensbalken
    bar.visible = m.hp < m.maxHp;
    if (bar.visible) {
      const f = Math.max(0, m.hp / m.maxHp);
      barFg.scale.x = f;
      barFg.position.x = -barW / 2 * (1 - f);
      bar.position.set(pos.x, pos.y + height + 0.25, pos.z);
    }
  }
  function dispose() { for (const mat of mats) mat.dispose(); }
  return { group, bar, update, dispose };
}

/* Bewohner: menschliche Figur, dreht sich zum Spieler, Marker über dem Kopf */
export function buildNpcModel(npc) {
  const fake = { size: 12, shape: "human", color: npc.color, color2: npc.color2, boss: false, mini: null, hp: 1, maxHp: 1, x: npc.x * 16 + 8, y: npc.y * 16 + 8, t: 0, hitT: 0 };
  const model = buildMobModel(fake);
  const state = { rot: Math.PI };
  function update(time, pos, playerPos) {
    model.group.position.copy(pos);
    model.group.position.y += Math.sin(time * 1.5 + npc.x) * 0.01;
    const dx = playerPos.x - pos.x, dz = playerPos.z - pos.z;
    const target = Math.hypot(dx, dz) < 3 ? Math.atan2(-dx, -dz) : Math.PI;
    let diff = target - state.rot;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    state.rot += diff * 0.08;
    model.group.rotation.y = state.rot;
  }
  return { group: model.group, update, dispose: model.dispose };
}
