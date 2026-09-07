/* Online-Konten: Anmeldung mit Name und PIN, Spielstand in der Cloud, lokaler Zwischenstand für offline. */
import { CLOUD } from "../cloud.config.js";
import { migrate, SAVE_VERSION } from "./save.js";

export const CLOUD_CACHE_KEY = "eldenfeld_cloud";
export const MAX_CLOUD_ACCOUNTS = 10;

function storage() { try { return typeof localStorage !== "undefined" ? localStorage : null; } catch (e) { return null; } }

export class CloudClient {
  constructor(opts = {}) {
    this.url = (opts.url ?? CLOUD.url ?? "").replace(/\/+$/, "");
    this.key = opts.key ?? CLOUD.key ?? "";
    this.fetch = opts.fetch || (typeof fetch === "function" ? (...a) => fetch(...a) : null);
    this.online = true;
    this.lastError = null;
    this.pending = null; this.pushTimer = null; this.lastPush = 0;
    this.onStatus = opts.onStatus || null;
  }
  get enabled() { return !!(this.url && this.key && this.fetch); }

  async rpc(fn, args = {}, withAuth = true) {
    if (!this.enabled) throw new Error("Online-Konten sind nicht eingerichtet");
    const headers = { "Content-Type": "application/json", apikey: this.key };
    if (withAuth) headers.Authorization = "Bearer " + this.key;
    let res;
    try { res = await this.fetch(`${this.url}/rest/v1/rpc/${fn}`, { method: "POST", headers, body: JSON.stringify(args) }); }
    catch (e) { this.setOnline(false); throw new Error("Keine Verbindung"); }
    this.setOnline(true);
    if (res.status === 401 && withAuth) return this.rpc(fn, args, false);
    let data = null;
    try { data = await res.json(); } catch (e) { data = null; }
    if (!res.ok) {
      const msg = (data && (data.message || data.hint || data.details)) || `Fehler ${res.status}`;
      throw new Error(String(msg).trim() || `Fehler ${res.status}`);
    }
    return data;
  }
  setOnline(v) { if (this.online !== v) { this.online = v; this.onStatus && this.onStatus(v); } }

  /* ---------- Sitzung ---------- */
  readCache() { const s = storage(); if (!s) return null; try { const raw = s.getItem(CLOUD_CACHE_KEY); return raw ? JSON.parse(raw) : null; } catch (e) { return null; } }
  writeCache(c) { const s = storage(); if (!s) return; try { if (c) s.setItem(CLOUD_CACHE_KEY, JSON.stringify(c)); else s.removeItem(CLOUD_CACHE_KEY); } catch (e) { /* egal */ } }
  session() { const c = this.readCache(); return c && c.name && c.token ? { name: c.name, token: c.token } : null; }
  logout() { this.writeCache(null); }

  async list() { return this.rpc("konten_liste"); }
  async register(name, pin, save = null) {
    const r = await this.rpc("konto_anlegen", { p_name: name, p_pin: pin, p_save: save });
    this.writeCache({ name: r.name, token: r.token, save: r.save || null, savedAt: Date.now(), dirty: false });
    return this.toSlot(r.name, r.save);
  }
  async login(name, pin) {
    const r = await this.rpc("konto_login", { p_name: name, p_pin: pin });
    const cache = this.readCache();
    let save = r.save;
    // Lokal neuerer, noch nicht hochgeladener Stand gewinnt
    if (cache && cache.name === r.name && cache.dirty && cache.save && (!save || (cache.savedAt || 0) >= Date.parse(r.updated_at || 0))) save = cache.save;
    this.writeCache({ name: r.name, token: r.token, save, savedAt: Date.now(), dirty: cache && cache.dirty && save === cache.save });
    if (cache && cache.dirty && save === cache.save) this.pushNow(r.name, r.token, save).catch(() => {});
    return this.toSlot(r.name, save);
  }
  /* Ohne PIN weiterspielen, solange die Sitzung gültig ist */
  async resume() {
    const c = this.readCache();
    if (!c || !c.name || !c.token) return null;
    try {
      const r = await this.rpc("konto_laden", { p_name: c.name, p_token: c.token });
      let save = r.save;
      if (c.dirty && c.save && (!save || (c.savedAt || 0) >= Date.parse(r.updated_at || 0))) { save = c.save; this.pushNow(c.name, c.token, save).catch(() => {}); }
      else this.writeCache({ ...c, save, dirty: false });
      return this.toSlot(c.name, save);
    } catch (e) {
      if (/Sitzung|nicht gefunden/.test(e.message)) { this.logout(); return null; }
      // offline: mit dem lokalen Stand weiter
      return c.save ? this.toSlot(c.name, c.save) : null;
    }
  }
  toSlot(name, save) {
    const base = save ? migrate(save) : null;
    return { id: "cloud:" + name, name, cloud: true, saveVersion: SAVE_VERSION, seed: base ? base.seed : null, P: base ? base.P : null, savedAt: base ? base.savedAt : Date.now() };
  }

  /* ---------- Speichern: lokal sofort, online gebündelt ---------- */
  save(slot) {
    const c = this.readCache();
    const sess = c && c.name === slot.name ? c : { name: slot.name, token: null };
    const save = { saveVersion: SAVE_VERSION, seed: slot.seed, P: slot.P, name: slot.name, savedAt: Date.now() };
    this.writeCache({ ...sess, save, savedAt: save.savedAt, dirty: true });
    if (!sess.token) return;
    this.pending = save;
    const wait = Math.max(0, 4000 - (Date.now() - this.lastPush));
    if (this.pushTimer) clearTimeout(this.pushTimer);
    this.pushTimer = setTimeout(() => this.flush(), wait);
  }
  async flush() {
    if (this.pushTimer) { clearTimeout(this.pushTimer); this.pushTimer = null; }
    const c = this.readCache();
    if (!this.pending || !c || !c.token) return false;
    const save = this.pending; this.pending = null;
    try { await this.pushNow(c.name, c.token, save); return true; }
    catch (e) { this.lastError = e.message; this.pending = save; return false; }
  }
  async pushNow(name, token, save) {
    this.lastPush = Date.now();
    await this.rpc("konto_speichern", { p_name: name, p_token: token, p_save: save });
    const c = this.readCache();
    if (c && c.name === name && c.save === save) this.writeCache({ ...c, dirty: false });
    else if (c && c.name === name && !this.pending) this.writeCache({ ...c, dirty: false });
  }
  async changePin(oldPin, newPin) {
    const s = this.session(); if (!s) throw new Error("Nicht angemeldet");
    return this.rpc("konto_pin_aendern", { p_name: s.name, p_token: s.token, p_alt: oldPin, p_neu: newPin });
  }
  async remove(pin) {
    const s = this.session(); if (!s) throw new Error("Nicht angemeldet");
    const r = await this.rpc("konto_loeschen", { p_name: s.name, p_token: s.token, p_pin: pin });
    this.logout();
    return r;
  }
}
