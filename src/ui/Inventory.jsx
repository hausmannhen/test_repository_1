/* Ausrüstung, Beutel und Weltkarte */
import React, { useState } from "react";
import { WORLD_W, WORLD_H, VILLAGES, DUNGEON_BY_SCREEN, DUNGEONS, REGIONS, REGION_MAP_COLORS, regionAt } from "../game/constants.js";
import { MINIBOSS_BY_SCREEN, MINIBOSSES } from "../data/minibosses.js";
import { SLOTS, SLOT_ORDER, effectiveStats, sumStats, offhandKind, offhandFits } from "../game/items.js";
import { derive, xpNeed, drinkItem, INVENTORY_MAX } from "../game/player.js";
import { POTIONS } from "../game/items.js";
import { freePoints } from "../game/skills.js";
import Skills from "./Skills.jsx";
import Settings from "./Settings.jsx";
import Quests from "./Quests.jsx";
import { StoryText } from "./Story.jsx";
import { activeQuests, isComplete } from "../game/quests.js";
import { equipItem, unequipItem, dropItem, sellPrice } from "../game/actions.js";
import Panel from "./Panel.jsx";
import { Btn, ItemName, ItemRow, StatLine } from "./bits.jsx";

/* Detail unter der Zeile: Werte, Vergleich mit dem angelegten Stück, Knöpfe */
export function ItemDetail({ P, item, actions }) {
  const other = P.equip[item.slot];
  const compare = item.kind === "gear" && other && other !== item;
  return (
    <div>
      {item.kind === "gear" && <StatLine stats={effectiveStats(item)} compare={compare ? effectiveStats(other) : null} />}
      {compare && <div className="detail-sub" style={{ marginTop: 6 }}>Vergleich mit angelegtem {SLOTS[item.slot]}: <ItemName item={other} />. Grün ist besser, Rot schlechter.</div>}
      {item.kind === "gear" && item.type === "fern" && <div className="detail-sub">Reichweite {item.range}, alle {item.rate} s ein Schuss</div>}
      {item.kind === "gear" && item.slot === "schild" && (() => {
        const kind = offhandKind(item), wt = derive(P).weaponType;
        if (kind === "fern") return <div className={offhandFits(item, wt) ? "detail-sub green" : "detail-sub red"}>Köcher: Angriff, Krit und 5 % Feuerrate nur mit Fernwaffe, sonst nur Verteidigung.</div>;
        if (kind === "fokus") return <div className={offhandFits(item, wt) ? "detail-sub green" : "detail-sub red"}>Zauberbuch: Magie, Mana und Manafluss nur mit Stab, sonst nur Verteidigung.</div>;
        return wt === "fern" ? <div className="detail-sub red">Schild mit Fernwaffe: 20 % langsamer schießen.</div> : null;
      })()}
      <div className="detail-sub" style={{ margin: "6px 0 8px" }}>Wert: {item.value} Gold, Händler zahlt {sellPrice(item)}</div>
      <div className="row">{actions}</div>
    </div>
  );
}

