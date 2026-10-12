import {
  AttachmentBuilder,
  ChatInputCommandInteraction,
  MessageFlags,
} from "discord.js";
import { fetchBetHistoryExport, fetchRecentBets } from "../db/players.js";
import { baseEmbed } from "../embeds/casino.js";
import { usernameFrom } from "./gameHelpers.js";

const MAX_EXPORT = 200;

export async function handleHistory(interaction: ChatInputCommandInteraction): Promise<void> {
  const sub = interaction.options.getSubcommand(true);

  if (sub === "list") {
    const limit = interaction.options.getInteger("limit") ?? 10;
    const bets = await fetchRecentBets(interaction.user.id, Math.min(limit, 25));

    if (bets.length === 0) {
      await interaction.reply({
        content: "No bets yet. Play a game to build history.",
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    const lines = bets.map((b) => {
      const meta = b.metadata as { server_seed_hash?: string; nonce?: number };
      const hash = meta.server_seed_hash ? meta.server_seed_hash.slice(0, 10) + "…" : "—";
      return [
        `**${b.game}** · \`${b.id}\``,
        `Wager ${b.wager} → payout ${b.payout} (${b.profit >= 0 ? "+" : ""}${b.profit})`,
        `Seed hash \`${hash}\` · nonce ${meta.nonce ?? "?"}`,
      ].join("\n");
    });

    await interaction.reply({
      embeds: [
        baseEmbed("Bet history")
          .setDescription(lines.join("\n\n"))
          .setFooter({ text: "Use /history export for JSON · /verify to replay a bet" }),
      ],
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  if (sub === "export") {
    const limit = Math.min(
      interaction.options.getInteger("limit") ?? MAX_EXPORT,
      MAX_EXPORT
    );
    const rows = await fetchBetHistoryExport(interaction.user.id, limit);

    const payload = {
      exported_at: new Date().toISOString(),
      discord_id: interaction.user.id,
      username: usernameFrom(interaction),
      bet_count: rows.length,
      bets: rows,
    };

    const json = JSON.stringify(payload, null, 2);
    const file = new AttachmentBuilder(Buffer.from(json, "utf8"), {
      name: `bytebits-history-${interaction.user.id.slice(-6)}.json`,
    });

    await interaction.reply({
      content: `Exported **${rows.length}** bet(s). Verify with \`npm run verify:bet\` locally or \`/verify\` in Discord.`,
      files: [file],
      flags: MessageFlags.Ephemeral,
    });
  }
}
