/* Monster: Typen, Bosse, Skalierung, Drop-Tabellen */
import { rint, chance } from "./rng.js";
import { generateItem } from "./items.js";
import { ELITES } from "../data/elites.js";
import { ABILITIES } from "../data/abilities.js";

export const MOBS = {
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
export const BOSSES = {
  0: { base: "waldgeist", name: "Eichenkönig",        hpMult: 8,  atkMult: 1.4, size: 20, color: "#5aa06a", color2: "#1f4a2a" },
  1: { base: "golem",     name: "Gebirgswächter",     hpMult: 7,  atkMult: 1.5, size: 24, color: "#6f7a90", color2: "#2a3040" },
  2: { base: "drache",    name: "Aschedrache Vargor", hpMult: 3,  atkMult: 0.6, size: 26, color: "#e04a2a", color2: "#3a0a0a" },
};

export function makeMob(typeId, level, x, y, bossDef = null) {
  const base = MOBS[typeId];
  const lvlMult = 1 + (level - 1) * 0.28;
  const m = {
    id: Math.random().toString(36).slice(2), type: typeId, name: bossDef ? bossDef.name : base.name,
    x, y, vx: 0, vy: 0, level,
    maxHp: Math.round(base.hp * 1.25 * lvlMult * (bossDef ? bossDef.hpMult : 1)),
    atk: Math.round(base.atk * (1 + (level - 1) * 0.16) * (bossDef ? bossDef.atkMult : 1)),
    spd: base.spd * (bossDef ? 1.1 : 1), size: bossDef ? bossDef.size : base.size,
    shape: base.shape, color: bossDef ? bossDef.color : base.color, color2: bossDef ? bossDef.color2 : base.color2,
    ai: base.ai, xp: Math.round(base.xp * (1 + (level - 1) * 0.2) * (bossDef ? (bossDef.mini || bossDef.leader ? 5 : 12) : 1)), gold: base.gold,
    t: Math.random() * 10, cd: 0, hitT: 0, wx: 0, wy: 0, boss: !!bossDef && !bossDef.mini && !bossDef.leader, mini: (bossDef && bossDef.mini) || null, leader: !!(bossDef && bossDef.leader), dead: false,
    side: 1, sideT: 0,   // Ausweichen bei Blockade (90° drehen)
    phases: (bossDef && bossDef.phases) || 0, phase: 0, weak: !!(bossDef && bossDef.weak),
    elite: null, abilities: [], tele: null, slowT: 0,
  };
  if (bossDef && bossDef.abilities) m.abilities = bossDef.abilities.filter(id => ABILITIES[id]).map(id => ({ id, t: ABILITIES[id].cd ? ABILITIES[id].cd * 0.5 : 0, used: false }));
  m.hp = m.maxHp;
  return m;
}
/* Ein gewöhnliches Monster zur Elite machen */
export function makeElite(m, eliteId) {
  const e = ELITES[eliteId];
  if (!e) return m;
  m.elite = eliteId;
  m.name = e.name + " " + m.name;
  m.maxHp = Math.round(m.maxHp * e.hpMult); m.hp = m.maxHp;
  m.atk = Math.round(m.atk * e.atkMult);
  if (e.spdMult) m.spd *= e.spdMult;
  m.size = Math.round(m.size * 1.2);
  m.xp = Math.round(m.xp * 3);
  return m;
}

/* ---------- Drop-Tabellen ---------- */
export function rollDrops(r, mob, luck, isBoss, weak = false) {
  const drops = [];
  const [g0, g1] = mob.gold;
  const gold = Math.round(rint(r, g0, g1) * (1 + luck * 0.03) * (isBoss ? 6 : 1));
  drops.push({ type: "gold", amount: gold });
  const ilvl = mob.level;
  if (isBoss) {
    drops.push({ type: "item", item: generateItem(r, ilvl + (weak ? 1 : 3), luck, weak ? 2 : 3) });
    if (!weak) drops.push({ type: "item", item: generateItem(r, ilvl + 1, luck, 2) });
    drops.push({ type: "potion", id: "heiltrank", qty: 1 });
    return drops;
  }
  const itemChance = mob.elite ? 1 : 0.05 + luck * 0.005;
  if (chance(r, itemChance)) drops.push({ type: "item", item: generateItem(r, ilvl + (mob.elite ? 1 : 0), luck, mob.elite ? 1 : 0) });
  if (chance(r, 0.05)) drops.push({ type: "potion", id: chance(r, 0.35) ? "manatrank" : "heiltrank", qty: 1 });
  return drops;
}
