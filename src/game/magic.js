/* Magie: Zauber wirken, Kosten, Effekte. Blutmagie zahlt mit Leben. */
import { SPELLS, ELEMENTS } from "../data/spells.js";
import { derive, flash, emit } from "./player.js";
import { spellRankMult, knownSpells } from "./skills.js";
export { SPELLS, ELEMENTS };

export function spellDamage(P, spellId) {
  const sp = SPELLS[spellId], d = derive(P);
  const base = sp.element === "blut" ? d.mag + d.atk * 0.5 : d.mag;
  return Math.max(1, base * sp.dmg * spellRankMult(P, spellId) * d.spellMult * (1 + d.blood * (sp.element === "blut" ? 1 : 0)));
}
export function spellCost(P, spellId) {
  const sp = SPELLS[spellId];
  if (sp.bloodCost) return { hp: Math.max(1, Math.round(derive(P).maxHp * sp.bloodCost)) };
  return { mana: sp.cost };
}
export function canCast(G, spellId) {
  const P = G.P, sp = SPELLS[spellId];
  if (!sp || !knownSpells(P).includes(spellId)) return "Nicht gelernt";
  if ((G.spellCd[spellId] || 0) > 0) return "Abklingzeit";
  const c = spellCost(P, spellId);
  if (c.mana !== undefined && P.mana < c.mana) return "Zu wenig Mana";
  if (c.hp !== undefined && P.hp <= c.hp) return "Zu wenig Leben";
  return null;
}
export function selectSpell(P, spellId) {
  if (!knownSpells(P).includes(spellId)) return false;
  P.activeSpell = spellId;
  return true;
}
export function cycleSpell(P, dir = 1) {
  const list = knownSpells(P);
  if (!list.length) return null;
  const i = Math.max(0, list.indexOf(P.activeSpell));
  P.activeSpell = list[(i + dir + list.length) % list.length];
  return P.activeSpell;
}

const DIRV = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };

/* Wirkt den aktiven Zauber. Liefert true, wenn etwas passiert ist. Gegnerkontakt regelt die Engine. */
export function castSpell(G, spellId = G.P.activeSpell) {
  const P = G.P;
  const why = canCast(G, spellId);
  if (why) { if (why !== "Abklingzeit") flash(G, why, "#ffb347"); return false; }
  const sp = SPELLS[spellId];
  const el = ELEMENTS[sp.element];
  const cost = spellCost(P, spellId);
  if (cost.mana !== undefined) P.mana -= cost.mana;
  if (cost.hp !== undefined) {
    P.hp -= cost.hp;
    G.fx.push({ kind: "num", x: P.x, y: P.y - 14, rise: 0, text: "-" + cost.hp, color: el.color, t: 0.9, small: true });
  }
  G.spellCd[spellId] = sp.cd;
  const dmg = spellDamage(P, spellId);
  const d = derive(P);
  let [dx, dy] = DIRV[P.dir] || [0, -1];
  // sanftes Zielen: nächster Gegner im Kegel vor dem Spieler
  const aim = aimAt(G, dx, dy, sp.range || 120);
  if (aim) { dx = aim.x; dy = aim.y; }
  const hit = { spell: spellId, element: sp.element, dmg, crit: Math.random() * 100 < d.crit, burn: sp.burn || 0, slow: sp.slow || 0, knock: sp.knock || 0, leech: sp.leech || 0, heal: sp.heal || 0 };
  if (sp.kind === "bolt") {
    G.pprojs.push({ x: P.x + dx * 6, y: P.y + dy * 6, vx: dx * sp.speed, vy: dy * sp.speed, t: sp.range / sp.speed, kind: "spell", color: el.color, color2: el.color2, pierce: !!sp.pierce, hit: new Set(), ...hit });
  } else if (sp.kind === "nova") {
    G.fx.push({ kind: "ring", x: P.x, y: P.y, r: sp.radius, color: el.color, t: 0.45, maxT: 0.45 });
    G.pending.push({ type: "nova", x: P.x, y: P.y, radius: sp.radius, ...hit });
  } else if (sp.kind === "beam") {
    const len = sp.range;
    G.fx.push({ kind: "beam", x: P.x, y: P.y, x2: P.x + dx * len, y2: P.y + dy * len, color: el.color, t: 0.3, maxT: 0.3 });
    G.pending.push({ type: "beam", x: P.x, y: P.y, dx, dy, len, width: 12, ...hit });
  } else if (sp.kind === "chain") {
    G.pending.push({ type: "chain", x: P.x, y: P.y, range: sp.range, jumps: sp.jumps, color: el.color, ...hit });
  }
  G.castT = 0.25;
  emit(G, "spell", { element: sp.element, kind: sp.kind });
  G.dirty = true;
  return true;
}

/* Zielhilfe: nächster Gegner im Kegel vor dem Spieler (±50°); ist dort keiner, der nächste in Reichweite überhaupt.
   So kann man rückwärts laufen und trotzdem schießen, was auf dem Handy die einzige Art zu kiten ist. */
export function aimAt(G, dx, dy, range) {
  const P = G.P;
  let best = null, bestD = range, any = null, anyD = range;
  for (const m of G.mobs) {
    if (m.dead || m.spawnDelay > 0) continue;
    const mx = m.x - P.x, my = m.y - P.y, dist = Math.hypot(mx, my) || 1;
    if (dist > range) continue;
    const cos = (mx * dx + my * dy) / dist;
    if (cos >= 0.64 && dist < bestD) { best = { x: mx / dist, y: my / dist }; bestD = dist; }
    if (dist < anyD) { any = { x: mx / dist, y: my / dist }; anyD = dist; }
  }
  return best || any;
}
