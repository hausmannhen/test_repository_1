/* Speichern: mehrere Spielstände im localStorage, Versionierung, Export und Import als Datei */
import { REGIONS, VILLAGES, DUNGEONS, regionAt, WORLD_W, WORLD_H, START_VILLAGE, TS } from "./constants.js";
import { LEGACY_POTIONS, POTIONS } from "../data/items.js";
import { MINIBOSS_BY_SCREEN } from "../data/minibosses.js";

export const STORE_KEY = "eldenfeld_saves";
export const SAVE_VERSION = 6;
export const ACCOUNT_COUNT = 2;
export const ACCOUNT_IDS = Array.from({ length: ACCOUNT_COUNT }, (_, i) => "konto" + (i + 1));
export const MAX_SLOTS = ACCOUNT_COUNT;
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
  if (v < 2) {
    // Version 2: Mana, Fertigkeiten, Zauber
    out.saveVersion = 2;
    out.P = { mana: 30, skills: {}, spells: [], activeSpell: null, ...out.P };
  }
  if (v < 3) {
    // Version 3: Welt 10×10, Aufgaben. Alte Positionen passen nicht mehr, Start in Elmshain.
    out.saveVersion = 3;
    const [sx, sy] = START_VILLAGE.split(",").map(Number);
    out.P = { ...out.P, area: "over", sx, sy, x: 7 * TS + 8, y: 8 * TS + 8, lastVillage: START_VILLAGE, visits: {}, quests: out.P.quests || {} };
  }
  if (v < 4) {
    // Version 4: ein Heiltrank statt drei Größen
    out.saveVersion = 4;
    const inv = [], stacks = {};
    for (const it of out.P.inventory || []) {
      if (it.kind !== "trank") { inv.push(it); continue; }
      const id = POTIONS[it.potId] ? it.potId : LEGACY_POTIONS[it.potId];
      if (!id) continue;
      if (!stacks[id]) { stacks[id] = { uid: "p_" + id, kind: "trank", potId: id, name: POTIONS[id].name, qty: 0, value: Math.round(POTIONS[id].price * 0.45) }; inv.push(stacks[id]); }
      stacks[id].qty += it.qty || 1;
    }
    out.P = { ...out.P, inventory: inv };
  }
  if (v < 5) {
    // Version 5: Geschichte in zehn Kapiteln, Kapitel 7 ist die Wahl. Alte 7 bis 9 rücken auf 8 bis 10.
    out.saveVersion = 5;
    const q = { ...(out.P.quests || {}) };
    const old7 = q.h7, old8 = q.h8, old9 = q.h9;
    delete q.h7; delete q.h8; delete q.h9;
    if (old9) q.h10 = old9;
    if (old8) q.h9 = old8;
    if (old7) q.h8 = old7;
    if (old7 || old8 || old9) { q.h7 = { state: "done", progress: 1 }; out.P.choice = out.P.choice || "brechen"; }
    out.P = { ...out.P, quests: q, choice: out.P.choice || null };
  }
  if (v < 6) {
    // Version 6: Arenen nur noch an Revieren. Truhen ehemaliger Zufallsarenen gelten als geplündert, damit nichts doppelt fällt.
    out.saveVersion = 6;
    const chests = { ...(out.P.chests || {}) }, arenas = {};
    for (const k of Object.keys(chests)) if (k.startsWith("a") && !MINIBOSS_BY_SCREEN[k.slice(1)]) { chests["w" + k.slice(1)] = true; }
    for (const k of Object.keys(out.P.arenas || {})) if (MINIBOSS_BY_SCREEN[k]) arenas[k] = true;
    out.P = { ...out.P, chests, arenas };
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
    else if (P.sx >= 0 && P.sy >= 0 && P.sx < WORLD_W && P.sy < WORLD_H) loc = REGIONS[regionAt(P.sx, P.sy)].name;
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
        const free = ACCOUNT_IDS.find(id => !store.slots.some(x => x.id === id));
        if (slot && free) { slot.id = free; slot.name = "Spieler 1"; store.slots.push(slot); store.active = slot.id; }
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
export function makeSlot(name, seed, P, id = null) {
  return { id: id || newSlotId(), name: name || "Spielstand", saveVersion: SAVE_VERSION, seed, P, savedAt: now() };
}
export function writeSlot(slot) {
  if (!ACCOUNT_IDS.includes(slot.id)) return false;
  const store = readStore();
  const i = store.slots.findIndex(x => x.id === slot.id);
  if (i >= 0) store.slots[i] = slot;
  else store.slots.push(slot);
  store.active = slot.id;
  return writeStore(store);
}
/* Die Gerätekonten in fester Reihenfolge, leer oder belegt */
export function listAccounts() {
  const saves = listSaves();
  return ACCOUNT_IDS.map((id, i) => ({ id, index: i + 1, slot: saves.find(x => x.id === id) || null }));
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
/* Liefert einen Slot für das Konto accountId oder wirft einen Fehler mit Erklärung */
export function importSave(text, accountId = null) {
  let data;
  try { data = JSON.parse(text); } catch (e) { throw new Error("Das ist keine gültige Spielstand-Datei."); }
  const slot = migrate(data);
  if (!slot || typeof slot.P.level !== "number" || !slot.P.equip || !Array.isArray(slot.P.inventory)) throw new Error("Die Datei enthält keinen Eldenfeld-Spielstand.");
  slot.id = accountId || newSlotId();
  slot.savedAt = now();
  return slot;
}

/* Nur noch für Tests und Migration */
export function deleteAllSaves() {
  const s = storage();
  if (!s) return;
  try { s.removeItem(STORE_KEY); for (const k of LEGACY_KEYS) s.removeItem(k); } catch (e) { /* egal */ }
}
