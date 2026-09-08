/* Überfall: Monster stürmen das Dorf in Wellen, der Brunnen muss halten. Ausgänge sind mit Palisaden gesperrt. */
import { TS, VW, VH, REGIONS } from "./constants.js";
import { rngFor, rint, pick } from "./rng.js";
import { makeMob } from "./monsters.js";
import { emit } from "./player.js";
import { onRaidEnd } from "./quests.js";

export const WELL = { x: 7 * TS + 8, y: 4 * TS + 8 };          // der Brunnen in der Dorfmitte
export const GATES = [                                          // Ausgänge, dort spawnen die Wellen
  { x: 7 * TS + 8, y: 1 * TS + 8 }, { x: 7 * TS + 8, y: (VH - 2) * TS + 8 },
  { x: 1 * TS + 8, y: 5 * TS + 8 }, { x: (VW - 2) * TS + 8, y: 5 * TS + 8 },
];
export const PAUSE = 5;

export function raidActive(G) { return !!(G.raid && G.raid.state !== "done"); }

/* level: Schwierigkeit (1 = erster Überfall), waves: Anzahl Wellen */
export function startRaid(G, { level = 1, waves = 3, questId = null } = {}) {
  const P = G.P, screen = G.screen;
  if (!screen || !screen.village) return false;
  const reg = REGIONS[screen.region] || REGIONS.wiese;
  // Stärke nach Spielerstufe: mindestens Gebietsstufe, sonst rund 80 % der Spielerstufe, plus Schwierigkeit
  const mobLevel = Math.max(1, reg.level + level, Math.floor(P.level * 0.8) + level);
  G.raid = { state: "pause", wave: 0, waves, level, mobLevel, pool: reg.mobs, t: 2.5, wellHp: 100 + level * 25, wellMax: 100 + level * 25, questId, kills: 0, seed: G.seed + ":raid" + (P.raids || 0) };
  G.mobs = []; G.projs = []; G.pprojs = []; G.drops = [];
  G.banner = { text: "Überfall", sub: `${waves} Wellen. Halte den Brunnen.`, t: 3 };
  emit(G, "fanfare");
  G.dirty = true;
  return true;
}

function spawnWave(G) {
  const R = G.raid;
  R.wave++; R.state = "wave";
  const r = rngFor(R.seed, "welle" + R.wave);
  const count = 3 + R.wave * 2 + Math.floor(R.level * 1.5);
  for (let i = 0; i < count; i++) {
    const g = GATES[i % GATES.length];
    const type = pick(r, R.pool);
    const m = makeMob(type, R.mobLevel + rint(r, 0, 2), g.x + rint(r, -6, 6), g.y + rint(r, -6, 6));
    m.raid = true; m.spawnDelay = Math.floor(i / GATES.length) * 0.8;
    G.mobs.push(m);
  }
  // Anführer in der letzten Welle
  if (R.wave === R.waves) {
    const g = GATES[rint(r, 0, GATES.length - 1)];
    const type = pick(r, R.pool);
    const boss = makeMob(type, R.mobLevel + 3, g.x, g.y, { name: "Anführer der Horde", hpMult: 3 + R.level * 0.5, atkMult: 1.3, size: 16, color: "#c83a2a", color2: "#3a0a0a", leader: true });
    boss.raid = true; boss.spawnDelay = 2;
    G.mobs.push(boss);
  }
  G.banner = { text: `Welle ${R.wave} von ${R.waves}`, sub: R.wave === R.waves ? "Der Anführer kommt" : `${count} Angreifer`, t: 2.5 };
  emit(G, "swing");
  G.dirty = true;
}

/* Pro Frame: Wellen, Brunnen, Ende */
export function updateRaid(G, dt) {
  const R = G.raid;
  if (!R || R.state === "done") return;
  if (R.state === "pause") {
    R.t -= dt;
    if (R.t <= 0) spawnWave(G);
    return;
  }
  // Monster erst nach Verzögerung aktiv (sie kommen nacheinander durchs Tor)
  for (const m of G.mobs) if (m.spawnDelay > 0) m.spawnDelay -= dt;
  // Brunnen nimmt Schaden von Monstern im Kontakt
  let dmg = 0;
  for (const m of G.mobs) {
    if (m.dead || m.spawnDelay > 0) continue;
    if (Math.hypot(m.x - WELL.x, m.y - WELL.y) < m.size / 2 + 14) dmg += m.atk * 0.25 * dt;
  }
  if (dmg > 0) { R.wellHp = Math.max(0, R.wellHp - dmg); if (Math.floor(R.wellHp / 10) !== Math.floor((R.wellHp + dmg) / 10)) emit(G, "hurt"); }
  if (R.wellHp <= 0) return endRaid(G, false);
  if (G.mobs.every(m => m.dead)) {
    if (R.wave >= R.waves) return endRaid(G, true);
    R.state = "pause"; R.t = PAUSE;
    G.banner = { text: "Welle überstanden", sub: `Nächste in ${PAUSE} Sekunden`, t: 2.5 };
    // Brunnen erholt sich etwas
    R.wellHp = Math.min(R.wellMax, R.wellHp + R.wellMax * 0.15);
  }
}

export function endRaid(G, won) {
  const R = G.raid;
  R.state = "done"; R.won = won;
  G.mobs = G.mobs.filter(m => !m.raid);
  G.projs = [];
  if (won) {
    G.P.raids = (G.P.raids || 0) + 1;
    G.banner = { text: "Dorf gehalten", sub: "Die Palisaden fallen. Bram wartet.", t: 4 };
    emit(G, "fanfare");
  } else {
    G.banner = { text: "Der Brunnen ist gefallen", sub: "Die Horde zieht ab. Versuch es noch einmal.", t: 4 };
    emit(G, "hurt");
  }
  onRaidEnd(G, won);
  G.dirty = true;
  return true;
}

/* Ziel eines Monsters im Überfall: Spieler in der Nähe, sonst der Brunnen */
export function raidTarget(G, m) {
  const P = G.P;
  const dp = Math.hypot(P.x - m.x, P.y - m.y);
  if (dp < 48 || m.ai === "ranged") return { x: P.x, y: P.y, player: true };
  return { x: WELL.x, y: WELL.y, player: false };
}
