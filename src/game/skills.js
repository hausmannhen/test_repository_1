/* Skilltree: Punkte, Freischaltung, Rang-Boni */
import { SKILLS, SKILL_ORDER } from "../data/skills.js";
import { SPELLS } from "../data/spells.js";
export { SKILLS, SKILL_ORDER };

export function skillRank(P, id) { return (P.skills && P.skills[id]) || 0; }
export function spentPoints(P) { return Object.values(P.skills || {}).reduce((a, b) => a + b, 0); }
/* Ein Punkt alle drei Stufen: Stufe 3, 6, 9, … */
export const POINT_EVERY = 3;
export function totalPoints(P) { return Math.floor(P.level / POINT_EVERY); }
export function freePoints(P) { return Math.max(0, totalPoints(P) - spentPoints(P)); }

/* Mindeststufe für einen Rang: Grundstufe des Knotens, dann je weiterer Rang fünf Stufen mehr */
/* Ränge: mindestens RANK_STEP Stufen nach der Freischaltung, und nie vor Stufe 10 (Rang 2) bzw. 20 (Rang 3) */
export const RANK_STEP = 6;
export const RANK_FLOOR = [1, 10, 20];
export function levelForRank(id, rank) { const s = SKILLS[id]; return Math.max((s.level || 1) + (rank - 1) * RANK_STEP, RANK_FLOOR[rank - 1] || 1); }
export function whyNot(P, id) {
  const s = SKILLS[id];
  if (!s) return "Unbekannt";
  const rank = skillRank(P, id);
  if (rank >= s.rank) return "Maximal";
  if (freePoints(P) <= 0) return "Keine Punkte";
  const need = levelForRank(id, rank + 1);
  if (P.level < need) return rank === 0 ? `Ab Stufe ${need}` : `Rang ${rank + 1} ab Stufe ${need}`;
  for (const req of s.requires || []) if (skillRank(P, req) < 1) return `Braucht ${SKILLS[req].name}`;
  return null;
}
export function canLearn(P, id) { return whyNot(P, id) === null; }
export function learn(P, id) {
  if (!canLearn(P, id)) return false;
  if (!P.skills) P.skills = {};
  P.skills[id] = skillRank(P, id) + 1;
  const s = SKILLS[id];
  if (s.spell) {
    if (!P.spells) P.spells = [];
    if (!P.spells.includes(s.spell)) P.spells.push(s.spell);
    if (!P.activeSpell) P.activeSpell = s.spell;
  }
  return true;
}
/* Alle Punkte zurücksetzen (Weise) */
export function respec(P) {
  P.skills = {}; P.spells = []; P.activeSpell = null;
}

/* Boni aus dem Baum */
export function skillBonuses(P) {
  const r = (id) => skillRank(P, id);
  return {
    meleeMult: 1 + r("kraft") * 0.06,
    rangedMult: 1 + r("zielen") * 0.06,
    spellMult: 1 + r("arkanmacht") * 0.08,
    hp: r("zaehigkeit") * 8,
    def: r("eisenhaut") * 2,
    critMelee: r("raserei") * 5,
    critRanged: r("adlerauge") * 4,
    rangeBonus: r("adlerauge") * 20,
    rateMult: 1 - r("schnellhand") * 0.1,
    mana: r("manaquelle") * 12,
    manaRegen: r("meditation"),
    sweep: r("wirbel") > 0,
    doubleShot: r("doppelschuss") > 0,
    pierce: r("durchschlag") > 0,
  };
}
/* Schadensfaktor eines Zaubers aus dem Rang seines Elementknotens */
export function spellRankMult(P, spellId) {
  const node = Object.values(SKILLS).find(s => s.spell === spellId);
  if (!node) return 1;
  return 1 + Math.max(0, skillRank(P, node.id) - 1) * 0.25;
}
export function knownSpells(P) { return (P.spells || []).filter(id => SPELLS[id]); }
