# ByteBits — Discord virtual casino

Premium **play-money** casino bot for Discord: provably fair outcomes, published paytables (~95% RTP on even-chance games), four games, Supabase economy, 24/7 worker deploy.

> **Not real money.** Credits are virtual. No deposits, cashouts, or redemption. See [docs/FAIRNESS_AND_CURRENCY.md](docs/FAIRNESS_AND_CURRENCY.md).

## Architecture

```mermaid
flowchart LR
  Discord[Discord users] --> Bot[Node bot worker]
  Bot --> Supabase[(Supabase Postgres)]
  GitHub[GitHub repo] --> Bot
```

## Quick start

1. [Discord Developer Portal](https://discord.com/developers/applications) — bot token, `applications.commands` scope.
2. Supabase — run migrations in order:
   - [supabase/migrations/001_bytebets_core.sql](supabase/migrations/001_bytebets_core.sql)
   - [supabase/migrations/002_fairness_and_nonce.sql](supabase/migrations/002_fairness_and_nonce.sql)
   - [supabase/migrations/003_p1_lobby.sql](supabase/migrations/003_p1_lobby.sql)
3. Copy `.env.example` → `.env` and fill Discord + Supabase vars.
4. `npm install && npm run register-commands && npm run dev`

## Resend / Render deploy (slash commands)

Many hosts **do not** pass `DISCORD_TOKEN` to the **build** step, so `npm run register-commands` in build silently never runs.

**Fix (default in this repo):** set runtime env vars on the worker:

- `DISCORD_TOKEN`, `DISCORD_CLIENT_ID`, **`DISCORD_GUILD_ID`** (your server ID)
- `REGISTER_COMMANDS_ON_START=true` (default — registers all commands when the bot boots)

After redeploy, run **`/ping`**. It lists how many slash commands Discord has for that guild and warns if `casino` is missing.

Re-invite the bot with **`applications.commands`** scope if commands stay empty.

## Commands (P0 + P1)

| Command | Description |
|---------|-------------|
| `/casino` | Interactive lobby (buttons + game menu) |
| `/wallet` | Balance + recent bets |
| `/profile` | VIP tier + badge cosmetics |
| `/challenge` | Daily challenge view / claim |
| `/admin` | Grant credits / inspect (env allowlist) |
| `/help` | Lobby overview |
| `/balance` | Credits, wagered, PNL |
| `/daily` | +500 credits / 24h |
| `/leaderboard` | Wagered or profit |
| `/fairness` | Server seed hash + your client seed / nonce |
| `/seed` | Set client seed |
| `/paytable` | Published v1 odds |
| `/odds` | Win probabilities and theoretical RTP |
| `/fairness active` / `revealed` | Active hash or archived seeds |
| `/history list` / `export` | Bet history + JSON for offline verify |
| `/verify` | Replay-verify a bet with revealed server seed |
| `/admin rotate-seed` | Reveal seed & rotate commitment (allowlist) |
| `/coinflip` | ~1.90× on win |
| `/dice` | ~5.70× on win |
| `/roulette` | European wheel |
| `/mines start` | Interactive 5×5 grid |
| `/ping` | Health |

## Development

```bash
npm run typecheck
npm run check:migrations
npm test
npm run verify:bet -- --seed YOUR_SEED --file ./export.json
```

Engineering phases and acceptance criteria: [CURSOR_MASTER_PROMPT.md](CURSOR_MASTER_PROMPT.md).

## Deploy (Render)

Use [render.yaml](render.yaml): build runs `npm install && npm run register-commands`, start `npm start`.

## Roadmap

- **P1** — Full lobby UX, VIP cosmetics, challenges, admin tools  
- **P3** — Discord Activity (slots, animated roulette)  
- **P4** — Reference crypto prices, server layout scripts  

See [docs/ROADMAP.md](docs/ROADMAP.md) and [docs/PRODUCT_SPEC.md](docs/PRODUCT_SPEC.md).
