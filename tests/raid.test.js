import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { TS, VW, VH } from "../src/game/constants.js";
import { createGame, startGame, enterScreen, update, startRaid, raidActive, killMob } from "../src/game/engine.js";
import { WELL, PAUSE } from "../src/game/raid.js";
import { acceptQuest, isComplete, completeQuest, talkTo, raidLevel, canOffer } from "../src/game/quests.js";

const idle = { x: 0, y: 0, attack: false, cast: false };
const step = (G, n, input = idle) => { for (let i = 0; i < n; i++) update(G, 1 / 60, input); };

describe("Überfall", () => {
  it("startet nur im Dorf, sperrt die Ausgänge, spawnt Wellen", () => {
    const G = startGame(createGame("raid"));
    enterScreen(G, "over", 3, 5, 7 * TS + 8, 5 * TS + 8, false);
    assert.equal(startRaid(G), false);
    enterScreen(G, "over", 4, 5, 7 * TS + 8, 8 * TS + 8, false);
    G.P.quests = { h1: { state: "done", progress: 6 } };
    assert.ok(acceptQuest(G.P, "r1"));
    assert.ok(startRaid(G, { waves: 3, questId: "r1" }));
    assert.ok(raidActive(G));
    step(G, 60 * 3);
    assert.equal(G.raid.wave, 1);
    assert.ok(G.mobs.length >= 5, "keine Welle");
    // Rand: kein Wechsel
    G.P.x = 1; G.P.y = 5 * TS + 8;
    step(G, 1, { ...idle, x: -1 });
    assert.equal(G.P.sx, 4);
    assert.ok(G.P.x >= 3);
  });

  it("Monster laufen zum Brunnen und beschädigen ihn, Verlust bei null", () => {
    const G = startGame(createGame("raid2"));
    enterScreen(G, "over", 4, 5, 2 * TS + 8, 9 * TS + 8, false);
    G.P.quests = { h1: { state: "done", progress: 6 }, r1: { state: "active", progress: 0 } };
    startRaid(G, { waves: 3, questId: "r1" });
    G.raid.t = 0; step(G, 1);
    const m = G.mobs[0];
    const d0 = Math.hypot(m.x - WELL.x, m.y - WELL.y);
    step(G, 120);
    const d1 = Math.hypot(m.x - WELL.x, m.y - WELL.y);
    assert.ok(d1 < d0, "Monster nähert sich dem Brunnen nicht");
    G.raid.wellHp = 1;
    for (const mm of G.mobs) { mm.x = WELL.x; mm.y = WELL.y; mm.spawnDelay = 0; }
    step(G, 30);
    assert.equal(G.raid.state, "done"); assert.equal(G.raid.won, false);
    assert.equal(G.P.quests.r1, undefined, "verlorene Aufgabe wieder annehmbar");
    assert.equal(talkTo(G, "bram").mode, "offer");
  });

  it("alle Wellen überstanden: gewonnen, Aufgabe erfüllt, Wiederholung wird schwerer", () => {
    const G = startGame(createGame("raid3"));
    enterScreen(G, "over", 4, 5, 7 * TS + 8, 8 * TS + 8, false);
    G.P.quests = { h1: { state: "done", progress: 6 }, r1: { state: "done", progress: 1 } };
    assert.ok(acceptQuest(G.P, "r2"));
    assert.equal(raidLevel(G.P, "r2"), 1);
    startRaid(G, { waves: 2, questId: "r2", level: raidLevel(G.P, "r2") });
    for (let w = 0; w < 2; w++) {
      G.raid.t = 0; step(G, 1);
      assert.equal(G.raid.wave, w + 1);
      for (const m of [...G.mobs]) killMob(G, m);
      step(G, 1);
    }
    assert.equal(G.raid.state, "done"); assert.equal(G.raid.won, true);
    assert.ok(isComplete(G.P, "r2"));
    const gold = G.P.gold;
    const got = completeQuest(G, "r2");
    assert.ok(got.gold >= 100 && G.P.gold === gold + got.gold);
    assert.equal(G.P.quests.r2, undefined, "wiederholbare Aufgabe bleibt frei");
    assert.equal(raidLevel(G.P, "r2"), 2);
    assert.ok(canOffer(G.P, "r2"), "Wachdienst nicht wieder annehmbar");
  });

  it("Bildschirmwechsel bricht den Überfall ab, Anführer hat eigene Beute", () => {
    const G = startGame(createGame("raid4"));
    enterScreen(G, "over", 4, 5, 7 * TS + 8, 8 * TS + 8, false);
    startRaid(G, { waves: 1 });
    G.raid.t = 0; step(G, 1);
    assert.ok(G.mobs.some(m => m.mini && m.name.includes("Anführer")));
    enterScreen(G, "over", 3, 5, 7 * TS + 8, 5 * TS + 8, false);
    assert.equal(G.raid, null);
    assert.ok(G.mobs.every(m => !m.raid));
  });
});
