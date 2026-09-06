/* Touch-Steuerung: Steuerkreuz links, Trank und Schwert rechts, Menüknopf */
import React, { useRef } from "react";
import { Btn } from "./bits.jsx";

export default function Controls({ input, onPotion, onMenu, pots, menuOpen }) {
  const padRef = useRef(null);
  const pad = (e, end) => {
    if (end) { input.x = 0; input.y = 0; return; }
    const r = padRef.current.getBoundingClientRect();
    const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
    let dx = (e.clientX - cx) / (r.width / 2), dy = (e.clientY - cy) / (r.height / 2);
    const len = Math.hypot(dx, dy);
    if (len < 0.15) { input.x = 0; input.y = 0; return; }
    if (len > 1) { dx /= len; dy /= len; }
    input.x = dx; input.y = dy;
  };
  return (
    <div className="controls">
      <div ref={padRef} className="pad"
        onPointerDown={(e) => { e.currentTarget.setPointerCapture(e.pointerId); pad(e, false); }}
        onPointerMove={(e) => { if (e.buttons || e.pointerType === "touch") pad(e, false); }}
        onPointerUp={(e) => pad(e, true)} onPointerCancel={(e) => pad(e, true)}>
        <span className="pad-arrow" style={{ left: "50%", top: "14%" }}>▲</span>
        <span className="pad-arrow" style={{ left: "50%", top: "86%" }}>▼</span>
        <span className="pad-arrow" style={{ left: "14%", top: "50%" }}>◀</span>
        <span className="pad-arrow" style={{ left: "86%", top: "50%" }}>▶</span>
      </div>
      <div className="controls-right">
        <div className="row" style={{ alignItems: "flex-end" }}>
          <button type="button" className="btn-potion" onPointerDown={onPotion}>Trank<br /><span className="dim">{pots}</span></button>
          <button type="button" className="btn-sword"
            onPointerDown={(e) => { e.currentTarget.setPointerCapture(e.pointerId); input.attack = true; }}
            onPointerUp={() => { input.attack = false; }} onPointerCancel={() => { input.attack = false; }}>Schwert</button>
        </div>
        <Btn small onClick={onMenu}>{menuOpen ? "Schließen" : "Ausrüstung & Karte"}</Btn>
      </div>
    </div>
  );
}
