/* Items: Generierung, Stats, Aufwertung, Tränke. Tabellen liegen in data/items.js. */
import { pick } from "./rng.js";
import { RARITIES, SLOTS, SLOT_ORDER, STAT_NAMES, STAT_KEYS, FLAT_STATS, WEAPON_TYPES, BASES, PREFIXES, SUFFIXES, POTIONS, LEGACY_POTIONS } from "../data/items.js";
export { RARITIES, SLOTS, SLOT_ORDER, STAT_NAMES, STAT_KEYS, WEAPON_TYPES, BASES, PREFIXES, SUFFIXES, POTIONS, LEGACY_POTIONS };

export const RARITY_BY_ID = Object.fromEntries(RARITIES.map(r => [r.id, r]));
export const BASE_BY_ID = Object.fromEntries(BASES.map(b => [b.id, b]));

let itemCounter = 1;
function statScale(v, ilvl) { return v * (1 + ilvl * 0.13); }

function pickWeighted(r, list) {
  const total = list.reduce((a, b) => a + (b.weight || 1), 0);
  let x = r() * total;
  for (const b of list) { x -= (b.weight || 1); if (x <= 0) return b; }
  return list[list.length - 1];
}
export function rollRarity(r, ilvl, luck, minIdx = 0) {
  const boost = 1 + luck * 0.04 + ilvl * 0.01;
  const weights = RARITIES.map((ra, i) => i < minIdx ? 0 : ra.weight * (i > 0 ? boost : 1));
  const total = weights.reduce((a, b) => a + b, 0);
  let x = r() * total;
  for (let i = 0; i < weights.length; i++) { x -= weights[i]; if (x <= 0) return i; }
  return weights.length - 1;
}

/* Waffeneigenschaften, die nicht skalieren, vom Basisitem übernehmen */
function weaponProps(base) {
  const out = { reach: base.reach || 0 };
  if (base.slot === "waffe") {
    out.type = base.type || "nah";
    if (base.range) out.range = base.range;
    if (base.rate) out.rate = base.rate;
    if (base.projSpeed) out.projSpeed = base.projSpeed;
    if (base.proj) out.proj = base.proj;
    if (base.blood) out.blood = base.blood;
  }
  return out;
}

export function generateItem(r, ilvl, luck = 0, minRarity = 0, forcedSlot = null) {
  const bases = forcedSlot ? BASES.filter(b => b.slot === forcedSlot) : BASES;
  const base = pickWeighted(r, bases);
  // Affixe, die zur Waffe passen: kein Magie-Affix auf Schwert oder Bogen, kein Angriffs-Affix auf dem Stab. Nebenhand ebenso.
  const kind = base.type || base.off || null;
  const fits = (a) => !kind || kind === "schild" || (kind === "fokus" ? a.stat !== "atk" : (a.stat !== "mag" && a.stat !== "mana"));
  const prefixes = PREFIXES.filter(fits), suffixes = SUFFIXES.filter(fits);
  const rIdx = rollRarity(r, ilvl, luck, minRarity);
  const rar = RARITIES[rIdx];
  const stats = {};
  for (const k of STAT_KEYS) if (base[k]) stats[k] = base[k];
  // Basiswerte skalieren
  for (const k in stats) {
    if (FLAT_STATS.has(k)) stats[k] = Math.round(stats[k] * (1 + ilvl * 0.03) * rar.statMult);
    else stats[k] = Math.round(statScale(stats[k], ilvl) * rar.statMult * (0.9 + r() * 0.2));
  }
  let prefix = null, suffix = null;
  const affixes = rar.affixes;
  const bonus = {};
  const applyAffix = (a) => {
    const baseVal = FLAT_STATS.has(a.stat) ? 3 + ilvl * 0.25 : 3 + ilvl * 0.9;
    const val = Math.max(1, Math.round(baseVal * a.v * (0.85 + r() * 0.3)));
    bonus[a.stat] = (bonus[a.stat] || 0) + val;
  };
  if (affixes >= 1) { prefix = pick(r, prefixes); applyAffix(prefix); }
  if (affixes >= 2) { suffix = pick(r, suffixes); applyAffix(suffix); }
  for (let i = 2; i < affixes; i++) applyAffix(pick(r, [...prefixes, ...suffixes]));
  for (const k in bonus) stats[k] = (stats[k] || 0) + bonus[k];
  const statSum = Object.values(stats).reduce((a, b) => a + b, 0);
  const value = Math.round((ilvl * 3 + statSum * 2.2) * rar.mult);
  const ending = { m: "er", f: "e", n: "es" }[base.g] || "er";
  const name = `${prefix ? prefix.name + ending + " " : ""}${base.name}${suffix ? " " + suffix.name : ""}`;
  return { uid: "i" + (itemCounter++) + "_" + Math.floor(r() * 1e6), kind: "gear", baseId: base.id, name, slot: base.slot, rarity: rar.id, ilvl, stats, value, upg: 0, ...weaponProps(base) };
}
export function effectiveStats(item) {
  if (!item || item.kind !== "gear") return {};
  const m = 1 + item.upg * 0.08;
  const out = {};
  for (const k in item.stats) out[k] = item.stats[k] > 0 ? Math.round(item.stats[k] * m) : item.stats[k];   // Abzüge wachsen beim Aufwerten nicht mit
  return out;
}
/* Nebenhand: Köcher braucht Fernwaffe, Zauberbuch Stab, Schilde gehen immer */
export function offhandKind(item) { const b = item && BASE_BY_ID[item.baseId]; return b ? (b.off || "schild") : "schild"; }
export function offhandFits(item, weaponTypeId) { const k = offhandKind(item); return k === "schild" || k === weaponTypeId; }
export const SHIELD_RATE_PENALTY = 1.2;   // Schild mit Fernwaffe: langsamer schießen
export function weaponType(item) { return item && item.slot === "waffe" ? (item.type || "nah") : null; }
export function upgradeCost(item) { return Math.round((item.value * 0.6 + 20) * Math.pow(1.7, item.upg)); }
export function makePotion(id, qty = 1) { return { uid: "p_" + id, kind: "trank", potId: id, name: POTIONS[id].name, qty, value: Math.round(POTIONS[id].price * 0.45) }; }
export function sumStats(s) { return Object.values(s).reduce((a, b) => a + b, 0); }
export function potionDesc(id) {
  const p = POTIONS[id];
  if (!p) return "";
  if (p.healPct) return `Heilt ${Math.round(p.healPct * 100)} % des Lebens`;
  if (p.manaPct) return `Füllt ${Math.round(p.manaPct * 100)} % Mana`;
  return "";
}
