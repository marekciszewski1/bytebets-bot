import { randomUUID } from "node:crypto";
import { getSupabase } from "./supabase.js";

export type CoinflipMatchRow = {
  id: string;
  public_id: string;
  guild_id: string;
  creator_id: string;
  opponent_id: string | null;
  mode: "pvp" | "house";
  visibility: "public" | "private";
  creator_side: "heads" | "tails";
  stake_sc: number;
  fee_sc: number;
  pot_sc: number;
  winning_return_sc: number;
  state: string;
  seed_hash: string;
  server_seed: string | null;
  client_seed_a: string;
  client_seed_b: string;
  nonce: number;
  round_id: string | null;
  winner_id: string | null;
  expires_at: string;
  accepted_at: string | null;
  settled_at: string | null;
  created_at: string;
};

export function newPublicMatchId(): string {
  return randomUUID().slice(0, 8);
}

export async function createMatchRow(input: Partial<CoinflipMatchRow> & {
  public_id: string;
  guild_id: string;
  creator_id: string;
  mode: "pvp" | "house";
  creator_side: "heads" | "tails";
  stake_sc: number;
  fee_sc: number;
  pot_sc: number;
  winning_return_sc: number;
  seed_hash: string;
  client_seed_a: string;
  expires_at: string;
}): Promise<CoinflipMatchRow> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("coinflip_matches")
    .insert({
      ...input,
      state: "OPEN",
      visibility: input.visibility ?? "public",
    })
    .select("*")
    .single();
  if (error) throw error;
  return data as CoinflipMatchRow;
}

export async function getMatchByPublicId(publicId: string): Promise<CoinflipMatchRow | null> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("coinflip_matches")
    .select("*")
    .eq("public_id", publicId)
    .maybeSingle();
  if (error) throw error;
  return (data as CoinflipMatchRow | null) ?? null;
}

export async function updateMatch(
  publicId: string,
  patch: Record<string, unknown>
): Promise<CoinflipMatchRow> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("coinflip_matches")
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq("public_id", publicId)
    .select("*")
    .single();
  if (error) throw error;
  return data as CoinflipMatchRow;
}

export async function listOpenMatches(guildId: string, limit = 10): Promise<CoinflipMatchRow[]> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("coinflip_matches")
    .select("*")
    .eq("guild_id", guildId)
    .eq("state", "OPEN")
    .eq("mode", "pvp")
    .eq("visibility", "public")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data ?? []) as CoinflipMatchRow[];
}

export async function lockStake(
  discordId: string,
  username: string,
  amount: number,
  idempotencyKey: string
): Promise<number> {
  const supabase = getSupabase();
  const { data, error } = await supabase.rpc("coinflip_lock_stake", {
    p_discord_id: discordId,
    p_discord_username: username,
    p_amount: amount,
    p_idempotency_key: idempotencyKey,
  });
  if (error) {
    if (error.message.includes("insufficient_balance")) throw new Error("insufficient_balance");
    throw error;
  }
  return Number(data);
}

export async function creditStake(
  discordId: string,
  username: string,
  amount: number,
  idempotencyKey: string
): Promise<number> {
  const supabase = getSupabase();
  const { data, error } = await supabase.rpc("coinflip_credit", {
    p_discord_id: discordId,
    p_discord_username: username,
    p_amount: amount,
    p_idempotency_key: idempotencyKey,
  });
  if (error) throw error;
  return Number(data);
}

export async function journalEscrow(input: {
  matchId: string;
  discordId: string;
  amountSc: number;
  entryType: "lock" | "refund" | "payout" | "fee_sink";
  idempotencyKey: string;
  roundId?: string;
}): Promise<void> {
  const supabase = getSupabase();
  const { error } = await supabase.from("escrow_journal").insert({
    match_id: input.matchId,
    round_id: input.roundId ?? null,
    discord_id: input.discordId,
    amount_sc: input.amountSc,
    entry_type: input.entryType,
    idempotency_key: input.idempotencyKey,
  });
  if (error && !error.message.includes("duplicate")) throw error;
}
