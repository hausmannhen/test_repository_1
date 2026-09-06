import React from "react";
import { Hearts } from "./bits.jsx";

export default function Hud({ ui }) {
  if (!ui) return <div className="hud" />;
  return (
    <div className="hud">
      <div>
        <Hearts hp={ui.hp} maxHp={ui.maxHp} />
        <div className="hud-hp">{ui.hp} / {ui.maxHp}{ui.buff ? <span className="gold"> · gestärkt</span> : ""}</div>
        <div className="manabar"><div className="manabar-fill" style={{ width: `${Math.min(100, (ui.mana / ui.maxMana) * 100)}%` }} /></div>
        <div className="hud-hp">{ui.mana} / {ui.maxMana} Mana{ui.spell ? <span style={{ color: ui.spellColor }}> · {ui.spell}</span> : ""}</div>
      </div>
      <div className="hud-right">
        <div className="gold">{ui.gold} Gold</div>
        <div>Stufe {ui.level}{ui.points > 0 ? <span className="gold"> · {ui.points} Punkt{ui.points > 1 ? "e" : ""}</span> : ""}</div>
        <div className="xpbar"><div className="xpbar-fill" style={{ width: `${(ui.xp / ui.need) * 100}%` }} /></div>
      </div>
    </div>
  );
}
