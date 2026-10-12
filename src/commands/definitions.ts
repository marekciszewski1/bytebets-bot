import { SlashCommandBuilder } from "discord.js";

export const commandBuilders = [
  new SlashCommandBuilder()
    .setName("ping")
    .setDescription("Check if the bot is online"),
  new SlashCommandBuilder()
    .setName("help")
    .setDescription("How ByteBets play-money commands work"),
  new SlashCommandBuilder()
    .setName("balance")
    .setDescription("Show your play-money balance and stats"),
  new SlashCommandBuilder()
    .setName("daily")
    .setDescription("Claim free play credits (once every 24 hours)"),
  new SlashCommandBuilder()
    .setName("leaderboard")
    .setDescription("Top players by wagered volume or profit")
    .addStringOption((option) =>
      option
        .setName("metric")
        .setDescription("Rank by total wagered or net profit (PNL)")
        .setRequired(true)
        .addChoices(
          { name: "Wagered", value: "wagered" },
          { name: "Profit (PNL)", value: "profit" }
        )
    ),
  new SlashCommandBuilder()
    .setName("coinflip")
    .setDescription("50/50 coinflip — play money only")
    .addIntegerOption((option) =>
      option
        .setName("amount")
        .setDescription("Credits to wager")
        .setRequired(true)
        .setMinValue(1)
    )
    .addStringOption((option) =>
      option
        .setName("side")
        .setDescription("Heads or tails")
        .setRequired(true)
        .addChoices(
          { name: "Heads", value: "heads" },
          { name: "Tails", value: "tails" }
        )
    ),
  new SlashCommandBuilder()
    .setName("dice")
    .setDescription("Guess the dice roll (1–6) — 5× payout on hit")
    .addIntegerOption((option) =>
      option
        .setName("amount")
        .setDescription("Credits to wager")
        .setRequired(true)
        .setMinValue(1)
    )
    .addIntegerOption((option) =>
      option
        .setName("guess")
        .setDescription("Your guess")
        .setRequired(true)
        .setMinValue(1)
        .setMaxValue(6)
    ),
];

export const commands = commandBuilders.map((c) => c.toJSON());
