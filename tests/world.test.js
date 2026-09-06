import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { VW, VH, WORLD_W, WORLD_H, DG, T, SOLID, idx, VILLAGES, DUNGEONS, DUNGEON_BY_SCREEN } from "../src/game/constants.js";
import { genOverworldScreen, genDungeon, spawnMobsFor, walkable } from "../src/game/world.js";
import { landingSpot, createGame, startGame, enterScreen, update } from "../src/game/engine.js";

const SEEDS = ["eldenfeld-a1b2c3", "eldenfeld-zz9", "hendrik", "42"];
const passable = t => !SOLID.has(t) && t !== T.LAVA;

describe("Oberwelt", () => {
  it("Mitte jedes Bildschirms ist begehbar, Kreuz garantiert Durchgang", () => {
    for (const seed of SEEDS) for (let y = 0; y < WORLD_H; y++) for (let x = 0; x < WORLD_W; x++) {
      const s = genOverworldScreen(seed, x, y);
      assert.ok(passable(s.tiles[idx(7, 5)]), `${seed} ${x},${y} Mitte blockiert`);
      // Öffnungen zu Nachbarn: mittlere Kanten frei, außer am Weltrand
      if (x > 0) for (let yy = 4; yy <= 6; yy++) assert.ok(passable(s.tiles[idx(0, yy)]), `${seed} ${x},${y} Westkante`);
      if (x < WORLD_W - 1) for (let yy = 4; yy <= 6; yy++) assert.ok(passable(s.tiles[idx(VW - 1, yy)]), `${seed} ${x},${y} Ostkante`);
      if (y > 0) for (let xx = 6; xx <= 8; xx++) assert.ok(passable(s.tiles[idx(xx, 0)]), `${seed} ${x},${y} Nordkante`);
      if (y < WORLD_H - 1) for (let xx = 6; xx <= 8; xx++) assert.ok(passable(s.tiles[idx(xx, VH - 1)]), `${seed} ${x},${y} Südkante`);
    }
  });

  it("Dörfer haben vier Häuser mit Türen und einen Wegweiser", () => {
    for (const key in VILLAGES) {
      const [x, y] = key.split(",").map(Number);
      const s = genOverworldScreen("seed", x, y);
      assert.equal(s.village.name, VILLAGES[key].name);
      const types = Object.values(s.doors).filter(t => !t.startsWith("npc:")).sort();
      assert.deepEqual(types, ["heal", "sage", "shop", "sign", "smith"]);
      assert.ok(s.npcs.length >= 1, key + " ohne Bewohner");
      for (const dk in s.doors) {
        const [dx, dy] = dk.split(",").map(Number);
        const t = s.tiles[idx(dx, dy)];
        assert.ok(t === T.DOOR || t === T.SIGN || t === T.NPC);
        if (t === T.NPC) {
          // Bewohner stehen frei erreichbar: mindestens ein begehbares Nachbartile
          const nb = [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([ox, oy]) => passable(s.tiles[idx(dx + ox, dy + oy)]));
          assert.ok(nb, key + " Bewohner eingemauert");
        }
      }
    }
  });

  it("Dungeon-Eingänge liegen auf dem Bildschirm und sind erreichbar", () => {
    for (const d of DUNGEONS) {
      const [x, y] = d.screen.split(",").map(Number);
      const s = genOverworldScreen("seed", x, y);
      assert.equal(s.dungeon, DUNGEON_BY_SCREEN[d.screen]);
      assert.equal(s.tiles[idx(7, 3)], T.ENTRANCE);
      assert.ok(passable(s.tiles[idx(7, 4)]));
    }
  });

  it("Monster spawnen nur auf begehbaren Tiles, nie im Dorf", () => {
    for (const seed of SEEDS) for (let y = 0; y < WORLD_H; y++) for (let x = 0; x < WORLD_W; x++) {
      const s = genOverworldScreen(seed, x, y);
      const mobs = spawnMobsFor(s, seed, 1);
      if (s.village) { assert.equal(mobs.length, 0); continue; }
      assert.ok(mobs.length >= 2);
      for (const m of mobs) assert.ok(walkable(s.tiles, Math.floor(m.x / 16), Math.floor(m.y / 16)));
    }
  });
});

