# ByteBets roadmap (community → product)

## Phase 1 — Discord + cloud (now)

- Host bot 24/7 (Render/Railway/Fly worker, not your laptop)
- Supabase for balances, wagered, PNL, bet history, leaderboards
- Play-money games: coinflip, dice
- `/daily` faucet so new members can play immediately

## Phase 2 — More Discord games

Original mini-games that work well in embeds + buttons:

| Game | Discord fit |
|------|-------------|
| Mines | Grid buttons, strong engagement |
| Crash | Live multiplier message (timer + button to cash out) |
| Roulette | Bet on color/number, spin animation in embed |
| Blackjack | Hit/stand buttons |
| Baccarat | Player/banker/tie choices |
| Plinko | ASCII or simple path animation |
| Dragon tower | Climb floors with risk/reward |

## Phase 3 — Website

- Next.js dashboard: same Supabase data, richer UI, provably-fair seeds
- Discord OAuth login linking website account ↔ Discord ID
- Still play-money until legal review for real stakes

## Phase 4 — Crypto (only with compliance)

Real deposits/withdrawals require, at minimum:

- Legal opinion for your target countries/states
- KYC/AML if handling customer funds
- Custody or payment partner (not raw “paste your wallet” for a casino)
- Discord [Developer Policy](https://discord.com/developers/docs/policies-and-agreements/developer-policy) and gambling rules for your server

**Branded slots** (Sweet Bonanza, Gates of Olympus, physical pinball themes) are third-party IP — you need a **B2B provider contract**, not a clone in Discord.

This repo intentionally ships **play money** so you can grow the community while you decide whether to pursue licensing.
