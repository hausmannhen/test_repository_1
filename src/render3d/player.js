/* Held: Kapseln und Kugeln statt Klötze. Waffe je Typ: Schwert, Bogen, Armbrust, Wurfmesser, Stab. */
import * as THREE from "three";
import { lambert, G } from "./materials.js";
import { RARITY_BY_ID } from "../game/items.js";
import { derive } from "../game/player.js";
import { SPELLS, ELEMENTS } from "../data/spells.js";

const DIR_ROT = { up: 0, down: Math.PI, left: Math.PI / 2, right: -Math.PI / 2 };

function mesh(geometry, material, x = 0, y = 0, z = 0) {
  const m = new THREE.Mesh(geometry, material);
  m.position.set(x, y, z);
  m.castShadow = true;
  return m;
}

export function buildPlayerModel() {
  const group = new THREE.Group();
  const tunic = lambert("#2f6f3a", { roughness: 0.9 }), skin = lambert("#e8bf98", { roughness: 0.7 }), hair = lambert("#3b2a1a"), boots = lambert("#4a3018", { roughness: 0.95 });
  const leather = lambert("#6a4a2a"), steel = lambert("#c8c8d0", { roughness: 0.35, metalness: 0.7 }), wood = lambert("#7a5a36");
  const helmMat = new THREE.MeshStandardMaterial({ color: new THREE.Color("#ffffff"), roughness: 0.4, metalness: 0.6 });
  const orbMat = new THREE.MeshStandardMaterial({ color: new THREE.Color("#8ad0ff"), emissive: new THREE.Color("#4a90ff"), emissiveIntensity: 0.6, roughness: 0.3 });

  // Beine (Gelenk an der Hüfte)
  const hipL = new THREE.Group(), hipR = new THREE.Group();
  hipL.position.set(-0.1, 0.42, 0); hipR.position.set(0.1, 0.42, 0);
  hipL.add(mesh(G.hangCapsule(0.075, 0.24), boots)); hipR.add(mesh(G.hangCapsule(0.075, 0.24), boots));
  // Rumpf und Gürtel
  const torso = mesh(G.capsule(0.19, 0.22), tunic, 0, 0.62, 0);
  torso.scale.set(1, 1, 0.75);
  const belt = mesh(G.cyl(0.2, 0.2, 0.06, 12), leather, 0, 0.44, 0);
  belt.scale.set(1, 1, 0.78);
  // Kopf
  const head = mesh(G.sphere(0.17, 12), skin, 0, 0.98, 0);
  const hairTop = mesh(G.sphere(0.175, 12), hair, 0, 1.02, 0.01);
  hairTop.scale.set(1, 0.75, 1);
  const eyeL = mesh(G.sphere(0.02, 6), lambert("#1a1a24"), -0.06, 0.99, -0.155);
  const eyeR = mesh(G.sphere(0.02, 6), lambert("#1a1a24"), 0.06, 0.99, -0.155);
  const helm = mesh(G.sphere(0.19, 12), helmMat, 0, 1.03, 0); helm.scale.set(1, 0.8, 1); helm.visible = false;
  // Arme (Schulter); rechts: Schwungachse (y) um den Arm (x)
  const shoulderL = new THREE.Group(), shoulderR = new THREE.Group();
  shoulderL.position.set(-0.24, 0.8, 0); shoulderR.position.set(0.24, 0.8, 0);
  const armL = new THREE.Group(), armR = new THREE.Group();
  armL.add(mesh(G.hangCapsule(0.06, 0.22, 0.06), tunic)); armR.add(mesh(G.hangCapsule(0.06, 0.22), tunic));
  const handL = mesh(G.sphere(0.06, 8), skin, 0, -0.38, 0);
  const handR = mesh(G.sphere(0.06, 8), skin, 0, -0.38, 0);
  armL.add(handL); armR.add(handR);
  shoulderL.add(armL); shoulderR.add(armR);

  // Waffen an der rechten Hand
  const weapons = {};
  const sword = new THREE.Group();
  sword.add(mesh(G.hang(0.05, 0.62, 0.02), steel, 0, -0.04, 0), mesh(G.box(0.18, 0.04, 0.05), leather, 0, -0.07, 0), mesh(G.cyl(0.02, 0.025, 0.1, 6), leather, 0, -0.02, 0));
  weapons.nah = sword;
  const staff = new THREE.Group();
  const shaft = mesh(G.cyl(0.02, 0.025, 1.2, 8), wood, 0, -0.5, 0);
  const orb = mesh(G.ico(0.07, 1), orbMat, 0, 0.75, 0);
  staff.add(shaft, orb);
  weapons.fokus = staff;
  const bow = new THREE.Group();
  const bowArc = mesh(G.torus(0.34, 0.018, Math.PI), wood, 0, 0, 0);
  bowArc.rotation.z = Math.PI / 2; bowArc.rotation.y = Math.PI / 2;
  const string = mesh(G.box(0.006, 0.68, 0.006), lambert("#e8e2d0"), 0, 0, 0.0);
  bow.add(bowArc, string);
  weapons.pfeil = bow;
  const crossbow = new THREE.Group();
  crossbow.add(mesh(G.box(0.05, 0.05, 0.45), wood, 0, 0, -0.1), mesh(G.box(0.5, 0.03, 0.03), steel, 0, 0.02, -0.28));
  weapons.bolzen = crossbow;
  const knife = new THREE.Group();
  knife.add(mesh(G.hang(0.03, 0.22, 0.015), steel, 0, 0, 0), mesh(G.box(0.03, 0.06, 0.02), leather, 0, 0, 0));
  weapons.messer = knife;
  const axe = new THREE.Group();
  axe.add(mesh(G.hang(0.025, 0.4, 0.025), wood, 0, 0, 0), mesh(G.box(0.16, 0.14, 0.02), steel, 0.06, -0.28, 0));
  weapons.axt = axe;
  for (const k in weapons) { weapons[k].position.set(0, -0.4, 0); weapons[k].visible = false; armR.add(weapons[k]); }
  // Schild am linken Arm
  const shield = mesh(G.cyl(0.19, 0.19, 0.04, 12), leather, -0.09, -0.34, 0);
  shield.rotation.z = Math.PI / 2; shield.visible = false;
  armL.add(shield);

  group.add(hipL, hipR, torso, belt, head, hairTop, eyeL, eyeR, helm, shoulderL, shoulderR);
  const state = { rot: 0 };

  function update(G, time, pos) {
    const P = G.P;
    const d = derive(P);
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
    // Waffe
    const wkey = d.weaponType === "fern" ? d.proj : d.weaponType;
    for (const k in weapons) weapons[k].visible = k === wkey;
    // Gehen
    const walking = G.walkT > 0;
    const sw = walking ? Math.sin(G.walkT * 14) * 0.55 : 0;
    hipL.rotation.x = sw; hipR.rotation.x = -sw;
    armL.rotation.x = -sw * 0.8;
    group.position.y += walking ? Math.abs(Math.sin(G.walkT * 14)) * 0.04 : 0;
    // Angriff und Zauber
    if (G.castT > 0) {
      armR.rotation.x = 1.4; armL.rotation.x = 1.2; shoulderR.rotation.y = 0; torso.rotation.y = 0;
      orbMat.emissiveIntensity = 2.5;
    } else if (a.t > 0 && a.ranged) {
      armR.rotation.x = 1.5; armL.rotation.x = 1.3; shoulderR.rotation.y = 0; torso.rotation.y = 0;
    } else if (a.t > 0) {
      const prog = 1 - a.t / a.maxT;
      const lift = Math.sin(Math.min(1, prog * 1.6) * Math.PI / 2);
      armR.rotation.x = 1.3 * lift + 0.2;
      shoulderR.rotation.y = 1.1 - prog * 2.2;
      torso.rotation.y = 0.25 - prog * 0.5;
    } else {
      armR.rotation.x = d.weaponType === "fern" ? 0.5 + sw * 0.3 : sw * 0.8;
      shoulderR.rotation.y = 0;
      torso.rotation.y = 0;
      orbMat.emissiveIntensity += (0.6 - orbMat.emissiveIntensity) * 0.1;
    }
    if (P.activeSpell && SPELLS[P.activeSpell]) { const el = ELEMENTS[SPELLS[P.activeSpell].element]; orbMat.emissive.set(el.color); orbMat.color.set(el.color2); }
    // Ausrüstung
    shield.visible = !!P.equip.schild && d.weaponType !== "fern" && !/koecher|zauberbuch/.test(P.equip.schild.baseId || "");
    if (P.equip.kopf) { helm.visible = true; hairTop.visible = false; helmMat.color.set(RARITY_BY_ID[P.equip.kopf.rarity].color); }
    else { helm.visible = false; hairTop.visible = true; }
  }
  return { group, update };
}
