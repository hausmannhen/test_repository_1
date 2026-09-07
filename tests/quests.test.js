import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { TS, VILLAGES, WORLD_W, WORLD_H, T, idx, DUNGEONS } from "../src/game/constants.js";
import { genOverworldScreen, spawnMobsFor } from "../src/game/world.js";
import { createGame, startGame, enterScreen, update, killMob } from "../src/game/engine.js";
import { makeMob } from "../src/game/monsters.js";
import { QUESTS, QUEST_ORDER, MAIN_QUESTS, NPCS, acceptQuest, acceptWithHistory, canOffer, isComplete, isDone, completeQuest, talkTo, objectiveText, trackerText, storyProgress } from "../src/game/quests.js";
import { MINIBOSSES, MINIBOSS_BY_SCREEN } from "../src/data/minibosses.js";
import { regionAt } from "../src/game/constants.js";

const idle = { x: 0, y: 0, attack: false, cast: false };

describe("Welt 10×10", () => {
  it("Dörfer, Dungeons und Reviere liegen in der Welt, auf getrennten Bildschirmen", () => {
    const used = new Set();
    for (const k of [...Object.keys(VILLAGES), ...DUNGEONS.map(d => d.screen), ...MINIBOSSES.map(m => m.screen)]) {
      const [x, y] = k.split(",").map(Number);
      assert.ok(x >= 0 && y >= 0 && x < WORLD_W && y < WORLD_H, k);
      assert.ok(!used.has(k), "doppelt belegt: " + k);
      used.add(k);
    }
    for (const m of MINIBOSSES) { const [x, y] = m.screen.split(",").map(Number); assert.equal(regionAt(x, y), m.region, m.id); }
  });
  it("jeder NPC steht in seinem Dorf auf einem NPC-Tile", () => {
    for (const n of Object.values(NPCS)) {
      if (n.house) continue;
      const [x, y] = n.village.split(",").map(Number);
      const s = genOverworldScreen("seed", x, y);
      assert.ok(s.village, n.id + " nicht im Dorf");
      assert.equal(s.tiles[idx(n.x, n.y)], T.NPC);
      assert.equal(s.doors[`${n.x},${n.y}`], "npc:" + n.id);
    }
  });
});

describe("Zwischenbosse", () => {
  it("spawnen in ihrem Revier, nach dem Sieg nicht mehr", () => {
    for (const mb of MINIBOSSES) {
      const [x, y] = mb.screen.split(",").map(Number);
      const s = genOverworldScreen("seed", x, y);
      assert.equal(s.miniboss, MINIBOSS_BY_SCREEN[mb.screen]);
      const mobs = spawnMobsFor(s, "seed", 1, {});
      const boss = mobs.filter(m => m.mini === mb.id);
      assert.equal(boss.length, 1, mb.id);
      assert.equal(boss[0].boss, false);
      assert.ok(boss[0].maxHp > makeMob(mb.base, mb.level, 0, 0).maxHp * 3);
      assert.equal(spawnMobsFor(s, "seed", 2, { ["mb:" + mb.id]: true }).filter(m => m.mini).length, 0);
    }
  });
  it("Sieg markiert das Revier, hinterlässt Beute und keinen Herzcontainer", () => {
    const G = startGame(createGame("mini"));
    const mb = MINIBOSSES[0];
    const [x, y] = mb.screen.split(",").map(Number);
    enterScreen(G, "over", x, y, 7 * TS + 8, 8 * TS + 8, false);
    const boss = G.mobs.find(m => m.mini === mb.id);
    assert.ok(boss);
    const hearts = G.P.hearts;
    killMob(G, boss);
    assert.equal(G.P.cleared["mb:" + mb.id], true);
    assert.equal(G.P.hearts, hearts);
    assert.ok(G.drops.some(d => d.type === "item" && ["selten", "episch", "legendaer"].includes(d.item.rarity)));
    enterScreen(G, "over", x, y, 7 * TS + 8, 8 * TS + 8, false);
    assert.equal(G.mobs.filter(m => m.mini).length, 0);
  });
});

