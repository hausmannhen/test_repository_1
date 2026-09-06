# Übergabe: Eldenfeld, Fantasy-Action-RPG mit Loot

Dieses Dokument ist der Startpunkt für eine Claude-Code-Session. Ziel: den bestehenden 2D-Prototyp in ein sauberes Repository überführen und auf stilisiertes 3D (Three.js) umstellen.

## 1. Was existiert

`eldenfeld.jsx` ist ein vollständiger, spielbarer Prototyp in einer Datei (ca. 1.400 Zeilen, React + Canvas 2D). Er läuft als Claude-Artefakt und wurde per Node-Simulation getestet (Kampf, Loot, Dungeon-Wechsel, Bossfight, Bildschirmwechsel).

Enthaltene Systeme, alle prozedural aus einem Seed:

| System | Stand |
|---|---|
| Welt | 6×6 Bildschirme, 7 Regionen mit steigender Stufe (Grasland 1 bis Aschekessel 24), Regionskarte hart definiert in `REGION_MAP` |
| Dörfer | 4 Stück (Elmshain, Kargstein, Dünenruh, Moorhall), Häuser mit Türen: Händler, Heilerin, Schmied, Weise |
| Dungeons | 3 Stück, je 3×3 Räume per DFS-Spannbaum, Truhenräume, Bossraum am weitesten Punkt |
| Monster | 16 Typen, 3 KI-Arten (chase, ranged, erratic), Skalierung nach Stufe, 3 Bosse |
| Loot | 24 Basisitems in 6 Slots, 5 Seltenheiten, Präfix/Suffix-Affixe mit deutscher Deklination, Wert, Aufwertung bis +5 |
| Drops | Gold immer, Item 22 % + Glück, Trank 14 %, Bosse garantiert Episch+ |
| Spieler | Level, XP-Kurve, abgeleitete Stats aus Ausrüstung, Herzcontainer pro Boss, I-Frames, Krit, Tempo |
| UI | HUD mit Herzen, Inventar mit Vergleich, Händler, Schmied, Weltkarte, Tod/Respawn |
| Steuerung | Touch-Pad + Buttons, Tastatur (WASD, Leertaste, E, I) |
| Speichern | `window.storage` (Artefakt-API), im Repo durch localStorage ersetzen |

Die Spiellogik (Item-Generierung, Drop-Tabellen, Weltgenerierung, Kampfformeln) ist rendering-unabhängig und soll 1:1 übernommen werden. Nur Rendering und Input werden ausgetauscht.

## 2. Zielbild

- **Stil:** Low-Poly, klare Farbflächen, weiche Schatten, leichte Nebeltiefe. Kein Fotorealismus, keine externen Assets in Phase 1 (Geometrie aus Code: Box, Zylinder, Kegel, Kugel, gruppiert).
- **Kamera:** schräg von oben, fest, Zelda-artig. Perspektivkamera mit ca. 40° Neigung, FOV 35, folgt dem Spieler weich (Lerp). Kein freies Drehen. Bildschirmwechsel wird zu weichem Kamera-Slide statt hartem Schnitt.
- **Welt:** Tiles werden zu einem zusammenhängenden Terrain-Mesh pro Bildschirm (Höhe leicht variiert per Noise, Wasser tiefer, Fels höher). Dekor als InstancedMesh (Bäume, Steine, Kakteen).
- **Mobil zuerst:** Portrait, Touch-Steuerung wie im Prototyp, 60 fps auf Mittelklasse-Handys als Ziel. Pixel-Ratio auf 1.5 kappen, Schatten nur für Spieler und Monster.

## 3. Repo-Struktur (Vorschlag)

```
eldenfeld/
  package.json            Vite + React + three
  index.html
  src/
    main.jsx
    App.jsx               Titel, Spiel, Panels
    game/
      constants.js        TS, VW, VH, T, SOLID, Regionen
      rng.js              hashStr, mulberry32, rngFor, rint, pick, chance
      items.js            BASES, RARITIES, Affixe, generateItem, effectiveStats, POTIONS
      monsters.js         MOBS, BOSSES, makeMob, rollDrops
      world.js            genOverworldScreen, buildVillage, genDungeon, spawnMobsFor
      player.js           newPlayer, derive, xpNeed, addToInventory, usePotion
      engine.js           update, enterScreen, Kollision, Kampf (rendering-frei)
      save.js             localStorage-Wrapper, Versionierung des Savegames
    render3d/
      Scene.jsx           Canvas, Kamera, Licht, Loop (react-three-fiber)
      Terrain.jsx         Tiles → Mesh, Wasser-Shader, Lava-Emissive
      Decor.jsx           InstancedMesh für Bäume, Steine, Büsche, Kakteen
      Player.jsx          Low-Poly-Held, Schwertschwung als Animation
      Monster.jsx         Shape-Typen (blob, quad, ghost, bat, golem, skel, human)
      Drops.jsx           Gold, Tränke, Items mit Seltenheitsglow
      Effects.jsx         Schadenszahlen (Sprites), Partikel, Treffer-Flash
    ui/
      Hud.jsx, Inventory.jsx, Shop.jsx, Smith.jsx, Healer.jsx, Sage.jsx, Death.jsx, Controls.jsx
    styles.css
  legacy/
    eldenfeld-2d.jsx      Der Prototyp, unverändert als Referenz
  UEBERGABE_ELDENFELD.md
```

