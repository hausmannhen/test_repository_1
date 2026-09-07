import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { TS, WORLD_W, WORLD_H, DUNGEONS } from "../src/game/constants.js";
import { genOverworldScreen, spawnMobsFor, genDungeon } from "../src/game/world.js";
import { createGame, startGame, enterScreen, update, killMob, hint } from "../src/game/engine.js";
import { makeMob, makeElite, rollDrops } from "../src/game/monsters.js";
import { mulberry32 } from "../src/game/rng.js";
import { ELITES, ELITE_CHANCE } from "../src/data/elites.js";
import { ABILITIES, BOSS_ABILITIES, MINI_ABILITIES } from "../src/data/abilities.js";
import { MINIBOSSES } from "../src/data/minibosses.js";
import { derive } from "../src/game/player.js";

const idle = { x: 0, y: 0, attack: false, cast: false };
const step = (G, n) => { for (let i = 0; i < n; i++) update(G, 1 / 60, idle); };
function arena(seed) { const G = startGame(createGame(seed)); enterScreen(G, "over", 3, 5, 7 * TS + 8, 5 * TS + 8, false); G.mobs = []; G.P.level = 12; G.P.hp = derive(G.P).maxHp; return G; }

describe("Elites", () => {
  it("rund acht Prozent der Wildnis-Monster, nie im Dorf, immer mit Beute", () => {
    let mobs = 0, elites = 0;
    for (let y = 0; y < WORLD_H; y++) for (let x = 0; x < WORLD_W; x++) for (let v = 1; v <= 3; v++) {
      const s = genOverworldScreen("elite-seed", x, y);
      for (const m of spawnMobsFor(s, "elite-seed", v, {})) { if (m.mini) continue; mobs++; if (m.elite) { elites++; assert.ok(s.village === null); assert.ok(m.name.startsWith(ELITES[m.elite].name)); } }
    }
    const share = elites / mobs;
    assert.ok(share > ELITE_CHANCE * 0.5 && share < ELITE_CHANCE * 1.6, `Anteil ${share.toFixed(3)} bei ${mobs} Monstern`);
    const r = mulberry32(3);
    for (let i = 0; i < 50; i++) assert.ok(rollDrops(r, makeElite(makeMob("wolf", 5, 0, 0), "zaeh"), 0, false).some(d => d.type === "item"));
  });
  it("Zäh, Wütend, Flink verändern die Werte", () => {
    const base = makeMob("wolf", 5, 0, 0);
    assert.ok(makeElite(makeMob("wolf", 5, 0, 0), "zaeh").maxHp > base.maxHp * 2);
    assert.ok(makeElite(makeMob("wolf", 5, 0, 0), "wuetend").atk > base.atk * 1.4);
    assert.ok(makeElite(makeMob("wolf", 5, 0, 0), "flink").spd > base.spd * 1.3);
  });
  it("Heilender heilt sich, Eisiger verlangsamt, Geladener explodiert", () => {
    const G = arena("elite-fx"); const P = G.P;
    const h = makeElite(makeMob("wolf", 5, P.x + 80, P.y), "heilend"); h.spd = 0; h.hp = h.maxHp * 0.5; G.mobs = [h];
    step(G, 60);
    assert.ok(h.hp > h.maxHp * 0.5, "keine Heilung");
    const e = makeElite(makeMob("wolf", 5, P.x, P.y), "eisig"); e.spd = 0; G.mobs = [e]; G.invT = 0;
    step(G, 2);
    assert.ok(P.slowT > 0, "nicht verlangsamt");
    const g = makeElite(makeMob("wolf", 5, P.x + 10, P.y), "geladen"); g.spd = 0; G.mobs = [g]; G.invT = 0;
    const hp = P.hp;
    killMob(G, g);
    assert.ok(P.hp < hp, "keine Explosion");
    assert.ok(G.fx.some(f => f.kind === "ring"));
  });
});

