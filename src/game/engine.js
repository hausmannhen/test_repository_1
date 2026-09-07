/* Engine: Bildschirmwechsel, Kollision, Kampf, Update. Keine Canvas- oder DOM-Referenz. */
import { TS, VW, VH, W, H, WORLD_W, WORLD_H, DG, T, SOLID, idx, REGIONS, DUNGEONS, VILLAGES, START_VILLAGE } from "./constants.js";
import { mulberry32, rint, clamp } from "./rng.js";
import { generateItem, makePotion, POTIONS, RARITY_BY_ID } from "./items.js";
import { rollDrops } from "./monsters.js";
import { genOverworldScreen, genDungeon, spawnMobsFor } from "./world.js";
import { newPlayer, derive, xpNeed, addToInventory, flash, emit } from "./player.js";
import { castSpell, aimAt, ELEMENTS } from "./magic.js";
import { onKill as questKill } from "./quests.js";
import { raidActive, updateRaid, raidTarget, endRaid } from "./raid.js";
export { startRaid, raidActive } from "./raid.js";
import { MINIBOSS_BY_ID } from "../data/minibosses.js";
export { castSpell };

export const TRANSITION_DUR = 0.4;   // Sekunden Kamera-Slide beim Bildschirmwechsel

/* ---------- Spielzustand ---------- */
export function createGame(seed, P = null, slot = null) {
  return {
    seed, P: P || newPlayer(seed), slot,
    world: { screens: {}, dungeons: {} }, screen: null, mobs: [], projs: [], drops: [], fx: [],
    attack: { t: 0, dir: "down", hit: new Set(), maxT: 0.2, ranged: false },
    pprojs: [], pending: [], spellCd: {}, castT: 0, shootCd: 0, events: [], raid: null,
    invT: 0, shake: 0, msg: null, banner: null, time: 0, walkT: 0, trigCd: 1, dead: false, dirty: true,
    panelReturn: null, transition: null,
    openPanel: null,   // (type) => void, von der UI gesetzt
    save: null,        // () => void, von der UI gesetzt
  };
}
export function startGame(G) {
  const P = G.P;
  enterScreen(G, P.area, P.sx, P.sy, P.x, P.y, true);
  return G;
}

/* ---------- Bildschirmwechsel ---------- */
export function getScreen(G, area, sx, sy) {
  if (area === "over") {
    const key = `${sx},${sy}`;
    if (!G.world.screens[key]) G.world.screens[key] = genOverworldScreen(G.seed, sx, sy);
    return G.world.screens[key];
  }
  const id = +area.slice(1);
  if (!G.world.dungeons[id]) G.world.dungeons[id] = genDungeon(G.seed, DUNGEONS[id]);
  return G.world.dungeons[id].rooms[`${sx},${sy}`];
}
export function enterScreen(G, area, sx, sy, px, py, banner = true, slide = null) {
  const P = G.P;
  const prev = G.screen;
  const prevRegion = prev ? prev.region : null;
  const fromX = P.x, fromY = P.y;
  if (G.raid && G.raid.state !== "done") endRaid(G, false);
  G.raid = null;
  P.area = area; P.sx = sx; P.sy = sy; P.x = px; P.y = py;
  const screen = getScreen(G, area, sx, sy);
  G.screen = screen;
  const vkey = screen.key;
  P.visits[vkey] = (P.visits[vkey] || 0) + 1;
  G.mobs = spawnMobsFor(screen, G.seed, P.visits[vkey], P.cleared);
  if (screen.dungeonRoom && screen.dungeonRoom.type === "boss" && P.cleared[screen.dungeonRoom.d.id]) G.mobs = G.mobs.filter(m => !m.boss);
  G.projs = []; G.pprojs = []; G.pending = []; G.drops = []; G.fx = [];
  unstick(P, screen.tiles);
  G.transition = slide && prev ? { t: 0, dur: TRANSITION_DUR, dx: slide.dx, dy: slide.dy, prevScreen: prev, fromX, fromY } : null;
  if (screen.village) { P.lastVillage = `${sx},${sy}`; if (banner) G.banner = { text: screen.village.name, sub: "Dorf", t: 2.6 }; }
  else if (screen.dungeonRoom) { if (banner && screen.dungeonRoom.type === "entry") G.banner = { text: screen.dungeonRoom.d.name, sub: "Dungeon, Stufe " + screen.dungeonRoom.d.level, t: 2.6 }; }
  else if (banner && screen.region !== prevRegion) G.banner = { text: REGIONS[screen.region].name, sub: "Stufe " + REGIONS[screen.region].level + "+", t: 2.6 };
  G.dirty = true;
  G.save && G.save();
}

