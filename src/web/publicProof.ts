import { coinflipOutcomeFromSeed } from "../coinflip/perRoundRng.js";
import { verifyServerSeed } from "../fairness/commitment.js";
import type { RoundRow } from "../db/rounds.js";
import { buildOddsDisclosure } from "../paytables/oddsPublic.js";
import { PAYTABLE_VERSION } from "../paytables/v1.js";

export function verifyRoundProof(round: RoundRow): {
  status: "verified" | "awaiting_reveal" | "failed";
  detail: string;
  recomputed?: Record<string, unknown>;
} {
  if (!round.server_seed) {
    return { status: "awaiting_reveal", detail: "Server seed not yet revealed for this round." };
  }
  if (!verifyServerSeed(round.server_seed, round.server_seed_hash)) {
    return { status: "failed", detail: "Server seed does not match committed hash." };
  }

  if (round.game.startsWith("coinflip")) {
    const outcome = round.outcome as { side?: string };
    const { side, digest } = coinflipOutcomeFromSeed(
      round.server_seed,
      round.opaque_id,
      round.client_seed_a,
      round.client_seed_b || "bytebits-house-dealer",
      round.nonce
    );
    if (outcome.side && outcome.side !== side) {
      return {
        status: "failed",
        detail: "Recomputed outcome does not match stored outcome.",
        recomputed: { side, digest },
      };
    }
    return {
      status: "verified",
      detail: "Coinflip outcome independently verified.",
      recomputed: { side, digest },
    };
  }

  return { status: "verified", detail: "Round hash verified; game-specific replay pending." };
}

export function roundProofJson(round: RoundRow) {
  const verification = verifyRoundProof(round);
  return {
    round_id: round.opaque_id,
    game: round.game,
    paytable_version: round.paytable_version,
    proof_status: round.proof_status,
    server_seed_hash: round.server_seed_hash,
    server_seed: round.server_seed,
    client_seed_a: round.client_seed_a,
    client_seed_b: round.client_seed_b,
    nonce: round.nonce,
    outcome: round.outcome,
    stake_sc: round.stake_sc,
    payout_sc: round.payout_sc,
    fee_sc: round.fee_sc,
    settled_at: round.settled_at,
    verification,
  };
}

export function oddsPayload(gameId: string) {
  const rows = buildOddsDisclosure();
  return {
    game_id: gameId,
    paytable_version: PAYTABLE_VERSION,
    published_at: new Date().toISOString(),
    lines: rows,
  };
}
