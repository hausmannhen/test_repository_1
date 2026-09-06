/* Zauber: alle Elemente plus Blutmagie. Schaden = mag × dmg × Rangbonus.
   kind: bolt (Geschoss), nova (Ring um den Spieler), beam (Strahl in Blickrichtung), chain (springt zwischen Gegnern).
   cost: Mana. Blutmagie kostet stattdessen Leben (bloodCost = Anteil des maximalen Lebens). */
export const ELEMENTS = {
  feuer:    { name: "Feuer",    color: "#ff7a2a", color2: "#ffd23f" },
  eis:      { name: "Eis",      color: "#9ad8ff", color2: "#ffffff" },
  blitz:    { name: "Blitz",    color: "#f5f07a", color2: "#ffffff" },
  erde:     { name: "Erde",     color: "#b08a4a", color2: "#6a4a2a" },
  wind:     { name: "Wind",     color: "#c8f0e0", color2: "#8ad0b0" },
  wasser:   { name: "Wasser",   color: "#4a8ae0", color2: "#a0d0ff" },
  licht:    { name: "Licht",    color: "#fff4c0", color2: "#ffffff" },
  schatten: { name: "Schatten", color: "#6a3a9a", color2: "#20102a" },
  blut:     { name: "Blut",     color: "#c81e2e", color2: "#5a0a10" },
};

export const SPELLS = {
  feuerball:    { id: "feuerball",    name: "Feuerball",    element: "feuer",    kind: "bolt",  cost: 12, dmg: 1.6, speed: 200, range: 150, cd: 0.6, burn: 3,    desc: "Geschoss, setzt das Ziel in Brand." },
  eissplitter:  { id: "eissplitter",  name: "Eissplitter",  element: "eis",      kind: "bolt",  cost: 10, dmg: 1.2, speed: 240, range: 140, cd: 0.45, slow: 2.5, desc: "Schnelles Geschoss, verlangsamt das Ziel." },
  blitzschlag:  { id: "blitzschlag",  name: "Blitzschlag",  element: "blitz",    kind: "chain", cost: 16, dmg: 1.3, range: 110, jumps: 3, cd: 0.8,           desc: "Trifft sofort und springt auf bis zu drei Gegner." },
  erdstoss:     { id: "erdstoss",     name: "Erdstoß",      element: "erde",     kind: "nova",  cost: 18, dmg: 1.4, radius: 48, cd: 1.1, knock: 1.6,        desc: "Stößt alle Gegner um dich herum zurück." },
  windschnitt:  { id: "windschnitt",  name: "Windschnitt",  element: "wind",     kind: "bolt",  cost: 9,  dmg: 1.0, speed: 300, range: 160, cd: 0.35, pierce: true, desc: "Durchschlägt alle Gegner in einer Linie." },
  wasserwoge:   { id: "wasserwoge",   name: "Wasserwoge",   element: "wasser",   kind: "nova",  cost: 14, dmg: 0.9, radius: 40, cd: 0.9, slow: 2,           desc: "Welle um dich herum, verlangsamt Getroffene." },
  lichtstrahl:  { id: "lichtstrahl",  name: "Lichtstrahl",  element: "licht",    kind: "beam",  cost: 15, dmg: 1.5, range: 130, cd: 0.7, heal: 0.15,        desc: "Strahl in Blickrichtung, heilt dich um einen Teil des Schadens." },
  schattengriff:{ id: "schattengriff",name: "Schattengriff",element: "schatten", kind: "bolt",  cost: 13, dmg: 1.4, speed: 180, range: 130, cd: 0.6, leech: 0.3, desc: "Geschoss, zieht Leben aus dem Ziel." },
  blutpfeil:    { id: "blutpfeil",    name: "Blutpfeil",    element: "blut",     kind: "bolt",  bloodCost: 0.08, dmg: 2.6, speed: 260, range: 160, cd: 0.5, desc: "Kostet 8 % deines Lebens, dafür großer Schaden." },
  aderlass:     { id: "aderlass",     name: "Aderlass",     element: "blut",     kind: "nova",  bloodCost: 0.15, dmg: 3.0, radius: 56, cd: 1.4, leech: 0.5, desc: "Kostet 15 % deines Lebens. Trifft alle um dich herum, heilt je Treffer." },
};
export const SPELL_ORDER = Object.keys(SPELLS);
