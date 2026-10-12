# Put this bot on GitHub (Windows, no Cursor Origin)

## 1. Download the zip

From this agent run, download **`bytebets-discord-bot-github.zip`**.

## 2. Unzip

Extract to a folder, e.g. `C:\Users\You\Documents\bytebets-discord-bot`

## 3. Install GitHub Desktop

https://desktop.github.com/

Sign in with **marekciszewski**.

## 4. Publish to GitHub

1. **File → Add local repository**
2. Choose the unzipped folder
3. If it says “not a git repo”, click **create a repository** here (init git)
4. **Publish repository**
   - Name: `discord-bot`
   - Keep private if you want
   - **Publish**

Your code is now on **github.com/marekciszewski/discord-bot** — not Cursor Origin.

## 5. Render

1. Render dashboard → your worker → connect repo **discord-bot**, branch **main**
2. Env vars: `DISCORD_TOKEN`, `DISCORD_CLIENT_ID`, `DISCORD_GUILD_ID`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`
3. **Manual Deploy**

## 6. Supabase (once)

Run `supabase/migrations/001_bytebets_core.sql` in Supabase SQL Editor if you have not already.
