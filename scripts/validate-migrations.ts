import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

const migrationsDir = join(process.cwd(), "supabase/migrations");

const requiredMarkers = [
  "public.players",
  "public.bets",
  "public.fairness_commitments",
  "record_bet",
  "ensure_player",
];

const files = readdirSync(migrationsDir)
  .filter((f) => f.endsWith(".sql"))
  .sort();

if (files.length < 2) {
  console.error("Expected at least 2 migration files (001 + 002 fairness).");
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
