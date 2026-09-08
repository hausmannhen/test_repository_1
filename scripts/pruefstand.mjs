/* Prüfstand: jeder Zauber und Sonderangriff gegen Monster verschiedener Typen und Stufen, Klassen gegen Zwischen- und Endbosse, Itemverteilung. node scripts/pruefstand.mjs */
import { createGame, startGame, enterScreen, update, castSpell } from "../src/game/engine.js";
import { TS } from "../src/game/constants.js";
import { derive, newPlayer } from "../src/game/player.js";
import { makeMob, MOBS } from "../src/game/monsters.js";
import { generateItem, BASES } from "../src/game/items.js";
import { SPELLS, spellCost, canCast, spellDamage } from "../src/game/magic.js";
import { SKILLS } from "../src/data/skills.js";
import { rngFor } from "../src/game/rng.js";
const idle = { x: 0, y: 0, attack: false, cast: false };
const WEAPON = { krieger: "langschwert", jaeger: "langbogen", magier: "kristallstab" };
const OFF = { krieger: "rundschild", jaeger: "koecher", magier: "zauberbuch" };
const PASSIVE = { krieger: { kraft: 2, zaehigkeit: 1 }, jaeger: { zielen: 2, schnellhand: 1 }, magier: { arkanmacht: 2, manaquelle: 1 } };
function item(id, ilvl) {
  const b = BASES.find(x => x.id === id);
  const it = generateItem(rngFor("pruef", id + ilvl), ilvl, 0, 1, b.slot);
  const stats = {}; for (const k of ["atk", "def", "hp", "crit", "spd", "luck", "mag", "mana"]) if (b[k]) stats[k] = Math.round(b[k] * (["crit", "luck", "spd"].includes(k) ? 1 + ilvl * 0.03 : 1 + ilvl * 0.13) * 1.1);
  Object.assign(it, { baseId: id, name: b.name, type: b.type, range: b.range, rate: b.rate, projSpeed: b.projSpeed, proj: b.proj, reach: b.reach || 0, stats, upg: 0 });
  delete it.blood; if (b.blood) it.blood = b.blood;
  return it;
}
function makePlayer(level, build, attackId) {
  const P = newPlayer("p"); P.level = level; P.hearts = level >= 27 ? 3 : level >= 14 ? 2 : level >= 7 ? 1 : 0;
  P.equip = { waffe: item(WEAPON[build], level), kopf: generateItem(rngFor("k", level), level, 0, 1, "kopf"), rumpf: generateItem(rngFor("r", level), level, 0, 1, "rumpf"), schild: item(OFF[build], level), amulett: generateItem(rngFor("a", level), level, 0, 1, "amulett"), ring: generateItem(rngFor("g", level), level, 0, 1, "ring") };
  P.skills = { ...PASSIVE[build] };
  if (attackId && SPELLS[attackId]) { const node = Object.values(SKILLS).find(s => s.spell === attackId); P.skills[node.id] = 1; P.spells = [attackId]; P.activeSpell = attackId; }
  const d = derive(P); P.hp = d.maxHp; P.mana = d.maxMana; P.inventory = [];
  return P;
}
/* Ein Duell: Spieler nutzt nur den einen Angriff. live=false: Monster steht still (reiner Schaden). live=true: Monster kämpft. */
function duel(level, build, attackId, mobType, mobLevel, live, bossDef = null) {
  const P = makePlayer(level, build, attackId);
  const G = startGame(createGame("duell", P)); G.openPanel = () => {};
  enterScreen(G, "over", 4, 4, 7 * TS + 8, 5 * TS + 8, false); G.mobs = []; G.arenaLock = false;
  const ranged = attackId ? SPELLS[attackId].kind !== "dash" : build !== "krieger";
  const m = makeMob(mobType, mobLevel, P.x + (ranged ? 90 : 18), P.y, bossDef); if (!live) m.spd = 0; m.spawnDelay = 0; G.mobs = [m];
  const d = derive(P); const hp0 = P.hp, mana0 = P.mana; let casts = 0, t = 0, dead = false;
  G.aim = { x: 1, y: 0 }; P.dir = "right";
  while (!m.dead && t < 40 && !G.dead) {
    let input = { ...idle };
    const dx = m.x - P.x, dy = m.y - P.y, dist = Math.hypot(dx, dy) || 1;
    G.aim = { x: dx / dist, y: dy / dist }; P.dir = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? "right" : "left") : (dy > 0 ? "down" : "up");
    if (!attackId) {
      const inReach = dist < d.reach + m.size / 2 + 2;
      if (build !== "jaeger") input = { x: inReach ? 0 : dx / dist, y: inReach ? 0 : dy / dist, attack: inReach, cast: false };
      else input = { x: dist < d.range - 10 ? 0 : dx / dist, y: dist < d.range - 10 ? 0 : dy / dist, attack: dist < d.range - 10, cast: false };
    } else {
      const sp = SPELLS[attackId];
      const inRange = sp.kind === "dash" ? dist < sp.dist + 10 : sp.kind === "nova" ? dist < sp.radius : dist < (sp.range || 120) - 10;
      if (inRange) { if (canCast(G, attackId)) { /* warten: Abklingzeit, Mana, Leben */ } else if (castSpell(G, attackId)) casts++; }
      else input = { x: dx / dist, y: dy / dist, attack: false, cast: false };
      if (!inRange && sp.kind === "nova") input = { x: dx / dist, y: dy / dist, attack: false, cast: false };
    }
    update(G, 1 / 60, input); G.transition = null; t += 1 / 60;
    if (attackId && SPELLS[attackId].bloodCost && P.hp < d.maxHp * 0.25) break;   // Blutmagier hört auf, bevor er stirbt
  }
  return { ttk: m.dead ? t : null, casts, hpLost: hp0 - P.hp, manaUsed: mana0 - P.mana, died: G.dead, mobHp: m.maxHp, hpLeft: m.hp };
}
if (process.env.DBG) {
  const [level, build, attackId, mobType] = process.env.DBG.split(",");
  const P = makePlayer(+level, build, attackId);
  const G = startGame(createGame("duell", P)); G.openPanel = () => {};
  enterScreen(G, "over", 4, 4, 7 * TS + 8, 5 * TS + 8, false); G.mobs = []; G.arenaLock = false;
  const m = makeMob(mobType, +level, P.x + 18, P.y); m.spd = 0; m.spawnDelay = 0; G.mobs = [m];
  const d = derive(P); console.log("atk", d.atk, "reach", d.reach, "hp", P.hp, "Schaden je Einsatz", Math.round(spellDamage(P, attackId)), "Mob", m.maxHp, "size", m.size);
  let t = 0, casts = 0;
  while (!m.dead && t < 30 && !G.dead) {
    const dx = m.x - P.x, dy = m.y - P.y, dist = Math.hypot(dx, dy) || 1; G.aim = { x: dx / dist, y: dy / dist };
    const sp = SPELLS[attackId]; const inRange = dist < sp.dist + 10;
    let input = { ...idle };
    if (inRange) { if (!canCast(G, attackId) && castSpell(G, attackId)) { casts++; console.log(`t=${t.toFixed(1)} cast ${casts} dist=${dist.toFixed(1)} P=(${P.x.toFixed(0)},${P.y.toFixed(0)}) M=(${m.x.toFixed(0)},${m.y.toFixed(0)}) hp=${m.hp}`); } }
    else input = { x: dx / dist, y: dy / dist, attack: false, cast: false };
    update(G, 1 / 60, input); G.transition = null; t += 1 / 60;
    if (G.dash && G.dash.hit.size && !G._logged) { G._logged = true; }
    if (!G.dash && G._logged) { G._logged = false; console.log(`   nach Vorstoß: P=(${P.x.toFixed(0)},${P.y.toFixed(0)}) M=(${m.x.toFixed(0)},${m.y.toFixed(0)}) hp=${m.hp} Spieler hp=${P.hp}`); }
  }
  console.log("Ende: tot", m.dead, "t", t.toFixed(1), "casts", casts, "Spieler tot", G.dead);
  process.exit(0);
}
const ATTACKS = { krieger: ["sturmangriff"], jaeger: ["pfeilhagel"], magier: Object.keys(SPELLS).filter(id => !["sturmangriff", "pfeilhagel"].includes(id)) };
const MOB_FOR = { 5: "wolf", 10: "skelett", 15: "hexe", 20: "eiswolf", 25: "feuerteufel" };
const rows = [];
for (const level of [5, 10, 15, 20, 25]) for (const build of ["krieger", "jaeger", "magier"]) {
  const mob = MOB_FOR[level];
  const base = duel(level, build, null, mob, level, false);
  const row = { Stufe: level, Klasse: build, Monster: mob, "Waffe s": base.ttk ? base.ttk.toFixed(1) : "–" };
  for (const id of ATTACKS[build]) { const r = duel(level, build, id, mob, level, false); row[SPELLS[id].name] = r.ttk ? `${r.ttk.toFixed(1)}s/${r.casts}x${r.hpLost > 0 && SPELLS[id].bloodCost ? "/-" + r.hpLost + "hp" : ""}` : `nie (${Math.round(100 - r.hpLeft / r.mobHp * 100)} %, ${r.casts}x)`; }
  rows.push(row);
}
console.log("A) Zeit bis Kill in Sekunden / Zahl der Einsätze gegen stehendes Monster der eigenen Stufe (nur der eine Angriff, Zauber Rang 1)");
console.table(rows);
// B) Klassen gegen verschiedene Monstertypen und Stufen, live, mit Waffe plus Sonderangriff/Feuerball
const rowsB = [];
for (const level of [10, 20]) for (const build of ["krieger", "jaeger", "magier"]) for (const mobType of ["wolf", "golem", "hexe", "feuerteufel"]) for (const ml of [level - 3, level, level + 5]) {
  const attackId = build === "magier" ? "feuerball" : null;
  const r = duel(level, build, attackId, mobType, ml, true);
  rowsB.push({ Stufe: level, Klasse: build, Monster: mobType, "Monsterstufe": ml, "Kill s": r.ttk ? r.ttk.toFixed(1) : "nie", "HP verloren": r.hpLost, tot: r.died });
}
console.log("B) Live-Duell, Monster greift an; Krieger/Jäger mit Waffe, Magier mit Feuerball");
console.table(rowsB.map(r => ({ ...r, "Kill s": r["Kill s"] })));
console.log("Von", rowsB.length, "Live-Duellen:", rowsB.filter(r => r.tot).length, "Tode,", rowsB.filter(r => r["Kill s"] === "nie").length, "ohne Kill");
// C) Items: Waffentypen, Nebenhand, Affixe nach Klasse
const cnt = {}; const offc = {}; let n = 20000; const r = rngFor("items", "pruef");
for (let i = 0; i < n; i++) { const it = generateItem(r, 12, 0, 0); if (it.slot === "waffe") cnt[it.type] = (cnt[it.type] || 0) + 1; if (it.slot === "schild") offc[it.baseId] = (offc[it.baseId] || 0) + 1; }
console.log("C) Waffen nach Typ:", cnt, "Nebenhand:", offc);
const weaponBases = BASES.filter(b => b.slot === "waffe"); console.log("Waffenbasen: nah", weaponBases.filter(b => b.type === "nah").length, "fern", weaponBases.filter(b => b.type === "fern").length, "fokus", weaponBases.filter(b => b.type === "fokus").length, "| Slots gesamt:", Object.entries(BASES.reduce((a, b) => (a[b.slot] = (a[b.slot] || 0) + 1, a), {})).map(([k, v]) => k + " " + v).join(", "));

