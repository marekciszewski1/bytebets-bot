import { randomCoinSide } from "../fairness/rng.js";
import { coinflipPayout as paytableCoinflipPayout } from "../paytables/v1.js";

export type CoinSide = "heads" | "tails";

export function flipCoinFair(
  serverSeed: string,
  clientSeed: string,
  nonce: number,
  cursor = 0
): { outcome: CoinSide; digest: string } {
  const { side, digest } = randomCoinSide(serverSeed, clientSeed, nonce, cursor);
  return { outcome: side, digest };
}

export { paytableCoinflipPayout as coinflipPayout };
