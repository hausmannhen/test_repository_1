/* Weltgenerierung: Bildschirme, Dörfer, Dungeons, Monster-Spawns */
import { TS, VW, VH, WORLD_W, WORLD_H, DG, T, SOLID, idx, REGIONS, regionAt, VILLAGES, DUNGEON_BY_SCREEN } from "./constants.js";
import { hashStr, rngFor, rint, pick, chance } from "./rng.js";
import { BOSSES, makeMob } from "./monsters.js";
import { NPCS_BY_VILLAGE } from "../data/npcs.js";
import { MINIBOSS_BY_SCREEN } from "../data/minibosses.js";

export function isProtected(x, y) {
  // Kreuz durch die Mitte + Öffnungen an den Rändern: garantiert Durchgang
  if (x >= 6 && x <= 8) return true;
  if (y >= 4 && y <= 6) return true;
  return false;
}

export function genOverworldScreen(seed, sx, sy) {
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
  for (let y = 0; y < VH; y++) for (let x = 0; x < VW; x++) {
    if (isProtected(x, y)) continue;
    const i = idx(x, y);
    if (smooth[i] >= cut) {
      // Clustertyp aus grober Zelle ableiten, damit Wasser/Bäume zusammenhängen
      const cell = hashStr(seed + key + Math.floor(x / 3) + "_" + Math.floor(y / 3));
      tiles[i] = reg.decor[cell % reg.decor.length];
    } else if (chance(r, reg.decorDensity * 0.35)) {
      tiles[i] = pick(r, reg.decor.filter(t => t !== T.WATER && t !== T.LAVA));
    }
  }
  // Weltrand
  const border = regId === "wiese" || regId === "wald" ? T.TREE : T.ROCK;
  for (let x = 0; x < VW; x++) { if (sy === 0) tiles[idx(x, 0)] = border; if (sy === WORLD_H - 1) tiles[idx(x, VH - 1)] = border; }
  for (let y = 0; y < VH; y++) { if (sx === 0) tiles[idx(0, y)] = border; if (sx === WORLD_W - 1) tiles[idx(VW - 1, y)] = border; }

  const screen = { key, tiles, region: regId, doors: {}, village: null, dungeon: null, chest: null, npcs: [], miniboss: MINIBOSS_BY_SCREEN[key] || null, arena: false };

  if (VILLAGES[key]) buildVillage(screen, r, VILLAGES[key], regId);
  else if (DUNGEON_BY_SCREEN[key]) buildDungeonEntrance(screen, DUNGEON_BY_SCREEN[key], regId);
  else {
    // Arena: nur die Reviere der Zwischenbosse. Arenen haben immer eine Kampftruhe.
    screen.arena = !!screen.miniboss;
    if (screen.arena || chance(r, 0.25)) {
      const spots = [];
      for (let y = 2; y < VH - 2; y++) for (let x = 2; x < VW - 2; x++) if (!isProtected(x, y) && !SOLID.has(tiles[idx(x, y)]) && !(Math.abs(x - 7) < 2 && Math.abs(y - 5) < 2)) spots.push([x, y]);
      if (spots.length) { const [cx, cy] = pick(r, spots); tiles[idx(cx, cy)] = T.CHEST; screen.chest = { x: cx, y: cy, id: (screen.arena ? "a" : "w") + key }; }
    }
  }
  return screen;
}

export function buildVillage(screen, r, vill, regId) {
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
  // Bewohner
  for (const n of NPCS_BY_VILLAGE[screen.key] || []) {
    tiles[idx(n.x, n.y)] = T.NPC;
    screen.doors[`${n.x},${n.y}`] = "npc:" + n.id;
    screen.npcs.push({ id: n.id, x: n.x, y: n.y });
  }
  // Rand
  const border = regId === "wueste" ? T.ROCK : T.TREE;
  for (let x = 0; x < VW; x++) { if (!isProtected(x, 0)) tiles[idx(x, 0)] = border; if (!isProtected(x, VH - 1)) tiles[idx(x, VH - 1)] = border; }
  for (let y = 0; y < VH; y++) { if (!isProtected(0, y)) tiles[idx(0, y)] = border; if (!isProtected(VW - 1, y)) tiles[idx(VW - 1, y)] = border; }
  screen.village = vill;
}

export function buildDungeonEntrance(screen, d, regId) {
  const { tiles } = screen;
  for (let dy = 1; dy <= 3; dy++) for (let dx = 5; dx <= 9; dx++) tiles[idx(dx, dy)] = T.ROCK;
  tiles[idx(7, 3)] = T.ENTRANCE;
  tiles[idx(7, 4)] = T.PATH; tiles[idx(7, 5)] = T.PATH;
  screen.dungeon = d;
}

/* ---------- Dungeons ---------- */
export function genDungeon(seed, d) {
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
  return { id: d.id, rooms, entry, conn };
}

export function genDungeonRoom(r, d, c, type, key) {
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
  const screen = { key: "d" + d.id + ":" + key, tiles, region: null, doors: {}, village: null, dungeon: null, chest: null, npcs: [], miniboss: null, dungeonRoom: { type, d, conn: c } };
  if (type === "entry") { tiles[idx(7, VH - 2)] = T.EXIT; }
  if (type === "chest") { tiles[idx(7, 5)] = T.CHEST; screen.chest = { x: 7, y: 5, id: "d" + d.id + key }; }
  return screen;
}

/* ---------- Monster spawnen ---------- */
export function walkable(tiles, tx, ty) {
  if (tx < 0 || ty < 0 || tx >= VW || ty >= VH) return false;
  const t = tiles[idx(tx, ty)];
  return !SOLID.has(t) && t !== T.LAVA && t !== T.DOOR && t !== T.CHEST && t !== T.ENTRANCE && t !== T.EXIT;
}
export function spawnMobsFor(screen, seed, visitCount, cleared = {}, opts = {}) {
  const mobs = [];
  const r = rngFor(seed, "mobs" + screen.key + ":" + visitCount);
  let pool, level, count;
  // Zwischenboss in seinem Revier, solange er lebt
  if (screen.miniboss && !cleared["mb:" + screen.miniboss.id]) {
    const mb = screen.miniboss;
    let tx = 7, ty = 3;
    for (let tries = 0; tries < 50 && !walkable(screen.tiles, tx, ty); tries++) { tx = rint(r, 2, VW - 3); ty = rint(r, 1, 3); }
    mobs.push(makeMob(mb.base, mb.level, tx * TS + 8, ty * TS + 8, { ...mb, mini: mb.id }));
  }
  if (screen.dungeonRoom) {
    const d = screen.dungeonRoom.d;
    pool = d.mobs; level = d.level;
    if (screen.dungeonRoom.type === "boss") {
      let bd = BOSSES[d.id];
      if (d.id === 2) {
        // Vargor: ganz frei (drei Phasen) oder angekettet (schwächer, weniger Beute)
        bd = opts.choice === "flicken" ? { ...bd, name: "Aschedrache Vargor, gefesselt", hpMult: 3.5, atkMult: 1.2, weak: true } : { ...bd, name: "Aschedrache Vargor, entfesselt", hpMult: 6.5, atkMult: 1.7, phases: 2 };
      }
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
