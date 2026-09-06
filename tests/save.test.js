import { describe, it, beforeEach } from "node:test";
import assert from "node:assert/strict";

/* localStorage-Attrappe für Node */
const mem = new Map();
globalThis.localStorage = { getItem: k => (mem.has(k) ? mem.get(k) : null), setItem: (k, v) => mem.set(k, String(v)), removeItem: k => mem.delete(k) };

const { listSaves, makeSlot, writeSlot, deleteSlot, saveGame, loadSlot, exportSlot, importSave, migrate, describeSave, deleteAllSaves, MAX_SLOTS, fileNameFor } = await import("../src/game/save.js");
const { createGame, startGame } = await import("../src/game/engine.js");
const { newPlayer } = await import("../src/game/player.js");

describe("Spielstände", () => {
  beforeEach(() => { mem.clear(); });

  it("mehrere Slots anlegen, laden, löschen", () => {
    const a = makeSlot("Hendrik", "seed-a", newPlayer("seed-a"));
    const b = makeSlot("Kollege", "seed-b", newPlayer("seed-b"));
    assert.ok(writeSlot(a)); assert.ok(writeSlot(b));
    assert.equal(listSaves().length, 2);
    assert.equal(loadSlot(a.id).name, "Hendrik");
    deleteSlot(a.id);
    assert.equal(listSaves().length, 1);
    assert.equal(listSaves()[0].name, "Kollege");
  });

  it("Spiel schreibt in seinen Slot, nicht in fremde", () => {
    const a = makeSlot("A", "seed-a", newPlayer("seed-a")); writeSlot(a);
    const b = makeSlot("B", "seed-b", newPlayer("seed-b")); writeSlot(b);
    const G = startGame(createGame(a.seed, a.P, { id: a.id, name: a.name }));
    G.P.gold = 999;
    assert.ok(saveGame(G));
    assert.equal(loadSlot(a.id).P.gold, 999);
    assert.equal(loadSlot(b.id).P.gold, 30);
    assert.equal(loadSlot(a.id).seed, "seed-a");
  });

  it("Export und Import ergeben einen neuen Slot mit gleichem Inhalt", () => {
    const a = makeSlot("Hendrik", "seed-a", newPlayer("seed-a"));
    a.P.level = 7; a.P.gold = 123;
    const text = exportSlot(a);
    assert.ok(text.includes("eldenfeld-save"));
    const imported = importSave(text);
    assert.notEqual(imported.id, a.id);
    assert.equal(imported.P.level, 7);
    assert.equal(imported.P.gold, 123);
    assert.equal(imported.seed, "seed-a");
    assert.equal(imported.name, "Hendrik");
    assert.match(fileNameFor(a), /^eldenfeld-hendrik-stufe-7\.json$/);
  });

  it("Import lehnt Müll ab", () => {
    assert.throws(() => importSave("kein json"), /gültige/);
    assert.throws(() => importSave('{"foo":1}'), /Eldenfeld/);
    assert.throws(() => importSave('{"P":{"level":"x"}}'), /Eldenfeld/);
  });

  it("alter Einzelspielstand wird als Slot übernommen", () => {
    mem.set("eldenfeld_save_v1", JSON.stringify({ seed: "alt", P: newPlayer("alt") }));
    const saves = listSaves();
    assert.equal(saves.length, 1);
    assert.equal(saves[0].name, "Spielstand 1");
    assert.equal(saves[0].saveVersion, 1);
    assert.equal(mem.has("eldenfeld_save_v1"), false);
  });

  it("Migration und Beschreibung", () => {
    const old = { seed: "alt", P: { level: 3, xp: 1, gold: 5, hp: 10, inventory: [], equip: {}, area: "over", sx: 2, sy: 3, x: 0, y: 0, dir: "up" } };
    const mig = migrate(old);
    assert.equal(mig.saveVersion, 1);
    assert.deepEqual(mig.P.visits, {});
    assert.equal(migrate(null), null);
    assert.equal(migrate({ foo: 1 }), null);
    const d = describeSave(mig);
    assert.equal(d.level, 3); assert.equal(d.loc, "Elmshain");
    mig.P.area = "d1";
    assert.equal(describeSave(mig).loc, "Steinhalle");
  });

  it("Obergrenze für Slots", () => {
    for (let i = 0; i < MAX_SLOTS; i++) assert.ok(writeSlot(makeSlot("S" + i, "s" + i, newPlayer("s" + i))));
    assert.equal(writeSlot(makeSlot("zuviel", "z", newPlayer("z"))), false);
    deleteAllSaves();
    assert.equal(listSaves().length, 0);
  });
});
