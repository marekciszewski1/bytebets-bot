import { ChatInputCommandInteraction } from "discord.js";
import { baseEmbed } from "../embeds/casino.js";
import { formatOddsEmbedDescription } from "../paytables/oddsPublic.js";
import { COLORS } from "../config/branding.js";

export async function handleOdds(interaction: ChatInputCommandInteraction): Promise<void> {
  await interaction.reply({
    embeds: [
      baseEmbed("Public odds & RTP")
        .setDescription(formatOddsEmbedDescription())
        .setColor(COLORS.primary),
    ],
  });
}
