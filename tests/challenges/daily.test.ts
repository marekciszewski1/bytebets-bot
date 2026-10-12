import { describe, expect, it } from "vitest";
import { pickDailyChallenge, todayUtcDateString } from "../../src/challenges/daily.js";

describe("daily challenges", () => {
  it("picks a stable template per user/day", () => {
    const day = todayUtcDateString(new Date("2026-10-12T12:00:00Z"));
    const a = pickDailyChallenge("user-1", day);
    const b = pickDailyChallenge("user-1", day);
    expect(a.id).toBe(b.id);
  });

  it("can differ across users on same day", () => {
    const day = "2026-10-12";
    const a = pickDailyChallenge("user-a", day);
    const b = pickDailyChallenge("user-b", day);
    expect(typeof a.id).toBe("string");
    expect(typeof b.id).toBe("string");
  });
});
