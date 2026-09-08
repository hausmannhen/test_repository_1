import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { rngFor, mulberry32 } from "../src/game/rng.js";
import { BASES, RARITIES, PREFIXES, SUFFIXES, generateItem, effectiveStats, upgradeCost, makePotion } from "../src/game/items.js";
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
    assert.ok(share("gewoehnlich") > 0.6 && share("gewoehnlich") < 0.71, "gewöhnlich " + share("gewoehnlich"));
    assert.ok(share("ungewoehnlich") > 0.18 && share("ungewoehnlich") < 0.3, "ungewöhnlich " + share("ungewoehnlich"));
    assert.ok(share("selten") > 0.045 && share("selten") < 0.11, "selten " + share("selten"));
    assert.ok(share("episch") > 0.012 && share("episch") < 0.036, "episch " + share("episch"));
    assert.ok(share("legendaer") > 0.0015 && share("legendaer") < 0.009, "legendär " + share("legendaer"));
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

  it("Tränke stapeln, höchstens 20 je Sorte, Händler verkauft dann nicht", async () => {
    const p = makePotion("heiltrank", 2);
    assert.equal(p.kind, "trank"); assert.equal(p.qty, 2); assert.ok(p.value > 0);
    const { addToInventory, potionCount, POTION_MAX } = await import("../src/game/player.js");
    const { buyPotion } = await import("../src/game/actions.js");
    const P = { inventory: [makePotion("heiltrank", 19)], gold: 100000 };
    assert.equal(addToInventory(P, makePotion("heiltrank", 2)), true);
    assert.equal(potionCount(P, "heiltrank"), POTION_MAX);
    assert.equal(addToInventory(P, makePotion("heiltrank", 1)), false);
    assert.equal(buyPotion(P, "heiltrank"), false);
    assert.equal(buyPotion(P, "manatrank"), true);
    assert.equal(P.inventory.length, 2);
  });
});

describe("Drops", () => {
  it("Gold immer, Item rund 5 %, Trank rund 5 %", () => {
    const r = mulberry32(42);
    const mob = makeMob("wolf", 3, 0, 0);
    let items = 0, pots = 0;
    for (let i = 0; i < 10000; i++) {
      const d = rollDrops(r, mob, 0, false);
      assert.equal(d[0].type, "gold"); assert.ok(d[0].amount >= 1);
      if (d.some(x => x.type === "item")) items++;
      if (d.some(x => x.type === "potion")) pots++;
    }
    assert.ok(items > 380 && items < 620, "items " + items);
    assert.ok(pots > 380 && pots < 620, "pots " + pots);
  });
  it("Bosse: zwei Items, eines mindestens Episch, Großer Heiltrank", () => {
    const r = mulberry32(7);
    const mob = makeMob("golem", 15, 0, 0, { name: "B", hpMult: 7, atkMult: 1.5, size: 24, color: "#000", color2: "#000" });
    for (let i = 0; i < 200; i++) {
      const d = rollDrops(r, mob, 0, true);
      const items = d.filter(x => x.type === "item");
      assert.equal(items.length, 2);
      assert.ok(["episch", "legendaer"].includes(items[0].item.rarity));
      assert.ok(d.some(x => x.type === "potion" && x.id === "heiltrank"));
    }
  });
  it("Monster skalieren mit Stufe", () => {
    for (const id in MOBS) {
      const a = makeMob(id, 1, 0, 0), b = makeMob(id, 10, 0, 0);
      assert.ok(b.maxHp > a.maxHp && b.atk > a.atk && b.xp > a.xp, id);
    }
  });
});

describe("Verkauf", () => {
  it("Händler zahlen ein Viertel des Werts, mindestens 1 Gold", async () => {
    const { sellItem, sellPrice } = await import("../src/game/actions.js");
    const r = rngFor("test", "verkauf");
    const it = generateItem(r, 10);
    const P = { inventory: [it], gold: 0 };
    assert.equal(sellPrice(it), Math.max(1, Math.round(it.value * 0.25)));
    sellItem(P, it);
    assert.equal(P.gold, sellPrice(it)); assert.equal(P.inventory.length, 0);
  });
});

