/* Balance-Simulation: drei Spielweisen durch alle Regionen und gegen die Bosse. Aufruf: node scripts/balance.mjs */
import { TS, VW, VH, WORLD_W, WORLD_H, REGIONS, regionAt, DUNGEONS } from "../src/game/constants.js";
import { genDungeon, walkable } from "../src/game/world.js";
import { createGame, startGame, enterScreen, update } from "../src/game/engine.js";
import { derive, usePotion, useManaPotion } from "../src/game/player.js";
import { generateItem, makePotion, BASE_BY_ID } from "../src/game/items.js";
import { rngFor } from "../src/game/rng.js";
import { learn, freePoints } from "../src/game/skills.js";
import { selectSpell, SPELLS } from "../src/game/magic.js";

const BUILDS = {
  schwert: { weapon: "langschwert", skills: ["kraft", "kraft", "zaehigkeit", "wirbel", "kraft", "eisenhaut", "raserei", "kraft", "kraft", "zaehigkeit"] },
  bogen:   { weapon: "langbogen",   skills: ["zielen", "zielen", "schnellhand", "doppelschuss", "zielen", "durchschlag", "adlerauge", "zielen", "zielen", "schnellhand"] },
  magie:   { weapon: "kristallstab", skills: ["feuer", "manaquelle", "arkanmacht", "feuer", "wind", "arkanmacht", "meditation", "feuer", "arkanmacht", "manaquelle"] },
};
function gear(P, build, level) {
  const r = rngFor("balance", build + level);
  const base = BASE_BY_ID[BUILDS[build].weapon];
  const w = generateItem(r, level, 0, 2, "waffe");
  Object.assign(w, { baseId: base.id, name: base.name, type: base.type, range: base.range, rate: base.rate, projSpeed: base.projSpeed, proj: base.proj, reach: base.reach || 0 });
  // Basiswerte der gewünschten Waffe, skaliert wie generateItem
  w.stats = {}; for (const k of ["atk", "def", "hp", "crit", "spd", "luck", "mag", "mana"]) if (base[k]) w.stats[k] = Math.round(base[k] * (["crit", "luck", "spd"].includes(k) ? 1 + level * 0.03 : (1 + level * 0.13)) * 1.55);
  P.equip.waffe = w;
  for (const slot of ["kopf", "rumpf", "schild", "amulett", "ring"]) P.equip[slot] = generateItem(r, level, 0, 1, slot);
  for (const id of BUILDS[build].skills) { if (freePoints(P) <= 0) break; learn(P, id); }
  if (P.spells.length) selectSpell(P, P.spells.includes("feuerball") ? "feuerball" : P.spells[0]);
  P.inventory = [makePotion("heiltrank", 5), makePotion("manatrank", 5)];
  const d = derive(P); P.hp = d.maxHp; P.mana = d.maxMana;
}
function fight(G, build, seconds) {
  const P = G.P; const dt = 1 / 60;
  let t = 0, stuck = 0, last = Infinity, kills0 = P.kills, dmgTaken = 0, deaths = 0, pots = 0, hpPrev = P.hp;
  while (t < seconds && G.mobs.length) {
    const d = derive(P);
    let m = null, best = Infinity;
    for (const mm of G.mobs) { const dd = Math.hypot(mm.x - P.x, mm.y - P.y); if (dd < best) { best = dd; m = mm; } }
    if (best < 0.001) best = 0.001; // sonst 0/0 in der Richtung
    const dx = m.x - P.x, dy = m.y - P.y;
    let input;
    // Keine Zielhilfe: der Bot zielt wie ein Spieler, indem er den Stock leicht Richtung Gegner drückt, und schießt dann
    const ax = dx / best * 0.25, ay = dy / best * 0.25;
    if (build === "bogen") { const inRange = best < d.range - 10; input = inRange ? { x: ax, y: ay, attack: true, cast: false } : { x: dx / best, y: dy / best, attack: false, cast: false }; if (best < 40) input = { x: -dx / best, y: -dy / best, attack: false, cast: false }; }
    else if (build === "magie") { const sp = SPELLS[P.activeSpell]; const inRange = best < (sp.range || 120) - 10; const canMana = P.mana >= (sp.cost || 0); input = inRange && canMana ? { x: ax, y: ay, attack: false, cast: true } : { x: dx / best, y: dy / best, attack: !canMana && best < d.reach + m.size / 2 + 2, cast: false }; if (P.mana < 12) useManaPotion(G); }
    else { const inReach = best < d.reach + m.size / 2 + 2; input = { x: inReach ? Math.sign(dx) * 0.3 : dx / best, y: inReach ? Math.sign(dy) * 0.3 : dy / best, attack: inReach, cast: false }; }
    if (P.hp < d.maxHp * 0.35) { if (usePotion(G)) pots++; }
    const hpBefore = P.hp;
    update(G, dt, input);
    if (P.hp < hpBefore) dmgTaken += hpBefore - P.hp;
    if (G.dead) { deaths++; P.hp = derive(P).maxHp; G.dead = false; G.invT = 1; }
    G.transition = null;
    t += dt;
    if (best >= last - 0.5 && !input.attack && !input.cast) stuck += dt; else stuck = 0; last = best;
    if (stuck > 2) { const tiles = G.screen.tiles, mx = Math.floor(m.x / TS), my = Math.floor(m.y / TS); outer: for (let r = 1; r < 4; r++) for (let yy = -r; yy <= r; yy++) for (let xx = -r; xx <= r; xx++) if (walkable(tiles, mx + xx, my + yy)) { P.x = (mx + xx) * TS + 8; P.y = (my + yy) * TS + 8; break outer; } stuck = 0; }
  }
  return { kills: P.kills - kills0, t, dmgTaken, deaths, pots, cleared: G.mobs.length === 0 };
}
function regionScreens(reg) { const out = []; for (let y = 0; y < WORLD_H; y++) for (let x = 0; x < WORLD_W; x++) if (regionAt(x, y) === reg) out.push([x, y]); return out; }

