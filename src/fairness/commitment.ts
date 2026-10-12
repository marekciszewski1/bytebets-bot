import { generateServerSeed, sha256Hex } from "./rng.js";

export type SeedCommitment = {
  serverSeed: string;
  serverSeedHash: string;
};

export function createCommitment(): SeedCommitment {
  const serverSeed = generateServerSeed();
  return {
    serverSeed,
    serverSeedHash: sha256Hex(serverSeed),
  };
}

export function verifyServerSeed(serverSeed: string, expectedHash: string): boolean {
  return sha256Hex(serverSeed) === expectedHash;
}
