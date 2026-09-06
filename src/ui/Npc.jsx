/* Gespräch mit einem Bewohner: Aufgabe anbieten, Fortschritt zeigen, abschließen */
import React, { useState } from "react";
import { QUESTS, talkTo, acceptWithHistory, completeQuest, objectiveText } from "../game/quests.js";
import { NPCS } from "../data/npcs.js";
import Panel from "./Panel.jsx";
import { Btn, ItemName } from "./bits.jsx";

export default function Npc({ G, npcId, onClose, rerender }) {
  const P = G.P;
  const npc = NPCS[npcId];
  const [reward, setReward] = useState(null);
  const [phase, setPhase] = useState("talk");
  if (!npc) return null;
  const d = talkTo(G, npcId);
  const q = d.quest ? QUESTS[d.quest] : null;

  let body;
  if (reward) {
    body = (
      <div className="prose">
        <p className="quote">{QUESTS[reward.id].done}</p>
        <div className="box">
          <div className="section" style={{ marginTop: 0 }}>Belohnung</div>
          <div>{reward.gold > 0 && <span className="gold">{reward.gold} Gold</span>}{reward.gold > 0 && reward.xp > 0 ? " · " : ""}{reward.xp > 0 && <span style={{ color: "#8fd3ff" }}>{reward.xp} Erfahrung</span>}</div>
          {reward.item && <div style={{ marginTop: 4 }}><ItemName item={reward.item} /></div>}
        </div>
      </div>
    );
  } else if (d.mode === "offer" && phase === "talk") {
    body = (
      <div className="prose">
        <p className="quote">{q.intro}</p>
        <div className="box">
          <div className="section" style={{ marginTop: 0 }}>{q.main ? `Kapitel ${q.main}: ` : "Nebenaufgabe: "}{q.title}</div>
          <div className="dim" style={{ fontSize: 13 }}>{objectiveText(P, d.quest)}</div>
          {q.reward && <div className="dim" style={{ fontSize: 12, marginTop: 4 }}>Belohnung: {q.reward.gold} Gold, {q.reward.xp} Erfahrung{q.reward.item ? ", ein Ausrüstungsstück" : ""}</div>}
        </div>
      </div>
    );
  } else if (d.mode === "complete") {
    body = (
      <div className="prose">
        <p className="quote">„Du bist zurück. Und?“</p>
        <div className="box"><div className="section" style={{ marginTop: 0 }}>{q.title}</div><div className="green" style={{ fontSize: 13 }}>{objectiveText(P, d.quest)}</div></div>
      </div>
    );
  } else if (d.mode === "progress") {
    body = (
      <div className="prose">
        <p className="quote">„Noch nicht fertig? Dann los.“</p>
        <div className="box"><div className="section" style={{ marginTop: 0 }}>{q.title}</div><div className="dim" style={{ fontSize: 13 }}>{objectiveText(P, d.quest)}</div></div>
      </div>
    );
  } else {
    body = <div className="prose"><p className="quote">{npc.idle}</p></div>;
  }

  const footer = reward ? <Btn tone="gold" onClick={onClose}>Weiter</Btn>
    : d.mode === "offer" ? <>
        <Btn onClick={onClose}>Später</Btn>
        <Btn tone="gold" onClick={() => { acceptWithHistory(P, d.quest); setPhase("accepted"); rerender(); onClose(); }}>Annehmen</Btn>
      </>
    : d.mode === "complete" ? <Btn tone="gold" onClick={() => { const got = completeQuest(G, d.quest); setReward({ id: d.quest, ...got }); rerender(); }}>Abschließen</Btn>
    : <Btn tone="gold" onClick={onClose}>Weiter</Btn>;

  return <Panel title={npc.name} gold={P.gold} footer={footer}>{body}</Panel>;
}
