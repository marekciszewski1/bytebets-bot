import { afterEach, describe, expect, it } from "vitest";
import {
  resetMemorySeedForTests,
  rotateActiveServerSeed,
} from "../../src/fairness/serverSeed.js";
import { verifyServerSeed } from "../../src/fairness/commitment.js";

describe("seed rotation (memory dev mode)", () => {
  afterEach(() => {
    resetMemorySeedForTests();
  });

  it("reveals previous seed and issues a new hash", async () => {
    const first = await rotateActiveServerSeed();
    const second = await rotateActiveServerSeed();

    expect(second.previous?.serverSeed).toBe(first.current.serverSeed);
    expect(verifyServerSeed(second.previous!.serverSeed, second.previous!.serverSeedHash)).toBe(
      true
    );
    expect(second.current.serverSeedHash).not.toBe(first.current.serverSeedHash);
  });
});
