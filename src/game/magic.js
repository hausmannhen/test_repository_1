/* Magie: Zauber wirken, Kosten, Effekte. Blutmagie zahlt mit Leben. */
import { SPELLS, ELEMENTS, WEAPON_FOR, WEAPON_OFF } from "../data/spells.js";
import { derive, flash, emit } from "./player.js";
import { spellRankMult, knownSpells } from "./skills.js";
export { SPELLS, ELEMENTS, WEAPON_FOR, WEAPON_OFF };

/* Passt die Waffe zum Zauber? Stab für Magie, Nahkampfwaffe für Krieger, Fernwaffe für Jäger. Sonst nur 60 % Wirkung. */
export function isSpecial(spellId) { const sp = SPELLS[spellId]; return !!sp && !!WEAPON_FOR[sp.element]; }
export function weaponFits(P, spellId) { const sp = SPELLS[spellId]; if (!sp) return false; const want = WEAPON_FOR[sp.element] || "fokus"; return derive(P).weaponType === want; }
export function weaponMult(P, spellId) { return weaponFits(P, spellId) ? 1 : WEAPON_OFF; }

export function spellDamage(P, spellId) {
  const sp = SPELLS[spellId], d = derive(P);
  const wm = weaponMult(P, spellId);
  if (sp.element === "krieger") return Math.max(1, d.atk * d.meleeMult * sp.dmg * spellRankMult(P, spellId) * wm);
  if (sp.element === "jaeger") return Math.max(1, d.atk * d.rangedMult * sp.dmg * spellRankMult(P, spellId) * wm);
  return Math.max(1, d.mag * sp.dmg * spellRankMult(P, spellId) * d.spellMult * wm * (1 + d.blood * (sp.element === "blut" ? 1 : 0)));
}
export function spellCost(P, spellId) {
  const sp = SPELLS[spellId];
  if (sp.bloodCost) return { hp: Math.max(1, Math.round(derive(P).maxHp * sp.bloodCost)) };
  if (sp.cost === undefined) return {};   // Sonderangriffe kosten nichts, nur Abklingzeit
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
  const [dx, dy] = aimDir(G);   // genau in Stockrichtung, keine Zielhilfe
  const hit = { spell: spellId, element: sp.element, dmg, crit: Math.random() * 100 < d.crit, burn: sp.burn || 0, slow: sp.slow || 0, knock: sp.knock || 0, leech: sp.leech || 0, heal: sp.heal || 0 };
  if (sp.healCap && cost.hp !== undefined) { hit.healCap = cost.hp; hit.healed = 0; }   // Aderlass heilt nie mehr, als er gekostet hat
  if (sp.kind === "dash") {
    // Sturmangriff: der Spieler stößt vor, die Engine bewegt ihn und trifft alles auf dem Weg
    G.dash = { t: 0.22, dur: 0.22, dx, dy, speed: sp.dist / 0.22, hit: new Set(), dmg, critChance: d.crit + d.critMelee, knock: sp.knock || 1 };
    G.fx.push({ kind: "ring", x: P.x, y: P.y, r: 14, color: el.color, t: 0.3, maxT: 0.3 });
  } else if (sp.kind === "fan") {
    // Pfeilhagel: Fächer aus Geschossen der ausgerüsteten Fernwaffe, sonst Wurfmesser
    const proj = d.weaponType === "fern" ? d.proj : "messer";
    for (let i = 0; i < sp.count; i++) {
      const a = (i / (sp.count - 1) - 0.5) * sp.spread, ca = Math.cos(a), sa = Math.sin(a);
      const vx = dx * ca - dy * sa, vy = dx * sa + dy * ca;
      G.pprojs.push({ x: P.x + vx * 6, y: P.y + vy * 6, vx: vx * sp.speed, vy: vy * sp.speed, t: sp.range / sp.speed, kind: proj, color: "#e8e2d0", color2: el.color2, dmg, critChance: d.crit + d.critRanged, pierce: !!d.pierce, hit: new Set(), knock: 0.5 });
    }
  } else if (sp.kind === "bolt") {
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
  if (sp.kind === "dash") emit(G, "swing"); else if (sp.kind === "fan") emit(G, "shoot"); else emit(G, "spell", { element: sp.element, kind: sp.kind });
  G.dirty = true;
  return true;
}

/* Richtung für Schüsse und Zauber: zuletzt gedrückte Stockrichtung (auch diagonal), sonst Blickrichtung */
export function aimDir(G) {
  if (G.aim) return [G.aim.x, G.aim.y];
  return DIRV[G.P.dir] || [0, -1];
}
