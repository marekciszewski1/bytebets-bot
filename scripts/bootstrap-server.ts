/**
 * Idempotent guild layout bootstrap from server/layout.json
 * Requires: DISCORD_TOKEN, DISCORD_GUILD_ID
 */
import "dotenv/config";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  ChannelType,
  Client,
  GatewayIntentBits,
  Guild,
} from "discord.js";

type Layout = {
  serverName: string;
  categories: Array<{
    name: string;
    staffOnly?: boolean;
    channels: Array<{ name: string; topic?: string; readOnly?: boolean; type?: string }>;
  }>;
};

const token = process.env.DISCORD_TOKEN;
const guildId = process.env.DISCORD_GUILD_ID;

if (!token || !guildId) {
  console.error("Set DISCORD_TOKEN and DISCORD_GUILD_ID");
  process.exit(1);
}

const layout = JSON.parse(
  readFileSync(join(process.cwd(), "server/layout.json"), "utf8")
) as Layout;

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

async function ensureCategory(guild: Guild, name: string) {
  const existing = guild.channels.cache.find(
    (c) => c.type === ChannelType.GuildCategory && c.name === name
  );
  if (existing) return existing;
  return guild.channels.create({ name, type: ChannelType.GuildCategory });
}

async function ensureChannel(
  guild: Guild,
  categoryId: string,
  spec: Layout["categories"][0]["channels"][0]
) {
  const existing = guild.channels.cache.find(
    (c) => c.parentId === categoryId && c.name === spec.name
  );
  if (existing) {
    if (spec.topic && "topic" in existing && existing.topic !== spec.topic) {
      await existing.setTopic(spec.topic);
    }
    return existing;
  }
  const type =
    spec.type === "voice" ? ChannelType.GuildVoice : ChannelType.GuildText;
  return guild.channels.create({
    name: spec.name,
    type,
    parent: categoryId,
    topic: spec.topic,
  });
}

client.once("ready", async () => {
  const guild = await client.guilds.fetch(guildId!);
  await guild.channels.fetch();

  for (const cat of layout.categories) {
    const category = await ensureCategory(guild, cat.name);
    for (const ch of cat.channels) {
      const created = await ensureChannel(guild, category.id, ch);
      if (ch.readOnly && created.type === ChannelType.GuildText) {
        await created.permissionOverwrites.edit(guild.roles.everyone, {
          SendMessages: false,
          AddReactions: false,
        });
      }
      if (cat.staffOnly && created.type === ChannelType.GuildText) {
        await created.permissionOverwrites.edit(guild.roles.everyone, {
          ViewChannel: false,
        });
      }
    }
  }

  console.log(`Bootstrap complete for guild ${guild.name} (${guild.id})`);
  process.exit(0);
});

await client.login(token);
