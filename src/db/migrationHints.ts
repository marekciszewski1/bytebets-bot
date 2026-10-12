/** Map common Supabase/Postgres errors to operator-facing migration hints. */

export function migrationHintFromError(error: unknown): string | null {
  const msg =
    error instanceof Error
      ? error.message
      : typeof error === "object" && error && "message" in error
        ? String((error as { message: unknown }).message)
        : String(error);

  const lower = msg.toLowerCase();

  if (
    lower.includes("fairness_commitments") ||
    lower.includes("get_active_fairness_commitment") ||
    lower.includes("activate_fairness_commitment") ||
    lower.includes("nonce_mismatch") ||
    lower.includes("p_expected_nonce")
  ) {
    return "Run Supabase migration **`002_fairness_and_nonce.sql`** (provably fair + nonce on bets).";
  }

  if (
    lower.includes("challenge_day") ||
    lower.includes("challenge_id") ||
    lower.includes("mines_sessions") ||
    lower.includes("equipped_badge")
  ) {
    return "Run Supabase migration **`003_p1_lobby.sql`** (lobby, challenges, mines persistence).";
  }

  if (
    lower.includes("coinflip_matches") ||
    lower.includes("public.rounds") ||
    lower.includes("coinflip_lock_stake") ||
    lower.includes("escrow_journal")
  ) {
    return "Run Supabase migration **`004_p3_rounds_coinflip.sql`** (PvP coinflip + proof rounds).";
  }

  if (lower.includes("migration_002_required")) {
    return "Run Supabase migration **`002_fairness_and_nonce.sql`**, then redeploy.";
  }
  if (lower.includes("migration_003_required")) {
    return "Run Supabase migration **`003_p1_lobby.sql`** for wallet/challenges/profile features.";
  }

  if (lower.includes("insufficient_balance")) {
    return "Not enough credits — try `/daily` or lower your wager.";
  }

  if (lower.includes("could not find the function") || lower.includes("schema cache")) {
    return "Database schema is behind the bot code. Run migrations **001 → 002 → 003** (and **004** if using social coinflip) in Supabase SQL editor.";
  }

  if (lower.includes("invalid api key") || lower.includes("jwt")) {
    return "Check `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` on your bot host.";
  }

  return null;
}

export function userFacingErrorMessage(error: unknown): string {
  const hint = migrationHintFromError(error);
  if (hint) return hint;

  if (process.env.SHOW_ERROR_DETAILS === "true") {
    const msg = error instanceof Error ? error.message : String(error);
    return `Something went wrong: ${msg.slice(0, 300)}`;
  }

  return "Something went wrong running that command. Check bot logs or set SHOW_ERROR_DETAILS=true on the host for details.";
}
