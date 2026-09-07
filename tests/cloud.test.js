import { describe, it, beforeEach } from "node:test";
import assert from "node:assert/strict";

const mem = new Map();
globalThis.localStorage = { getItem: k => (mem.has(k) ? mem.get(k) : null), setItem: (k, v) => mem.set(k, String(v)), removeItem: k => mem.delete(k) };
const { CloudClient } = await import("../src/game/cloud.js");
const { newPlayer } = await import("../src/game/player.js");

/* Fake-Server mit den Regeln aus schema.sql, stark vereinfacht */
function fakeServer() {
  const db = new Map();
  const calls = [];
  const fail = (msg, status = 400) => ({ ok: false, status, json: async () => ({ message: msg }) });
  const ok = (data) => ({ ok: true, status: 200, json: async () => data });
  const fetch = async (url, opts) => {
    const fn = url.split("/rpc/")[1];
    const a = JSON.parse(opts.body);
    calls.push({ fn, a, auth: !!opts.headers.Authorization });
    if (fn === "konten_liste") return ok([...db.values()].map(k => ({ name: k.name, level: k.save ? k.save.P.level : 1, updated_at: new Date(k.updated).toISOString() })));
    if (fn === "konto_anlegen") {
      if (srv.code && (a.p_code || "").toLowerCase() !== srv.code.toLowerCase()) return fail("Einladungscode fehlt oder ist falsch");
      if (!/^[0-9]{4}$/.test(a.p_pin)) return fail("PIN: genau vier Ziffern");
      if (db.size >= 10) return fail("Höchstens 10 Konten");
      if (db.has(a.p_name.toLowerCase())) return fail("Name ist schon vergeben");
      const k = { name: a.p_name, pin: a.p_pin, save: a.p_save, token: "t" + db.size, fails: 0, updated: Date.now() };
      db.set(a.p_name.toLowerCase(), k);
      return ok({ name: k.name, token: k.token, save: k.save });
    }
    const k = db.get(String(a.p_name).toLowerCase());
    if (!k) return fail("Konto nicht gefunden");
    if (fn === "konto_login") {
      if (k.fails >= 5) return fail("Gesperrt bis 12:00 Uhr nach zu vielen Fehlversuchen");
      if (k.pin !== a.p_pin) { k.fails++; return fail("Falsche PIN"); }
      k.fails = 0; k.token = "t" + Math.random();
      return ok({ name: k.name, token: k.token, save: k.save, updated_at: new Date(k.updated).toISOString() });
    }
    if (k.token !== a.p_token) return fail("Sitzung abgelaufen, bitte neu anmelden", 400);
    if (fn === "konto_laden") return ok({ save: k.save, updated_at: new Date(k.updated).toISOString() });
    if (fn === "konto_speichern") { k.save = a.p_save; k.updated = Date.now(); return ok({ ok: true }); }
    if (fn === "konto_pin_aendern") { if (k.pin !== a.p_alt) return fail("Alte PIN falsch"); k.pin = a.p_neu; return ok({ ok: true }); }
    if (fn === "konto_loeschen") { if (k.pin !== a.p_pin) return fail("Falsche PIN"); db.delete(k.name.toLowerCase()); return ok({ ok: true }); }
    return fail("unbekannt", 404);
  };
  const srv = { db, calls, fetch, code: null };
  return srv;
}
const mk = (srv) => new CloudClient({ url: "https://x.supabase.co", key: "sb_publishable_test", fetch: srv.fetch });

