import {
  ChatInputCommandInteraction,
  MessageFlags,
} from "discord.js";
import { pvpCoinflipEconomics } from "../coinflip/economics.js";
import {
  cancelOpenMatch,
  createPvpMatch,
  joinPvpMatch,
  playHouseCoinflip,
  settlePvpMatch,
} from "../coinflip/matchService.js";
import { listOpenMatches, getMatchByPublicId } from "../db/coinflipMatches.js";
import { settledResultEmbed, settledResultLinks } from "../components/settledResultUi.js";
import { usernameFrom } from "./gameHelpers.js";
import { baseEmbed } from "../embeds/casino.js";

export async function handleCoinflipCommand(
  interaction: ChatInputCommandInteraction
): Promise<void> {
  const sub = interaction.options.getSubcommand(true);
  const guildId = interaction.guildId;
  if (!guildId) {
    await interaction.reply({
      content: "Coinflip duels are guild-only for now.",
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  switch (sub) {
    case "rules":
      await handleRules(interaction);
      break;
    case "open":
      await handleOpen(interaction, guildId);
      break;
    case "create":
      await handleCreate(interaction, guildId);
      break;
    case "join":
      await handleJoin(interaction, guildId);
      break;
    case "cancel":
      await handleCancel(interaction);
      break;
    case "status":
      await handleStatus(interaction);
      break;
    case "bot":
      await handleBot(interaction, guildId);
      break;
    default:
      await interaction.reply({ content: "Unknown coinflip subcommand.", flags: MessageFlags.Ephemeral });
  }
}

async function handleRules(interaction: ChatInputCommandInteraction): Promise<void> {
  const econ = pvpCoinflipEconomics(100);
  await interaction.reply({
    embeds: [
      baseEmbed("Coinflip rules").setDescription(
        [
          "**PvP:** Both stake the same SC (multiples of **10**). Pot = 2× stake.",
          "**Fee:** 5% of pot (not charged twice). Example: 100 + 100 ⇒ pot 200, fee **10**, winner receives **190** SC total (+90 net).",
          "**House 🤖:** 50/50 vs ByteBits dealer; win pays **1.90×** stake.",
          "Per-round seed committed before play; revealed after settlement.",
        ].join("\n")
      ),
    ],
    flags: MessageFlags.Ephemeral,
  });
  void econ;
}

async function handleOpen(interaction: ChatInputCommandInteraction, guildId: string): Promise<void> {
  const rows = await listOpenMatches(guildId, 10);
  if (rows.length === 0) {
    await interaction.reply({ content: "No open PvP matches. Use `/coinflip create`.", flags: MessageFlags.Ephemeral });
    return;
  }
  const lines = rows.map(
    (m) =>
      `**${m.public_id}** · ${m.stake_sc} SC · ${m.creator_side} · fee ${m.fee_sc} · pot ${m.pot_sc} · winner gets ${m.winning_return_sc}`
  );
  await interaction.reply({
    embeds: [baseEmbed("Open matches").setDescription(lines.join("\n"))],
    flags: MessageFlags.Ephemeral,
  });
}

async function handleCreate(interaction: ChatInputCommandInteraction, guildId: string): Promise<void> {
  const amount = interaction.options.getInteger("amount", true);
  const side = interaction.options.getString("side", true) as "heads" | "tails";
  const visibility = (interaction.options.getString("visibility") ?? "public") as "public" | "private";
  const opponent = interaction.options.getUser("opponent");

  try {
    const { match, economics } = await createPvpMatch({
      guildId,
      creatorId: interaction.user.id,
      creatorUsername: usernameFrom(interaction),
      stakeSc: amount,
      side,
      visibility,
      inviteeId: opponent?.id,
    });

    await interaction.reply({
      embeds: [
        baseEmbed("PvP coinflip created").addFields(
          { name: "Match ID", value: `\`${match.public_id}\``, inline: true },
          { name: "Stake", value: `${economics.stakeSc} SC`, inline: true },
          { name: "Your side", value: side, inline: true },
          { name: "Pot", value: `${economics.potSc} SC`, inline: true },
          { name: "Fee (5% pot)", value: `${economics.feeSc} SC`, inline: true },
          { name: "Winner receives", value: `${economics.winningReturnSc} SC`, inline: true },
          { name: "Seed commitment", value: `\`${match.seed_hash.slice(0, 16)}…\`` }
        ),
      ],
      content: opponent ? `<@${opponent.id}> you were challenged!` : "Waiting for `/coinflip join`.",
    });
  } catch (error) {
    await interaction.reply({
      content: error instanceof Error ? error.message : "Could not create match.",
      flags: MessageFlags.Ephemeral,
    });
  }
}

async function handleJoin(interaction: ChatInputCommandInteraction, guildId: string): Promise<void> {
  const matchId = interaction.options.getString("match", true);
  try {
    await joinPvpMatch({
      publicId: matchId,
      joinerId: interaction.user.id,
      joinerUsername: usernameFrom(interaction),
    });
    await interaction.deferReply();
    const result = await settlePvpMatch(matchId);
    const side = (result.match.winner_id === result.match.creator_id ? "creator" : "joiner");
    const embed = settledResultEmbed({
      title: "Coinflip PvP · settled",
      description: `Match \`${matchId}\` · Winner <@${result.match.winner_id}>`,
      won: result.match.winner_id === interaction.user.id,
      proofStatus: "Verifiable",
      roundOpaqueId: result.roundOpaqueId,
      fields: [
        { name: "Pot", value: `${result.match.pot_sc} SC`, inline: true },
        { name: "Fee", value: `${result.match.fee_sc} SC`, inline: true },
        { name: "Return", value: `${result.match.winning_return_sc} SC`, inline: true },
        { name: "Win chance", value: "50% per player", inline: true },
      ],
    });
    await interaction.editReply({
      content: null,
      embeds: [embed],
      components: settledResultLinks(result.roundOpaqueId, "coinflip"),
    });
    void side;
    void guildId;
  } catch (error) {
    await interaction.reply({
      content: error instanceof Error ? error.message : "Join failed.",
      flags: MessageFlags.Ephemeral,
    });
  }
}

async function handleCancel(interaction: ChatInputCommandInteraction): Promise<void> {
  const matchId = interaction.options.getString("match", true);
  try {
    await cancelOpenMatch({
      publicId: matchId,
      requesterId: interaction.user.id,
      username: usernameFrom(interaction),
    });
    await interaction.reply({ content: `Match **${matchId}** cancelled; stake refunded.`, flags: MessageFlags.Ephemeral });
  } catch (error) {
    await interaction.reply({
      content: error instanceof Error ? error.message : "Cancel failed.",
      flags: MessageFlags.Ephemeral,
    });
  }
}

async function handleStatus(interaction: ChatInputCommandInteraction): Promise<void> {
  const matchId = interaction.options.getString("match", true);
  const match = await getMatchByPublicId(matchId);
  if (!match) {
    await interaction.reply({ content: "Match not found.", flags: MessageFlags.Ephemeral });
    return;
  }
  await interaction.reply({
    embeds: [
      baseEmbed("Match status").addFields(
        { name: "ID", value: match.public_id, inline: true },
        { name: "State", value: match.state, inline: true },
        { name: "Mode", value: match.mode, inline: true },
        { name: "Stake", value: `${match.stake_sc}`, inline: true },
        { name: "Commitment", value: `\`${match.seed_hash.slice(0, 16)}…\`` }
      ),
    ],
    flags: MessageFlags.Ephemeral,
  });
}

async function handleBot(interaction: ChatInputCommandInteraction, guildId: string): Promise<void> {
  const amount = interaction.options.getInteger("amount", true);
  const side = interaction.options.getString("side", true) as "heads" | "tails";
  await interaction.reply({ content: "🪙 **ByteBits House Dealer** is flipping…" });
  try {
    const result = await playHouseCoinflip({
      guildId,
      userId: interaction.user.id,
      username: usernameFrom(interaction),
      stakeSc: amount,
      side,
    });
    const embed = settledResultEmbed({
      title: result.won ? "House coinflip · win" : "House coinflip · loss",
      description: `Coin landed **${result.side}** · you picked **${side}** · 🤖 ByteBits House Dealer`,
      won: result.won,
      proofStatus: "Verifiable",
      roundOpaqueId: result.roundOpaqueId,
      fields: [
        { name: "Stake", value: `${amount} SC`, inline: true },
        { name: "Return", value: `${result.payoutSc} SC`, inline: true },
        { name: "Win chance", value: "50%", inline: true },
        { name: "House edge", value: "5% (1.90× payout)", inline: true },
      ],
    });
    await interaction.editReply({
      content: null,
      embeds: [embed],
      components: settledResultLinks(result.roundOpaqueId, "coinflip"),
    });
  } catch (error) {
    await interaction.editReply({
      content: error instanceof Error ? error.message : "House coinflip failed.",
    });
  }
}
