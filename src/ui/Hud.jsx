import React, { useEffect, useRef } from "react";
import { Hearts } from "./bits.jsx";
import { WORLD_W, WORLD_H, VILLAGES, DUNGEON_BY_SCREEN, REGION_MAP_COLORS, regionAt } from "../game/constants.js";
import { MINIBOSS_BY_SCREEN } from "../data/minibosses.js";

/* Minikarte: erkundete Bildschirme, Dörfer, Dungeons, Reviere, eigene Position */
function MiniMap({ visited, pos, cleared }) {
  const ref = useRef(null);
  useEffect(() => {
    const c = ref.current; if (!c) return;
    const ctx = c.getContext("2d"); if (!ctx) return;
    const cell = 6, pad = 1;
    ctx.clearRect(0, 0, c.width, c.height);
    const seen = new Set(visited || []);
    for (let y = 0; y < WORLD_H; y++) for (let x = 0; x < WORLD_W; x++) {
      const k = `${x},${y}`;
      ctx.fillStyle = seen.has(k) ? REGION_MAP_COLORS[regionAt(x, y)] : "#2a231b";
      ctx.fillRect(pad + x * cell, pad + y * cell, cell - 1, cell - 1);
      if (!seen.has(k)) continue;
      if (VILLAGES[k]) { ctx.fillStyle = "#d4a53a"; ctx.fillRect(pad + x * cell + 1, pad + y * cell + 1, cell - 3, cell - 3); }
      else if (DUNGEON_BY_SCREEN[k]) { ctx.fillStyle = "#e2503f"; ctx.fillRect(pad + x * cell + 1, pad + y * cell + 1, cell - 3, cell - 3); }
      else if (MINIBOSS_BY_SCREEN[k]) { ctx.fillStyle = cleared && cleared["mb:" + MINIBOSS_BY_SCREEN[k].id] ? "#5a4f40" : "#ff7a2a"; ctx.fillRect(pad + x * cell + 1, pad + y * cell + 1, cell - 3, cell - 3); }
    }
    if (pos) { ctx.fillStyle = "#6fe28a"; ctx.fillRect(pad + pos[0] * cell - 1, pad + pos[1] * cell - 1, cell + 1, cell + 1); ctx.fillStyle = "#1b1712"; ctx.fillRect(pad + pos[0] * cell + 1, pad + pos[1] * cell + 1, cell - 3, cell - 3); }
  }, [visited, pos, cleared]);
  return <canvas ref={ref} className="minimap" width={WORLD_W * 6 + 2} height={WORLD_H * 6 + 2} />;
}

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
        <div>
          <div className="gold">{ui.gold} Gold</div>
          <div>Stufe {ui.level}{ui.points > 0 ? <span className="gold"> · {ui.points} Punkt{ui.points > 1 ? "e" : ""}</span> : ""}</div>
          <div className="xpbar"><div className="xpbar-fill" style={{ width: `${(ui.xp / ui.need) * 100}%` }} /></div>
        </div>
        {ui.area === "over" && <MiniMap visited={ui.visited} pos={ui.pos} cleared={ui.cleared} />}
      </div>
    </div>
  );
}
