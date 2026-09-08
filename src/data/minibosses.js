/* Zwischenbosse: je Region ein Revier auf einem festen Bildschirm. Einmal besiegt, kehren sie nicht zurück. */
export const MINIBOSSES = [
  { id: "alpha",      name: "Grauwolf-Alpha",       base: "wolf",        screen: "3,4", level: 3,  hpMult: 5,   atkMult: 1.6, size: 15, color: "#6a7078", color2: "#2a2e34", region: "wiese" },
  { id: "spinnenmutter", name: "Spinnenmutter",     base: "spinne",      screen: "1,8", level: 6,  hpMult: 5.5, atkMult: 1.6, size: 18, color: "#2a1a3a", color2: "#ff4a8a", region: "wald" },
  { id: "felsbrecher", name: "Felsbrecher",          base: "golem",       screen: "3,2", level: 10, hpMult: 4.5, atkMult: 1.6, size: 19, color: "#6a6458", color2: "#2a2620", region: "berg" },
  { id: "matriarchin", name: "Sandwurm-Matriarchin", base: "sandwurm",    screen: "9,5", level: 14, hpMult: 4.5, atkMult: 1.6, size: 20, color: "#c9b06a", color2: "#6a5a26", region: "wueste" },
  { id: "grelda",     name: "Moorhexe Grelda",       base: "hexe",        screen: "8,7", level: 17, hpMult: 5,   atkMult: 1.7, size: 15, color: "#3a5a2a", color2: "#101a0a", region: "sumpf" },
  { id: "frostfuerst", name: "Frostfürst",           base: "schamane",    screen: "3,0", level: 21, hpMult: 5,   atkMult: 1.7, size: 16, color: "#4a6fb0", color2: "#1a2440", region: "eis" },
  { id: "glutfuerst", name: "Feuerteufel-Fürst",     base: "feuerteufel", screen: "7,1", level: 26, hpMult: 5,   atkMult: 1.7, size: 17, color: "#ff5a1a", color2: "#6a1000", region: "vulkan" },
  // Reviere ohne Aufgabe: Beute, Erfahrung und ein Name auf der Karte
  { id: "rattenkoenig", name: "Rattenkönig",          base: "ratte",       screen: "5,6", level: 4,  hpMult: 5,   atkMult: 1.5, size: 14, color: "#7a5a45", color2: "#3a2418", region: "wiese" },
  { id: "moosgeist",  name: "Moosgeist",              base: "waldgeist",   screen: "0,5", level: 7,  hpMult: 5,   atkMult: 1.6, size: 16, color: "#5fbf8a", color2: "#1f5a40", region: "wald" },
  { id: "steinschwinge", name: "Steinschwinge",       base: "fledermaus",  screen: "5,1", level: 11, hpMult: 4.5, atkMult: 1.6, size: 15, color: "#8a7aa0", color2: "#3a2e50", region: "berg" },
  { id: "hauptmann",  name: "Banditenhauptmann",      base: "bandit",      screen: "9,3", level: 15, hpMult: 4.5, atkMult: 1.6, size: 14, color: "#d08a3a", color2: "#5c3a18", region: "wueste" },
  { id: "moorkoenig", name: "Moorkönig",              base: "sumpfschrat", screen: "5,9", level: 18, hpMult: 5,   atkMult: 1.7, size: 18, color: "#6a7a48", color2: "#1e2a14", region: "sumpf" },
  { id: "eisfang",    name: "Eisfang",                base: "eiswolf",     screen: "1,2", level: 22, hpMult: 5,   atkMult: 1.7, size: 16, color: "#e0f0ff", color2: "#5a8ab0", region: "eis" },
  { id: "aschebrut",  name: "Aschebrut",              base: "drache",      screen: "9,2", level: 27, hpMult: 5,   atkMult: 1.7, size: 19, color: "#ff7a3a", color2: "#3a0a0a", region: "vulkan" },
];
export const MINIBOSS_BY_ID = Object.fromEntries(MINIBOSSES.map(m => [m.id, m]));
export const MINIBOSS_BY_SCREEN = Object.fromEntries(MINIBOSSES.map(m => [m.screen, m]));
