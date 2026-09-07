/* Item-Datenbank: Seltenheiten, Slots, Basisitems (Nahkampf, Fernkampf, Fokus, Rüstung, Schmuck), Affixe, Tränke.
   Neue Basisitems brauchen zwingend g: "m" | "f" | "n" (Deklination der Präfixe).
   Waffen haben type: "nah" (Schwert & Co.), "fern" (Bogen, Armbrust, Wurfwaffen), "fokus" (Stäbe, verstärken Magie). */

export const RARITIES = [
  { id: "gewoehnlich",   name: "Gewöhnlich",   color: "#d8d2c4", mult: 1.0,  statMult: 1.0, affixes: 0, weight: 60 },
  { id: "ungewoehnlich", name: "Ungewöhnlich", color: "#6fd66f", mult: 1.25, statMult: 1.1, affixes: 1, weight: 22 },
  { id: "selten",        name: "Selten",       color: "#5aa7ff", mult: 1.55, statMult: 1.2, affixes: 2, weight: 7 },
  { id: "episch",        name: "Episch",       color: "#c77dff", mult: 1.95, statMult: 1.3, affixes: 3, weight: 2.2 },
  { id: "legendaer",     name: "Legendär",     color: "#ffb347", mult: 2.5,  statMult: 1.4, affixes: 4, weight: 0.4 },
];
export const SLOTS = { waffe: "Waffe", kopf: "Kopf", rumpf: "Rumpf", schild: "Schild", amulett: "Amulett", ring: "Ring" };
export const SLOT_ORDER = ["waffe", "kopf", "rumpf", "schild", "amulett", "ring"];
export const STAT_NAMES = { atk: "Angriff", def: "Verteidigung", hp: "Leben", crit: "Krit", spd: "Tempo", luck: "Glück", mag: "Magie", mana: "Mana" };
export const STAT_KEYS = ["atk", "def", "hp", "crit", "spd", "luck", "mag", "mana"];
/* Werte, die nicht mit der Itemstufe skalieren, sondern flach bleiben */
export const FLAT_STATS = new Set(["crit", "luck", "spd"]);
export const WEAPON_TYPES = { nah: "Nahkampf", fern: "Fernkampf", fokus: "Fokus" };

