/* Speichern: localStorage-Wrapper mit Versionierung */
export const SAVE_KEY = "eldenfeld_save";
export const SAVE_VERSION = 1;

function storage() {
  try { return typeof localStorage !== "undefined" ? localStorage : null; } catch (e) { return null; }
}

/* Alte Speicherstände (ohne Versionsnummer) in das aktuelle Format heben */
export function migrate(data) {
  if (!data || typeof data !== "object" || !data.P) return null;
  const v = data.saveVersion || 0;
  const out = { ...data };
  if (v < 1) {
    // Version 0: Artefakt-Prototyp, gleiches Spielerformat, nur ohne Versionsfeld
    out.saveVersion = 1;
    out.P = { buffT: 0, visits: {}, chests: {}, cleared: {}, hearts: 0, kills: 0, ...out.P };
  }
  return out;
}

export function serialize(G) {
  return JSON.stringify({ saveVersion: SAVE_VERSION, seed: G.seed, P: G.P, savedAt: Date.now() });
}

export function saveGame(G) {
  const s = storage();
  if (!s) return false;
  try { s.setItem(SAVE_KEY, serialize(G)); return true; } catch (e) { return false; }
}

export function loadGame() {
  const s = storage();
  if (!s) return null;
  try {
    const raw = s.getItem(SAVE_KEY) || s.getItem("eldenfeld_save_v1");
    if (!raw) return null;
    return migrate(JSON.parse(raw));
  } catch (e) { return null; }
}

export function deleteSave() {
  const s = storage();
  if (!s) return;
  try { s.removeItem(SAVE_KEY); s.removeItem("eldenfeld_save_v1"); } catch (e) { /* egal */ }
}
