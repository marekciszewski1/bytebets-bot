# ByteBits — Cursor master prompt (engineering)

## Product

ByteBits is a **premium Discord virtual casino**: play-money credits only, no real-money deposit, cashout, or financial redemption. Cryptocurrency prices are reference-only display.

## Phases

### P0 — Foundation (current)

**Goal:** Single authoritative sources for odds, payouts, balances, and fairness verification; four hardened games; tests and migrations.

| Acceptance criterion | Requirement |
|---------------------|-------------|
| Paytables | Versioned `v1` module; documented RTP ≈ 95% (4–5% house edge) per game |
| Fairness | Server seed commitment (hash), per-player client seed, monotonic nonce, replay verification |
| Games | Coinflip, dice, mines (buttons), European-style roulette — all use fairness RNG + paytables |
| Bot | Branded purple/black embeds; slash commands for economy, games, fairness, paytable |
| Database | Migration `002` for seeds, nonces, commitments; atomic `record_bet` with nonce check |
| Tests | Unit tests (RNG, paytables, verify); security tests (wager bounds); migration file checks |
| CI | `tsc`, `vitest`, migration validator |

### P1 — Lobby & economy UX

Full slash-command spec: `/casino` lobby, wallet, profile, free rewards, VIP cosmetics (no pay-to-win), leaderboards, daily challenges, admin-safe tools.

### P2 — Provably fair transparency

Public odds page data in bot (`/odds`), bet history export, seed rotation admin flow, replay CLI/script.

### P3 — Discord Activity

Animated Activity: slots, roulette wheel, cards; premium UI; shares same paytables and fairness backend.

### P4 — Reference crypto & deployment

CoinGecko (or similar) reference prices; Discord server layout scripts; production deploy hardening.

## Engineering rules

1. **Do not duplicate odds** — import from `src/paytables/`.
2. **Do not use `Math.random()` for game outcomes** — use `src/fairness/rng.ts`.
3. **All wagers** go through Supabase `record_bet` (or session settle RPC for multi-step games).
4. **No real-money rails** in this repository.

## Commands (P0 subset)

| Command | Purpose |
|---------|---------|
| `/help` | Lobby overview |
| `/balance` | Wallet + stats |
| `/daily` | Free credits |
| `/leaderboard` | Wagered / profit |
| `/coinflip` | Instant game |
| `/dice` | Instant game |
| `/mines` | Start mines session (buttons) |
| `/roulette` | Color / number bet |
| `/fairness` | Active server seed hash + your client seed / nonce |
| `/seed` | Set client seed |
| `/paytable` | Published v1 odds and payouts |
| `/verify` | Replay a bet from stored metadata |
| `/ping` | Health |
