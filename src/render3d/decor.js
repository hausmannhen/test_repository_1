/* Dekor: Tiles → InstancedMesh pro Bauteil. Häuser, Wände, Truhen, Schilder als eigene Meshes. */
import * as THREE from "three";
import { VW, VH, T, idx } from "../game/constants.js";
import { hashStr } from "../game/rng.js";
import { lambert, basic, G, vary } from "./materials.js";
import { terrainHeight } from "./terrain.js";

const REGION_TINT = {
  wiese:  { canopy: "#3f8f3a", canopy2: "#5aa64a", bush: "#3f8f3a", rock: "#8a8a80" },
  wald:   { canopy: "#2b6b2a", canopy2: "#3a7f36", bush: "#2f6f2c", rock: "#7a7a72" },
  berg:   { canopy: "#5a7a48", canopy2: "#6a8a52", bush: "#5a7a48", rock: "#8b8577" },
  wueste: { canopy: "#7a9a4a", canopy2: "#8aa858", bush: "#7a9a4a", rock: "#b59a6a" },
  sumpf:  { canopy: "#3a5a34", canopy2: "#4a6a3a", bush: "#4a6a3a", rock: "#6a6a62" },
  eis:    { canopy: "#3a5a4a", canopy2: "#4f7a5f", bush: "#4f7a5f", rock: "#9aa6b2" },
  vulkan: { canopy: "#4a3a30", canopy2: "#5a4a40", bush: "#4a3a30", rock: "#4f4643" },
};
const WHITE = new THREE.Color("#ffffff");
const FLOWER_COLORS = ["#ff6f91", "#ffd23f", "#ffffff", "#c77dff"];

const _m = new THREE.Matrix4(), _p = new THREE.Vector3(), _q = new THREE.Quaternion(), _s = new THREE.Vector3(), _e = new THREE.Euler();
function compose(x, y, z, ry = 0, sx = 1, sy = sx, sz = sx, rx = 0, rz = 0) {
  _p.set(x, y, z); _e.set(rx, ry, rz); _q.setFromEuler(_e); _s.set(sx, sy, sz);
  return _m.compose(_p, _q, _s);
}

class Batch {
  constructor() { this.items = new Map(); }
  add(geometry, material, matrix, color = null) {
    const key = geometry.uuid + "/" + material.uuid;
    if (!this.items.has(key)) this.items.set(key, { geometry, material, mats: [], colors: [] });
    const it = this.items.get(key);
    it.mats.push(matrix.clone());
    it.colors.push(color);
  }
  build(group, opts = {}) {
    for (const it of this.items.values()) {
      const mesh = new THREE.InstancedMesh(it.geometry, it.material, it.mats.length);
      const anyColor = it.colors.some(Boolean);
      for (let i = 0; i < it.mats.length; i++) {
        mesh.setMatrixAt(i, it.mats[i]);
        if (anyColor) mesh.setColorAt(i, it.colors[i] || WHITE);
      }
      mesh.instanceMatrix.needsUpdate = true;
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
      mesh.receiveShadow = !!opts.receiveShadow;
      mesh.castShadow = !!opts.castShadow;
      group.add(mesh);
    }
  }
}

