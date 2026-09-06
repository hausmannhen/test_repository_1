/* NPCs in den Dörfern. Position in Tiles innerhalb des Dorfbildschirms, auf freiem Boden neben dem Weg. */
export const NPCS = {
  bram:  { id: "bram",  name: "Ältester Bram",      village: "4,5", x: 5, y: 6, color: "#6a5a4a", color2: "#3a2a1a", idle: "„Die Wölfe kommen jede Nacht näher. Früher hielten die Zäune. Früher." },
  lene:  { id: "lene",  name: "Bäuerin Lene",       village: "4,5", x: 9, y: 4, color: "#8a5a3a", color2: "#4a2a1a", idle: "„Wenn du Ratten siehst, schlag zu. Ich zähle mit." },
  ilva:  { id: "ilva",  name: "Waldläuferin Ilva",  village: "1,6", x: 5, y: 4, color: "#3a6a3a", color2: "#1a3a1a", idle: "„Der Forst hat Augen. Und seit kurzem hat er zu viele Beine." },
  orun:  { id: "orun",  name: "Steinmetz Orun",     village: "4,2", x: 9, y: 6, color: "#7a7a72", color2: "#3a3a36", idle: "„Der Fels lebt hier. Das ist kein Sprichwort." },
  zaid:  { id: "zaid",  name: "Karawanenführer Zaid", village: "8,4", x: 5, y: 6, color: "#c9a24a", color2: "#6a4a1a", idle: "„Im Osten frisst etwas die Karawanen. Samt Kamelen." },
  toll:  { id: "toll",  name: "Fischer Toll",       village: "6,8", x: 9, y: 4, color: "#4a6a5a", color2: "#1a2a22", idle: "„Der Nebel singt nachts. Das ist nicht der Nebel." },
  ylva:  { id: "ylva",  name: "Seherin Ylva",       village: "2,1", x: 5, y: 4, color: "#8ab0d0", color2: "#2a3a5a", idle: "„Ich habe den Drachen gesehen, bevor er erwachte. Ich sehe ihn noch." },
};
export const NPCS_BY_VILLAGE = {};
for (const n of Object.values(NPCS)) (NPCS_BY_VILLAGE[n.village] ||= []).push(n);
