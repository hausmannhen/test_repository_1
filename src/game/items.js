/* Items: Basisitems, Seltenheiten, Affixe, Generierung, Tränke */
import { pick } from "./rng.js";

export const RARITIES = [
  { id: "gewoehnlich",   name: "Gewöhnlich",   color: "#d8d2c4", mult: 1.0,  affixes: 0, weight: 60 },
  { id: "ungewoehnlich", name: "Ungewöhnlich", color: "#6fd66f", mult: 1.25, affixes: 1, weight: 26 },
  { id: "selten",        name: "Selten",       color: "#5aa7ff", mult: 1.55, affixes: 2, weight: 10 },
  { id: "episch",        name: "Episch",       color: "#c77dff", mult: 1.95, affixes: 3, weight: 3.2 },
  { id: "legendaer",     name: "Legendär",     color: "#ffb347", mult: 2.5,  affixes: 4, weight: 0.8 },
];
export const RARITY_BY_ID = Object.fromEntries(RARITIES.map(r => [r.id, r]));
export const SLOTS = { waffe: "Waffe", kopf: "Kopf", rumpf: "Rumpf", schild: "Schild", amulett: "Amulett", ring: "Ring" };
export const SLOT_ORDER = ["waffe", "kopf", "rumpf", "schild", "amulett", "ring"];
export const STAT_NAMES = { atk: "Angriff", def: "Verteidigung", hp: "Leben", crit: "Krit", spd: "Tempo", luck: "Glück" };

/* Neue Basisitems brauchen zwingend g: "m" | "f" | "n" (Deklination der Präfixe) */
export const BASES = [
  { id: "dolch",        name: "Dolch", g: "m",         slot: "waffe", atk: 4,  crit: 8,  spd: 4, reach: 10 },
  { id: "kurzschwert",  name: "Kurzschwert", g: "n",   slot: "waffe", atk: 6,  crit: 3, reach: 13 },
  { id: "langschwert",  name: "Langschwert", g: "n",   slot: "waffe", atk: 8,  reach: 16 },
  { id: "streitaxt",    name: "Streitaxt", g: "f",     slot: "waffe", atk: 11, spd: -3, reach: 14 },
  { id: "kriegshammer", name: "Kriegshammer", g: "m",  slot: "waffe", atk: 13, spd: -5, reach: 14 },
  { id: "rapier",       name: "Rapier", g: "n",        slot: "waffe", atk: 7,  crit: 10, reach: 17 },
  { id: "speer",        name: "Speer", g: "m",         slot: "waffe", atk: 7,  reach: 22 },
  { id: "lederkappe",   name: "Lederkappe", g: "f",    slot: "kopf",  def: 2, spd: 2 },
  { id: "eisenhelm",    name: "Eisenhelm", g: "m",     slot: "kopf",  def: 4 },
  { id: "ritterhelm",   name: "Ritterhelm", g: "m",    slot: "kopf",  def: 6, spd: -1 },
  { id: "zauberhut",    name: "Zauberhut", g: "m",     slot: "kopf",  def: 1, luck: 4, crit: 3 },
  { id: "lederwams",    name: "Lederwams", g: "n",     slot: "rumpf", def: 3, spd: 2 },
  { id: "kettenhemd",   name: "Kettenhemd", g: "n",    slot: "rumpf", def: 6 },
  { id: "plattenpanzer",name: "Plattenpanzer", g: "m", slot: "rumpf", def: 9, spd: -3 },
  { id: "robe",         name: "Robe", g: "f",          slot: "rumpf", def: 2, hp: 12, luck: 2 },
  { id: "holzschild",   name: "Holzschild", g: "m",    slot: "schild", def: 2, hp: 6 },
  { id: "rundschild",   name: "Rundschild", g: "m",    slot: "schild", def: 4, hp: 8 },
  { id: "turmschild",   name: "Turmschild", g: "m",    slot: "schild", def: 7, hp: 12, spd: -3 },
  { id: "talisman",     name: "Talisman", g: "m",      slot: "amulett", hp: 10, luck: 3 },
  { id: "anhaenger",    name: "Anhänger", g: "m",      slot: "amulett", crit: 5, atk: 2 },
  { id: "amulett",      name: "Amulett", g: "n",       slot: "amulett", def: 2, hp: 14 },
  { id: "ring",         name: "Ring", g: "m",          slot: "ring",  crit: 4, luck: 2 },
  { id: "siegelring",   name: "Siegelring", g: "m",    slot: "ring",  atk: 3, def: 1 },
  { id: "bandring",     name: "Bandring", g: "m",      slot: "ring",  hp: 8, spd: 2 },
];
export const PREFIXES = [
  { name: "Flammend", stat: "atk", v: 0.35 }, { name: "Scharf", stat: "atk", v: 0.25 }, { name: "Grimmig", stat: "atk", v: 0.45 },
  { name: "Gehärtet", stat: "def", v: 0.3 }, { name: "Stählern", stat: "def", v: 0.45 }, { name: "Ehern", stat: "def", v: 0.6 },
  { name: "Vital", stat: "hp", v: 0.5 }, { name: "Robust", stat: "hp", v: 0.8 },
  { name: "Tödlich", stat: "crit", v: 0.5 }, { name: "Flink", stat: "spd", v: 0.4 }, { name: "Glücklich", stat: "luck", v: 0.5 },
];
export const SUFFIXES = [
  { name: "des Bären", stat: "hp", v: 1.0 }, { name: "des Wolfes", stat: "spd", v: 0.5 }, { name: "der Viper", stat: "crit", v: 0.7 },
  { name: "des Titanen", stat: "def", v: 0.7 }, { name: "der Sturmfront", stat: "atk", v: 0.5 }, { name: "des Fuchses", stat: "luck", v: 0.7 },
  { name: "der Morgenröte", stat: "hp", v: 0.6 }, { name: "des Drachen", stat: "atk", v: 0.7 }, { name: "der Ewigkeit", stat: "def", v: 0.9 },
];
export const POTIONS = {
  heiltrank_k: { name: "Kleiner Heiltrank", heal: 30, price: 12, color: "#ff5f6d" },
  heiltrank_m: { name: "Heiltrank",         heal: 80, price: 34, color: "#ff2f4f" },
  heiltrank_g: { name: "Großer Heiltrank",  heal: 200, price: 90, color: "#c8102e" },
  elixier:     { name: "Elixier",           heal: 9999, price: 260, color: "#ffd23f" },
};

