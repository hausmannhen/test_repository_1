/* Low-Poly-Held: sechs Boxen, Schwert am Handgelenk, Schild, Helm in Seltenheitsfarbe */
import * as THREE from "three";
import { lambert, G } from "./materials.js";
import { RARITY_BY_ID } from "../game/items.js";

const DIR_ROT = { up: 0, down: Math.PI, left: Math.PI / 2, right: -Math.PI / 2 };

function mesh(geometry, material, x = 0, y = 0, z = 0) {
  const m = new THREE.Mesh(geometry, material);
  m.position.set(x, y, z);
  m.castShadow = true;
  return m;
}

export function buildPlayerModel() {
  const group = new THREE.Group();
  const tunic = lambert("#2e7d3a"), skin = lambert("#f1c9a0"), hair = lambert("#3b2a1a"), boots = lambert("#5a3a1e");
  const blade = lambert("#d8d8e0"), hilt = lambert("#8a5a3a"), shieldMat = lambert("#8a6a3a");
  const helmMat = new THREE.MeshLambertMaterial({ color: new THREE.Color("#ffffff") });

  // Beine (Gelenk an der Hüfte, y = 0.4)
  const hipL = new THREE.Group(), hipR = new THREE.Group();
  hipL.position.set(-0.11, 0.4, 0); hipR.position.set(0.11, 0.4, 0);
  hipL.add(mesh(G.hang(0.16, 0.4, 0.16), boots)); hipR.add(mesh(G.hang(0.16, 0.4, 0.16), boots));
  // Rumpf
  const torso = mesh(G.box(0.42, 0.42, 0.26), tunic, 0, 0.38, 0);
  const belt = mesh(G.box(0.44, 0.06, 0.28), boots, 0, 0.42, 0);
  // Kopf
  const head = mesh(G.box(0.36, 0.32, 0.34), skin, 0, 0.8, 0);
  const hairTop = mesh(G.box(0.38, 0.1, 0.36), hair, 0, 1.1, 0);
  const hairBack = mesh(G.box(0.38, 0.2, 0.08), hair, 0, 0.92, 0.15);
  const eyeL = mesh(G.box(0.05, 0.05, 0.02), lambert("#1a1a24"), -0.08, 0.96, -0.17);
  const eyeR = mesh(G.box(0.05, 0.05, 0.02), lambert("#1a1a24"), 0.08, 0.96, -0.17);
  const helm = mesh(G.box(0.42, 0.14, 0.4), helmMat, 0, 1.1, 0); helm.visible = false;
  // Arme (Schulter y = 0.78); rechts: Schwungachse (y) um den Arm (x)
  const shoulderL = new THREE.Group(), shoulderR = new THREE.Group();
  shoulderL.position.set(-0.28, 0.78, 0); shoulderR.position.set(0.28, 0.78, 0);
  const armL = new THREE.Group(), armR = new THREE.Group();
  armL.add(mesh(G.hang(0.12, 0.38, 0.12), tunic)); armR.add(mesh(G.hang(0.12, 0.38, 0.12), tunic));
  const handL = mesh(G.box(0.12, 0.1, 0.12), skin, 0, -0.44, 0);
  const handR = mesh(G.box(0.12, 0.1, 0.12), skin, 0, -0.44, 0);
  armL.add(handL); armR.add(handR);
  shoulderL.add(armL); shoulderR.add(armR);
  // Schwert verlängert den rechten Arm
  const sword = new THREE.Group();
  sword.position.set(0, -0.4, 0);
  const bladeMesh = mesh(G.hang(0.06, 0.62, 0.05), blade, 0, -0.04, 0);
  const guard = mesh(G.box(0.2, 0.05, 0.06), hilt, 0, -0.06, 0);
  sword.add(bladeMesh, guard);
  armR.add(sword);
  // Schild am linken Arm
  const shield = mesh(G.box(0.06, 0.34, 0.3), shieldMat, -0.09, -0.34, 0); shield.visible = false;
  armL.add(shield);

  group.add(hipL, hipR, torso, belt, head, hairTop, hairBack, eyeL, eyeR, helm, shoulderL, shoulderR);
  const state = { rot: 0 };

  function update(G, time, pos) {
    const P = G.P;
    group.position.copy(pos);
    // Blinken bei Unverwundbarkeit
    group.visible = !(G.invT > 0 && Math.floor(time * 20) % 2 === 0);
    const a = G.attack;
    const dir = a.t > 0 ? a.dir : P.dir;
    const target = DIR_ROT[dir] ?? 0;
    let diff = target - state.rot;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    state.rot += diff * 0.35;
    group.rotation.y = state.rot;
    // Gehen
    const walking = G.walkT > 0;
    const sw = walking ? Math.sin(G.walkT * 14) * 0.55 : 0;
    hipL.rotation.x = sw; hipR.rotation.x = -sw;
    armL.rotation.x = -sw * 0.8;
    group.position.y += walking ? Math.abs(Math.sin(G.walkT * 14)) * 0.04 : 0;
    // Schwerthieb: Arm nach vorn heben, seitlich durchziehen
    if (a.t > 0) {
      const prog = 1 - a.t / a.maxT;
      const lift = Math.sin(Math.min(1, prog * 1.6) * Math.PI / 2);
      armR.rotation.x = 1.3 * lift + 0.2;
      shoulderR.rotation.y = 1.1 - prog * 2.2;
      torso.rotation.y = 0.25 - prog * 0.5;
    } else {
      armR.rotation.x = sw * 0.8;
      shoulderR.rotation.y = 0;
      torso.rotation.y = 0;
    }
    // Ausrüstung
    shield.visible = !!P.equip.schild;
    if (P.equip.kopf) { helm.visible = true; helmMat.color.set(RARITY_BY_ID[P.equip.kopf.rarity].color); }
    else helm.visible = false;
  }
  return { group, update };
}