function blockedBox(tiles, x, y) {
  return solidAt(tiles, x - 5, y - 5) || solidAt(tiles, x + 4.9, y - 5) || solidAt(tiles, x - 5, y + 4.9) || solidAt(tiles, x + 4.9, y + 4.9);
}
export function unstick(P, tiles) {
  if (!blockedBox(tiles, P.x, P.y)) return;
  const tx = clamp(Math.floor(P.x / TS), 0, VW - 1), ty = clamp(Math.floor(P.y / TS), 0, VH - 1);
  for (let rad = 1; rad < 8; rad++) {
    for (let dy = -rad; dy <= rad; dy++) for (let dx = -rad; dx <= rad; dx++) {
      const x = tx + dx, y = ty + dy;
      if (x < 1 || y < 1 || x >= VW - 1 || y >= VH - 1) continue;
      if (!SOLID.has(tiles[idx(x, y)]) && tiles[idx(x, y)] !== T.LAVA) { P.x = x * TS + 8; P.y = y * TS + 8; return; }
    }
  }
}

/* Landeposition auf dem Zielbildschirm prüfen, bevor der Wechsel ausgelöst wird.
   Blockiert: entlang der Kante nach einem freien Tile suchen, sonst kein Wechsel. */
export function landingSpot(tiles, x, y, dx, dy) {
  if (!blockedBox(tiles, x, y)) return { x, y };
  const tx = clamp(Math.floor(x / TS), 0, VW - 1), ty = clamp(Math.floor(y / TS), 0, VH - 1);
  for (const off of [1, -1, 2, -2, 3, -3]) {
    const cx = dx !== 0 ? tx : tx + off, cy = dx !== 0 ? ty + off : ty;
    if (cx < 0 || cy < 0 || cx >= VW || cy >= VH) continue;
    const t = tiles[idx(cx, cy)];
    if (SOLID.has(t) || t === T.LAVA) continue;
    const nx = dx !== 0 ? x : cx * TS + 8, ny = dx !== 0 ? cy * TS + 8 : y;
    if (!blockedBox(tiles, nx, ny)) return { x: nx, y: ny };
  }
  return null;
}
function tryCross(G, dx, dy) {
  const P = G.P, isOver = P.area === "over";
  if (raidActive(G)) { if (G.trigCd <= 0) { flash(G, "Die Palisaden halten dich hier", "#ffb347"); G.trigCd = 1.5; } return false; }
  const maxX = isOver ? WORLD_W - 1 : DG - 1, maxY = isOver ? WORLD_H - 1 : DG - 1;
  const nsx = P.sx + dx, nsy = P.sy + dy;
  if (nsx < 0 || nsy < 0 || nsx > maxX || nsy > maxY) return false;
  const inset = isOver ? 6 : 10;
  const nx = dx < 0 ? W - inset : dx > 0 ? inset : P.x;
  const ny = dy < 0 ? H - inset : dy > 0 ? inset : P.y;
  const target = getScreen(G, P.area, nsx, nsy);
  const spot = landingSpot(target.tiles, nx, ny, dx, dy);
  if (!spot) return false;
  enterScreen(G, P.area, nsx, nsy, spot.x, spot.y, true, { dx, dy });
  return true;
}

/* ---------- Kollision ---------- */
export function solidAt(tiles, px, py) {
  const tx = Math.floor(px / TS), ty = Math.floor(py / TS);
  if (tx < 0 || ty < 0 || tx >= VW || ty >= VH) return false;
  return SOLID.has(tiles[idx(tx, ty)]);
}
export function moveWithCollision(tiles, e, dx, dy, hw, hh) {
  // hw/hh = halbe Hitbox-Breite/Höhe
  if (dx !== 0) {
    const nx = e.x + dx;
    const l = nx - hw, rr = nx + hw - 0.01, t = e.y - hh, b = e.y + hh - 0.01;
    if (!solidAt(tiles, l, t) && !solidAt(tiles, rr, t) && !solidAt(tiles, l, b) && !solidAt(tiles, rr, b)) e.x = nx;
  }
  if (dy !== 0) {
    const ny = e.y + dy;
    const l = e.x - hw, rr = e.x + hw - 0.01, t = ny - hh, b = ny + hh - 0.01;
    if (!solidAt(tiles, l, t) && !solidAt(tiles, rr, t) && !solidAt(tiles, l, b) && !solidAt(tiles, rr, b)) e.y = ny;
  }
}

