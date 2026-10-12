import { ChatInputCommandInteraction, MessageFlags } from "discord.js";
import { isAdminDiscordUser } from "../config/admin.js";
import {
  adminGrantCredits,
  inspectPlayer,
  InvalidGrantAmountError,
  logAdminAction,
} from "../db/players.js";
import { baseEmbed } from "../embeds/casino.js";

function denyUnlessAdmin(interaction: ChatInputCommandInteraction): boolean {
  if (isAdminDiscordUser(interaction.user.id)) return true;
  void interaction.reply({
    content: "Admin only. Set `ADMIN_DISCORD_IDS` on the bot host to enable.",
    flags: MessageFlags.Ephemeral,
  });
  return false;
}

export async function handleAdmin(interaction: ChatInputCommandInteraction): Promise<void> {
  if (!denyUnlessAdmin(interaction)) return;

  const sub = interaction.options.getSubcommand(true);
  switch (sub) {
    case "grant":
      await handleAdminGrant(interaction);
      break;
    case "inspect":
      await handleAdminInspect(interaction);
      break;
    default:
      await interaction.reply({ content: "Unknown admin subcommand.", flags: MessageFlags.Ephemeral });
  }
}

async function handleAdminGrant(interaction: ChatInputCommandInteraction): Promise<void> {
  const targetId = interaction.options.getString("user_id", true);
  const amount = interaction.options.getInteger("amount", true);

  try {
    const newBalance = await adminGrantCredits({
      targetDiscordId: targetId,
      targetUsername: "admin-grant",
      amount,
    });
    await logAdminAction({
      adminDiscordId: interaction.user.id,
      action: "grant_credits",
      targetDiscordId: targetId,
      payload: { amount, newBalance },
    });
    await interaction.reply({
      content: `Granted **${amount}** credits to \`${targetId}\`. New balance: **${newBalance}**.`,
      flags: MessageFlags.Ephemeral,
    });
  } catch (error) {
    if (error instanceof InvalidGrantAmountError) {
      await interaction.reply({
        content: "Amount must be between 1 and 1,000,000.",
        flags: MessageFlags.Ephemeral,
      });
      return;
    }
    throw error;
  }
}

async function handleAdminInspect(interaction: ChatInputCommandInteraction): Promise<void> {
  const targetId = interaction.options.getString("user_id", true);
  const player = await inspectPlayer(targetId);

  if (!player) {
    await interaction.reply({
      content: "No player row for that Discord ID yet.",
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  await logAdminAction({
    adminDiscordId: interaction.user.id,
    action: "inspect",
    targetDiscordId: targetId,
  });

  const embed = baseEmbed("Admin inspect")
    .addFields(
      { name: "Discord ID", value: targetId },
      { name: "Username", value: player.discord_username },
      { name: "Balance", value: `${player.balance}`, inline: true },
      { name: "Wagered", value: `${player.total_wagered}`, inline: true },
      { name: "PNL", value: `${player.total_profit}`, inline: true },
      { name: "Nonce", value: `${player.nonce}`, inline: true }
    );

  await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
}
