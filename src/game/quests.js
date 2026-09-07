/* Aufgaben: annehmen, Fortschritt, abschließen, Belohnung. Zustand in P.quests[id] = { state, progress } */
import { QUESTS, QUEST_ORDER, MAIN_QUESTS, CHOICES } from "../data/quests.js";
import { GATES } from "../data/gates.js";
import { NPCS } from "../data/npcs.js";
import { MINIBOSS_BY_ID } from "../data/minibosses.js";
import { BOSSES, MOBS } from "./monsters.js";
import { DUNGEONS } from "./constants.js";
import { mulberry32 } from "./rng.js";
import { generateItem } from "./items.js";
import { derive, addToInventory, flash } from "./player.js";
export { QUESTS, QUEST_ORDER, MAIN_QUESTS, NPCS, CHOICES, GATES };

export function questState(P, id) { return (P.quests && P.quests[id]) || null; }
export function isDone(P, id) { const q = questState(P, id); return !!q && q.state === "done"; }
export function isActive(P, id) { const q = questState(P, id); return !!q && q.state === "active"; }
export function canOffer(P, id) {
  const q = QUESTS[id];
  if (!q || questState(P, id)) return false;
  if (q.requires && !isDone(P, q.requires)) return false;
  return true;
}
export function acceptQuest(P, id) {
  if (!canOffer(P, id)) return false;
  if (!P.quests) P.quests = {};
  P.quests[id] = { state: "active", progress: 0 };
  return true;
}
export function objectiveTarget(id) {
  const o = QUESTS[id].objective;
  return o.type === "kill" ? o.count : 1;
}
export function isComplete(P, id) {
  const q = questState(P, id);
  return !!q && q.state === "active" && q.progress >= objectiveTarget(id);
}
export function objectiveText(P, id) {
  const q = QUESTS[id], o = q.objective, st = questState(P, id);
  const prog = st ? Math.min(st.progress, objectiveTarget(id)) : 0;
  if (o.type === "kill") return `${MOBS[o.mob].name} besiegen: ${prog} / ${o.count}`;
  if (o.type === "mini") return `${MINIBOSS_BY_ID[o.id].name} besiegen${prog ? " (erledigt)" : ""}`;
  if (o.type === "boss") return `${BOSSES[o.id].name} in ${DUNGEONS[o.id].name} besiegen${prog ? " (erledigt)" : ""}`;
  if (o.type === "talk") return `Mit ${NPCS[o.npc].name} sprechen`;
  if (o.type === "raid") return prog ? "Dorf gehalten" : `Überfall abwehren${q.raid && q.raid.scale ? ` (Stufe ${raidLevel(P, id)})` : ""}`;
  if (o.type === "choice") return prog ? "Entschieden" : "Die Weise in ihrem Haus in Elmshain aufsuchen und entscheiden";
  return "";
}
/* Hinweis, wo es weitergeht (für den Tracker im HUD) */
export function activeQuests(P) { return QUEST_ORDER.filter(id => isActive(P, id)); }
export function trackerText(P) {
  const ids = activeQuests(P);
  if (!ids.length) return null;
  const main = ids.find(id => QUESTS[id].main) || ids[0];
  if (isComplete(P, main)) return `${QUESTS[main].title}: zurück zu ${NPCS[QUESTS[main].turnIn].name}`;
  return `${QUESTS[main].title}: ${objectiveText(P, main)}`;
}

