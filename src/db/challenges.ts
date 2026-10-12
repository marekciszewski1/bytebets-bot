import { getSupabase } from "./supabase.js";
import type { PlayerRow } from "./players.js";
import {
  CHALLENGE_TEMPLATES,
  pickDailyChallenge,
  todayUtcDateString,
  type ChallengeTemplate,
} from "../challenges/daily.js";

const CHALLENGE_BY_ID = new Map(CHALLENGE_TEMPLATES.map((t) => [t.id, t]));

export async function syncDailyChallenge(player: PlayerRow): Promise<{
  template: ChallengeTemplate;
  progress: number;
  completed: boolean;
  claimed: boolean;
}> {
  const supabase = getSupabase();
  const today = todayUtcDateString();
  const template = pickDailyChallenge(player.discord_id, today);

  if (player.challenge_day !== today) {
    const { data, error } = await supabase
      .from("players")
      .update({
        challenge_day: today,
        challenge_id: template.id,
        challenge_progress: 0,
        challenge_completed: false,
        challenge_claimed: false,
      })
      .eq("id", player.id)
      .select("*")
      .single();

    if (error) throw error;
    player = data as PlayerRow;
  } else if (!player.challenge_id) {
    await supabase
      .from("players")
      .update({ challenge_id: template.id })
      .eq("id", player.id);
    player.challenge_id = template.id;
  }

  const activeTemplate = CHALLENGE_BY_ID.get(player.challenge_id ?? template.id) ?? template;

  return {
    template: activeTemplate,
    progress: Number(player.challenge_progress ?? 0),
    completed: Boolean(player.challenge_completed),
    claimed: Boolean(player.challenge_claimed),
  };
}

export async function bumpChallengeProgress(input: {
  discordId: string;
  wager: number;
  won: boolean;
}): Promise<void> {
  const supabase = getSupabase();
  const { data: player, error } = await supabase
    .from("players")
    .select("*")
    .eq("discord_id", input.discordId)
    .maybeSingle();

  if (error || !player) return;

  let row = player as PlayerRow;
  const today = todayUtcDateString();

  if (row.challenge_day !== today) {
    const template = pickDailyChallenge(input.discordId, today);
    const { data: updated } = await supabase
      .from("players")
      .update({
        challenge_day: today,
        challenge_id: template.id,
        challenge_progress: 0,
        challenge_completed: false,
        challenge_claimed: false,
      })
      .eq("id", row.id)
      .select("*")
      .single();
    if (updated) row = updated as PlayerRow;
  }

  const template =
    CHALLENGE_BY_ID.get(row.challenge_id ?? "") ??
    pickDailyChallenge(input.discordId, today);
  if (row.challenge_completed) return;

  let delta = 0;
  switch (template.metric) {
    case "wager":
      delta = input.wager;
      break;
    case "wins":
      delta = input.won ? 1 : 0;
      break;
    case "games":
      delta = 1;
      break;
  }

  const nextProgress = Number(row.challenge_progress) + delta;
  const completed = nextProgress >= template.goal;

  await supabase
    .from("players")
    .update({
      challenge_progress: nextProgress,
      challenge_completed: completed,
    })
    .eq("id", row.id);
}

export async function claimChallengeReward(
  discordId: string,
  username: string
): Promise<{ newBalance: number; claimed: boolean }> {
  const supabase = getSupabase();
  const { data, error } = await supabase.rpc("claim_challenge_reward", {
    p_discord_id: discordId,
    p_discord_username: username,
    p_reward: 250,
  });

  if (error) {
    if (error.message.includes("challenge_not_complete")) {
      throw new ChallengeNotCompleteError();
    }
    throw error;
  }

  const row = Array.isArray(data) ? data[0] : data;
  if (!row.claimed) {
    throw new ChallengeAlreadyClaimedError();
  }
  return {
    newBalance: Number(row.new_balance),
    claimed: Boolean(row.claimed),
  };
}

export class ChallengeNotCompleteError extends Error {
  constructor() {
    super("challenge_not_complete");
  }
}

export class ChallengeAlreadyClaimedError extends Error {
  constructor() {
    super("challenge_already_claimed");
  }
}
