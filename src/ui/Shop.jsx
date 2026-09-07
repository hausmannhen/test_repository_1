import React, { useState } from "react";
import { POTIONS, potionDesc } from "../game/items.js";
import { buyPotion, sellItem, sellPrice } from "../game/actions.js";
import { POTION_MAX, potionCount } from "../game/player.js";
import Panel from "./Panel.jsx";
import { Btn, ItemRow } from "./bits.jsx";
import { ItemDetail } from "./Inventory.jsx";
import ItemIcon from "./ItemIcon.jsx";

export default function Shop({ G, onClose, rerender }) {
  const P = G.P;
  const [tab, setTab] = useState("kaufen");
  const [selected, setSelected] = useState(null);
  const sel = selected && P.inventory.includes(selected) ? selected : null;
  return (
    <Panel title="Händler" gold={P.gold} footer={<Btn tone="gold" onClick={onClose}>Verlassen</Btn>}>
      <div className="row" style={{ marginBottom: 12 }}>
        {["kaufen", "verkaufen"].map(t => <Btn key={t} small tone={tab === t ? "gold" : "default"} onClick={() => setTab(t)}>{t === "kaufen" ? "Kaufen" : "Verkaufen"}</Btn>)}
      </div>
      {tab === "kaufen" ? Object.entries(POTIONS).map(([id, p]) => (
        <div key={id} className="item-row"><div className="item-row-head">
          <ItemIcon item={{ kind: "trank", potId: id }} />
          <div className="item-row-text"><span style={{ color: p.color, fontSize: 14 }}>{p.name}</span><div className="item-row-sub">{potionDesc(id)}</div></div>
          <Btn small tone={P.gold >= p.price && potionCount(P, id) < POTION_MAX ? "gold" : "default"} disabled={P.gold < p.price || potionCount(P, id) >= POTION_MAX} onClick={() => { buyPotion(P, id); rerender(); }}>{potionCount(P, id) >= POTION_MAX ? `Voll (${POTION_MAX})` : `${p.price} G`}</Btn>
        </div></div>
      )) : (
        <div>
          {P.inventory.length === 0 && <div className="empty">Nichts zu verkaufen.</div>}
          {P.inventory.map(it => <ItemRow key={it.uid} item={it} selected={sel === it} onClick={() => setSelected(sel === it ? null : it)} right={<Btn small onClick={(e) => { e.stopPropagation(); sellItem(P, it); rerender(); }}>{sellPrice(it)} G</Btn>}>
            <ItemDetail P={P} item={it} actions={[]} />
          </ItemRow>)}
        </div>
      )}
    </Panel>
  );
}
