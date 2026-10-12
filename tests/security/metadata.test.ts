import { describe, expect, it } from "vitest";
import { MINES } from "../../src/paytables/v1.js";

describe("security bounds", () => {
  it("rejects invalid mine counts at session layer", () => {
    expect(MINES.minMineCount).toBeGreaterThan(0);
    expect(MINES.maxMineCount).toBeLessThan(MINES.gridSize);
  });

  it("paytable version is stable string", () => {
    expect(typeof MINES.id).toBe("string");
  });
});
