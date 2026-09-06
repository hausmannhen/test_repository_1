/* Terrain: Tiles → ein Mesh pro Bildschirm, Vertex-Farben, Höhe per Noise, Wasser und Lava tiefer */
import * as THREE from "three";
import { VW, VH, T, idx, REGIONS } from "../game/constants.js";
import { hashStr } from "../game/rng.js";

export const WATER_Y = -0.3;
const BASIN_Y = -0.45;

const GROUND = {
  [T.GRASS]: ["#4f9a4a", "#559f4f"], [T.FLOWER]: ["#4f9a4a", "#559f4f"], [T.SAND]: ["#d9c27a", "#d1ba72"], [T.PATH]: ["#b59a6a", "#ae9363"],
  [T.SNOW]: ["#e8eef5", "#e0e7ef"], [T.ICE]: ["#bfe0f5", "#b3d8f0"], [T.SWAMP]: ["#4a6a3a", "#425f34"], [T.ASH]: ["#5a4a48", "#514240"],
  [T.DOOR]: ["#b59a6a", "#b59a6a"], [T.SIGN]: ["#4f9a4a", "#559f4f"], [T.ENTRANCE]: ["#6a5a4a", "#6a5a4a"],
  [T.WATER]: ["#2c4f7a", "#2a4a72"], [T.LAVA]: ["#3a1a10", "#3a1a10"],
};

export function groundColors(screen, t) {
  if (screen.dungeonRoom) {
    const d = screen.dungeonRoom.d;
    if (t === T.LAVA) return GROUND[T.LAVA];
    return [d.floor, d.floor2];
  }
  if (GROUND[t]) return GROUND[t];
  const reg = REGIONS[screen.region];
  return GROUND[reg.ground[0]] || GROUND[T.GRASS];
}

function tileAt(tiles, x, y) {
  if (x < 0 || y < 0 || x >= VW || y >= VH) return -1;
  return tiles[idx(x, y)];
}

/* Höhe eines Gitterpunkts (vx, vy in 0..VW / 0..VH) */
export function vertexHeight(screen, vx, vy) {
  const tiles = screen.tiles;
  let basin = false, rock = 0, n = 0;
  for (const [dx, dy] of [[-1, -1], [0, -1], [-1, 0], [0, 0]]) {
    const t = tileAt(tiles, vx + dx, vy + dy);
    if (t < 0) continue;
    n++;
    if (t === T.WATER || t === T.LAVA) basin = true;
    if (t === T.ROCK) rock++;
  }
  if (basin) return BASIN_Y;
  if (screen.dungeonRoom) return 0;
  const h = hashStr(screen.key + ":" + vx + "," + vy) / 4294967295;
  return (h - 0.5) * 0.3 + rock * 0.05;
}

