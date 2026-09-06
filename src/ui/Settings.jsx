/* Ton: Musik, Effekte, stumm */
import React, { useState } from "react";
import { Btn } from "./bits.jsx";

export default function Settings({ audio }) {
  const [s, setS] = useState(audio ? { ...audio.settings } : { music: 0.6, sfx: 0.3, muted: false });
  const apply = (patch) => { const next = { ...s, ...patch }; setS(next); if (audio) { audio.unlock(); audio.applySettings(next); } };
  return (
    <div>
      <div className="box">
        <label className="slider-row"><span>Musik</span><input type="range" min="0" max="1" step="0.05" value={s.music} onChange={e => apply({ music: +e.target.value })} /><span className="dim">{Math.round(s.music * 100)} %</span></label>
        <label className="slider-row"><span>Effekte</span><input type="range" min="0" max="1" step="0.05" value={s.sfx} onChange={e => apply({ sfx: +e.target.value })} /><span className="dim">{Math.round(s.sfx * 100)} %</span></label>
        <div className="row" style={{ marginTop: 10 }}>
          <Btn small tone={s.muted ? "red" : "default"} onClick={() => apply({ muted: !s.muted })}>{s.muted ? "Ton ist aus" : "Ton ausschalten"}</Btn>
          {audio && <Btn small onClick={() => { audio.unlock(); audio.sfx("levelup"); }}>Probehören</Btn>}
        </div>
      </div>
      <div className="dim" style={{ fontSize: 12, lineHeight: 1.6 }}>Musik und Geräusche werden im Spiel erzeugt, es gibt keine Dateien. Die Musik wechselt mit der Region. Auf dem iPhone gilt der Stummschalter am Gerät zusätzlich.</div>
    </div>
  );
}
