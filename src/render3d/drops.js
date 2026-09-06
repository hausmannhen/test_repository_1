/* Drops: Gold, Tränke, Items mit Seltenheitsglow */
import * as THREE from "three";
import { lambert, basic, G } from "./materials.js";
import { RARITY_BY_ID, POTIONS } from "../game/items.js";

export function buildDropModel(dr) {
  const group = new THREE.Group();
  let spin = null;
  if (dr.type === "gold") {
    const coin = new THREE.Mesh(G.cyl(0.13, 0.13, 0.05, 10), lambert("#ffd23f", { emissive: new THREE.Color("#7a5a00") }));
    coin.rotation.x = Math.PI / 2;
    coin.position.y = 0.14;
    group.add(coin); spin = coin;
    coin.castShadow = true;
  } else if (dr.type === "potion") {
    const col = POTIONS[dr.id].color;
    const body = new THREE.Mesh(G.sphere(0.13, 8), lambert(col, { emissive: new THREE.Color(col), emissiveIntensity: 0.25 }));
    body.position.y = 0.16;
    const neck = new THREE.Mesh(G.cyl(0.05, 0.06, 0.12, 6), lambert("#e9dcb8"));
    neck.position.y = 0.26;
    group.add(body, neck); spin = group;
  } else {
    const col = RARITY_BY_ID[dr.item.rarity].color;
    const gem = new THREE.Mesh(G.octa(0.2), lambert(col, { emissive: new THREE.Color(col), emissiveIntensity: 0.45 }));
    gem.position.y = 0.3; gem.castShadow = true;
    const glow = new THREE.Mesh(G.octa(0.34), basic(col, { transparent: true, opacity: 0.22, depthWrite: false }));
    glow.position.y = 0.3;
    group.add(gem, glow); spin = group;
    group.userData.glow = glow;
  }
  function update(dr, time, pos) {
    group.position.copy(pos);
    group.position.y += Math.sin(time * 5 + dr.x) * 0.05;
    if (spin) spin.rotation.y = time * 2.5;
    if (group.userData.glow) { const k = 1 + Math.sin(time * 6) * 0.12; group.userData.glow.scale.setScalar(k); }
  }
  return { group, update };
}
