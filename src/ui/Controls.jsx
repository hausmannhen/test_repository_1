/* Touch-Steuerung: Steuerkreuz links, Trank und Schwert rechts, Menüknopf */
import React, { useRef } from "react";
import { Btn } from "./bits.jsx";
import { SPELLS, ELEMENTS } from "../data/spells.js";

/* Abklingzeit als Ring: dunkler Kreisausschnitt, der im Uhrzeigersinn schrumpft */
function CdRing({ cd }) {
  if (!cd || !cd.max || cd.left <= 0) return null;
  const pct = Math.min(100, (cd.left / cd.max) * 100);
  return <span className="cd-ring" style={{ background: `conic-gradient(rgba(0,0,0,0.62) ${pct}%, transparent ${pct}%)` }}><span className="cd-text">{cd.left >= 1 ? Math.ceil(cd.left) : cd.left.toFixed(1)}</span></span>;
}
export default function Controls({ input, onPotion, onManaPotion, onMenu, pots, manaPots, menuOpen, spells, activeSpell, onSelectSpell, talk, castCd, special }) {
  const el = activeSpell && SPELLS[activeSpell] ? ELEMENTS[SPELLS[activeSpell].element] : null;
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
    <div className="controls-wrap">
      {spells && spells.length > 0 && (
        <div className="spellbar">
          {spells.map(id => {
            const e = ELEMENTS[SPELLS[id].element], active = id === activeSpell;
            return <button key={id} type="button" className={`chip chip-small${active ? " active" : ""}`} onPointerDown={() => onSelectSpell(id)} style={{ borderColor: e.color, color: active ? "#1b1712" : e.color, background: active ? e.color : "transparent" }}>{SPELLS[id].name}</button>;
          })}
        </div>
      )}
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
          <div className="col" style={{ gap: 6 }}>
            <button type="button" className="btn-potion" onPointerDown={onPotion}>Trank<br /><span className="dim">{pots}</span></button>
            <button type="button" className="btn-potion btn-mana" onPointerDown={onManaPotion}>Mana<br /><span className="dim">{manaPots}</span></button>
          </div>
          <div className="col" style={{ gap: 6 }}>
            <span className="btn-wrap">
              <button type="button" className="btn-cast" disabled={!activeSpell} style={el ? { borderColor: el.color, color: el.color } : undefined}
                onPointerDown={(e) => { e.currentTarget.setPointerCapture(e.pointerId); input.cast = true; }}
                onPointerUp={() => { input.cast = false; }} onPointerCancel={() => { input.cast = false; }}>{activeSpell ? "Zauber" : "–"}</button>
              {activeSpell && <CdRing cd={castCd} />}
            </span>
            <span className="btn-wrap">
              <button type="button" className="btn-cast btn-special" disabled={!special} style={special ? { borderColor: special.color, color: special.color } : undefined}
                onPointerDown={(e) => { e.currentTarget.setPointerCapture(e.pointerId); input.special = true; }}
                onPointerUp={() => { input.special = false; }} onPointerCancel={() => { input.special = false; }}>{special ? (special.id === "sturmangriff" ? "Sturm" : "Hagel") : "–"}</button>
              {special && <CdRing cd={special.cd} />}
            </span>
          </div>
          <button type="button" className={`btn-sword${talk ? " btn-talk" : ""}`}
            onPointerDown={(e) => { e.currentTarget.setPointerCapture(e.pointerId); input.attack = true; }}
            onPointerUp={() => { input.attack = false; }} onPointerCancel={() => { input.attack = false; }}>{talk ? (talk === "Wegweiser" ? "Lesen" : "Reden") : "Schwert"}</button>
        </div>
        <Btn small onClick={onMenu}>{menuOpen ? "Schließen" : "Menü"}</Btn>
      </div>
    </div>
    </div>
  );
}
