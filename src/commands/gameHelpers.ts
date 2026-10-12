import { ChatInputCommandInteraction, Interaction } from "discord.js";
import { PAYTABLE_VERSION } from "../paytables/v1.js";
import { ensurePlayer, recordBet } from "../db/players.js";
import { bumpChallengeProgress } from "../db/challenges.js";
import { ensureActiveServerSeed } from "../fairness/serverSeed.js";

export function usernameFrom(interaction: Interaction): string {
  if (!interaction.user) return "player";
  return interaction.user.displayName ?? interaction.user.username;
}

export async function prepareFairPlay(interaction: ChatInputCommandInteraction) {
  const player = await ensurePlayer(interaction.user.id, usernameFrom(interaction));
  const seed = await ensureActiveServerSeed();
  const clientSeed = player.client_seed || interaction.user.id;
  return {
    player,
    serverSeed: seed.serverSeed,
    serverSeedHash: seed.serverSeedHash,
    clientSeed,
    nonce: player.nonce,
  };
}

export function baseFairMetadata(input: {
  serverSeedHash: string;
  clientSeed: string;
  nonce: number;
  game: string;
  cursor?: number;
  digest?: string;
}): Record<string, unknown> {
  return {
    paytable_version: PAYTABLE_VERSION,
    server_seed_hash: input.serverSeedHash,
    client_seed: input.clientSeed,
    nonce: input.nonce,
    cursor: input.cursor ?? 0,
    digest: input.digest,
    game: input.game,
  };
}

export async function recordBetAndTrack(input: {
  discordId: string;
  username: string;
  game: string;
  wager: number;
  payout: number;
  expectedNonce: number;
  won: boolean;
  metadata?: Record<string, unknown>;
}): Promise<{ newBalance: number; profit: number; usedNonce: number }> {
  const result = await recordBet(input);
  try {
    await bumpChallengeProgress({
      discordId: input.discordId,
      wager: input.wager,
      won: input.won,
    });
  } catch {
    // Challenge columns may be missing if migration 003 not applied yet.
  }
  return result;
}

export { recordBet };
