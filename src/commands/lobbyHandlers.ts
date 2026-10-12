import {
  ButtonInteraction,
  ChatInputCommandInteraction,
  MessageFlags,
  StringSelectMenuInteraction,
} from "discord.js";
import {
  claimDaily,
  DailyNotReadyError,
  ensurePlayer,
  fetchLeaderboard,
  fetchRecentBets,
  setEquippedBadge,
} from "../db/players.js";
import {
  ChallengeAlreadyClaimedError,
  ChallengeNotCompleteError,
  claimChallengeReward,
  syncDailyChallenge,
} from "../db/challenges.js";
import { challengeProgressLabel } from "../challenges/daily.js";
import { baseEmbed } from "../embeds/casino.js";
import { PAYTABLE_VERSION, TARGET_RTP, COINFLIP, DICE, MINES, ROULETTE } from "../paytables/v1.js";
import { formatOddsEmbedDescription } from "../paytables/oddsPublic.js";
import { ensureActiveServerSeed } from "../fairness/serverSeed.js";
import { tierForWagered, canUseBadge, COSMETIC_BADGES, VIP_TIERS } from "../vip/tiers.js";
import { casinoLobbyComponents, casinoLobbyEmbed, profileBadgeSelect } from "./lobbyUi.js";
import { usernameFrom } from "./gameHelpers.js";
import { COLORS } from "../config/branding.js";
import { isSupabaseConfigured } from "../db/supabase.js";
import { userFacingErrorMessage } from "../db/migrationHints.js";

export async function handleCasinoCommand(
  interaction: ChatInputCommandInteraction
): Promise<void> {
  await interaction.reply({
    embeds: [casinoLobbyEmbed()],
    components: casinoLobbyComponents(),
  });
}

export async function buildWalletEmbed(discordId: string, username: string) {
  const player = await ensurePlayer(discordId, username);
  const bets = await fetchRecentBets(discordId, 5);
  const pnl = player.total_profit;
  const lines =
    bets.length === 0
      ? "_No bets yet._"
      : bets
          .map(
            (b) =>
              `\`${b.id.slice(0, 8)}…\` **${b.game}** · wager ${b.wager} → payout ${b.payout} (${b.profit >= 0 ? "+" : ""}${b.profit})`
          )
          .join("\n");

  return baseEmbed("Wallet")
    .setColor(COLORS.gold)
    .addFields(
      { name: "Balance", value: `${player.balance}`, inline: true },
      { name: "Wagered", value: `${player.total_wagered}`, inline: true },
      { name: "PNL", value: `${pnl >= 0 ? "+" : ""}${pnl}`, inline: true },
      { name: "Recent bets", value: lines }
    );
}

export async function handleWalletCommand(
  interaction: ChatInputCommandInteraction
): Promise<void> {
  const embed = await buildWalletEmbed(interaction.user.id, usernameFrom(interaction));
  await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
}

export async function buildProfileEmbed(discordId: string, username: string) {
  const player = await ensurePlayer(discordId, username);
  const tier = tierForWagered(player.total_wagered);
  const badge = player.equipped_badge ?? "none";
  const tierIndex = VIP_TIERS.findIndex((t) => t.id === tier.id);
  const next = VIP_TIERS[tierIndex + 1] ?? null;

  return {
    embed: baseEmbed("Player profile")
      .setColor(tier.color)
      .setDescription(`${tier.badge} **${tier.label}** · frame \`${player.equipped_frame ?? "default"}\``)
      .addFields(
        { name: "Badge", value: badge, inline: true },
        { name: "Lifetime wagered", value: `${player.total_wagered}`, inline: true },
        {
          name: "Next tier",
          value: next ? `${next.label} at ${next.minWagered.toLocaleString()} wagered` : "Max tier",
        }
      ),
    tier,
    player,
  };
}

export async function handleProfileCommand(
  interaction: ChatInputCommandInteraction
): Promise<void> {
  const { embed, player } = await buildProfileEmbed(
    interaction.user.id,
    usernameFrom(interaction)
  );
  const unlocked = COSMETIC_BADGES.filter((b) =>
    canUseBadge(player.total_wagered, b.id)
  ).map((b) => b.id);

  await interaction.reply({
    embeds: [embed],
    components: unlocked.length > 1 ? [profileBadgeSelect(unlocked)] : [],
    flags: MessageFlags.Ephemeral,
  });
}

export async function handleChallengeCommand(
  interaction: ChatInputCommandInteraction
): Promise<void> {
  const sub = interaction.options.getSubcommand(false) ?? "view";
  const player = await ensurePlayer(interaction.user.id, usernameFrom(interaction));
  const state = await syncDailyChallenge(player);

  if (sub === "claim") {
    try {
      const { newBalance, claimed } = await claimChallengeReward(
        interaction.user.id,
        usernameFrom(interaction)
      );
      if (!claimed) {
        throw new ChallengeAlreadyClaimedError();
      }
      await interaction.reply({
        content: `Challenge reward claimed! Balance: **${newBalance}** credits.`,
        flags: MessageFlags.Ephemeral,
      });
      return;
    } catch (error) {
      if (error instanceof ChallengeNotCompleteError) {
        await interaction.reply({
          content: "Challenge not finished yet. Check `/challenge view`.",
          flags: MessageFlags.Ephemeral,
        });
        return;
      }
      if (error instanceof ChallengeAlreadyClaimedError) {
        await interaction.reply({
          content: "Today's challenge reward was already claimed.",
          flags: MessageFlags.Ephemeral,
        });
        return;
      }
      throw error;
    }
  }

  const text = challengeProgressLabel(
    state.template,
    state.progress,
    state.completed
  );
  const footer = state.claimed
    ? "Reward already claimed."
    : state.completed
      ? "Use `/challenge claim` to collect credits."
      : "Progress updates when you play.";

  await interaction.reply({
    embeds: [
      baseEmbed("Daily challenge")
        .setDescription(`${text}\n\n${footer}`)
        .setColor(COLORS.primary),
    ],
    flags: MessageFlags.Ephemeral,
  });
}

