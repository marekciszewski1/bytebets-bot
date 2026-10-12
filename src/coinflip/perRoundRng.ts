import { createHash, createHmac, randomBytes } from "node:crypto";
import type { CoinSide } from "../games/coinflip.js";

export const COINFLIP_ROUND_DOMAIN = "bytebits-coinflip-v1";

export function generateRoundServerSeed(): string {
  return randomBytes(32).toString("hex");
}

export function hashServerSeed(serverSeed: string): string {
  return createHash("sha256").update(serverSeed, "utf8").digest("hex");
}

/** Canonical message for PvP coinflip bit — sides locked before reveal. */
export function coinflipRoundMessage(input: {
  roundId: string;
  clientSeedA: string;
  clientSeedB: string;
  nonce: number;
}): string {
  const [first, second] = [input.clientSeedA, input.clientSeedB].sort();
  return `${COINFLIP_ROUND_DOMAIN}|${input.roundId}|${first}|${second}|${input.nonce}`;
}

export function coinflipOutcomeFromSeed(
  serverSeed: string,
  roundId: string,
  clientSeedA: string,
  clientSeedB: string,
  nonce: number
): { side: CoinSide; digest: string } {
  const message = coinflipRoundMessage({ roundId, clientSeedA, clientSeedB, nonce });
  const digest = createHmac("sha256", serverSeed).update(message, "utf8").digest("hex");
  const unit = parseInt(digest.slice(0, 8), 16) / 0x1_0000_0000;
  return { side: unit < 0.5 ? "heads" : "tails", digest };
}
