/* Ausrüstung, Beutel und Weltkarte */
import React, { useState } from "react";
import { WORLD_W, WORLD_H, VILLAGES, DUNGEON_BY_SCREEN, DUNGEONS, REGIONS, REGION_MAP_COLORS, regionAt } from "../game/constants.js";
import { SLOTS, SLOT_ORDER, effectiveStats, sumStats } from "../game/items.js";
import { derive, xpNeed, usePotion, useManaPotion, INVENTORY_MAX } from "../game/player.js";
import { POTIONS } from "../game/items.js";
import { freePoints } from "../game/skills.js";
import Skills from "./Skills.jsx";
import { equipItem, unequipItem, dropItem } from "../game/actions.js";
import Panel from "./Panel.jsx";
import { Btn, ItemName, ItemRow, StatLine } from "./bits.jsx";

export function ItemDetail({ P, item, actions }) {
  const other = P.equip[item.slot];
  return (
    <div className="detail">
      <ItemName item={item} className="detail-name" />
      {item.kind === "gear" && <div style={{ margin: "6px 0 10px" }}><StatLine stats={effectiveStats(item)} compare={other && other !== item ? effectiveStats(other) : null} /></div>}
      {item.kind === "gear" && other && other !== item && <div className="detail-sub">Vergleich mit angelegtem {SLOTS[item.slot]}: <ItemName item={other} /></div>}
      <div className="detail-sub" style={{ marginBottom: 10 }}>Wert: {item.value} Gold</div>
      <div className="row">{actions}</div>
    </div>
  );
}

export default function Inventory({ G, onClose, rerender, onQuit }) {
  const P = G.P, d = derive(P);
  const [tab, setTab] = useState("ausruestung");
  const [selected, setSelected] = useState(null);
  const sel = selected && (P.inventory.includes(selected) || Object.values(P.equip).includes(selected)) ? selected : null;
  const isEquipped = sel && P.equip[sel.slot] === sel;
  const visited = Object.keys(P.visits).filter(k => /^\d+,\d+$/.test(k));

  const doEquip = (it) => { equipItem(P, it); setSelected(it); rerender(); };
  const doUnequip = (it) => { if (unequipItem(P, it)) { setSelected(it); rerender(); } };
  const doDrop = (it) => { dropItem(P, it); setSelected(null); rerender(); };
  const doUse = (it) => { const p = POTIONS[it.potId]; if (p.mana && !p.heal) useManaPotion(G); else usePotion(G); rerender(); };

  const points = freePoints(P);
  const body = tab === "fertigkeiten" ? <Skills G={G} rerender={rerender} /> : tab === "karte" ? (
    <div>
      <div className="dim" style={{ fontSize: 13, marginBottom: 8 }}>Erkundete Gebiete. Dörfer in Gold, Dungeons in Rot, du in Grün.</div>
      <div className="map" style={{ gridTemplateColumns: `repeat(${WORLD_W}, 1fr)` }}>
        {Array.from({ length: WORLD_W * WORLD_H }).map((_, i) => {
          const x = i % WORLD_W, y = Math.floor(i / WORLD_W), k = `${x},${y}`;
          const seen = visited.includes(k), here = P.area === "over" && P.sx === x && P.sy === y;
          const v = VILLAGES[k], dg = DUNGEON_BY_SCREEN[k];
          return <div key={k} className={`map-cell${here ? " here" : ""}`} style={{ background: seen ? REGION_MAP_COLORS[regionAt(x, y)] : "#221c15" }}>
            {seen && v ? <span className="gold bold">■</span> : seen && dg ? <span className="red bold">▲</span> : ""}
          </div>;
        })}
      </div>
      <div className="dim" style={{ fontSize: 12, marginTop: 10, lineHeight: 1.6 }}>
        {Object.entries(REGIONS).map(([k, r]) => <div key={k}><span className="swatch" style={{ background: REGION_MAP_COLORS[k] }} />{r.name}, Stufe {r.level}+</div>)}
        <div style={{ marginTop: 6 }}>Besiegte Bosse: {Object.keys(P.cleared).length} von {DUNGEONS.length}. Getötete Monster: {P.kills}.</div>
      </div>
    </div>
  ) : (
    <div>
      <div className="box">
        <div className="dim" style={{ fontSize: 13, marginBottom: 6 }}>Stufe {P.level}, {P.xp} / {xpNeed(P.level)} Erfahrung</div>
        <StatLine stats={{ atk: d.atk, def: d.def, hp: d.maxHp, crit: d.crit, spd: d.spd, luck: d.luck, mag: d.mag, mana: d.maxMana }} />
      </div>
      {sel && <ItemDetail P={P} item={sel} actions={sel.kind === "trank"
        ? [<Btn key="u" small tone="gold" onClick={() => doUse(sel)}>Trinken</Btn>, <Btn key="d" small onClick={() => doDrop(sel)}>Wegwerfen</Btn>]
        : isEquipped
          ? [<Btn key="a" small onClick={() => doUnequip(sel)}>Ablegen</Btn>]
          : [<Btn key="e" small tone="gold" onClick={() => doEquip(sel)}>Anlegen</Btn>, <Btn key="d" small onClick={() => doDrop(sel)}>Wegwerfen</Btn>]} />}
      <div className="section">Angelegt</div>
      {SLOT_ORDER.map(slot => {
        const it = P.equip[slot];
        return <div key={slot} onClick={() => it && setSelected(it)} className={`equip-row${sel && sel === it ? " selected" : ""}${it ? " clickable" : ""}`}>
          <span className="dim" style={{ fontSize: 13 }}>{SLOTS[slot]}</span>
          {it ? <ItemName item={it} className="small" /> : <span className="empty">leer</span>}
        </div>;
      })}
      <div className="section" style={{ marginTop: 12 }}>Beutel ({P.inventory.length} / {INVENTORY_MAX})</div>
      {P.inventory.length === 0 && <div className="empty">Noch leer. Monster lassen Beute fallen.</div>}
      {[...P.inventory].sort((a, b) => (a.kind === "trank" ? -1 : 1) - (b.kind === "trank" ? -1 : 1)).map(it => (
        <ItemRow key={it.uid} item={it} selected={sel === it} onClick={() => setSelected(it)}
          right={it.kind === "gear" && P.equip[it.slot] && sumStats(effectiveStats(it)) > sumStats(effectiveStats(P.equip[it.slot])) ? <span className="green" style={{ fontSize: 12 }}>besser</span> : null} />
      ))}
    </div>
  );

  return (
    <Panel title={tab === "fertigkeiten" ? "Fertigkeiten" : tab === "karte" ? "Karte" : "Ausrüstung"} gold={P.gold} footer={<>
      <Btn onClick={onQuit}>Speichern und zum Titel</Btn>
      <Btn tone="gold" onClick={onClose}>Schließen</Btn>
    </>}>
      <div className="row" style={{ marginBottom: 12 }}>
        {["ausruestung", "fertigkeiten", "karte"].map(t => <Btn key={t} small tone={tab === t ? "gold" : "default"} onClick={() => setTab(t)}>{t === "ausruestung" ? "Ausrüstung" : t === "karte" ? "Karte" : `Fertigkeiten${points > 0 ? ` (${points})` : ""}`}</Btn>)}
      </div>
      {body}
    </Panel>
  );
}
