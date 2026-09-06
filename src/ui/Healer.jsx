import React from "react";
import { derive } from "../game/player.js";
import { healCost, healPlayer, buyBuff, BUFF_COST, BUFF_DURATION } from "../game/actions.js";
import Panel from "./Panel.jsx";
import { Btn } from "./bits.jsx";

export default function Healer({ G, onClose, rerender }) {
  const P = G.P, d = derive(P), cost = healCost(P), full = P.hp >= d.maxHp;
  return (
    <Panel title="Heilerin" gold={P.gold} footer={<Btn tone="gold" onClick={onClose}>Verlassen</Btn>}>
      <div className="prose">
        <p className="quote">„Setz dich, Wanderer. Ich sehe, die Wildnis war nicht zimperlich mit dir."</p>
        <p className="dim" style={{ fontSize: 13 }}>Leben: {P.hp} / {d.maxHp}</p>
        <Btn tone="gold" disabled={full || P.gold < cost} onClick={() => { healPlayer(P); rerender(); }}>{full ? "Du bist gesund" : `Heilen für ${cost} Gold`}</Btn>
        <p className="dim" style={{ fontSize: 13, marginTop: 14 }}>Tipp: Ein Krafttrank aus Kräutern stärkt deinen Arm eine Weile.</p>
        <Btn disabled={P.gold < BUFF_COST || P.buffT > 0} onClick={() => { buyBuff(P); rerender(); }}>
          {P.buffT > 0 ? "Krafttrank wirkt bereits" : `Krafttrank für ${BUFF_COST} Gold (${BUFF_DURATION} Sekunden, +50% Schaden)`}
        </Btn>
      </div>
    </Panel>
  );
}
