/* Titel und Spielstand-Auswahl: fortsetzen, neu anlegen, exportieren, importieren, löschen */
import React, { useRef, useState } from "react";
import { Btn } from "./bits.jsx";
import { describeSave, exportSlot, fileNameFor, importSave, MAX_SLOTS } from "../game/save.js";

function fmtDate(ts) {
  try { return new Date(ts).toLocaleString("de-CH", { day: "2-digit", month: "2-digit", year: "2-digit", hour: "2-digit", minute: "2-digit" }); }
  catch (e) { return ""; }
}

export default function Title({ saves, onContinue, onNew, onDelete, onImport }) {
  const [creating, setCreating] = useState(saves.length === 0);
  const [name, setName] = useState("");
  const [menuFor, setMenuFor] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [error, setError] = useState(null);
  const fileRef = useRef(null);
  const full = saves.length >= MAX_SLOTS;

  const doExport = (slot) => {
    const blob = new Blob([exportSlot(slot)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = fileNameFor(slot);
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
    setMenuFor(null);
  };
  const doImportFile = (e) => {
    const file = e.target.files && e.target.files[0];
    e.target.value = "";
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try { const slot = importSave(String(reader.result)); onImport(slot); setError(null); }
      catch (err) { setError(err.message); }
    };
    reader.onerror = () => setError("Datei konnte nicht gelesen werden.");
    reader.readAsText(file);
  };
  const submitNew = () => { onNew(name.trim() || `Spieler ${saves.length + 1}`); };

  return (
    <div className="title">
      <div className="title-inner">
        <div className="title-kicker">Ein Loot-Abenteuer</div>
        <h1 className="title-name">Eldenfeld</h1>
        <div className="title-sub">Sieben Regionen, drei Dungeons, unendlich Beute.</div>

        {saves.length > 0 && <div className="section" style={{ textAlign: "left" }}>Spielstände</div>}
        <div className="col">
          {saves.map(slot => {
            const d = describeSave(slot);
            return (
              <div key={slot.id} className="save-row">
                <div className="save-main" onClick={() => onContinue(slot)}>
                  <div className="save-name">{slot.name}</div>
                  <div className="save-sub">Stufe {d.level}{d.loc ? `, ${d.loc}` : ""} · {d.gold} Gold · {fmtDate(d.savedAt)}</div>
                </div>
                <div className="save-actions">
                  <Btn small tone="gold" onClick={() => onContinue(slot)}>Spielen</Btn>
                  <Btn small onClick={() => setMenuFor(menuFor === slot.id ? null : slot.id)}>…</Btn>
                </div>
                {menuFor === slot.id && (
                  <div className="save-menu">
                    <Btn small onClick={() => doExport(slot)}>Als Datei sichern</Btn>
                    {confirmDelete === slot.id
                      ? <Btn small tone="red" onClick={() => { onDelete(slot); setConfirmDelete(null); setMenuFor(null); }}>Wirklich löschen</Btn>
                      : <Btn small onClick={() => setConfirmDelete(slot.id)}>Löschen</Btn>}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div className="col" style={{ marginTop: 14 }}>
          {creating ? (
            <div className="save-new">
              <input className="input" value={name} onChange={e => setName(e.target.value)} placeholder={`Name, z. B. Spieler ${saves.length + 1}`} maxLength={24}
                onKeyDown={e => { if (e.key === "Enter") submitNew(); }} autoFocus />
              <div className="row">
                <Btn tone="gold" onClick={submitNew}>Abenteuer beginnen</Btn>
                {saves.length > 0 && <Btn onClick={() => setCreating(false)}>Abbrechen</Btn>}
              </div>
            </div>
          ) : (
            <Btn disabled={full} onClick={() => setCreating(true)}>{full ? `Höchstens ${MAX_SLOTS} Spielstände` : "Neuer Spielstand"}</Btn>
          )}
          <Btn small disabled={full} onClick={() => fileRef.current && fileRef.current.click()}>Spielstand aus Datei laden</Btn>
          <input ref={fileRef} type="file" accept=".json,application/json" style={{ display: "none" }} onChange={doImportFile} />
          {error && <div className="red" style={{ fontSize: 13 }}>{error}</div>}
        </div>

        <div className="title-help">
          <b>So spielst du</b><br />
          Steuerkreuz links, Schwert rechts. Trank-Knopf heilt automatisch mit dem passenden Trank. Im Menü legst du Beute an, die Karte zeigt erkundete Gebiete.<br />
          Tastatur: WASD oder Pfeile, Leertaste Angriff, E Trank, I Inventar.<br />
          Häuser in Dörfern betrittst du über die Tür: Händler, Heilerin, Schmied, Weise.<br />
          Jeder Spielstand hat seine eigene Welt. „Als Datei sichern“ legt ihn als Datei ab, die du auf ein anderes Handy laden kannst.
        </div>
      </div>
    </div>
  );
}