describe("Aufgaben", () => {
  it("Hauptgeschichte hängt zusammen, jeder Geber existiert", () => {
    for (const id of QUEST_ORDER) {
      const q = QUESTS[id];
      assert.ok(NPCS[q.giver] && NPCS[q.turnIn], id);
      if (q.requires) assert.ok(QUESTS[q.requires], id + " braucht " + q.requires);
      if (q.next) { assert.ok(QUESTS[q.next], id); assert.equal(QUESTS[q.next].requires, id); }
      assert.ok(q.intro.length > 20 && q.done.length > 10, id);
    }
    assert.equal(MAIN_QUESTS.length, 10);
    for (let i = 1; i < MAIN_QUESTS.length; i++) assert.equal(QUESTS[MAIN_QUESTS[i]].requires, MAIN_QUESTS[i - 1]);
  });
  it("Annehmen, Fortschritt durch Kills, Abschluss mit Belohnung, Folgeaufgabe", () => {
    const G = startGame(createGame("quest"));
    const P = G.P;
    assert.equal(talkTo(G, "bram").mode, "offer");
    assert.equal(talkTo(G, "bram").quest, "h1");
    assert.ok(acceptQuest(P, "h1"));
    assert.equal(canOffer(P, "h2"), false);
    assert.equal(talkTo(G, "bram").mode, "progress");
    assert.match(trackerText(P), /Grauwolf besiegen: 0 \/ 6/);
    enterScreen(G, "over", 3, 5, 7 * TS + 8, 5 * TS + 8, false);
    for (let i = 0; i < 6; i++) { const m = makeMob("wolf", 1, 100, 100); G.mobs.push(m); killMob(G, m); }
    assert.ok(isComplete(P, "h1"));
    assert.equal(talkTo(G, "bram").mode, "complete");
    const gold = P.gold, xp = P.xp + P.level * 1000;
    const got = completeQuest(G, "h1");
    assert.equal(got.gold, 40);
    assert.equal(P.gold, gold + 40);
    update(G, 1 / 60, idle);
    assert.ok(P.xp + P.level * 1000 > xp, "XP nicht gutgeschrieben");
    assert.ok(isDone(P, "h1"));
    assert.equal(talkTo(G, "bram").quest, "h2");
    assert.equal(talkTo(G, "bram").mode, "offer");
  });
  it("Zwischenboss- und Bossaufgaben zählen, auch rückwirkend", () => {
    const G = startGame(createGame("quest2"));
    const P = G.P;
    P.quests = { h1: { state: "done", progress: 6 } };
    assert.ok(acceptQuest(P, "h2"));
    const mb = MINIBOSSES[0];
    const m = makeMob(mb.base, mb.level, 100, 100, { ...mb, mini: mb.id });
    G.mobs.push(m); killMob(G, m);
    assert.ok(isComplete(P, "h2"));
    const got = completeQuest(G, "h2");
    assert.ok(got.item && ["selten", "episch", "legendaer"].includes(got.item.rarity));
    // Boss schon vorher besiegt: Aufgabe sofort erfüllt
    P.cleared[0] = true;
    P.quests.h3 = { state: "done", progress: 1 };
    assert.ok(acceptWithHistory(P, "h4"));
    assert.ok(isComplete(P, "h4"));
    assert.match(objectiveText(P, "h4"), /Eichenkönig/);
    assert.equal(storyProgress(P).done, 3);
  });
  it("Anrempeln eines Bewohners öffnet sein Gespräch", () => {
    const G = startGame(createGame("talk"));
    let opened = null;
    G.openPanel = (t) => { opened = t; };
    const P = G.P;
    const n = NPCS.bram;
    P.x = n.x * TS + 8; P.y = (n.y + 1) * TS + 8; P.dir = "up"; G.trigCd = 0;
    update(G, 1 / 60, { ...idle, y: -1 });
    assert.equal(opened, "npc:bram");
  });
});
