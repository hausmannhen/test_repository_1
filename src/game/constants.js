/* Konstanten: Tiles, Bildschirm, Regionen, Dörfer, Dungeons */

export const TS = 16;          // Tilegröße in Pixeln (Engine rechnet in Pixeln)
export const VW = 15;          // Tiles pro Bildschirm (Breite)
export const VH = 11;          // Tiles pro Bildschirm (Höhe)
export const W = VW * TS;      // 240
export const H = VH * TS;      // 176
export const WORLD_W = 6;
export const WORLD_H = 6;
export const DG = 3;           // Dungeon: 3x3 Räume

export const T = {
  GRASS: 0, ROCK: 1, WATER: 2, TREE: 3, SAND: 4, PATH: 5, HOUSE: 6, DOOR: 7,
  FLOWER: 8, SNOW: 9, LAVA: 10, FLOOR: 11, WALL: 12, ENTRANCE: 13, EXIT: 14,
  BUSH: 15, ICE: 16, SWAMP: 17, CHEST: 18, PILLAR: 19, DEADTREE: 20, CACTUS: 21,
  ASH: 22, SIGN: 23,
};
export const SOLID = new Set([T.ROCK, T.WATER, T.TREE, T.HOUSE, T.WALL, T.BUSH, T.PILLAR, T.DEADTREE, T.CACTUS, T.SIGN]);

export const idx = (x, y) => y * VW + x;

/* ---------- Regionen ---------- */
export const REGIONS = {
  wiese:  { name: "Grasland von Elyn", level: 1,  ground: [T.GRASS, T.GRASS, T.GRASS, T.FLOWER], decor: [T.TREE, T.BUSH, T.ROCK, T.WATER], decorDensity: 0.09, mobs: ["schleim", "ratte", "wolf"], mobCount: [2, 4] },
  wald:   { name: "Dunkelforst",       level: 4,  ground: [T.GRASS, T.GRASS, T.FLOWER],          decor: [T.TREE, T.TREE, T.TREE, T.BUSH],  decorDensity: 0.2,  mobs: ["wolf", "spinne", "waldgeist"], mobCount: [3, 5] },
  berg:   { name: "Kargstein-Höhen",   level: 8,  ground: [T.GRASS, T.PATH, T.PATH],             decor: [T.ROCK, T.ROCK, T.ROCK, T.DEADTREE], decorDensity: 0.18, mobs: ["fledermaus", "golem", "skelett"], mobCount: [3, 5] },
  wueste: { name: "Glutwüste",         level: 12, ground: [T.SAND, T.SAND, T.SAND],              decor: [T.CACTUS, T.ROCK, T.CACTUS],       decorDensity: 0.08, mobs: ["skorpion", "bandit", "sandwurm"], mobCount: [3, 5] },
  sumpf:  { name: "Nebelmoor",         level: 15, ground: [T.SWAMP, T.GRASS, T.SWAMP],           decor: [T.DEADTREE, T.WATER, T.WATER, T.BUSH], decorDensity: 0.16, mobs: ["hexe", "schleim", "skelett"], mobCount: [3, 6] },
  eis:    { name: "Frostkamm",         level: 19, ground: [T.SNOW, T.SNOW, T.ICE],               decor: [T.ROCK, T.DEADTREE, T.ROCK],      decorDensity: 0.12, mobs: ["eiswolf", "golem", "schamane"], mobCount: [3, 6] },
  vulkan: { name: "Aschekessel",       level: 24, ground: [T.ASH, T.ASH, T.ASH],                 decor: [T.ROCK, T.LAVA, T.LAVA, T.ROCK],  decorDensity: 0.14, mobs: ["feuerteufel", "golem", "drache"], mobCount: [3, 6] },
};
export const REGION_MAP = [
  ["eis",  "eis",   "eis",   "vulkan", "vulkan", "vulkan"],
  ["eis",  "berg",  "berg",  "berg",   "berg",   "vulkan"],
  ["wald", "wiese", "wiese", "wiese",  "wueste", "wueste"],
  ["wald", "wiese", "wiese", "wiese",  "wueste", "wueste"],
  ["wald", "wald",  "wiese", "wiese",  "sumpf",  "sumpf"],
  ["wald", "wald",  "wiese", "sumpf",  "sumpf",  "sumpf"],
];
export function regionAt(x, y) { return REGION_MAP[y][x]; }

/* Farbe der Region auf der Weltkarte */
export const REGION_MAP_COLORS = { wiese: "#4f9a4a", wald: "#2f6b2a", berg: "#7d7a72", wueste: "#d9c27a", sumpf: "#4a6a3a", eis: "#e8eef5", vulkan: "#5a4a48" };

/* ---------- Dörfer und Dungeons ---------- */
export const VILLAGES = {
  "2,3": { name: "Elmshain",  start: true, greeting: "Willkommen in Elmshain. Hier beginnt jede Reise." },
  "3,1": { name: "Kargstein", greeting: "Kargstein. Der Wind hier frisst Fleisch und Stahl." },
  "5,3": { name: "Dünenruh",  greeting: "Dünenruh. Wasser ist hier teurer als Gold." },
  "1,5": { name: "Moorhall",  greeting: "Moorhall. Sprich leise, das Moor hört zu." },
};
export const DUNGEONS = [
  { id: 0, name: "Waldschrein", level: 6,  screen: "0,4", floor: "#3e4a36", floor2: "#465542", wall: "#22301c", wall2: "#5a7a48", mobs: ["spinne", "waldgeist", "wolf"] },
  { id: 1, name: "Steinhalle", level: 13, screen: "4,1", floor: "#4a4a52", floor2: "#52525c", wall: "#2a2a30", wall2: "#7a7a88", mobs: ["skelett", "golem", "fledermaus"] },
  { id: 2, name: "Ascheturm",  level: 27, screen: "4,0", floor: "#3a2a28", floor2: "#452f2c", wall: "#1a0e0c", wall2: "#a04020", mobs: ["feuerteufel", "golem", "skelett"] },
];
export const DUNGEON_BY_SCREEN = Object.fromEntries(DUNGEONS.map(d => [d.screen, d]));
