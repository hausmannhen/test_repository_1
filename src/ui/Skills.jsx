/* Fertigkeiten: Skilltree in drei Zweigen, Zauberwahl */
import React from "react";
import { SKILLS, SKILL_ORDER, skillRank, freePoints, whyNot, learn, knownSpells, levelForRank } from "../game/skills.js";
import { BRANCHES } from "../data/skills.js";
import { SPELLS, ELEMENTS, WEAPON_FOR, WEAPON_OFF } from "../data/spells.js";
import { weaponFits } from "../game/magic.js";
import { spellCost, spellDamage, selectSpell } from "../game/magic.js";
import { Btn } from "./bits.jsx";

export function SpellChip({ P, id, active, onSelect, small }) {
  const sp = SPELLS[id], el = ELEMENTS[sp.element];
  return (
    <button type="button" onClick={() => onSelect(id)} className={`chip${active ? " active" : ""}${small ? " chip-small" : ""}`} style={{ borderColor: el.color, color: active ? "#1b1712" : el.color, background: active ? el.color : "transparent" }}>
      {sp.name}
    </button>
  );
}

export default function Skills({ G, rerender }) {
  const P = G.P;
  const free = freePoints(P);
  const spells = knownSpells(P);
  return (
    <div>
      <div className="box">
        <div style={{ fontSize: 15 }}>Freie Punkte: <span className={free > 0 ? "gold bold" : "dim"}>{free}</span></div>
        <div className="dim" style={{ fontSize: 12, marginTop: 4 }}>Ein Punkt alle drei Stufen (3, 6, 9 …). Höhere Ränge brauchen je fünf Stufen mehr. Die Weise nimmt gegen Gold alle Punkte zurück.</div>
      </div>

      {spells.length > 0 && (
        <div className="box">
          <div className="section" style={{ marginTop: 0 }}>Aktiver Zauber</div>
          <div className="row">
            {spells.map(id => <SpellChip key={id} P={P} id={id} active={P.activeSpell === id} onSelect={(sid) => { selectSpell(P, sid); rerender(); }} />)}
          </div>
          {P.activeSpell && SPELLS[P.activeSpell] && (() => {
            const sp = SPELLS[P.activeSpell], c = spellCost(P, P.activeSpell);
            return <div className="dim" style={{ fontSize: 12, marginTop: 8 }}>
              {sp.desc} Schaden etwa {Math.round(spellDamage(P, P.activeSpell))}, {c.mana !== undefined ? `kostet ${c.mana} Mana` : c.hp !== undefined ? `kostet ${c.hp} Leben` : "kostet nichts"}, Abklingzeit {sp.cd} s.
              {!weaponFits(P, P.activeSpell) && <span className="red"> {WEAPON_FOR[sp.element] ? `Nur mit ${WEAPON_FOR[sp.element] === "nah" ? "Nahkampfwaffe" : "Fernwaffe"} einsetzbar.` : `Ohne Stab nur ${Math.round(WEAPON_OFF * 100)} % Wirkung.`}</span>}
            </div>;
          })()}
        </div>
      )}

      {Object.entries(BRANCHES).map(([bid, bname]) => (
        <div key={bid}>
          <div className="section">{bname}</div>
          {SKILL_ORDER.filter(id => SKILLS[id].branch === bid).map(id => {
            const s = SKILLS[id], rank = skillRank(P, id), why = whyNot(P, id);
            const el = s.spell ? ELEMENTS[SPELLS[s.spell].element] : null;
            const desc = s.desc || (s.spell ? `${SPELLS[s.spell].desc} Rang 1 schaltet den Zauber frei, jeder weitere Rang +25 % Schaden.` : "");
            return (
              <div key={id} className={`skill-row${rank > 0 ? " learned" : ""}`}>
                <div className="skill-main">
                  <div className="skill-name" style={el ? { color: el.color } : undefined}>{s.name} <span className="dim">{rank} / {s.rank}{rank < s.rank ? ` · nächster Rang ab Stufe ${levelForRank(id, rank + 1)}` : ""}</span></div>
                  <div className="skill-desc">{desc}</div>
                  {why && why !== "Maximal" && why !== "Keine Punkte" && <div className="skill-lock">{why}</div>}
                </div>
                <Btn small tone={why ? "default" : "gold"} disabled={!!why} onClick={() => { learn(P, id); rerender(); }}>{why === "Maximal" ? "Max" : "Lernen"}</Btn>
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}
