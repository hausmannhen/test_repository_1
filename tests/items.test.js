import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { rngFor, mulberry32 } from "../src/game/rng.js";
import { BASES, RARITIES, PREFIXES, generateItem, effectiveStats, upgradeCost, makePotion } from "../src/game/items.js";
import { MOBS, makeMob, rollDrops } from "../src/game/monsters.js";

describe("Items", () => {
  it("jedes Basisitem hat ein Genus", () => {
    for (const b of BASES) assert.ok(["m", "f", "n"].includes(b.g), b.id + " ohne g");
  });

  it("Seltenheitsverteilung über 10.000 Rolls (Stufe 1, kein Glück)", () => {
    const r = rngFor("test", "verteilung");
    const count = Object.fromEntries(RARITIES.map(x => [x.id, 0]));
    for (let i = 0; i < 10000; i++) count[generateItem(r, 1).rarity]++;
    const share = id => count[id] / 10000;
    assert.ok(share("gewoehnlich") > 0.52 && share("gewoehnlich") < 0.66, "gewöhnlich " + share("gewoehnlich"));
    assert.ok(share("ungewoehnlich") > 0.2 && share("ungewoehnlich") < 0.32, "ungewöhnlich " + share("ungewoehnlich"));
    assert.ok(share("selten") > 0.06 && share("selten") < 0.14, "selten " + share("selten"));
    assert.ok(share("episch") > 0.015 && share("episch") < 0.05, "episch " + share("episch"));
    assert.ok(share("legendaer") > 0.002 && share("legendaer") < 0.02, "legendär " + share("legendaer"));
  });

  it("Glück verschiebt die Verteilung nach oben", () => {
    const r0 = rngFor("test", "glueck0"), r1 = rngFor("test", "glueck1");
    let rare0 = 0, rare1 = 0;
    for (let i = 0; i < 5000; i++) {
      if (generateItem(r0, 10, 0).rarity !== "gewoehnlich") rare0++;
      if (generateItem(r1, 10, 20).rarity !== "gewoehnlich") rare1++;
    }
    assert.ok(rare1 > rare0 * 1.2, `${rare0} vs ${rare1}`);
  });

  it("Mindestseltenheit wird eingehalten", () => {
    const r = rngFor("test", "min");
    for (let i = 0; i < 500; i++) {
      const it = generateItem(r, 8, 0, 3);
      assert.ok(["episch", "legendaer"].includes(it.rarity), it.rarity);
      assert.ok(Object.keys(it.stats).length >= 1);
    }
  });

  it("gleicher Seed, gleiches Item", () => {
    const a = generateItem(rngFor("s", "k"), 5), b = generateItem(rngFor("s", "k"), 5);
    assert.equal(a.name, b.name);
    assert.deepEqual(a.stats, b.stats);
    assert.equal(a.value, b.value);
  });

  it("Präfix wird nach Genus dekliniert", () => {
    const r = rngFor("test", "deklination");
    const endings = { m: "er", f: "e", n: "es" };
    let checked = 0;
    for (let i = 0; i < 2000 && checked < 60; i++) {
      const it = generateItem(r, 5, 0, 1);
      const base = BASES.find(b => b.id === it.baseId);
      const pre = PREFIXES.find(p => it.name.startsWith(p.name + endings[base.g] + " "));
      if (it.name.includes(" ") && !it.name.startsWith(base.name)) { assert.ok(pre, "falsche Deklination: " + it.name); checked++; }
    }
    assert.ok(checked > 0);
  });

  it("erzwungener Slot, Wert und Aufwertung", () => {
    const r = rngFor("test", "slot");
    for (let i = 0; i < 50; i++) assert.equal(generateItem(r, 3, 0, 0, "kopf").slot, "kopf");
    const it = generateItem(r, 10);
    assert.ok(it.value > 0);
    const before = effectiveStats(it);
    it.upg = 5;
    const after = effectiveStats(it);
    for (const k in before) assert.ok(after[k] >= before[k]);
    assert.ok(upgradeCost(it) > upgradeCost({ ...it, upg: 0 }));
  });

  it("Tränke stapeln", () => {
    const p = makePotion("heiltrank_k", 2);
    assert.equal(p.kind, "trank"); assert.equal(p.qty, 2); assert.ok(p.value > 0);
  });
});

describe("Drops", () => {
  it("Gold immer, Item rund 22 %, Trank rund 14 %", () => {
    const r = mulberry32(42);
    const mob = makeMob("wolf", 3, 0, 0);
    let items = 0, pots = 0;
    for (let i = 0; i < 10000; i++) {
      const d = rollDrops(r, mob, 0, false);
      assert.equal(d[0].type, "gold"); assert.ok(d[0].amount >= 1);
      if (d.some(x => x.type === "item")) items++;
      if (d.some(x => x.type === "potion")) pots++;
    }
    assert.ok(items > 1900 && items < 2500, "items " + items);
    assert.ok(pots > 1150 && pots < 1650, "pots " + pots);
  });
  it("Bosse: zwei Items, eines mindestens Episch, Großer Heiltrank", () => {
    const r = mulberry32(7);
    const mob = makeMob("golem", 15, 0, 0, { name: "B", hpMult: 7, atkMult: 1.5, size: 24, color: "#000", color2: "#000" });
    for (let i = 0; i < 200; i++) {
      const d = rollDrops(r, mob, 0, true);
      const items = d.filter(x => x.type === "item");
      assert.equal(items.length, 2);
      assert.ok(["episch", "legendaer"].includes(items[0].item.rarity));
      assert.ok(d.some(x => x.type === "potion" && x.id === "heiltrank_g"));
    }
  });
  it("Monster skalieren mit Stufe", () => {
    for (const id in MOBS) {
      const a = makeMob(id, 1, 0, 0), b = makeMob(id, 10, 0, 0);
      assert.ok(b.maxHp > a.maxHp && b.atk > a.atk && b.xp > a.xp, id);
    }
  });
});
