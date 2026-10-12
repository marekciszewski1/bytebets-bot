import { SlashCommandBuilder } from "discord.js";

export const commandBuilders = [
  new SlashCommandBuilder()
    .setName("ping")
    .setDescription("Check if the bot is online"),
  new SlashCommandBuilder()
    .setName("help")
    .setDescription("ByteBits virtual casino overview"),
  new SlashCommandBuilder()
    .setName("play")
    .setDescription("🎰 Open the ByteBits casino lobby and choose a game")
    .addStringOption((o) =>
      o
        .setName("game")
        .setDescription("Jump to a game hub")
        .addChoices(
          { name: "Coinflip", value: "coinflip" },
          { name: "Dice", value: "dice" },
          { name: "Roulette", value: "roulette" },
          { name: "Mines", value: "mines" }
        )
    )
    .addStringOption((o) =>
      o
        .setName("mode")
        .setDescription("Coinflip mode when game=coinflip")
        .addChoices(
          { name: "House dealer", value: "house" },
          { name: "PvP duels", value: "pvp" }
        )
    ),
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
    .setDescription("🪙 Social coinflip — PvP duels or ByteBits House dealer")
    .addSubcommand((sub) =>
      sub
        .setName("create")
        .setDescription("Create a PvP match (stake must be multiple of 10 SC)")
        .addIntegerOption((o) =>
          o.setName("amount").setDescription("Stake per player").setRequired(true).setMinValue(10)
        )
        .addStringOption((o) =>
          o
            .setName("side")
            .setDescription("Your side")
            .setRequired(true)
            .addChoices({ name: "Heads", value: "heads" }, { name: "Tails", value: "tails" })
        )
        .addStringOption((o) =>
          o
            .setName("visibility")
            .addChoices({ name: "Public", value: "public" }, { name: "Private invite", value: "private" })
        )
        .addUserOption((o) => o.setName("opponent").setDescription("Optional invitee for private match"))
    )
    .addSubcommand((sub) =>
      sub.setName("open").setDescription("List open public PvP matches in this server")
    )
    .addSubcommand((sub) =>
      sub
        .setName("join")
        .setDescription("Join an open PvP match")
        .addStringOption((o) => o.setName("match").setDescription("Match ID").setRequired(true))
    )
    .addSubcommand((sub) =>
      sub
        .setName("cancel")
        .setDescription("Cancel your open match and refund escrow")
        .addStringOption((o) => o.setName("match").setDescription("Match ID").setRequired(true))
    )
    .addSubcommand((sub) =>
      sub
        .setName("status")
        .setDescription("View match status")
        .addStringOption((o) => o.setName("match").setDescription("Match ID").setRequired(true))
    )
    .addSubcommand((sub) =>
      sub.setName("rules").setDescription("PvP pot fee and house bot rules")
    )
    .addSubcommand((sub) =>
      sub
        .setName("bot")
        .setDescription("Play vs ByteBits House Dealer 🤖")
        .addIntegerOption((o) =>
          o.setName("amount").setDescription("Stake (multiple of 10 SC)").setRequired(true).setMinValue(10)
        )
        .addStringOption((o) =>
          o
            .setName("side")
            .setRequired(true)
            .addChoices({ name: "Heads", value: "heads" }, { name: "Tails", value: "tails" })
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
