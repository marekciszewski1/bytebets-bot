import { getSupabase, isSupabaseConfigured } from "./supabase.js";

export type SchemaHealth = {
  ok: boolean;
  checks: { name: string; ok: boolean; detail?: string }[];
};

/** Best-effort probes (safe on production; read-only). */
export async function checkSchemaHealth(): Promise<SchemaHealth> {
  if (!isSupabaseConfigured()) {
    return {
      ok: false,
      checks: [{ name: "supabase_env", ok: false, detail: "SUPABASE_URL / SERVICE_ROLE_KEY missing" }],
    };
  }

  const supabase = getSupabase();
  const checks: SchemaHealth["checks"] = [];

  const { error: playersErr } = await supabase.from("players").select("id").limit(1);
  checks.push({
    name: "001_players",
    ok: !playersErr,
    detail: playersErr?.message,
  });

  const { error: fairRpcErr } = await supabase.rpc("get_active_fairness_commitment");
  checks.push({
    name: "002_fairness_rpc",
    ok: !fairRpcErr,
    detail: fairRpcErr?.message,
  });

  const { error: challengeErr } = await supabase.from("players").select("challenge_day").limit(1);
  checks.push({
    name: "003_challenge_columns",
    ok: !challengeErr,
    detail: challengeErr?.message,
  });

  const { error: roundsErr } = await supabase.from("rounds").select("id").limit(1);
  checks.push({
    name: "004_rounds",
    ok: !roundsErr,
    detail: roundsErr?.message,
  });

  return { ok: checks.every((c) => c.ok), checks };
}