const rows = [];
for (const [reg, def] of Object.entries(REGIONS)) {
  for (const build of Object.keys(BUILDS)) {
    const level = def.level + 2;
    let kills = 0, time = 0, dmg = 0, deaths = 0, pots = 0, screens = 0;
    for (const [x, y] of regionScreens(reg).slice(0, 6)) {
      const G = startGame(createGame("bal-" + reg + build));
      G.P.level = level; gear(G.P, build, level);
      enterScreen(G, "over", x, y, 7 * TS + 8, 5 * TS + 8, false);
      G.arenaLock = false;
      if (!G.mobs.length) continue;
      const r = fight(G, build, 120);
      kills += r.kills; time += r.t; dmg += r.dmgTaken; deaths += r.deaths; pots += r.pots; screens++;
    }
    const maxHp = derive(Object.assign(startGame(createGame("x")).P, { level })).maxHp;
    rows.push({ Gebiet: def.name.split(" ")[0], Stufe: level, Bau: build, "s/Kill": (time / Math.max(1, kills)).toFixed(1), Kills: kills, "Schaden/Kill": (dmg / Math.max(1, kills)).toFixed(0), Tode: deaths, Tränke: pots });
  }
}
console.table(rows);

const boss = [];
for (const [i, level] of [[0, 8], [1, 14], [2, 25]]) {
  for (const build of Object.keys(BUILDS)) {
    const G = startGame(createGame("boss-" + i + build));
    G.P.level = level; gear(G.P, build, level); G.P.hearts = i;
    const dg = genDungeon(G.seed, DUNGEONS[i]);
    const key = Object.keys(dg.rooms).find(k => dg.rooms[k].dungeonRoom.type === "boss");
    const [x, y] = key.split(",").map(Number);
    enterScreen(G, "d" + i, x, y, 7 * TS + 8, 8 * TS + 8, false);
    const r = fight(G, build, 240);
    boss.push({ Boss: DUNGEONS[i].name, Stufe: level, Bau: build, Sieg: r.cleared ? "ja" : "nein", Sekunden: r.t.toFixed(0), Tode: r.deaths, Tränke: r.pots });
  }
}
console.table(boss);
