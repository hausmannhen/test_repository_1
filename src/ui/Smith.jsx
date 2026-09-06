import React, { useState } from "react";
import { upgradeCost } from "../game/items.js";
import { upgradeItem } from "../game/actions.js";
import Panel from "./Panel.jsx";
import { Btn, ItemRow } from "./bits.jsx";
import { ItemDetail } from "./Inventory.jsx";

export default function Smith({ G, onClose, rerender }) {
  const P = G.P;
  const [selected, setSelected] = useState(null);
  const gear = [...Object.values(P.equip).filter(Boolean), ...P.inventory.filter(i => i.kind === "gear")];
  const sel = selected && gear.includes(selected) ? selected : null;
  return (
    <Panel title="Schmied" gold={P.gold} footer={<Btn tone="gold" onClick={onClose}>Verlassen</Btn>}>
      <p className="quote">„Jedes Stück Stahl kann besser werden. Fünfmal, dann bricht es."</p>
      {gear.length === 0 && <div className="empty">Du trägst nichts, das ich schmieden könnte.</div>}
      {gear.map(it => <ItemRow key={it.uid} item={it} selected={sel === it} onClick={() => setSelected(sel === it ? null : it)} tag={P.equip[it.slot] === it ? "angelegt" : null} right={<span className="dim" style={{ fontSize: 12 }}>+{it.upg}</span>}>
        <ItemDetail P={P} item={it} actions={[
          <Btn key="u" small tone="gold" disabled={it.upg >= 5 || P.gold < upgradeCost(it)} onClick={() => { upgradeItem(P, it); rerender(); }}>
            {it.upg >= 5 ? "Maximal verstärkt" : `Aufwerten für ${upgradeCost(it)} Gold`}
          </Btn>]} />
      </ItemRow>)}
    </Panel>
  );
}