// D) Zwischenbosse und Endbosse, live, je Klasse mit Waffe plus Sonderangriff/Blutpfeil im Wechsel
import { MINIBOSSES } from "../src/data/minibosses.js";
import { BOSSES } from "../src/game/monsters.js";
function bossDuel(level, build, mb, isBoss) {
  const attackId = build === "krieger" ? "sturmangriff" : build === "jaeger" ? "pfeilhagel" : "blutpfeil";
  const P = makePlayer(level, build, attackId);
  const G = startGame(createGame("boss", P)); G.openPanel = () => {};
  enterScreen(G, "over", 4, 4, 7 * TS + 8, 5 * TS + 8, false); G.mobs = []; G.arenaLock = false;
  const m = makeMob(mb.base, mb.level, P.x + 60, P.y, { ...mb, mini: mb.id || "boss" }); m.spawnDelay = 0; G.mobs = [m];
  const d = derive(P); let t = 0, pots = 3;
  while (!m.dead && t < 120 && !G.dead) {
    const dx = m.x - P.x, dy = m.y - P.y, dist = Math.hypot(dx, dy) || 1; G.aim = { x: dx / dist, y: dy / dist }; P.dir = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? "right" : "left") : (dy > 0 ? "down" : "up");
    let input = { ...idle };
    if (build === "jaeger" || build === "magier") { const inRange = dist < (build === "jaeger" ? d.range - 10 : 140); input = { x: inRange ? (dist < 40 ? -dx / dist : 0) : dx / dist, y: inRange ? (dist < 40 ? -dy / dist : 0) : dy / dist, attack: build === "jaeger" && inRange, cast: false }; if (build === "magier" && inRange && !canCast(G, attackId) && P.hp > d.maxHp * 0.5) castSpell(G, attackId); else if (build === "magier" && inRange && P.mana > 12 && P.spells.includes("feuerball") === false) {} }
    else { const inReach = dist < d.reach + m.size / 2 + 2; input = { x: inReach ? 0 : dx / dist, y: inReach ? 0 : dy / dist, attack: inReach, cast: false }; if (dist < 70 && !canCast(G, attackId)) castSpell(G, attackId); }
    if (build === "magier") { if (P.hp <= d.maxHp * 0.5) { const inReach = dist < d.reach + m.size / 2 + 2; input = { x: inReach ? 0 : dx / dist, y: inReach ? 0 : dy / dist, attack: inReach, cast: false }; } }
    if (P.hp < d.maxHp * 0.35 && pots > 0) { P.hp = Math.min(d.maxHp, P.hp + Math.round(d.maxHp * 0.3)); pots--; }
    update(G, 1 / 60, input); G.transition = null; t += 1 / 60;
  }
  return { win: m.dead, t: t.toFixed(0), died: G.dead, pots: 3 - pots };
}
const rowsD = [];
for (const mb of [MINIBOSSES[0], MINIBOSSES[2], MINIBOSSES[5]]) for (const build of ["krieger", "jaeger", "magier"]) { const r = bossDuel(mb.level + 2, build, mb, false); rowsD.push({ Gegner: mb.name, Stufe: mb.level + 2, Klasse: build, Sieg: r.win ? "ja" : "nein", Sekunden: r.t, tot: r.died, Tränke: r.pots }); }
for (const [id, b] of Object.entries(BOSSES)) for (const build of ["krieger", "jaeger", "magier"]) { const lvl = [8, 15, 29][id]; const r = bossDuel(lvl, build, { ...b, level: lvl - 1 }, true); rowsD.push({ Gegner: b.name, Stufe: lvl, Klasse: build, Sieg: r.win ? "ja" : "nein", Sekunden: r.t, tot: r.died, Tränke: r.pots }); }
console.log("D) Zwischenbosse und Endbosse (ohne Fähigkeiten), Klasse mit Waffe plus Sonderangriff bzw. Blutpfeil, drei Tränke");
console.table(rowsD);
