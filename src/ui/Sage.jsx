import React from "react";
import Panel from "./Panel.jsx";
import { Btn } from "./bits.jsx";
import { respec, spentPoints } from "../game/skills.js";
import { respecCost } from "../game/actions.js";

const HINTS = [
  "Im Westen liegt der Dunkelforst mit Nebelfurt. Ganz im Südwesten steht der Waldschrein, sein Herr ist der Eichenkönig.",
  "Nördlich, in den Höhen, liegt Kargstein. Östlich davon ruht die Steinhalle. Ihr Wächter besteht aus Fels.",
  "Ganz im Nordosten brennt der Aschekessel. Der Ascheturm dort ist nur für Helden ab Stufe 25.",
  "Sechs Dörfer, sieben Reviere, drei Dungeons. Die Bewohner der Dörfer wissen, wo die Reviere liegen. Lauf auf sie zu.",
  "Legendäre Beute fällt fast nie von Bettlern. Bosse lassen sie immer fallen.",
  "Glück auf deiner Rüstung erhöht die Chance auf seltene Funde. Der Schmied macht alles stärker, aber nicht seltener.",
  "Jeder besiegte Boss schenkt dir einen Herzcontainer. Drei Herzen warten in der Welt.",
  "Ein Bogen hält den Gegner auf Abstand. Ein Stab macht deine Zauber stärker. Beides zusammen geht nicht, wähle.",
  "Blutmagie zahlt mit deinem Leben. Sie ist die stärkste Magie, und die gefährlichste.",
];

export default function Sage({ G, onClose, rerender }) {
  const P = G.P;
  const spent = spentPoints(P), cost = respecCost(P);
  const cleared = Object.keys(P.cleared).length;
  const h = cleared >= 3 ? "Du hast alle drei Wächter bezwungen. Die Welt gehört dir. Die Monster werden trotzdem nicht müde." : HINTS[(P.kills + P.level) % HINTS.length];
  return (
    <Panel title="Die Weise" gold={P.gold} footer={<Btn tone="gold" onClick={onClose}>Danke</Btn>}>
      <div className="prose">
        <p className="quote">„{h}"</p>
        <p className="dim" style={{ fontSize: 13 }}>Besiegte Wächter: {cleared} von 3. Regionen folgen dem Uhrzeigersinn: Grasland, Wald, Höhen, Wüste, Moor, Frostkamm, Aschekessel.</p>
        <p className="dim" style={{ fontSize: 13 }}>„Ich kann dein Wissen lösen, damit du es neu ordnest. Das kostet mich Kraft, und dich Gold."</p>
        <Btn disabled={spent === 0 || P.gold < cost} onClick={() => { P.gold -= cost; respec(P); rerender(); }}>{spent === 0 ? "Nichts zu lösen" : `Alle Punkte zurücksetzen für ${cost} Gold`}</Btn>
      </div>
    </Panel>
  );
}
