/* Durchspieltest: die Hauptgeschichte von Kapitel 1 bis 10 mit den echten Spielfunktionen, beide Enden. */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { TS, WORLD_W, WORLD_H, VILLAGES, DUNGEONS, START_VILLAGE, regionAt } from "../src/game/constants.js";
import { genDungeon } from "../src/game/world.js";
import { createGame, startGame, enterScreen, update, killMob } from "../src/game/engine.js";
import { makeMob } from "../src/game/monsters.js";
import { QUESTS, MAIN_QUESTS, NPCS, talkTo, acceptWithHistory, completeQuest, isComplete, gateOpen, makeChoice, doneText, storyProgress } from "../src/game/quests.js";
import { MINIBOSS_BY_ID } from "../src/data/minibosses.js";

const idle = { x: 0, y: 0, attack: false, cast: false };

/* Erreichbarkeit: Breitensuche über Bildschirme, nur durch offene Regionen */
function reachable(P, targetKey) {
  const [sx, sy] = START_VILLAGE.split(",").map(Number);
  const seen = new Set([START_VILLAGE]);
  const q = [[sx, sy]];
  while (q.length) {
    const [x, y] = q.shift();
    if (`${x},${y}` === targetKey) return true;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = x + dx, ny = y + dy, k = `${nx},${ny}`;
      if (nx < 0 || ny < 0 || nx >= WORLD_W || ny >= WORLD_H || seen.has(k)) continue;
      if (!gateOpen(P, regionAt(nx, ny))) continue;
      seen.add(k); q.push([nx, ny]);
    }
  }
  return false;
}
function villageOf(npcId) { return NPCS[npcId].village; }

function playStory(choice) {
  const G = startGame(createGame("story-" + choice));
  const P = G.P;
  P.level = 30;   // Balance ist nicht Gegenstand, nur der Ablauf
  const log = [];
  for (const id of MAIN_QUESTS) {
    const q = QUESTS[id];
    // 1. Zum Geber gehen: erreichbar?
    const giverScreen = villageOf(q.giver);
    assert.ok(reachable(P, giverScreen), `${id}: ${NPCS[q.giver].name} in ${VILLAGES[giverScreen].name} nicht erreichbar`);
    const [gx, gy] = giverScreen.split(",").map(Number);
    enterScreen(G, "over", gx, gy, 7 * TS + 8, 8 * TS + 8, false);
    // 2. Aufgabe wird angeboten und angenommen
    const talk = talkTo(G, q.giver);
    assert.equal(talk.mode, "offer", `${id}: ${NPCS[q.giver].name} bietet nichts an (${talk.mode}, ${talk.quest})`);
    assert.equal(talk.quest, id, `${id}: ${NPCS[q.giver].name} bietet ${talk.quest} statt ${id}`);
    assert.ok(acceptWithHistory(P, id));
    // 3. Ziel erfüllen
    const o = q.objective;
    if (o.type === "kill") {
      for (let i = 0; i < o.count; i++) { const m = makeMob(o.mob, 1, 100, 100); G.mobs.push(m); killMob(G, m); }
    } else if (o.type === "mini") {
      const mb = MINIBOSS_BY_ID[o.id];
      assert.ok(reachable(P, mb.screen), `${id}: Revier von ${mb.name} (${mb.screen}) nicht erreichbar`);
      const [x, y] = mb.screen.split(",").map(Number);
      enterScreen(G, "over", x, y, 7 * TS + 8, 8 * TS + 8, false);
      assert.ok(G.arenaLock, `${id}: Revier sperrt nicht`);
      const boss = G.mobs.find(m => m.mini === o.id);
      assert.ok(boss, `${id}: ${mb.name} nicht im Revier`);
      for (const m of [...G.mobs]) killMob(G, m);
      update(G, 1 / 60, idle);
      assert.equal(G.arenaLock, false);
    } else if (o.type === "boss") {
      const d = DUNGEONS[o.id];
      assert.ok(reachable(P, d.screen), `${id}: ${d.name} (${d.screen}) nicht erreichbar`);
      const dg = genDungeon(G.seed, d);
      const key = Object.keys(dg.rooms).find(k => dg.rooms[k].dungeonRoom.type === "boss");
      const [x, y] = key.split(",").map(Number);
      enterScreen(G, "d" + d.id, x, y, 7 * TS + 8, 8 * TS + 8, false);
      const boss = G.mobs.find(m => m.boss);
      assert.ok(boss, `${id}: kein Boss in ${d.name}`);
      if (o.id === 2) assert.equal(boss.weak, choice === "flicken", "Vargor-Fassung passt nicht zur Wahl");
      for (const m of [...G.mobs]) killMob(G, m);
      update(G, 1 / 60, idle);
      assert.equal(P.cleared[o.id], true);
    } else if (o.type === "choice") {
      assert.ok(makeChoice(G, choice), `${id}: Wahl nicht möglich`);
    }
    assert.ok(isComplete(P, id), `${id}: nicht erfüllt`);
    // 4. Abgeben
    const turnScreen = villageOf(q.turnIn);
    assert.ok(reachable(P, turnScreen), `${id}: Abgabe bei ${NPCS[q.turnIn].name} nicht erreichbar`);
    const [tx, ty] = turnScreen.split(",").map(Number);
    enterScreen(G, "over", tx, ty, 7 * TS + 8, 8 * TS + 8, false);
    assert.equal(talkTo(G, q.turnIn).mode, "complete", `${id}: Abgabe nicht möglich`);
    const got = completeQuest(G, id);
    assert.ok(got, `${id}: keine Belohnung`);
    update(G, 1 / 60, idle);
    log.push(`${id} ${q.title}: ok, ${got.gold} Gold${got.item ? ", " + got.item.rarity : ""}`);
  }
  assert.equal(storyProgress(P).done, MAIN_QUESTS.length);
  assert.ok(Object.values({ berg: 1, wueste: 1, sumpf: 1, eis: 1, vulkan: 1 }).every((_, i) => gateOpen(P, ["berg", "wueste", "sumpf", "eis", "vulkan"][i])), "nicht alle Barrieren offen");
  return { P, log };
}

describe("Durchspielen", () => {
  it("Ende A: das Siegel brechen", () => {
    const { P } = playStory("brechen");
    assert.equal(P.choice, "brechen");
    assert.match(doneText(P, "h10"), /für immer/);
    assert.equal(P.hearts, 3);
  });
  it("Ende B: das Siegel flicken", () => {
    const { P } = playStory("flicken");
    assert.equal(P.choice, "flicken");
    assert.match(doneText(P, "h10"), /halb/);
    assert.equal(P.hearts, 3);
  });
  it("vor Kapitel 4 sind Höhen, Wüste, Moor, Frost und Glut unerreichbar", () => {
    const G = startGame(createGame("story-gates"));
    for (const k of ["4,2", "8,4", "6,8", "2,1", "6,2", "8,0", "9,5", "8,7", "3,0", "7,1"]) assert.equal(reachable(G.P, k), false, k + " zu früh erreichbar");
    for (const k of ["1,6", "0,8", "3,4", "1,8"]) assert.ok(reachable(G.P, k), k + " in Akt 1 nicht erreichbar");
  });
});