export function buildTerrain(screen) {
  const tiles = screen.tiles;
  const heights = new Float32Array((VW + 1) * (VH + 1));
  for (let y = 0; y <= VH; y++) for (let x = 0; x <= VW; x++) heights[y * (VW + 1) + x] = vertexHeight(screen, x, y);
  const hAt = (x, y) => heights[y * (VW + 1) + x];

  const pos = [], col = [];
  const c = new THREE.Color();
  const push = (x, y, z, cc) => { pos.push(x, y, z); col.push(cc.r, cc.g, cc.b); };
  let waterCount = 0, lavaCount = 0;
  for (let y = 0; y < VH; y++) for (let x = 0; x < VW; x++) {
    const t = tiles[idx(x, y)];
    if (t === T.WATER) waterCount++;
    if (t === T.LAVA) lavaCount++;
    const g = groundColors(screen, t);
    const v = (x * 7 + y * 13) % 3;
    c.set(v === 0 ? g[1] : g[0]);
    const f = 1 + ((hashStr(screen.key + "c" + x + "," + y) % 1000) / 1000 - 0.5) * 0.08;
    c.multiplyScalar(f);
    const h00 = hAt(x, y), h10 = hAt(x + 1, y), h01 = hAt(x, y + 1), h11 = hAt(x + 1, y + 1);
    // zwei Dreiecke, Diagonale wechselt für ein ruhigeres Bild
    if ((x + y) % 2 === 0) {
      push(x, h00, y, c); push(x, h01, y + 1, c); push(x + 1, h11, y + 1, c);
      push(x, h00, y, c); push(x + 1, h11, y + 1, c); push(x + 1, h10, y, c);
    } else {
      push(x, h00, y, c); push(x, h01, y + 1, c); push(x + 1, h10, y, c);
      push(x + 1, h10, y, c); push(x, h01, y + 1, c); push(x + 1, h11, y + 1, c);
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute("color", new THREE.Float32BufferAttribute(col, 3));
  geo.computeVertexNormals();
  const mesh = new THREE.Mesh(geo, new THREE.MeshLambertMaterial({ vertexColors: true }));
  mesh.receiveShadow = true;
  mesh.userData.ownGeometry = true; mesh.userData.ownMaterial = true;

  const group = new THREE.Group();
  group.add(mesh);
  const liquids = [];
  if (waterCount) { const m = buildLiquid(tiles, T.WATER, screen); group.add(m); liquids.push(m); }
  if (lavaCount) { const m = buildLiquid(tiles, T.LAVA, screen); group.add(m); liquids.push(m); }
  return { group, heights, liquids };
}

/* Höhe an Weltposition (bilinear), damit Figuren dem Boden folgen */
export function terrainHeight(heights, wx, wz) {
  const x = Math.max(0, Math.min(VW - 0.001, wx)), z = Math.max(0, Math.min(VH - 0.001, wz));
  const x0 = Math.floor(x), z0 = Math.floor(z), fx = x - x0, fz = z - z0;
  const h = (xx, zz) => heights[zz * (VW + 1) + xx];
  const a = h(x0, z0) * (1 - fx) + h(x0 + 1, z0) * fx;
  const b = h(x0, z0 + 1) * (1 - fx) + h(x0 + 1, z0 + 1) * fx;
  return a * (1 - fz) + b * fz;
}

/* ---------- Wasser / Lava: animierter Vertex-Shader ---------- */
const LIQUID = {
  [T.WATER]: { a: "#3a6fb0", b: "#5b93d6", amp: 0.06, speed: 1.6, y: WATER_Y },
  [T.LAVA]:  { a: "#ff5a1a", b: "#ffb03a", amp: 0.03, speed: 0.7, y: WATER_Y },
};
export function makeLiquidMaterial(kind) {
  const p = LIQUID[kind];
  return new THREE.ShaderMaterial({
    uniforms: THREE.UniformsUtils.merge([THREE.UniformsLib.fog, {
      uTime: { value: 0 }, uAmp: { value: p.amp }, uSpeed: { value: p.speed },
      uColorA: { value: new THREE.Color(p.a) }, uColorB: { value: new THREE.Color(p.b) },
    }]),
    vertexShader: `
      #include <common>
      #include <fog_pars_vertex>
      uniform float uTime; uniform float uAmp; uniform float uSpeed;
      varying float vWave;
      void main() {
        vec3 p = position;
        float w = sin(p.x * 2.3 + uTime * uSpeed) * 0.5 + cos(p.z * 1.9 - uTime * uSpeed * 0.8 + p.x) * 0.5;
        p.y += w * uAmp;
        vWave = w;
        vec4 mvPosition = modelViewMatrix * vec4(p, 1.0);
        gl_Position = projectionMatrix * mvPosition;
        #include <fog_vertex>
      }`,
    fragmentShader: `
      #include <common>
      #include <fog_pars_fragment>
      uniform vec3 uColorA; uniform vec3 uColorB;
      varying float vWave;
      void main() {
        float k = smoothstep(-0.6, 0.9, vWave);
        gl_FragColor = vec4(mix(uColorA, uColorB, k), 1.0);
        #include <fog_fragment>
        #include <colorspace_fragment>
      }`,
    fog: true,
  });
}
function buildLiquid(tiles, kind, screen) {
  const p = LIQUID[kind];
  const pos = [];
  const quad = (x0, z0, x1, z1) => {
    // in 4 Segmente unterteilt, damit die Welle sichtbar ist
    const n = 2;
    for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
      const ax = x0 + (x1 - x0) * i / n, bx = x0 + (x1 - x0) * (i + 1) / n;
      const az = z0 + (z1 - z0) * j / n, bz = z0 + (z1 - z0) * (j + 1) / n;
      pos.push(ax, p.y, az, ax, p.y, bz, bx, p.y, bz, ax, p.y, az, bx, p.y, bz, bx, p.y, az);
    }
  };
  for (let y = 0; y < VH; y++) for (let x = 0; x < VW; x++) {
    if (tiles[idx(x, y)] !== kind) continue;
    // halbe Tilebreite über den Rand, damit die Fläche den Hang schneidet
    quad(x - 0.5, y - 0.5, x + 1.5, y + 1.5);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  const mesh = new THREE.Mesh(geo, makeLiquidMaterial(kind));
  mesh.userData.ownGeometry = true; mesh.userData.ownMaterial = true; mesh.userData.liquid = kind;
  mesh.renderOrder = 1;
  return mesh;
}
