import { randomIntInclusive } from "../fairness/rng.js";
import { dicePayout as paytableDicePayout } from "../paytables/v1.js";

export function rollDiceFair(
  serverSeed: string,
  clientSeed: string,
  nonce: number,
  cursor = 0
): { roll: number; digest: string } {
  const { value, digest } = randomIntInclusive(serverSeed, clientSeed, nonce, cursor, 1, 6);
  return { roll: value, digest };
}

export { paytableDicePayout as dicePayout };
