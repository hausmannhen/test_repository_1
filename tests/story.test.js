import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { TS, DUNGEONS } from "../src/game/constants.js";
import { createGame, startGame, enterScreen, update, killMob } from "../src/game/engine.js";
import { genDungeon } from "../src/game/world.js";
import { gateOpen, makeChoice, isDone, isActive, doneText, canOffer, talkTo, CHOICES, GATES } from "../src/game/quests.js";
import { migrate } from "../src/game/save.js";
import { newPlayer } from "../src/game/player.js";
import { STORY } from "../src/data/story.js";
import { EPILOGUES, epilogueFor } from "../src/data/epilogues.js";

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

describe("Letzte Worte der Endbosse", () => {
  it("Texte: jeder Boss, Vargor beide Enden, Dank und Siegel kommen vor", () => {
    for (const id of [0, 1]) { const e = epilogueFor(id); assert.ok(e.title && e.words.length >= 2 && e.after.length > 80); assert.match(e.words.join(" "), /Dank|danke/i); assert.match(e.after, /Siegel/); }
    assert.notEqual(epilogueFor(2, "brechen").title, epilogueFor(2, "flicken").title);
    assert.equal(epilogueFor(2, undefined), EPILOGUES[2].brechen);
    assert.equal(epilogueFor(7), null);
  });
  it("Fenster öffnet erst, wenn der Raum leer ist, und nur einmal", () => {
    const G = startGame(createGame("epilog"));
    const opened = []; G.openPanel = (t) => opened.push(t);
    const d = genDungeon(G.seed, DUNGEONS[0]);
    const bossKey = Object.keys(d.rooms).find(k => d.rooms[k].dungeonRoom.type === "boss");
    const [bx, by] = bossKey.split(",").map(Number);
    enterScreen(G, "d0", bx, by, 7 * TS + 8, 8 * TS + 8, false);
    const boss = G.mobs.find(m => m.boss);
    for (const m of G.mobs) m.spawnDelay = 0;
    killMob(G, boss);
    assert.equal(G.epilog, 0);
    update(G, 1 / 60, idle);
    assert.equal(opened.length, 0, "Fenster trotz lebender Diener");
    for (const m of [...G.mobs]) if (!m.dead) killMob(G, m);
    update(G, 1 / 60, idle);
    assert.deepEqual(opened, ["epilog:0"]);
    assert.equal(G.P.epilogs[0], true);
    update(G, 1 / 60, idle);
    assert.equal(opened.length, 1, "Fenster erneut");
    // Zweiter Besuch: kein Boss mehr, kein Fenster
    enterScreen(G, "d0", bx, by, 7 * TS + 8, 8 * TS + 8, false);
    assert.equal(G.mobs.some(m => m.boss), false);
  });
});

describe("Tod im Dungeon", () => {
  it("Wiederbelebung im Eingangsraum des Dungeons, draußen im letzten Dorf", async () => {
    const { respawn } = await import("../src/game/engine.js");
    const { DUNGEON_ENTRY } = await import("../src/game/world.js");
    const G = startGame(createGame("tod"));
    const d = genDungeon(G.seed, DUNGEONS[0]);
    const bossKey = Object.keys(d.rooms).find(k => d.rooms[k].dungeonRoom.type === "boss");
    const [bx, by] = bossKey.split(",").map(Number);
    enterScreen(G, "d0", bx, by, 7 * TS + 8, 8 * TS + 8, false);
    G.P.hp = 0; G.dead = true; G.P.gold = 100;
    respawn(G);
    assert.equal(G.dead, false);
    assert.equal(G.P.area, "d0"); assert.equal(G.P.sx, DUNGEON_ENTRY.x); assert.equal(G.P.sy, DUNGEON_ENTRY.y);
    assert.equal(G.screen.dungeonRoom.type, "entry");
    assert.equal(G.P.gold, 90);
    enterScreen(G, "over", 4, 5, 7 * TS + 8, 8 * TS + 8, false);
    G.dead = true; respawn(G);
    assert.equal(G.P.area, "over"); assert.equal(`${G.P.sx},${G.P.sy}`, "4,5");
  });
});