export const BASES = [
  // Nahkampf: reach in Pixeln
  { id: "dolch",        name: "Dolch", g: "m",         slot: "waffe", type: "nah", atk: 4,  crit: 8,  spd: 4, reach: 10 },
  { id: "kurzschwert",  name: "Kurzschwert", g: "n",   slot: "waffe", type: "nah", atk: 6,  crit: 3, reach: 13 },
  { id: "langschwert",  name: "Langschwert", g: "n",   slot: "waffe", type: "nah", atk: 8,  reach: 16 },
  { id: "streitaxt",    name: "Streitaxt", g: "f",     slot: "waffe", type: "nah", atk: 11, spd: -3, reach: 14 },
  { id: "kriegshammer", name: "Kriegshammer", g: "m",  slot: "waffe", type: "nah", atk: 13, spd: -5, reach: 14 },
  { id: "rapier",       name: "Rapier", g: "n",        slot: "waffe", type: "nah", atk: 7,  crit: 10, reach: 17 },
  { id: "speer",        name: "Speer", g: "m",         slot: "waffe", type: "nah", atk: 7,  reach: 22 },
  // Fernkampf: range in Pixeln, rate = Sekunden zwischen Schüssen, projSpeed in Pixeln pro Sekunde
  { id: "wurfmesser",   name: "Wurfmesser", g: "n",    slot: "waffe", type: "fern", atk: 4,  crit: 8, spd: 3, range: 90,  rate: 0.32, projSpeed: 200, proj: "messer" },
  { id: "wurfaxt",      name: "Wurfaxt", g: "f",       slot: "waffe", type: "fern", atk: 9,  spd: -2, range: 80,  rate: 0.7,  projSpeed: 150, proj: "axt" },
  { id: "kurzbogen",    name: "Kurzbogen", g: "m",     slot: "waffe", type: "fern", atk: 6,  spd: 2,  range: 120, rate: 0.5,  projSpeed: 240, proj: "pfeil" },
  { id: "langbogen",    name: "Langbogen", g: "m",     slot: "waffe", type: "fern", atk: 9,  range: 150, rate: 0.7,  projSpeed: 280, proj: "pfeil" },
  { id: "armbrust",     name: "Armbrust", g: "f",      slot: "waffe", type: "fern", atk: 13, spd: -3, crit: 5, range: 140, rate: 1.05, projSpeed: 330, proj: "bolzen" },
  // Fokus: mag verstärkt Zauber, schwacher Nahkampf
  { id: "zauberstab",   name: "Zauberstab", g: "m",    slot: "waffe", type: "fokus", atk: 3, mag: 6,  mana: 10, reach: 12 },
  { id: "kristallstab", name: "Kristallstab", g: "m",  slot: "waffe", type: "fokus", atk: 3, mag: 9,  mana: 20, reach: 14 },
  { id: "runenzepter",  name: "Runenzepter", g: "n",   slot: "waffe", type: "fokus", atk: 5, mag: 7,  crit: 4, reach: 12 },
  { id: "blutdolch",    name: "Blutdolch", g: "m",     slot: "waffe", type: "fokus", atk: 6, mag: 5,  crit: 6, reach: 10, blood: 0.25 },
  // Kopf
  { id: "lederkappe",   name: "Lederkappe", g: "f",    slot: "kopf",  def: 2, spd: 2 },
  { id: "eisenhelm",    name: "Eisenhelm", g: "m",     slot: "kopf",  def: 4 },
  { id: "ritterhelm",   name: "Ritterhelm", g: "m",    slot: "kopf",  def: 6, spd: -1 },
  { id: "zauberhut",    name: "Zauberhut", g: "m",     slot: "kopf",  def: 1, luck: 4, mag: 3 },
  { id: "kapuze",       name: "Kapuze", g: "f",        slot: "kopf",  def: 2, crit: 4, mag: 2 },
  // Rumpf
  { id: "lederwams",    name: "Lederwams", g: "n",     slot: "rumpf", def: 3, spd: 2 },
  { id: "kettenhemd",   name: "Kettenhemd", g: "n",    slot: "rumpf", def: 6 },
  { id: "plattenpanzer",name: "Plattenpanzer", g: "m", slot: "rumpf", def: 9, spd: -3 },
  { id: "robe",         name: "Robe", g: "f",          slot: "rumpf", def: 2, hp: 12, mag: 4, mana: 10 },
  { id: "jaegermantel", name: "Jägermantel", g: "m",   slot: "rumpf", def: 4, crit: 5, spd: 1 },
  // Schild
  { id: "holzschild",   name: "Holzschild", g: "m",    slot: "schild", def: 2, hp: 6 },
  { id: "rundschild",   name: "Rundschild", g: "m",    slot: "schild", def: 4, hp: 8 },
  { id: "turmschild",   name: "Turmschild", g: "m",    slot: "schild", def: 7, hp: 12, spd: -3 },
  { id: "zauberbuch",   name: "Zauberbuch", g: "n",    slot: "schild", def: 1, mag: 5, mana: 15 },
  { id: "koecher",      name: "Köcher", g: "m",        slot: "schild", def: 1, atk: 3, crit: 3 },
  // Amulett
  { id: "talisman",     name: "Talisman", g: "m",      slot: "amulett", hp: 10, luck: 3 },
  { id: "anhaenger",    name: "Anhänger", g: "m",      slot: "amulett", crit: 5, atk: 2 },
  { id: "amulett",      name: "Amulett", g: "n",       slot: "amulett", def: 2, hp: 14 },
  { id: "seelenstein",  name: "Seelenstein", g: "m",   slot: "amulett", mag: 5, mana: 12 },
  // Ring
  { id: "ring",         name: "Ring", g: "m",          slot: "ring",  crit: 4, luck: 2 },
  { id: "siegelring",   name: "Siegelring", g: "m",    slot: "ring",  atk: 3, def: 1 },
  { id: "bandring",     name: "Bandring", g: "m",      slot: "ring",  hp: 8, spd: 2 },
  { id: "runenring",    name: "Runenring", g: "m",     slot: "ring",  mag: 4, mana: 8 },
];
export const PREFIXES = [
  { name: "Flammend", stat: "atk", v: 0.35 }, { name: "Scharf", stat: "atk", v: 0.25 }, { name: "Grimmig", stat: "atk", v: 0.45 },
  { name: "Gehärtet", stat: "def", v: 0.3 }, { name: "Stählern", stat: "def", v: 0.45 }, { name: "Ehern", stat: "def", v: 0.6 },
  { name: "Vital", stat: "hp", v: 0.5 }, { name: "Robust", stat: "hp", v: 0.8 },
  { name: "Tödlich", stat: "crit", v: 0.5 }, { name: "Flink", stat: "spd", v: 0.4 }, { name: "Glücklich", stat: "luck", v: 0.5 },
  { name: "Arkan", stat: "mag", v: 0.4 }, { name: "Verzaubert", stat: "mag", v: 0.3 }, { name: "Beseelt", stat: "mana", v: 0.6 },
];
export const SUFFIXES = [
  { name: "des Bären", stat: "hp", v: 1.0 }, { name: "des Wolfes", stat: "spd", v: 0.5 }, { name: "der Viper", stat: "crit", v: 0.7 },
  { name: "des Titanen", stat: "def", v: 0.7 }, { name: "der Sturmfront", stat: "atk", v: 0.5 }, { name: "des Fuchses", stat: "luck", v: 0.7 },
  { name: "der Morgenröte", stat: "hp", v: 0.6 }, { name: "des Drachen", stat: "atk", v: 0.7 }, { name: "der Ewigkeit", stat: "def", v: 0.9 },
  { name: "des Magiers", stat: "mag", v: 0.7 }, { name: "der Quelle", stat: "mana", v: 1.0 }, { name: "der Gezeiten", stat: "mag", v: 0.5 },
];
export const POTIONS = {
  heiltrank: { name: "Heiltrank", healPct: 0.3, price: 25, color: "#ff2f4f" },
  manatrank: { name: "Manatrank", manaPct: 0.5, price: 22, color: "#5aa7ff" },
};
/* Alte Trank-IDs aus früheren Spielständen */
export const LEGACY_POTIONS = { heiltrank_k: "heiltrank", heiltrank_m: "heiltrank", heiltrank_g: "heiltrank", elixier: "heiltrank" };
