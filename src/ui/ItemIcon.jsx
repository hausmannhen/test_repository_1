/* Kleine Icons je Itemart als Inline-SVG, Farbe nach Seltenheit */
import React from "react";
import { RARITY_BY_ID, POTIONS, BASE_BY_ID } from "../game/items.js";

const SHAPES = {
  // Nahkampf
  sword:   <g><path d="M12 3 L14 5 L7 15 L5 13 Z" /><path d="M4 14 L6 16 L4.5 18 L2 15.5 Z" /><path d="M5 12 L8 15" strokeWidth="1.6" stroke="currentColor" fill="none" /></g>,
  dagger:  <g><path d="M11 4 L13 6 L8 13 L6 11 Z" /><path d="M5 12 L7 14 L5 16 L3 14 Z" /></g>,
  axe:     <g><path d="M9 16 L11 4" stroke="currentColor" strokeWidth="1.6" fill="none" /><path d="M10 5 C14 3 16 6 15 10 C13 8 11 8 10 9 Z" /></g>,
  hammer:  <g><path d="M9 17 L11 6" stroke="currentColor" strokeWidth="1.6" fill="none" /><rect x="7" y="3" width="9" height="5" rx="1" /></g>,
  spear:   <g><path d="M4 16 L14 6" stroke="currentColor" strokeWidth="1.4" fill="none" /><path d="M13 4 L17 3 L16 7 Z" /></g>,
  // Fernkampf
  bow:     <g><path d="M6 3 C14 6 14 14 6 17" stroke="currentColor" strokeWidth="1.6" fill="none" /><path d="M6 3 L6 17" stroke="currentColor" strokeWidth="0.8" fill="none" /><path d="M6 10 L15 10 M13 8 L15 10 L13 12" stroke="currentColor" strokeWidth="1" fill="none" /></g>,
  crossbow:<g><path d="M10 4 L10 17" stroke="currentColor" strokeWidth="1.8" fill="none" /><path d="M3 8 C8 5 12 5 17 8" stroke="currentColor" strokeWidth="1.6" fill="none" /><path d="M3 8 L17 8" stroke="currentColor" strokeWidth="0.8" fill="none" /></g>,
  knife:   <g><path d="M12 4 L14 6 L9 12 L7 10 Z" /><path d="M6 11 L8 13 L6 15 L4 13 Z" /><path d="M13 13 L15 15 L10 17" stroke="currentColor" strokeWidth="1" fill="none" /></g>,
  // Fokus
  staff:   <g><path d="M7 17 L12 6" stroke="currentColor" strokeWidth="1.6" fill="none" /><circle cx="13" cy="5" r="2.4" /></g>,
  // Rüstung
  helm:    <g><path d="M4 12 C4 6 16 6 16 12 L16 15 L4 15 Z" /><rect x="6" y="11" width="8" height="2" fill="#1b1712" /></g>,
  hat:     <g><path d="M10 2 L14 12 L3 14 L17 14 L6 12 Z" /><path d="M10 2 L14 12 L6 12 Z" /></g>,
  hood:    <g><path d="M10 3 C4 5 4 12 5 16 L15 16 C16 12 16 5 10 3 Z" /><path d="M8 10 C9 8 11 8 12 10 L12 16 L8 16 Z" fill="#1b1712" /></g>,
  armor:   <g><path d="M6 4 L10 6 L14 4 L16 7 L15 9 L14 16 L6 16 L5 9 L4 7 Z" /></g>,
  robe:    <g><path d="M7 3 L10 5 L13 3 L15 6 L13 8 L14 17 L6 17 L7 8 L5 6 Z" /></g>,
  shield:  <g><path d="M10 3 L16 5 L15 12 C14 15 12 16 10 17 C8 16 6 15 5 12 L4 5 Z" /><path d="M10 5 L10 15" stroke="#1b1712" strokeWidth="1" fill="none" /></g>,
  book:    <g><rect x="4" y="4" width="12" height="12" rx="1" /><path d="M10 4 L10 16 M6 7 L9 7 M6 10 L9 10" stroke="#1b1712" strokeWidth="1" fill="none" /></g>,
  quiver:  <g><rect x="7" y="6" width="6" height="11" rx="1" /><path d="M8 6 L9 2 M10 6 L10 2 M12 6 L11 2" stroke="currentColor" strokeWidth="1.2" fill="none" /></g>,
  amulet:  <g><path d="M4 4 C6 9 14 9 16 4" stroke="currentColor" strokeWidth="1.2" fill="none" /><path d="M10 9 L13 12 L10 16 L7 12 Z" /></g>,
  ring:    <g><circle cx="10" cy="11" r="5" stroke="currentColor" strokeWidth="2.4" fill="none" /><path d="M10 3 L12 6 L8 6 Z" /></g>,
  potion:  <g><path d="M8 3 L12 3 L12 7 C15 9 15 16 10 17 C5 16 5 9 8 7 Z" /><rect x="8" y="2" width="4" height="2" fill="#e9dcb8" /></g>,
};
const BY_BASE = {
  dolch: "dagger", kurzschwert: "sword", langschwert: "sword", streitaxt: "axe", kriegshammer: "hammer", rapier: "sword", speer: "spear",
  wurfmesser: "knife", wurfaxt: "axe", kurzbogen: "bow", langbogen: "bow", armbrust: "crossbow",
  zauberstab: "staff", kristallstab: "staff", runenzepter: "staff", blutdolch: "dagger",
  lederkappe: "helm", eisenhelm: "helm", ritterhelm: "helm", zauberhut: "hat", kapuze: "hood",
  lederwams: "armor", kettenhemd: "armor", plattenpanzer: "armor", robe: "robe", jaegermantel: "robe",
  holzschild: "shield", rundschild: "shield", turmschild: "shield", zauberbuch: "book", koecher: "quiver",
  talisman: "amulet", anhaenger: "amulet", amulett: "amulet", seelenstein: "amulet",
  ring: "ring", siegelring: "ring", bandring: "ring", runenring: "ring",
};
const BY_SLOT = { waffe: "sword", kopf: "helm", rumpf: "armor", schild: "shield", amulett: "amulet", ring: "ring" };

export function iconKey(item) {
  if (item.kind === "trank") return "potion";
  return BY_BASE[item.baseId] || BY_SLOT[item.slot] || "sword";
}
export default function ItemIcon({ item, size = 34 }) {
  const color = item.kind === "gear" ? RARITY_BY_ID[item.rarity].color : (POTIONS[item.potId] || {}).color || "#fff";
  const shape = SHAPES[iconKey(item)] || SHAPES.sword;
  return (
    <svg className="item-icon" width={size} height={size} viewBox="0 0 20 20" style={{ color, fill: color, background: "#1b1712", borderRadius: 6, border: `1px solid ${color}55`, flexShrink: 0 }} aria-hidden="true">
      {shape}
    </svg>
  );
}
