/* Kleine UI-Bausteine: Knopf, Herzen, Itemname, Statzeile */
import React from "react";
import { clamp } from "../game/rng.js";
import { RARITY_BY_ID, POTIONS, STAT_NAMES, WEAPON_TYPES, potionDesc } from "../game/items.js";
import ItemIcon from "./ItemIcon.jsx";

export function Btn({ children, onClick, tone = "default", small, disabled, className = "", style }) {
  return (
    <button type="button" onClick={onClick} disabled={disabled} style={style}
      className={`btn btn-${tone}${small ? " btn-small" : ""} ${className}`}>{children}</button>
  );
}
export function Hearts({ hp, maxHp }) {
  const n = Math.ceil(maxHp / 20);
  const hearts = [];
  for (let i = 0; i < n; i++) {
    const f = clamp((hp - i * 20) / 20, 0, 1);
    hearts.push(<div key={i} className="heart" style={{ background: `linear-gradient(90deg, var(--red) ${f * 100}%, #4a3028 ${f * 100}%)` }} />);
  }
  return <div className="hearts">{hearts}</div>;
}
export function ItemName({ item, className = "" }) {
  const col = item.kind === "gear" ? RARITY_BY_ID[item.rarity].color : POTIONS[item.potId].color;
  return <span className={className} style={{ color: col }}>{item.name}{item.kind === "gear" && item.upg ? ` +${item.upg}` : ""}{item.kind === "trank" ? ` ×${item.qty}` : ""}</span>;
}
export function StatLine({ stats, compare }) {
  const keys = Object.keys({ ...stats, ...(compare || {}) });
  return (
    <div className="statline">
      {keys.map(k => {
        const v = stats[k] || 0, c = compare ? (compare[k] || 0) : null;
        const delta = c === null ? null : v - c;
        return <div key={k} className="dim">{STAT_NAMES[k]} <span className="text">{v}{k === "crit" ? "%" : ""}</span>
          {delta !== null && delta !== 0 && <span className={delta > 0 ? "green" : "red"} style={{ marginLeft: 4 }}>{delta > 0 ? "+" : ""}{delta}</span>}</div>;
      })}
    </div>
  );
}
/* Zeile mit Icon; ist sie ausgewählt, klappt darunter das Detail (children) auf */
export function ItemRow({ item, selected, onClick, right, children, tag }) {
  return (
    <div className={`item-row${selected ? " selected" : ""}`}>
      <div className="item-row-head" onClick={onClick}>
        <ItemIcon item={item} />
        <div className="item-row-text">
          <ItemName item={item} className="item-row-name" />
          <div className="item-row-sub">{item.kind === "gear" ? `${item.slot === "waffe" ? WEAPON_TYPES[item.type || "nah"] : SLOT_LABEL[item.slot]}, Stufe ${item.ilvl}, ${RARITY_BY_ID[item.rarity].name}` : potionDesc(item.potId)}{tag ? <span className="dim"> · {tag}</span> : null}</div>
        </div>
        {right}
      </div>
      {selected && children ? <div className="item-row-detail">{children}</div> : null}
    </div>
  );
}
const SLOT_LABEL = { waffe: "Waffe", kopf: "Kopf", rumpf: "Rumpf", schild: "Nebenhand", amulett: "Amulett", ring: "Ring" };
