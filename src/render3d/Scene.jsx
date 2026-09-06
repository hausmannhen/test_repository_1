/* Canvas-Komponente: erzeugt den Renderer, passt die Größe an, gibt ihn nach außen */
import React, { useEffect, useRef } from "react";
import { Renderer3D } from "./renderer.js";

export default function Scene({ onReady }) {
  const canvasRef = useRef(null);
  const wrapRef = useRef(null);
  useEffect(() => {
    const canvas = canvasRef.current, wrap = wrapRef.current;
    if (!canvas || !wrap) return undefined;
    let renderer = null;
    try { renderer = new Renderer3D(canvas); }
    catch (e) { console.error("WebGL nicht verfügbar", e); return undefined; }
    const fit = () => { const r = wrap.getBoundingClientRect(); renderer.resize(Math.round(r.width), Math.round(r.height)); };
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(wrap);
    onReady && onReady(renderer);
    return () => { ro.disconnect(); onReady && onReady(null); renderer.dispose(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return (
    <div ref={wrapRef} className="scene">
      <canvas ref={canvasRef} className="scene-canvas" />
    </div>
  );
}
