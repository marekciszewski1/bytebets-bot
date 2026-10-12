import { getSupabase } from "./supabase.js";

export type PlayerRow = {
  id: string;
  discord_id: string;
  discord_username: string;
  balance: number;
  total_wagered: number;
  total_profit: number;
  last_daily_at: string | null;
};

export type LeaderboardEntry = {
  discord_username: string;
  balance: number;
  total_wagered: number;
  total_profit: number;
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
  return data as PlayerRow;
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
  metadata?: Record<string, unknown>;
}): Promise<{ newBalance: number; profit: number }> {
  const supabase = getSupabase();
  const { data, error } = await supabase.rpc("record_bet", {
    p_discord_id: input.discordId,
    p_discord_username: input.username,
    p_game: input.game,
    p_wager: input.wager,
    p_payout: input.payout,
    p_metadata: input.metadata ?? {},
  });

  if (error) {
    if (error.message.includes("insufficient_balance")) {
      throw new InsufficientBalanceError();
    }
    if (error.message.includes("invalid_wager")) {
      throw new InvalidWagerError();
    }
    throw error;
  }

  const row = Array.isArray(data) ? data[0] : data;
  return {
    newBalance: Number(row.new_balance),
    profit: Number(row.profit),
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