describe("Sog zum Ausgang", () => {
  it("bringt den Spieler nach dem Bosssieg in den Eingangsraum, draußen passiert nichts", async () => {
    const { beamToExit } = await import("../src/game/engine.js");
    const { DUNGEON_ENTRY } = await import("../src/game/world.js");
    const G = startGame(createGame("sog"));
    assert.equal(beamToExit(G), false);
    const d = genDungeon(G.seed, DUNGEONS[1]);
    const bossKey = Object.keys(d.rooms).find(k => d.rooms[k].dungeonRoom.type === "boss");
    const [bx, by] = bossKey.split(",").map(Number);
    enterScreen(G, "d1", bx, by, 7 * TS + 8, 8 * TS + 8, false);
    assert.equal(beamToExit(G), true);
    assert.equal(G.P.area, "d1"); assert.equal(G.P.sx, DUNGEON_ENTRY.x); assert.equal(G.P.sy, DUNGEON_ENTRY.y);
    assert.equal(G.screen.dungeonRoom.type, "entry");
    assert.match(G.banner.text, /Sog/);
  });
  it("setzt erst nach 3 Sekunden ein und nimmt die Beute mit", async () => {
    const { startBeam, BEAM_DELAY } = await import("../src/game/engine.js");
    assert.equal(BEAM_DELAY, 3);
    const G = startGame(createGame("sog2"));
    assert.equal(startBeam(G), false, "draußen kein Sog");
    const d = genDungeon(G.seed, DUNGEONS[1]);
    const bossKey = Object.keys(d.rooms).find(k => d.rooms[k].dungeonRoom.type === "boss");
    const [bx, by] = bossKey.split(",").map(Number);
    enterScreen(G, "d1", bx, by, 7 * TS + 8, 8 * TS + 8, false);
    G.mobs = []; G.arenaLock = false;
    const P = G.P, gold0 = P.gold, inv0 = P.inventory.length;
    G.drops.push({ type: "gold", amount: 50, x: P.x + 120, y: P.y, vx: 0, vy: 0, t: 1 });
    G.drops.push({ type: "item", item: { id: "x", name: "Testklinge", kind: "gear", slot: "waffe", rarity: "gewoehnlich", base: "schwert", stats: { atk: 3 }, upg: 0 }, x: P.x - 120, y: P.y, vx: 0, vy: 0, t: 1 });
    assert.equal(startBeam(G), true);
    assert.equal(startBeam(G), false, "läuft schon");
    for (let i = 0; i < 70; i++) update(G, 1 / 60, idle);   // gut 1 s
    assert.equal(G.screen.dungeonRoom.type, "boss", "zu früh gesogen");
    assert.match(G.msg.text, /Sog erwacht in 2/);
    for (let i = 0; i < 115; i++) update(G, 1 / 60, idle);   // > 3 s insgesamt
    assert.equal(G.screen.dungeonRoom.type, "entry");
    assert.equal(G.beamT, null);
    assert.equal(P.gold, gold0 + 50, "Gold nicht mitgenommen");
    assert.equal(P.inventory.length, inv0 + 1, "Ausrüstung nicht mitgenommen");
  });
});

describe("Musik im Bossraum", () => {
  it("wählt die Boss-Stimmung nur bei lebendem Wächter, sie ist schneller und hat Schlagwerk", async () => {
    const { MOODS, moodFor } = await import("../src/game/audio.js");
    const { DUNGEON_ENTRY } = await import("../src/game/world.js");
    assert.ok(MOODS.boss.tempo < MOODS.dungeon.tempo / 3 && MOODS.boss.beat);
    const G = startGame(createGame("bossmusik"));
    assert.equal(moodFor(G), G.screen.region);
    const d = genDungeon(G.seed, DUNGEONS[0]);
    const bossKey = Object.keys(d.rooms).find(k => d.rooms[k].dungeonRoom.type === "boss");
    const [bx, by] = bossKey.split(",").map(Number);
    enterScreen(G, "d0", DUNGEON_ENTRY.x, DUNGEON_ENTRY.y, 7 * TS + 8, 8 * TS + 8, false);
    assert.equal(moodFor(G), "dungeon");
    enterScreen(G, "d0", bx, by, 7 * TS + 8, 8 * TS + 8, false);
    assert.equal(moodFor(G), "boss");
    const boss = G.mobs.find(m => m.boss);
    for (const m of G.mobs) m.spawnDelay = 0;
    killMob(G, boss);
    assert.equal(moodFor(G), "dungeon");
  });
});
