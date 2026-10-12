import { describe, expect, it } from "vitest";
import { buildOddsDisclosure } from "../../src/paytables/oddsPublic.js";

describe("public odds disclosure", () => {
  it("includes all four game families", () => {
    const rows = buildOddsDisclosure();
    const names = rows.map((r) => r.game);
    expect(names.some((n) => n.includes("Coinflip"))).toBe(true);
    expect(names.some((n) => n.includes("Dice"))).toBe(true);
    expect(names.some((n) => n.includes("Roulette"))).toBe(true);
    expect(names.some((n) => n.includes("Mines"))).toBe(true);
  });

  it("shows coinflip RTP near 95%", () => {
    const coinflip = buildOddsDisclosure().find((r) => r.game === "Coinflip");
    expect(coinflip?.theoreticalRtp).toBe("95.00%");
  });
});