/* ---------- Fortschritt ---------- */
function bump(G, id) {
  const P = G.P, st = P.quests[id];
  if (st.progress >= objectiveTarget(id)) return;
  st.progress++;
  if (st.progress >= objectiveTarget(id)) G.banner = { text: "Aufgabe erfüllt", sub: `${QUESTS[id].title}, zurück zu ${NPCS[QUESTS[id].turnIn].name}`, t: 3.5 };
  G.dirty = true;
}
/* Schwierigkeit eines wiederholbaren Überfalls: steigt mit jedem gewonnenen */
export function raidLevel(P, id) {
  const q = QUESTS[id];
  if (!q.raid || !q.raid.scale) return 1;
  return 1 + ((P.raidWins && P.raidWins[id]) || 0);
}
export function onRaidEnd(G, won) {
  const P = G.P, id = G.raid && G.raid.questId;
  if (!id || !isActive(P, id)) return;
  if (won) { P.quests[id].progress = 1; if (QUESTS[id].raid && QUESTS[id].raid.scale) { if (!P.raidWins) P.raidWins = {}; P.raidWins[id] = (P.raidWins[id] || 0) + 1; } G.banner = { text: "Aufgabe erfüllt", sub: `${QUESTS[id].title}, zurück zu ${NPCS[QUESTS[id].turnIn].name}`, t: 3.5 }; }
  else { delete P.quests[id]; }   // verloren: Aufgabe wieder annehmbar
  G.dirty = true;
}
export function onKill(G, m) {
  const P = G.P;
  for (const id of activeQuests(P)) {
    const o = QUESTS[id].objective;
    if (o.type === "kill" && m.type === o.mob && !m.boss && !m.mini) bump(G, id);
    else if (o.type === "mini" && m.mini === o.id) bump(G, id);
    else if (o.type === "boss" && m.boss && G.screen.dungeonRoom && G.screen.dungeonRoom.d.id === o.id) bump(G, id);
  }
  // Zwischenboss oder Boss schon vorher besiegt: Aufgabe bei Annahme sofort erfüllt (siehe acceptWithHistory)
}
export function acceptWithHistory(P, id) {
  if (!acceptQuest(P, id)) return false;
  const o = QUESTS[id].objective;
  if (o.type === "mini" && P.cleared["mb:" + o.id]) P.quests[id].progress = 1;
  if (o.type === "boss" && P.cleared[o.id]) P.quests[id].progress = 1;
  return true;
}
export function completeQuest(G, id) {
  const P = G.P;
  if (!isComplete(P, id)) return null;
  const q = QUESTS[id], rw = q.reward || {};
  const lvl = q.raid && q.raid.scale ? raidLevel(P, id) - 1 : 1;   // Wiederholungen: Belohnung wächst
  if (q.repeat) delete P.quests[id]; else P.quests[id].state = "done";
  const got = { gold: Math.round((rw.gold || 0) * (1 + 0.4 * (lvl - 1))), xp: Math.round((rw.xp || 0) * (1 + 0.4 * (lvl - 1))), item: null };
  P.gold += got.gold;
  if (rw.item) {
    const d = derive(P);
    const r = mulberry32((Math.random() * 1e9) | 0);
    const item = generateItem(r, P.level + 2 + Math.min(6, lvl - 1), d.luck, Math.min(4, (rw.item.minRarity || 0) + Math.floor((lvl - 1) / 3)), rw.item.slot || null);
    if (addToInventory(P, item)) got.item = item;
    else { G.drops.push({ type: "item", item, x: P.x, y: P.y + 10, vx: 0, vy: 20, t: 0 }); got.item = item; }
  }
  if (got.xp) G.pendingXp = (G.pendingXp || 0) + got.xp;
  G.dirty = true;
  return got;
}
export function talkTo(G, npcId) {
  const P = G.P;
  const npc = NPCS[npcId];
  if (G.raid && G.raid.state !== "done") return { npc, mode: "raid", quest: G.raid.questId };
  // Erst abschließen, dann anbieten, dann Fortschritt zeigen, sonst Alltagsspruch
  for (const id of QUEST_ORDER) if (QUESTS[id].turnIn === npcId && isComplete(P, id)) return { npc, mode: "complete", quest: id };
  for (const id of QUEST_ORDER) if (QUESTS[id].giver === npcId && canOffer(P, id)) return { npc, mode: "offer", quest: id };
  for (const id of QUEST_ORDER) if (QUESTS[id].turnIn === npcId && isActive(P, id)) return { npc, mode: "progress", quest: id };
  return { npc, mode: "idle", quest: null };
}
/* Schlusstext je nach Wahl */
export function doneText(P, id) {
  const q = QUESTS[id];
  if (q.doneAlt && P.choice === "flicken") return q.doneAlt;
  return q.done;
}
/* Barrieren: offen, wenn das Kapitel erledigt ist */
export function gateFor(region) { return GATES[region] || null; }
export function gateOpen(P, region) {
  const g = GATES[region];
  if (!g) return true;
  return isDone(P, g.opensAfter);
}
/* Die Wahl in Kapitel 7: nimmt die Aufgabe an, falls nötig, und erfüllt sie */
export function makeChoice(G, choiceId) {
  const P = G.P;
  if (!CHOICES[choiceId] || P.choice) return false;
  if (!questState(P, "h7")) { if (!acceptQuest(P, "h7")) return false; }
  if (!isActive(P, "h7")) return false;
  P.choice = choiceId;
  P.quests.h7.progress = 1;
  G.banner = { text: CHOICES[choiceId].title, sub: "Das dritte Siegel", t: 4 };
  G.dirty = true;
  return true;
}
export function storyProgress(P) {
  const done = MAIN_QUESTS.filter(id => isDone(P, id)).length;
  return { done, total: MAIN_QUESTS.length };
}