describe("Dungeons", () => {
  function reachable(rooms) {
    const seen = new Set(["1,2"]);
    const q = ["1,2"];
    while (q.length) {
      const k = q.shift();
      const [x, y] = k.split(",").map(Number);
      const t = rooms[k].tiles;
      const nbs = [];
      if (t[idx(7, 0)] === T.FLOOR) nbs.push(`${x},${y - 1}`);
      if (t[idx(7, VH - 1)] === T.FLOOR) nbs.push(`${x},${y + 1}`);
      if (t[idx(0, 5)] === T.FLOOR) nbs.push(`${x - 1},${y}`);
      if (t[idx(VW - 1, 5)] === T.FLOOR) nbs.push(`${x + 1},${y}`);
      for (const n of nbs) if (rooms[n] && !seen.has(n)) { seen.add(n); q.push(n); }
    }
    return seen;
  }
  it("alle Räume verbunden, Öffnungen beidseitig, Boss und zwei Truhen", () => {
    for (const seed of SEEDS) for (const d of DUNGEONS) {
      const dg = genDungeon(seed, d);
      assert.equal(Object.keys(dg.rooms).length, DG * DG);
      assert.equal(reachable(dg.rooms).size, DG * DG, `${seed} ${d.name} nicht verbunden`);
      const types = Object.values(dg.rooms).map(r => r.dungeonRoom.type);
      assert.equal(types.filter(t => t === "boss").length, 1);
      assert.equal(types.filter(t => t === "chest").length, 2);
      assert.equal(types.filter(t => t === "entry").length, 1);
      // Öffnung auf beiden Seiten einer Verbindung
      for (const k in dg.conn) {
        const [x, y] = k.split(",").map(Number);
        const c = dg.conn[k];
        if (c.n) assert.ok(dg.conn[`${x},${y - 1}`].s);
        if (c.e) assert.ok(dg.conn[`${x + 1},${y}`].w);
      }
      assert.equal(dg.rooms["1,2"].tiles[idx(7, VH - 2)], T.EXIT);
      for (const k in dg.rooms) assert.ok(passable(dg.rooms[k].tiles[idx(7, 5)]));
    }
  });
  it("Bossraum enthält den Boss, nach Sieg nicht mehr", () => {
    const G = startGame(createGame("boss-seed"));
    const dg = genDungeon(G.seed, DUNGEONS[0]);
    const bossKey = Object.keys(dg.rooms).find(k => dg.rooms[k].dungeonRoom.type === "boss");
    const [bx, by] = bossKey.split(",").map(Number);
    enterScreen(G, "d0", bx, by, 7 * 16 + 8, 8 * 16 + 8);
    assert.equal(G.mobs.filter(m => m.boss).length, 1);
    G.P.cleared[0] = true;
    enterScreen(G, "d0", bx, by, 7 * 16 + 8, 8 * 16 + 8);
    assert.equal(G.mobs.filter(m => m.boss).length, 0);
  });
});

describe("Bildschirmwechsel", () => {
  it("Landeposition weicht blockierten Tiles aus", () => {
    const tiles = new Uint8Array(VW * VH);
    tiles[idx(0, 5)] = T.TREE;                       // Ziel-Tile blockiert
    const spot = landingSpot(tiles, 6, 5 * 16 + 8, 1, 0);
    assert.ok(spot);
    assert.notEqual(Math.floor(spot.y / 16), 5);
    tiles.fill(T.TREE);
    assert.equal(landingSpot(tiles, 6, 5 * 16 + 8, 1, 0), null);
  });
  it("Wechsel nach Osten startet einen Kamera-Slide und pausiert die Engine", () => {
    const G = startGame(createGame("slide"));
    // Elmshain (4,5): Mitte rechts hinauslaufen
    G.P.x = 14 * 16 + 8; G.P.y = 5 * 16 + 8;
    let steps = 0;
    while (G.P.sx === 4 && steps++ < 300) update(G, 1 / 60, { x: 1, y: 0, attack: false });
    assert.equal(G.P.sx, 5);
    assert.ok(G.transition && G.transition.dx === 1);
    const px = G.P.x;
    for (let i = 0; i < 10; i++) update(G, 1 / 60, { x: 1, y: 0, attack: false });
    assert.equal(G.P.x, px, "Spieler bewegt sich während des Slides");
    for (let i = 0; i < 30; i++) update(G, 1 / 60, { x: 0, y: 0, attack: false });
    assert.equal(G.transition, null);
  });
});
