import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChatInputCommandInteraction,
  StringSelectMenuBuilder,
} from "discord.js";
import { baseEmbed } from "../embeds/casino.js";
import { COLORS } from "../config/branding.js";
import { handleCasinoCommand } from "./lobbyHandlers.js";

export async function handlePlay(interaction: ChatInputCommandInteraction): Promise<void> {
  const game = interaction.options.getString("game");
  const mode = interaction.options.getString("mode");

  if (!game) {
    await interaction.reply({
      embeds: [playLobbyEmbed()],
      components: playLobbyComponents(),
    });
    return;
  }

  if (game === "coinflip") {
    await interaction.reply({
      embeds: [
        baseEmbed("Coinflip").setDescription(
          mode === "house"
            ? "Use **`/coinflip bot`** with amount (×10 SC) and side."
            : [
                "**👥 PvP** — `/coinflip create` · `/coinflip join`",
                "**🤖 House** — `/coinflip bot`",
                "**📜 Rules** — `/coinflip rules`",
              ].join("\n")
        ),
      ],
      components: playCoinflipComponents(),
    });
    return;
  }

  await handleCasinoCommand(interaction);
}

function playLobbyEmbed() {
  return baseEmbed("🎰 ByteBits Casino").setDescription(
    [
      "Neon virtual casino — **free SC only**, provably fair proofs on every round.",
      "",
      "Pick a tile below or use slash commands for duels and house games.",
    ].join("\n")
  ).setColor(COLORS.primary);
}

function playLobbyComponents(): ActionRowBuilder<ButtonBuilder | StringSelectMenuBuilder>[] {
  const row1 = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder().setCustomId("lobby:wallet").setLabel("💳 Wallet").setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId("lobby:daily").setLabel("🎁 Rewards").setStyle(ButtonStyle.Success),
    new ButtonBuilder().setCustomId("lobby:challenge").setLabel("🎯 Daily").setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId("lobby:fairness").setLabel("🛡️ Fairness").setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId("lobby:odds").setLabel("📊 Odds").setStyle(ButtonStyle.Secondary)
  );
  const games = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId("play:game-select")
      .setPlaceholder("🎮 Games")
      .addOptions(
        { label: "Coinflip duels", value: "coinflip", emoji: "🪙" },
        { label: "Dice", value: "dice", emoji: "🎲" },
        { label: "Roulette", value: "roulette", emoji: "🎡" },
        { label: "Mines", value: "mines", emoji: "💣" }
      )
  );
  const duels = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder().setCustomId("play:coinflip:open").setLabel("👥 Open matches").setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId("play:coinflip:house").setLabel("🤖 House dealer").setStyle(ButtonStyle.Secondary)
  );
  return [row1, games, duels];
}

function playCoinflipComponents(): ActionRowBuilder<ButtonBuilder>[] {
  return [
    new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder().setCustomId("play:coinflip:open").setLabel("👥 Open matches").setStyle(ButtonStyle.Primary),
      new ButtonBuilder().setCustomId("play:coinflip:house").setLabel("🤖 House").setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId("play:lobby").setLabel("🏠 Lobby").setStyle(ButtonStyle.Secondary)
    ),
  ];
}

export { playLobbyEmbed, playLobbyComponents };
