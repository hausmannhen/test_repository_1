/* Barrieren: Regionen sind versperrt, bis ein Kapitel erledigt ist. Der Spieler sieht am Bildschirmrand eine Wand. */
export const GATES = {
  berg:   { id: "berg",   name: "Steinschlag",  color: "#8a8478", opensAfter: "h4", blocked: "Ein Steinschlag versperrt den Pass. Der Fels bebt noch. Irgendetwas im Forst hält ihn in Bewegung.", opened: "Der Steinschlag am Pass ist zur Ruhe gekommen. Der Weg in die Höhen ist frei." },
  wueste: { id: "wueste", name: "Sandsturm",    color: "#d9c27a", opensAfter: "h6", blocked: "Ein Sandsturm steht wie eine Mauer. Kein Weg hindurch, solange der Berg tobt.", opened: "Der Sandsturm hat sich gelegt. Die Wüste liegt offen." },
  sumpf:  { id: "sumpf",  name: "Nebelwand",    color: "#8a9a80", opensAfter: "h6", blocked: "Der Nebel ist dicht wie Wolle. Wer hineingeht, kommt am selben Ort wieder heraus.", opened: "Der Nebel über dem Moor lichtet sich." },
  eis:    { id: "eis",    name: "Frostwand",    color: "#dfeeff", opensAfter: "h7", blocked: "Eine Wand aus Eis, glatt wie Glas. Sie gehört nicht hierher. Die Weise in Elmshain weiß mehr.", opened: "Die Frostwand zerbricht. Der Norden ruft." },
  vulkan: { id: "vulkan", name: "Aschesturm",   color: "#4a2a28", opensAfter: "h7", blocked: "Glühende Asche fällt so dicht, dass die Haut brennt. Die Weise in Elmshain weiß mehr.", opened: "Der Aschesturm lässt nach. Der Kessel ist erreichbar." },
};
