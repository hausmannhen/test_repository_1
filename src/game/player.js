/* Spieler: Erstellung, abgeleitete Werte, Inventar, Tränke */
import { TS } from "./constants.js";
import { rngFor } from "./rng.js";
import { generateItem, makePotion, effectiveStats, POTIONS } from "./items.js";

export const INVENTORY_MAX = 30;

export function newPlayer(seed) {
  const r = rngFor(seed, "start");
  const sword = generateItem(r, 1, 0, 0, "waffe");
  sword.name = "Altes Kurzschwert"; sword.baseId = "kurzschwert"; sword.rarity = "gewoehnlich"; sword.stats = { atk: 6, crit: 3 }; sword.reach = 13; sword.value = 8;
  return {
    level: 1, xp: 0, gold: 30, hp: 60, hearts: 0, kills: 0,
    inventory: [makePotion("heiltrank_k", 3)],
    equip: { waffe: sword, kopf: null, rumpf: null, schild: null, amulett: null, ring: null },
    area: "over", sx: 2, sy: 3, x: 7 * TS + 8, y: 8 * TS + 8, dir: "up",
    cleared: {}, chests: {}, lastVillage: "2,3", visits: {}, buffT: 0,
  };
}
export function xpNeed(level) { return Math.floor(30 * Math.pow(level, 1.45)); }
export function derive(P) {
  const s = { atk: 4 + P.level * 2, def: Math.floor(P.level * 0.5), maxHp: 60 + (P.level - 1) * 8 + P.hearts * 20, crit: 5, spd: 0, luck: 0, reach: 12 };
  for (const slot in P.equip) {
    const it = P.equip[slot];
    if (!it) continue;
    const es = effectiveStats(it);
    for (const k in es) { if (k === "hp") s.maxHp += es[k]; else s[k] += es[k]; }
    if (it.reach) s.reach = it.reach;
  }
  return s;
}
export function addToInventory(P, item) {
  if (item.kind === "trank") {
    const ex = P.inventory.find(i => i.kind === "trank" && i.potId === item.potId);
    if (ex) { ex.qty += item.qty; return true; }
  }
  if (P.inventory.length >= INVENTORY_MAX) return false;
  P.inventory.push(item);
  return true;
}
export function flash(G, text, color = "#fff") { G.msg = { text, color, t: 2.2 }; G.dirty = true; }
export function usePotion(G) {
  const P = G.P;
  const pots = P.inventory.filter(i => i.kind === "trank").sort((a, b) => POTIONS[a.potId].heal - POTIONS[b.potId].heal);
  if (!pots.length) { flash(G, "Keine Tränke", "#ffb347"); return false; }
  const d = derive(P);
  if (P.hp >= d.maxHp) { flash(G, "Volles Leben", "#9ad"); return false; }
  const missing = d.maxHp - P.hp;
  let pot = pots.find(p => POTIONS[p.potId].heal >= missing) || pots[pots.length - 1];
  const heal = Math.min(missing, POTIONS[pot.potId].heal);
  P.hp += heal;
  pot.qty -= 1;
  if (pot.qty <= 0) P.inventory = P.inventory.filter(i => i !== pot);
  G.fx.push({ kind: "num", x: P.x, y: P.y - 12, rise: 0, text: "+" + heal, color: "#6fe28a", t: 1 });
  G.dirty = true;
  return true;
}
