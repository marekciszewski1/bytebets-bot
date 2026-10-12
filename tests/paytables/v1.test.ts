import { describe, expect, it } from "vitest";
import {
  COINFLIP,
  DICE,
  TARGET_RTP,
  coinflipPayout,
  dicePayout,
  minesCashoutPayout,
} from "../../src/paytables/v1.js";

describe("paytable v1 house edge", () => {
  it("targets ~95% RTP on coinflip", () => {
    const rtp = COINFLIP.winProbability * COINFLIP.winMultiplier;
    expect(rtp).toBeCloseTo(TARGET_RTP, 5);
    expect(coinflipPayout(100, true)).toBe(190);
    expect(coinflipPayout(100, false)).toBe(0);
  });

  it("targets ~95% RTP on dice", () => {
    const rtp = DICE.winProbability * DICE.winMultiplier;
    expect(rtp).toBeCloseTo(TARGET_RTP, 5);
    expect(dicePayout(100, true)).toBe(570);
  });

  it("mines cashout uses positive multiplier after reveals", () => {
    const payout = minesCashoutPayout(100, 3, 2);
    expect(payout).toBeGreaterThan(100);
  });
});
