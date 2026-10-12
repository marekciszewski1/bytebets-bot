import { createCommitment, verifyServerSeed } from "./commitment.js";
import { activateCommitment, getActiveCommitment } from "../db/fairness.js";
import { isSupabaseConfigured } from "../db/supabase.js";

type ActiveSeed = {
  serverSeed: string;
  serverSeedHash: string;
};

let memoryFallback: ActiveSeed | null = null;

/** Load or create the active server seed (DB when configured, else in-memory for local dev). */
export async function ensureActiveServerSeed(): Promise<ActiveSeed> {
  if (!isSupabaseConfigured()) {
    if (!memoryFallback) {
      memoryFallback = createCommitment();
    }
    return memoryFallback;
  }

  try {
    const existing = await getActiveCommitment();
    if (existing?.server_seed && existing.seed_hash) {
      if (!verifyServerSeed(existing.server_seed, existing.seed_hash)) {
        throw new Error("Active fairness commitment failed hash check");
      }
      return {
        serverSeed: existing.server_seed,
        serverSeedHash: existing.seed_hash,
      };
    }

    const created = createCommitment();
    await activateCommitment(created.serverSeedHash, created.serverSeed);
    return created;
  } catch (error) {
    console.warn(
      "Fairness DB unavailable (run migration 002?) — using in-memory seed for this process:",
      error
    );
    if (!memoryFallback) {
      memoryFallback = createCommitment();
    }
    return memoryFallback;
  }
}

export function resetMemorySeedForTests(): void {
  memoryFallback = null;
}

export type SeedRotationResult = {
  previous: { serverSeed: string; serverSeedHash: string } | null;
  current: { serverSeed: string; serverSeedHash: string };
};

/** Deactivates current seed (revealed in DB) and activates a new commitment. */
export async function rotateActiveServerSeed(): Promise<SeedRotationResult> {
  let previous: SeedRotationResult["previous"] = null;

  if (!isSupabaseConfigured()) {
    previous = memoryFallback ? { ...memoryFallback } : null;
    memoryFallback = createCommitment();
    return { previous, current: memoryFallback };
  }

  const existing = await getActiveCommitment();
  if (existing?.server_seed && existing.seed_hash) {
    previous = {
      serverSeed: existing.server_seed,
      serverSeedHash: existing.seed_hash,
    };
  }

  const created = createCommitment();
  await activateCommitment(created.serverSeedHash, created.serverSeed);
  return { previous, current: created };
}
