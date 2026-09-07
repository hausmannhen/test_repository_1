# Eldenfeld

Zelda-artiges Fantasy-Action-RPG mit Loot. Welt, Monster, Items und Dropchancen entstehen prozedural aus einem Seed. Sieben Regionen auf 10×10 Bildschirmen, sechs Dörfer mit Bewohnern, sieben Zwischenboss-Reviere, drei Dungeons mit Bossen, 40 Basisitems in fünf Seltenheiten mit deutsch deklinierten Affixen.

Eine Hauptgeschichte „Die drei Siegel“ in zehn Kapiteln und drei Akten: Grasland und Wald, dann Höhen, Wüste und Moor, dann Frost und Glut. Barrieren an den Regionsgrenzen öffnen sich mit den Kapiteln. In Kapitel 7 stellt die Weise von Elmshain den Spieler vor die Wahl: das dritte Siegel brechen (sie stirbt, Vargor entfesselt mit drei Phasen, beste Beute) oder flicken (sie lebt, Vargor gefesselt, leichter, weniger Beute). Zwei Enden. Dazu Überfälle und Nebenaufgaben.

Drei Kampfarten: Nahkampf (Schwert, Axt, Speer), Fernkampf (Bogen, Armbrust, Wurfmesser, Wurfaxt) und Magie mit acht Elementen plus Blutmagie. Ein Skilltree mit drei Zweigen, ein Punkt alle drei Stufen.

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
- Tastatur: WASD oder Pfeile, Leertaste Angriff, Q oder Shift Zauber, 1 bis 9 Zauber wählen, Tab nächster Zauber, E Heiltrank, R Manatrank, I Menü, Escape schließt Panels.
- Fernwaffen schießen in Blickrichtung mit sanfter Zielhilfe auf den nächsten Gegner im Kegel. Zauber ebenso.
- Häuser in Dörfern über die Tür betreten: Händler, Heilerin, Schmied, Weise.

## Welt und Geschichte

- Karte 10×10 in `REGION_MAP` (`src/game/constants.js`). Start in Elmshain in der Mitte. Dörfer: Elmshain, Nebelfurt (Wald), Kargstein (Berge), Dünenruh (Wüste), Moorhall (Moor), Frosthain (Frost).
- Zwischenbosse in `src/data/minibosses.js`, einer je Region auf einem festen Bildschirm. Einmal besiegt, kehren sie nicht zurück, hinterlassen ein Item ab Selten und extra Gold. Auf der Karte als Schädel.
- Bewohner in `src/data/npcs.js`, Aufgaben in `src/data/quests.js`. Neben einem Bewohner wird der Schwert-Knopf zu „Reden“, neben einem Wegweiser zu „Lesen“. Ausrufezeichen über dem Kopf: Aufgabe verfügbar. Häkchen: erfüllt, Belohnung abholen. Der Tracker unter dem Ortsnamen zeigt das aktuelle Ziel.
- Aufgabenarten: Monster einer Art besiegen, Zwischenboss, Dungeon-Boss, Überfall, Entscheidung. Bereits erledigte Ziele zählen rückwirkend.
- Barrieren in `src/data/gates.js`: Steinschlag (Höhen) fällt nach Kapitel 4, Sandsturm und Nebelwand nach Kapitel 6, Frostwand und Aschesturm nach der Wahl in Kapitel 7. Am Bildschirmrand als Wand sichtbar, im Aufgaben-Tab aufgelistet.
- Arenen: Reviere der Zwischenbosse, Bossräume und Hinterhalte in der Wildnis, in Schlangenlinie über die Karte immer 8 bis 12 Bildschirme auseinander (per Seed festgelegt, für alle Spieler gleich). Beim Betreten schließen Palisaden die Ränder, bis alle Gegner besiegt sind. Hinterhalte sperren nur beim ersten Mal. Arenen haben immer eine Kampftruhe mit besserer Beute, dazu gibt es Erfahrung.
- Elites (`src/data/elites.js`): rund acht Prozent der Wildnis-Monster tragen eine Eigenschaft, sichtbar an der Aura am Boden und am Namen: Zäher, Wütender, Flinker, Eisiger (verlangsamt bei Treffer), Heilender, Geladener (explodiert beim Tod). Immer ein Item, dreifache Erfahrung.
- Fähigkeiten (`src/data/abilities.js`): Endbosse haben zwei, Zwischenbosse eine. Jede wird angekündigt, roter Ring oder roter Strahl, der Boss hält kurz inne und glüht, dann trifft sie: Bodenstampfer (Umkreis, Rückstoß), Wurzelschlag (Stelle des Spielers), Feuerodem (Strahl), Frostnova (verlangsamt), Sprung (zum Spieler). Dazu einmalige: Ruf (Verstärkung bei halbem Leben), Raserei (ab 30 %).
- Geschichte: beim ersten Start eines neuen Spielstands erklärt ein Fenster die Geschichte, bevor sich etwas bewegt („Aufbrechen“ schließt es). Danach steht derselbe Text im Menü unter „Geschichte“, mit dem Stand der Kapitel. Alte Spielstände sehen das Fenster nicht, nur den Reiter.
- Einstieg: neue Spieler bekommen einmalige Hinweise, wenn nichts anderes angezeigt wird: Weg zu Bram, Steuerung, erster Fertigkeitspunkt, erste Beute, wenig Leben.
- Kampftruhen: Keine Truhe öffnet sich, solange Gegner auf dem Bildschirm sind. Das Schloss pulsiert rot, bis der letzte fällt, dann wird es gold.
- Überfall: Annehmen sperrt die vier Dorfausgänge mit Palisaden, Monster kommen in Wellen durch die Tore und laufen zum Brunnen. Fällt der Brunnen, ist der Überfall verloren und die Aufgabe wieder annehmbar. Die letzte Welle bringt einen Anführer. „Wachdienst“ in Elmshain ist endlos wiederholbar, jedes Mal eine Welle mehr und stärkere Gegner, Belohnung wächst mit. Logik in `src/game/raid.js`.

