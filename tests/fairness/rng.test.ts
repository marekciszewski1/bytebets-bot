import { describe, expect, it } from "vitest";
import {
  digestFor,
  randomCoinSide,
  randomIntInclusive,
  sha256Hex,
  shuffleIndices,
} from "../../src/fairness/rng.js";
import { verifyServerSeed } from "../../src/fairness/commitment.js";

describe("provably fair RNG", () => {
  const serverSeed = "abc123serverseed";
  const clientSeed = "player-seed";
  const nonce = 7;

  it("hashes server seed consistently", () => {
    const hash = sha256Hex(serverSeed);
    expect(verifyServerSeed(serverSeed, hash)).toBe(true);
    expect(verifyServerSeed(serverSeed, "deadbeef")).toBe(false);
  });

  it("is deterministic for the same inputs", () => {
    const a = digestFor(serverSeed, clientSeed, nonce, 0);
    const b = digestFor(serverSeed, clientSeed, nonce, 0);
    expect(a).toBe(b);
    const c = digestFor(serverSeed, clientSeed, nonce, 1);
    expect(c).not.toBe(a);
  });

  it("coinflip stays heads or tails", () => {
    const { side } = randomCoinSide(serverSeed, clientSeed, nonce, 0);
    expect(["heads", "tails"]).toContain(side);
  });

  it("dice roll stays in 1..6", () => {
    const { value } = randomIntInclusive(serverSeed, clientSeed, nonce, 0, 1, 6);
    expect(value).toBeGreaterThanOrEqual(1);
    expect(value).toBeLessThanOrEqual(6);
  });

  it("shuffle is a permutation", () => {
    const { order } = shuffleIndices(serverSeed, clientSeed, nonce, 25, 0);
    const sorted = [...order].sort((x, y) => x - y);
    expect(sorted).toEqual(Array.from({ length: 25 }, (_, i) => i));
  });
});
