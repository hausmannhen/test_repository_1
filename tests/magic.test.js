import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { TS } from "../src/game/constants.js";
import { createGame, startGame, enterScreen, update, castSpell } from "../src/game/engine.js";
import { derive, newPlayer } from "../src/game/player.js";
import { makeMob } from "../src/game/monsters.js";
import { BASES, generateItem, BASE_BY_ID } from "../src/game/items.js";
import { rngFor } from "../src/game/rng.js";
import { SKILLS, learn, canLearn, whyNot, freePoints, respec, spellRankMult } from "../src/game/skills.js";
import { SPELLS, spellCost, spellDamage, canCast, selectSpell, cycleSpell } from "../src/game/magic.js";
import { migrate, SAVE_VERSION } from "../src/game/save.js";

const idle = { x: 0, y: 0, attack: false, cast: false };
function arena(seed) {
  const G = startGame(createGame(seed));
  enterScreen(G, "over", 1, 3, 7 * TS + 8, 5 * TS + 8, false);
  G.mobs = [];
  return G;
}
function weapon(id) {
  const base = BASE_BY_ID[id];
  const it = generateItem(rngFor("w", id), 5, 0, 0, "waffe");
  Object.assign(it, { baseId: id, name: base.name, type: base.type, range: base.range, rate: base.rate, projSpeed: base.projSpeed, proj: base.proj, reach: base.reach || 0, stats: { atk: base.atk || 5 } });
  return it;
}

describe("Itemdatenbank", () => {
  it("jede Waffe hat einen Typ, Fernwaffen Reichweite und Geschoss", () => {
    for (const b of BASES) {
      assert.ok(["m", "f", "n"].includes(b.g), b.id);
      if (b.slot !== "waffe") continue;
      assert.ok(["nah", "fern", "fokus"].includes(b.type), b.id + " ohne Typ");
      if (b.type === "fern") assert.ok(b.range > 0 && b.rate > 0 && b.projSpeed > 0 && b.proj, b.id);
      else assert.ok(b.reach > 0, b.id);
    }
  });
  it("generierte Fernwaffen tragen ihre Eigenschaften, Magie-Stats skalieren", () => {
    const r = rngFor("t", "fern");
    let fern = 0, mag = 0;
    for (let i = 0; i < 400; i++) {
      const it = generateItem(r, 10, 0, 0, "waffe");
      if (it.type === "fern") { fern++; assert.ok(it.range && it.rate && it.projSpeed && it.proj, it.name); }
      if (it.stats.mag) mag++;
    }
    assert.ok(fern > 60 && mag > 40, `${fern} ${mag}`);
  });
});

describe("Skilltree", () => {
  it("ein Punkt alle drei Stufen, Voraussetzungen und Stufen greifen", () => {
    const P = newPlayer("s");
    assert.equal(freePoints(P), 0);
    assert.equal(whyNot(P, "kraft"), "Keine Punkte");
    P.level = 3;
    assert.equal(freePoints(P), 1);
    assert.equal(whyNot(P, "wirbel"), "Ab Stufe 4");
    assert.equal(whyNot(P, "blutmagie"), "Ab Stufe 8");
    P.level = 6;
    assert.equal(whyNot(P, "wirbel"), "Braucht Kraft");
    assert.ok(learn(P, "kraft"));
    assert.equal(freePoints(P), 1);
    assert.ok(learn(P, "wirbel"));
    assert.equal(whyNot(P, "wirbel"), "Maximal");
    assert.equal(whyNot(P, "zielen"), "Keine Punkte");
    assert.equal(learn(P, "zielen"), false);
    P.level = 15;
    assert.ok(learn(P, "blutmagie"));
    assert.ok(learn(P, "blutmagie"));            // Rang 2 ab Stufe 13
    assert.equal(whyNot(P, "blutmagie"), "Rang 3 ab Stufe 18");
    assert.equal(learn(P, "blutmagie"), false);
    P.level = 18;
    assert.ok(learn(P, "blutmagie"));
    assert.equal(whyNot(P, "blutmagie"), "Maximal");
    assert.ok(canLearn(P, "aderlass"));
    assert.deepEqual(P.spells, ["blutpfeil"]);
    assert.equal(spellRankMult(P, "blutpfeil"), 1.5);
    respec(P);
    assert.equal(freePoints(P), 6);
    assert.deepEqual(P.spells, []);
  });
  it("jeder Zauber hängt an genau einem Knoten, jede Voraussetzung existiert", () => {
    for (const id in SPELLS) assert.equal(Object.values(SKILLS).filter(s => s.spell === id).length, 1, id);
    for (const s of Object.values(SKILLS)) for (const req of s.requires || []) assert.ok(SKILLS[req], s.id + " braucht " + req);
  });
  it("Passive wirken in derive", () => {
    const P = newPlayer("s"); P.level = 12;
    const before = derive(P);
    assert.ok(learn(P, "zaehigkeit")); assert.ok(learn(P, "zaehigkeit")); assert.ok(learn(P, "manaquelle")); assert.ok(learn(P, "meditation"));
    const after = derive(P);
    assert.equal(after.maxHp, before.maxHp + 16);
    assert.equal(after.maxMana, before.maxMana + 12);
    assert.equal(after.manaRegen, before.manaRegen + 1);
  });
});

