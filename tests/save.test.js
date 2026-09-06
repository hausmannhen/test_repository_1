import { describe, it, beforeEach } from "node:test";
import assert from "node:assert/strict";

/* localStorage-Attrappe für Node */
const mem = new Map();
globalThis.localStorage = { getItem: k => (mem.has(k) ? mem.get(k) : null), setItem: (k, v) => mem.set(k, String(v)), removeItem: k => mem.delete(k) };

const { listSaves, listAccounts, makeSlot, writeSlot, deleteSlot, renameSlot, saveGame, loadSlot, exportSlot, importSave, migrate, describeSave, deleteAllSaves, ACCOUNT_IDS, ACCOUNT_COUNT, fileNameFor } = await import("../src/game/save.js");
const { createGame, startGame } = await import("../src/game/engine.js");
const { newPlayer } = await import("../src/game/player.js");

describe("Spielstände", () => {
  beforeEach(() => { mem.clear(); });

  it("fünf feste Konten: anlegen, laden, umbenennen, zurücksetzen", () => {
    assert.equal(listAccounts().length, ACCOUNT_COUNT);
    assert.ok(listAccounts().every(a => a.slot === null));
    const a = makeSlot("Hendrik", "seed-a", newPlayer("seed-a"), ACCOUNT_IDS[0]);
    const b = makeSlot("Kollege", "seed-b", newPlayer("seed-b"), ACCOUNT_IDS[2]);
    assert.ok(writeSlot(a)); assert.ok(writeSlot(b));
    assert.equal(listSaves().length, 2);
    const acc = listAccounts();
    assert.equal(acc[0].slot.name, "Hendrik"); assert.equal(acc[1].slot, null); assert.equal(acc[2].slot.name, "Kollege");
    assert.ok(renameSlot(a.id, "Hendrik H."));
    assert.equal(loadSlot(a.id).name, "Hendrik H.");
    deleteSlot(a.id);
    assert.equal(listAccounts()[0].slot, null);
    assert.equal(listSaves()[0].name, "Kollege");
    // fremde IDs werden nicht angenommen
    assert.equal(writeSlot(makeSlot("x", "x", newPlayer("x"))), false);
  });

  it("Spiel schreibt in seinen Slot, nicht in fremde", () => {
    const a = makeSlot("A", "seed-a", newPlayer("seed-a"), ACCOUNT_IDS[0]); writeSlot(a);
    const b = makeSlot("B", "seed-b", newPlayer("seed-b"), ACCOUNT_IDS[1]); writeSlot(b);
    const G = startGame(createGame(a.seed, a.P, { id: a.id, name: a.name }));
    G.P.gold = 999;
    assert.ok(saveGame(G));
    assert.equal(loadSlot(a.id).P.gold, 999);
    assert.equal(loadSlot(b.id).P.gold, 30);
    assert.equal(loadSlot(a.id).seed, "seed-a");
  });

  it("Export und Import landen im gewählten Konto mit gleichem Inhalt", () => {
    const a = makeSlot("Hendrik", "seed-a", newPlayer("seed-a"), ACCOUNT_IDS[0]);
    a.P.level = 7; a.P.gold = 123;
    const text = exportSlot(a);
    assert.ok(text.includes("eldenfeld-save"));
    const imported = importSave(text, ACCOUNT_IDS[4]);
    assert.equal(imported.id, ACCOUNT_IDS[4]);
    assert.ok(writeSlot(imported));
    assert.equal(listAccounts()[4].slot.P.level, 7);
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
    assert.equal(saves[0].name, "Spieler 1");
    assert.equal(saves[0].id, ACCOUNT_IDS[0]);
    assert.equal(saves[0].saveVersion, 2);
    assert.equal(mem.has("eldenfeld_save_v1"), false);
  });

  it("Migration und Beschreibung", () => {
    const old = { seed: "alt", P: { level: 3, xp: 1, gold: 5, hp: 10, inventory: [], equip: {}, area: "over", sx: 2, sy: 3, x: 0, y: 0, dir: "up" } };
    const mig = migrate(old);
    assert.equal(mig.saveVersion, 2);
    assert.deepEqual(mig.P.visits, {});
    assert.equal(migrate(null), null);
    assert.equal(migrate({ foo: 1 }), null);
    const d = describeSave(mig);
    assert.equal(d.level, 3); assert.equal(d.loc, "Elmshain");
    mig.P.area = "d1";
    assert.equal(describeSave(mig).loc, "Steinhalle");
  });

  it("alle Konten belegen und leeren", () => {
    for (const id of ACCOUNT_IDS) assert.ok(writeSlot(makeSlot("S" + id, "s" + id, newPlayer("s" + id), id)));
    assert.ok(listAccounts().every(a => a.slot));
    deleteAllSaves();
    assert.equal(listSaves().length, 0);
  });
});
