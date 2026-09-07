/* Geschichte: Fenster beim ersten Start und Reiter im Menü */
import React from "react";
import { STORY } from "../data/story.js";
import { storyProgress } from "../game/quests.js";
import Panel from "./Panel.jsx";
import { Btn } from "./bits.jsx";

export function StoryText({ P }) {
  const sp = P ? storyProgress(P) : null;
  return (
    <div>
      <div className="box">
        <div className="story-tagline">{STORY.tagline}</div>
        {sp && <div className="dim" style={{ fontSize: 12, marginTop: 4 }}>Kapitel {sp.done} von {sp.total} erledigt.</div>}
      </div>
      {STORY.paragraphs.map((t, i) => <p key={i} className="story-p">{t}</p>)}
      <div className="section" style={{ marginTop: 12 }}>Gut zu wissen</div>
      {STORY.tips.map((t, i) => <div key={i} className="quest-row" style={{ fontSize: 13 }}>{t}</div>)}
    </div>
  );
}

/* Beim ersten Start: nichts bewegt sich, bis der Spieler aufbricht */
export default function StoryIntro({ G, onClose }) {
  const go = () => { markStoryRead(G); onClose(); };
  return (
    <Panel title={STORY.title} footer={<Btn tone="gold" onClick={go}>Aufbrechen</Btn>}>
      <StoryText P={null} />
    </Panel>
  );
}
export function markStoryRead(G) {
  if (!G) return;
  if (!G.P.hints) G.P.hints = {};
  G.P.hints.geschichte = true; G.intro = false; G.dirty = true;
}
