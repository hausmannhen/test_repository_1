import React from "react";
import { VILLAGES, START_VILLAGE, DUNGEONS } from "../game/constants.js";
import Panel from "./Panel.jsx";
import { Btn } from "./bits.jsx";

export default function Death({ G, onRespawn }) {
  const village = VILLAGES[G.P.lastVillage] || VILLAGES[START_VILLAGE];
  const dungeon = G.P.area !== "over" ? DUNGEONS[+G.P.area.slice(1)] : null;
  const where = dungeon ? `zum Eingang von ${dungeon.name}` : `nach ${village.name}`;
  return (
    <Panel title="Gefallen" footer={<Btn tone="gold" onClick={onRespawn}>Zurück {where}</Btn>}>
      <div className="prose">
        <p>{dungeon ? `Die Dunkelheit nimmt dich. Du kommst am Eingang von ${dungeon.name} wieder zu dir, die Räume bleiben, wie du sie verlassen hast.` : `Die Dunkelheit nimmt dich. Doch in ${village.name} wacht jemand über dich.`}</p>
        <p className="dim" style={{ fontSize: 13 }}>Du verlierst ein Zehntel deines Goldes und erwachst mit halbem Leben.</p>
      </div>
    </Panel>
  );
}
