import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { TS, VW, VH, WORLD_W, WORLD_H, idx, regionAt } from "../src/game/constants.js";
import { walkable } from "../src/game/world.js";
import { createGame, startGame, enterScreen, update } from "../src/game/engine.js";
import { derive, usePotion } from "../src/game/player.js";
import { migrate, serialize } from "../src/game/save.js";
import { makeMob } from "../src/game/monsters.js";

/* Kampfsimulation: Spieler läuft zum nächsten Monster und schlägt zu.
   Bleibt er hängen, wird er neben das Monster gesetzt (Navigation ist nicht Testgegenstand). */
function simulate(G, targetKills, maxSeconds, regionFilter) {
  const dt = 1 / 60;
  let t = 0, stuckT = 0, lastDist = Infinity, hops = 0;
  const screens = [];
  for (let y = 0; y < WORLD_H; y++) for (let x = 0; x < WORLD_W; x++) if (regionFilter(regionAt(x, y))) screens.push([x, y]);
  while (G.P.kills < targetKills && t < maxSeconds && !G.dead) {
    const P = G.P;
    if (!G.mobs.length) {
      const [sx, sy] = screens[hops++ % screens.length];
      enterScreen(G, "over", sx, sy, 7 * TS + 8, 5 * TS + 8, false);
      stuckT = 0; lastDist = Infinity;
      continue;
    }
    let m = null, best = Infinity;
    for (const mm of G.mobs) { const dd = Math.hypot(mm.x - P.x, mm.y - P.y); if (dd < best) { best = dd; m = mm; } }
    const d = derive(P);
    const dx = m.x - P.x, dy = m.y - P.y;
    const inReach = best < d.reach + m.size / 2 + 2;
    const input = { x: inReach ? Math.sign(dx) * 0.3 : dx / best, y: inReach ? Math.sign(dy) * 0.3 : dy / best, attack: inReach };
    if (P.hp < d.maxHp * 0.4) usePotion(G);
    update(G, dt, input);
    if (G.transition) { G.transition = null; }
    t += dt;
    if (best >= lastDist - 0.5 && !inReach) stuckT += dt; else stuckT = 0;
    lastDist = best;
    if (stuckT > 2) {
      // neben das Monster setzen
      const tiles = G.screen.tiles;
      const mx = Math.floor(m.x / TS), my = Math.floor(m.y / TS);
      outer: for (let r = 1; r < 4; r++) for (let yy = -r; yy <= r; yy++) for (let xx = -r; xx <= r; xx++) {
        if (walkable(tiles, mx + xx, my + yy)) { P.x = (mx + xx) * TS + 8; P.y = (my + yy) * TS + 8; break outer; }
      }
      stuckT = 0;
    }
  }
  return { kills: G.P.kills, seconds: t, dead: G.dead, level: G.P.level };
}

describe("Kampf", () => {
  it("30 Kills im Grasland auf Stufe 1 ohne Tod", () => {
    const G = startGame(createGame("kampf-seed"));
    const res = simulate(G, 30, 600, r => r === "wiese");
    assert.ok(!res.dead, "Spieler gestorben nach " + res.kills + " Kills");
    assert.ok(res.kills >= 30, "nur " + res.kills + " Kills in " + res.seconds.toFixed(0) + " s");
  });

  it("Schaden, XP und Stufenaufstieg greifen", () => {
    const G = startGame(createGame("xp-seed"));
    const P = G.P;
    P.xp = 0;
    enterScreen(G, "over", 1, 3, 7 * TS + 8, 5 * TS + 8, false);
    const before = P.level;
    P.xp = 10000;
    update(G, 1 / 60, { x: 0, y: 0, attack: false });
    assert.equal(P.level, before);  // Aufstieg erst bei XP-Gewinn
    G.mobs = [];
    // Monster direkt vor den Spieler stellen und töten
    const m = makeMob("schleim", 1, P.x + 10, P.y);
    m.hp = 1;
    G.mobs = [m];
    P.dir = "right";
    for (let i = 0; i < 10 && G.mobs.length; i++) update(G, 1 / 60, { x: 0, y: 0, attack: true });
    assert.equal(G.mobs.length, 0);
    assert.ok(P.level > before, "kein Aufstieg");
    assert.equal(P.hp, derive(P).maxHp);
    assert.ok(G.drops.some(d => d.type === "gold"));
  });

  it("Unverwundbarkeit nach Treffer", () => {
    const G = startGame(createGame("inv-seed"));
    const P = G.P;
    enterScreen(G, "over", 1, 3, 7 * TS + 8, 5 * TS + 8, false);
    const m = makeMob("wolf", 1, P.x, P.y);
    m.spd = 0;
    G.mobs = [m];
    update(G, 1 / 60, { x: 0, y: 0, attack: false });
    const hp1 = P.hp;
    assert.ok(hp1 < 60);
    update(G, 1 / 60, { x: 0, y: 0, attack: false });
    assert.equal(P.hp, hp1);
  });
});

describe("Speichern", () => {
  it("Migration hebt alte Speicherstände auf Version 1", () => {
    const G = startGame(createGame("save-seed"));
    const s = JSON.parse(serialize(G));
    assert.equal(s.saveVersion, 1);
    assert.equal(s.seed, "save-seed");
    const old = { seed: "alt", P: { level: 3, xp: 1, gold: 5, hp: 10, inventory: [], equip: {}, area: "over", sx: 2, sy: 3, x: 0, y: 0, dir: "up" } };
    const mig = migrate(old);
    assert.equal(mig.saveVersion, 1);
    assert.deepEqual(mig.P.visits, {});
    assert.equal(mig.P.level, 3);
    assert.equal(migrate(null), null);
    assert.equal(migrate({ foo: 1 }), null);
  });
});