describe("Fernkampf", () => {
  it("Bogen schießt ein Geschoss in Blickrichtung, das trifft", () => {
    const G = arena("bogen");
    const P = G.P;
    P.equip.waffe = weapon("kurzbogen");
    assert.equal(derive(P).weaponType, "fern");
    const m = makeMob("schleim", 1, P.x + 60, P.y); m.spd = 0; G.mobs = [m];
    P.dir = "right";
    update(G, 1 / 60, { ...idle, attack: true });
    assert.equal(G.pprojs.length, 1);
    assert.ok(G.pprojs[0].vx > 0);
    const hp0 = m.hp;
    for (let i = 0; i < 40 && m.hp === hp0; i++) update(G, 1 / 60, idle);
    assert.ok(m.hp < hp0, "kein Treffer");
    assert.equal(G.pprojs.length, 0, "Geschoss verschwindet nach Treffer");
  });
  it("Feuerrate, Doppelschuss, Durchschlag", () => {
    const G = arena("rate");
    const P = G.P; P.level = 12;
    P.equip.waffe = weapon("wurfmesser");
    for (let i = 0; i < 10; i++) update(G, 1 / 60, { ...idle, attack: true });
    assert.equal(G.pprojs.length, 1, "Feuerrate ignoriert");
    learn(P, "zielen"); learn(P, "doppelschuss"); learn(P, "schnellhand"); learn(P, "durchschlag");
    G.pprojs = []; G.shootCd = 0;
    update(G, 1 / 60, { ...idle, attack: true });
    assert.equal(G.pprojs.length, 2);
    assert.ok(G.pprojs.every(p => p.pierce));
    assert.ok(derive(P).rate < 0.32);
  });
  it("Geschosse zielen sanft auf Gegner im Kegel", () => {
    const G = arena("aim");
    const P = G.P;
    P.equip.waffe = weapon("armbrust");
    const m = makeMob("wolf", 1, P.x + 70, P.y + 25); m.spd = 0; G.mobs = [m];
    P.dir = "right";
    update(G, 1 / 60, { ...idle, attack: true });
    assert.ok(G.pprojs[0].vy > 0, "keine Zielhilfe");
  });
});

