import { describe, expect, it } from "vitest";
import { houseCoinflipWinReturn, pvpCoinflipEconomics } from "../../src/coinflip/economics.js";

describe("PvP coinflip pot fee", () => {
  it("100 SC + 100 SC => 200 pot, 10 fee, 190 winner return", () => {
    const e = pvpCoinflipEconomics(100);
    expect(e.potSc).toBe(200);
    expect(e.feeSc).toBe(10);
    expect(e.winningReturnSc).toBe(190);
    expect(e.winnerNetSc).toBe(90);
    expect(e.loserNetSc).toBe(-100);
  });

  it("does not double-charge fee on winner return", () => {
    const e = pvpCoinflipEconomics(100);
    expect(e.winningReturnSc + e.feeSc).toBe(e.potSc);
  });
});

describe("house coinflip", () => {
  it("pays 1.90x on win for 100 SC stake", () => {
    expect(houseCoinflipWinReturn(100)).toBe(190);
  });
});
