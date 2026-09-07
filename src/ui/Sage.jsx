import React from "react";
import Panel from "./Panel.jsx";
import { Btn } from "./bits.jsx";
import { respec, spentPoints } from "../game/skills.js";
import { respecCost } from "../game/actions.js";
import { QUESTS, CHOICES, talkTo, makeChoice, completeQuest, canOffer, isActive, isDone } from "../game/quests.js";

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
  const d = talkTo(G, "weise");
  const choosing = !P.choice && (canOffer(P, "h7") || isActive(P, "h7"));
  const gone = P.choice === "brechen";
  const title = gone ? "Die Schülerin der Weisen" : "Die Weise";
  // Kapitel 7: die Entscheidung
  if (choosing) {
    return (
      <Panel title="Die Weise" gold={P.gold} footer={<Btn onClick={onClose}>Später</Btn>}>
        <div className="prose">
          <p className="quote">{QUESTS.h7.intro}</p>
          {Object.values(CHOICES).map(c => (
            <div key={c.id} className="box">
              <div style={{ fontSize: 15, marginBottom: 4 }}>{c.title}</div>
              <div className="dim" style={{ fontSize: 13, marginBottom: 8 }}>{c.text}</div>
              <Btn tone={c.id === "brechen" ? "red" : "gold"} onClick={() => { makeChoice(G, c.id); rerender(); }}>{c.title}</Btn>
            </div>
          ))}
          <p className="dim" style={{ fontSize: 12 }}>Die Entscheidung ist endgültig.</p>
        </div>
      </Panel>
    );
  }
  // Kapitel 7 abschließen: Ergebnis der Wahl, Belohnung
  if (d.mode === "complete" && d.quest === "h7") {
    return (
      <Panel title="Die Weise" gold={P.gold} footer={<Btn tone="gold" onClick={() => { completeQuest(G, "h7"); rerender(); }}>Weiter</Btn>}>
        <div className="prose">
          <p className="quote">{CHOICES[P.choice].result}</p>
          <p className="quote">{QUESTS.h7.done}</p>
        </div>
      </Panel>
    );
  }
  const cleared = Object.keys(P.cleared).length;
  const h = isDone(P, "h10") ? (gone ? "Sie hat mir alles beigebracht, bevor sie ging. Auch, wie man Wissen löst." : "Die Weise schläft viel, seit das Siegel hält. Sie sagt, es sei ein guter Schlaf.")
    : gone ? "Ihr Stuhl ist leer. Ich führe das Haus weiter, so gut ich kann. Frag mich, was du sie gefragt hättest."
    : cleared >= 3 ? "Du hast alle drei Wächter bezwungen. Die Welt gehört dir. Die Monster werden trotzdem nicht müde." : HINTS[(P.kills + P.level) % HINTS.length];
  return (
    <Panel title={title} gold={P.gold} footer={<Btn tone="gold" onClick={onClose}>Danke</Btn>}>
      <div className="prose">
        <p className="quote">„{h}"</p>
        <p className="dim" style={{ fontSize: 13 }}>Besiegte Wächter: {cleared} von 3. Regionen folgen dem Uhrzeigersinn: Grasland, Wald, Höhen, Wüste, Moor, Frostkamm, Aschekessel.</p>
        <p className="dim" style={{ fontSize: 13 }}>„Ich kann dein Wissen lösen, damit du es neu ordnest. Das kostet mich Kraft, und dich Gold."</p>
        <Btn disabled={spent === 0 || P.gold < cost} onClick={() => { P.gold -= cost; respec(P); rerender(); }}>{spent === 0 ? "Nichts zu lösen" : `Alle Punkte zurücksetzen für ${cost} Gold`}</Btn>
      </div>
    </Panel>
  );
}