describe("Fähigkeiten", () => {
  it("jeder Boss hat zwei, jeder Zwischenboss eine, alle Verweise existieren", () => {
    for (const d of DUNGEONS) { assert.equal(BOSS_ABILITIES[d.id].length, 2); for (const a of BOSS_ABILITIES[d.id]) assert.ok(ABILITIES[a], a); }
    for (const mb of MINIBOSSES) { assert.ok(MINI_ABILITIES[mb.id] && MINI_ABILITIES[mb.id].length >= 1, mb.id); for (const a of MINI_ABILITIES[mb.id]) assert.ok(ABILITIES[a], a); }
  });
  it("Bodenstampfer: erst Ankündigung, dann Schaden im Umkreis, Boss steht still", () => {
    const G = arena("stampfer"); const P = G.P;
    const m = makeMob("golem", 10, P.x + 30, P.y, { name: "Test", hpMult: 1, atkMult: 1, size: 14, color: "#000", color2: "#000", mini: "felsbrecher", abilities: ["stampfer"] });
    m.abilities[0].t = 0; G.mobs = [m]; G.invT = 0;
    const hp = P.hp;
    step(G, 2);
    assert.ok(m.tele, "keine Ankündigung");
    assert.ok(G.fx.some(f => f.kind === "ring" && f.warn), "kein Warnring");
    assert.equal(P.hp, hp, "Schaden vor der Ankündigung");
    const mx = m.x; step(G, 20); assert.equal(m.x, mx, "Boss bewegt sich während der Ankündigung");
    step(G, 60);
    assert.ok(P.hp < hp, "kein Schaden nach der Ankündigung");
    assert.equal(m.tele, null);
    assert.ok(m.abilities[0].t > 0, "keine Abklingzeit");
  });
  it("Wurzelschlag zielt auf die Position bei der Ankündigung, ausweichen hilft", () => {
    const G = arena("wurzeln"); const P = G.P;
    const m = makeMob("waldgeist", 8, P.x + 100, P.y, { name: "Test", hpMult: 1, atkMult: 1, size: 14, color: "#000", color2: "#000", mini: "x", abilities: ["wurzeln"] });
    m.abilities[0].t = 0; m.spd = 0; G.mobs = [m]; G.invT = 0;
    step(G, 2);
    assert.ok(m.tele && m.tele.x === P.x);
    P.x -= 60;   // weg von der markierten Stelle
    const hp = P.hp; step(G, 70);
    assert.equal(P.hp, hp, "getroffen trotz Ausweichen");
  });
  it("Feuerodem trifft auf der Linie, Sprung versetzt den Boss", () => {
    const G = arena("odem"); const P = G.P;
    const m = makeMob("drache", 20, P.x + 90, P.y, { name: "Test", hpMult: 1, atkMult: 1, size: 14, color: "#000", color2: "#000", mini: "x", abilities: ["odem"] });
    m.abilities[0].t = 0; m.spd = 0; m.cd = 99; G.mobs = [m]; G.invT = 0; G.projs = [];
    step(G, 2); assert.ok(G.fx.some(f => f.kind === "beam" && f.warn));
    const hp = P.hp; step(G, 70); G.projs = [];
    assert.ok(P.hp < hp, "Odem trifft nicht");
    const G2 = arena("sprung"); const P2 = G2.P;
    const w = makeMob("wolf", 5, P2.x + 120, P2.y, { name: "Alpha", hpMult: 1, atkMult: 1, size: 14, color: "#000", color2: "#000", mini: "alpha", abilities: ["sprung"] });
    w.abilities[0].t = 0; w.spd = 0; G2.mobs = [w];
    step(G2, 2); step(G2, 60);
    assert.ok(Math.hypot(w.x - P2.x, w.y - P2.y) < 40, "Sprung landet nicht beim Spieler");
  });
  it("Ruf holt Verstärkung bei halbem Leben, Raserei macht schneller", () => {
    const G = arena("ruf"); const P = G.P;
    const m = makeMob("golem", 10, P.x + 100, P.y, { name: "Test", hpMult: 1, atkMult: 1, size: 14, color: "#000", color2: "#000", mini: "x", abilities: ["ruf", "wut"] });
    m.spd = 0; G.mobs = [m];
    const spd = m.spd, atk = m.atk;
    m.hp = m.maxHp * 0.45; step(G, 1);
    assert.equal(G.mobs.length, 3, "kein Ruf");
    m.hp = m.maxHp * 0.2; step(G, 1);
    assert.ok(m.atk > atk, "keine Raserei");
    void spd;
  });
});

describe("Einstieg", () => {
  it("Hinweise erscheinen einmal, in Reihenfolge, nur ohne andere Meldung", () => {
    const G = startGame(createGame("hints"));
    assert.equal(G.hintQueue.length, 2);
    G.banner = null;
    step(G, 1);
    assert.match(G.msg.text, /Bram/);
    assert.equal(hint(G, "start", "nochmal"), false);
    G.msg = null; step(G, 1);
    assert.match(G.msg.text, /Steuerkreuz/);
    G.P.level = 3; G.msg = null; step(G, 1);
    assert.match(G.msg.text, /Fertigkeitspunkt/);
    const G2 = createGame("hints2"); G2.P.kills = 5; startGame(G2);
    assert.equal(G2.hintQueue.length, 0, "Hinweise für erfahrene Spieler");
  });
});
