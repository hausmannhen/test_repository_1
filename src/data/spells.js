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
  krieger:  { name: "Krieger",  color: "#e0b45a", color2: "#8a6a2a" },
  jaeger:   { name: "Jäger",    color: "#8fd3a0", color2: "#3a7a4a" },
};
/* Welche Waffe einen Zauber oder Sonderangriff voll wirken lässt; mit anderer Waffe nur WEAPON_OFF */
export const WEAPON_FOR = { krieger: "nah", jaeger: "fern" };
export const WEAPON_OFF = 0.6;

export const SPELLS = {
  feuerball:    { id: "feuerball",    name: "Feuerball",    element: "feuer",    kind: "bolt",  cost: 12, dmg: 1.6, speed: 200, range: 150, cd: 1.0, burn: 3,    desc: "Geschoss, setzt das Ziel in Brand." },
  eissplitter:  { id: "eissplitter",  name: "Eissplitter",  element: "eis",      kind: "bolt",  cost: 10, dmg: 1.2, speed: 240, range: 140, cd: 0.8, slow: 2.5, desc: "Schnelles Geschoss, verlangsamt das Ziel." },
  blitzschlag:  { id: "blitzschlag",  name: "Blitzschlag",  element: "blitz",    kind: "chain", cost: 16, dmg: 1.3, range: 110, jumps: 3, cd: 1.3,           desc: "Trifft sofort und springt auf bis zu drei Gegner." },
  erdstoss:     { id: "erdstoss",     name: "Erdstoß",      element: "erde",     kind: "nova",  cost: 18, dmg: 1.4, radius: 48, cd: 1.8, knock: 1.6,        desc: "Stößt alle Gegner um dich herum zurück." },
  windschnitt:  { id: "windschnitt",  name: "Windschnitt",  element: "wind",     kind: "bolt",  cost: 9,  dmg: 1.0, speed: 300, range: 160, cd: 0.6, pierce: true, desc: "Durchschlägt alle Gegner in einer Linie." },
  wasserwoge:   { id: "wasserwoge",   name: "Wasserwoge",   element: "wasser",   kind: "nova",  cost: 14, dmg: 1.2, radius: 40, cd: 1.5, slow: 2,           desc: "Welle um dich herum, verlangsamt Getroffene." },
  lichtstrahl:  { id: "lichtstrahl",  name: "Lichtstrahl",  element: "licht",    kind: "beam",  cost: 15, dmg: 1.5, range: 130, cd: 1.2, heal: 0.15,        desc: "Strahl in Blickrichtung, heilt dich um einen Teil des Schadens." },
  schattengriff:{ id: "schattengriff",name: "Schattengriff",element: "schatten", kind: "bolt",  cost: 13, dmg: 1.4, speed: 180, range: 130, cd: 1.0, leech: 0.3, desc: "Geschoss, zieht Leben aus dem Ziel." },
  blutpfeil:    { id: "blutpfeil",    name: "Blutpfeil",    element: "blut",     kind: "bolt",  bloodCost: 0.10, dmg: 2.6, speed: 260, range: 160, cd: 1.0, desc: "Kostet 10 % deines Lebens, dafür großer Schaden." },
  aderlass:     { id: "aderlass",     name: "Aderlass",     element: "blut",     kind: "nova",  bloodCost: 0.15, dmg: 3.0, radius: 56, cd: 2.2, leech: 0.2, healCap: true, desc: "Kostet 15 % deines Lebens. Trifft alle um dich herum, heilt je Treffer ein Fünftel des Schadens, höchstens die Kosten." },
};
SPELLS.sturmangriff = { id: "sturmangriff", name: "Sturmangriff", element: "krieger", kind: "dash", dmg: 2.6, dist: 64, cd: 5, knock: 1.4, desc: "Vorstoß in Stockrichtung, trifft alles auf dem Weg. Kostet nichts. Nur mit Nahkampfwaffe." };
SPELLS.pfeilhagel   = { id: "pfeilhagel",   name: "Pfeilhagel",   element: "jaeger",  kind: "fan",  dmg: 1.2, count: 5, spread: 0.38, range: 150, speed: 260, cd: 6, desc: "Fünf Geschosse im Fächer. Kostet nichts. Nur mit Fernwaffe." };
export const SPELL_ORDER = Object.keys(SPELLS);
