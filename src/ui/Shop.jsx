import React, { useState } from "react";
import { POTIONS, potionDesc } from "../game/items.js";
import { buyPotion, sellItem } from "../game/actions.js";
import Panel from "./Panel.jsx";
import { Btn, ItemRow } from "./bits.jsx";

export default function Shop({ G, onClose, rerender }) {
  const P = G.P;
  const [tab, setTab] = useState("kaufen");
  return (
    <Panel title="Händler" gold={P.gold} footer={<Btn tone="gold" onClick={onClose}>Verlassen</Btn>}>
      <div className="row" style={{ marginBottom: 12 }}>
        {["kaufen", "verkaufen"].map(t => <Btn key={t} small tone={tab === t ? "gold" : "default"} onClick={() => setTab(t)}>{t === "kaufen" ? "Kaufen" : "Verkaufen"}</Btn>)}
      </div>
      {tab === "kaufen" ? Object.entries(POTIONS).map(([id, p]) => (
        <div key={id} className="item-row">
          <div><span style={{ color: p.color, fontSize: 14 }}>{p.name}</span><div className="item-row-sub">{potionDesc(id)}</div></div>
          <Btn small tone={P.gold >= p.price ? "gold" : "default"} disabled={P.gold < p.price} onClick={() => { buyPotion(P, id); rerender(); }}>{p.price} G</Btn>
        </div>
      )) : (
        <div>
          {P.inventory.length === 0 && <div className="empty">Nichts zu verkaufen.</div>}
          {P.inventory.map(it => <ItemRow key={it.uid} item={it} right={<Btn small onClick={(e) => { e.stopPropagation(); sellItem(P, it); rerender(); }}>{it.value} G</Btn>} />)}
        </div>
      )}
    </Panel>
  );
}