## Kampf, Magie, Skilltree

- Waffen haben einen Typ. Nahkampf trifft im Bogen vor dem Helden. Fernkampf feuert Geschosse mit Reichweite, Feuerrate und Geschossart. Fokuswaffen (Stäbe) sind schwach im Nahkampf, verstärken aber Magie.
- Zauber: Feuerball (Brand), Eissplitter (verlangsamt), Blitzschlag (springt), Erdstoß (Rückstoß rundum), Windschnitt (durchschlägt), Wasserwoge (Welle), Lichtstrahl (heilt), Schattengriff (Lebensraub), Blutpfeil und Aderlass (kosten Leben statt Mana, dafür stark). Tabellen in `src/data/spells.js`.
- Skilltree in `src/data/skills.js`: Krieger (Kraft, Zähigkeit, Wirbelhieb, Eisenhaut, Raserei), Jäger (Zielen, Schnelle Hand, Doppelschuss, Durchschlag, Adlerauge), Magie (Manaquelle, Meditation, Arkane Macht, ein Knoten je Element, Blutmagie). Rang 1 eines Elements schaltet den Zauber frei, jeder weitere Rang gibt 25 % Schaden. Höhere Ränge brauchen je fünf Stufen mehr als der vorherige. Die Weise setzt alle Punkte gegen Gold zurück.
- Mana regeneriert langsam. Zwei Tränke: Heiltrank (30 % des Lebens), Manatrank (50 % Mana), beide beim Händler.
- Ton: Musik und Geräusche werden per WebAudio erzeugt, keine Dateien. Musik wechselt mit der Region, Effekte für Hieb, Schuss, Treffer, Zauber, Beute, Aufstieg. Lautstärke und Stummschalten im Menü unter „Ton“, gespeichert im Browser.
- HUD: Minikarte oben rechts mit erkundeten Bildschirmen, Dörfern (Gold), Dungeons (Rot), Revieren (Orange, grau nach Sieg) und eigener Position.

## Online-Konten (optional)

Mit einem Supabase-Projekt liegen bis zu zehn Konten in der Cloud, jedes mit Name und vierstelliger PIN, spielbar von jedem Gerät. Einrichtung: `supabase/schema.sql` im SQL Editor ausführen, Projekt-Adresse und öffentlichen Schlüssel in `src/cloud.config.js` eintragen. Bleibt die Adresse leer, zeigt das Spiel nur Gerätekonten.

Schutz liegt in der Datenbank: PIN als bcrypt-Hash, fünf Fehlversuche sperren 15 Minuten, Sitzungs-Token 60 Tage, die Tabelle selbst ist für den öffentlichen Schlüssel gesperrt. Gespeichert wird lokal sofort und online gebündelt (alle vier Sekunden höchstens einmal, beim Verlassen sofort). Offline geht es mit dem lokalen Stand weiter, der beim nächsten Kontakt hochgeladen wird. Einladungscode: `update einstellungen set value = 'Wort' where key = 'einladung';` im SQL Editor, danach braucht jedes neue Konto das Wort. PIN zurücksetzen: Kommentar am Ende von `supabase/schema.sql`.

## Spielstände

Beim Start stehen zwei Gerätekonten zur Auswahl. Ein freies Konto bekommt einen Namen und eine eigene Welt, ein belegtes wird mit „Spielen“ fortgesetzt. Gespeichert wird automatisch in das gewählte Konto: bei jedem Bildschirmwechsel, beim Schließen eines Panels und über „Speichern und zum Titel“ im Ausrüstungsmenü. Die Konten liegen im Browser des Geräts (localStorage).

Hinter „…“ bei jedem Konto: Umbenennen, „Als Datei sichern“ (JSON-Datei), „Aus Datei laden“ (überschreibt dieses Konto, mit Rückfrage), Zurücksetzen. Ein freies Konto kann direkt eine Datei laden. So wandert ein Spielstand auf ein anderes Handy.

## Struktur

```
src/
  game/         Spiellogik, rendering-frei
    constants.js  Tiles, Bildschirmmaße, Regionen, Dörfer, Dungeons
    rng.js        Seed-Zufall
    items.js      generateItem, Stats, Aufwertung (Tabellen in data/)
    magic.js      Zauber wirken, Kosten, Zielhilfe
    skills.js     Skilltree, Punkte, Boni
    monsters.js   Monstertypen, Bosse, Skalierung, Drop-Tabellen
    world.js      Oberwelt, Dörfer mit Bewohnern, Dungeons, Spawns, Zwischenbosse
    quests.js     Aufgaben annehmen, Fortschritt, Abschluss, Gespräche
    player.js     Spieler, abgeleitete Werte, Inventar, Tränke
    engine.js     update(G, dt, input), enterScreen, Kollision, Kampf
    actions.js    Panel-Aktionen: Anlegen, Handel, Schmied, Heilerin
    save.js       Spielstände im localStorage, Versionierung, Export und Import
    input.js      Tastatur und Touch in ein Eingabeobjekt
  data/         Tabellen: items.js, spells.js, skills.js, minibosses.js, npcs.js, quests.js
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
