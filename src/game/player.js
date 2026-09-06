/* Spieler: Erstellung, abgeleitete Werte, Inventar, Tränke, Mana */
import { TS, START_VILLAGE } from "./constants.js";
import { rngFor } from "./rng.js";
import { generateItem, makePotion, effectiveStats, POTIONS, BASE_BY_ID } from "./items.js";
import { skillBonuses } from "./skills.js";

export const INVENTORY_MAX = 30;

export function newPlayer(seed) {
  const r = rngFor(seed, "start");
  const sword = generateItem(r, 1, 0, 0, "waffe");
  Object.assign(sword, { name: "Altes Kurzschwert", baseId: "kurzschwert", rarity: "gewoehnlich", stats: { atk: 6, crit: 3 }, reach: 13, value: 8, type: "nah" });
  delete sword.range; delete sword.rate; delete sword.projSpeed; delete sword.proj; delete sword.blood;
  return {
    level: 1, xp: 0, gold: 30, hp: 60, mana: 30, hearts: 0, kills: 0,
    inventory: [makePotion("heiltrank_k", 3)],
    equip: { waffe: sword, kopf: null, rumpf: null, schild: null, amulett: null, ring: null },
    area: "over", sx: +START_VILLAGE.split(",")[0], sy: +START_VILLAGE.split(",")[1], x: 7 * TS + 8, y: 8 * TS + 8, dir: "up",
    cleared: {}, chests: {}, lastVillage: START_VILLAGE, visits: {}, buffT: 0,
    skills: {}, spells: [], activeSpell: null, quests: {},
  };
}
export function xpNeed(level) { return Math.floor(30 * Math.pow(level, 1.45)); }
export function derive(P) {
  const b = skillBonuses(P);
  const s = {
    atk: 4 + P.level * 2, def: Math.floor(P.level * 0.5) + b.def, maxHp: 60 + (P.level - 1) * 8 + P.hearts * 20 + b.hp,
    crit: 5, spd: 0, luck: 0, reach: 12, mag: 2 + P.level, maxMana: 30 + (P.level - 1) * 4 + b.mana, manaRegen: 2 + b.manaRegen,
    weaponType: "nah", range: 0, rate: 0.5, projSpeed: 200, proj: "pfeil", blood: 0,
  };
  for (const slot in P.equip) {
    const it = P.equip[slot];
    if (!it) continue;
    const es = effectiveStats(it);
    for (const k in es) {
      if (k === "hp") s.maxHp += es[k];
      else if (k === "mana") s.maxMana += es[k];
      else s[k] += es[k];
    }
    if (it.reach) s.reach = it.reach;
    if (slot === "waffe") {
      const base = BASE_BY_ID[it.baseId] || {};
      s.weaponType = it.type || base.type || "nah";
      s.range = (it.range || base.range || 0) + (s.weaponType === "fern" ? b.rangeBonus : 0);
      s.rate = (it.rate || base.rate || 0.5) * b.rateMult;
      s.projSpeed = it.projSpeed || base.projSpeed || 200;
      s.proj = it.proj || base.proj || "pfeil";
      s.blood = it.blood || base.blood || 0;
    }
  }
  s.meleeMult = b.meleeMult; s.rangedMult = b.rangedMult; s.spellMult = b.spellMult;
  s.critMelee = b.critMelee; s.critRanged = b.critRanged;
  s.sweep = b.sweep; s.doubleShot = b.doubleShot; s.pierce = b.pierce;
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

function consume(P, pot) {
  pot.qty -= 1;
  if (pot.qty <= 0) P.inventory = P.inventory.filter(i => i !== pot);
}
/* Heiltrank: kleinster Trank, der das fehlende Leben deckt, sonst der größte */
export function usePotion(G) {
  const P = G.P;
  const pots = P.inventory.filter(i => i.kind === "trank" && POTIONS[i.potId].heal).sort((a, b) => POTIONS[a.potId].heal - POTIONS[b.potId].heal);
  if (!pots.length) { flash(G, "Keine Heiltränke", "#ffb347"); return false; }
  const d = derive(P);
  if (P.hp >= d.maxHp) { flash(G, "Volles Leben", "#9ad"); return false; }
  const missing = d.maxHp - P.hp;
  const pot = pots.find(p => POTIONS[p.potId].heal >= missing) || pots[pots.length - 1];
  const def = POTIONS[pot.potId];
  const heal = Math.min(missing, def.heal);
  P.hp += heal;
  if (def.mana) P.mana = d.maxMana;
  consume(P, pot);
  G.fx.push({ kind: "num", x: P.x, y: P.y - 12, rise: 0, text: "+" + heal, color: "#6fe28a", t: 1 });
  G.dirty = true;
  return true;
}
export function useManaPotion(G) {
  const P = G.P;
  const pot = P.inventory.find(i => i.kind === "trank" && POTIONS[i.potId].mana && !POTIONS[i.potId].heal) || P.inventory.find(i => i.kind === "trank" && POTIONS[i.potId].mana);
  if (!pot) { flash(G, "Kein Manatrank", "#ffb347"); return false; }
  const d = derive(P);
  if (P.mana >= d.maxMana) { flash(G, "Mana voll", "#9ad"); return false; }
  const def = POTIONS[pot.potId];
  const gain = Math.min(d.maxMana - P.mana, def.mana);
  P.mana += gain;
  if (def.heal) P.hp = Math.min(d.maxHp, P.hp + def.heal);
  consume(P, pot);
  G.fx.push({ kind: "num", x: P.x, y: P.y - 12, rise: 0, text: "+" + gain + " Mana", color: "#5aa7ff", t: 1 });
  G.dirty = true;
  return true;
}
