import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  StringSelectMenuBuilder,
} from "discord.js";
import { baseEmbed } from "../embeds/casino.js";
import { COLORS } from "../config/branding.js";

export function casinoLobbyEmbed(): EmbedBuilder {
  return baseEmbed("Casino lobby")
    .setDescription(
      [
        "Welcome to the **ByteBits** floor — play-money only.",
        "",
        "Use the buttons for wallet, rewards, and profile.",
        "Pick a game from the menu to see the slash command to play.",
        "",
        "🎰 Coinflip · 🎲 Dice · 🎡 Roulette · 💣 Mines",
      ].join("\n")
    )
    .setColor(COLORS.primary);
}

export function casinoLobbyComponents(): Array<
  ActionRowBuilder<ButtonBuilder | StringSelectMenuBuilder>
> {
  const row1 = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId("lobby:wallet")
      .setLabel("Wallet")
      .setStyle(ButtonStyle.Primary),
    new ButtonBuilder()
      .setCustomId("lobby:daily")
      .setLabel("Free daily")
      .setStyle(ButtonStyle.Success),
    new ButtonBuilder()
      .setCustomId("lobby:challenge")
      .setLabel("Daily challenge")
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId("lobby:profile")
      .setLabel("Profile")
      .setStyle(ButtonStyle.Secondary)
  );

  const row2 = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId("lobby:leaderboard")
      .setLabel("Leaderboard")
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId("lobby:fairness")
      .setLabel("Fairness")
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId("lobby:paytable")
      .setLabel("Paytable")
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId("lobby:odds")
      .setLabel("Odds")
      .setStyle(ButtonStyle.Secondary)
  );

  const games = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId("lobby:game-select")
      .setPlaceholder("Choose a game")
      .addOptions(
        { label: "Coinflip", value: "coinflip", description: "/coinflip bot or create/join PvP" },
        { label: "Dice", value: "dice", description: "/dice amount guess" },
        { label: "Roulette", value: "roulette", description: "/roulette amount bet" },
        { label: "Mines", value: "mines", description: "/mines start amount mines" }
      )
  );

  return [row1, row2, games];
}

export function profileBadgeSelect(unlockedIds: string[]): ActionRowBuilder<StringSelectMenuBuilder> {
  const menu = new StringSelectMenuBuilder()
    .setCustomId("profile:badge-select")
    .setPlaceholder("Equip badge (cosmetic)")
    .addOptions(
      unlockedIds.map((id) => ({
        label: id,
        value: id,
      }))
    );
  return new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(menu);
}
