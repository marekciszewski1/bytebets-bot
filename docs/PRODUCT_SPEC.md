# ByteBits — Product specification (virtual casino)

## Positioning

Premium **Discord-native** casino experience: purple/black branding, embed-first games, optional Discord Activity (Phase P3). **Play-money only.**

## Core loops

1. **Onboard** — `/daily`, starting balance, `/help`
2. **Play** — four games with transparent odds
3. **Progress** — wagered volume, PNL, leaderboards (P1: VIP cosmetics, challenges)
4. **Trust** — provably fair seeds, `/paytable`, `/verify`

## Games (P0)

| Game | Interaction | Win condition |
|------|-------------|---------------|
| Coinflip | Slash | Match side; ~1.90× payout |
| Dice | Slash | Guess 1–6; ~5.70× payout |
| Mines | Slash + buttons | Reveal safe tiles; cash out or hit mine |
| Roulette | Slash | European wheel; standard color/dozen/single payouts |

## Non-goals (all phases)

- Real-money deposits or withdrawals
- Licensed third-party slot IP clones
- Custodial wallets or KYC in-bot

## Compliance

Virtual credits; Discord Developer Policy; no gambling monetization without legal review. See `docs/FAIRNESS_AND_CURRENCY.md`.