Stack: Vite, React 18, three, @react-three/fiber, @react-three/drei (nur für `useTexture`, `Text`, `Instances`). Kein Physik-Engine, die bestehende Tile-Kollision bleibt.

## 4. Arbeitsplan für die Session

**Schritt 1: Repo aufsetzen, Logik extrahieren**
- Vite-Projekt anlegen, `legacy/eldenfeld-2d.jsx` ablegen.
- Module aus dem Prototyp herausschneiden (Abschnitte sind in der Datei mit Kommentarbannern markiert: Konstanten, Weltgenerierung, Spieler & Engine, Rendering, Speichern, UI).
- `engine.js` darf keine Canvas- oder DOM-Referenz enthalten. `update(G, dt, input)` und `enterScreen()` bleiben die Schnittstelle.
- Unit-Tests mit Vitest: Item-Generierung (Seltenheitsverteilung über 10.000 Rolls), Weltgenerierung (Mitte jedes Bildschirms begehbar, Dungeon-Räume verbunden), Kampf-Simulation (30 Kills ohne Tod im Grasland auf Stufe 1).

**Schritt 2: 3D-Rendering**
- Koordinaten: Tile (x, y) → Weltposition (x, 0, y). Spieler-Pixelkoordinaten aus der Engine durch 16 teilen. Die Engine bleibt in Pixeln, das Rendering rechnet um.
- Terrain: pro Bildschirm eine BufferGeometry, Vertex-Farben statt Texturen, Höhe per einfachem Noise ±0.15, Wasser bei −0.3 mit animiertem Vertex-Shader.
- Licht: ein DirectionalLight schräg (warm), HemisphereLight (Himmel/Boden), Fog ab 14 Einheiten. Dungeons: kein Sonnenlicht, PointLight am Spieler, Fog dicht.
- Modelle: Spieler aus 6 Boxen (Kopf, Rumpf, Arme, Beine) mit Schwert als Box am Handgelenk. Monster-Shapes in eigene Komponenten, Farben aus `MOBS`.
- Kamera: Position = Spieler + (0, 9, 7), lookAt Spieler, Lerp 0.1. Beim Bildschirmwechsel Kamera 0,4 s über die Kante gleiten lassen, Engine dabei pausieren.

**Schritt 3: Feintuning und Assets**
- Balance aus der Simulation: Stufe 8 schafft Boss 1, Stufe 14 Boss 2, Stufe 25 Boss 3. Bei Bedarf Formeln in `derive()` und `makeMob()` anpassen.
- Erst danach echte Assets erwägen (Kenney Nature Kit, CC0, glTF). Loader in `Decor.jsx` vorbereiten, damit Instanzen austauschbar bleiben.
- Optional: Sound (Howler), Tag-Nacht-Zyklus, weitere Regionen.

## 5. Bekannte Schwachstellen des Prototyps

- Bildschirmwechsel platziert den Spieler manchmal in Dekor; `unstick()` verschiebt ihn dann auf das nächste freie Tile. In 3D mit Kamera-Slide sauberer lösen (Übergangsposition prüfen, bevor der Wechsel ausgelöst wird).
- Monster ohne Wegfindung, sie bleiben an Ecken hängen. Für 3D reicht ein einfaches Umgehen (bei Blockade 90° drehen), A* nur wenn nötig.
- Speicherformat hat keine Versionsnummer. Beim Repo-Start `saveVersion: 1` einführen und Migration vorsehen.
- Deklination der Suffixe ("des Bären") ist unabhängig vom Genus korrekt, Präfixe werden über `base.g` dekliniert. Neue Basisitems brauchen zwingend `g: "m" | "f" | "n"`.

## 6. Kontext zur Person

Hendrik, Copywriter bei Adveritas (Bern). Kommunikation direkt, editorisch präzise, deutsch. Keine Füllsätze, keine Selbstlob-Formulierungen im Code oder in Commit-Messages. Commits auf Deutsch, Imperativ, eine Zeile. Er will das Spiel selbst spielen, also nach jedem Meilenstein eine lauffähige Version mit `npm run dev`.
