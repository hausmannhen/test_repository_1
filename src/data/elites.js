/* Elite-Gegner: gewöhnliche Monster mit einer Eigenschaft. Selten, sichtbar an der Aura, bessere Beute. */
export const ELITES = {
  zaeh:     { id: "zaeh",     name: "Zäher",     color: "#c8c8c8", hpMult: 2.5, atkMult: 1.0, spdMult: 1.15, desc: "doppelt so viel Leben, etwas schneller" },
  wuetend:  { id: "wuetend",  name: "Wütender",  color: "#ff4a2a", hpMult: 1.4, atkMult: 1.6, spdMult: 1.2, desc: "schlägt hart, schneller" },
  flink:    { id: "flink",    name: "Flinker",   color: "#c8f0e0", hpMult: 1.2, atkMult: 1.0, spdMult: 1.65, desc: "sehr schnell" },
  eisig:    { id: "eisig",    name: "Eisiger",   color: "#9ad8ff", hpMult: 1.5, atkMult: 1.0, spdMult: 1.2, slow: 2.5, desc: "verlangsamt bei Treffer, schneller" },
  heilend:  { id: "heilend",  name: "Heilender", color: "#6fe28a", hpMult: 1.5, atkMult: 1.0, spdMult: 1.2, regen: 0.04, desc: "heilt sich, schneller" },
  geladen:  { id: "geladen",  name: "Geladener", color: "#f5f07a", hpMult: 1.3, atkMult: 1.0, spdMult: 1.25, burst: 1.6, desc: "explodiert beim Tod, schneller" },
};
export const ELITE_ORDER = Object.keys(ELITES);
export const ELITE_CHANCE = 0.08;