/* ---------- Kampf ---------- */
export function damageMob(G, m, dmg, crit, kx, ky, color = null) {
  if (m.dead) return;
  m.hp -= dmg; m.hitT = 0.18;
  m.vx += kx * 160; m.vy += ky * 160;
  emit(G, "hit", { crit });
  G.fx.push({ kind: "num", x: m.x, y: m.y - m.size, rise: 0, text: String(dmg), color: crit ? "#ffd23f" : (color || "#fff"), t: 0.8, big: crit });
  if (m.hp <= 0) killMob(G, m);
}
/* Treffer aus Geschoss oder Zauber anwenden: Schaden, Brand, Verlangsamung, Rückstoß, Lebensraub */
export function applyHit(G, m, hit, dx, dy) {
  if (m.dead) return 0;
  const P = G.P;
  const crit = hit.crit === true || (typeof hit.critChance === "number" && Math.random() * 100 < hit.critChance);
  const dmg = Math.max(1, Math.round(hit.dmg * (0.85 + Math.random() * 0.3) * (crit ? 2 : 1) * (P.buffT > 0 ? 1.5 : 1)));
  const el = hit.element ? ELEMENTS[hit.element] : null;
  const k = hit.knock || 0.5;
  damageMob(G, m, dmg, crit, dx * k, dy * k, el ? el.color : null);
  if (hit.burn) { m.burnT = Math.max(m.burnT || 0, hit.burn); m.burnDps = Math.max(m.burnDps || 0, dmg * 0.2); }
  if (hit.slow) m.slowT = Math.max(m.slowT || 0, hit.slow);
  const heal = Math.round(dmg * ((hit.leech || 0) + (hit.heal || 0)));
  if (heal > 0) { const d = derive(P); P.hp = Math.min(d.maxHp, P.hp + heal); G.fx.push({ kind: "num", x: P.x, y: P.y - 14, rise: 0, text: "+" + heal, color: "#6fe28a", t: 0.8, small: true }); }
  return dmg;
}
const DIRV = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };
export function killMob(G, m) {
  const P = G.P;
  m.dead = true;
  P.kills++;
  emit(G, "kill", { boss: !!(m.boss || m.mini) });
  for (let i = 0; i < 8; i++) G.fx.push({ kind: "part", x: m.x, y: m.y, vx: (Math.random() - 0.5) * 90, vy: (Math.random() - 0.5) * 90, color: m.color, t: 0.5 });
  const d = derive(P);
  const r = mulberry32((Math.random() * 1e9) | 0);
  const drops = rollDrops(r, m, d.luck, m.boss);
  for (const dr of drops) {
    const ang = Math.random() * Math.PI * 2;
    G.drops.push({ ...dr, x: m.x + Math.cos(ang) * 6, y: m.y + Math.sin(ang) * 6, vx: Math.cos(ang) * 40, vy: Math.sin(ang) * 40, t: 0 });
  }
  if (m.mini) {
    // Zwischenboss: sichere Beute, kehrt nicht zurück
    P.cleared["mb:" + m.mini] = true;
    const mb = MINIBOSS_BY_ID[m.mini];
    const extra = generateItem(r, (mb ? mb.level : m.level) + 2, d.luck, 2);
    G.drops.push({ type: "item", item: extra, x: m.x + 8, y: m.y, vx: 30, vy: 0, t: 0 });
    G.drops.push({ type: "gold", amount: rint(r, m.level * 6, m.level * 12), x: m.x - 8, y: m.y, vx: -30, vy: 0, t: 0 });
    G.banner = { text: m.name + " besiegt", sub: "Das Revier ist frei", t: 3.5 };
    emit(G, "fanfare");
  }
  gainXp(G, m.xp);
  if (m.boss) {
    const dId = G.screen.dungeonRoom.d.id;
    P.cleared[dId] = true; P.hearts += 1; P.hp = derive(P).maxHp;
    G.banner = { text: m.name + " besiegt", sub: "Herzcontainer erhalten", t: 4 };
    emit(G, "fanfare");
  }
  questKill(G, m);
}
export function gainXp(G, amount) {
  const P = G.P;
  P.xp += amount;
  G.fx.push({ kind: "num", x: P.x, y: P.y - 14, rise: 0, text: "+" + amount + " XP", color: "#8fd3ff", t: 1, small: true });
  while (P.xp >= xpNeed(P.level)) {
    P.xp -= xpNeed(P.level); P.level++;
    const d = derive(P);
    P.hp = d.maxHp; P.mana = d.maxMana;
    G.banner = { text: "Stufe " + P.level, sub: P.level % 3 === 0 ? "Neuer Fertigkeitspunkt" : "Angriff und Leben gestiegen", t: 3 };
    emit(G, "levelup");
  }
  G.dirty = true;
}
export function hurtPlayer(G, amount) {
  const P = G.P;
  if (G.invT > 0 || G.dead) return;
  const d = derive(P);
  const dmg = Math.max(1, Math.round(amount * (0.9 + Math.random() * 0.2) - d.def * 0.45));
  P.hp -= dmg; G.invT = 0.8;
  G.fx.push({ kind: "num", x: P.x, y: P.y - 14, rise: 0, text: "-" + dmg, color: "#ff5f6d", t: 0.9 });
  G.shake = 0.15;
  emit(G, "hurt");
  if (P.hp <= 0) { P.hp = 0; G.dead = true; if (raidActive(G)) endRaid(G, false); }
  G.dirty = true;
}
export function respawn(G) {
  const P = G.P;
  const [sx, sy] = (VILLAGES[P.lastVillage] ? P.lastVillage : START_VILLAGE).split(",").map(Number);
  const d = derive(P);
  P.gold = Math.floor(P.gold * 0.9); P.hp = Math.ceil(d.maxHp / 2); P.mana = d.maxMana;
  G.dead = false; G.invT = 1.5;
  enterScreen(G, "over", sx, sy, 7 * TS + 8, 8 * TS + 8, true);
}

