import { randomUUID } from "node:crypto";
import { getSupabase } from "./supabase.js";

export type RoundRow = {
  id: string;
  opaque_id: string;
  guild_id: string | null;
  game: string;
  paytable_version: string;
  proof_status: string;
  server_seed_hash: string;
  server_seed: string | null;
  client_seed_a: string;
  client_seed_b: string;
  nonce: number;
  outcome: Record<string, unknown>;
  stake_sc: number;
  payout_sc: number;
  fee_sc: number;
  metadata: Record<string, unknown>;
  created_at: string;
  settled_at: string | null;
};

export function newOpaqueRoundId(): string {
  return randomUUID().replace(/-/g, "");
}

export async function insertRound(input: {
  opaqueId: string;
  guildId?: string;
  game: string;
  paytableVersion: string;
  serverSeedHash: string;
  clientSeedA: string;
  clientSeedB?: string;
  nonce?: number;
  stakeSc: number;
  metadata?: Record<string, unknown>;
}): Promise<RoundRow> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("rounds")
    .insert({
      opaque_id: input.opaqueId,
      guild_id: input.guildId ?? null,
      game: input.game,
      paytable_version: input.paytableVersion,
      proof_status: "committed",
      server_seed_hash: input.serverSeedHash,
      client_seed_a: input.clientSeedA,
      client_seed_b: input.clientSeedB ?? "",
      nonce: input.nonce ?? 0,
      stake_sc: input.stakeSc,
      metadata: input.metadata ?? {},
    })
    .select("*")
    .single();
  if (error) throw error;
  return data as RoundRow;
}

export async function settleRound(input: {
  opaqueId: string;
  serverSeed: string;
  outcome: Record<string, unknown>;
  payoutSc: number;
  feeSc: number;
  proofStatus?: string;
}): Promise<RoundRow> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("rounds")
    .update({
      server_seed: input.serverSeed,
      outcome: input.outcome,
      payout_sc: input.payoutSc,
      fee_sc: input.feeSc,
      proof_status: input.proofStatus ?? "verifiable",
      settled_at: new Date().toISOString(),
    })
    .eq("opaque_id", input.opaqueId)
    .select("*")
    .single();
  if (error) throw error;
  return data as RoundRow;
}

export async function fetchRoundByOpaqueId(opaqueId: string): Promise<RoundRow | null> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("rounds")
    .select("*")
    .eq("opaque_id", opaqueId)
    .maybeSingle();
  if (error) throw error;
  return (data as RoundRow | null) ?? null;
}
