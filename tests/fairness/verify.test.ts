import { describe, expect, it } from "vitest";
import { verifyBetReplay } from "../../src/fairness/verify.js";
import { flipCoinFair } from "../../src/games/coinflip.js";
import { PAYTABLE_VERSION } from "../../src/paytables/v1.js";

describe("verify replay", () => {
  it("replays coinflip metadata", () => {
    const serverSeed = "test-server-seed-value-1234567890";
    const clientSeed = "client";
    const nonce = 0;
    const { outcome, digest } = flipCoinFair(serverSeed, clientSeed, nonce, 0);
    const meta = {
      paytable_version: PAYTABLE_VERSION,
      server_seed_hash: "unused",
      client_seed: clientSeed,
      nonce,
      cursor: 0,
      digest,
      game: "coinflip",
      pick: outcome,
    };
    const result = verifyBetReplay(serverSeed, meta);
    expect(result.ok).toBe(true);
  });
});
