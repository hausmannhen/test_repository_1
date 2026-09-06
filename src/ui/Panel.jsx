/* Rahmen für alle Panels: Titel, Goldanzeige, scrollbarer Inhalt, Fußzeile */
import React from "react";

export default function Panel({ title, gold, children, footer }) {
  return (
    <div className="panel">
      <div className="panel-head">
        <div className="panel-title">{title}</div>
        {gold !== undefined && <div className="panel-gold">{gold} Gold</div>}
      </div>
      <div className="panel-body">{children}</div>
      <div className="panel-foot">{footer}</div>
    </div>
  );
}
