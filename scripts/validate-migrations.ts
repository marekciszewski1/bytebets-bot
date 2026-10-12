import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

const migrationsDir = join(process.cwd(), "supabase/migrations");

const requiredMarkers = [
  "public.players",
  "public.bets",
  "public.fairness_commitments",
  "public.mines_sessions",
  "public.admin_actions",
  "record_bet",
  "ensure_player",
  "admin_grant_credits",
  "claim_challenge_reward",
  "public.rounds",
  "public.coinflip_matches",
  "public.escrow_journal",
];

const files = readdirSync(migrationsDir)
  .filter((f) => f.endsWith(".sql"))
  .sort();

if (files.length < 4) {
  console.error("Expected at least 4 migrations (001–004).");
  process.exit(1);
}

const combined = files.map((f) => readFileSync(join(migrationsDir, f), "utf8")).join("\n");

for (const marker of requiredMarkers) {
  if (!combined.includes(marker)) {
    console.error(`Migration check failed: missing marker "${marker}"`);
    process.exit(1);
  }
}

console.log(`Migration check OK (${files.length} files).`);
