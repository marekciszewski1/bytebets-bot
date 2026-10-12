import { getSupabase } from "./supabase.js";

export type FairnessCommitmentRow = {
  id: string;
  seed_hash: string;
  server_seed: string | null;
  active: boolean;
  created_at: string;
  revealed_at: string | null;
};

export async function getActiveCommitment(): Promise<FairnessCommitmentRow | null> {
  const supabase = getSupabase();
  const { data, error } = await supabase.rpc("get_active_fairness_commitment");
  if (error) throw error;
  if (!data || (typeof data === "object" && !("seed_hash" in data))) return null;
  return data as FairnessCommitmentRow;
}

export async function activateCommitment(
  seedHash: string,
  serverSeed: string
): Promise<FairnessCommitmentRow> {
  const supabase = getSupabase();
  const { data, error } = await supabase.rpc("activate_fairness_commitment", {
    p_seed_hash: seedHash,
    p_server_seed: serverSeed,
  });
  if (error) throw error;
  return data as FairnessCommitmentRow;
}
