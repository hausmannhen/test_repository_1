/* Titel, Spiel, Panels. Spielschleife: Engine-Update, 3D-Render, HUD-Sync. */
import React, { useCallback, useEffect, useRef, useState } from "react";
import { createGame, startGame, update, respawn, locationName } from "./game/engine.js";
import { derive, xpNeed, usePotion, useManaPotion } from "./game/player.js";
import { knownSpells, freePoints } from "./game/skills.js";
import { selectSpell, cycleSpell } from "./game/magic.js";
import { SPELLS, ELEMENTS } from "./data/spells.js";
import { POTIONS } from "./game/items.js";
import { saveGame, listAccounts, makeSlot, writeSlot, deleteSlot, renameSlot } from "./game/save.js";
import { newPlayer } from "./game/player.js";
import { createInput, readInput, bindKeyboard } from "./game/input.js";
import Scene from "./render3d/Scene.jsx";
import Hud from "./ui/Hud.jsx";
import Controls from "./ui/Controls.jsx";
import Title from "./ui/Title.jsx";
import StoryIntro, { markStoryRead } from "./ui/Story.jsx";
import Inventory from "./ui/Inventory.jsx";
import Shop from "./ui/Shop.jsx";
import Smith from "./ui/Smith.jsx";
import Healer from "./ui/Healer.jsx";
import Sage from "./ui/Sage.jsx";
import Death from "./ui/Death.jsx";
import Npc from "./ui/Npc.jsx";
import { trackerText } from "./game/quests.js";
import { GameAudio } from "./game/audio.js";
import { NPCS } from "./data/npcs.js";
import { CloudClient } from "./game/cloud.js";