export async function handleLobbyButton(interaction: ButtonInteraction): Promise<void> {
  if (!isSupabaseConfigured()) {
    await interaction.reply({
      content: "Database not configured on the bot host (Supabase env vars).",
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  const action = interaction.customId.split(":")[1];
  const user = usernameFrom(interaction);

  try {
  switch (action) {
    case "wallet": {
      const embed = await buildWalletEmbed(interaction.user.id, user);
      await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
      break;
    }
    case "daily": {
      try {
        const { newBalance } = await claimDaily(interaction.user.id, user);
        await interaction.reply({
          content: `Daily claimed: **+500** credits. Balance: **${newBalance}**.`,
          flags: MessageFlags.Ephemeral,
        });
      } catch (error) {
        if (error instanceof DailyNotReadyError) {
          await interaction.reply({
            content: "Daily already claimed — come back in 24 hours.",
            flags: MessageFlags.Ephemeral,
          });
          return;
        }
        throw error;
      }
      break;
    }
    case "challenge": {
      const player = await ensurePlayer(interaction.user.id, user);
      const state = await syncDailyChallenge(player);
      const text = challengeProgressLabel(
        state.template,
        state.progress,
        state.completed
      );
      await interaction.reply({
        embeds: [baseEmbed("Daily challenge").setDescription(text)],
        flags: MessageFlags.Ephemeral,
      });
      break;
    }
    case "profile": {
      const { embed, player } = await buildProfileEmbed(interaction.user.id, user);
      const unlocked = COSMETIC_BADGES.filter((b) =>
        canUseBadge(player.total_wagered, b.id)
      ).map((b) => b.id);
      await interaction.reply({
        embeds: [embed],
        components: unlocked.length > 1 ? [profileBadgeSelect(unlocked)] : [],
        flags: MessageFlags.Ephemeral,
      });
      break;
    }
    case "leaderboard": {
      const rows = await fetchLeaderboard("wagered", 5);
      const lines =
        rows.length === 0
          ? "No players yet."
          : rows.map((r, i) => `**${i + 1}.** ${r.discord_username} — ${r.total_wagered}`).join("\n");
      await interaction.reply({
        embeds: [baseEmbed("Leaderboard · wagered").setDescription(lines)],
        flags: MessageFlags.Ephemeral,
      });
      break;
    }
    case "fairness": {
      const player = await ensurePlayer(interaction.user.id, user);
      const active = await ensureActiveServerSeed();
      await interaction.reply({
        embeds: [
          baseEmbed("Fairness").addFields(
            { name: "Server seed hash", value: `\`${active.serverSeedHash}\`` },
            { name: "Client seed", value: `\`${player.client_seed}\``, inline: true },
            { name: "Nonce", value: `${player.nonce}`, inline: true }
          ),
        ],
        flags: MessageFlags.Ephemeral,
      });
      break;
    }
    case "paytable": {
      const lines = [
        `Version \`${PAYTABLE_VERSION}\` · RTP ~${(TARGET_RTP * 100).toFixed(0)}%`,
        COINFLIP.description,
        DICE.description,
        MINES.description,
        ROULETTE.description,
      ].join("\n");
      await interaction.reply({
        embeds: [baseEmbed("Paytable").setDescription(lines)],
        flags: MessageFlags.Ephemeral,
      });
      break;
    }
    case "odds": {
      await interaction.reply({
        embeds: [baseEmbed("Public odds").setDescription(formatOddsEmbedDescription())],
        flags: MessageFlags.Ephemeral,
      });
      break;
    }
    default:
      await interaction.reply({ content: "Unknown lobby action.", flags: MessageFlags.Ephemeral });
  }
  } catch (error) {
    await interaction.reply({
      content: userFacingErrorMessage(error),
      flags: MessageFlags.Ephemeral,
    });
  }
}

export async function handleLobbyGameSelect(
  interaction: StringSelectMenuInteraction
): Promise<void> {
  const game = interaction.values[0];
  const hints: Record<string, string> = {
    coinflip: "Run **`/coinflip`** with `amount` and `side` (heads/tails).",
    dice: "Run **`/dice`** with `amount` and `guess` (1–6).",
    roulette: "Run **`/roulette`** with `amount` and `bet` (red/black/… or single + number).",
    mines: "Run **`/mines start`** with `amount` and `mines` (1–24).",
  };
  await interaction.reply({
    content: hints[game] ?? "Use `/help` for commands.",
    flags: MessageFlags.Ephemeral,
  });
}

export async function handleProfileBadgeSelect(
  interaction: StringSelectMenuInteraction
): Promise<void> {
  const badgeId = interaction.values[0];
  const player = await ensurePlayer(interaction.user.id, usernameFrom(interaction));
  if (!canUseBadge(player.total_wagered, badgeId)) {
    await interaction.reply({
      content: "That badge is locked for your VIP tier.",
      flags: MessageFlags.Ephemeral,
    });
    return;
  }
  await setEquippedBadge(interaction.user.id, usernameFrom(interaction), badgeId);
  await interaction.reply({
    content: `Equipped badge: **${badgeId}** (cosmetic only).`,
    flags: MessageFlags.Ephemeral,
  });
}
