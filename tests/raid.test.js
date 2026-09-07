import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { TS, VW, VH } from "../src/game/constants.js";
import { createGame, startGame, enterScreen, update, startRaid, raidActive, killMob } from "../src/game/engine.js";
import { WELL, PAUSE } from "../src/game/raid.js";
import { acceptQuest, isComplete, completeQuest, talkTo, raidLevel, canOffer, RAID_WAIT, QUESTS } from "../src/game/quests.js";
// Bram hat sonst nichts anzubieten: alle anderen Aufgaben von ihm gelten als erledigt
const onlyRaid = (P, keep) => { for (const id of Object.keys(QUESTS)) if (QUESTS[id].giver === "bram" && id !== keep && !P.quests[id]) P.quests[id] = { state: "done", progress: 1 }; };

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
    assert.equal(G.P.quests.r1, undefined, "verlorene Aufgabe bleibt nicht aktiv");
    // Nach der Niederlage ruht das Dorf: erst 15 Feinde draußen, dann wieder annehmbar
    assert.equal(canOffer(G.P, "r1"), false, "sofort wieder annehmbar");
    onlyRaid(G.P, "r1");
    const t = talkTo(G, "bram");
    assert.equal(t.mode, "wait"); assert.equal(t.quest, "r1"); assert.equal(t.left, RAID_WAIT.lost);
    G.P.kills += RAID_WAIT.lost;
    assert.equal(canOffer(G.P, "r1"), true);
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
    assert.equal(canOffer(G.P, "r2"), false, "Wachdienst sofort wieder annehmbar");
    onlyRaid(G.P, "r2");
    assert.equal(talkTo(G, "bram").mode, "wait");
    G.P.kills += RAID_WAIT.won;
    assert.ok(canOffer(G.P, "r2"), "Wachdienst nach 30 Kills nicht annehmbar");
    assert.equal(talkTo(G, "bram").mode, "offer");
  });

  it("Bildschirmwechsel bricht den Überfall ab, Anführer hat eigene Beute", () => {
    const G = startGame(createGame("raid4"));
    enterScreen(G, "over", 4, 5, 7 * TS + 8, 8 * TS + 8, false);
    startRaid(G, { waves: 1 });
    G.raid.t = 0; step(G, 1);
    assert.ok(G.mobs.some(m => m.leader && m.name.includes("Anführer")));
    enterScreen(G, "over", 3, 5, 7 * TS + 8, 5 * TS + 8, false);
    assert.equal(G.raid, null);
    assert.ok(G.mobs.every(m => !m.raid));
  });
});

describe("Überfall, Randfälle aus der Code-Prüfung", () => {
  it("angenommener Überfall ohne Sieg ist nach dem Laden wieder annehmbar", async () => {
    const { resetStaleRaids, canOffer: co } = await import("../src/game/quests.js");
    const P = startGame(createGame("stale")).P;
    P.quests = { h1: { state: "done", progress: 6 }, r1: { state: "active", progress: 0 } };
    resetStaleRaids(P);
    assert.equal(P.quests.r1, undefined);
    assert.ok(co(P, "r1"));
    P.quests.r1 = { state: "active", progress: 1 };
    resetStaleRaids(P);
    assert.ok(P.quests.r1, "gewonnener Überfall darf nicht verfallen");
  });
  it("Anführer der Horde ist kein Zwischenboss und kein Endboss", () => {
    const G = startGame(createGame("leader"));
    enterScreen(G, "over", 4, 5, 7 * TS + 8, 8 * TS + 8, false);
    startRaid(G, { waves: 1 });
    G.raid.t = 0; step(G, 1);
    const l = G.mobs.find(m => m.leader);
    assert.ok(l); assert.equal(l.boss, false); assert.equal(l.mini, null);
    const hearts = G.P.hearts;
    killMob(G, l);
    assert.equal(G.P.hearts, hearts);
    assert.ok(!Object.keys(G.P.cleared).some(k => k.startsWith("mb:raid")), "Anführer als Revier eingetragen");
    assert.ok(G.drops.some(d => d.type === "item"), "Anführer ohne Beute");
  });
  it("Manatrank trinken nimmt den Manatrank", async () => {
    const { drinkItem } = await import("../src/game/player.js");
    const { makePotion } = await import("../src/game/items.js");
    const G = startGame(createGame("drink"));
    const P = G.P;
    P.inventory = [makePotion("heiltrank", 2), makePotion("manatrank", 2)];
    P.hp = 10; P.mana = 0;
    assert.ok(drinkItem(G, P.inventory[1]));
    assert.equal(P.inventory.find(i => i.potId === "manatrank").qty, 1);
    assert.equal(P.inventory.find(i => i.potId === "heiltrank").qty, 2);
    assert.ok(P.mana > 0);
  });
});

describe("Überfall: Stärke nach Spielerstufe", () => {
  it("Angreifer sind mindestens auf Gebietsstufe, bei hoher Spielerstufe rund 80 % davon", () => {
    const G = startGame(createGame("raid-lvl"));
    enterScreen(G, "over", 4, 5, 7 * TS + 8, 8 * TS + 8, false);
    G.P.level = 2; startRaid(G, { waves: 2, level: 1 });
    assert.equal(G.raid.mobLevel, 2);
    G.raid = null; G.P.level = 20; startRaid(G, { waves: 2, level: 2 });
    assert.equal(G.raid.mobLevel, 18);
  });
});
