import React, { useEffect, useRef, useState, useCallback } from "react";

/* ============================================================
   ELDENFELD  –  Zelda-artiges Fantasy-Action-RPG mit Loot
   Alles prozedural: Welt, Monster, Items, Dropchancen.
   ============================================================ */

const TS = 16;          // Tilegröße in Pixeln
const VW = 15;          // Tiles pro Bildschirm (Breite)
const VH = 11;          // Tiles pro Bildschirm (Höhe)
const W = VW * TS;      // 240
const H = VH * TS;      // 176
const WORLD_W = 6;
const WORLD_H = 6;

const T = {
  GRASS: 0, ROCK: 1, WATER: 2, TREE: 3, SAND: 4, PATH: 5, HOUSE: 6, DOOR: 7,
  FLOWER: 8, SNOW: 9, LAVA: 10, FLOOR: 11, WALL: 12, ENTRANCE: 13, EXIT: 14,
  BUSH: 15, ICE: 16, SWAMP: 17, CHEST: 18, PILLAR: 19, DEADTREE: 20, CACTUS: 21,
  ASH: 22, SIGN: 23,
};
const SOLID = new Set([T.ROCK, T.WATER, T.TREE, T.HOUSE, T.WALL, T.BUSH, T.PILLAR, T.DEADTREE, T.CACTUS, T.SIGN]);

/* ---------- Zufall ---------- */
function hashStr(s) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}
function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rngFor = (seed, key) => mulberry32(hashStr(seed + "|" + key));
const rint = (r, a, b) => a + Math.floor(r() * (b - a + 1));
const pick = (r, arr) => arr[Math.floor(r() * arr.length)];
const chance = (r, p) => r() < p;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

/* ---------- Regionen ---------- */
const REGIONS = {
  wiese:  { name: "Grasland von Elyn", level: 1,  ground: [T.GRASS, T.GRASS, T.GRASS, T.FLOWER], decor: [T.TREE, T.BUSH, T.ROCK, T.WATER], decorDensity: 0.09, mobs: ["schleim", "ratte", "wolf"], mobCount: [2, 4] },
  wald:   { name: "Dunkelforst",       level: 4,  ground: [T.GRASS, T.GRASS, T.FLOWER],          decor: [T.TREE, T.TREE, T.TREE, T.BUSH],  decorDensity: 0.2,  mobs: ["wolf", "spinne", "waldgeist"], mobCount: [3, 5] },
  berg:   { name: "Kargstein-Höhen",   level: 8,  ground: [T.GRASS, T.PATH, T.PATH],             decor: [T.ROCK, T.ROCK, T.ROCK, T.DEADTREE], decorDensity: 0.18, mobs: ["fledermaus", "golem", "skelett"], mobCount: [3, 5] },
  wueste: { name: "Glutwüste",         level: 12, ground: [T.SAND, T.SAND, T.SAND],              decor: [T.CACTUS, T.ROCK, T.CACTUS],       decorDensity: 0.08, mobs: ["skorpion", "bandit", "sandwurm"], mobCount: [3, 5] },
  sumpf:  { name: "Nebelmoor",         level: 15, ground: [T.SWAMP, T.GRASS, T.SWAMP],           decor: [T.DEADTREE, T.WATER, T.WATER, T.BUSH], decorDensity: 0.16, mobs: ["hexe", "schleim", "skelett"], mobCount: [3, 6] },
  eis:    { name: "Frostkamm",         level: 19, ground: [T.SNOW, T.SNOW, T.ICE],               decor: [T.ROCK, T.DEADTREE, T.ROCK],      decorDensity: 0.12, mobs: ["eiswolf", "golem", "schamane"], mobCount: [3, 6] },
  vulkan: { name: "Aschekessel",       level: 24, ground: [T.ASH, T.ASH, T.ASH],                 decor: [T.ROCK, T.LAVA, T.LAVA, T.ROCK],  decorDensity: 0.14, mobs: ["feuerteufel", "golem", "drache"], mobCount: [3, 6] },
};
const REGION_MAP = [
  ["eis",  "eis",   "eis",   "vulkan", "vulkan", "vulkan"],
  ["eis",  "berg",  "berg",  "berg",   "berg",   "vulkan"],
  ["wald", "wiese", "wiese", "wiese",  "wueste", "wueste"],
  ["wald", "wiese", "wiese", "wiese",  "wueste", "wueste"],
  ["wald", "wald",  "wiese", "wiese",  "sumpf",  "sumpf"],
  ["wald", "wald",  "wiese", "sumpf",  "sumpf",  "sumpf"],
];
function regionAt(x, y) { return REGION_MAP[y][x]; }

/* ---------- Monster ---------- */
const MOBS = {
  schleim:     { name: "Schleim",       hp: 16, atk: 4,  spd: 20, size: 10, shape: "blob",  color: "#7fd35a", color2: "#3f8f2a", ai: "chase",   xp: 7,  gold: [1, 4] },
  ratte:       { name: "Riesenratte",   hp: 12, atk: 5,  spd: 42, size: 9,  shape: "quad",  color: "#8f6f55", color2: "#5a4030", ai: "chase",   xp: 8,  gold: [1, 5] },
  wolf:        { name: "Grauwolf",      hp: 26, atk: 8,  spd: 48, size: 11, shape: "quad",  color: "#8a8f96", color2: "#4c5057", ai: "chase",   xp: 14, gold: [2, 7] },
  spinne:      { name: "Riesenspinne",  hp: 30, atk: 9,  spd: 36, size: 12, shape: "blob",  color: "#3b2a4a", color2: "#c04070", ai: "chase",   xp: 18, gold: [3, 9] },
  waldgeist:   { name: "Waldgeist",     hp: 34, atk: 11, spd: 24, size: 11, shape: "ghost", color: "#7fe0c0", color2: "#2f8a70", ai: "ranged",  xp: 22, gold: [4, 12] },
  fledermaus:  { name: "Höhlenfledermaus", hp: 22, atk: 9, spd: 60, size: 9, shape: "bat",  color: "#5a3f6a", color2: "#2b1c33", ai: "erratic", xp: 16, gold: [2, 8] },
  golem:       { name: "Steingolem",    hp: 90, atk: 16, spd: 14, size: 14, shape: "golem", color: "#8b8577", color2: "#4a463f", ai: "chase",   xp: 45, gold: [8, 20] },
  skelett:     { name: "Skelett",       hp: 48, atk: 13, spd: 30, size: 11, shape: "skel",  color: "#e8e2d0", color2: "#8a8270", ai: "chase",   xp: 30, gold: [5, 14] },
  skorpion:    { name: "Sandskorpion",  hp: 60, atk: 17, spd: 34, size: 12, shape: "quad",  color: "#c9a24a", color2: "#7a5c1c", ai: "chase",   xp: 40, gold: [6, 16] },
  bandit:      { name: "Wüstenbandit",  hp: 70, atk: 19, spd: 40, size: 11, shape: "human", color: "#b5763a", color2: "#5c3a18", ai: "ranged",  xp: 48, gold: [12, 30] },
  sandwurm:    { name: "Sandwurm",      hp: 130, atk: 22, spd: 18, size: 14, shape: "blob", color: "#d9c27a", color2: "#8f7a36", ai: "chase",   xp: 70, gold: [10, 28] },
  hexe:        { name: "Moorhexe",      hp: 85, atk: 24, spd: 26, size: 11, shape: "human", color: "#4f6a3a", color2: "#22301a", ai: "ranged",  xp: 75, gold: [14, 34] },
  eiswolf:     { name: "Eiswolf",       hp: 120, atk: 28, spd: 52, size: 12, shape: "quad", color: "#cfe6f5", color2: "#6f9fbf", ai: "chase",   xp: 90, gold: [15, 36] },
  schamane:    { name: "Frostschamane", hp: 110, atk: 32, spd: 24, size: 11, shape: "human", color: "#6f8fd0", color2: "#2f3f70", ai: "ranged", xp: 105, gold: [18, 42] },
  feuerteufel: { name: "Feuerteufel",   hp: 150, atk: 36, spd: 46, size: 11, shape: "ghost", color: "#ff8a3a", color2: "#b8300c", ai: "erratic", xp: 130, gold: [20, 50] },
  drache:      { name: "Jungdrache",    hp: 260, atk: 44, spd: 30, size: 15, shape: "golem", color: "#b02a2a", color2: "#5a1010", ai: "ranged",  xp: 220, gold: [40, 90] },
};
const BOSSES = {
  0: { base: "waldgeist", name: "Eichenkönig",        hpMult: 8,  atkMult: 1.4, size: 20, color: "#5aa06a", color2: "#1f4a2a" },
  1: { base: "golem",     name: "Gebirgswächter",     hpMult: 7,  atkMult: 1.5, size: 24, color: "#6f7a90", color2: "#2a3040" },
  2: { base: "drache",    name: "Aschedrache Vargor", hpMult: 6,  atkMult: 1.6, size: 26, color: "#e04a2a", color2: "#3a0a0a" },
};

/* ---------- Items ---------- */
const RARITIES = [
  { id: "gewoehnlich",   name: "Gewöhnlich",   color: "#d8d2c4", mult: 1.0,  affixes: 0, weight: 60 },
  { id: "ungewoehnlich", name: "Ungewöhnlich", color: "#6fd66f", mult: 1.25, affixes: 1, weight: 26 },
  { id: "selten",        name: "Selten",       color: "#5aa7ff", mult: 1.55, affixes: 2, weight: 10 },
  { id: "episch",        name: "Episch",       color: "#c77dff", mult: 1.95, affixes: 3, weight: 3.2 },
  { id: "legendaer",     name: "Legendär",     color: "#ffb347", mult: 2.5,  affixes: 4, weight: 0.8 },
];
const RARITY_BY_ID = Object.fromEntries(RARITIES.map(r => [r.id, r]));
const SLOTS = { waffe: "Waffe", kopf: "Kopf", rumpf: "Rumpf", schild: "Schild", amulett: "Amulett", ring: "Ring" };
const STAT_NAMES = { atk: "Angriff", def: "Verteidigung", hp: "Leben", crit: "Krit", spd: "Tempo", luck: "Glück" };

