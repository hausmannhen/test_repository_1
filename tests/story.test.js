import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { TS, DUNGEONS } from "../src/game/constants.js";
import { createGame, startGame, enterScreen, update, killMob } from "../src/game/engine.js";
import { genDungeon } from "../src/game/world.js";
import { gateOpen, makeChoice, isDone, isActive, doneText, canOffer, talkTo, CHOICES, GATES } from "../src/game/quests.js";
import { migrate } from "../src/game/save.js";
import { newPlayer } from "../src/game/player.js";
import { STORY } from "../src/data/story.js";

const idle = { x: 0, y: 0, attack: false, cast: false };
const doneUpTo = (n) => { const q = {}; for (let i = 1; i <= n; i++) q["h" + i] = { state: "done", progress: 1 }; return q; };

describe("Barrieren", () => {
  it("Höhen sind zu, bis der Eichenkönig fällt; Frost und Glut bis zur Wahl", () => {
    const P = newPlayer("g");
    assert.equal(gateOpen(P, "wiese"), true);
    assert.equal(gateOpen(P, "wald"), true);
    assert.equal(gateOpen(P, "berg"), false);
    P.quests = doneUpTo(4);
    assert.equal(gateOpen(P, "berg"), true);
    assert.equal(gateOpen(P, "wueste"), false);
    P.quests = doneUpTo(6);
    assert.equal(gateOpen(P, "wueste"), true); assert.equal(gateOpen(P, "sumpf"), true);
    assert.equal(gateOpen(P, "eis"), false); assert.equal(gateOpen(P, "vulkan"), false);
    P.quests = doneUpTo(7);
    assert.equal(gateOpen(P, "eis"), true); assert.equal(gateOpen(P, "vulkan"), true);
    for (const g of Object.values(GATES)) assert.ok(g.blocked.length > 10 && g.opensAfter.startsWith("h"));
  });
  it("Bildschirmwechsel in eine gesperrte Region wird verweigert", () => {
    const G = startGame(createGame("gate"));
    // Elmshain (4,5) nach Norden: (4,4) ist Wiese, (4,3) ist Wiese, (4,2) Kargstein (berg)
    enterScreen(G, "over", 4, 3, 7 * TS + 8, 1 * TS + 8, false);
    // (4,3) kann per Seed ein Hinterhalt sein: Feinde weg, Sperre auf, damit nur das Tor zählt
    G.mobs = []; G.arenaLock = false;
    G.P.y = 2; G.trigCd = 0;
    update(G, 1 / 60, { ...idle, y: -1 });
    assert.equal(G.P.sy, 3, "Barriere durchlässig");
    assert.match(G.msg.text, /Steinschlag/);
    G.P.quests = doneUpTo(4);
    G.P.y = 2;
    update(G, 1 / 60, { ...idle, y: -1 });
    assert.equal(G.P.sy, 2, "Barriere öffnet nicht");
  });
});