describe("Online-Konten", () => {
  beforeEach(() => { mem.clear(); });

  it("ohne Adresse deaktiviert", () => {
    assert.equal(new CloudClient({ url: "", key: "k", fetch: async () => ({}) }).enabled, false);
  });

  it("anlegen, anmelden, Sitzung merken, wieder aufnehmen", async () => {
    const srv = fakeServer(); const c = mk(srv);
    const slot = await c.register("Hendrik", "1234", { saveVersion: 4, seed: "s", P: newPlayer("s") });
    assert.equal(slot.id, "cloud:Hendrik"); assert.equal(slot.P.level, 1);
    assert.ok(c.session() && c.session().name === "Hendrik");
    await assert.rejects(() => c.register("Hendrik", "1234"), /vergeben/);
    await assert.rejects(() => c.register("Kollege", "12"), /vier Ziffern/);
    c.logout(); assert.equal(c.session(), null);
    await assert.rejects(() => c.login("Hendrik", "0000"), /Falsche PIN/);
    const again = await c.login("hendrik", "1234");
    assert.equal(again.name, "Hendrik");
    const resumed = await mk(srv).resume();
    assert.equal(resumed.name, "Hendrik");
  });

  it("fünf Fehlversuche sperren", async () => {
    const srv = fakeServer(); const c = mk(srv);
    await c.register("A", "1234");
    for (let i = 0; i < 5; i++) await assert.rejects(() => c.login("A", "9999"));
    await assert.rejects(() => c.login("A", "1234"), /Gesperrt/);
  });

  it("speichern läuft lokal sofort und online gebündelt", async () => {
    const srv = fakeServer(); const c = mk(srv);
    const slot = await c.register("B", "1234");
    const P = newPlayer("s"); P.gold = 777;
    c.save({ ...slot, seed: "s", P });
    assert.equal(c.readCache().dirty, true);
    assert.equal(c.readCache().save.P.gold, 777);
    assert.ok(await c.flush());
    assert.equal(srv.db.get("b").save.P.gold, 777);
    assert.equal(c.readCache().dirty, false);
    assert.equal(srv.calls.filter(x => x.fn === "konto_speichern").length, 1);
  });

  it("offline: lokaler Stand bleibt, wird beim nächsten Login hochgeladen", async () => {
    const srv = fakeServer(); const c = mk(srv);
    const slot = await c.register("C", "1234", { saveVersion: 4, seed: "s", P: newPlayer("s") });
    const P = newPlayer("s"); P.gold = 5; P.level = 9;
    const realFetch = c.fetch;
    c.fetch = async () => { throw new Error("net"); };
    c.save({ ...slot, seed: "s", P });
    assert.equal(await c.flush(), false);
    assert.equal(c.online, false);
    // App neu gestartet, Netz wieder da
    const c2 = mk(srv);
    const resumed = await c2.resume();
    assert.equal(resumed.P.level, 9, "lokaler Stand verloren");
    await new Promise(r => setTimeout(r, 10));
    assert.equal(srv.db.get("c").save.P.level, 9, "nicht hochgeladen");
    void realFetch;
  });

  it("401 mit Authorization wird ohne wiederholt", async () => {
    const srv = fakeServer();
    const inner = srv.fetch;
    const fetch = async (url, opts) => opts.headers.Authorization ? { ok: false, status: 401, json: async () => ({ message: "Invalid JWT" }) } : inner(url, opts);
    const c = new CloudClient({ url: "https://x.supabase.co", key: "k", fetch });
    await c.register("D", "1234");
    assert.ok(srv.calls.some(x => x.fn === "konto_anlegen" && !x.auth));
  });

  it("Einladungscode schützt das Anlegen", async () => {
    const srv = fakeServer(); srv.code = "Elmshain"; const c = mk(srv);
    await assert.rejects(() => c.register("F", "1234"), /Einladungscode/);
    await assert.rejects(() => c.register("F", "1234", null, "falsch"), /Einladungscode/);
    const slot = await c.register("F", "1234", null, "elmshain");
    assert.equal(slot.name, "F");
  });

  it("PIN ändern und Konto löschen", async () => {
    const srv = fakeServer(); const c = mk(srv);
    await c.register("E", "1234");
    await assert.rejects(() => c.changePin("0000", "4321"), /Alte PIN/);
    await c.changePin("1234", "4321");
    await assert.rejects(() => c.remove("1234"), /Falsche PIN/);
    await c.remove("4321");
    assert.equal(c.session(), null);
    assert.equal(srv.db.size, 0);
  });
});