const BASES = [
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
const PREFIXES = [
  { name: "Flammend", stat: "atk", v: 0.35 }, { name: "Scharf", stat: "atk", v: 0.25 }, { name: "Grimmig", stat: "atk", v: 0.45 },
  { name: "Gehärtet", stat: "def", v: 0.3 }, { name: "Stählern", stat: "def", v: 0.45 }, { name: "Ehern", stat: "def", v: 0.6 },
  { name: "Vital", stat: "hp", v: 0.5 }, { name: "Robust", stat: "hp", v: 0.8 },
  { name: "Tödlich", stat: "crit", v: 0.5 }, { name: "Flink", stat: "spd", v: 0.4 }, { name: "Glücklich", stat: "luck", v: 0.5 },
];
const SUFFIXES = [
  { name: "des Bären", stat: "hp", v: 1.0 }, { name: "des Wolfes", stat: "spd", v: 0.5 }, { name: "der Viper", stat: "crit", v: 0.7 },
  { name: "des Titanen", stat: "def", v: 0.7 }, { name: "der Sturmfront", stat: "atk", v: 0.5 }, { name: "des Fuchses", stat: "luck", v: 0.7 },
  { name: "der Morgenröte", stat: "hp", v: 0.6 }, { name: "des Drachen", stat: "atk", v: 0.7 }, { name: "der Ewigkeit", stat: "def", v: 0.9 },
];
const POTIONS = {
  heiltrank_k: { name: "Kleiner Heiltrank", heal: 30, price: 12, color: "#ff5f6d" },
  heiltrank_m: { name: "Heiltrank",         heal: 80, price: 34, color: "#ff2f4f" },
  heiltrank_g: { name: "Großer Heiltrank",  heal: 200, price: 90, color: "#c8102e" },
  elixier:     { name: "Elixier",           heal: 9999, price: 260, color: "#ffd23f" },
};

let itemCounter = 1;
function statScale(v, ilvl) { return v * (1 + ilvl * 0.13); }

function rollRarity(r, ilvl, luck, minIdx = 0) {
  const boost = 1 + luck * 0.04 + ilvl * 0.01;
  const weights = RARITIES.map((ra, i) => i < minIdx ? 0 : ra.weight * (i > 0 ? boost : 1));
  const total = weights.reduce((a, b) => a + b, 0);
  let x = r() * total;
  for (let i = 0; i < weights.length; i++) { x -= weights[i]; if (x <= 0) return i; }
  return weights.length - 1;
}

function generateItem(r, ilvl, luck = 0, minRarity = 0, forcedSlot = null) {
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
function effectiveStats(item) {
  if (!item || item.kind !== "gear") return {};
  const m = 1 + item.upg * 0.12;
  const out = {};
  for (const k in item.stats) out[k] = Math.round(item.stats[k] * m);
  return out;
}
function upgradeCost(item) { return Math.round((item.value * 0.6 + 20) * Math.pow(1.7, item.upg)); }
function makePotion(id, qty = 1) { return { uid: "p_" + id, kind: "trank", potId: id, name: POTIONS[id].name, qty, value: Math.round(POTIONS[id].price * 0.45) }; }

/* ---------- Drop-Tabellen ---------- */
function rollDrops(r, mob, luck, isBoss) {
  const drops = [];
  const [g0, g1] = mob.gold;
  const gold = Math.round(rint(r, g0, g1) * (1 + luck * 0.03) * (isBoss ? 6 : 1));
  drops.push({ type: "gold", amount: gold });
  const ilvl = mob.level;
  if (isBoss) {
    drops.push({ type: "item", item: generateItem(r, ilvl + 3, luck, 3) });
    drops.push({ type: "item", item: generateItem(r, ilvl + 1, luck, 2) });
    drops.push({ type: "potion", id: "heiltrank_g", qty: 2 });
    return drops;
  }
  const itemChance = 0.22 + luck * 0.012;
  if (chance(r, itemChance)) drops.push({ type: "item", item: generateItem(r, ilvl, luck) });
  if (chance(r, 0.14)) drops.push({ type: "potion", id: ilvl > 14 ? "heiltrank_m" : "heiltrank_k", qty: 1 });
  return drops;
}

/* ============================================================
   WELTGENERIERUNG
   ============================================================ */
const VILLAGES = {
  "2,3": { name: "Elmshain",  start: true, greeting: "Willkommen in Elmshain. Hier beginnt jede Reise." },
  "3,1": { name: "Kargstein", greeting: "Kargstein. Der Wind hier frisst Fleisch und Stahl." },
  "5,3": { name: "Dünenruh",  greeting: "Dünenruh. Wasser ist hier teurer als Gold." },
  "1,5": { name: "Moorhall",  greeting: "Moorhall. Sprich leise, das Moor hört zu." },
};
const DUNGEONS = [
  { id: 0, name: "Waldschrein", level: 6,  screen: "0,4", floor: "#3e4a36", floor2: "#465542", wall: "#22301c", wall2: "#5a7a48", mobs: ["spinne", "waldgeist", "wolf"] },
  { id: 1, name: "Steinhalle", level: 13, screen: "4,1", floor: "#4a4a52", floor2: "#52525c", wall: "#2a2a30", wall2: "#7a7a88", mobs: ["skelett", "golem", "fledermaus"] },
  { id: 2, name: "Ascheturm",  level: 27, screen: "4,0", floor: "#3a2a28", floor2: "#452f2c", wall: "#1a0e0c", wall2: "#a04020", mobs: ["feuerteufel", "golem", "skelett"] },
];
const DUNGEON_BY_SCREEN = Object.fromEntries(DUNGEONS.map(d => [d.screen, d]));

const idx = (x, y) => y * VW + x;

function isProtected(x, y) {
  // Kreuz durch die Mitte + Öffnungen an den Rändern: garantiert Durchgang
  if (x >= 6 && x <= 8) return true;
  if (y >= 4 && y <= 6) return true;
  return false;
}

function genOverworldScreen(seed, sx, sy) {
  const key = `${sx},${sy}`;
  const r = rngFor(seed, "screen" + key);
  const regId = regionAt(sx, sy);
  const reg = REGIONS[regId];
  const tiles = new Uint8Array(VW * VH);
  for (let i = 0; i < tiles.length; i++) tiles[i] = pick(r, reg.ground);

  // Dekor in Clustern (geglättetes Rauschen)
  const field = new Float32Array(VW * VH);
  for (let i = 0; i < field.length; i++) field[i] = r();
  const smooth = new Float32Array(VW * VH);
  for (let y = 0; y < VH; y++) for (let x = 0; x < VW; x++) {
    let s = 0, n = 0;
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
      const xx = x + dx, yy = y + dy;
      if (xx >= 0 && yy >= 0 && xx < VW && yy < VH) { s += field[idx(xx, yy)]; n++; }
    }
    smooth[idx(x, y)] = s / n;
  }
  const sorted = Array.from(smooth).sort((a, b) => b - a);
  const cut = sorted[Math.floor(sorted.length * reg.decorDensity * 1.4)] ?? 1;
  const clusterType = new Uint8Array(VW * VH);
  for (let y = 0; y < VH; y++) for (let x = 0; x < VW; x++) {
    if (isProtected(x, y)) continue;
    const i = idx(x, y);
    if (smooth[i] >= cut) {
      // Clustertyp aus grober Zelle ableiten, damit Wasser/Bäume zusammenhängen
      const cell = hashStr(seed + key + Math.floor(x / 3) + "_" + Math.floor(y / 3));
      tiles[i] = reg.decor[cell % reg.decor.length];
      clusterType[i] = 1;
    } else if (chance(r, reg.decorDensity * 0.35)) {
      tiles[i] = pick(r, reg.decor.filter(t => t !== T.WATER && t !== T.LAVA));
    }
  }
  // Weltrand
  const border = regId === "wiese" || regId === "wald" ? T.TREE : T.ROCK;
  for (let x = 0; x < VW; x++) { if (sy === 0) tiles[idx(x, 0)] = border; if (sy === WORLD_H - 1) tiles[idx(x, VH - 1)] = border; }
  for (let y = 0; y < VH; y++) { if (sx === 0) tiles[idx(0, y)] = border; if (sx === WORLD_W - 1) tiles[idx(VW - 1, y)] = border; }

  const screen = { key, tiles, region: regId, doors: {}, village: null, dungeon: null, chest: null };

  if (VILLAGES[key]) buildVillage(screen, r, VILLAGES[key], regId);
  else if (DUNGEON_BY_SCREEN[key]) buildDungeonEntrance(screen, DUNGEON_BY_SCREEN[key], regId);
  else if (chance(r, 0.25)) {
    // Weltkiste
    const spots = [];
    for (let y = 2; y < VH - 2; y++) for (let x = 2; x < VW - 2; x++) if (!isProtected(x, y) && !SOLID.has(tiles[idx(x, y)])) spots.push([x, y]);
    if (spots.length) { const [cx, cy] = pick(r, spots); tiles[idx(cx, cy)] = T.CHEST; screen.chest = { x: cx, y: cy, id: "w" + key }; }
  }
  return screen;
}

function buildVillage(screen, r, vill, regId) {
  const { tiles } = screen;
  const ground = regId === "wueste" ? T.SAND : regId === "eis" ? T.SNOW : T.GRASS;
  for (let i = 0; i < tiles.length; i++) tiles[i] = ground;
  for (let x = 1; x < VW - 1; x++) tiles[idx(x, 5)] = T.PATH;
  for (let y = 1; y < VH - 1; y++) tiles[idx(7, y)] = T.PATH;
  for (let i = 0; i < 6; i++) { const x = rint(r, 1, VW - 2), y = rint(r, 1, VH - 2); if (tiles[idx(x, y)] === ground) tiles[idx(x, y)] = regId === "wueste" ? T.CACTUS : T.FLOWER; }
  const houses = [
    { x: 2, y: 1, type: "shop" },  { x: 10, y: 1, type: "heal" },
    { x: 2, y: 7, type: "smith" }, { x: 10, y: 7, type: "sage" },
  ];
  for (const h of houses) {
    for (let dy = 0; dy < 2; dy++) for (let dx = 0; dx < 3; dx++) tiles[idx(h.x + dx, h.y + dy)] = T.HOUSE;
    const doorY = h.y === 1 ? h.y + 1 : h.y;      // untere Häuser: Tür oben
    tiles[idx(h.x + 1, doorY)] = T.DOOR;
    screen.doors[`${h.x + 1},${doorY}`] = h.type;
    for (let dx = 0; dx < 3; dx++) { const py = h.y === 1 ? h.y + 2 : h.y - 1; if (tiles[idx(h.x + dx, py)] !== T.PATH) tiles[idx(h.x + dx, py)] = T.PATH; }
    for (let yy = Math.min(doorY, 5); yy <= Math.max(doorY, 5); yy++) tiles[idx(h.x + 1, yy)] = tiles[idx(h.x + 1, yy)] === T.DOOR ? T.DOOR : T.PATH;
  }
  tiles[idx(6, 4)] = T.WATER; tiles[idx(8, 4)] = T.WATER;   // kleine Brunnen
  tiles[idx(8, 9)] = T.SIGN; screen.doors["8,9"] = "sign";
  // Rand
  const border = regId === "wueste" ? T.ROCK : T.TREE;
  for (let x = 0; x < VW; x++) { if (!isProtected(x, 0)) tiles[idx(x, 0)] = border; if (!isProtected(x, VH - 1)) tiles[idx(x, VH - 1)] = border; }
  for (let y = 0; y < VH; y++) { if (!isProtected(0, y)) tiles[idx(0, y)] = border; if (!isProtected(VW - 1, y)) tiles[idx(VW - 1, y)] = border; }
  screen.village = vill;
}

function buildDungeonEntrance(screen, d, regId) {
  const { tiles } = screen;
  for (let dy = 1; dy <= 3; dy++) for (let dx = 5; dx <= 9; dx++) tiles[idx(dx, dy)] = T.ROCK;
  tiles[idx(7, 3)] = T.ENTRANCE;
  tiles[idx(7, 4)] = T.PATH; tiles[idx(7, 5)] = T.PATH;
  screen.dungeon = d;
}

/* ---------- Dungeons ---------- */
const DG = 3; // 3x3 Räume
function genDungeon(seed, d) {
  const r = rngFor(seed, "dungeon" + d.id);
  const entry = { x: 1, y: 2 };
  const conn = {};
  const K = (x, y) => `${x},${y}`;
  for (let y = 0; y < DG; y++) for (let x = 0; x < DG; x++) conn[K(x, y)] = { n: false, s: false, e: false, w: false };
  // Zufälliger Spannbaum (DFS)
  const visited = new Set([K(entry.x, entry.y)]);
  const stack = [entry];
  while (stack.length) {
    const cur = stack[stack.length - 1];
    const nbs = [[0, -1, "n", "s"], [0, 1, "s", "n"], [1, 0, "e", "w"], [-1, 0, "w", "e"]]
      .map(([dx, dy, a, b]) => ({ x: cur.x + dx, y: cur.y + dy, a, b }))
      .filter(n => n.x >= 0 && n.y >= 0 && n.x < DG && n.y < DG && !visited.has(K(n.x, n.y)));
    if (!nbs.length) { stack.pop(); continue; }
    const n = pick(r, nbs);
    conn[K(cur.x, cur.y)][n.a] = true; conn[K(n.x, n.y)][n.b] = true;
    visited.add(K(n.x, n.y)); stack.push({ x: n.x, y: n.y });
  }
  // Extra-Verbindungen für Schleifen
  for (let i = 0; i < 2; i++) {
    const x = rint(r, 0, DG - 2), y = rint(r, 0, DG - 1);
    conn[K(x, y)].e = true; conn[K(x + 1, y)].w = true;
  }
  // Bossraum = weitester Raum (BFS)
  const dist = { [K(entry.x, entry.y)]: 0 };
  const q = [entry];
  while (q.length) {
    const c = q.shift();
    const cd = dist[K(c.x, c.y)];
    const cc = conn[K(c.x, c.y)];
    for (const [dx, dy, dir] of [[0, -1, "n"], [0, 1, "s"], [1, 0, "e"], [-1, 0, "w"]]) {
      if (!cc[dir]) continue;
      const k = K(c.x + dx, c.y + dy);
      if (dist[k] === undefined) { dist[k] = cd + 1; q.push({ x: c.x + dx, y: c.y + dy }); }
    }
  }
  let bossKey = K(entry.x, entry.y);
  for (const k in dist) if (dist[k] > dist[bossKey]) bossKey = k;
  const others = Object.keys(conn).filter(k => k !== bossKey && k !== K(entry.x, entry.y));
  const chestKeys = new Set();
  while (chestKeys.size < 2 && others.length) chestKeys.add(pick(r, others));

  const rooms = {};
  for (const k in conn) {
    const type = k === K(entry.x, entry.y) ? "entry" : k === bossKey ? "boss" : chestKeys.has(k) ? "chest" : "normal";
    rooms[k] = genDungeonRoom(rngFor(seed, "room" + d.id + k), d, conn[k], type, k);
  }
  return { id: d.id, rooms, entry };
}

function genDungeonRoom(r, d, c, type, key) {
  const tiles = new Uint8Array(VW * VH);
  tiles.fill(T.FLOOR);
  for (let x = 0; x < VW; x++) { tiles[idx(x, 0)] = T.WALL; tiles[idx(x, VH - 1)] = T.WALL; }
  for (let y = 0; y < VH; y++) { tiles[idx(0, y)] = T.WALL; tiles[idx(VW - 1, y)] = T.WALL; }
  if (c.n) for (let x = 6; x <= 8; x++) tiles[idx(x, 0)] = T.FLOOR;
  if (c.s) for (let x = 6; x <= 8; x++) tiles[idx(x, VH - 1)] = T.FLOOR;
  if (c.w) for (let y = 4; y <= 6; y++) tiles[idx(0, y)] = T.FLOOR;
  if (c.e) for (let y = 4; y <= 6; y++) tiles[idx(VW - 1, y)] = T.FLOOR;
  // Säulen / Lava
  const nPillars = type === "boss" ? 4 : rint(r, 2, 6);
  for (let i = 0; i < nPillars; i++) {
    const x = rint(r, 2, VW - 3), y = rint(r, 2, VH - 3);
    if (!isProtected(x, y)) tiles[idx(x, y)] = d.id === 2 && chance(r, 0.5) ? T.LAVA : T.PILLAR;
  }
  const screen = { key: "d" + d.id + ":" + key, tiles, region: null, doors: {}, village: null, dungeon: null, chest: null, dungeonRoom: { type, d } };
  if (type === "entry") { tiles[idx(7, VH - 2)] = T.EXIT; }
  if (type === "chest") { tiles[idx(7, 5)] = T.CHEST; screen.chest = { x: 7, y: 5, id: "d" + d.id + key }; }
  return screen;
}

/* ---------- Monster spawnen ---------- */
function makeMob(typeId, level, x, y, bossDef = null) {
  const base = MOBS[typeId];
  const lvlMult = 1 + (level - 1) * 0.28;
  const m = {
    id: Math.random().toString(36).slice(2), type: typeId, name: bossDef ? bossDef.name : base.name,
    x, y, vx: 0, vy: 0, level,
    maxHp: Math.round(base.hp * lvlMult * (bossDef ? bossDef.hpMult : 1)),
    atk: Math.round(base.atk * (1 + (level - 1) * 0.16) * (bossDef ? bossDef.atkMult : 1)),
    spd: base.spd * (bossDef ? 1.1 : 1), size: bossDef ? bossDef.size : base.size,
    shape: base.shape, color: bossDef ? bossDef.color : base.color, color2: bossDef ? bossDef.color2 : base.color2,
    ai: base.ai, xp: Math.round(base.xp * (1 + (level - 1) * 0.2) * (bossDef ? 12 : 1)), gold: base.gold,
    t: Math.random() * 10, cd: 0, hitT: 0, wx: 0, wy: 0, boss: !!bossDef, dead: false,
  };
  m.hp = m.maxHp;
  return m;
}
function walkable(tiles, tx, ty) {
  if (tx < 0 || ty < 0 || tx >= VW || ty >= VH) return false;
  const t = tiles[idx(tx, ty)];
  return !SOLID.has(t) && t !== T.LAVA && t !== T.DOOR && t !== T.CHEST && t !== T.ENTRANCE && t !== T.EXIT;
}
function spawnMobsFor(screen, seed, visitCount) {
  const mobs = [];
  const r = rngFor(seed, "mobs" + screen.key + ":" + visitCount);
  let pool, level, count;
  if (screen.dungeonRoom) {
    const d = screen.dungeonRoom.d;
    pool = d.mobs; level = d.level;
    if (screen.dungeonRoom.type === "boss") {
      const bd = BOSSES[d.id];
      mobs.push(makeMob(bd.base, level + 2, 7 * TS + 8, 3 * TS + 8, bd));
      count = 2;
    } else count = screen.dungeonRoom.type === "entry" ? 1 : rint(r, 3, 5);
  } else {
    if (screen.village) return mobs;
    const reg = REGIONS[screen.region];
    pool = reg.mobs; level = reg.level; count = rint(r, reg.mobCount[0], reg.mobCount[1]);
  }
  let tries = 0;
  while (mobs.length < count && tries++ < 200) {
    const tx = rint(r, 1, VW - 2), ty = rint(r, 1, VH - 2);
    if (!walkable(screen.tiles, tx, ty)) continue;
    if (Math.abs(tx - 7) < 3 && Math.abs(ty - 5) < 3) continue;  // nicht direkt beim Spieler
    const type = pick(r, pool);
    mobs.push(makeMob(type, level + rint(r, 0, 2), tx * TS + 8, ty * TS + 8));
  }
  return mobs;
}

/* ============================================================
   SPIELER & ENGINE
   ============================================================ */
function newPlayer(seed) {
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
function xpNeed(level) { return Math.floor(30 * Math.pow(level, 1.45)); }
function derive(P) {
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
function addToInventory(P, item) {
  if (item.kind === "trank") {
    const ex = P.inventory.find(i => i.kind === "trank" && i.potId === item.potId);
    if (ex) { ex.qty += item.qty; return true; }
  }
  if (P.inventory.length >= 30) return false;
  P.inventory.push(item);
  return true;
}
function usePotion(G) {
  const P = G.P;
  const pots = P.inventory.filter(i => i.kind === "trank").sort((a, b) => POTIONS[a.potId].heal - POTIONS[b.potId].heal);
  if (!pots.length) { flash(G, "Keine Tränke", "#ffb347"); return; }
  const d = derive(P);
  if (P.hp >= d.maxHp) { flash(G, "Volles Leben", "#9ad"); return; }
  const missing = d.maxHp - P.hp;
  let pot = pots.find(p => POTIONS[p.potId].heal >= missing) || pots[pots.length - 1];
  const heal = Math.min(missing, POTIONS[pot.potId].heal);
  P.hp += heal;
  pot.qty -= 1;
  if (pot.qty <= 0) P.inventory = P.inventory.filter(i => i !== pot);
  G.fx.push({ kind: "num", x: P.x, y: P.y - 12, text: "+" + heal, color: "#6fe28a", t: 1 });
  G.dirty = true;
}
function flash(G, text, color = "#fff") { G.msg = { text, color, t: 2.2 }; G.dirty = true; }

/* ---------- Bildschirmwechsel ---------- */
function getScreen(G, area, sx, sy) {
  if (area === "over") {
    const key = `${sx},${sy}`;
    if (!G.world.screens[key]) G.world.screens[key] = genOverworldScreen(G.seed, sx, sy);
    return G.world.screens[key];
  }
  const id = +area.slice(1);
  if (!G.world.dungeons[id]) G.world.dungeons[id] = genDungeon(G.seed, DUNGEONS[id]);
  return G.world.dungeons[id].rooms[`${sx},${sy}`];
}
function enterScreen(G, area, sx, sy, px, py, banner = true) {
  const P = G.P;
  const prevRegion = G.screen ? G.screen.region : null;
  P.area = area; P.sx = sx; P.sy = sy; P.x = px; P.y = py;
  const screen = getScreen(G, area, sx, sy);
  G.screen = screen;
  const vkey = screen.key;
  P.visits[vkey] = (P.visits[vkey] || 0) + 1;
  G.mobs = spawnMobsFor(screen, G.seed, P.visits[vkey]);
  if (screen.dungeonRoom && screen.dungeonRoom.type === "boss" && P.cleared[screen.dungeonRoom.d.id]) G.mobs = G.mobs.filter(m => !m.boss);
  G.projs = []; G.drops = []; G.fx = [];
  unstick(P, screen.tiles);
  if (screen.village) { P.lastVillage = `${sx},${sy}`; if (banner) G.banner = { text: screen.village.name, sub: "Dorf", t: 2.6 }; }
  else if (screen.dungeonRoom) { if (banner && screen.dungeonRoom.type === "entry") G.banner = { text: screen.dungeonRoom.d.name, sub: "Dungeon, Stufe " + screen.dungeonRoom.d.level, t: 2.6 }; }
  else if (banner && screen.region !== prevRegion) G.banner = { text: REGIONS[screen.region].name, sub: "Stufe " + REGIONS[screen.region].level + "+", t: 2.6 };
  G.dirty = true;
  G.save && G.save();
}

function unstick(P, tiles) {
  const blocked = (x, y) => solidAt(tiles, x - 5, y - 5) || solidAt(tiles, x + 4.9, y - 5) || solidAt(tiles, x - 5, y + 4.9) || solidAt(tiles, x + 4.9, y + 4.9);
  if (!blocked(P.x, P.y)) return;
  const tx = clamp(Math.floor(P.x / TS), 0, VW - 1), ty = clamp(Math.floor(P.y / TS), 0, VH - 1);
  for (let rad = 1; rad < 8; rad++) {
    for (let dy = -rad; dy <= rad; dy++) for (let dx = -rad; dx <= rad; dx++) {
      const x = tx + dx, y = ty + dy;
      if (x < 1 || y < 1 || x >= VW - 1 || y >= VH - 1) continue;
      if (!SOLID.has(tiles[idx(x, y)]) && tiles[idx(x, y)] !== T.LAVA) { P.x = x * TS + 8; P.y = y * TS + 8; return; }
    }
  }
}

/* ---------- Kollision ---------- */
function solidAt(tiles, px, py) {
  const tx = Math.floor(px / TS), ty = Math.floor(py / TS);
  if (tx < 0 || ty < 0 || tx >= VW || ty >= VH) return false;
  return SOLID.has(tiles[idx(tx, ty)]);
}
function moveWithCollision(tiles, e, dx, dy, hw, hh) {
  // hw/hh = halbe Hitbox-Breite/Höhe
  if (dx !== 0) {
    const nx = e.x + dx;
    const l = nx - hw, rr = nx + hw - 0.01, t = e.y - hh, b = e.y + hh - 0.01;
    if (!solidAt(tiles, l, t) && !solidAt(tiles, rr, t) && !solidAt(tiles, l, b) && !solidAt(tiles, rr, b)) e.x = nx;
  }
  if (dy !== 0) {
    const ny = e.y + dy;
    const l = e.x - hw, rr = e.x + hw - 0.01, t = ny - hh, b = ny + hh - 0.01;
    if (!solidAt(tiles, l, t) && !solidAt(tiles, rr, t) && !solidAt(tiles, l, b) && !solidAt(tiles, rr, b)) e.y = ny;
  }
}

/* ---------- Kampf ---------- */
function damageMob(G, m, dmg, crit, kx, ky) {
  m.hp -= dmg; m.hitT = 0.18;
  m.vx += kx * 160; m.vy += ky * 160;
  G.fx.push({ kind: "num", x: m.x, y: m.y - m.size, text: String(dmg), color: crit ? "#ffd23f" : "#fff", t: 0.8, big: crit });
  if (m.hp <= 0) killMob(G, m);
}
function killMob(G, m) {
  const P = G.P;
  m.dead = true;
  P.kills++;
  for (let i = 0; i < 8; i++) G.fx.push({ kind: "part", x: m.x, y: m.y, vx: (Math.random() - 0.5) * 90, vy: (Math.random() - 0.5) * 90, color: m.color, t: 0.5 });
  const d = derive(P);
  const r = mulberry32((Math.random() * 1e9) | 0);
  const drops = rollDrops(r, m, d.luck, m.boss);
  for (const dr of drops) {
    const ang = Math.random() * Math.PI * 2;
    G.drops.push({ ...dr, x: m.x + Math.cos(ang) * 6, y: m.y + Math.sin(ang) * 6, vx: Math.cos(ang) * 40, vy: Math.sin(ang) * 40, t: 0 });
  }
  gainXp(G, m.xp);
  if (m.boss) {
    const dId = G.screen.dungeonRoom.d.id;
    P.cleared[dId] = true; P.hearts += 1; P.hp = derive(P).maxHp;
    G.banner = { text: m.name + " besiegt", sub: "Herzcontainer erhalten", t: 4 };
  }
}
function gainXp(G, amount) {
  const P = G.P;
  P.xp += amount;
  G.fx.push({ kind: "num", x: P.x, y: P.y - 14, text: "+" + amount + " XP", color: "#8fd3ff", t: 1, small: true });
  while (P.xp >= xpNeed(P.level)) {
    P.xp -= xpNeed(P.level); P.level++;
    P.hp = derive(P).maxHp;
    G.banner = { text: "Stufe " + P.level, sub: "Angriff und Leben gestiegen", t: 3 };
  }
  G.dirty = true;
}
function hurtPlayer(G, amount) {
  const P = G.P;
  if (G.invT > 0 || G.dead) return;
  const d = derive(P);
  const dmg = Math.max(1, Math.round(amount * (0.9 + Math.random() * 0.2) - d.def * 0.45));
  P.hp -= dmg; G.invT = 0.8;
  G.fx.push({ kind: "num", x: P.x, y: P.y - 14, text: "-" + dmg, color: "#ff5f6d", t: 0.9 });
  G.shake = 0.15;
  if (P.hp <= 0) { P.hp = 0; G.dead = true; }
  G.dirty = true;
}

/* ---------- Update ---------- */
function update(G, dt, input) {
  const P = G.P, tiles = G.screen.tiles, d = derive(P);
  G.time += dt;
  if (G.invT > 0) G.invT -= dt;
  if (G.shake > 0) G.shake -= dt;
  if (G.msg && (G.msg.t -= dt) <= 0) G.msg = null;
  if (G.banner && (G.banner.t -= dt) <= 0) G.banner = null;
  if (G.trigCd > 0) G.trigCd -= dt;
  if (G.dead) return;

  // --- Spielerbewegung ---
  let ix = input.x, iy = input.y;
  const len = Math.hypot(ix, iy);
  if (len > 1) { ix /= len; iy /= len; }
  if (len > 0.2) {
    if (Math.abs(ix) > Math.abs(iy)) P.dir = ix > 0 ? "right" : "left"; else P.dir = iy > 0 ? "down" : "up";
  }
  const onSwamp = tiles[idx(clamp(Math.floor(P.x / TS), 0, VW - 1), clamp(Math.floor(P.y / TS), 0, VH - 1))] === T.SWAMP;
  let speed = 68 * (1 + d.spd / 100) * (onSwamp ? 0.6 : 1) * (G.attack.t > 0 ? 0.35 : 1);
  moveWithCollision(tiles, P, ix * speed * dt, iy * speed * dt, 5, 5);
  G.walkT = len > 0.2 ? G.walkT + dt : 0;

  // --- Angriff ---
  G.attack.t = Math.max(-1, G.attack.t - dt);
  const atkSpeed = 1 + d.spd / 150;
  if (input.attack && G.attack.t <= -0.08 / atkSpeed) {
    G.attack = { t: 0.2 / atkSpeed, dir: P.dir, hit: new Set(), maxT: 0.2 / atkSpeed };
  }
  if (G.attack.t > 0) {
    const reach = d.reach;
    const box = attackBox(P, G.attack.dir, reach);
    for (const m of G.mobs) {
      if (m.dead || G.attack.hit.has(m.id)) continue;
      if (rectHit(box, { x: m.x - m.size / 2, y: m.y - m.size / 2, w: m.size, h: m.size })) {
        G.attack.hit.add(m.id);
        const crit = Math.random() * 100 < d.crit;
        const dmg = Math.max(1, Math.round(d.atk * (0.85 + Math.random() * 0.3) * (crit ? 2 : 1) * (P.buffT > 0 ? 1.5 : 1)));
        const kx = Math.sign(m.x - P.x) || 0, ky = Math.sign(m.y - P.y) || 0;
        damageMob(G, m, dmg, crit, kx * 0.7, ky * 0.7);
      }
    }
  }
  if (P.buffT > 0) P.buffT -= dt;

  // --- Monster ---
  for (const m of G.mobs) {
    if (m.dead) continue;
    m.t += dt;
    if (m.hitT > 0) m.hitT -= dt;
    if (m.cd > 0) m.cd -= dt;
    const dx = P.x - m.x, dy = P.y - m.y, dist = Math.hypot(dx, dy) || 1;
    const nx = dx / dist, ny = dy / dist;
    let mx = 0, my = 0;
    const aware = dist < 130 || !!G.screen.dungeonRoom;
    if (m.ai === "chase") {
      if (aware) { mx = nx; my = ny; } else { mx = Math.cos(m.t * 0.7 + m.wx); my = Math.sin(m.t * 0.9 + m.wy); }
    } else if (m.ai === "ranged") {
      if (aware) {
        if (dist > 80) { mx = nx; my = ny; } else if (dist < 50) { mx = -nx; my = -ny; } else { mx = -ny * 0.6; my = nx * 0.6; }
        if (m.cd <= 0 && dist < 150) {
          m.cd = m.boss ? 0.9 : 1.7;
          const spd = 90;
          G.projs.push({ x: m.x, y: m.y, vx: nx * spd, vy: ny * spd, dmg: m.atk * 0.8, color: m.color2, t: 3 });
          if (m.boss) for (const a of [-0.5, 0.5]) G.projs.push({ x: m.x, y: m.y, vx: Math.cos(Math.atan2(ny, nx) + a) * spd, vy: Math.sin(Math.atan2(ny, nx) + a) * spd, dmg: m.atk * 0.8, color: m.color2, t: 3 });
        }
      }
    } else if (m.ai === "erratic") {
      if (Math.floor(m.t * 3) !== Math.floor((m.t - dt) * 3)) { const a = Math.random() * Math.PI * 2; m.wx = Math.cos(a) * 0.7 + nx * 0.5; m.wy = Math.sin(a) * 0.7 + ny * 0.5; }
      mx = m.wx; my = m.wy;
    }
    const sp = m.spd;
    const kb = Math.hypot(m.vx, m.vy);
    m.vx *= Math.pow(0.02, dt); m.vy *= Math.pow(0.02, dt);
    const half = m.size / 2 - 1;
    const stepX = (kb > 5 ? m.vx : mx * sp) * dt, stepY = (kb > 5 ? m.vy : my * sp) * dt;
    const ox = m.x, oy = m.y;
    moveWithCollision(tiles, m, stepX, stepY, half, half);
    m.x = clamp(m.x, half + 1, W - half - 1); m.y = clamp(m.y, half + 1, H - half - 1);
    if (m.ai === "chase" && !aware && m.x === ox && m.y === oy) { m.wx += 1.7; m.wy += 1.1; }
    // Kontaktschaden
    if (dist < m.size / 2 + 5) hurtPlayer(G, m.atk);
  }
  G.mobs = G.mobs.filter(m => !m.dead);

  // --- Projektile ---
  for (const p of G.projs) {
    p.x += p.vx * dt; p.y += p.vy * dt; p.t -= dt;
    if (solidAt(tiles, p.x, p.y) || p.x < 0 || p.y < 0 || p.x > W || p.y > H) p.t = 0;
    if (Math.hypot(p.x - P.x, p.y - P.y) < 7) { hurtPlayer(G, p.dmg); p.t = 0; }
  }
  G.projs = G.projs.filter(p => p.t > 0);

  // --- Drops ---
  for (const dr of G.drops) {
    dr.t += dt;
    dr.x += dr.vx * dt; dr.y += dr.vy * dt; dr.vx *= 0.9; dr.vy *= 0.9;
    dr.x = clamp(dr.x, 4, W - 4); dr.y = clamp(dr.y, 4, H - 4);
    const dist = Math.hypot(dr.x - P.x, dr.y - P.y);
    if (dr.type === "gold" && dist < 26 && dr.t > 0.3) { dr.x += (P.x - dr.x) * 8 * dt; dr.y += (P.y - dr.y) * 8 * dt; }
    if (dist < 9 && dr.t > 0.3) {
      if (dr.type === "gold") { P.gold += dr.amount; G.fx.push({ kind: "num", x: dr.x, y: dr.y - 6, text: "+" + dr.amount + "G", color: "#ffd23f", t: 0.8, small: true }); dr.done = true; }
      else if (dr.type === "potion") { addToInventory(P, makePotion(dr.id, dr.qty)); flash(G, POTIONS[dr.id].name + " erhalten", POTIONS[dr.id].color); dr.done = true; }
      else if (dr.type === "item") {
        if (addToInventory(P, dr.item)) { flash(G, dr.item.name, RARITY_BY_ID[dr.item.rarity].color); dr.done = true; }
        else if (!dr.warned) { flash(G, "Inventar voll", "#ff5f6d"); dr.warned = true; }
      }
      G.dirty = true;
    }
  }
  G.drops = G.drops.filter(dr => !dr.done);

  // --- Effekte ---
  for (const f of G.fx) { f.t -= dt; if (f.kind === "part") { f.x += f.vx * dt; f.y += f.vy * dt; } if (f.kind === "num") f.y -= 18 * dt; }
  G.fx = G.fx.filter(f => f.t > 0);

  // --- Tile-Trigger ---
  const tx = Math.floor(P.x / TS), ty = Math.floor(P.y / TS);
  if (tx >= 0 && ty >= 0 && tx < VW && ty < VH) {
    const t = tiles[idx(tx, ty)];
    if (t === T.LAVA) hurtPlayer(G, 12 + P.level * 2);
    if (G.trigCd <= 0) {
      if (t === T.DOOR) {
        const type = G.screen.doors[`${tx},${ty}`];
        G.trigCd = 0.6;
        const back = ty <= 3 ? ty + 1 : ty - 1;
        G.panelReturn = { x: tx * TS + 8, y: back * TS + 8 };
        G.openPanel(type);
      } else if (t === T.SIGN) {
        G.trigCd = 3; flash(G, G.screen.village ? G.screen.village.greeting : "Ein Wegweiser", "#e9dcb8");
      } else if (t === T.ENTRANCE) {
        const dg = G.screen.dungeon;
        G.trigCd = 1;
        enterScreen(G, "d" + dg.id, 1, 2, 7 * TS + 8, (VH - 3) * TS + 8);
        return;
      } else if (t === T.EXIT) {
        const dg = G.screen.dungeonRoom.d;
        const [sx, sy] = dg.screen.split(",").map(Number);
        G.trigCd = 1;
        enterScreen(G, "over", sx, sy, 7 * TS + 8, 5 * TS + 8);
        return;
      } else if (t === T.CHEST && G.screen.chest && !P.chests[G.screen.chest.id]) {
        P.chests[G.screen.chest.id] = true; G.trigCd = 1;
        const r = mulberry32((Math.random() * 1e9) | 0);
        const lvl = G.screen.dungeonRoom ? G.screen.dungeonRoom.d.level + 2 : REGIONS[G.screen.region].level + 1;
        const item = generateItem(r, lvl, d.luck, G.screen.dungeonRoom ? 2 : 1);
        const gold = rint(r, lvl * 4, lvl * 9);
        G.drops.push({ type: "item", item, x: P.x, y: P.y + 10, vx: 0, vy: 30, t: 0 });
        G.drops.push({ type: "gold", amount: gold, x: P.x - 6, y: P.y + 10, vx: -20, vy: 30, t: 0 });
        G.banner = { text: "Truhe geöffnet", sub: item.name, t: 2.5 };
      }
    }
  }

  // --- Bildschirmwechsel ---
  const isOver = P.area === "over";
  if (P.x < 3) { if (isOver && P.sx > 0) enterScreen(G, P.area, P.sx - 1, P.sy, W - 6, P.y); else if (!isOver && P.sx > 0) enterScreen(G, P.area, P.sx - 1, P.sy, W - 10, P.y); else P.x = 3; }
  else if (P.x > W - 3) { const maxX = isOver ? WORLD_W - 1 : DG - 1; if (P.sx < maxX) enterScreen(G, P.area, P.sx + 1, P.sy, isOver ? 6 : 10, P.y); else P.x = W - 3; }
  else if (P.y < 3) { if (P.sy > 0) enterScreen(G, P.area, P.sx, P.sy - 1, P.x, isOver ? H - 6 : H - 10); else P.y = 3; }
  else if (P.y > H - 3) { const maxY = isOver ? WORLD_H - 1 : DG - 1; if (P.sy < maxY) enterScreen(G, P.area, P.sx, P.sy + 1, P.x, isOver ? 6 : 10); else P.y = H - 3; }
}
function attackBox(P, dir, reach) {
  const w = 14;
  if (dir === "up") return { x: P.x - w / 2, y: P.y - reach - 4, w, h: reach + 2 };
  if (dir === "down") return { x: P.x - w / 2, y: P.y + 2, w, h: reach + 2 };
  if (dir === "left") return { x: P.x - reach - 4, y: P.y - w / 2, w: reach + 2, h: w };
  return { x: P.x + 2, y: P.y - w / 2, w: reach + 2, h: w };
}
function rectHit(a, b) { return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y; }

/* ============================================================
   RENDERING
   ============================================================ */
const GROUND = {
  [T.GRASS]: ["#4f9a4a", "#559f4f"], [T.FLOWER]: ["#4f9a4a", "#559f4f"], [T.SAND]: ["#d9c27a", "#d1ba72"], [T.PATH]: ["#b59a6a", "#ae9363"],
  [T.SNOW]: ["#e8eef5", "#e0e7ef"], [T.ICE]: ["#bfe0f5", "#b3d8f0"], [T.SWAMP]: ["#4a6a3a", "#425f34"], [T.ASH]: ["#5a4a48", "#514240"],
  [T.DOOR]: ["#b59a6a", "#b59a6a"], [T.SIGN]: ["#4f9a4a", "#559f4f"], [T.CHEST]: null, [T.ENTRANCE]: ["#b59a6a", "#b59a6a"], [T.EXIT]: null,
};
function underTile(screen, x, y) {
  // Bodenfarbe unter Dekor
  if (screen.dungeonRoom) return [screen.dungeonRoom.d.floor, screen.dungeonRoom.d.floor2];
  const reg = REGIONS[screen.region];
  const g = reg.ground[0];
  return GROUND[g] || GROUND[T.GRASS];
}
function drawTile(ctx, screen, x, y, t, time, opened) {
  const px = x * TS, py = y * TS;
  const v = (x * 7 + y * 13) % 3;
  const g = GROUND[t];
  const base = g || underTile(screen, x, y);
  ctx.fillStyle = v === 0 ? base[1] : base[0];
  ctx.fillRect(px, py, TS, TS);
  switch (t) {
    case T.GRASS: if (v === 1) { ctx.fillStyle = "#4a913f"; ctx.fillRect(px + 3, py + 9, 2, 3); ctx.fillRect(px + 10, py + 4, 2, 3); } break;
    case T.FLOWER: ctx.fillStyle = ["#ff6f91", "#ffd23f", "#fff", "#c77dff"][(x + y) % 4]; ctx.fillRect(px + 4, py + 5, 3, 3); ctx.fillRect(px + 10, py + 10, 3, 3); ctx.fillStyle = "#3c7a38"; ctx.fillRect(px + 5, py + 8, 1, 3); break;
    case T.SAND: if (v === 1) { ctx.fillStyle = "#c7ad60"; ctx.fillRect(px + 2, py + 6, 5, 1); ctx.fillRect(px + 9, py + 11, 4, 1); } break;
    case T.SNOW: if (v === 2) { ctx.fillStyle = "#cfd8e3"; ctx.fillRect(px + 3, py + 4, 3, 1); ctx.fillRect(px + 9, py + 10, 4, 1); } break;
    case T.ICE: ctx.fillStyle = "rgba(255,255,255,.5)"; ctx.fillRect(px + 2, py + 3, 6, 1); ctx.fillRect(px + 9, py + 9, 4, 1); break;
    case T.SWAMP: ctx.fillStyle = "#33482a"; ctx.fillRect(px + 2 + v, py + 6, 6, 4); ctx.fillStyle = "#5c7a48"; ctx.fillRect(px + 10, py + 3, 2, 2); break;
    case T.ASH: ctx.fillStyle = "#3f3230"; ctx.fillRect(px + 3, py + 4 + v, 4, 2); ctx.fillRect(px + 10, py + 11, 3, 2); break;
    case T.PATH: if (v === 1) { ctx.fillStyle = "#9c855a"; ctx.fillRect(px + 4, py + 5, 2, 2); ctx.fillRect(px + 11, py + 10, 2, 2); } break;
    case T.WATER: {
      ctx.fillStyle = "#3a6fb0"; ctx.fillRect(px, py, TS, TS);
      ctx.fillStyle = "#5b93d6"; const o = Math.floor(time * 3 + x) % 4; ctx.fillRect(px + 2 + o, py + 4, 5, 1); ctx.fillRect(px + 8 - o, py + 11, 5, 1); break;
    }
    case T.LAVA: {
      ctx.fillStyle = "#c8341c"; ctx.fillRect(px, py, TS, TS);
      ctx.fillStyle = "#ffb03a"; const o = Math.floor(time * 4 + x * 2) % 5; ctx.fillRect(px + 1 + o, py + 3, 6, 2); ctx.fillRect(px + 9 - o, py + 10, 5, 2); break;
    }
    case T.TREE: ctx.fillStyle = "#5a3a1e"; ctx.fillRect(px + 6, py + 9, 4, 6); ctx.fillStyle = "#2f6b2a"; ctx.beginPath(); ctx.arc(px + 8, py + 6, 7, 0, 7); ctx.fill(); ctx.fillStyle = "#3f8a37"; ctx.beginPath(); ctx.arc(px + 6, py + 5, 4, 0, 7); ctx.fill(); break;
    case T.DEADTREE: ctx.fillStyle = "#3a2a20"; ctx.fillRect(px + 7, py + 5, 3, 11); ctx.fillRect(px + 3, py + 6, 5, 2); ctx.fillRect(px + 9, py + 3, 5, 2); ctx.fillRect(px + 12, py + 1, 2, 3); break;
    case T.BUSH: ctx.fillStyle = "#2f6b2a"; ctx.beginPath(); ctx.arc(px + 8, py + 9, 6, 0, 7); ctx.fill(); ctx.fillStyle = "#3f8a37"; ctx.beginPath(); ctx.arc(px + 6, py + 8, 3, 0, 7); ctx.fill(); break;
    case T.CACTUS: ctx.fillStyle = "#3f8a37"; ctx.fillRect(px + 6, py + 3, 4, 12); ctx.fillRect(px + 2, py + 6, 4, 2); ctx.fillRect(px + 2, py + 4, 2, 4); ctx.fillRect(px + 10, py + 8, 4, 2); ctx.fillRect(px + 12, py + 5, 2, 5); break;
    case T.ROCK: ctx.fillStyle = "#7d7a72"; ctx.beginPath(); ctx.moveTo(px + 2, py + 14); ctx.lineTo(px + 4, py + 5); ctx.lineTo(px + 9, py + 2); ctx.lineTo(px + 14, py + 8); ctx.lineTo(px + 13, py + 14); ctx.closePath(); ctx.fill(); ctx.fillStyle = "#a8a49a"; ctx.fillRect(px + 5, py + 5, 4, 3); ctx.fillStyle = "#57544e"; ctx.fillRect(px + 9, py + 10, 4, 3); break;
    case T.HOUSE: {
      ctx.fillStyle = "#8a5a3a"; ctx.fillRect(px, py, TS, TS);
      ctx.fillStyle = "#6a4028"; ctx.fillRect(px, py + 7, TS, 1); ctx.fillRect(px + (y % 2 ? 8 : 0), py, 1, 7); ctx.fillRect(px + (y % 2 ? 0 : 8), py + 8, 1, 8);
      if ((x + y) % 3 === 0) { ctx.fillStyle = "#ffd98a"; ctx.fillRect(px + 5, py + 4, 5, 5); ctx.fillStyle = "#3a2a20"; ctx.fillRect(px + 7, py + 4, 1, 5); }
      ctx.fillStyle = "#a83a2a"; ctx.fillRect(px, py, TS, 3); break;
    }
    case T.DOOR: ctx.fillStyle = "#8a5a3a"; ctx.fillRect(px, py, TS, TS); ctx.fillStyle = "#2a1a12"; ctx.fillRect(px + 4, py + 4, 8, 12); ctx.fillStyle = "#ffd98a"; ctx.fillRect(px + 10, py + 9, 1, 1); ctx.fillStyle = "#a83a2a"; ctx.fillRect(px, py, TS, 3); break;
    case T.SIGN: ctx.fillStyle = "#5a3a1e"; ctx.fillRect(px + 7, py + 8, 2, 7); ctx.fillStyle = "#b07a3a"; ctx.fillRect(px + 2, py + 3, 12, 6); ctx.fillStyle = "#5a3a1e"; ctx.fillRect(px + 4, py + 5, 8, 1); break;
    case T.WALL: {
      const dr = screen.dungeonRoom.d; ctx.fillStyle = dr.wall; ctx.fillRect(px, py, TS, TS);
      ctx.fillStyle = dr.wall2; ctx.fillRect(px + 1, py + 1, 6, 6); ctx.fillRect(px + 9, py + 1, 6, 6); ctx.fillRect(px + 1, py + 9, 6, 6); ctx.fillRect(px + 9, py + 9, 6, 6);
      ctx.fillStyle = "rgba(0,0,0,.35)"; ctx.fillRect(px + 1, py + 6, 6, 1); ctx.fillRect(px + 9, py + 6, 6, 1); ctx.fillRect(px + 1, py + 14, 6, 1); ctx.fillRect(px + 9, py + 14, 6, 1); break;
    }
    case T.FLOOR: if (v === 1) { ctx.fillStyle = "rgba(0,0,0,.15)"; ctx.fillRect(px + 3, py + 3, 1, 1); ctx.fillRect(px + 11, py + 10, 1, 1); } break;
    case T.PILLAR: ctx.fillStyle = "#2a2a30"; ctx.fillRect(px + 3, py + 1, 10, 15); ctx.fillStyle = "#8a8a98"; ctx.fillRect(px + 4, py + 2, 8, 12); ctx.fillStyle = "#5a5a66"; ctx.fillRect(px + 4, py + 5, 8, 1); ctx.fillRect(px + 4, py + 10, 8, 1); break;
    case T.ENTRANCE: ctx.fillStyle = "#7d7a72"; ctx.fillRect(px, py, TS, TS); ctx.fillStyle = "#0a0a10"; ctx.beginPath(); ctx.arc(px + 8, py + 8, 6, Math.PI, 0); ctx.lineTo(px + 14, py + 16); ctx.lineTo(px + 2, py + 16); ctx.closePath(); ctx.fill(); ctx.fillStyle = "#ffb03a"; ctx.fillRect(px + 7, py + 3, 2, 2); break;
    case T.EXIT: ctx.fillStyle = "#c8b48a"; ctx.fillRect(px + 2, py + 2, 12, 12); ctx.fillStyle = "#8a7a5a"; for (let i = 0; i < 4; i++) ctx.fillRect(px + 2, py + 3 + i * 3, 12, 1); ctx.fillStyle = "#e9dcb8"; ctx.fillRect(px + 6, py + 4, 4, 2); break;
    case T.CHEST: {
      ctx.fillStyle = "#6b3f1d"; ctx.fillRect(px + 2, py + 5, 12, 9);
      ctx.fillStyle = opened ? "#8a5a3a" : "#a8682e"; ctx.fillRect(px + 2, py + (opened ? 2 : 4), 12, 4);
      ctx.fillStyle = "#ffd23f"; ctx.fillRect(px + 7, py + 8, 2, 3);
      if (opened) { ctx.fillStyle = "#2a1a12"; ctx.fillRect(px + 3, py + 6, 10, 3); }
      break;
    }
    default: break;
  }
}

function drawPlayer(ctx, G) {
  const P = G.P, x = Math.round(P.x), y = Math.round(P.y);
  if (G.invT > 0 && Math.floor(G.time * 20) % 2 === 0) return;
  const bob = G.walkT > 0 ? Math.round(Math.sin(G.walkT * 14)) : 0;
  ctx.fillStyle = "rgba(0,0,0,.25)"; ctx.fillRect(x - 5, y + 4, 10, 2);
  // Schwert hinter Spieler bei "up"
  const a = G.attack;
  const drawSword = () => {
    if (a.t <= 0) return;
    const prog = 1 - a.t / a.maxT;
    const reach = derive(P).reach;
    const ang = { up: -Math.PI / 2, down: Math.PI / 2, left: Math.PI, right: 0 }[a.dir] + (prog - 0.5) * 1.6;
    ctx.save(); ctx.translate(x, y - 1); ctx.rotate(ang);
    ctx.fillStyle = "#d8d8e0"; ctx.fillRect(3, -1, reach, 2);
    ctx.fillStyle = "#8a5a3a"; ctx.fillRect(0, -2, 4, 4);
    ctx.restore();
  };
  if (a.dir === "up") drawSword();
  ctx.fillStyle = "#2e7d3a"; ctx.fillRect(x - 4, y - 4 + bob, 8, 8);            // Tunika
  ctx.fillStyle = "#5a3a1e"; ctx.fillRect(x - 4, y + 2 + bob, 3, 3); ctx.fillRect(x + 1, y + 2 + bob, 3, 3); // Stiefel
  ctx.fillStyle = "#f1c9a0"; ctx.fillRect(x - 4, y - 11 + bob, 8, 7);           // Kopf
  ctx.fillStyle = "#3b2a1a"; ctx.fillRect(x - 4, y - 12 + bob, 8, 3);           // Haar
  ctx.fillStyle = "#1a1a24";
  if (P.dir === "down") { ctx.fillRect(x - 3, y - 8 + bob, 2, 2); ctx.fillRect(x + 1, y - 8 + bob, 2, 2); }
  else if (P.dir === "left") ctx.fillRect(x - 3, y - 8 + bob, 2, 2);
  else if (P.dir === "right") ctx.fillRect(x + 1, y - 8 + bob, 2, 2);
  if (P.equip.kopf) { ctx.fillStyle = RARITY_BY_ID[P.equip.kopf.rarity].color; ctx.fillRect(x - 5, y - 13 + bob, 10, 3); }
  if (P.equip.schild && P.dir !== "right") { ctx.fillStyle = "#8a6a3a"; ctx.fillRect(x - 7, y - 4 + bob, 3, 7); }
  if (a.dir !== "up") drawSword();
}

function drawMob(ctx, m, time) {
  const x = Math.round(m.x), y = Math.round(m.y), s = m.size, h = s / 2;
  const flash = m.hitT > 0;
  const c1 = flash ? "#fff" : m.color, c2 = flash ? "#fff" : m.color2;
  ctx.fillStyle = "rgba(0,0,0,.25)"; ctx.fillRect(x - h, y + h - 2, s, 2);
  switch (m.shape) {
    case "blob": {
      const w = Math.sin(time * 6 + m.t) * 1.5;
      ctx.fillStyle = c1; ctx.beginPath(); ctx.ellipse(x, y, h + w, h - w, 0, 0, 7); ctx.fill();
      ctx.fillStyle = c2; ctx.fillRect(x - 3, y - 2, 2, 2); ctx.fillRect(x + 1, y - 2, 2, 2); break;
    }
    case "quad": {
      ctx.fillStyle = c1; ctx.fillRect(x - h, y - h + 3, s, s - 5);
      ctx.fillRect(x - h + 1, y - h, 3, 3); ctx.fillRect(x + h - 4, y - h, 3, 3);
      ctx.fillStyle = c2; ctx.fillRect(x - h + 1, y + h - 3, 2, 3); ctx.fillRect(x + h - 3, y + h - 3, 2, 3);
      ctx.fillStyle = "#ff3b3b"; ctx.fillRect(x - 3, y - 1, 2, 2); ctx.fillRect(x + 1, y - 1, 2, 2); break;
    }
    case "ghost": {
      const f = Math.sin(time * 4 + m.t) * 2;
      ctx.fillStyle = c1; ctx.beginPath(); ctx.arc(x, y - 2 + f, h, Math.PI, 0); ctx.lineTo(x + h, y + h + f); ctx.lineTo(x + h / 2, y + h - 3 + f); ctx.lineTo(x, y + h + f); ctx.lineTo(x - h / 2, y + h - 3 + f); ctx.lineTo(x - h, y + h + f); ctx.closePath(); ctx.fill();
      ctx.fillStyle = c2; ctx.fillRect(x - 3, y - 3 + f, 2, 3); ctx.fillRect(x + 1, y - 3 + f, 2, 3); break;
    }
    case "bat": {
      const w = Math.sin(time * 18 + m.t) * 3;
      ctx.fillStyle = c1; ctx.fillRect(x - 2, y - 3, 4, 6);
      ctx.beginPath(); ctx.moveTo(x - 2, y); ctx.lineTo(x - h - 2, y - 3 + w); ctx.lineTo(x - h, y + 3); ctx.closePath(); ctx.fill();
      ctx.beginPath(); ctx.moveTo(x + 2, y); ctx.lineTo(x + h + 2, y - 3 + w); ctx.lineTo(x + h, y + 3); ctx.closePath(); ctx.fill();
      ctx.fillStyle = "#ff3b3b"; ctx.fillRect(x - 1, y - 2, 1, 1); ctx.fillRect(x + 1, y - 2, 1, 1); break;
    }
    case "golem": {
      ctx.fillStyle = c2; ctx.fillRect(x - h, y - h + 2, s, s - 2);
      ctx.fillStyle = c1; ctx.fillRect(x - h + 2, y - h, s - 4, s - 4); ctx.fillRect(x - h - 2, y - 2, 4, h + 2); ctx.fillRect(x + h - 2, y - 2, 4, h + 2);
      ctx.fillStyle = "#ffb03a"; ctx.fillRect(x - 4, y - h + 3, 2, 2); ctx.fillRect(x + 2, y - h + 3, 2, 2); break;
    }
    case "skel": {
      ctx.fillStyle = c1; ctx.fillRect(x - 3, y - h, 6, 5); ctx.fillRect(x - 1, y - h + 5, 2, 4); ctx.fillRect(x - 4, y - 1, 8, 2); ctx.fillRect(x - 3, y + 2, 2, 4); ctx.fillRect(x + 1, y + 2, 2, 4);
      ctx.fillStyle = c2; ctx.fillRect(x - 2, y - h + 1, 1, 2); ctx.fillRect(x + 1, y - h + 1, 1, 2); break;
    }
    case "human": {
      ctx.fillStyle = c1; ctx.fillRect(x - 4, y - 3, 8, 8); ctx.fillStyle = "#e0b48a"; ctx.fillRect(x - 3, y - 9, 6, 6);
      ctx.fillStyle = c2; ctx.fillRect(x - 4, y - 11, 8, 3); ctx.fillRect(x - 6, y - 2, 2, 6);
      ctx.fillStyle = "#1a1a24"; ctx.fillRect(x - 2, y - 7, 1, 1); ctx.fillRect(x + 1, y - 7, 1, 1); break;
    }
    default: break;
  }
  // Lebensbalken
  if (m.hp < m.maxHp) {
    const bw = m.boss ? 40 : s + 4;
    ctx.fillStyle = "#1a1a24"; ctx.fillRect(x - bw / 2, y - h - 6, bw, 3);
    ctx.fillStyle = m.boss ? "#ff3b3b" : "#6fe28a"; ctx.fillRect(x - bw / 2, y - h - 6, Math.max(0, bw * m.hp / m.maxHp), 3);
  }
}

function drawDrop(ctx, dr, time) {
  const x = Math.round(dr.x), y = Math.round(dr.y + Math.sin(time * 5 + dr.x) * 1.5);
  if (dr.type === "gold") { ctx.fillStyle = "#ffd23f"; ctx.beginPath(); ctx.arc(x, y, 3, 0, 7); ctx.fill(); ctx.fillStyle = "#b8860b"; ctx.fillRect(x - 1, y - 2, 1, 4); }
  else if (dr.type === "potion") { ctx.fillStyle = POTIONS[dr.id].color; ctx.fillRect(x - 3, y - 2, 6, 6); ctx.fillStyle = "#e9dcb8"; ctx.fillRect(x - 1, y - 5, 2, 3); }
  else {
    const col = RARITY_BY_ID[dr.item.rarity].color;
    ctx.fillStyle = "rgba(255,255,255,.25)"; ctx.beginPath(); ctx.arc(x, y, 7 + Math.sin(time * 6) * 1, 0, 7); ctx.fill();
    ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(x, y - 6); ctx.lineTo(x + 5, y); ctx.lineTo(x, y + 6); ctx.lineTo(x - 5, y); ctx.closePath(); ctx.fill();
    ctx.fillStyle = "#fff"; ctx.fillRect(x - 1, y - 3, 1, 2);
  }
}

function render(ctx, G) {
  const { screen, P } = G;
  ctx.save();
  if (G.shake > 0) ctx.translate(Math.round((Math.random() - 0.5) * 3), Math.round((Math.random() - 0.5) * 3));
  ctx.fillStyle = "#000"; ctx.fillRect(-4, -4, W + 8, H + 8);
  for (let y = 0; y < VH; y++) for (let x = 0; x < VW; x++) {
    const t = screen.tiles[idx(x, y)];
    const opened = t === T.CHEST && screen.chest && P.chests[screen.chest.id];
    drawTile(ctx, screen, x, y, t, G.time, opened);
  }
  for (const dr of G.drops) drawDrop(ctx, dr, G.time);
  const ents = [...G.mobs.map(m => ({ y: m.y, f: () => drawMob(ctx, m, G.time) })), { y: P.y, f: () => drawPlayer(ctx, G) }].sort((a, b) => a.y - b.y);
  for (const e of ents) e.f();
  for (const p of G.projs) { ctx.fillStyle = p.color; ctx.beginPath(); ctx.arc(p.x, p.y, 3, 0, 7); ctx.fill(); ctx.fillStyle = "#fff"; ctx.fillRect(p.x - 1, p.y - 1, 1, 1); }
  for (const f of G.fx) {
    if (f.kind === "part") { ctx.fillStyle = f.color; ctx.fillRect(f.x - 1, f.y - 1, 2, 2); }
    else if (f.kind === "num") {
      ctx.font = (f.big ? "bold 9px" : f.small ? "6px" : "bold 7px") + " monospace"; ctx.textAlign = "center";
      ctx.fillStyle = "#000"; ctx.fillText(f.text, f.x + 1, f.y + 1); ctx.fillStyle = f.color; ctx.fillText(f.text, f.x, f.y);
    }
  }
  // Dungeon-Abdunkelung
  if (screen.dungeonRoom) {
    const grd = ctx.createRadialGradient(P.x, P.y, 40, P.x, P.y, 150);
    grd.addColorStop(0, "rgba(0,0,0,0)"); grd.addColorStop(1, "rgba(0,0,0,.65)");
    ctx.fillStyle = grd; ctx.fillRect(0, 0, W, H);
  }
  ctx.restore();
}

/* ============================================================
   SPEICHERN
   ============================================================ */
const SAVE_KEY = "eldenfeld_save_v1";
async function saveGame(G) {
  try { if (window.storage) await window.storage.set(SAVE_KEY, JSON.stringify({ seed: G.seed, P: G.P }), false); } catch (e) { /* kein Speicher, egal */ }
}
async function loadGame() {
  try { if (!window.storage) return null; const r = await window.storage.get(SAVE_KEY, false); return r ? JSON.parse(r.value) : null; } catch (e) { return null; }
}

/* ============================================================
   UI-BAUSTEINE
   ============================================================ */
const C = { bg: "#1b1712", panel: "#2a231b", panel2: "#332b21", line: "#4a3f30", text: "#e9dcb8", dim: "#a8977a", gold: "#d4a53a", red: "#e2503f", green: "#6fe28a" };
const FONT = "Georgia, 'Times New Roman', serif";

function Btn({ children, onClick, tone = "default", small, disabled, style }) {
  const bg = tone === "gold" ? C.gold : tone === "red" ? C.red : C.panel2;
  const fg = tone === "gold" ? "#1b1712" : C.text;
  return (
    <button onClick={onClick} disabled={disabled} style={{
      fontFamily: FONT, background: bg, color: fg, border: `1px solid ${tone === "default" ? C.line : "transparent"}`,
      borderRadius: 6, padding: small ? "6px 10px" : "10px 14px", fontSize: small ? 13 : 15, cursor: disabled ? "default" : "pointer",
      opacity: disabled ? 0.45 : 1, ...style,
    }}>{children}</button>
  );
}
function Hearts({ hp, maxHp }) {
  const n = Math.ceil(maxHp / 20);
  const hearts = [];
  for (let i = 0; i < n; i++) {
    const f = clamp((hp - i * 20) / 20, 0, 1);
    hearts.push(<div key={i} style={{ width: 16, height: 14, clipPath: "path('M8 13 L1.5 6.5 A3.5 3.5 0 0 1 8 3 A3.5 3.5 0 0 1 14.5 6.5 Z')", background: `linear-gradient(90deg, ${C.red} ${f * 100}%, #4a3028 ${f * 100}%)` }} />);
  }
  return <div style={{ display: "flex", flexWrap: "wrap", gap: 2, maxWidth: 180 }}>{hearts}</div>;
}
function ItemName({ item, style }) {
  const col = item.kind === "gear" ? RARITY_BY_ID[item.rarity].color : POTIONS[item.potId].color;
  return <span style={{ color: col, ...style }}>{item.name}{item.kind === "gear" && item.upg ? ` +${item.upg}` : ""}{item.kind === "trank" ? ` ×${item.qty}` : ""}</span>;
}
function StatLine({ stats, compare }) {
  const keys = Object.keys({ ...stats, ...(compare || {}) });
  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "2px 12px", fontSize: 13 }}>
      {keys.map(k => {
        const v = stats[k] || 0, c = compare ? (compare[k] || 0) : null;
        const delta = c === null ? null : v - c;
        return <div key={k} style={{ color: C.dim }}>{STAT_NAMES[k]} <span style={{ color: C.text }}>{v}{k === "crit" ? "%" : ""}</span>
          {delta !== null && delta !== 0 && <span style={{ color: delta > 0 ? C.green : C.red, marginLeft: 4 }}>{delta > 0 ? "+" : ""}{delta}</span>}</div>;
      })}
    </div>
  );
}

