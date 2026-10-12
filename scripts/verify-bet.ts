#!/usr/bin/env tsx
/**
 * Replay-verify a bet from exported JSON or CLI args.
 *
 * Examples:
 *   npm run verify:bet -- --seed YOUR_SERVER_SEED --file ./history.json
 *   npm run verify:bet -- --seed YOUR_SERVER_SEED --bet-id UUID --file ./history.json
 */
import { readFileSync } from "node:fs";
import { verifyBetReplay } from "../src/fairness/verify.js";
import { verifyServerSeed } from "../src/fairness/commitment.js";

function parseArgs(argv: string[]) {
  const args: Record<string, string> = {};
  for (let i = 0; i < argv.length; i++) {
    const key = argv[i];
    if (key.startsWith("--") && argv[i + 1]) {
      args[key.slice(2)] = argv[i + 1];
      i++;
    }
  }
  return args;
}

type ExportFile = {
  bets: Array<{
    id: string;
    game: string;
    metadata: Record<string, unknown>;
  }>;
};

const args = parseArgs(process.argv.slice(2));
const seed = args.seed;
const file = args.file;
const betId = args["bet-id"];

if (!seed || !file) {
  console.error("Usage: verify-bet --seed <server_seed> --file <export.json> [--bet-id <uuid>]");
  process.exit(1);
}

const parsed = JSON.parse(readFileSync(file, "utf8")) as ExportFile;
const bets = parsed.bets ?? [];
const targets = betId ? bets.filter((b) => b.id === betId) : bets.slice(0, 5);

if (targets.length === 0) {
  console.error("No matching bets found.");
  process.exit(1);
}

let failures = 0;
for (const bet of targets) {
  const meta: Record<string, unknown> = { ...bet.metadata, game: bet.game };
  const hash = String(meta.server_seed_hash ?? "");
  if (hash && !verifyServerSeed(seed, hash)) {
    console.log(`❌ ${bet.id} — server seed does not match hash ${hash.slice(0, 12)}…`);
    failures++;
    continue;
  }
  const result = verifyBetReplay(seed, meta as Parameters<typeof verifyBetReplay>[1]);
  if (result.ok) {
    console.log(`✅ ${bet.id} (${bet.game}) — ${result.detail}`);
  } else {
    console.log(`❌ ${bet.id} (${bet.game}) — ${result.reason}`);
    failures++;
  }
}

process.exit(failures > 0 ? 1 : 0);
