/* Skilltree: ein Punkt alle drei Stufen. Drei Zweige: Krieger, Jäger, Magie (Elemente, Blutmagie).
   rank: maximale Stufe des Knotens. requires: Knoten-IDs, die mindestens Rang 1 haben müssen. level: Mindeststufe.
   Elementknoten schalten mit Rang 1 den Zauber frei, höhere Ränge geben +25 % Schaden je Rang. */
export const BRANCHES = { krieger: "Krieger", jaeger: "Jäger", magie: "Magie" };

export const SKILLS = {
  // Krieger
  kraft:        { id: "kraft",        branch: "krieger", name: "Kraft",           rank: 5, desc: "+6 % Nahkampfschaden je Rang." },
  zaehigkeit:   { id: "zaehigkeit",   branch: "krieger", name: "Zähigkeit",       rank: 5, desc: "+8 Leben je Rang." },
  wirbel:       { id: "wirbel",       branch: "krieger", name: "Wirbelhieb",      rank: 1, requires: ["kraft"], level: 4, desc: "Nahkampfangriffe treffen rundum." },
  eisenhaut:    { id: "eisenhaut",    branch: "krieger", name: "Eisenhaut",       rank: 3, requires: ["zaehigkeit"], desc: "+2 Verteidigung je Rang." },
  sturmangriff: { id: "sturmangriff", branch: "krieger", name: "Sturmangriff",    rank: 3, spell: "sturmangriff", level: 3, requires: ["kraft"] },
  raserei:      { id: "raserei",      branch: "krieger", name: "Raserei",         rank: 3, requires: ["wirbel"], level: 8, desc: "+5 % Krit je Rang bei Nahkampf." },
  // Jäger
  zielen:       { id: "zielen",       branch: "jaeger",  name: "Zielen",          rank: 5, desc: "+6 % Fernkampfschaden je Rang." },
  schnellhand:  { id: "schnellhand",  branch: "jaeger",  name: "Schnelle Hand",   rank: 3, desc: "Fernwaffen schießen 10 % schneller je Rang." },
  doppelschuss: { id: "doppelschuss", branch: "jaeger",  name: "Doppelschuss",    rank: 1, requires: ["zielen"], level: 5, desc: "Jeder Schuss feuert zwei Geschosse." },
  durchschlag:  { id: "durchschlag",  branch: "jaeger",  name: "Durchschlag",     rank: 1, requires: ["schnellhand"], level: 7, desc: "Geschosse durchschlagen Gegner." },
  pfeilhagel:   { id: "pfeilhagel",   branch: "jaeger",  name: "Pfeilhagel",      rank: 3, spell: "pfeilhagel", level: 3, requires: ["zielen"] },
  adlerauge:    { id: "adlerauge",    branch: "jaeger",  name: "Adlerauge",       rank: 3, requires: ["doppelschuss"], desc: "+20 Reichweite und +4 % Krit je Rang." },
  // Magie: Grundlagen
  manaquelle:   { id: "manaquelle",   branch: "magie",   name: "Manaquelle",      rank: 5, desc: "+12 Mana je Rang." },
  meditation:   { id: "meditation",   branch: "magie",   name: "Meditation",      rank: 3, desc: "+1 Mana je Sekunde je Rang." },
  arkanmacht:   { id: "arkanmacht",   branch: "magie",   name: "Arkane Macht",    rank: 5, requires: ["manaquelle"], desc: "+8 % Zauberschaden je Rang." },
  // Magie: Elemente
  feuer:        { id: "feuer",        branch: "magie",   name: "Feuer",           rank: 3, spell: "feuerball" },
  eis:          { id: "eis",          branch: "magie",   name: "Eis",             rank: 3, spell: "eissplitter" },
  blitz:        { id: "blitz",        branch: "magie",   name: "Blitz",           rank: 3, spell: "blitzschlag", level: 3 },
  erde:         { id: "erde",         branch: "magie",   name: "Erde",            rank: 3, spell: "erdstoss", level: 3 },
  wind:         { id: "wind",         branch: "magie",   name: "Wind",            rank: 3, spell: "windschnitt" },
  wasser:       { id: "wasser",       branch: "magie",   name: "Wasser",          rank: 3, spell: "wasserwoge", level: 3 },
  licht:        { id: "licht",        branch: "magie",   name: "Licht",           rank: 3, spell: "lichtstrahl", level: 6, requires: ["arkanmacht"] },
  schatten:     { id: "schatten",     branch: "magie",   name: "Schatten",        rank: 3, spell: "schattengriff", level: 6, requires: ["arkanmacht"] },
  // Blutmagie
  blutmagie:    { id: "blutmagie",    branch: "magie",   name: "Blutmagie",       rank: 3, spell: "blutpfeil", level: 8, desc: "Zauber aus dem eigenen Leben. Schaden skaliert mit Magie." },
  aderlass:     { id: "aderlass",     branch: "magie",   name: "Aderlass",        rank: 3, spell: "aderlass", level: 12, requires: ["blutmagie"] },
};
export const SKILL_ORDER = Object.keys(SKILLS);
