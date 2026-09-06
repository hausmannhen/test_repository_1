import React from "react";
import Panel from "./Panel.jsx";
import { Btn } from "./bits.jsx";

const HINTS = [
  "Im Westen liegt der Dunkelforst. Dort steht der Waldschrein, ganz am Rand der Welt. Sein Herr ist der Eichenkönig.",
  "Östlich von Kargstein, tief in den Höhen, ruht die Steinhalle. Ihr Wächter besteht aus Fels.",
  "Ganz im Norden brennt der Aschekessel. Der Ascheturm dort ist nur für Helden ab Stufe 25.",
  "Legendäre Beute fällt fast nie von Bettlern. Bosse lassen sie immer fallen.",
  "Glück auf deiner Rüstung erhöht die Chance auf seltene Funde. Der Schmied macht alles stärker, aber nicht seltener.",
  "Jeder besiegte Boss schenkt dir einen Herzcontainer. Drei Herzen warten in der Welt.",
];

export default function Sage({ G, onClose }) {
  const P = G.P;
  const cleared = Object.keys(P.cleared).length;
  const h = cleared >= 3 ? "Du hast alle drei Wächter bezwungen. Die Welt gehört dir. Die Monster werden trotzdem nicht müde." : HINTS[(P.kills + P.level) % HINTS.length];
  return (
    <Panel title="Die Weise" gold={P.gold} footer={<Btn tone="gold" onClick={onClose}>Danke</Btn>}>
      <div className="prose">
        <p className="quote">„{h}"</p>
        <p className="dim" style={{ fontSize: 13 }}>Besiegte Wächter: {cleared} von 3. Regionen folgen dem Uhrzeigersinn: Grasland, Wald, Höhen, Wüste, Moor, Frostkamm, Aschekessel.</p>
      </div>
    </Panel>
  );
}
