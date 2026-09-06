/* Skilltree: Punkte, Freischaltung, Rang-Boni */
import { SKILLS, SKILL_ORDER } from "../data/skills.js";
import { SPELLS } from "../data/spells.js";
export { SKILLS, SKILL_ORDER };

export function skillRank(P, id) { return (P.skills && P.skills[id]) || 0; }
export function spentPoints(P) { return Object.values(P.skills || {}).reduce((a, b) => a + b, 0); }
/* Ein Punkt pro Stufe, Stufe 1 eingeschlossen */
export function totalPoints(P) { return P.level; }
export function freePoints(P) { return Math.max(0, totalPoints(P) - spentPoints(P)); }

export function whyNot(P, id) {
  const s = SKILLS[id];
  if (!s) return "Unbekannt";
  const rank = skillRank(P, id);
  if (rank >= s.rank) return "Maximal";
  if (freePoints(P) <= 0) return "Keine Punkte";
  if (s.level && P.level < s.level) return `Ab Stufe ${s.level}`;
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
