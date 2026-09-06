/* Eingabe: Tastatur und Touch-Pad schreiben in ein gemeinsames Objekt, die Engine liest es pro Frame. */
export function createInput() {
  return { x: 0, y: 0, attack: false, keys: {} };
}
export function readInput(inp) {
  const k = inp.keys;
  const kx = (k["arrowright"] || k["d"] ? 1 : 0) - (k["arrowleft"] || k["a"] ? 1 : 0);
  const ky = (k["arrowdown"] || k["s"] ? 1 : 0) - (k["arrowup"] || k["w"] ? 1 : 0);
  return { x: inp.x || kx, y: inp.y || ky, attack: inp.attack };
}
/* handlers: { potion, inventory, escape } */
export function bindKeyboard(inp, handlers) {
  const down = (e) => {
    const key = e.key.toLowerCase();
    inp.keys[key] = true;
    if (["arrowup", "arrowdown", "arrowleft", "arrowright", " "].includes(key)) e.preventDefault();
    if (key === " " || key === "j") inp.attack = true;
    if ((key === "e" || key === "k") && handlers.potion) handlers.potion();
    if ((key === "i" || key === "tab") && handlers.inventory) { e.preventDefault(); handlers.inventory(); }
    if (key === "escape" && handlers.escape) handlers.escape();
  };
  const up = (e) => {
    const key = e.key.toLowerCase();
    inp.keys[key] = false;
    if (key === " " || key === "j") inp.attack = false;
  };
  const blur = () => { inp.keys = {}; inp.attack = false; inp.x = 0; inp.y = 0; };
  window.addEventListener("keydown", down); window.addEventListener("keyup", up); window.addEventListener("blur", blur);
  return () => { window.removeEventListener("keydown", down); window.removeEventListener("keyup", up); window.removeEventListener("blur", blur); };
}