export function buildDecor(screen, heights) {
  const group = new THREE.Group();
  const tiles = screen.tiles;
  const tint = REGION_TINT[screen.region] || REGION_TINT.wiese;
  const dr = screen.dungeonRoom ? screen.dungeonRoom.d : null;
  const batch = new Batch();
  const chests = [];
  const hAt = (x, y) => terrainHeight(heights, x + 0.5, y + 0.5);
  const rnd = (x, y, k) => (hashStr(screen.key + k + x + "," + y) % 1000) / 1000;

  const houseTiles = [];
  for (let y = 0; y < VH; y++) for (let x = 0; x < VW; x++) {
    const t = tiles[idx(x, y)];
    const cx = x + 0.5, cz = y + 0.5, h = hAt(x, y);
    const r = rnd(x, y, "r"), ry = r * Math.PI * 2;
    const ox = (rnd(x, y, "ox") - 0.5) * 0.3, oz = (rnd(x, y, "oz") - 0.5) * 0.3;
    switch (t) {
      case T.TREE: {
        const sc = 0.85 + r * 0.35;
        batch.add(G.cyl(0.09, 0.13, 0.55), lambert("#6b4a2e"), compose(cx + ox, h - 0.05, cz + oz, ry, sc));
        batch.add(G.cone(0.46, 1.0, 7), lambert("#ffffff"), compose(cx + ox, h + 0.4 * sc, cz + oz, ry, sc, sc * (0.9 + r * 0.4), sc), vary(r > 0.5 ? tint.canopy : tint.canopy2, x * 31 + y * 17));
        break;
      }
      case T.BUSH: {
        const sc = 0.7 + r * 0.4;
        batch.add(G.ico(0.32, 0), lambert("#ffffff"), compose(cx + ox, h + 0.2 * sc, cz + oz, ry, sc, sc * 0.75, sc), vary(tint.bush, x * 7 + y * 3));
        break;
      }
      case T.ROCK: {
        const sc = 0.8 + r * 0.5;
        batch.add(G.dodeca(0.36), lambert("#ffffff"), compose(cx + ox * 0.5, h + 0.16 * sc, cz + oz * 0.5, ry, sc, sc * 0.8, sc, r * 0.4), vary(tint.rock, x * 5 + y * 11, 0.08));
        break;
      }
      case T.DEADTREE: {
        const sc = 0.9 + r * 0.3;
        batch.add(G.cyl(0.05, 0.11, 0.95), lambert("#4a3a30"), compose(cx + ox, h - 0.05, cz + oz, ry, sc, sc, sc, 0, 0.08));
        batch.add(G.cyl(0.03, 0.05, 0.45), lambert("#4a3a30"), compose(cx + ox + 0.05, h + 0.55 * sc, cz + oz, ry, sc, sc, sc, 0, 0.8));
        batch.add(G.cyl(0.03, 0.05, 0.4), lambert("#4a3a30"), compose(cx + ox - 0.05, h + 0.45 * sc, cz + oz, ry, sc, sc, sc, 0, -0.9));
        break;
      }
      case T.CACTUS: {
        const sc = 0.8 + r * 0.4;
        batch.add(G.cyl(0.12, 0.14, 0.85, 7), lambert("#4f8a3a"), compose(cx + ox, h - 0.02, cz + oz, ry, sc));
        batch.add(G.cyl(0.07, 0.08, 0.35, 6), lambert("#4f8a3a"), compose(cx + ox + 0.18 * Math.cos(ry), h + 0.35 * sc, cz + oz + 0.18 * Math.sin(ry), ry, sc));
        batch.add(G.cyl(0.07, 0.08, 0.28, 6), lambert("#4f8a3a"), compose(cx + ox - 0.18 * Math.cos(ry), h + 0.45 * sc, cz + oz - 0.18 * Math.sin(ry), ry, sc));
        break;
      }
      case T.FLOWER: {
        for (let i = 0; i < 3; i++) {
          const fx = cx + (rnd(x, y, "fx" + i) - 0.5) * 0.7, fz = cz + (rnd(x, y, "fz" + i) - 0.5) * 0.7;
          const fh = terrainHeight(heights, fx, fz);
          batch.add(G.cyl(0.012, 0.012, 0.16, 4), lambert("#3c7a38"), compose(fx, fh, fz));
          batch.add(G.sphere(0.055, 6), lambert("#ffffff"), compose(fx, fh + 0.18, fz), new THREE.Color(FLOWER_COLORS[(x + y + i) % 4]));
        }
        break;
      }
      case T.GRASS: {
        if ((x * 7 + y * 13) % 3 === 1) {
          for (let i = 0; i < 2; i++) {
            const gx = cx + (rnd(x, y, "gx" + i) - 0.5) * 0.7, gz = cz + (rnd(x, y, "gz" + i) - 0.5) * 0.7;
            batch.add(G.cone(0.05, 0.22, 4), lambert("#3f8a3a"), compose(gx, terrainHeight(heights, gx, gz) - 0.02, gz, ry));
          }
        }
        break;
      }
      case T.SWAMP: {
        if ((x * 7 + y * 13) % 3 === 0) batch.add(G.cyl(0.25, 0.3, 0.06, 6), lambert("#33482a"), compose(cx + ox, h - 0.02, cz + oz, ry, 1, 1, 0.6));
        break;
      }
      case T.ASH: {
        if ((x * 7 + y * 13) % 3 === 2) batch.add(G.dodeca(0.36), lambert("#3f3230"), compose(cx + ox, h - 0.05, cz + oz, ry, 0.35, 0.25, 0.35));
        break;
      }
      case T.HOUSE: houseTiles.push([x, y]); break;
      case T.DOOR: {
        // Türsturz über der Tür, die Tür selbst bleibt begehbar
        batch.add(G.box(1, 0.5, 1), lambert("#8a6a4a"), compose(cx, 0.85, cz));
        batch.add(G.box(0.55, 0.85, 0.08), lambert("#3a2a1a"), compose(cx, 0, cz + (y <= 3 ? 0.46 : -0.46)));
        houseTiles.push([x, y]);
        break;
      }
      case T.WALL: {
        batch.add(G.box(1, 1.3, 1), lambert("#ffffff"), compose(cx, -0.05, cz), vary(dr ? dr.wall : "#2a2a30", x * 3 + y * 5, 0.06));
        batch.add(G.box(1.02, 0.1, 1.02), lambert("#ffffff"), compose(cx, 1.22, cz), new THREE.Color(dr ? dr.wall2 : "#7a7a88"));
        break;
      }
      case T.PILLAR: {
        batch.add(G.cyl(0.28, 0.34, 1.3, 8), lambert("#ffffff"), compose(cx, -0.02, cz), vary(dr ? dr.wall2 : "#7a7a88", x + y * 7, 0.06));
        batch.add(G.box(0.8, 0.12, 0.8), lambert("#ffffff"), compose(cx, 1.26, cz), new THREE.Color(dr ? dr.wall : "#2a2a30"));
        break;
      }
      case T.SIGN: {
        batch.add(G.box(0.08, 0.7, 0.08), lambert("#6b4a2e"), compose(cx, h, cz));
        batch.add(G.box(0.6, 0.3, 0.06), lambert("#a07a4a"), compose(cx, h + 0.45, cz + 0.05));
        break;
      }
      case T.ENTRANCE: {
        // dunkler Durchgang im Fels, Rahmen aus zwei Pfeilern
        batch.add(G.box(0.9, 1.4, 0.7), basic("#08060a"), compose(cx, h - 0.3, cz - 0.1));
        batch.add(G.box(0.2, 1.5, 0.3), lambert("#6a6258"), compose(cx - 0.5, h - 0.3, cz + 0.3));
        batch.add(G.box(0.2, 1.5, 0.3), lambert("#6a6258"), compose(cx + 0.5, h - 0.3, cz + 0.3));
        batch.add(G.box(1.25, 0.2, 0.3), lambert("#6a6258"), compose(cx, h + 1.15, cz + 0.3));
        break;
      }
      case T.EXIT: {
        // Treppe nach oben: drei Stufen
        for (let i = 0; i < 3; i++) batch.add(G.box(0.8, 0.12, 0.28), lambert("#8a8478"), compose(cx, i * 0.1, cz + 0.3 - i * 0.28));
        batch.add(G.plane(0.8, 0.9), basic("#e9dcb8", { transparent: true, opacity: 0.35 }), compose(cx, 0.02, cz, 0, 1, 1, 1, -Math.PI / 2));
        break;
      }
      case T.CHEST: {
        const opened = false;
        const chest = buildChest(cx, h, cz, opened);
        chest.userData.chestId = screen.chest ? screen.chest.id : null;
        group.add(chest); chests.push(chest);
        break;
      }
      default: break;
    }
  }
  // Häuser: Wände pro Tile, Dach über der zusammenhängenden Fläche
  buildHouses(houseTiles, tiles, batch, screen);
  batch.build(group, { receiveShadow: true });
  return { group, chests };
}

