/* Spieler: Erstellung, abgeleitete Werte, Inventar, Tränke, Mana */
import { TS, START_VILLAGE } from "./constants.js";
import { rngFor } from "./rng.js";
import { generateItem, makePotion, effectiveStats, POTIONS, BASE_BY_ID } from "./items.js";
import { skillBonuses } from "./skills.js";

export const INVENTORY_MAX = 30;
export const POTION_MAX = 20;   // je Sorte
export function potionCount(P, id) { const ex = P.inventory.find(i => i.kind === "trank" && i.potId === id); return ex ? ex.qty : 0; }

export function newPlayer(seed) {
  const r = rngFor(seed, "start");
  const sword = generateItem(r, 1, 0, 0, "waffe");
  Object.assign(sword, { name: "Altes Kurzschwert", baseId: "kurzschwert", rarity: "gewoehnlich", stats: { atk: 6, crit: 3 }, reach: 13, value: 8, type: "nah" });
  delete sword.range; delete sword.rate; delete sword.projSpeed; delete sword.proj; delete sword.blood;
  return {
    level: 1, xp: 0, gold: 30, hp: 60, mana: 30, hearts: 0, kills: 0,
    inventory: [makePotion("heiltrank", 3)],
    equip: { waffe: sword, kopf: null, rumpf: null, schild: null, amulett: null, ring: null },
    area: "over", sx: +START_VILLAGE.split(",")[0], sy: +START_VILLAGE.split(",")[1], x: 7 * TS + 8, y: 8 * TS + 8, dir: "up",
    cleared: {}, chests: {}, lastVillage: START_VILLAGE, visits: {}, buffT: 0,
    skills: {}, spells: [], activeSpell: null, quests: {}, hints: {}, slowT: 0,
  };
}
export function xpNeed(level) { return Math.floor(40 * Math.pow(level, 1.6)); }
export function derive(P) {
  const b = skillBonuses(P);
  const s = {
    atk: 6 + P.level * 3, def: Math.floor(P.level * 0.5) + b.def, maxHp: 60 + (P.level - 1) * 6 + P.hearts * 20 + b.hp,
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
    if (ex) { if (ex.qty >= POTION_MAX) return false; ex.qty = Math.min(POTION_MAX, ex.qty + item.qty); return true; }
    item.qty = Math.min(POTION_MAX, item.qty);
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
export function emit(G, type, data = null) { if (G.events) G.events.push(data ? { type, ...data } : { type }); }
/* Heiltrank: heilt einen Anteil des maximalen Lebens */
export function usePotion(G) {
  const P = G.P;
  const pot = P.inventory.find(i => i.kind === "trank" && POTIONS[i.potId] && POTIONS[i.potId].healPct);
  if (!pot) { flash(G, "Kein Heiltrank", "#ffb347"); return false; }
  const d = derive(P);
  if (P.hp >= d.maxHp) { flash(G, "Volles Leben", "#9ad"); return false; }
  const heal = Math.min(d.maxHp - P.hp, Math.max(1, Math.round(d.maxHp * POTIONS[pot.potId].healPct)));
  P.hp += heal;
  consume(P, pot);
  G.fx.push({ kind: "num", x: P.x, y: P.y - 12, rise: 0, text: "+" + heal, color: "#6fe28a", t: 1 });
  emit(G, "potion");
  G.dirty = true;
  return true;
}
export function useManaPotion(G) {
  const P = G.P;
  const pot = P.inventory.find(i => i.kind === "trank" && POTIONS[i.potId] && POTIONS[i.potId].manaPct);
  if (!pot) { flash(G, "Kein Manatrank", "#ffb347"); return false; }
  const d = derive(P);
  if (P.mana >= d.maxMana) { flash(G, "Mana voll", "#9ad"); return false; }
  const gain = Math.min(d.maxMana - P.mana, Math.max(1, Math.round(d.maxMana * POTIONS[pot.potId].manaPct)));
  P.mana += gain;
  consume(P, pot);
  G.fx.push({ kind: "num", x: P.x, y: P.y - 12, rise: 0, text: "+" + Math.round(gain) + " Mana", color: "#5aa7ff", t: 1 });
  emit(G, "potion");
  G.dirty = true;
  return true;
}

/* Trank aus dem Inventar trinken: Heil- oder Manatrank je nach Art */
export function drinkItem(G, it) {
  const def = it && it.kind === "trank" ? POTIONS[it.potId] : null;
  if (!def) return false;
  return def.manaPct ? useManaPotion(G) : usePotion(G);
}
