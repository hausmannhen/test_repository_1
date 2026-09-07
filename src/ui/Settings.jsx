/* Einstellungen: Ton und Konto */
import React, { useState } from "react";
import { Btn } from "./bits.jsx";
import { deleteSlot } from "../game/save.js";

export default function Settings({ audio, G, cloud, onAccountDeleted }) {
  const [s, setS] = useState(audio ? { ...audio.settings } : { music: 0.6, sfx: 0.3, muted: false });
  const apply = (patch) => { const next = { ...s, ...patch }; setS(next); if (audio) { audio.unlock(); audio.applySettings(next); } };
  const slot = G ? G.slot : null;
  const isCloud = !!(slot && slot.cloud);
  const [mode, setMode] = useState(null); // null | "frage" | "pin"
  const [pin, setPin] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const cancel = () => { setMode(null); setPin(""); setError(null); };
  const doDelete = async () => {
    setBusy(true); setError(null);
    try {
      if (isCloud) { if (!cloud) throw new Error("Online-Konten sind nicht eingerichtet"); await cloud.remove(pin); }
      else deleteSlot(slot.id);
      if (onAccountDeleted) onAccountDeleted();
    } catch (e) { setError(e.message || "Löschen fehlgeschlagen"); setBusy(false); }
  };
  return (
    <div>
      <div className="section">Ton</div>
      <div className="box">
        <label className="slider-row"><span>Musik</span><input type="range" min="0" max="1" step="0.05" value={s.music} onChange={e => apply({ music: +e.target.value })} /><span className="dim">{Math.round(s.music * 100)} %</span></label>
        <label className="slider-row"><span>Effekte</span><input type="range" min="0" max="1" step="0.05" value={s.sfx} onChange={e => apply({ sfx: +e.target.value })} /><span className="dim">{Math.round(s.sfx * 100)} %</span></label>
        <div className="row" style={{ marginTop: 10 }}>
          <Btn small tone={s.muted ? "red" : "default"} onClick={() => apply({ muted: !s.muted })}>{s.muted ? "Ton ist aus" : "Ton ausschalten"}</Btn>
          {audio && <Btn small onClick={() => { audio.unlock(); audio.sfx("levelup"); }}>Probehören</Btn>}
        </div>
      </div>
      <div className="dim" style={{ fontSize: 12, lineHeight: 1.6, marginBottom: 14 }}>Musik und Geräusche werden im Spiel erzeugt, es gibt keine Dateien. Die Musik wechselt mit der Region. Auf dem iPhone gilt der Stummschalter am Gerät zusätzlich.</div>

      {slot && <>
        <div className="section">Konto</div>
        <div className="box">
          <div style={{ fontSize: 15 }}>{slot.name} <span className="dim" style={{ fontSize: 12 }}>· {isCloud ? "Online-Konto" : "Gerätekonto"}</span></div>
          {mode === null && <div className="row" style={{ marginTop: 10 }}>
            <Btn small tone="red" disabled={busy} onClick={() => setMode(isCloud ? "pin" : "frage")}>Konto löschen</Btn>
          </div>}
          {mode === "pin" && <div style={{ marginTop: 10 }}>
            <div className="dim" style={{ fontSize: 12, lineHeight: 1.5, marginBottom: 8 }}>Löscht das Online-Konto „{slot.name}“ mit Spielstand endgültig, auf allen Geräten. Zur Bestätigung die PIN eingeben.</div>
            <input className="input" type="password" inputMode="numeric" pattern="[0-9]*" maxLength={4} value={pin} placeholder="PIN, vier Ziffern" onChange={e => setPin(e.target.value.replace(/\D/g, "").slice(0, 4))} />
            {error && <div className="red" style={{ fontSize: 12, margin: "6px 0" }}>{error}</div>}
            <div className="row" style={{ marginTop: 8 }}>
              <Btn tone="red" disabled={busy || pin.length !== 4} onClick={doDelete}>{busy ? "Lösche…" : "Endgültig löschen"}</Btn>
              <Btn disabled={busy} onClick={cancel}>Abbrechen</Btn>
            </div>
          </div>}
          {mode === "frage" && <div style={{ marginTop: 10 }}>
            <div className="dim" style={{ fontSize: 12, lineHeight: 1.5, marginBottom: 8 }}>Löscht das Gerätekonto „{slot.name}“ mit Spielstand von diesem Gerät. Gerätekonten haben keine PIN. Vorher als Datei sichern, wenn du es behalten willst.</div>
            {error && <div className="red" style={{ fontSize: 12, margin: "6px 0" }}>{error}</div>}
            <div className="row">
              <Btn tone="red" disabled={busy} onClick={doDelete}>Endgültig löschen</Btn>
              <Btn disabled={busy} onClick={cancel}>Abbrechen</Btn>
            </div>
          </div>}
        </div>
      </>}
    </div>
  );
}