/* ---------- Update ---------- */
export function update(G, dt, input) {
  const P = G.P, tiles = G.screen.tiles, d = derive(P);
  G.time += dt;
  if (G.transition) {
    // Kamera gleitet, Engine pausiert
    G.transition.t += dt;
    if (G.transition.t >= G.transition.dur) G.transition = null;
    else return;
  }
  if (G.invT > 0) G.invT -= dt;
  if (G.shake > 0) G.shake -= dt;
  if (G.msg && (G.msg.t -= dt) <= 0) G.msg = null;
  if (G.banner && (G.banner.t -= dt) <= 0) G.banner = null;
  if (G.trigCd > 0) G.trigCd -= dt;
  if (G.castT > 0) G.castT -= dt;
  if (G.shootCd > 0) G.shootCd -= dt;
  for (const k in G.spellCd) if (G.spellCd[k] > 0) G.spellCd[k] -= dt;
  if (G.dead) return;
  // Mana regeneriert
  P.mana = Math.min(d.maxMana, (P.mana || 0) + d.manaRegen * dt);
  if (G.pendingXp) { const xp = G.pendingXp; G.pendingXp = 0; gainXp(G, xp); }
  if (G.raid) updateRaid(G, dt);

  // --- Spielerbewegung ---
  let ix = input.x, iy = input.y;
  const len = Math.hypot(ix, iy);
  if (len > 1) { ix /= len; iy /= len; }
  if (len > 0.2) {
    if (Math.abs(ix) > Math.abs(iy)) P.dir = ix > 0 ? "right" : "left"; else P.dir = iy > 0 ? "down" : "up";
  }
  const onSwamp = tiles[idx(clamp(Math.floor(P.x / TS), 0, VW - 1), clamp(Math.floor(P.y / TS), 0, VH - 1))] === T.SWAMP;
  let speed = 68 * (1 + d.spd / 100) * (onSwamp ? 0.6 : 1) * (G.attack.t > 0 ? 0.35 : 1);
  moveWithCollision(tiles, P, ix * speed * dt, iy * speed * dt, 5, 5);
  G.walkT = len > 0.2 ? G.walkT + dt : 0;
  // Anrempeln: Wegweiser lesen, mit Bewohnern sprechen
  if (len > 0.2 && G.trigCd <= 0) {
    const [fx, fy] = DIRV[P.dir];
    const ftx = Math.floor((P.x + fx * 9) / TS), fty = Math.floor((P.y + fy * 9) / TS);
    if (ftx >= 0 && fty >= 0 && ftx < VW && fty < VH) {
      const ft = tiles[idx(ftx, fty)];
      if (ft === T.SIGN) { G.trigCd = 3; flash(G, G.screen.village ? G.screen.village.greeting : "Ein Wegweiser", "#e9dcb8"); }
      else if (ft === T.NPC) {
        const who = G.screen.doors[`${ftx},${fty}`];
        if (who) { G.trigCd = 0.8; G.panelReturn = null; G.openPanel && G.openPanel(who); }
      }
    }
  }

  // --- Zauber ---
  if (input.cast) castSpell(G);

  // --- Angriff: Nahkampf oder Fernkampf ---
  G.attack.t = Math.max(-1, G.attack.t - dt);
  const atkSpeed = 1 + d.spd / 150;
  if (d.weaponType === "fern") {
    if (input.attack && G.shootCd <= 0) {
      G.shootCd = d.rate;
      G.attack = { t: 0.15, dir: P.dir, hit: new Set(), maxT: 0.15, ranged: true };
      emit(G, "shoot");
      let [dx, dy] = DIRV[P.dir];
      const aim = aimAt(G, dx, dy, d.range);
      if (aim) { dx = aim.x; dy = aim.y; }
      const angles = d.doubleShot ? [-0.12, 0.12] : [0];
      for (const a of angles) {
        const ca = Math.cos(a), sa = Math.sin(a);
        const vx = dx * ca - dy * sa, vy = dx * sa + dy * ca;
        G.pprojs.push({ x: P.x + vx * 6, y: P.y + vy * 6, vx: vx * d.projSpeed, vy: vy * d.projSpeed, t: d.range / d.projSpeed, kind: d.proj, color: "#e8e2d0", color2: "#8a6a3a",
          dmg: d.atk * d.rangedMult, critChance: d.crit + d.critRanged, pierce: d.pierce, hit: new Set(), knock: 0.6 });
      }
    }
  } else if (input.attack && G.attack.t <= -0.08 / atkSpeed) {
    G.attack = { t: 0.2 / atkSpeed, dir: P.dir, hit: new Set(), maxT: 0.2 / atkSpeed, ranged: false };
    emit(G, "swing");
  }
  if (G.attack.t > 0 && !G.attack.ranged) {
    const reach = d.reach;
    const box = attackBox(P, G.attack.dir, reach);
    for (const m of G.mobs) {
      if (m.dead || G.attack.hit.has(m.id)) continue;
      const inBox = rectHit(box, { x: m.x - m.size / 2, y: m.y - m.size / 2, w: m.size, h: m.size });
      const inSweep = d.sweep && Math.hypot(m.x - P.x, m.y - P.y) < reach + m.size / 2 + 4;
      if (inBox || inSweep) {
        G.attack.hit.add(m.id);
        const crit = Math.random() * 100 < d.crit + d.critMelee;
        const dmg = Math.max(1, Math.round(d.atk * d.meleeMult * (0.85 + Math.random() * 0.3) * (crit ? 2 : 1) * (P.buffT > 0 ? 1.5 : 1)));
        const kx = Math.sign(m.x - P.x) || 0, ky = Math.sign(m.y - P.y) || 0;
        damageMob(G, m, dmg, crit, kx * 0.7, ky * 0.7);
      }
    }
  }

  // --- Spielergeschosse: Pfeile, Messer, Zauber ---
  for (const pr of G.pprojs) {
    pr.x += pr.vx * dt; pr.y += pr.vy * dt; pr.t -= dt;
    if (solidAt(tiles, pr.x, pr.y) || pr.x < 0 || pr.y < 0 || pr.x > W || pr.y > H) { pr.t = 0; continue; }
    for (const m of G.mobs) {
      if (m.dead || pr.hit.has(m.id)) continue;
      if (Math.hypot(m.x - pr.x, m.y - pr.y) < m.size / 2 + 5) {
        pr.hit.add(m.id);
        const len = Math.hypot(pr.vx, pr.vy) || 1;
        applyHit(G, m, pr, pr.vx / len, pr.vy / len);
        if (!pr.pierce) { pr.t = 0; break; }
      }
    }
  }
  G.pprojs = G.pprojs.filter(pr => pr.t > 0);

  // --- Sofortwirkungen: Nova, Strahl, Kette ---
  for (const ef of G.pending) {
    if (ef.type === "nova") {
      for (const m of G.mobs) {
        if (m.dead) continue;
        const mx = m.x - ef.x, my = m.y - ef.y, dist = Math.hypot(mx, my) || 1;
        if (dist <= ef.radius + m.size / 2) applyHit(G, m, ef, mx / dist, my / dist);
      }
    } else if (ef.type === "beam") {
      for (const m of G.mobs) {
        if (m.dead) continue;
        const mx = m.x - ef.x, my = m.y - ef.y;
        const along = mx * ef.dx + my * ef.dy;
        if (along < 0 || along > ef.len) continue;
        const across = Math.abs(mx * ef.dy - my * ef.dx);
        if (across <= ef.width + m.size / 2) applyHit(G, m, ef, ef.dx, ef.dy);
      }
    } else if (ef.type === "chain") {
      let fx = ef.x, fy = ef.y;
      const done = new Set();
      for (let j = 0; j < ef.jumps; j++) {
        let best = null, bestD = ef.range;
        for (const m of G.mobs) {
          if (m.dead || done.has(m.id)) continue;
          const dd = Math.hypot(m.x - fx, m.y - fy);
          if (dd < bestD) { best = m; bestD = dd; }
        }
        if (!best) break;
        done.add(best.id);
        G.fx.push({ kind: "beam", x: fx, y: fy, x2: best.x, y2: best.y, color: ef.color, t: 0.25, maxT: 0.25, thin: true });
        const dx = best.x - fx, dy = best.y - fy, len = Math.hypot(dx, dy) || 1;
        applyHit(G, best, { ...ef, dmg: ef.dmg * Math.pow(0.8, j) }, dx / len, dy / len);
        fx = best.x; fy = best.y;
      }
    }
  }
  G.pending = [];

  if (P.buffT > 0) P.buffT -= dt;

  // --- Monster ---
  for (const m of G.mobs) {
    if (m.dead) continue;
    m.t += dt;
    if (m.hitT > 0) m.hitT -= dt;
    if (m.cd > 0) m.cd -= dt;
    if (m.sideT > 0) m.sideT -= dt;
    if (m.burnT > 0) {
      m.burnT -= dt; m.burnTick = (m.burnTick || 0) + dt;
      if (m.burnTick >= 0.5) { m.burnTick -= 0.5; damageMob(G, m, Math.max(1, Math.round(m.burnDps * 0.5)), false, 0, 0, ELEMENTS.feuer.color); if (m.dead) continue; }
    }
    if (m.slowT > 0) m.slowT -= dt;
    if (m.spawnDelay > 0) continue;
    const goal = m.raid && raidActive(G) ? raidTarget(G, m) : null;
    const gx = goal ? goal.x : P.x, gy = goal ? goal.y : P.y;
    const dx = gx - m.x, dy = gy - m.y, dist = Math.hypot(dx, dy) || 1;
    const nx = dx / dist, ny = dy / dist;
    let mx = 0, my = 0;
    const aware = dist < 130 || !!G.screen.dungeonRoom || !!goal;
    if (m.ai === "chase") {
      if (aware) { mx = nx; my = ny; } else { mx = Math.cos(m.t * 0.7 + m.wx); my = Math.sin(m.t * 0.9 + m.wy); }
    } else if (m.ai === "ranged") {
      if (aware) {
        if (dist > 80) { mx = nx; my = ny; } else if (dist < 50) { mx = -nx; my = -ny; } else { mx = -ny * 0.6; my = nx * 0.6; }
        if (m.cd <= 0 && dist < 150) {
          m.cd = m.boss ? 0.9 : 1.7;
          const spd = 90;
          G.projs.push({ x: m.x, y: m.y, vx: nx * spd, vy: ny * spd, dmg: m.atk * 0.8, color: m.color2, t: 3 });
          if (m.boss) for (const a of [-0.5, 0.5]) G.projs.push({ x: m.x, y: m.y, vx: Math.cos(Math.atan2(ny, nx) + a) * spd, vy: Math.sin(Math.atan2(ny, nx) + a) * spd, dmg: m.atk * 0.8, color: m.color2, t: 3 });
        }
      }
    } else if (m.ai === "erratic") {
      if (Math.floor(m.t * 3) !== Math.floor((m.t - dt) * 3)) { const a = Math.random() * Math.PI * 2; m.wx = Math.cos(a) * 0.7 + nx * 0.5; m.wy = Math.sin(a) * 0.7 + ny * 0.5; }
      mx = m.wx; my = m.wy;
    }
    // Blockiert: kurz 90° ausweichen
    if (m.sideT > 0) { const tx = -my * m.side, ty = mx * m.side; mx = tx; my = ty; }
    const sp = m.spd * (m.slowT > 0 ? 0.5 : 1);
    const kb = Math.hypot(m.vx, m.vy);
    m.vx *= Math.pow(0.02, dt); m.vy *= Math.pow(0.02, dt);
    const half = m.size / 2 - 1;
    const stepX = (kb > 5 ? m.vx : mx * sp) * dt, stepY = (kb > 5 ? m.vy : my * sp) * dt;
    const ox = m.x, oy = m.y;
    moveWithCollision(tiles, m, stepX, stepY, half, half);
    m.x = clamp(m.x, half + 1, W - half - 1); m.y = clamp(m.y, half + 1, H - half - 1);
    const wanted = Math.hypot(stepX, stepY), moved = Math.hypot(m.x - ox, m.y - oy);
    if (m.ai === "chase" && !aware && m.x === ox && m.y === oy) { m.wx += 1.7; m.wy += 1.1; }
    if (aware && m.ai !== "erratic" && kb <= 5 && wanted > 0.01 && moved < wanted * 0.3 && m.sideT <= 0) {
      m.side = Math.random() < 0.5 ? 1 : -1; m.sideT = 0.5;
    }
    // Kontaktschaden
    const pd = goal ? Math.hypot(P.x - m.x, P.y - m.y) : dist;
    if (pd < m.size / 2 + 5) hurtPlayer(G, m.atk);
  }
  G.mobs = G.mobs.filter(m => !m.dead);

  // --- Projektile ---
  for (const p of G.projs) {
    p.x += p.vx * dt; p.y += p.vy * dt; p.t -= dt;
    if (solidAt(tiles, p.x, p.y) || p.x < 0 || p.y < 0 || p.x > W || p.y > H) p.t = 0;
    if (Math.hypot(p.x - P.x, p.y - P.y) < 7) { hurtPlayer(G, p.dmg); p.t = 0; }
  }
  G.projs = G.projs.filter(p => p.t > 0);

  // --- Drops ---
  for (const dr of G.drops) {
    dr.t += dt;
    dr.x += dr.vx * dt; dr.y += dr.vy * dt; dr.vx *= 0.9; dr.vy *= 0.9;
    dr.x = clamp(dr.x, 4, W - 4); dr.y = clamp(dr.y, 4, H - 4);
    const dist = Math.hypot(dr.x - P.x, dr.y - P.y);
    if (dr.type === "gold" && dist < 36 && dr.t > 0.3) { dr.x += (P.x - dr.x) * 8 * dt; dr.y += (P.y - dr.y) * 8 * dt; }
    if (dist < 19 && dr.t > 0.3) {
      if (dr.type === "gold") { P.gold += dr.amount; G.fx.push({ kind: "num", x: dr.x, y: dr.y - 6, rise: 0, text: "+" + dr.amount + "G", color: "#ffd23f", t: 0.8, small: true }); dr.done = true; emit(G, "gold"); }
      else if (dr.type === "potion") { addToInventory(P, makePotion(dr.id, dr.qty)); flash(G, POTIONS[dr.id].name + " erhalten", POTIONS[dr.id].color); dr.done = true; emit(G, "pickup"); }
      else if (dr.type === "item") {
        if (addToInventory(P, dr.item)) { flash(G, dr.item.name, RARITY_BY_ID[dr.item.rarity].color); dr.done = true; emit(G, "pickup", { rarity: dr.item.rarity }); }
        else if (!dr.warned) { flash(G, "Inventar voll", "#ff5f6d"); dr.warned = true; }
      }
      G.dirty = true;
    }
  }
  G.drops = G.drops.filter(dr => !dr.done);

  // --- Effekte ---
  for (const f of G.fx) { f.t -= dt; if (f.kind === "part") { f.x += f.vx * dt; f.y += f.vy * dt; } if (f.kind === "num") f.rise += 18 * dt; }
  G.fx = G.fx.filter(f => f.t > 0);

  // --- Tile-Trigger ---
  const tx = Math.floor(P.x / TS), ty = Math.floor(P.y / TS);
  if (tx >= 0 && ty >= 0 && tx < VW && ty < VH) {
    const t = tiles[idx(tx, ty)];
    if (t === T.LAVA) hurtPlayer(G, 12 + P.level * 2);
    if (G.trigCd <= 0) {
      if (t === T.DOOR) {
        const type = G.screen.doors[`${tx},${ty}`];
        G.trigCd = 0.6;
        const back = ty <= 3 ? ty + 1 : ty - 1;
        G.panelReturn = { x: tx * TS + 8, y: back * TS + 8 };
        G.openPanel && G.openPanel(type);
      } else if (t === T.ENTRANCE) {
        const dg = G.screen.dungeon;
        G.trigCd = 1;
        enterScreen(G, "d" + dg.id, 1, 2, 7 * TS + 8, (VH - 3) * TS + 8);
        return;
      } else if (t === T.EXIT) {
        const dg = G.screen.dungeonRoom.d;
        const [sx, sy] = dg.screen.split(",").map(Number);
        G.trigCd = 1;
        enterScreen(G, "over", sx, sy, 7 * TS + 8, 5 * TS + 8);
        return;
      } else if (t === T.CHEST && G.screen.chest && !P.chests[G.screen.chest.id]) {
        P.chests[G.screen.chest.id] = true; G.trigCd = 1;
        const r = mulberry32((Math.random() * 1e9) | 0);
        const lvl = G.screen.dungeonRoom ? G.screen.dungeonRoom.d.level + 2 : REGIONS[G.screen.region].level + 1;
        const item = generateItem(r, lvl, d.luck, G.screen.dungeonRoom ? 2 : 1);
        const gold = rint(r, lvl * 4, lvl * 9);
        G.drops.push({ type: "item", item, x: P.x, y: P.y + 10, vx: 0, vy: 30, t: 0 });
        G.drops.push({ type: "gold", amount: gold, x: P.x - 6, y: P.y + 10, vx: -20, vy: 30, t: 0 });
        G.banner = { text: "Truhe geöffnet", sub: item.name, t: 2.5 };
      }
    }
  }

  // --- Bildschirmwechsel (Landeposition wird vorher geprüft) ---
  if (P.x < 3) { if (!tryCross(G, -1, 0)) P.x = 3; }
  else if (P.x > W - 3) { if (!tryCross(G, 1, 0)) P.x = W - 3; }
  else if (P.y < 3) { if (!tryCross(G, 0, -1)) P.y = 3; }
  else if (P.y > H - 3) { if (!tryCross(G, 0, 1)) P.y = H - 3; }
}
export function attackBox(P, dir, reach) {
  const w = 14;
  if (dir === "up") return { x: P.x - w / 2, y: P.y - reach - 4, w, h: reach + 2 };
  if (dir === "down") return { x: P.x - w / 2, y: P.y + 2, w, h: reach + 2 };
  if (dir === "left") return { x: P.x - reach - 4, y: P.y - w / 2, w: reach + 2, h: w };
  return { x: P.x + 2, y: P.y - w / 2, w: reach + 2, h: w };
}
export function rectHit(a, b) { return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y; }

/* Ortsname für das HUD */
export function locationName(G) {
  const s = G.screen;
  if (!s) return "";
  if (s.village) return s.village.name;
  if (s.dungeonRoom) return s.dungeonRoom.d.name;
  return REGIONS[s.region].name;
}
export { VILLAGES };
