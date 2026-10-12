import { SlashCommandBuilder } from "discord.js";

export const commandBuilders = [
  new SlashCommandBuilder()
    .setName("ping")
    .setDescription("Check if the bot is online"),
  new SlashCommandBuilder()
    .setName("help")
    .setDescription("ByteBits virtual casino overview"),
  new SlashCommandBuilder()
    .setName("casino")
    .setDescription("Open the casino lobby (buttons and game menu)"),
  new SlashCommandBuilder()
    .setName("wallet")
    .setDescription("Wallet balance and recent bets"),
  new SlashCommandBuilder()
    .setName("profile")
    .setDescription("VIP tier and cosmetic badge"),
  new SlashCommandBuilder()
    .setName("challenge")
    .setDescription("Daily challenge progress and rewards")
    .addSubcommand((sub) =>
      sub.setName("view").setDescription("View today's challenge")
    )
    .addSubcommand((sub) =>
      sub.setName("claim").setDescription("Claim completed challenge reward")
    ),
  new SlashCommandBuilder()
    .setName("admin")
    .setDescription("Safe admin tools (host-configured IDs only)")
    .addSubcommand((sub) =>
      sub
        .setName("grant")
        .setDescription("Grant play-money credits to a user")
        .addStringOption((o) =>
          o.setName("user_id").setDescription("Target Discord user ID").setRequired(true)
        )
        .addIntegerOption((o) =>
          o
            .setName("amount")
            .setDescription("Credits to grant (1–1,000,000)")
            .setRequired(true)
            .setMinValue(1)
            .setMaxValue(1_000_000)
        )
    )
    .addSubcommand((sub) =>
      sub
        .setName("inspect")
        .setDescription("Inspect a player record")
        .addStringOption((o) =>
          o.setName("user_id").setDescription("Target Discord user ID").setRequired(true)
        )
    )
    .addSubcommand((sub) =>
      sub
        .setName("rotate-seed")
        .setDescription("Reveal current server seed and activate a new commitment")
    ),
  new SlashCommandBuilder()
    .setName("balance")
    .setDescription("Show your credits, wagered volume, and PNL"),
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
    .setName("fairness")
    .setDescription("Provably fair seeds and commitment archive")
    .addSubcommand((sub) =>
      sub.setName("active").setDescription("Active server seed hash and your client seed")
    )
    .addSubcommand((sub) =>
      sub.setName("revealed").setDescription("Recently revealed server seeds for verification")
    ),
  new SlashCommandBuilder()
    .setName("odds")
    .setDescription("Public win probabilities, payouts, and theoretical RTP"),
  new SlashCommandBuilder()
    .setName("history")
    .setDescription("Your bet history and provably fair export")
    .addSubcommand((sub) =>
      sub
        .setName("list")
        .setDescription("List recent bets with verification hints")
        .addIntegerOption((o) =>
          o
            .setName("limit")
            .setDescription("Number of bets (max 25)")
            .setMinValue(1)
            .setMaxValue(25)
        )
    )
    .addSubcommand((sub) =>
      sub
        .setName("export")
        .setDescription("Download JSON export for offline verification")
        .addIntegerOption((o) =>
          o
            .setName("limit")
            .setDescription("Max bets in file (max 200)")
            .setMinValue(1)
            .setMaxValue(200)
        )
    ),
  new SlashCommandBuilder()
    .setName("seed")
    .setDescription("Set your client seed (max 64 characters)")
    .addStringOption((option) =>
      option
        .setName("value")
        .setDescription("Your client seed")
        .setRequired(true)
        .setMaxLength(64)
        .setMinLength(1)
    ),
  new SlashCommandBuilder()
    .setName("paytable")
    .setDescription("Published odds, payouts, and paytable version"),
  new SlashCommandBuilder()
    .setName("verify")
    .setDescription("Replay-verify a past bet (requires revealed server seed)")
    .addStringOption((option) =>
      option.setName("bet_id").setDescription("Bet UUID from history").setRequired(true)
    )
    .addStringOption((option) =>
      option
        .setName("server_seed")
        .setDescription("Revealed server seed matching the bet hash")
        .setRequired(true)
    ),
  new SlashCommandBuilder()
    .setName("coinflip")
    .setDescription("Provably fair coinflip (~1.90× on win)")
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
    .setDescription("Guess 1–6 (~5.70× on win)")
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
  new SlashCommandBuilder()
    .setName("roulette")
    .setDescription("European roulette (0–36)")
    .addIntegerOption((option) =>
      option
        .setName("amount")
        .setDescription("Credits to wager")
        .setRequired(true)
        .setMinValue(1)
    )
    .addStringOption((option) =>
      option
        .setName("bet")
        .setDescription("Bet type")
        .setRequired(true)
        .addChoices(
          { name: "Red", value: "red" },
          { name: "Black", value: "black" },
          { name: "Odd", value: "odd" },
          { name: "Even", value: "even" },
          { name: "Low (1–18)", value: "low" },
          { name: "High (19–36)", value: "high" },
          { name: "Single number", value: "single" }
        )
    )
    .addIntegerOption((option) =>
      option
        .setName("number")
        .setDescription("Required for single-number bets (0–36)")
        .setMinValue(0)
        .setMaxValue(36)
    ),
  new SlashCommandBuilder()
    .setName("mines")
    .setDescription("Mines — reveal tiles or cash out")
    .addSubcommand((sub) =>
      sub
        .setName("start")
        .setDescription("Start a mines game")
        .addIntegerOption((option) =>
          option
            .setName("amount")
            .setDescription("Credits to wager")
            .setRequired(true)
            .setMinValue(1)
        )
        .addIntegerOption((option) =>
          option
            .setName("mines")
            .setDescription("Number of mines (1–24)")
            .setRequired(true)
            .setMinValue(1)
            .setMaxValue(24)
        )
    ),
];

export const commands = commandBuilders.map((c) => c.toJSON());
