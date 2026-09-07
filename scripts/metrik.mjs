/* Balance-Metrik: Treffer bis Monster tot und Monstertreffer bis Spieler tot, je Stufe und Ausrüstung. node scripts/metrik.mjs */
import { REGIONS } from "../src/game/constants.js";
import { generateItem } from "../src/game/items.js";
import { makeMob, MOBS, BOSSES } from "../src/game/monsters.js";
import { derive, newPlayer, xpNeed } from "../src/game/player.js";
import { damageFactor } from "../src/game/engine.js";
import { rngFor } from "../src/game/rng.js";
const SLOTS = ["waffe", "kopf", "rumpf", "schild", "amulett", "ring"];
function gear(P, ilvl, rarity, upg, n = 40) {
  // Mittelwert über n Zufallssets, Nahkampfwaffe erzwungen
  const acc = { atk: 0, def: 0, maxHp: 0, crit: 0 };
  for (let i = 0; i < n; i++) {
    const r = rngFor("metrik", `${ilvl}:${rarity}:${i}`);
    P.equip = {};
    for (const s of SLOTS) { let it; do { it = generateItem(r, ilvl, 0, rarity, s); } while (s === "waffe" && it.type !== "nah"); it.upg = upg; P.equip[s] = it; }
    const d = derive(P); acc.atk += d.atk; acc.def += d.def; acc.maxHp += d.maxHp; acc.crit += d.crit;
  }
  for (const k in acc) acc[k] /= n; return acc;
}
function regionFor(L) { let best = REGIONS.wiese; for (const r of Object.values(REGIONS)) if (r.level <= L && r.level >= best.level) best = r; return best; }
const rows = [];
for (const L of [1, 3, 5, 8, 10, 13, 15, 18, 20, 23, 26, 30]) {
  const P = newPlayer("m"); P.level = L; P.hearts = L >= 27 ? 3 : L >= 14 ? 2 : L >= 7 ? 1 : 0;
  const base = derive(P);
  const reg = regionFor(L);
  const mobs = reg.mobs.map(id => makeMob(id, L, 0, 0));
  const mhp = mobs.reduce((a, m) => a + m.maxHp, 0) / mobs.length, matk = mobs.reduce((a, m) => a + m.atk, 0) / mobs.length;
  const tiers = { nackt: null, typisch: gear(P, L, 1, 0), gut: gear(P, L + 2, 2, 2), gluecklich: gear(P, L + 3, 4, 5) };
  const row = { Stufe: L, Gebiet: reg.name.split(" ")[0], MobHP: Math.round(mhp), MobATK: Math.round(matk) };
  for (const [name, g] of Object.entries(tiers)) {
    const s = g || base;
    const dmg = s.atk * (1 + s.crit / 100);          // Schnitt je Treffer inkl. Krit (x2)
    const htk = mhp / dmg;                            // Treffer bis Mob tot
    const taken = Math.max(1, matk * damageFactor(s.def));    // Schaden je Mobtreffer
    const mhtk = s.maxHp / taken;                     // Mobtreffer bis Spieler tot
    row[name] = `${htk.toFixed(1)} / ${mhtk.toFixed(0)}`;
  }
  rows.push(row);
}
console.log("Spalten: Treffer bis Mob tot / Mobtreffer bis Spieler tot. Ausrüstung: nackt | typisch (ungewöhnlich, Stufe L) | gut (selten, L+2, +2) | glücklich (legendär, L+3, +5)");
console.table(rows);
// Bosse gegen typische Ausrüstung der Dungeonstufe
const bossRows = [];
for (const [id, b] of Object.entries(BOSSES)) {
  const lvl = [8, 15, 29][id]; const P = newPlayer("b"); P.level = lvl; P.hearts = +id;
  const boss = makeMob(b.base, [8, 15, 29][id], 0, 0, b);
  for (const [name, g] of Object.entries({ typisch: gear(P, lvl, 1, 0), gut: gear(P, lvl + 2, 2, 2), gluecklich: gear(P, lvl + 3, 4, 5) })) {
    const dmg = g.atk * (1 + g.crit / 100), taken = Math.max(1, boss.atk * damageFactor(g.def));
    bossRows.push({ Boss: b.name, Stufe: lvl, Ausrüstung: name, BossHP: boss.maxHp, "Treffer bis Boss tot": (boss.maxHp / dmg).toFixed(0), "Bosstreffer bis tot": (g.maxHp / taken).toFixed(1) });
  }
}
console.table(bossRows);
// XP-Kurve: Kills je Stufe
const xpRows = [];
for (const L of [1, 3, 5, 8, 10, 15, 20, 25, 30]) { const reg = regionFor(L); const m = makeMob(reg.mobs[0], L, 0, 0); xpRows.push({ Stufe: L, "XP nötig": xpNeed(L), "XP je Mob": m.xp, "Kills je Stufe": (xpNeed(L) / m.xp).toFixed(1) }); }
console.table(xpRows);