describe("Nebenhand", () => {
  const off = (id) => { const it = generateItem(rngFor("off", id), 5, 0, 0, "schild"); const b = BASES.find(x => x.id === id); Object.assign(it, { baseId: id, name: b.name, stats: { def: b.def, ...(b.hp ? { hp: b.hp } : {}), ...(b.atk ? { atk: b.atk } : {}), ...(b.crit ? { crit: b.crit } : {}), ...(b.mag ? { mag: b.mag } : {}), ...(b.mana ? { mana: b.mana } : {}) } }); return it; };
  const wpn = (id) => { const b = BASES.find(x => x.id === id); const it = generateItem(rngFor("w", id), 5, 0, 0, "waffe"); Object.assign(it, { baseId: id, type: b.type, range: b.range, rate: b.rate, projSpeed: b.projSpeed, proj: b.proj, reach: b.reach || 0, stats: { atk: b.atk || 3, ...(b.mag ? { mag: b.mag } : {}) } }); delete it.blood; return it; };
  it("Köcher nur mit Fernwaffe, Zauberbuch nur mit Stab, Schild bremst Fernwaffen", async () => {
    const { derive, newPlayer } = await import("../src/game/player.js");
    const P = newPlayer("nh");
    P.equip.waffe = wpn("langschwert"); P.equip.schild = null;
    const base = derive(P);
    P.equip.schild = off("koecher");
    const wrong = derive(P);
    assert.equal(wrong.atk, base.atk, "Köcher gibt Angriff ohne Bogen"); assert.equal(wrong.crit, base.crit); assert.equal(wrong.def, base.def + 1);
    P.equip.waffe = wpn("langbogen");
    const bowOnly = { ...P.equip, schild: null }; const saved = P.equip; P.equip = bowOnly; const bow = derive(P); P.equip = saved;
    const right = derive(P);
    assert.equal(right.atk, bow.atk + 4); assert.equal(right.crit, bow.crit + 4);
    assert.ok(Math.abs(right.rate - bow.rate * 0.95) < 1e-9, "Köcher beschleunigt nicht");
    P.equip.schild = off("rundschild");
    assert.ok(Math.abs(derive(P).rate - bow.rate * 1.2) < 1e-9, "Schild bremst nicht");
    P.equip.waffe = wpn("kristallstab"); P.equip.schild = off("zauberbuch");
    const staffOnly = { ...P.equip, schild: null }; P.equip = staffOnly; const staff = derive(P); P.equip = saved; P.equip.schild = off("zauberbuch");
    const book = derive(P);
    assert.equal(book.mag, staff.mag + 6); assert.equal(book.maxMana, staff.maxMana + 20); assert.equal(book.manaRegen, staff.manaRegen + 0.5);
    P.equip.waffe = wpn("langschwert");
    assert.equal(derive(P).mag, derive({ ...P, equip: { ...P.equip, schild: null } }).mag, "Zauberbuch wirkt ohne Stab");
  });
});

describe("Affixe nach Waffentyp", () => {
  it("Schwert und Bogen ohne Magie, Stab ohne Angriff, Köcher und Buch häufiger", () => {
    const r = rngFor("test", "affix");
    let koecher = 0, buch = 0, schild = 0;
    for (let i = 0; i < 4000; i++) {
      const it = generateItem(r, 15, 0, 3);
      // Affixe erkennt man am Namen; Grundwerte der Basis (Stab hat etwas Angriff) zählen nicht
      const magNames = [...PREFIXES, ...SUFFIXES].filter(a => a.stat === "mag" || a.stat === "mana").map(a => a.name);
      const atkNames = [...PREFIXES, ...SUFFIXES].filter(a => a.stat === "atk").map(a => a.name);
      const hasAffix = (names) => names.some(n => it.name.startsWith(n) || it.name.includes(" " + n));
      if (it.slot === "waffe" && it.type !== "fokus") assert.ok(!hasAffix(magNames), it.name);
      if (it.slot === "waffe" && it.type === "fokus") assert.ok(!hasAffix(atkNames), it.name);
      if (it.baseId === "koecher") { koecher++; assert.ok(!hasAffix(magNames), it.name); }
      if (it.baseId === "zauberbuch") { buch++; assert.ok(!hasAffix(atkNames), it.name); }
      if (it.baseId === "rundschild") schild++;
    }
    assert.ok(koecher > schild * 1.2 && buch > schild * 1.2, `${koecher} ${buch} ${schild}`);
  });
});
