import { REST, Routes } from "discord.js";
import { commands } from "./definitions.js";

export async function registerSlashCommands(): Promise<{
  scope: "guild" | "global";
  count: number;
  guildId?: string;
}> {
  const token = process.env.DISCORD_TOKEN;
  const clientId = process.env.DISCORD_CLIENT_ID;
  const guildId = process.env.DISCORD_GUILD_ID;

  if (!token || !clientId) {
    throw new Error("Missing DISCORD_TOKEN or DISCORD_CLIENT_ID for command registration");
  }

  const rest = new REST({ version: "10" }).setToken(token);

  if (guildId) {
    await rest.put(Routes.applicationGuildCommands(clientId, guildId), {
      body: commands,
    });
    return { scope: "guild", count: commands.length, guildId };
  }

  await rest.put(Routes.applicationCommands(clientId), { body: commands });
  return { scope: "global", count: commands.length };
}

export async function fetchRegisteredCommandNames(): Promise<string[]> {
  const token = process.env.DISCORD_TOKEN;
  const clientId = process.env.DISCORD_CLIENT_ID;
  const guildId = process.env.DISCORD_GUILD_ID;
  if (!token || !clientId) return [];

  const rest = new REST({ version: "10" }).setToken(token);
  if (guildId) {
    const data = (await rest.get(Routes.applicationGuildCommands(clientId, guildId))) as {
      name: string;
    }[];
    return data.map((c) => c.name).sort();
  }
  const data = (await rest.get(Routes.applicationCommands(clientId))) as { name: string }[];
  return data.map((c) => c.name).sort();
}
