import { getSupabase } from "./supabase.js";
import type { MinesSession } from "../games/mines.js";

type MinesRow = {
  id: string;
  discord_id: string;
  wager: number;
  mine_count: number;
  mine_positions: number[];
  revealed: number[];
  nonce: number;
  client_seed: string;
  server_seed_hash: string;
  active: boolean;
};

function rowToSession(row: MinesRow): MinesSession {
  return {
    id: row.id,
    discordId: row.discord_id,
    wager: Number(row.wager),
    mineCount: row.mine_count,
    minePositions: new Set(row.mine_positions),
    revealed: new Set(row.revealed),
    nonce: Number(row.nonce),
    clientSeed: row.client_seed,
    serverSeedHash: row.server_seed_hash,
    cursor: 0,
    active: row.active,
  };
}

export async function insertMinesSession(session: MinesSession): Promise<void> {
  const supabase = getSupabase();
  const { error } = await supabase.from("mines_sessions").insert({
    id: session.id,
    discord_id: session.discordId,
    wager: session.wager,
    mine_count: session.mineCount,
    mine_positions: [...session.minePositions],
    revealed: [...session.revealed],
    nonce: session.nonce,
    client_seed: session.clientSeed,
    server_seed_hash: session.serverSeedHash,
    active: true,
  });
  if (error) throw error;
}

export async function getMinesSessionById(sessionId: string): Promise<MinesSession | null> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("mines_sessions")
    .select("*")
    .eq("id", sessionId)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return rowToSession(data as MinesRow);
}

export async function getActiveMinesSessionForUser(
  discordId: string
): Promise<MinesSession | null> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("mines_sessions")
    .select("*")
    .eq("discord_id", discordId)
    .eq("active", true)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return rowToSession(data as MinesRow);
}

export async function updateMinesSession(session: MinesSession): Promise<void> {
  const supabase = getSupabase();
  const { error } = await supabase
    .from("mines_sessions")
    .update({
      revealed: [...session.revealed],
      active: session.active,
    })
    .eq("id", session.id);
  if (error) throw error;
}

export async function closeMinesSession(sessionId: string): Promise<void> {
  const supabase = getSupabase();
  const { error } = await supabase
    .from("mines_sessions")
    .update({ active: false })
    .eq("id", sessionId);
  if (error) throw error;
}
