/* Zwischenbosse: je Region ein Revier auf einem festen Bildschirm. Einmal besiegt, kehren sie nicht zurück. */
export const MINIBOSSES = [
  { id: "alpha",      name: "Grauwolf-Alpha",       base: "wolf",        screen: "3,4", level: 3,  hpMult: 4,   atkMult: 1.2, size: 15, color: "#6a7078", color2: "#2a2e34", region: "wiese" },
  { id: "spinnenmutter", name: "Spinnenmutter",     base: "spinne",      screen: "1,8", level: 6,  hpMult: 4.5, atkMult: 1.25, size: 18, color: "#2a1a3a", color2: "#ff4a8a", region: "wald" },
  { id: "felsbrecher", name: "Felsbrecher",          base: "golem",       screen: "3,2", level: 10, hpMult: 3.5, atkMult: 1.3, size: 19, color: "#6a6458", color2: "#2a2620", region: "berg" },
  { id: "matriarchin", name: "Sandwurm-Matriarchin", base: "sandwurm",    screen: "9,5", level: 14, hpMult: 3.5, atkMult: 1.25, size: 20, color: "#c9b06a", color2: "#6a5a26", region: "wueste" },
  { id: "grelda",     name: "Moorhexe Grelda",       base: "hexe",        screen: "8,7", level: 17, hpMult: 4,   atkMult: 1.3, size: 15, color: "#3a5a2a", color2: "#101a0a", region: "sumpf" },
  { id: "frostfuerst", name: "Frostfürst",           base: "schamane",    screen: "3,0", level: 21, hpMult: 4,   atkMult: 1.3, size: 16, color: "#4a6fb0", color2: "#1a2440", region: "eis" },
  { id: "glutfuerst", name: "Feuerteufel-Fürst",     base: "feuerteufel", screen: "7,1", level: 26, hpMult: 4,   atkMult: 1.35, size: 17, color: "#ff5a1a", color2: "#6a1000", region: "vulkan" },
];
export const MINIBOSS_BY_ID = Object.fromEntries(MINIBOSSES.map(m => [m.id, m]));
export const MINIBOSS_BY_SCREEN = Object.fromEntries(MINIBOSSES.map(m => [m.screen, m]));
