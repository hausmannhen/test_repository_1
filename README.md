# Eldenfeld

Zelda-artiges Fantasy-Action-RPG mit Loot. Welt, Monster, Items und Dropchancen entstehen prozedural aus einem Seed. Sieben Regionen, vier Dörfer, drei Dungeons mit Bossen, 24 Basisitems in fünf Seltenheiten mit deutsch deklinierten Affixen.

Rendering: stilisiertes Low-Poly-3D mit Three.js, feste Kamera schräg von oben, weicher Kamera-Slide beim Bildschirmwechsel. Mobil zuerst, Touch-Steuerung und Tastatur.

## Starten

```
npm install
npm run dev
```

Öffnet den Vite-Dev-Server, auch im lokalen Netz (`--host`), damit das Handy mitspielen kann.

```
npm test        # Logik-Tests (Node-Test-Runner, keine Abhängigkeiten)
npm run build   # Produktionsbuild nach dist/
```

Voraussetzung: Node 20 oder neuer.

## Steuerung

- Touch: Steuerkreuz links, Schwert und Trank rechts, Menüknopf für Ausrüstung und Karte.
- Tastatur: WASD oder Pfeile, Leertaste Angriff, E Trank, I Inventar, Escape schließt Panels.
- Häuser in Dörfern über die Tür betreten: Händler, Heilerin, Schmied, Weise.

## Spielstände

Beim Start stehen fünf Konten zur Auswahl. Ein freies Konto bekommt einen Namen und eine eigene Welt, ein belegtes wird mit „Spielen“ fortgesetzt. Gespeichert wird automatisch in das gewählte Konto: bei jedem Bildschirmwechsel, beim Schließen eines Panels und über „Speichern und zum Titel“ im Ausrüstungsmenü. Die Konten liegen im Browser des Geräts (localStorage).

Hinter „…“ bei jedem Konto: Umbenennen, „Als Datei sichern“ (JSON-Datei), „Aus Datei laden“ (überschreibt dieses Konto, mit Rückfrage), Zurücksetzen. Ein freies Konto kann direkt eine Datei laden. So wandert ein Spielstand auf ein anderes Handy.

## Struktur

```
src/
  game/         Spiellogik, rendering-frei
    constants.js  Tiles, Bildschirmmaße, Regionen, Dörfer, Dungeons
    rng.js        Seed-Zufall
    items.js      Basisitems, Seltenheiten, Affixe, generateItem
    monsters.js   Monstertypen, Bosse, Skalierung, Drop-Tabellen
    world.js      Oberwelt, Dörfer, Dungeons, Spawns
    player.js     Spieler, abgeleitete Werte, Inventar, Tränke
    engine.js     update(G, dt, input), enterScreen, Kollision, Kampf
    actions.js    Panel-Aktionen: Anlegen, Handel, Schmied, Heilerin
    save.js       Spielstände im localStorage, Versionierung, Export und Import
    input.js      Tastatur und Touch in ein Eingabeobjekt
  render3d/     Three.js
    renderer.js   Szene, Kamera, Licht, Bildschirmwechsel mit Kamera-Slide
    terrain.js    Tiles → Mesh mit Vertex-Farben, Höhen-Noise, Wasser- und Lava-Shader
    decor.js      InstancedMesh für Bäume, Steine, Büsche, Kakteen, Häuser, Wände
    player.js     Held aus Boxen, Schwertschwung, Schild, Helm
    monster.js    Shapes blob, quad, ghost, bat, golem, skel, human
    drops.js      Gold, Tränke, Items mit Seltenheitsglow
    effects.js    Schadenszahlen, Partikel, Projektile
    Scene.jsx     Canvas-Komponente
  ui/           HUD, Inventar, Händler, Schmied, Heilerin, Weise, Tod, Steuerung, Titel
  App.jsx       Titel, Spielschleife, Panels
legacy/
  eldenfeld-2d.jsx   Der 2D-Prototyp, unverändert als Referenz
tests/          Item-Verteilung, Weltgenerierung, Kampfsimulation, Speichern
```

Die Engine rechnet in Pixeln (16 px = 1 Tile). Der Renderer rechnet auf Weltkoordinaten (x, 0, y) um und liest den Spielzustand `G` jeden Frame nur lesend.

## Entscheidungen

- Three.js direkt statt react-three-fiber: der Renderer ist eine Klasse mit `render(G, dt)`, React kümmert sich nur um die UI. Weniger Reconciliation pro Frame, weniger Bibliotheksfläche.
- Tests mit dem eingebauten Node-Test-Runner statt Vitest. Gleiche Abdeckung, keine Dev-Abhängigkeit.
- Speicherstand hat `saveVersion: 1`, alte Stände aus dem Prototyp werden migriert.
- Bildschirmwechsel prüft die Landeposition vorher und weicht entlang der Kante aus; Monster drehen bei Blockade kurz um 90°.
