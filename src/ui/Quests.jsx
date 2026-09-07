/* Aufgabenliste: laufend, erledigt, Stand der Geschichte */
import React from "react";
import { QUESTS, QUEST_ORDER, NPCS, isActive, isDone, isComplete, objectiveText, storyProgress, nextChapter } from "../game/quests.js";
import { VILLAGES, REGIONS } from "../game/constants.js";
import { GATES, gateOpen } from "../game/quests.js";

export default function Quests({ G }) {
  const P = G.P;
  const active = QUEST_ORDER.filter(id => isActive(P, id));
  const done = QUEST_ORDER.filter(id => isDone(P, id));
  const sp = storyProgress(P);
  const nx = nextChapter(P);
  const nextText = nx && (nx.state === "erfuellt" ? `Erfüllt. Zurück zu ${nx.npc.name} in ${nx.village.name}.`
    : nx.state === "aktiv" ? objectiveText(P, nx.id)
    : `${nx.npc.name} in ${nx.village.name} hat die Aufgabe${nx.dir ? `, das Dorf liegt ${nx.dir} von hier` : ""}. Stell dich daneben und drück „Reden“.`);
  const villageOf = (npcId) => VILLAGES[NPCS[npcId].village].name;
  return (
    <div>
      <div className="box">
        <div style={{ fontSize: 15 }}>Stand: Kapitel {sp.done} von {sp.total} erledigt</div>
        {nx ? <>
          <div style={{ fontSize: 14, marginTop: 6 }}><span className="gold">Jetzt dran: Kapitel {nx.q.main} · </span>{nx.q.title}</div>
          <div className={nx.state === "erfuellt" ? "green" : "dim"} style={{ fontSize: 12, marginTop: 2 }}>{nextText}</div>
        </> : <div className="dim" style={{ fontSize: 12, marginTop: 4 }}>Die Geschichte ist zu Ende. Die Monster werden trotzdem nicht müde.</div>}
        <div className="dim" style={{ fontSize: 11, marginTop: 6 }}>Worum es geht, steht im Reiter „Geschichte“.</div>
      </div>
      <div className="section">Versperrte Gebiete</div>
      {Object.values(GATES).filter(g => !gateOpen(P, g.id)).length === 0 && <div className="empty">Alle Wege sind offen.</div>}
      {Object.values(GATES).filter(g => !gateOpen(P, g.id)).map(g => <div key={g.id} className="quest-row"><div className="quest-title">{REGIONS[g.id].name}: {g.name}</div><div className="dim" style={{ fontSize: 12 }}>Öffnet sich nach Kapitel {QUESTS[g.opensAfter].main}, „{QUESTS[g.opensAfter].title}“.</div></div>)}
      <div className="section" style={{ marginTop: 12 }}>Laufend</div>
      {active.length === 0 && <div className="empty">Keine laufende Aufgabe. {sp.done === 0 ? "Ältester Bram in Elmshain wartet." : ""}</div>}
      {active.map(id => {
        const q = QUESTS[id], complete = isComplete(P, id);
        return <div key={id} className="quest-row">
          <div className="quest-title">{q.main ? <span className="gold">Kapitel {q.main} · </span> : ""}{q.title}</div>
          <div className={complete ? "green" : "dim"} style={{ fontSize: 13 }}>{complete ? `Erfüllt. Zurück zu ${NPCS[q.turnIn].name} in ${villageOf(q.turnIn)}.` : objectiveText(P, id)}</div>
        </div>;
      })}
      {done.length > 0 && <div className="section" style={{ marginTop: 12 }}>Erledigt</div>}
      {done.map(id => <div key={id} className="quest-row done"><div className="quest-title dim">{QUESTS[id].main ? `Kapitel ${QUESTS[id].main} · ` : ""}{QUESTS[id].title}</div></div>)}
    </div>
  );
}
