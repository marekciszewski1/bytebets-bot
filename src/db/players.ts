import { getSupabase } from "./supabase.js";

export type PlayerRow = {
  id: string;
  discord_id: string;
  discord_username: string;
  balance: number;
  total_wagered: number;
  total_profit: number;
  last_daily_at: string | null;
  client_seed: string;
  nonce: number;
};

export type LeaderboardEntry = {
  discord_username: string;
  balance: number;
  total_wagered: number;
  total_profit: number;
};

export type BetRow = {
  id: string;
  game: string;
  wager: number;
  payout: number;
  profit: number;
  metadata: Record<string, unknown>;
  created_at: string;
};

export async function ensurePlayer(
  discordId: string,
  username: string
): Promise<PlayerRow> {
  const supabase = getSupabase();
  const { data, error } = await supabase.rpc("ensure_player", {
    p_discord_id: discordId,
    p_discord_username: username,
  });

  if (error) throw error;
  const row = data as PlayerRow;
  if (!row.client_seed) {
    row.client_seed = discordId;
  }
  return row;
}

export async function setClientSeed(
  discordId: string,
  username: string,
  clientSeed: string
): Promise<PlayerRow> {
  const supabase = getSupabase();
  const { data, error } = await supabase.rpc("set_client_seed", {
    p_discord_id: discordId,
    p_discord_username: username,
    p_client_seed: clientSeed,
  });

  if (error) {
    if (error.message.includes("invalid_client_seed")) {
      throw new InvalidClientSeedError();
    }
    throw error;
  }
  return data as PlayerRow;
}

export class InvalidClientSeedError extends Error {
  constructor() {
    super("invalid_client_seed");
  }
}

export async function claimDaily(
  discordId: string,
  username: string
): Promise<{ newBalance: number; nextClaimAt: Date }> {
  const supabase = getSupabase();
  const { data, error } = await supabase.rpc("claim_daily", {
    p_discord_id: discordId,
    p_discord_username: username,
  });

  if (error) {
    if (error.message.includes("daily_not_ready")) {
      throw new DailyNotReadyError();
    }
    throw error;
  }

  const row = Array.isArray(data) ? data[0] : data;
  return {
    newBalance: Number(row.new_balance),
    nextClaimAt: new Date(row.next_claim_at),
  };
}

export class DailyNotReadyError extends Error {
  constructor() {
    super("daily_not_ready");
  }
}

export async function recordBet(input: {
  discordId: string;
  username: string;
  game: string;
  wager: number;
  payout: number;
  expectedNonce: number;
  metadata?: Record<string, unknown>;
}): Promise<{ newBalance: number; profit: number; usedNonce: number }> {
  const supabase = getSupabase();
  const { data, error } = await supabase.rpc("record_bet", {
    p_discord_id: input.discordId,
    p_discord_username: input.username,
    p_game: input.game,
    p_wager: input.wager,
    p_payout: input.payout,
    p_metadata: input.metadata ?? {},
    p_expected_nonce: input.expectedNonce,
  });

  if (error) {
    if (error.message.includes("insufficient_balance")) {
      throw new InsufficientBalanceError();
    }
    if (error.message.includes("invalid_wager")) {
      throw new InvalidWagerError();
    }
    if (error.message.includes("nonce_mismatch")) {
      throw new NonceMismatchError();
    }
    throw error;
  }

  const row = Array.isArray(data) ? data[0] : data;
  return {
    newBalance: Number(row.new_balance),
    profit: Number(row.profit),
    usedNonce: Number(row.used_nonce),
  };
}

export class InsufficientBalanceError extends Error {
  constructor() {
    super("insufficient_balance");
  }
}

export class InvalidWagerError extends Error {
  constructor() {
    super("invalid_wager");
  }
}

export class NonceMismatchError extends Error {
  constructor() {
    super("nonce_mismatch");
  }
}

export async function fetchLeaderboard(
  metric: "wagered" | "profit",
  limit = 10
): Promise<LeaderboardEntry[]> {
  const column = metric === "wagered" ? "total_wagered" : "total_profit";
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("players")
    .select("discord_username, balance, total_wagered, total_profit")
    .order(column, { ascending: false })
    .limit(limit);

  if (error) throw error;
  return (data ?? []) as LeaderboardEntry[];
}

export async function fetchBetById(
  discordId: string,
  betId: string
): Promise<BetRow | null> {
  const supabase = getSupabase();
  const { data: player, error: playerError } = await supabase
    .from("players")
    .select("id")
    .eq("discord_id", discordId)
    .maybeSingle();

  if (playerError) throw playerError;
  if (!player) return null;

  const { data, error } = await supabase
    .from("bets")
    .select("id, game, wager, payout, profit, metadata, created_at")
    .eq("id", betId)
    .eq("player_id", player.id)
    .maybeSingle();

  if (error) throw error;
  return (data as BetRow | null) ?? null;
}
