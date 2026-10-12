# ByteBits Discord Activity (P3 — staging scaffold)

Full animated coinflip (PixiJS/React) belongs here. The bot currently ships a **Discord-native fallback** via `/play` and `/coinflip` embed flows.

## Portal setup (manual)

1. Discord Developer Portal → your app → **Activities**.
2. Point the Activity URL to your hosted bundle (separate deploy from the bot worker).
3. Map Activity entry to the same paytables and per-round proof API as `PUBLIC_BASE_URL`.

## Status

| Item | Status |
|------|--------|
| Bot text/button fallback | **Implemented** |
| Public fairness website | **Implemented** (`FAIRNESS_WEB_PORT`) |
| Activity client bundle | **Future** — implement in this folder |
