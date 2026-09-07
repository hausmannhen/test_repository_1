import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { rankAccounts } from "../src/game/rank.js";

describe("Rangliste", () => {
  it("sortiert nach Stufe, Monstern, Gold", () => {
    const r = rankAccounts([{ name: "A", level: 3, kills: 10, gold: 5 }, { name: "B", level: 5, kills: 1, gold: 0 }, { name: "C", level: 3, kills: 20, gold: 1 }, { name: "D", level: 3, kills: 20, gold: 9 }]);
    assert.deepEqual(r.map(x => x.name), ["B", "D", "C", "A"]);
    assert.deepEqual(rankAccounts(null), []);
  });
});