function buildChest(cx, h, cz, opened) {
  const g = new THREE.Group();
  const body = new THREE.Mesh(G.box(0.62, 0.36, 0.42), lambert("#7a4a2a"));
  body.position.set(0, 0, 0);
  const band = new THREE.Mesh(G.box(0.64, 0.08, 0.44), lambert("#c9a24a"));
  band.position.set(0, 0.14, 0);
  const lid = new THREE.Group();
  const lidMesh = new THREE.Mesh(G.box(0.62, 0.16, 0.42), lambert("#8a5a34"));
  lidMesh.position.set(0, 0, 0.21);
  lid.add(lidMesh);
  lid.position.set(0, 0.36, -0.21);
  g.add(body, band, lid);
  g.position.set(cx, h, cz);
  g.userData.lid = lid;
  g.userData.setOpened = (o) => { lid.rotation.x = o ? -1.9 : 0; };
  g.userData.setOpened(opened);
  return g;
}

function buildHouses(houseTiles, tiles, batch, screen) {
  if (!houseTiles.length) return;
  const seen = new Set();
  const key = (x, y) => x + "," + y;
  const isHouse = (x, y) => x >= 0 && y >= 0 && x < VW && y < VH && (tiles[idx(x, y)] === T.HOUSE || tiles[idx(x, y)] === T.DOOR);
  const wallColor = screen.region === "wueste" ? "#d9c8a0" : screen.region === "eis" ? "#8a7a6a" : "#c9b48a";
  const roofColor = screen.region === "wueste" ? "#a05a3a" : screen.region === "eis" ? "#e8eef5" : "#8a3a2a";
  let n = 0;
  for (const [sx, sy] of houseTiles) {
    if (seen.has(key(sx, sy))) continue;
    // zusammenhängende Fläche einsammeln
    const q = [[sx, sy]]; seen.add(key(sx, sy));
    let minX = sx, maxX = sx, minY = sy, maxY = sy;
    while (q.length) {
      const [x, y] = q.pop();
      minX = Math.min(minX, x); maxX = Math.max(maxX, x); minY = Math.min(minY, y); maxY = Math.max(maxY, y);
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nx = x + dx, ny = y + dy;
        if (isHouse(nx, ny) && !seen.has(key(nx, ny))) { seen.add(key(nx, ny)); q.push([nx, ny]); }
      }
    }
    const w = maxX - minX + 1, d = maxY - minY + 1;
    const cx = minX + w / 2, cz = minY + d / 2;
    const wc = vary(wallColor, n * 13, 0.06);
    for (let y = minY; y <= maxY; y++) for (let x = minX; x <= maxX; x++) {
      if (tiles[idx(x, y)] !== T.HOUSE) continue;
      batch.add(G.box(1, 1.35, 1), lambert("#ffffff"), compose(x + 0.5, -0.25, y + 0.5), wc);
    }
    // Fenster an der Vorderseite (Türseite)
    const front = minY <= 2 ? maxY + 1 + 0.02 : minY - 0.02;
    for (const wx of [minX + 0.5, maxX + 0.5]) batch.add(G.box(0.3, 0.3, 0.04), basic("#4a3a2a"), compose(wx, 0.5, front));
    // Pyramidendach
    batch.add(G.pyramid(0.72, 0.75), lambert("#ffffff"), compose(cx, 1.05, cz, 0, w * 1.03, 1, d * 1.03), vary(roofColor, n * 7, 0.05));
    batch.add(G.box(0.16, 0.35, 0.16), lambert("#5a4a40"), compose(cx + w * 0.25, 1.3, cz - d * 0.15));
    n++;
  }
}