describe("Magie", () => {
  it("Feuerball kostet Mana, trifft, brennt", () => {
    const G = arena("feuer");
    const P = G.P; P.level = 5; assert.ok(learn(P, "feuer"));
    P.mana = derive(P).maxMana;
    const m = makeMob("schleim", 1, P.x, P.y - 50); m.spd = 0; m.maxHp = m.hp = 500; G.mobs = [m];
    P.dir = "up";
    const mana0 = P.mana;
    assert.ok(castSpell(G));
    assert.equal(P.mana, mana0 - SPELLS.feuerball.cost);
    assert.equal(G.pprojs.length, 1);
    assert.equal(canCast(G, "feuerball"), "Abklingzeit");
    for (let i = 0; i < 30 && !m.burnT; i++) update(G, 1 / 60, idle);
    assert.ok(m.burnT > 0, "kein Brand");
    const hp1 = m.hp;
    for (let i = 0; i < 40; i++) update(G, 1 / 60, idle);
    assert.ok(m.hp < hp1, "Brand tickt nicht");
  });
  it("Blutmagie zahlt mit Leben und ist stärker", () => {
    const G = arena("blut");
    const P = G.P; P.level = 12; assert.ok(learn(P, "feuer")); assert.ok(learn(P, "blutmagie"));
    const hp0 = P.hp = derive(P).maxHp;
    const cost = spellCost(P, "blutpfeil");
    assert.ok(cost.hp > 0 && cost.mana === undefined);
    assert.ok(spellDamage(P, "blutpfeil") > spellDamage(P, "feuerball"));
    assert.ok(selectSpell(P, "blutpfeil"));
    assert.ok(castSpell(G));
    assert.equal(P.hp, hp0 - cost.hp);
    P.hp = cost.hp;
    G.spellCd = {};
    assert.equal(canCast(G, "blutpfeil"), "Zu wenig Leben");
  });
  it("Nova trifft alle rundum, Strahl nur in Blickrichtung, Kette springt", () => {
    const G = arena("nova");
    const P = G.P; P.level = 15;
    assert.ok(learn(P, "erde")); assert.ok(learn(P, "manaquelle")); assert.ok(learn(P, "arkanmacht")); assert.ok(learn(P, "licht")); assert.ok(learn(P, "blitz"));
    P.mana = 999;
    const around = [[30, 0], [-30, 0], [0, 30], [0, -30]].map(([dx, dy]) => { const m = makeMob("schleim", 1, P.x + dx, P.y + dy); m.spd = 0; m.maxHp = m.hp = 1000; return m; });
    G.mobs = around;
    selectSpell(P, "erdstoss"); assert.ok(castSpell(G)); update(G, 1 / 60, idle);
    assert.ok(around.every(m => m.hp < 1000), "Nova hat nicht alle getroffen");
    around.forEach(m => { m.hp = 1000; });
    P.dir = "up"; G.spellCd = {};
    selectSpell(P, "lichtstrahl"); assert.ok(castSpell(G)); update(G, 1 / 60, idle);
    assert.ok(around[3].hp < 1000, "Strahl trifft oben nicht");
    assert.equal(around[2].hp, 1000, "Strahl trifft hinten");
    around.forEach(m => { m.hp = 1000; }); G.spellCd = {};
    selectSpell(P, "blitzschlag"); assert.ok(castSpell(G)); update(G, 1 / 60, idle);
    assert.equal(around.filter(m => m.hp < 1000).length, SPELLS.blitzschlag.jumps);
    assert.equal(cycleSpell(P), "erdstoss");
  });
  it("kein Zauber ohne Kenntnis oder Mana", () => {
    const G = arena("none");
    assert.equal(castSpell(G), false);
    G.P.level = 3; assert.ok(learn(G.P, "wind")); G.P.mana = 0;
    assert.equal(canCast(G, "windschnitt"), "Zu wenig Mana");
  });
  it("Speicherstand Version 1 bekommt Mana und Fertigkeiten", () => {
    const mig = migrate({ saveVersion: 1, seed: "x", P: { level: 5, xp: 0, gold: 0, hp: 10, inventory: [], equip: {}, area: "over", sx: 2, sy: 3, x: 0, y: 0, dir: "up" } });
    assert.equal(mig.saveVersion, SAVE_VERSION);
    assert.equal(mig.P.mana, 30);
    assert.deepEqual(mig.P.skills, {});
    assert.equal(freePoints(mig.P), 1);
  });
});
