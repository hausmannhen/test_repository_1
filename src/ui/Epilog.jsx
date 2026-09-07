/* Letzte Worte eines Endbosses, nachdem der Raum leer ist */
import React from "react";
import { epilogueFor } from "../data/epilogues.js";
import Panel from "./Panel.jsx";
import { Btn } from "./bits.jsx";

export default function Epilog({ G, id, onClose }) {
  const e = epilogueFor(id, G.P.choice);
  if (!e) { onClose(); return null; }
  return (
    <Panel title={e.title} footer={<Btn tone="gold" onClick={onClose}>Weiter</Btn>}>
      <div className="prose">
        {e.words.map((w, i) => <p key={i} className="quote">{w}</p>)}
        <p className="dim" style={{ fontSize: 13, marginTop: 12 }}>{e.after}</p>
      </div>
    </Panel>
  );
}
