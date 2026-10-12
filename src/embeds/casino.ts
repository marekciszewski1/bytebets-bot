import { EmbedBuilder } from "discord.js";
import { BRAND_NAME, COLORS, FOOTER_PLAY_MONEY } from "../config/branding.js";

export function baseEmbed(title: string): EmbedBuilder {
  return new EmbedBuilder()
    .setTitle(`${BRAND_NAME} · ${title}`)
    .setColor(COLORS.primary)
    .setFooter({ text: FOOTER_PLAY_MONEY });
}

export function resultEmbed(
  title: string,
  description: string,
  won: boolean | null
): EmbedBuilder {
  const color =
    won === null ? COLORS.primary : won ? COLORS.win : COLORS.loss;
  return baseEmbed(title).setDescription(description).setColor(color);
}
