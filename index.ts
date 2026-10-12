import "dotenv/config";
import { Client, Events, GatewayIntentBits } from "discord.js";
import { handleCommand } from "./commands/handlers.js";
import { isSupabaseConfigured } from "./db/supabase.js";

const token = process.env.DISCORD_TOKEN;

if (!token) {
  console.error("Missing DISCORD_TOKEN in .env (copy .env.example to .env)");
  process.exit(1);
}

if (!isSupabaseConfigured()) {
  console.warn(
    "Warning: SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY not set — economy commands will fail until configured."
  );
}

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

client.once(Events.ClientReady, (readyClient) => {
  console.log(`Logged in as ${readyClient.user.tag}`);
});

client.on(Events.InteractionCreate, async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  try {
    await handleCommand(interaction);
  } catch (error) {
    console.error(error);
    const message = "Something went wrong running that command.";
    if (interaction.replied || interaction.deferred) {
      await interaction.followUp({ content: message, flags: 64 });
    } else {
      await interaction.reply({ content: message, flags: 64 });
    }
  }
});

await client.login(token);
