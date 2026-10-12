import "dotenv/config";
import { REST, Routes } from "discord.js";
import { commands } from "./commands/definitions.js";

const token = process.env.DISCORD_TOKEN;
const clientId = process.env.DISCORD_CLIENT_ID;
const guildId = process.env.DISCORD_GUILD_ID;

if (!token || !clientId) {
  console.error(
    "Missing DISCORD_TOKEN or DISCORD_CLIENT_ID in .env (see .env.example)"
  );
  process.exit(1);
}

const rest = new REST({ version: "10" }).setToken(token);

try {
  if (guildId) {
    await rest.put(Routes.applicationGuildCommands(clientId, guildId), {
      body: commands,
    });
    console.log(`Registered ${commands.length} command(s) to guild ${guildId}`);
  } else {
    await rest.put(Routes.applicationCommands(clientId), { body: commands });
    console.log(
      `Registered ${commands.length} global command(s) (may take up to ~1 hour to update)`
    );
  }
} catch (error) {
  console.error(error);
  process.exit(1);
}
