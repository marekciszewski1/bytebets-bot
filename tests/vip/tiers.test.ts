import { describe, expect, it } from "vitest";
import { canUseBadge, tierForWagered } from "../../src/vip/tiers.js";

describe("VIP tiers", () => {
  it("assigns bronze by default", () => {
    expect(tierForWagered(0).id).toBe("bronze");
  });

  it("unlocks higher badges with wagered volume", () => {
    expect(canUseBadge(0, "dice")).toBe(true);
    expect(canUseBadge(0, "crown")).toBe(false);
    expect(canUseBadge(60_000, "crown")).toBe(true);
  });
});
