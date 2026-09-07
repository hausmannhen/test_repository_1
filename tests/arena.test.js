import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { TS, VW, VH, WORLD_W, WORLD_H, T, idx, DUNGEONS } from "../src/game/constants.js";
import { genOverworldScreen, genDungeon } from "../src/game/world.js";
import { createGame, startGame, enterScreen, update, killMob } from "../src/game/engine.js";
import { makeMob } from "../src/game/monsters.js";
import { MINIBOSSES } from "../src/data/minibosses.js";

const idle = { x: 0, y: 0, attack: false, cast: false };
function findArena(seed) {
  for (let y = 0; y < WORLD_H; y++) for (let x = 0; x < WORLD_W; x++) { const s = genOverworldScreen(seed, x, y); if (s.arena) return [x, y, s]; }
  return null;
}

describe("Arenen", () => {
  it("nur die Reviere sind Arenen, immer mit Truhe", () => {
    let arenas = 0, wild = 0;
    for (let y = 0; y < WORLD_H; y++) for (let x = 0; x < WORLD_W; x++) {
      const s = genOverworldScreen("arena-seed", x, y);
      if (s.village || s.dungeon) { assert.equal(s.arena, false); continue; }
      wild++;
      if (s.arena) { arenas++; assert.ok(s.chest && s.chest.id.startsWith("a"), `${x},${y} Arena ohne Truhe`); }
      if (s.miniboss) assert.ok(s.arena, "Revier ist keine Arena");
    }
    assert.equal(arenas, MINIBOSSES.length, `${arenas} Arenen von ${wild}`);
  });

  it("sperrt die Ränder, bis alle Gegner tot sind, dann Erfahrung und offener Weg, einmalig", () => {
    const G = startGame(createGame("arena-seed"));
    const [x, y] = findArena(G.seed);
    enterScreen(G, "over", x, y, 7 * TS + 8, 5 * TS + 8, true);
    assert.ok(G.arenaLock, "keine Sperre");
    assert.equal(G.banner.text, "Hinterhalt");
    assert.ok(G.mobs.some(m => m.mini));
    G.P.x = 1; G.P.y = 5 * TS + 8; G.trigCd = 0;
    update(G, 1 / 60, { ...idle, x: -1 });
    assert.equal(G.P.sx, x, "Rand durchlässig");
    const xp = G.P.xp;
    for (const m of [...G.mobs]) killMob(G, m);
    update(G, 1 / 60, idle);
    assert.equal(G.arenaLock, false);
    assert.equal(G.P.arenas[`${x},${y}`], true);
    assert.ok(G.P.xp > xp || G.P.level > 1, "keine Erfahrung");
    enterScreen(G, "over", x, y, 7 * TS + 8, 5 * TS + 8, false);
    assert.equal(G.arenaLock, false, "Arena sperrt erneut");
  });

  it("Bossraum sperrt bis zum Sieg, danach nicht mehr", () => {
    const G = startGame(createGame("arena-boss"));
    const dg = genDungeon(G.seed, DUNGEONS[0]);
    const key = Object.keys(dg.rooms).find(k => dg.rooms[k].dungeonRoom.type === "boss");
    const [bx, by] = key.split(",").map(Number);
    enterScreen(G, "d0", bx, by, 7 * TS + 8, 8 * TS + 8, true);
    assert.ok(G.arenaLock);
    assert.equal(G.banner.text, "Kein Zurück");
    for (const m of [...G.mobs]) killMob(G, m);
    update(G, 1 / 60, idle);
    assert.equal(G.arenaLock, false);
    enterScreen(G, "d0", bx, by, 7 * TS + 8, 8 * TS + 8, false);
    assert.equal(G.arenaLock, false);
  });
});

describe("Kampftruhen", () => {
  it("öffnet erst, wenn kein Gegner mehr lebt", () => {
    const G = startGame(createGame("truhe"));
    const [x, y, s] = findArena(G.seed);
    enterScreen(G, "over", x, y, s.chest.x * TS + 8, s.chest.y * TS + 8, false);
    assert.ok(G.mobs.length > 0);
    G.trigCd = 0;
    update(G, 1 / 60, idle);
    assert.equal(G.P.chests[s.chest.id], undefined, "Truhe trotz Gegner offen");
    assert.match(G.msg.text, /Verriegelt/);
    for (const m of [...G.mobs]) killMob(G, m);
    G.trigCd = 0;
    update(G, 1 / 60, idle);
    assert.equal(G.P.chests[s.chest.id], true, "Truhe bleibt zu");
    assert.ok(G.drops.some(d => d.type === "item" && ["selten", "episch", "legendaer"].includes(d.item.rarity)), "Kampftruhe ohne gute Beute");
  });
});