describe("Die Wahl", () => {
  it("Kapitel 7 wird durch die Entscheidung erfüllt und öffnet den Norden", () => {
    const G = startGame(createGame("wahl"));
    const P = G.P;
    P.quests = doneUpTo(6);
    assert.ok(canOffer(P, "h7"));
    assert.equal(talkTo(G, "weise").mode, "offer");
    assert.equal(makeChoice(G, "unsinn"), false);
    assert.ok(makeChoice(G, "flicken"));
    assert.equal(P.choice, "flicken");
    assert.ok(isActive(P, "h7"));
    assert.equal(makeChoice(G, "brechen"), false, "Wahl darf nicht umgestoßen werden");
    assert.equal(talkTo(G, "weise").mode, "complete");
    assert.match(doneText(P, "h10"), /gefesselt|unter dem Berg/);
    P.choice = "brechen";
    assert.match(doneText(P, "h10"), /für immer/);
    assert.ok(CHOICES.brechen.text.length > 20 && CHOICES.flicken.text.length > 20);
  });
  it("Vargor: entfesselt mit Phasen, gefesselt schwächer mit weniger Beute", () => {
    const spawnBoss = (choice) => {
      const G = startGame(createGame("vargor"));
      G.P.choice = choice;
      const dg = genDungeon(G.seed, DUNGEONS[2]);
      const key = Object.keys(dg.rooms).find(k => dg.rooms[k].dungeonRoom.type === "boss");
      const [x, y] = key.split(",").map(Number);
      enterScreen(G, "d2", x, y, 7 * TS + 8, 8 * TS + 8, false);
      return { G, boss: G.mobs.find(m => m.boss) };
    };
    const full = spawnBoss("brechen"), weak = spawnBoss("flicken");
    assert.ok(full.boss.maxHp > weak.boss.maxHp * 1.3);
    assert.equal(full.boss.phases, 2); assert.equal(weak.boss.phases, 0);
    assert.equal(weak.boss.weak, true);
    // Phase wechselt bei zwei Dritteln und ruft Diener
    const before = full.G.mobs.length;
    full.boss.hp = full.boss.maxHp * 0.6;
    update(full.G, 1 / 60, idle);
    assert.equal(full.boss.phase, 1);
    assert.ok(full.G.mobs.length > before, "keine Diener");
    // Beute
    for (const m of [...full.G.mobs]) killMob(full.G, m);
    const fullItems = full.G.drops.filter(d => d.type === "item").length;
    killMob(weak.G, weak.boss);
    const weakItems = weak.G.drops.filter(d => d.type === "item").length;
    assert.ok(fullItems >= 2 && weakItems === 1, `${fullItems} vs ${weakItems}`);
    assert.equal(full.G.P.hearts, 1); assert.equal(weak.G.P.hearts, 1);
  });
  it("alte Spielstände: Kapitel 7 bis 9 rücken auf 8 bis 10, Wahl gilt als gebrochen", () => {
    const P = newPlayer("m");
    P.quests = { ...doneUpTo(6), h7: { state: "done", progress: 1 }, h8: { state: "active", progress: 0 } };
    const mig = migrate({ saveVersion: 4, seed: "s", P });
    assert.equal(mig.P.choice, "brechen");
    assert.ok(isDone(mig.P, "h7") && isDone(mig.P, "h8"));
    assert.ok(isActive(mig.P, "h9"));
    assert.equal(mig.P.quests.h10, undefined);
    const fresh = migrate({ saveVersion: 4, seed: "s", P: { ...newPlayer("n"), quests: doneUpTo(3) } });
    assert.equal(fresh.P.choice, null);
    assert.equal(fresh.P.quests.h7, undefined);
  });
});

describe("Geschichte beim Start", () => {
  it("neuer Spielstand: Fenster offen, bis es gelesen ist; alter Spielstand: nur der Reiter", () => {
    const G = startGame(createGame("intro"));
    assert.equal(G.intro, true);
    assert.ok(!G.P.hints.geschichte);
    G.P.hints.geschichte = true; G.intro = false;
    assert.equal(startGame(createGame("intro", G.P)).intro, false, "zeigt das Fenster erneut");
    const old = newPlayer("alt"); old.kills = 12; delete old.hints.geschichte;
    const G2 = startGame(createGame("intro2", old));
    assert.equal(G2.intro, false);
    assert.equal(G2.P.hints.geschichte, true, "alter Spielstand nicht als gelesen markiert");
  });
  it("Text: Titel, fünf Absätze, Hinweise, weder Wahl noch Überfälle noch Ende verraten", () => {
    assert.equal(STORY.title, "Die drei Siegel");
    assert.equal(STORY.paragraphs.length, 5);
    assert.ok(STORY.tips.length >= 2);
    const all = STORY.paragraphs.join(" ");
    assert.match(all, /Vargor/);
    assert.doesNotMatch(all, /Kapitel 7|Wahl|Überf/);
    assert.doesNotMatch(all, /stirbt|flicken|brechen/);
  });
});
