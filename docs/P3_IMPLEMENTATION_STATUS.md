# P3 implementation status

| Feature | Status |
|---------|--------|
| Public fairness website (`/fair/:id`, APIs) | **Implemented** (run with bot or separate port) |
| Per-round seed + proof pages | **Implemented** for coinflip PvP/house |
| PvP coinflip escrow + 5% pot fee | **Implemented** (migration **004** required) |
| House coinflip bot | **Implemented** (`/coinflip bot`) |
| `/play` lobby | **Implemented** (Discord-native UI) |
| Verify link buttons on settled coinflip | **Implemented** |
| Legacy instant `/coinflip amount side` | **Removed** — use `/coinflip bot` |
| Discord Activity animation | **Future** — see `activity/README.md` |
| Full `/fair` slash group | **Partial** — use web + `/verify` |
| All games post-result verify links | **Partial** — coinflip social modes first |
| `npm run setup:server` | **Implemented** |

Apply **`supabase/migrations/004_p3_rounds_coinflip.sql`** and set **`PUBLIC_BASE_URL`** to your deployed fairness site.
