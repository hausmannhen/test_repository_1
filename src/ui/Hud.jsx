import React from "react";
import { Hearts } from "./bits.jsx";

export default function Hud({ ui }) {
  if (!ui) return <div className="hud" />;
  return (
    <div className="hud">
      <div>
        <Hearts hp={ui.hp} maxHp={ui.maxHp} />
        <div className="hud-hp">{ui.hp} / {ui.maxHp}{ui.buff ? <span className="gold"> · gestärkt</span> : ""}</div>
      </div>
      <div className="hud-right">
        <div className="gold">{ui.gold} Gold</div>
        <div>Stufe {ui.level}</div>
        <div className="xpbar"><div className="xpbar-fill" style={{ width: `${(ui.xp / ui.need) * 100}%` }} /></div>
      </div>
    </div>
  );
}
