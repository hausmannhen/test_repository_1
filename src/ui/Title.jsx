/* Titel mit fünf festen Konten: auswählen, anlegen, umbenennen, als Datei sichern, aus Datei laden, zurücksetzen */
import React, { useRef, useState } from "react";
import { Btn } from "./bits.jsx";
import { describeSave, exportSlot, fileNameFor, importSave } from "../game/save.js";
import CloudLogin from "./CloudLogin.jsx";

function fmtDate(ts) {
  try { return new Date(ts).toLocaleString("de-CH", { day: "2-digit", month: "2-digit", year: "2-digit", hour: "2-digit", minute: "2-digit" }); }
  catch (e) { return ""; }
}

export default function Title({ accounts, onContinue, onNew, onRename, onReset, onImport, cloud, onCloudStart }) {
  const [editing, setEditing] = useState(null);      // { id, mode: "new" | "rename" }
  const [name, setName] = useState("");
  const [menuFor, setMenuFor] = useState(null);
  const [confirm, setConfirm] = useState(null);      // { id, action: "reset" | "import" }
  const [error, setError] = useState(null);
  const fileRef = useRef(null);
  const importTarget = useRef(null);

  const openEditor = (acc, mode) => { setEditing({ id: acc.id, mode }); setName(mode === "rename" ? acc.slot.name : ""); setMenuFor(null); setError(null); };
  const submitEditor = (acc) => {
    const n = name.trim() || `Spieler ${acc.index}`;
    if (editing.mode === "new") onNew(acc.id, n); else onRename(acc.id, n);
    setEditing(null);
  };
  const doExport = (slot) => {
    const blob = new Blob([exportSlot(slot)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = fileNameFor(slot);
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
    setMenuFor(null);
  };
  const askImport = (acc) => {
    importTarget.current = acc.id;
    setMenuFor(null);
    if (fileRef.current) fileRef.current.click();
  };
  const doImportFile = (e) => {
    const file = e.target.files && e.target.files[0];
    e.target.value = "";
    const target = importTarget.current;
    if (!file || !target) return;
    const reader = new FileReader();
    reader.onload = () => {
      try { const slot = importSave(String(reader.result), target); onImport(slot); setError(null); }
      catch (err) { setError(err.message); }
    };
    reader.onerror = () => setError("Datei konnte nicht gelesen werden.");
    reader.readAsText(file);
  };

  return (
    <div className="title">
      <div className="title-inner">
        <div className="title-kicker">Ein Loot-Abenteuer</div>
        <h1 className="title-name">Eldenfeld</h1>
        <div className="title-sub">Sieben Regionen, drei Dungeons, unendlich Beute.</div>
        {cloud && cloud.enabled && <CloudLogin cloud={cloud} localAccounts={accounts} onStart={onCloudStart} />}
        {cloud && cloud.enabled && <div className="section" style={{ textAlign: "left", marginTop: 16 }}>Konten auf diesem Gerät</div>}
        <div className="notice">
          <b>Gerätekonten liegen im Browser dieses Geräts.</b> Wer Websitedaten oder den Verlauf löscht, im privaten Modus spielt oder den Browser wechselt, verliert die Konten. Sicherung: hinter „…“ bei jedem Konto „Als Datei sichern“, die Datei auf dem Gerät behalten und bei Bedarf über „Datei“ in ein freies Konto laden.
        </div>
        {!(cloud && cloud.enabled) && <div className="section" style={{ textAlign: "left" }}>Wer spielt?</div>}

        <div className="col">
          {accounts.map(acc => {
            const slot = acc.slot;
            const d = slot ? describeSave(slot) : null;
            const isEditing = editing && editing.id === acc.id;
            return (
              <div key={acc.id} className={`save-row${slot ? "" : " empty-slot"}`}>
                {isEditing ? (
                  <div className="save-new">
                    <input className="input" value={name} onChange={e => setName(e.target.value)} placeholder={`Name, z. B. Spieler ${acc.index}`} maxLength={24}
                      onKeyDown={e => { if (e.key === "Enter") submitEditor(acc); if (e.key === "Escape") setEditing(null); }} autoFocus />
                    <div className="row">
                      <Btn tone="gold" onClick={() => submitEditor(acc)}>{editing.mode === "new" ? "Abenteuer beginnen" : "Umbenennen"}</Btn>
                      <Btn onClick={() => setEditing(null)}>Abbrechen</Btn>
                    </div>
                  </div>
                ) : slot ? (
                  <>
                    <div className="save-main" onClick={() => onContinue(slot)}>
                      <div className="save-name"><span className="dim">{acc.index}</span> {slot.name}</div>
                      <div className="save-sub">Stufe {d.level}{d.loc ? `, ${d.loc}` : ""} · {d.gold} Gold · {fmtDate(d.savedAt)}</div>
                    </div>
                    <div className="save-actions">
                      <Btn small tone="gold" onClick={() => onContinue(slot)}>Spielen</Btn>
                      <Btn small onClick={() => { setMenuFor(menuFor === acc.id ? null : acc.id); setConfirm(null); }}>…</Btn>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="save-main" onClick={() => openEditor(acc, "new")}>
                      <div className="save-name"><span className="dim">{acc.index}</span> Freies Konto</div>
                      <div className="save-sub">Neues Abenteuer beginnen oder Spielstand aus Datei laden</div>
                    </div>
                    <div className="save-actions">
                      <Btn small tone="gold" onClick={() => openEditor(acc, "new")}>Anlegen</Btn>
                      <Btn small onClick={() => askImport(acc)}>Datei</Btn>
                    </div>
                  </>
                )}
                {menuFor === acc.id && slot && (
                  <div className="save-menu">
                    <Btn small onClick={() => openEditor(acc, "rename")}>Umbenennen</Btn>
                    <Btn small onClick={() => doExport(slot)}>Als Datei sichern</Btn>
                    {confirm && confirm.id === acc.id && confirm.action === "import"
                      ? <Btn small tone="red" onClick={() => { setConfirm(null); askImport(acc); }}>Wirklich überschreiben</Btn>
                      : <Btn small onClick={() => setConfirm({ id: acc.id, action: "import" })}>Aus Datei laden</Btn>}
                    {confirm && confirm.id === acc.id && confirm.action === "reset"
                      ? <Btn small tone="red" onClick={() => { onReset(acc.id); setConfirm(null); setMenuFor(null); }}>Wirklich zurücksetzen</Btn>
                      : <Btn small onClick={() => setConfirm({ id: acc.id, action: "reset" })}>Zurücksetzen</Btn>}
                  </div>
                )}
              </div>
            );
          })}
        </div>
        <input ref={fileRef} type="file" accept=".json,application/json" style={{ display: "none" }} onChange={doImportFile} />
        {error && <div className="red" style={{ fontSize: 13, marginTop: 8 }}>{error}</div>}

        <div className="dim" style={{ fontSize: 11, marginTop: 10 }}>Stand {typeof __BUILD__ !== "undefined" ? __BUILD__ : "Entwicklung"}. Zeigt der Titel einen älteren Stand als erwartet: Seite ganz schließen, neu öffnen.</div>
        <div className="title-help">
          <b>So spielst du</b><br />
          Steuerkreuz links, Schwert rechts. Trank-Knopf heilt automatisch mit dem passenden Trank. Im Menü legst du Beute an, die Karte zeigt erkundete Gebiete.<br />
          Tastatur: WASD oder Pfeile, Leertaste Angriff, E Trank, I Inventar.<br />
          Häuser in Dörfern betrittst du über die Tür: Händler, Heilerin, Schmied, Weise.<br />
          Jedes Konto hat seine eigene Welt und speichert automatisch. „Als Datei sichern“ legt den Spielstand als Datei ab, die auf einem anderen Handy in ein Konto geladen werden kann.
        </div>
      </div>
    </div>
  );
}
