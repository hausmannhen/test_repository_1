import React from "react";
import { VILLAGES } from "../game/constants.js";
import Panel from "./Panel.jsx";
import { Btn } from "./bits.jsx";

export default function Death({ G, onRespawn }) {
  const village = VILLAGES[G.P.lastVillage] || VILLAGES["2,3"];
  return (
    <Panel title="Gefallen" footer={<Btn tone="gold" onClick={onRespawn}>Zurück nach {village.name}</Btn>}>
      <div className="prose">
        <p>Die Dunkelheit nimmt dich. Doch in {village.name} wacht jemand über dich.</p>
        <p className="dim" style={{ fontSize: 13 }}>Du verlierst ein Zehntel deines Goldes und erwachst mit halbem Leben.</p>
      </div>
    </Panel>
  );
}
