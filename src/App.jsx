/* Titel, Spiel, Panels. Spielschleife: Engine-Update, 3D-Render, HUD-Sync. */
import React, { useCallback, useEffect, useRef, useState } from "react";
import { createGame, startGame, update, respawn, locationName } from "./game/engine.js";
import { derive, xpNeed, usePotion } from "./game/player.js";
import { saveGame, listSaves, makeSlot, writeSlot, deleteSlot } from "./game/save.js";
import { newPlayer } from "./game/player.js";
import { createInput, readInput, bindKeyboard } from "./game/input.js";
import Scene from "./render3d/Scene.jsx";
import Hud from "./ui/Hud.jsx";
import Controls from "./ui/Controls.jsx";
import Title from "./ui/Title.jsx";
import Inventory from "./ui/Inventory.jsx";
import Shop from "./ui/Shop.jsx";
import Smith from "./ui/Smith.jsx";
import Healer from "./ui/Healer.jsx";
import Sage from "./ui/Sage.jsx";
import Death from "./ui/Death.jsx";

export default function App() {
  const [phase, setPhase] = useState("title");
  const [saves, setSaves] = useState(() => listSaves());
  const [panel, setPanel] = useState(null);
  const [ui, setUi] = useState(null);
  const [, force] = useState(0);
  const rerender = useCallback(() => force(n => n + 1), []);
  const gRef = useRef(null);
  const rendererRef = useRef(null);
  const inputRef = useRef(createInput());
  const panelRef = useRef(null);
  panelRef.current = panel;

  const closePanel = useCallback(() => {
    const G = gRef.current;
    if (G && G.panelReturn) { G.P.x = G.panelReturn.x; G.P.y = G.panelReturn.y; G.panelReturn = null; G.trigCd = 0.5; }
    setPanel(null);
    if (G) saveGame(G);
  }, []);
  const toggleInventory = useCallback(() => {
    if (panelRef.current === "inventar") closePanel();
    else if (!panelRef.current) setPanel("inventar");
  }, [closePanel]);
  const drinkPotion = useCallback(() => { const G = gRef.current; if (G && !panelRef.current && !G.dead) usePotion(G); }, []);

  const start = useCallback((slot) => {
    const G = createGame(slot.seed, slot.P, { id: slot.id, name: slot.name });
    G.openPanel = (type) => setPanel(type);
    G.save = () => saveGame(G);
    gRef.current = G;
    startGame(G);
    setPanel(null); setPhase("game");
  }, []);
  const newSave = useCallback((name) => {
    const seed = "eldenfeld-" + Math.random().toString(36).slice(2, 8);
    const slot = makeSlot(name, seed, newPlayer(seed));
    writeSlot(slot);
    start(slot);
  }, [start]);
  const importSlot = useCallback((slot) => { writeSlot(slot); setSaves(listSaves()); }, []);
  const removeSlot = useCallback((slot) => { deleteSlot(slot.id); setSaves(listSaves()); }, []);
  const quitToTitle = useCallback(() => {
    const G = gRef.current;
    if (G && !G.dead) saveGame(G);
    gRef.current = null; rendererRef.current = null;
    setPanel(null); setUi(null); setSaves(listSaves()); setPhase("title");
  }, []);

  // Tastatur
  useEffect(() => bindKeyboard(inputRef.current, { potion: drinkPotion, inventory: toggleInventory, escape: () => { if (panelRef.current && panelRef.current !== "tot") closePanel(); } }), [drinkPotion, toggleInventory, closePanel]);

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
      const P = G.P, d = derive(P);
      const pots = P.inventory.filter(i => i.kind === "trank").reduce((a, b) => a + b.qty, 0);
      const next = { hp: P.hp, maxHp: d.maxHp, level: P.level, xp: P.xp, need: xpNeed(P.level), gold: P.gold, pots, loc: locationName(G), msg: G.msg, banner: G.banner, dead: G.dead, buff: P.buffT > 0 };
      const s = JSON.stringify(next);
      if (s !== lastUi) { lastUi = s; setUi(next); }
      if (G.dead && !panelRef.current) setPanel("tot");
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [phase]);

  // Speichern beim Verlassen
  useEffect(() => {
    const onHide = () => { if (gRef.current && !gRef.current.dead) saveGame(gRef.current); };
    document.addEventListener("visibilitychange", onHide);
    window.addEventListener("pagehide", onHide);
    return () => { document.removeEventListener("visibilitychange", onHide); window.removeEventListener("pagehide", onHide); };
  }, []);

  if (phase === "title") {
    return <Title saves={saves} onContinue={start} onNew={newSave} onDelete={removeSlot} onImport={importSlot} />;
  }

  const G = gRef.current;
  const renderPanel = () => {
    if (!panel) return null;
    const props = { G, onClose: closePanel, rerender, onQuit: quitToTitle };
    if (panel === "inventar") return <Inventory {...props} />;
    if (panel === "shop") return <Shop {...props} />;
    if (panel === "smith") return <Smith {...props} />;
    if (panel === "heal") return <Healer {...props} />;
    if (panel === "sage") return <Sage {...props} />;
    if (panel === "tot") return <Death G={G} onRespawn={() => { respawn(G); setPanel(null); }} />;
    return null;
  };

  return (
    <div className="game">
      <div className="game-inner">
        <Hud ui={ui} />
        <div className="view">
          <Scene onReady={(r) => { rendererRef.current = r; }} />
          <div className="loc">{ui ? ui.loc : ""}</div>
          {ui && ui.banner && (
            <div className="banner-wrap"><div className="banner">
              <div className="banner-text">{ui.banner.text}</div>
              {ui.banner.sub && <div className="banner-sub">{ui.banner.sub}</div>}
            </div></div>
          )}
          {ui && ui.msg && <div className="msg-wrap"><span className="msg" style={{ color: ui.msg.color }}>{ui.msg.text}</span></div>}
        </div>
        <Controls input={inputRef.current} onPotion={drinkPotion} onMenu={toggleInventory} pots={ui ? ui.pots : 0} menuOpen={panel === "inventar"} />
        {renderPanel()}
      </div>
    </div>
  );
}
