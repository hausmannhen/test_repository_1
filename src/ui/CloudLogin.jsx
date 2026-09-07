/* Online-Konten: Liste, Anmeldung mit PIN, neues Konto, lokales Konto hochladen */
import React, { useEffect, useState } from "react";
import { Btn } from "./bits.jsx";
import { MAX_CLOUD_ACCOUNTS } from "../game/cloud.js";
import { REGIONS, VILLAGES, regionAt, WORLD_W, WORLD_H } from "../game/constants.js";

function fmtDate(ts) {
  try { return new Date(ts).toLocaleString("de-CH", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }); } catch (e) { return ""; }
}
function locOf(loc) {
  if (!loc || !loc.area) return "";
  if (loc.area === "over") { const k = `${loc.sx},${loc.sy}`; if (VILLAGES[k]) return VILLAGES[k].name; if (loc.sx >= 0 && loc.sy >= 0 && loc.sx < WORLD_W && loc.sy < WORLD_H) return REGIONS[regionAt(loc.sx, loc.sy)].name; }
  return "Dungeon";
}

export default function CloudLogin({ cloud, localAccounts, onStart, onImportLocal }) {
  const [list, setList] = useState(null);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  const [mode, setMode] = useState(null);      // { kind: "login", name } | { kind: "new" } | { kind: "upload", slot }
  const [name, setName] = useState("");
  const [pin, setPin] = useState("");
  const [pin2, setPin2] = useState("");
  const [code, setCode] = useState("");
  const session = cloud.session();

  const refresh = () => cloud.list().then(l => { setList(l); setError(null); }).catch(e => { setList([]); setError(e.message); });
  useEffect(() => { refresh(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, []);

  const run = async (fn) => {
    setBusy(true); setError(null);
    try { const slot = await fn(); if (slot) onStart(slot); }
    catch (e) { setError(e.message); }
    finally { setBusy(false); }
  };
  const doLogin = () => run(async () => cloud.login(mode.name, pin));
  const doNew = () => run(async () => {
    if (pin !== pin2) throw new Error("Die PINs stimmen nicht überein");
    return cloud.register(name.trim(), pin, null, code);
  });
  const doUpload = () => run(async () => {
    if (pin !== pin2) throw new Error("Die PINs stimmen nicht überein");
    const slot = await cloud.register(name.trim(), pin, { saveVersion: mode.slot.saveVersion, seed: mode.slot.seed, P: mode.slot.P }, code);
    onImportLocal && onImportLocal(mode.slot);
    return slot;
  });
  const doResume = () => run(async () => {
    const slot = await cloud.resume();
    if (!slot) throw new Error("Sitzung abgelaufen, bitte mit PIN anmelden");
    return slot;
  });
  const pinInput = (val, set, ph) => <input className="input" type="password" inputMode="numeric" pattern="[0-9]*" maxLength={4} value={val} placeholder={ph} onChange={e => set(e.target.value.replace(/\D/g, "").slice(0, 4))} />;
  const full = list && list.length >= MAX_CLOUD_ACCOUNTS;

  return (
    <div className="cloud">
      <div className="section" style={{ textAlign: "left" }}>Online-Konten {cloud.online ? "" : <span className="red">· offline</span>}</div>
      {session && !mode && (
        <div className="save-row">
          <div className="save-main"><div className="save-name">{session.name}</div><div className="save-sub">Angemeldet auf diesem Gerät</div></div>
          <div className="save-actions"><Btn small tone="gold" disabled={busy} onClick={doResume}>Weiterspielen</Btn><Btn small onClick={() => { cloud.logout(); setMode(null); refresh(); }}>Abmelden</Btn></div>
        </div>
      )}
      {list === null && <div className="dim" style={{ fontSize: 13 }}>Lade Konten …</div>}
      {list && list.length === 0 && !mode && <div className="empty">Noch kein Online-Konto.</div>}
      {list && !mode && list.filter(k => !session || k.name !== session.name).map(k => (
        <div key={k.name} className="save-row">
          <div className="save-main" onClick={() => { setMode({ kind: "login", name: k.name }); setPin(""); setError(null); }}>
            <div className="save-name">{k.name}</div>
            <div className="save-sub">Stufe {k.level}{locOf(k.loc) ? `, ${locOf(k.loc)}` : ""} · {k.gold || 0} Gold · {fmtDate(k.updated_at)}</div>
          </div>
          <div className="save-actions"><Btn small tone="gold" onClick={() => { setMode({ kind: "login", name: k.name }); setPin(""); setError(null); }}>Anmelden</Btn></div>
        </div>
      ))}

      {mode && mode.kind === "login" && (
        <div className="save-new">
          <div className="save-name">{mode.name}</div>
          {pinInput(pin, setPin, "PIN, vier Ziffern")}
          <div className="row"><Btn tone="gold" disabled={busy || pin.length !== 4} onClick={doLogin}>Anmelden</Btn><Btn onClick={() => setMode(null)}>Abbrechen</Btn></div>
        </div>
      )}
      {mode && (mode.kind === "new" || mode.kind === "upload") && (
        <div className="save-new">
          {mode.kind === "upload" && <div className="dim" style={{ fontSize: 13 }}>Gerätekonto „{mode.slot.name}“ (Stufe {mode.slot.P.level}) wird als Online-Konto angelegt.</div>}
          <input className="input" value={name} maxLength={20} placeholder="Name" onChange={e => setName(e.target.value)} autoFocus />
          {pinInput(pin, setPin, "PIN, vier Ziffern")}
          {pinInput(pin2, setPin2, "PIN wiederholen")}
          <input className="input" value={code} maxLength={40} placeholder="Einladungscode (von Hendrik)" onChange={e => setCode(e.target.value)} />
          <div className="row"><Btn tone="gold" disabled={busy || name.trim().length < 2 || pin.length !== 4} onClick={mode.kind === "new" ? doNew : doUpload}>{mode.kind === "new" ? "Konto anlegen" : "Hochladen und spielen"}</Btn><Btn onClick={() => setMode(null)}>Abbrechen</Btn></div>
        </div>
      )}
      {!mode && (
        <div className="row" style={{ marginTop: 8 }}>
          <Btn small disabled={busy || full} onClick={() => { setMode({ kind: "new" }); setName(""); setPin(""); setPin2(""); setError(null); }}>{full ? `Höchstens ${MAX_CLOUD_ACCOUNTS} Konten` : "Neues Online-Konto"}</Btn>
          {localAccounts.filter(a => a.slot).length > 0 && !full && (
            <Btn small disabled={busy} onClick={() => { const a = localAccounts.find(x => x.slot); setMode({ kind: "upload", slot: a.slot }); setName(a.slot.name); setPin(""); setPin2(""); setError(null); }}>Gerätekonto hochladen</Btn>
          )}
        </div>
      )}
      {error && <div className="red" style={{ fontSize: 13, marginTop: 8 }}>{error}</div>}
      <div className="dim" style={{ fontSize: 11, marginTop: 8, lineHeight: 1.5 }}>Online-Konten liegen in der Cloud und sind von jedem Gerät aus spielbar. Vier Ziffern PIN, nach fünf Fehlversuchen 15 Minuten Sperre. PIN vergessen: Hendrik fragen.</div>
    </div>
  );
}