export default function Inventory({ G, onClose, rerender, onQuit, audio, cloud, onAccountDeleted }) {
  const P = G.P, d = derive(P);
  const [tab, setTab] = useState("ausruestung");
  const [selected, setSelected] = useState(null);
  const sel = selected && (P.inventory.includes(selected) || Object.values(P.equip).includes(selected)) ? selected : null;
  const visited = Object.keys(P.visits).filter(k => /^\d+,\d+$/.test(k));

  const doEquip = (it) => { equipItem(P, it); setSelected(it); rerender(); };
  const doUnequip = (it) => { if (unequipItem(P, it)) { setSelected(it); rerender(); } };
  const doDrop = (it) => { dropItem(P, it); setSelected(null); rerender(); };
  const doUse = (it) => { drinkItem(G, it); rerender(); };

  const points = freePoints(P);
  const questBadge = activeQuests(P).filter(id => isComplete(P, id)).length;
  const actionsFor = (it) => it.kind === "trank"
    ? [<Btn key="u" small tone="gold" onClick={() => doUse(it)}>Trinken</Btn>, <Btn key="d" small onClick={() => doDrop(it)}>Wegwerfen</Btn>]
    : P.equip[it.slot] === it
      ? [<Btn key="a" small onClick={() => doUnequip(it)}>Ablegen</Btn>]
      : [<Btn key="e" small tone="gold" onClick={() => doEquip(it)}>Anlegen</Btn>, <Btn key="d" small onClick={() => doDrop(it)}>Wegwerfen</Btn>];
  const minisDone = MINIBOSSES.filter(m => P.cleared["mb:" + m.id]).length;
  const body = tab === "einstellungen" ? <Settings audio={audio} G={G} cloud={cloud} onAccountDeleted={onAccountDeleted} /> : tab === "aufgaben" ? <Quests G={G} /> : tab === "geschichte" ? <StoryText P={P} /> : tab === "fertigkeiten" ? <Skills G={G} rerender={rerender} /> : tab === "karte" ? (
    <div>
      <div className="dim" style={{ fontSize: 13, marginBottom: 8 }}>Erkundete Gebiete. Dörfer in Gold, Dungeons als Dreieck, Reviere der Zwischenbosse als Schädel, du in Grün.</div>
      <div className="map" style={{ gridTemplateColumns: `repeat(${WORLD_W}, 1fr)` }}>
        {Array.from({ length: WORLD_W * WORLD_H }).map((_, i) => {
          const x = i % WORLD_W, y = Math.floor(i / WORLD_W), k = `${x},${y}`;
          const seen = visited.includes(k), here = P.area === "over" && P.sx === x && P.sy === y;
          const v = VILLAGES[k], dg = DUNGEON_BY_SCREEN[k], mb = MINIBOSS_BY_SCREEN[k];
          const mbDone = mb && P.cleared["mb:" + mb.id];
          return <div key={k} className={`map-cell${here ? " here" : ""}`} style={{ background: seen ? REGION_MAP_COLORS[regionAt(x, y)] : "#221c15" }}>
            {seen && v ? <span className="gold bold">■</span> : seen && dg ? <span className="red bold">▲</span> : seen && mb ? <span className={mbDone ? "dim" : "red"}>{mbDone ? "×" : "☠"}</span> : ""}
          </div>;
        })}
      </div>
      <div className="dim" style={{ fontSize: 12, marginTop: 10, lineHeight: 1.6 }}>
        {Object.entries(REGIONS).map(([k, r]) => <div key={k}><span className="swatch" style={{ background: REGION_MAP_COLORS[k] }} />{r.name}, Stufe {r.level}+</div>)}
        <div style={{ marginTop: 6 }}>Zwischenbosse: {minisDone} von {MINIBOSSES.length}. Endbosse: {DUNGEONS.filter(d => P.cleared[d.id]).length} von {DUNGEONS.length}. Getötete Monster: {P.kills}.</div>
      </div>
    </div>
  ) : (
    <div>
      <div className="box">
        <div className="dim" style={{ fontSize: 13, marginBottom: 6 }}>Stufe {P.level}, {P.xp} / {xpNeed(P.level)} Erfahrung</div>
        <StatLine stats={{ atk: d.atk, def: d.def, hp: d.maxHp, crit: d.crit, spd: d.spd, luck: d.luck, mag: d.mag, mana: d.maxMana }} />
      </div>
      <div className="section">Angelegt</div>
      {SLOT_ORDER.map(slot => {
        const it = P.equip[slot];
        if (!it) return <div key={slot} className="equip-row"><span className="dim" style={{ fontSize: 13 }}>{SLOTS[slot]}</span><span className="empty">leer</span></div>;
        return <ItemRow key={slot} item={it} tag={SLOTS[slot]} selected={sel === it} onClick={() => setSelected(sel === it ? null : it)}>
          <ItemDetail P={P} item={it} actions={actionsFor(it)} />
        </ItemRow>;
      })}
      <div className="section" style={{ marginTop: 12 }}>Beutel ({P.inventory.length} / {INVENTORY_MAX})</div>
      {P.inventory.length === 0 && <div className="empty">Noch leer. Monster lassen Beute fallen.</div>}
      {[...P.inventory].sort((a, b) => (a.kind === "trank" ? -1 : 1) - (b.kind === "trank" ? -1 : 1)).map(it => (
        <ItemRow key={it.uid} item={it} selected={sel === it} onClick={() => setSelected(sel === it ? null : it)}
          right={it.kind === "gear" && P.equip[it.slot] && sumStats(effectiveStats(it)) > sumStats(effectiveStats(P.equip[it.slot])) ? <span className="green" style={{ fontSize: 12 }}>besser</span> : it.kind === "gear" && !P.equip[it.slot] ? <span className="dim" style={{ fontSize: 12 }}>frei</span> : null}>
          <ItemDetail P={P} item={it} actions={actionsFor(it)} />
        </ItemRow>
      ))}
    </div>
  );

  return (
    <Panel title={tab === "fertigkeiten" ? "Fertigkeiten" : tab === "karte" ? "Karte" : tab === "aufgaben" ? "Aufgaben" : tab === "geschichte" ? "Geschichte" : tab === "einstellungen" ? "Einstellungen" : "Ausrüstung"} gold={P.gold} footer={<>
      <Btn onClick={onQuit}>Speichern und zum Titel</Btn>
      <Btn tone="gold" onClick={onClose}>Schließen</Btn>
    </>}>
      <div className="row" style={{ marginBottom: 12 }}>
        {["ausruestung", "fertigkeiten", "aufgaben", "geschichte", "karte", "einstellungen"].map(t => <Btn key={t} small tone={tab === t ? "gold" : "default"} onClick={() => setTab(t)}>{t === "ausruestung" ? "Ausrüstung" : t === "karte" ? "Karte" : t === "geschichte" ? "Geschichte" : t === "aufgaben" ? `Aufgaben${questBadge > 0 ? ` (${questBadge})` : ""}` : t === "einstellungen" ? "Einstellungen" : `Fertigkeiten${points > 0 ? ` (${points})` : ""}`}</Btn>)}
      </div>
      {body}
    </Panel>
  );
}