/* ============================================================
   HAUPTKOMPONENTE
   ============================================================ */
export default function Eldenfeld() {
  const [phase, setPhase] = useState("title");
  const [hasSave, setHasSave] = useState(false);
  const [saveData, setSaveData] = useState(null);
  const canvasRef = useRef(null);
  const gRef = useRef(null);
  const inputRef = useRef({ x: 0, y: 0, attack: false, keys: {} });
  const [ui, setUi] = useState(null);
  const [panel, setPanel] = useState(null);
  const [selected, setSelected] = useState(null);
  const [shopTab, setShopTab] = useState("kaufen");
  const [invTab, setInvTab] = useState("ausruestung");
  const [, force] = useState(0);
  const rerender = () => force(n => n + 1);
  const panelRef = useRef(null);
  panelRef.current = panel;

  useEffect(() => { loadGame().then(s => { if (s && s.P) { setHasSave(true); setSaveData(s); } }); }, []);

  const startGame = useCallback((existing) => {
    const seed = existing ? existing.seed : "eldenfeld-" + Math.random().toString(36).slice(2, 8);
    const P = existing ? existing.P : newPlayer(seed);
    const G = {
      seed, P, world: { screens: {}, dungeons: {} }, screen: null, mobs: [], projs: [], drops: [], fx: [],
      attack: { t: 0, dir: "down", hit: new Set(), maxT: 0.2 }, invT: 0, shake: 0, msg: null, banner: null, time: 0, walkT: 0, trigCd: 1, dead: false, dirty: true, panelReturn: null,
    };
    G.openPanel = (type) => { setSelected(null); setShopTab("kaufen"); setPanel(type); };
    G.save = () => saveGame(G);
    gRef.current = G;
    enterScreen(G, P.area, P.sx, P.sy, P.x, P.y, true);
    setPanel(null); setPhase("game");
  }, []);

  // Tastatur
  useEffect(() => {
    const down = (e) => {
      const inp = inputRef.current; inp.keys[e.key.toLowerCase()] = true;
      if (["arrowup", "arrowdown", "arrowleft", "arrowright", " "].includes(e.key.toLowerCase())) e.preventDefault();
      if (e.key === " " || e.key.toLowerCase() === "j") inp.attack = true;
      if ((e.key.toLowerCase() === "e" || e.key.toLowerCase() === "k") && gRef.current && !panelRef.current) usePotion(gRef.current);
      if ((e.key.toLowerCase() === "i" || e.key === "Tab") && gRef.current) { e.preventDefault(); if (panelRef.current === "inventar") closePanel(); else if (!panelRef.current) { setSelected(null); setPanel("inventar"); } }
      if (e.key === "Escape" && panelRef.current) closePanel();
    };
    const up = (e) => { const inp = inputRef.current; inp.keys[e.key.toLowerCase()] = false; if (e.key === " " || e.key.toLowerCase() === "j") inp.attack = false; };
    window.addEventListener("keydown", down); window.addEventListener("keyup", up);
    return () => { window.removeEventListener("keydown", down); window.removeEventListener("keyup", up); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Spielschleife
  useEffect(() => {
    if (phase !== "game") return;
    let raf, last = performance.now(), lastUi = "";
    const loop = (now) => {
      raf = requestAnimationFrame(loop);
      const G = gRef.current; if (!G) return;
      const dt = Math.min(0.05, (now - last) / 1000); last = now;
      const inp = inputRef.current;
      const k = inp.keys;
      let kx = (k["arrowright"] || k["d"] ? 1 : 0) - (k["arrowleft"] || k["a"] ? 1 : 0);
      let ky = (k["arrowdown"] || k["s"] ? 1 : 0) - (k["arrowup"] || k["w"] ? 1 : 0);
      const input = { x: inp.x || kx, y: inp.y || ky, attack: inp.attack };
      if (!panelRef.current) update(G, dt, input);
      const ctx = canvasRef.current && canvasRef.current.getContext("2d");
      if (ctx) { ctx.imageSmoothingEnabled = false; render(ctx, G); }
      // UI synchronisieren
      const P = G.P, d = derive(P);
      const pots = P.inventory.filter(i => i.kind === "trank").reduce((a, b) => a + b.qty, 0);
      const loc = G.screen.village ? G.screen.village.name : G.screen.dungeonRoom ? G.screen.dungeonRoom.d.name : REGIONS[G.screen.region].name;
      const next = { hp: P.hp, maxHp: d.maxHp, level: P.level, xp: P.xp, need: xpNeed(P.level), gold: P.gold, pots, loc, msg: G.msg, banner: G.banner, dead: G.dead, buff: P.buffT > 0 };
      const s = JSON.stringify(next);
      if (s !== lastUi) { lastUi = s; setUi(next); }
      if (G.dead && !panelRef.current) setPanel("tot");
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [phase]);

  const closePanel = () => {
    const G = gRef.current;
    if (G && G.panelReturn) { G.P.x = G.panelReturn.x; G.P.y = G.panelReturn.y; G.panelReturn = null; G.trigCd = 0.5; }
    setPanel(null); setSelected(null);
    if (G) saveGame(G);
  };

  // Steuerkreuz
  const padRef = useRef(null);
  const padPointer = (e, end) => {
    const inp = inputRef.current;
    if (end) { inp.x = 0; inp.y = 0; return; }
    const r = padRef.current.getBoundingClientRect();
    const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
    let dx = (e.clientX - cx) / (r.width / 2), dy = (e.clientY - cy) / (r.height / 2);
    const len = Math.hypot(dx, dy);
    if (len < 0.15) { inp.x = 0; inp.y = 0; return; }
    if (len > 1) { dx /= len; dy /= len; }
    inp.x = dx; inp.y = dy;
  };

  /* ---------- Titel ---------- */
  if (phase === "title") {
    return (
      <div style={{ minHeight: "100vh", background: C.bg, color: C.text, fontFamily: FONT, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
        <div style={{ maxWidth: 380, width: "100%", textAlign: "center" }}>
          <div style={{ fontSize: 13, color: C.dim, letterSpacing: 2 }}>Ein Loot-Abenteuer</div>
          <h1 style={{ fontSize: 52, margin: "6px 0 2px", fontWeight: 400, color: C.gold, lineHeight: 1 }}>Eldenfeld</h1>
          <div style={{ fontSize: 15, color: C.dim, marginBottom: 28 }}>Sieben Regionen, drei Dungeons, unendlich Beute.</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {hasSave && <Btn tone="gold" onClick={() => startGame(saveData)}>Weiterspielen (Stufe {saveData.P.level})</Btn>}
            <Btn onClick={() => startGame(null)}>Neues Abenteuer</Btn>
          </div>
          <div style={{ marginTop: 28, fontSize: 13, color: C.dim, lineHeight: 1.6, textAlign: "left", background: C.panel, padding: 14, borderRadius: 8 }}>
            <b style={{ color: C.text }}>So spielst du</b><br />
            Steuerkreuz links, Schwert rechts. Trank-Knopf heilt automatisch mit dem passenden Trank. Im Menü legst du Beute an, die Karte zeigt erkundete Gebiete.<br />
            Tastatur: WASD oder Pfeile, Leertaste Angriff, E Trank, I Inventar.<br />
            Häuser in Dörfern betrittst du über die Tür: Händler, Heilerin, Schmied, Weise.
          </div>
        </div>
      </div>
    );
  }

  const G = gRef.current;
  const P = G.P;
  const d = derive(P);

  /* ---------- Panels ---------- */
  const renderPanel = () => {
    if (!panel) return null;
    const wrap = (title, body, footer) => (
      <div style={{ position: "absolute", inset: 0, background: "rgba(10,8,6,.92)", display: "flex", flexDirection: "column", color: C.text, fontFamily: FONT, zIndex: 20 }}>
        <div style={{ padding: "12px 16px", borderBottom: `1px solid ${C.line}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ fontSize: 20, color: C.gold }}>{title}</div>
          <div style={{ fontSize: 14, color: C.gold }}>{P.gold} Gold</div>
        </div>
        <div style={{ flex: 1, overflowY: "auto", padding: 12 }}>{body}</div>
        <div style={{ padding: 12, borderTop: `1px solid ${C.line}`, display: "flex", gap: 8, justifyContent: "flex-end" }}>{footer}</div>
      </div>
    );
    const itemRow = (it, onClick, right) => (
      <div key={it.uid} onClick={onClick} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 10px", background: selected === it ? C.panel2 : C.panel, borderRadius: 6, marginBottom: 5, cursor: "pointer", border: `1px solid ${selected === it ? C.gold : "transparent"}` }}>
        <div>
          <ItemName item={it} style={{ fontSize: 14 }} />
          <div style={{ fontSize: 11, color: C.dim }}>{it.kind === "gear" ? `${SLOTS[it.slot]}, Stufe ${it.ilvl}, ${RARITY_BY_ID[it.rarity].name}` : `Heilt ${POTIONS[it.potId].heal >= 9999 ? "vollständig" : POTIONS[it.potId].heal + " Leben"}`}</div>
        </div>
        {right}
      </div>
    );
    const detail = (it, actions) => (
      <div style={{ background: C.panel2, borderRadius: 8, padding: 12, marginBottom: 12, border: `1px solid ${C.line}` }}>
        <ItemName item={it} style={{ fontSize: 16 }} />
        {it.kind === "gear" && <div style={{ margin: "6px 0 10px" }}><StatLine stats={effectiveStats(it)} compare={P.equip[it.slot] && P.equip[it.slot] !== it ? effectiveStats(P.equip[it.slot]) : null} /></div>}
        {it.kind === "gear" && P.equip[it.slot] && P.equip[it.slot] !== it && <div style={{ fontSize: 11, color: C.dim, marginBottom: 8 }}>Vergleich mit angelegtem {SLOTS[it.slot]}: <ItemName item={P.equip[it.slot]} /></div>}
        <div style={{ fontSize: 12, color: C.dim, marginBottom: 10 }}>Wert: {it.value} Gold</div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>{actions}</div>
      </div>
    );

    if (panel === "inventar") {
      const equipOrder = ["waffe", "kopf", "rumpf", "schild", "amulett", "ring"];
      const doEquip = (it) => { const old = P.equip[it.slot]; P.inventory = P.inventory.filter(i => i !== it); if (old) P.inventory.push(old); P.equip[it.slot] = it; P.hp = Math.min(P.hp, derive(P).maxHp); setSelected(it); rerender(); };
      const doUnequip = (it) => { if (P.inventory.length >= 30) return; P.equip[it.slot] = null; P.inventory.push(it); P.hp = Math.min(P.hp, derive(P).maxHp); setSelected(it); rerender(); };
      const doDrop = (it) => { P.inventory = P.inventory.filter(i => i !== it); setSelected(null); rerender(); };
      const doUse = (it) => { usePotion(G); rerender(); };
      const isEquipped = selected && P.equip[selected.slot] === selected;
      const visitedOver = Object.keys(P.visits).filter(k => /^\d+,\d+$/.test(k));
      return wrap("Ausrüstung", (
        <div>
          <div style={{ display: "flex", gap: 6, marginBottom: 12 }}>
            {["ausruestung", "karte"].map(t => <Btn key={t} small tone={invTab === t ? "gold" : "default"} onClick={() => setInvTab(t)}>{t === "ausruestung" ? "Ausrüstung" : "Karte"}</Btn>)}
          </div>
          {invTab === "karte" ? (
            <div>
              <div style={{ fontSize: 13, color: C.dim, marginBottom: 8 }}>Erkundete Gebiete. Dörfer in Gold, Dungeons in Rot, du in Grün.</div>
              <div style={{ display: "grid", gridTemplateColumns: `repeat(${WORLD_W}, 1fr)`, gap: 3, maxWidth: 300 }}>
                {Array.from({ length: WORLD_W * WORLD_H }).map((_, i) => {
                  const x = i % WORLD_W, y = Math.floor(i / WORLD_W), k = `${x},${y}`;
                  const seen = visitedOver.includes(k), here = P.area === "over" && P.sx === x && P.sy === y;
                  const v = VILLAGES[k], dg = DUNGEON_BY_SCREEN[k];
                  const regCol = { wiese: "#4f9a4a", wald: "#2f6b2a", berg: "#7d7a72", wueste: "#d9c27a", sumpf: "#4a6a3a", eis: "#e8eef5", vulkan: "#5a4a48" }[regionAt(x, y)];
                  return <div key={k} style={{ aspectRatio: "1", background: seen ? regCol : "#221c15", borderRadius: 3, border: `2px solid ${here ? C.green : "transparent"}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, color: "#000" }}>
                    {seen && v ? <span style={{ color: C.gold, fontWeight: "bold" }}>■</span> : seen && dg ? <span style={{ color: C.red, fontWeight: "bold" }}>▲</span> : ""}
                  </div>;
                })}
              </div>
              <div style={{ fontSize: 12, color: C.dim, marginTop: 10, lineHeight: 1.6 }}>
                {Object.entries(REGIONS).map(([k, r]) => <div key={k}><span style={{ display: "inline-block", width: 10, height: 10, background: { wiese: "#4f9a4a", wald: "#2f6b2a", berg: "#7d7a72", wueste: "#d9c27a", sumpf: "#4a6a3a", eis: "#e8eef5", vulkan: "#5a4a48" }[k], marginRight: 6, borderRadius: 2 }} />{r.name}, Stufe {r.level}+</div>)}
                <div style={{ marginTop: 6 }}>Besiegte Bosse: {Object.keys(P.cleared).length} von {DUNGEONS.length}. Getötete Monster: {P.kills}.</div>
              </div>
            </div>
          ) : (
            <div>
              <div style={{ background: C.panel, borderRadius: 8, padding: 10, marginBottom: 12 }}>
                <div style={{ fontSize: 13, color: C.dim, marginBottom: 6 }}>Stufe {P.level}, {P.xp} / {xpNeed(P.level)} Erfahrung</div>
                <StatLine stats={{ atk: d.atk, def: d.def, hp: d.maxHp, crit: d.crit, spd: d.spd, luck: d.luck }} />
              </div>
              {selected && detail(selected, selected.kind === "trank"
                ? [<Btn key="u" small tone="gold" onClick={() => doUse(selected)}>Trinken</Btn>, <Btn key="d" small onClick={() => doDrop(selected)}>Wegwerfen</Btn>]
                : isEquipped
                  ? [<Btn key="a" small onClick={() => doUnequip(selected)}>Ablegen</Btn>]
                  : [<Btn key="e" small tone="gold" onClick={() => doEquip(selected)}>Anlegen</Btn>, <Btn key="d" small onClick={() => doDrop(selected)}>Wegwerfen</Btn>])}
              <div style={{ fontSize: 13, color: C.dim, margin: "4px 0 6px" }}>Angelegt</div>
              {equipOrder.map(slot => {
                const it = P.equip[slot];
                return <div key={slot} onClick={() => it && setSelected(it)} style={{ display: "flex", justifyContent: "space-between", padding: "7px 10px", background: selected && selected === it ? C.panel2 : C.panel, borderRadius: 6, marginBottom: 4, border: `1px solid ${selected && selected === it ? C.gold : "transparent"}`, cursor: it ? "pointer" : "default" }}>
                  <span style={{ color: C.dim, fontSize: 13 }}>{SLOTS[slot]}</span>
                  {it ? <ItemName item={it} style={{ fontSize: 13 }} /> : <span style={{ color: "#5a4f40", fontSize: 13 }}>leer</span>}
                </div>;
              })}
              <div style={{ fontSize: 13, color: C.dim, margin: "12px 0 6px" }}>Beutel ({P.inventory.length} / 30)</div>
              {P.inventory.length === 0 && <div style={{ fontSize: 13, color: "#5a4f40" }}>Noch leer. Monster lassen Beute fallen.</div>}
              {[...P.inventory].sort((a, b) => (a.kind === "trank" ? -1 : 1) - (b.kind === "trank" ? -1 : 1)).map(it => itemRow(it, () => setSelected(it),
                it.kind === "gear" && P.equip[it.slot] && sumStats(effectiveStats(it)) > sumStats(effectiveStats(P.equip[it.slot])) ? <span style={{ color: C.green, fontSize: 12 }}>besser</span> : null))}
            </div>
          )}
        </div>
      ), <Btn tone="gold" onClick={closePanel}>Schließen</Btn>);
    }

    if (panel === "shop") {
      const buy = (id) => { const p = POTIONS[id]; if (P.gold < p.price) { return; } P.gold -= p.price; addToInventory(P, makePotion(id, 1)); rerender(); };
      const sell = (it) => { const val = it.kind === "trank" ? it.value : it.value; if (it.kind === "trank") { it.qty -= 1; if (it.qty <= 0) P.inventory = P.inventory.filter(i => i !== it); } else P.inventory = P.inventory.filter(i => i !== it); P.gold += val; setSelected(null); rerender(); };
      return wrap("Händler", (
        <div>
          <div style={{ display: "flex", gap: 6, marginBottom: 12 }}>
            {["kaufen", "verkaufen"].map(t => <Btn key={t} small tone={shopTab === t ? "gold" : "default"} onClick={() => { setShopTab(t); setSelected(null); }}>{t === "kaufen" ? "Kaufen" : "Verkaufen"}</Btn>)}
          </div>
          {shopTab === "kaufen" ? Object.entries(POTIONS).map(([id, p]) => (
            <div key={id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 10px", background: C.panel, borderRadius: 6, marginBottom: 5 }}>
              <div><span style={{ color: p.color, fontSize: 14 }}>{p.name}</span><div style={{ fontSize: 11, color: C.dim }}>Heilt {p.heal >= 9999 ? "vollständig" : p.heal + " Leben"}</div></div>
              <Btn small tone={P.gold >= p.price ? "gold" : "default"} disabled={P.gold < p.price} onClick={() => buy(id)}>{p.price} G</Btn>
            </div>
          )) : (
            <div>
              {P.inventory.length === 0 && <div style={{ fontSize: 13, color: "#5a4f40" }}>Nichts zu verkaufen.</div>}
              {P.inventory.map(it => itemRow(it, () => setSelected(it), <Btn small onClick={(e) => { e.stopPropagation(); sell(it); }}>{it.value} G</Btn>))}
            </div>
          )}
        </div>
      ), <Btn tone="gold" onClick={closePanel}>Verlassen</Btn>);
    }

    if (panel === "heal") {
      const cost = 3 + P.level * 3;
      const full = P.hp >= d.maxHp;
      return wrap("Heilerin", (
        <div style={{ fontSize: 15, lineHeight: 1.6 }}>
          <p style={{ marginTop: 0 }}>„Setz dich, Wanderer. Ich sehe, die Wildnis war nicht zimperlich mit dir."</p>
          <p style={{ color: C.dim, fontSize: 13 }}>Leben: {P.hp} / {d.maxHp}</p>
          <Btn tone="gold" disabled={full || P.gold < cost} onClick={() => { P.gold -= cost; P.hp = d.maxHp; rerender(); }}>{full ? "Du bist gesund" : `Heilen für ${cost} Gold`}</Btn>
          <p style={{ color: C.dim, fontSize: 13, marginTop: 14 }}>Tipp: Ein Krafttrank aus Kräutern stärkt deinen Arm eine Weile.</p>
          <Btn disabled={P.gold < 40 || P.buffT > 0} onClick={() => { P.gold -= 40; P.buffT = 90; rerender(); }}>{P.buffT > 0 ? "Krafttrank wirkt bereits" : "Krafttrank für 40 Gold (90 Sekunden, +50% Schaden)"}</Btn>
        </div>
      ), <Btn tone="gold" onClick={closePanel}>Verlassen</Btn>);
    }

    if (panel === "smith") {
      const gear = [...Object.values(P.equip).filter(Boolean), ...P.inventory.filter(i => i.kind === "gear")];
      const up = (it) => { const c = upgradeCost(it); if (P.gold < c || it.upg >= 5) return; P.gold -= c; it.upg += 1; rerender(); };
      return wrap("Schmied", (
        <div>
          <p style={{ marginTop: 0, fontSize: 15 }}>„Jedes Stück Stahl kann besser werden. Fünfmal, dann bricht es."</p>
          {selected && detail(selected, [<Btn key="u" small tone="gold" disabled={selected.upg >= 5 || P.gold < upgradeCost(selected)} onClick={() => up(selected)}>{selected.upg >= 5 ? "Maximal verstärkt" : `Aufwerten für ${upgradeCost(selected)} Gold`}</Btn>])}
          {gear.length === 0 && <div style={{ fontSize: 13, color: "#5a4f40" }}>Du trägst nichts, das ich schmieden könnte.</div>}
          {gear.map(it => itemRow(it, () => setSelected(it), <span style={{ fontSize: 12, color: C.dim }}>{P.equip[it.slot] === it ? "angelegt" : ""}</span>))}
        </div>
      ), <Btn tone="gold" onClick={closePanel}>Verlassen</Btn>);
    }

    if (panel === "sage") {
      const cleared = Object.keys(P.cleared).length;
      const hints = [
        "Im Westen liegt der Dunkelforst. Dort steht der Waldschrein, ganz am Rand der Welt. Sein Herr ist der Eichenkönig.",
        "Östlich von Kargstein, tief in den Höhen, ruht die Steinhalle. Ihr Wächter besteht aus Fels.",
        "Ganz im Norden brennt der Aschekessel. Der Ascheturm dort ist nur für Helden ab Stufe 25.",
        "Legendäre Beute fällt fast nie von Bettlern. Bosse lassen sie immer fallen.",
        "Glück auf deiner Rüstung erhöht die Chance auf seltene Funde. Der Schmied macht alles stärker, aber nicht seltener.",
        "Jeder besiegte Boss schenkt dir einen Herzcontainer. Drei Herzen warten in der Welt.",
      ];
      const h = cleared >= 3 ? "Du hast alle drei Wächter bezwungen. Die Welt gehört dir. Die Monster werden trotzdem nicht müde." : hints[(P.kills + P.level) % hints.length];
      return wrap("Die Weise", (
        <div style={{ fontSize: 15, lineHeight: 1.7 }}>
          <p style={{ marginTop: 0 }}>„{h}"</p>
          <p style={{ color: C.dim, fontSize: 13 }}>Besiegte Wächter: {cleared} von 3. Regionen folgen dem Uhrzeigersinn: Grasland, Wald, Höhen, Wüste, Moor, Frostkamm, Aschekessel.</p>
        </div>
      ), <Btn tone="gold" onClick={closePanel}>Danke</Btn>);
    }

    if (panel === "tot") {
      const respawn = () => {
        const [sx, sy] = P.lastVillage.split(",").map(Number);
        P.gold = Math.floor(P.gold * 0.9); P.hp = Math.ceil(derive(P).maxHp / 2);
        G.dead = false; G.invT = 1.5;
        enterScreen(G, "over", sx, sy, 7 * TS + 8, 8 * TS + 8, true);
        setPanel(null);
      };
      return wrap("Gefallen", (
        <div style={{ fontSize: 15, lineHeight: 1.7 }}>
          <p style={{ marginTop: 0 }}>Die Dunkelheit nimmt dich. Doch in {VILLAGES[P.lastVillage].name} wacht jemand über dich.</p>
          <p style={{ color: C.dim, fontSize: 13 }}>Du verlierst ein Zehntel deines Goldes und erwachst mit halbem Leben.</p>
        </div>
      ), <Btn tone="gold" onClick={respawn}>Zurück nach {VILLAGES[P.lastVillage].name}</Btn>);
    }
    return null;
  };

  /* ---------- Spielansicht ---------- */
  const ctl = { touchAction: "none", userSelect: "none", WebkitUserSelect: "none" };
  return (
    <div style={{ minHeight: "100vh", background: C.bg, color: C.text, fontFamily: FONT, display: "flex", justifyContent: "center" }}>
      <div style={{ width: "100%", maxWidth: 520, position: "relative", display: "flex", flexDirection: "column", minHeight: "100vh" }}>
        {/* HUD */}
        <div style={{ padding: "8px 12px 6px", display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
          <div>
            <Hearts hp={ui ? ui.hp : P.hp} maxHp={ui ? ui.maxHp : d.maxHp} />
            <div style={{ fontSize: 11, color: C.dim, marginTop: 3 }}>{ui ? ui.hp : P.hp} / {ui ? ui.maxHp : d.maxHp}{ui && ui.buff ? <span style={{ color: C.gold }}> · gestärkt</span> : ""}</div>
          </div>
          <div style={{ textAlign: "right", fontSize: 13 }}>
            <div style={{ color: C.gold }}>{ui ? ui.gold : P.gold} Gold</div>
            <div>Stufe {ui ? ui.level : P.level}</div>
            <div style={{ width: 90, height: 4, background: "#3a3025", borderRadius: 2, marginTop: 3, marginLeft: "auto" }}>
              <div style={{ width: `${ui ? (ui.xp / ui.need) * 100 : 0}%`, height: "100%", background: "#8fd3ff", borderRadius: 2 }} />
            </div>
          </div>
        </div>
        {/* Spielfeld */}
        <div style={{ position: "relative", width: "100%", aspectRatio: `${W} / ${H}`, background: "#000" }}>
          <canvas ref={canvasRef} width={W} height={H} style={{ width: "100%", height: "100%", imageRendering: "pixelated", display: "block" }} />
          <div style={{ position: "absolute", top: 6, left: 8, fontSize: 12, color: "rgba(233,220,184,.85)", textShadow: "0 1px 2px #000" }}>{ui ? ui.loc : ""}</div>
          {ui && ui.banner && (
            <div style={{ position: "absolute", top: "30%", left: 0, right: 0, textAlign: "center", pointerEvents: "none" }}>
              <div style={{ display: "inline-block", background: "rgba(10,8,6,.8)", padding: "8px 18px", borderRadius: 6, border: `1px solid ${C.gold}` }}>
                <div style={{ fontSize: 20, color: C.gold }}>{ui.banner.text}</div>
                {ui.banner.sub && <div style={{ fontSize: 12, color: C.dim }}>{ui.banner.sub}</div>}
              </div>
            </div>
          )}
          {ui && ui.msg && (
            <div style={{ position: "absolute", bottom: 8, left: 0, right: 0, textAlign: "center", pointerEvents: "none" }}>
              <span style={{ background: "rgba(10,8,6,.8)", padding: "4px 10px", borderRadius: 4, fontSize: 13, color: ui.msg.color }}>{ui.msg.text}</span>
            </div>
          )}
        </div>
        {/* Steuerung */}
        <div style={{ flex: 1, display: "flex", justifyContent: "space-between", alignItems: "center", padding: "18px 18px 22px", ...ctl }}>
          <div ref={padRef} onPointerDown={(e) => { e.currentTarget.setPointerCapture(e.pointerId); padPointer(e, false); }} onPointerMove={(e) => { if (e.buttons || e.pointerType === "touch") padPointer(e, false); }} onPointerUp={(e) => padPointer(e, true)} onPointerCancel={(e) => padPointer(e, true)}
            style={{ width: 130, height: 130, borderRadius: "50%", background: "radial-gradient(circle, #3a3025 0%, #2a231b 70%, #1f1912 100%)", border: `2px solid ${C.line}`, position: "relative", ...ctl }}>
            {[["50%", "14%", "▲"], ["50%", "86%", "▼"], ["14%", "50%", "◀"], ["86%", "50%", "▶"]].map(([l, t, ch], i) => <div key={i} style={{ position: "absolute", left: l, top: t, transform: "translate(-50%,-50%)", color: C.dim, fontSize: 14, lineHeight: 1 }}>{ch}</div>)}
          </div>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 10 }}>
            <div style={{ display: "flex", gap: 10, alignItems: "flex-end" }}>
              <button onPointerDown={() => { if (!panel) usePotion(G); }} style={{ width: 58, height: 58, borderRadius: "50%", background: "#3a2a28", border: `2px solid ${C.red}`, color: C.text, fontFamily: FONT, fontSize: 12, ...ctl }}>Trank<br /><span style={{ color: C.dim }}>{ui ? ui.pots : 0}</span></button>
              <button onPointerDown={(e) => { e.currentTarget.setPointerCapture(e.pointerId); inputRef.current.attack = true; }} onPointerUp={() => { inputRef.current.attack = false; }} onPointerCancel={() => { inputRef.current.attack = false; }}
                style={{ width: 82, height: 82, borderRadius: "50%", background: "radial-gradient(circle, #5a4a2a, #3a3020)", border: `2px solid ${C.gold}`, color: C.gold, fontFamily: FONT, fontSize: 15, ...ctl }}>Schwert</button>
            </div>
            <Btn small onClick={() => { if (panel === "inventar") closePanel(); else if (!panel) { setSelected(null); setPanel("inventar"); } }}>Ausrüstung &amp; Karte</Btn>
          </div>
        </div>
        {renderPanel()}
      </div>
    </div>
  );
}
function sumStats(s) { return Object.values(s).reduce((a, b) => a + b, 0); }