export default function App() {
  const [phase, setPhase] = useState("title");
  const [accounts, setAccounts] = useState(() => listAccounts());
  const [panel, setPanel] = useState(null);
  const [ui, setUi] = useState(null);
  const [, force] = useState(0);
  const rerender = useCallback(() => force(n => n + 1), []);
  const gRef = useRef(null);
  const rendererRef = useRef(null);
  const inputRef = useRef(createInput());
  const panelRef = useRef(null);
  panelRef.current = panel;
  const audioRef = useRef(null);
  if (!audioRef.current) audioRef.current = new GameAudio();
  const cloudRef = useRef(null);
  if (!cloudRef.current) cloudRef.current = new CloudClient();
  const [, setOnline] = useState(true);
  useEffect(() => { cloudRef.current.onStatus = (v) => setOnline(v); }, []);

  /* Speichern: Gerätekonto in localStorage, Online-Konto in Cloud-Zwischenspeicher plus gebündeltem Upload */
  const persist = useCallback((G) => {
    if (!G || !G.slot) return;
    if (G.slot.cloud) cloudRef.current.save({ name: G.slot.name, seed: G.seed, P: G.P });
    else saveGame(G);
  }, []);
  const closePanel = useCallback(() => {
    const G = gRef.current;
    if (G && G.panelReturn) { G.P.x = G.panelReturn.x; G.P.y = G.panelReturn.y; G.panelReturn = null; G.trigCd = 0.5; }
    if (panelRef.current === "geschichte") markStoryRead(G);
    setPanel(null);
    if (G) persist(G);
  }, [persist]);
  const toggleInventory = useCallback(() => {
    if (panelRef.current === "inventar") closePanel();
    else if (!panelRef.current) setPanel("inventar");
  }, [closePanel]);
  const drinkPotion = useCallback(() => { const G = gRef.current; if (G && !panelRef.current && !G.dead) usePotion(G); }, []);
  const drinkMana = useCallback(() => { const G = gRef.current; if (G && !panelRef.current && !G.dead) useManaPotion(G); }, []);
  const pickSpell = useCallback((idOrIndex) => {
    const G = gRef.current; if (!G) return;
    const list = knownSpells(G.P);
    const id = typeof idOrIndex === "number" ? list[idOrIndex] : idOrIndex;
    if (id) { selectSpell(G.P, id); G.dirty = true; }
  }, []);
  const nextSpell = useCallback(() => { const G = gRef.current; if (G) { cycleSpell(G.P); G.dirty = true; } }, []);

  const start = useCallback((slot) => {
    const seed = slot.seed || "eldenfeld-" + Math.random().toString(36).slice(2, 8);
    const G = createGame(seed, slot.P || newPlayer(seed), { id: slot.id, name: slot.name, cloud: !!slot.cloud });
    G.openPanel = (type) => setPanel(type);
    G.save = () => persist(G);
    gRef.current = G;
    startGame(G);
    setPanel(G.intro ? "geschichte" : null); setPhase("game");
  }, [persist]);
  const newSave = useCallback((accountId, name) => {
    const seed = "eldenfeld-" + Math.random().toString(36).slice(2, 8);
    const slot = makeSlot(name, seed, newPlayer(seed), accountId);
    writeSlot(slot);
    start(slot);
  }, [start]);
  const importSlot = useCallback((slot) => { writeSlot(slot); setAccounts(listAccounts()); }, []);
  const resetAccount = useCallback((id) => { deleteSlot(id); setAccounts(listAccounts()); }, []);
  const renameAccount = useCallback((id, name) => { renameSlot(id, name); setAccounts(listAccounts()); }, []);
  const quitToTitle = useCallback(() => {
    const G = gRef.current;
    if (G && !G.dead) { persist(G); if (G.slot.cloud) cloudRef.current.flush(); }
    gRef.current = null; rendererRef.current = null;
    setPanel(null); setUi(null); setAccounts(listAccounts()); setPhase("title");
  }, [persist]);

  // Tastatur
  useEffect(() => bindKeyboard(inputRef.current, { potion: drinkPotion, manaPotion: drinkMana, inventory: toggleInventory, selectSpell: pickSpell, cycleSpell: nextSpell, escape: () => { if (panelRef.current && panelRef.current !== "tot") closePanel(); } }), [drinkPotion, drinkMana, toggleInventory, pickSpell, nextSpell, closePanel]);

  // Spielschleife
  useEffect(() => {
    if (phase !== "game") return undefined;
    let raf, last = performance.now(), lastUi = "";
    const loop = (now) => {
      raf = requestAnimationFrame(loop);
      const G = gRef.current; if (!G) return;
      const dt = Math.min(0.05, (now - last) / 1000); last = now;
      const input = readInput(inputRef.current);
      if (!panelRef.current) update(G, dt, input);
      const r = rendererRef.current;
      if (r) r.render(G, dt);
      // Ton: Ereignisse abspielen, Stimmung nach Region
      const au = audioRef.current;
      if (au) {
        for (const ev of G.events) au.sfx(ev.type, ev);
        au.setMood(G.screen.dungeonRoom ? "dungeon" : G.screen.region);
        au.update(G.time);
      }
      G.events.length = 0;
      const P = G.P, d = derive(P);
      const pots = P.inventory.filter(i => i.kind === "trank" && POTIONS[i.potId] && POTIONS[i.potId].healPct).reduce((a, b) => a + b.qty, 0);
      const manaPots = P.inventory.filter(i => i.kind === "trank" && POTIONS[i.potId] && POTIONS[i.potId].manaPct).reduce((a, b) => a + b.qty, 0);
      const spells = knownSpells(P);
      const sp = P.activeSpell && SPELLS[P.activeSpell] ? SPELLS[P.activeSpell] : null;
      const next = { hp: P.hp, maxHp: d.maxHp, mana: Math.floor(P.mana), maxMana: d.maxMana, level: P.level, xp: P.xp, need: xpNeed(P.level), gold: P.gold, pots, manaPots, points: freePoints(P),
        spells, activeSpell: P.activeSpell, spell: sp ? sp.name : null, spellColor: sp ? ELEMENTS[sp.element].color : null,
        loc: locationName(G), quest: trackerText(P), msg: G.msg, banner: G.banner, dead: G.dead, buff: P.buffT > 0,
        talk: G.nearNpc && NPCS[G.nearNpc] ? NPCS[G.nearNpc].name : G.nearSign ? "Wegweiser" : null,
        area: P.area, pos: [P.sx, P.sy], visited: Object.keys(P.visits).filter(k => /^\d+,\d+$/.test(k)), cleared: P.cleared,
        raid: G.raid && G.raid.state !== "done" ? { wave: G.raid.wave, waves: G.raid.waves, well: Math.round(G.raid.wellHp), wellMax: G.raid.wellMax, left: G.mobs.filter(m => !m.dead).length, pause: G.raid.state === "pause" ? Math.ceil(G.raid.t) : 0 } : null };
      const s = JSON.stringify(next);
      if (s !== lastUi) { lastUi = s; setUi(next); }
      if (G.dead && !panelRef.current) setPanel("tot");
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [phase]);

  // Ton beim ersten Tipp freischalten (Browser verlangen eine Nutzeraktion)
  useEffect(() => {
    const unlock = () => { audioRef.current.unlock(); };
    window.addEventListener("pointerdown", unlock); window.addEventListener("keydown", unlock);
    return () => { window.removeEventListener("pointerdown", unlock); window.removeEventListener("keydown", unlock); };
  }, []);

  // Speichern beim Verlassen
  useEffect(() => {
    const onHide = () => { const G = gRef.current; if (G && !G.dead) { persist(G); if (G.slot.cloud) cloudRef.current.flush(); } };
    document.addEventListener("visibilitychange", onHide);
    window.addEventListener("pagehide", onHide);
    return () => { document.removeEventListener("visibilitychange", onHide); window.removeEventListener("pagehide", onHide); };
  }, [persist]);

  if (phase === "title") {
    return <Title accounts={accounts} onContinue={start} onNew={newSave} onRename={renameAccount} onReset={resetAccount} onImport={importSlot} cloud={cloudRef.current} onCloudStart={start} />;
  }

  const G = gRef.current;
  const renderPanel = () => {
    if (!panel) return null;
    const props = { G, onClose: closePanel, rerender, onQuit: quitToTitle, audio: audioRef.current };
    if (panel === "inventar") return <Inventory {...props} />;
    if (panel === "geschichte") return <StoryIntro {...props} />;
    if (panel === "shop") return <Shop {...props} />;
    if (panel === "smith") return <Smith {...props} />;
    if (panel === "heal") return <Healer {...props} />;
    if (panel === "sage") return <Sage {...props} />;
    if (panel === "tot") return <Death G={G} onRespawn={() => { respawn(G); setPanel(null); }} />;
    if (panel.startsWith("npc:")) return <Npc {...props} npcId={panel.slice(4)} />;
    return null;
  };

  return (
    <div className="game">
      <div className="game-inner">
        <Hud ui={ui} />
        <div className="view">
          <Scene onReady={(r) => { rendererRef.current = r; }} />
          <div className="loc">{ui ? ui.loc : ""}{ui && ui.quest ? <div className="tracker">{ui.quest}</div> : null}</div>
          {ui && ui.banner && (
            <div className="banner-wrap"><div className="banner">
              <div className="banner-text">{ui.banner.text}</div>
              {ui.banner.sub && <div className="banner-sub">{ui.banner.sub}</div>}
            </div></div>
          )}
          {ui && ui.msg && <div className="msg-wrap"><span className="msg" style={{ color: ui.msg.color }}>{ui.msg.text}</span></div>}
          {ui && ui.talk && !ui.msg && <div className="msg-wrap"><span className="msg talk-hint">{ui.talk === "Wegweiser" ? "Schwert-Knopf: Wegweiser lesen" : `Schwert-Knopf: mit ${ui.talk} sprechen`}</span></div>}
          {ui && ui.raid && (
            <div className="raidbar">
              <div className="raidbar-text">Brunnen {ui.raid.well} / {ui.raid.wellMax} · Welle {ui.raid.wave || 1} von {ui.raid.waves}{ui.raid.pause ? ` · nächste in ${ui.raid.pause} s` : ` · ${ui.raid.left} Angreifer`}</div>
              <div className="raidbar-track"><div className="raidbar-fill" style={{ width: `${(ui.raid.well / ui.raid.wellMax) * 100}%` }} /></div>
            </div>
          )}
        </div>
        <Controls input={inputRef.current} onPotion={drinkPotion} onManaPotion={drinkMana} onMenu={toggleInventory} pots={ui ? ui.pots : 0} manaPots={ui ? ui.manaPots : 0}
          menuOpen={panel === "inventar"} spells={ui ? ui.spells : []} activeSpell={ui ? ui.activeSpell : null} onSelectSpell={pickSpell} talk={ui ? ui.talk : null} />
        {renderPanel()}
      </div>
    </div>
  );
}
