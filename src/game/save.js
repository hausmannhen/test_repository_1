/* Speichern: mehrere Spielstände im localStorage, Versionierung, Export und Import als Datei */
import { REGIONS, VILLAGES, DUNGEONS, regionAt } from "./constants.js";

export const STORE_KEY = "eldenfeld_saves";
export const SAVE_VERSION = 1;
export const MAX_SLOTS = 12;
const LEGACY_KEYS = ["eldenfeld_save", "eldenfeld_save_v1"];

function storage() {
  try { return typeof localStorage !== "undefined" ? localStorage : null; } catch (e) { return null; }
}
function now() { return Date.now(); }
export function newSlotId() { return "s" + now().toString(36) + Math.random().toString(36).slice(2, 6); }

/* Alte Speicherstände (ohne Versionsnummer) in das aktuelle Format heben */
export function migrate(data) {
  if (!data || typeof data !== "object" || !data.P || typeof data.P !== "object") return null;
  const v = data.saveVersion || 0;
  const out = { ...data };
  if (v < 1) {
    // Version 0: Artefakt-Prototyp, gleiches Spielerformat, nur ohne Versionsfeld
    out.saveVersion = 1;
    out.P = { buffT: 0, visits: {}, chests: {}, cleared: {}, hearts: 0, kills: 0, ...out.P };
  }
  if (typeof out.seed !== "string") out.seed = "eldenfeld-" + Math.random().toString(36).slice(2, 8);
  if (!out.name) out.name = "Spielstand";
  if (!out.id) out.id = newSlotId();
  if (!out.savedAt) out.savedAt = now();
  return out;
}

/* Kurzbeschreibung für die Auswahl: Stufe, Ort */
export function describeSave(slot) {
  const P = slot.P;
  let loc = "";
  if (P.area === "over") {
    const key = `${P.sx},${P.sy}`;
    if (VILLAGES[key]) loc = VILLAGES[key].name;
    else if (P.sx >= 0 && P.sy >= 0 && P.sx < 6 && P.sy < 6) loc = REGIONS[regionAt(P.sx, P.sy)].name;
  } else {
    const d = DUNGEONS[+String(P.area).slice(1)];
    loc = d ? d.name : "Dungeon";
  }
  return { level: P.level || 1, loc, gold: P.gold || 0, kills: P.kills || 0, savedAt: slot.savedAt };
}

/* ---------- Speicher lesen und schreiben ---------- */
function readStore() {
  const s = storage();
  if (!s) return { slots: [], active: null };
  let store = null;
  try { const raw = s.getItem(STORE_KEY); if (raw) store = JSON.parse(raw); } catch (e) { store = null; }
  if (!store || !Array.isArray(store.slots)) store = { slots: [], active: null };
  // Einzelspielstand aus dem Prototyp übernehmen
  for (const k of LEGACY_KEYS) {
    try {
      const raw = s.getItem(k);
      if (raw) {
        const slot = migrate(JSON.parse(raw));
        if (slot) { slot.name = "Spielstand 1"; store.slots.push(slot); store.active = slot.id; }
        s.removeItem(k);
        writeStore(store);
      }
    } catch (e) { /* kaputter Altstand, ignorieren */ }
  }
  return store;
}
function writeStore(store) {
  const s = storage();
  if (!s) return false;
  try { s.setItem(STORE_KEY, JSON.stringify(store)); return true; } catch (e) { return false; }
}

export function listSaves() {
  return readStore().slots.map(migrate).filter(Boolean).sort((a, b) => b.savedAt - a.savedAt);
}
export function loadSlot(id) {
  return listSaves().find(x => x.id === id) || null;
}
export function makeSlot(name, seed, P) {
  return { id: newSlotId(), name: name || "Spielstand", saveVersion: SAVE_VERSION, seed, P, savedAt: now() };
}
export function writeSlot(slot) {
  const store = readStore();
  const i = store.slots.findIndex(x => x.id === slot.id);
  if (i >= 0) store.slots[i] = slot;
  else {
    if (store.slots.length >= MAX_SLOTS) return false;
    store.slots.push(slot);
  }
  store.active = slot.id;
  return writeStore(store);
}
export function deleteSlot(id) {
  const store = readStore();
  store.slots = store.slots.filter(x => x.id !== id);
  if (store.active === id) store.active = null;
  return writeStore(store);
}
export function renameSlot(id, name) {
  const store = readStore();
  const slot = store.slots.find(x => x.id === id);
  if (!slot) return false;
  slot.name = name;
  return writeStore(store);
}

/* Spielzustand G in seinen Slot schreiben */
export function serialize(G) {
  return JSON.stringify({ id: G.slot.id, name: G.slot.name, saveVersion: SAVE_VERSION, seed: G.seed, P: G.P, savedAt: now() });
}
export function saveGame(G) {
  if (!G || !G.slot) return false;
  return writeSlot(JSON.parse(serialize(G)));
}

/* ---------- Export und Import als Datei ---------- */
export function exportSlot(slot) {
  return JSON.stringify({ format: "eldenfeld-save", ...slot }, null, 2);
}
export function fileNameFor(slot) {
  const safe = String(slot.name || "spielstand").toLowerCase().replace(/[^a-z0-9äöüß]+/gi, "-").replace(/^-|-$/g, "") || "spielstand";
  return `eldenfeld-${safe}-stufe-${slot.P.level || 1}.json`;
}
/* Liefert einen neuen Slot (eigene ID, damit nichts überschrieben wird) oder wirft einen Fehler mit Erklärung */
export function importSave(text) {
  let data;
  try { data = JSON.parse(text); } catch (e) { throw new Error("Das ist keine gültige Spielstand-Datei."); }
  const slot = migrate(data);
  if (!slot || typeof slot.P.level !== "number" || !slot.P.equip || !Array.isArray(slot.P.inventory)) throw new Error("Die Datei enthält keinen Eldenfeld-Spielstand.");
  slot.id = newSlotId();
  slot.savedAt = now();
  return slot;
}

/* Nur noch für Tests und Migration */
export function deleteAllSaves() {
  const s = storage();
  if (!s) return;
  try { s.removeItem(STORE_KEY); for (const k of LEGACY_KEYS) s.removeItem(k); } catch (e) { /* egal */ }
}