let itemCounter = 1;
function statScale(v, ilvl) { return v * (1 + ilvl * 0.13); }

export function rollRarity(r, ilvl, luck, minIdx = 0) {
  const boost = 1 + luck * 0.04 + ilvl * 0.01;
  const weights = RARITIES.map((ra, i) => i < minIdx ? 0 : ra.weight * (i > 0 ? boost : 1));
  const total = weights.reduce((a, b) => a + b, 0);
  let x = r() * total;
  for (let i = 0; i < weights.length; i++) { x -= weights[i]; if (x <= 0) return i; }
  return weights.length - 1;
}

export function generateItem(r, ilvl, luck = 0, minRarity = 0, forcedSlot = null) {
  const bases = forcedSlot ? BASES.filter(b => b.slot === forcedSlot) : BASES;
  const base = pick(r, bases);
  const rIdx = rollRarity(r, ilvl, luck, minRarity);
  const rar = RARITIES[rIdx];
  const stats = {};
  for (const k of ["atk", "def", "hp", "crit", "spd", "luck"]) {
    if (base[k]) stats[k] = base[k];
  }
  // Basiswerte skalieren
  for (const k in stats) {
    if (k === "crit" || k === "luck" || k === "spd") stats[k] = Math.round(stats[k] * (1 + ilvl * 0.03) * rar.mult);
    else stats[k] = Math.round(statScale(stats[k], ilvl) * rar.mult * (0.9 + r() * 0.2));
  }
  let prefix = null, suffix = null;
  const affixes = rar.affixes;
  const bonus = {};
  const applyAffix = (a) => {
    const baseVal = a.stat === "crit" || a.stat === "luck" || a.stat === "spd" ? 3 + ilvl * 0.25 : 3 + ilvl * 0.9;
    const val = Math.max(1, Math.round(baseVal * a.v * (0.85 + r() * 0.3)));
    bonus[a.stat] = (bonus[a.stat] || 0) + val;
  };
  if (affixes >= 1) { prefix = pick(r, PREFIXES); applyAffix(prefix); }
  if (affixes >= 2) { suffix = pick(r, SUFFIXES); applyAffix(suffix); }
  for (let i = 2; i < affixes; i++) applyAffix(pick(r, [...PREFIXES, ...SUFFIXES]));
  for (const k in bonus) stats[k] = (stats[k] || 0) + bonus[k];
  const statSum = Object.values(stats).reduce((a, b) => a + b, 0);
  const value = Math.round((ilvl * 3 + statSum * 2.2) * rar.mult);
  const ending = { m: "er", f: "e", n: "es" }[base.g] || "er";
  const name = `${prefix ? prefix.name + ending + " " : ""}${base.name}${suffix ? " " + suffix.name : ""}`;
  return { uid: "i" + (itemCounter++) + "_" + Math.floor(r() * 1e6), kind: "gear", baseId: base.id, name, slot: base.slot, rarity: rar.id, ilvl, stats, value, upg: 0, reach: base.reach || 0 };
}
export function effectiveStats(item) {
  if (!item || item.kind !== "gear") return {};
  const m = 1 + item.upg * 0.12;
  const out = {};
  for (const k in item.stats) out[k] = Math.round(item.stats[k] * m);
  return out;
}
export function upgradeCost(item) { return Math.round((item.value * 0.6 + 20) * Math.pow(1.7, item.upg)); }
export function makePotion(id, qty = 1) { return { uid: "p_" + id, kind: "trank", potId: id, name: POTIONS[id].name, qty, value: Math.round(POTIONS[id].price * 0.45) }; }
export function sumStats(s) { return Object.values(s).reduce((a, b) => a + b, 0); }
