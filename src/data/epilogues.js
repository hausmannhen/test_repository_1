/* Letzte Worte der Endbosse: erscheinen, sobald der Bossraum leer ist. Einmal je Boss. Vargor je nach Wahl. */
export const EPILOGUES = {
  0: {
    title: "Der Eichenkönig stirbt",
    words: [
      "„Still. Endlich still. Hundert Jahre habe ich das Siegel gehalten, und mit jedem Jahr hat der Berg lauter in mir gesprochen.",
      "Ich habe die Spinnen gerufen und die Wölfe getrieben, ich weiß es. Ich wollte, dass jemand kommt. Du bist gekommen. Hab Dank, Kind der Wiesen. Ich bin erlöst.“",
    ],
    after: "Sein letztes Wort ist ein Knacken wie Holz im Frost. Die Wurzeln im Schrein lösen sich, das Licht wird grün und dann grau. Weit im Norden hört ein Steinschlag auf zu rumpeln. Das erste Siegel ist gebrochen. Zwei halten noch, und der Berg hat es gespürt.",
  },
  1: {
    title: "Der Gebirgswächter zerbricht",
    words: [
      "„Hörst du ihn? Unter uns. Er atmet schneller, seit der Eichenkönig schweigt.",
      "Ich habe ihn gehalten, mit Fels und Wut, bis ich nichts mehr war als Fels und Wut. Danke, dass du mich zerbrichst. Es tut nicht weh. Es ist nur laut.“",
    ],
    after: "Der Golem zerfällt zu Geröll, und der Boden der Halle wird warm. Ein Glühen kriecht durch die Risse. Draußen legt sich der Sandsturm, der Nebel über dem Moor reißt auf, als hätte jemand die Hand weggenommen. Das zweite Siegel ist gebrochen. Nur eines hält noch, und es sitzt nicht in einem Ungeheuer. Es sitzt in einem Haus in Elmshain.",
  },
  2: {
    brechen: {
      title: "Vargor fällt",
      words: [
        "„Hundert Jahre Dunkelheit. Hundert Jahre die Stimmen von drei Wächtern in meinem Schädel.",
        "Dann kommst du, die Alte stirbt, und ich bin frei. Ganz. Für einen Tag. Es hat gereicht, um zu fliegen. Nimm es. Ich hasse dich nicht.“",
      ],
      after: "Vargor sinkt in die Asche, wird zu Stein und dann zu Staub. Der Ascheregen hört auf. Zum ersten Mal seit hundert Jahren sieht man vom Turm bis zum Frostkamm. Alle drei Siegel sind gebrochen, und es gibt nichts mehr zu binden. Eldenfeld gehört wieder denen, die darin leben. Die Monster werden trotzdem nicht müde.",
    },
    flicken: {
      title: "Vargor sinkt zurück",
      words: [
        "„Ketten. Immer noch Ketten. Die Alte lebt, ich rieche es.",
        "Du hast sie nicht sterben lassen, und du hast mich nicht ganz gelassen. Klug. Feige. Beides. Geh. Ich schlafe wieder, bis sie müde wird. Sie wird müde.“",
      ],
      after: "Vargor sinkt zurück in den Berg, halb Stein, halb Glut, und die Kette der Weisen zieht sich zu. Der Aschesturm bleibt fort, solange sie lebt. Das dritte Siegel hält, geflickt, nicht heil. In Elmshain sitzt eine alte Frau in ihrem Haus und sagt, sie sei jetzt weniger müde. Die Monster werden trotzdem nicht müde.",
    },
  },
};
/* Text für einen Boss, bei Vargor nach der Wahl */
export function epilogueFor(id, choice) {
  const e = EPILOGUES[id];
  if (!e) return null;
  return e.words ? e : (e[choice] || e.brechen);
}
