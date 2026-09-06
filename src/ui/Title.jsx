import React from "react";
import { Btn } from "./bits.jsx";

export default function Title({ save, onContinue, onNew }) {
  return (
    <div className="title">
      <div className="title-inner">
        <div className="title-kicker">Ein Loot-Abenteuer</div>
        <h1 className="title-name">Eldenfeld</h1>
        <div className="title-sub">Sieben Regionen, drei Dungeons, unendlich Beute.</div>
        <div className="col">
          {save && <Btn tone="gold" onClick={onContinue}>Weiterspielen (Stufe {save.P.level})</Btn>}
          <Btn onClick={onNew}>Neues Abenteuer</Btn>
        </div>
        <div className="title-help">
          <b>So spielst du</b><br />
          Steuerkreuz links, Schwert rechts. Trank-Knopf heilt automatisch mit dem passenden Trank. Im Menü legst du Beute an, die Karte zeigt erkundete Gebiete.<br />
          Tastatur: WASD oder Pfeile, Leertaste Angriff, E Trank, I Inventar.<br />
          Häuser in Dörfern betrittst du über die Tür: Händler, Heilerin, Schmied, Weise.
        </div>
      </div>
    </div>
  );
}
