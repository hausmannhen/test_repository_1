/* Aktionen aus den Panels: Ausrüsten, Handel, Schmied, Heilerin. Reine Zustandsänderungen. */
import { INVENTORY_MAX, derive, addToInventory } from "./player.js";
import { makePotion, POTIONS, upgradeCost } from "./items.js";

export function equipItem(P, it) {
  const old = P.equip[it.slot];
  P.inventory = P.inventory.filter(i => i !== it);
  if (old) P.inventory.push(old);
  P.equip[it.slot] = it;
  P.hp = Math.min(P.hp, derive(P).maxHp);
  return true;
}
export function unequipItem(P, it) {
  if (P.inventory.length >= INVENTORY_MAX) return false;
  P.equip[it.slot] = null;
  P.inventory.push(it);
  P.hp = Math.min(P.hp, derive(P).maxHp);
  return true;
}
export function dropItem(P, it) { P.inventory = P.inventory.filter(i => i !== it); }

export function buyPotion(P, id) {
  const p = POTIONS[id];
  if (P.gold < p.price) return false;
  P.gold -= p.price;
  addToInventory(P, makePotion(id, 1));
  return true;
}
export function sellItem(P, it) {
  const val = it.value;
  if (it.kind === "trank") { it.qty -= 1; if (it.qty <= 0) P.inventory = P.inventory.filter(i => i !== it); }
  else P.inventory = P.inventory.filter(i => i !== it);
  P.gold += val;
  return val;
}
export function upgradeItem(P, it) {
  const c = upgradeCost(it);
  if (P.gold < c || it.upg >= 5) return false;
  P.gold -= c; it.upg += 1;
  return true;
}
export function healCost(P) { return 3 + P.level * 3; }
export function healPlayer(P) {
  const cost = healCost(P), d = derive(P);
  if (P.hp >= d.maxHp || P.gold < cost) return false;
  P.gold -= cost; P.hp = d.maxHp;
  return true;
}
export const BUFF_COST = 40;
export const BUFF_DURATION = 90;
export function buyBuff(P) {
  if (P.gold < BUFF_COST || P.buffT > 0) return false;
  P.gold -= BUFF_COST; P.buffT = BUFF_DURATION;
  return true;
}

export function respecCost(P) { return 20 + P.level * 10; }
