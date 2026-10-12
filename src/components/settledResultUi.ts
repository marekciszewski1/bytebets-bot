import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
} from "discord.js";
import { getPublicBaseUrl } from "../config/publicUrl.js";
import { COLORS } from "../config/branding.js";

export function settledResultEmbed(input: {
  title: string;
  description: string;
  won: boolean | null;
  fields: { name: string; value: string; inline?: boolean }[];
  proofStatus: string;
  roundOpaqueId: string;
  gameId?: string;
  paytableVersion?: string;
}): EmbedBuilder {
  return new EmbedBuilder()
    .setTitle(input.title)
    .setDescription(input.description)
    .setColor(input.won === null ? COLORS.primary : input.won ? COLORS.win : COLORS.loss)
    .addFields(
      ...input.fields,
      { name: "Proof status", value: input.proofStatus, inline: true },
      { name: "Round ID", value: `\`${input.roundOpaqueId}\``, inline: true }
    );
}

export function settledResultLinks(roundOpaqueId: string, gameId = "coinflip"): ActionRowBuilder<ButtonBuilder>[] {
  const base = getPublicBaseUrl();
  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setLabel("🛡️ Verify Fairness")
      .setStyle(ButtonStyle.Link)
      .setURL(`${base}/fair/${roundOpaqueId}`),
    new ButtonBuilder()
      .setLabel("📊 View Odds")
      .setStyle(ButtonStyle.Link)
      .setURL(`${base}/odds/${gameId}`)
  );
  const nav = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder().setCustomId("lobby:wallet").setLabel("💳 Wallet").setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId("play:lobby").setLabel("🏠 Lobby").setStyle(ButtonStyle.Primary)
  );
  return [row, nav];
}
