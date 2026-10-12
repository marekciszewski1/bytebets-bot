import "dotenv/config";
import { Client, Events, GatewayIntentBits } from "discord.js";
import { handleCommand } from "./commands/handlers.js";
import { handleMinesButton } from "./commands/minesHandlers.js";
import {
  handleLobbyButton,
  handleLobbyGameSelect,
  handleProfileBadgeSelect,
} from "./commands/lobbyHandlers.js";
import { isSupabaseConfigured } from "./db/supabase.js";
import { ensureActiveServerSeed } from "./fairness/serverSeed.js";
import { startFairnessWebServer } from "./web/server.js";

const token = process.env.DISCORD_TOKEN;

if (!token) {
  console.error("Missing DISCORD_TOKEN in .env (copy .env.example to .env)");
  process.exit(1);
}

if (!isSupabaseConfigured()) {
  console.warn(
    "Warning: SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY not set — economy commands will fail until configured."
  );
} else {
  try {
    const seed = await ensureActiveServerSeed();
    console.log(`Fairness commitment active: ${seed.serverSeedHash.slice(0, 12)}…`);
  } catch (error) {
    console.error("Failed to initialize fairness commitment:", error);
  }
}

if (process.env.FAIRNESS_WEB_ENABLED !== "false") {
  startFairnessWebServer();
}

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

client.once(Events.ClientReady, (readyClient) => {
  console.log(`Logged in as ${readyClient.user.tag}`);
});

client.on(Events.InteractionCreate, async (interaction) => {
  try {
    if (interaction.isChatInputCommand()) {
      await handleCommand(interaction);
      return;
    }

    if (interaction.isButton()) {
      if (interaction.customId.startsWith("mines:")) {
        await handleMinesButton(interaction);
        return;
      }
      if (interaction.customId.startsWith("lobby:")) {
        await handleLobbyButton(interaction);
        return;
      }
      if (interaction.customId.startsWith("play:")) {
        if (interaction.customId === "play:lobby") {
          await interaction.reply({
            content: "Use **`/play`** for the full casino lobby.",
            flags: 64,
          });
          return;
        }
        if (interaction.customId === "play:coinflip:open") {
          await interaction.reply({
            content: "Use **`/coinflip open`** and **`/coinflip join match:<id>`**.",
            flags: 64,
          });
          return;
        }
        if (interaction.customId === "play:coinflip:house") {
          await interaction.reply({
            content: "Use **`/coinflip bot`** with amount (×10 SC) and side.",
            flags: 64,
          });
          return;
        }
      }
    }

    if (interaction.isStringSelectMenu()) {
      if (interaction.customId === "lobby:game-select") {
        await handleLobbyGameSelect(interaction);
        return;
      }
      if (interaction.customId === "profile:badge-select") {
        await handleProfileBadgeSelect(interaction);
        return;
      }
    }
  } catch (error) {
    console.error(error);
    const message = "Something went wrong running that command.";
    if (interaction.isRepliable()) {
      if (interaction.replied || interaction.deferred) {
        await interaction.followUp({ content: message, flags: 64 });
      } else {
        await interaction.reply({ content: message, flags: 64 });
      }
    }
  }
});

await client.login(token);
