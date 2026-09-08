/* Fähigkeiten für Bosse und Zwischenbosse. Jede wird angekündigt (Telegraph), dann ausgeführt.
   kind: nova (um den Boss), zone (am Spieler), beam (vom Boss zum Spieler), summon, enrage (einmalig ab hp-Anteil), leap (Sprung zum Spieler) */
export const ABILITIES = {
  stampfer: { id: "stampfer", name: "Bodenstampfer", kind: "nova", cd: 6,  tele: 0.9, radius: 52, dmg: 1.3, knock: 2.2, color: "#b08a4a", range: 70 },
  wurzeln:  { id: "wurzeln",  name: "Wurzelschlag",  kind: "zone", cd: 5,  tele: 1.0, radius: 26, dmg: 1.4, color: "#5aa06a", range: 170 },
  odem:     { id: "odem",     name: "Feuerodem",     kind: "beam", cd: 7,  tele: 0.9, length: 130, width: 18, dmg: 1.6, color: "#ff7a2a", range: 140 },
  frost:    { id: "frost",    name: "Frostnova",     kind: "nova", cd: 7,  tele: 1.0, radius: 60, dmg: 0.9, slow: 3, color: "#9ad8ff", range: 80 },
  sprung:   { id: "sprung",   name: "Sprung",        kind: "leap", cd: 5,  tele: 0.7, radius: 30, dmg: 1.2, color: "#8a8f96", range: 160 },
  glut:     { id: "glut",     name: "Glutregen",     kind: "zone", cd: 6,  tele: 1.0, radius: 34, dmg: 1.5, color: "#ff4a1a", range: 180 },
  ruf:      { id: "ruf",      name: "Ruf",           kind: "summon", once: 0.5, count: 2, color: "#c77dff" },
  wut:      { id: "wut",      name: "Raserei",       kind: "enrage", once: 0.3, spdMult: 1.4, atkMult: 1.25, color: "#ff2a2a" },
};
/* Endbosse: drei Fähigkeiten, davon mindestens zwei aktive Angriffe, plus Phasen */
export const BOSS_ABILITIES = {
  0: ["wurzeln", "stampfer", "ruf"],   // Eichenkönig: Wurzelschlag am Spieler, Bodenstampfer, ruft Spinnen
  1: ["stampfer", "sprung", "wut"],    // Gebirgswächter: Bodenstampfer, Sprung, Raserei ab 30 %
  2: ["odem", "stampfer", "glut"],     // Vargor: Feuerodem, Stampfer, Glutregen, dazu die Phasen
};
/* Zwischenbosse: eine Fähigkeit */
export const MINI_ABILITIES = {
  alpha: ["sprung"], spinnenmutter: ["ruf"], felsbrecher: ["stampfer"], matriarchin: ["wurzeln"], grelda: ["ruf"], frostfuerst: ["frost"], glutfuerst: ["odem"],
  rattenkoenig: ["ruf"], moosgeist: ["wurzeln"], steinschwinge: ["sprung"], hauptmann: ["sprung"], moorkoenig: ["stampfer"], eisfang: ["frost"], aschebrut: ["odem"],
};
