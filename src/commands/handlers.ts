import {
  ChatInputCommandInteraction,
  EmbedBuilder,
  MessageFlags,
} from "discord.js";
import {
  claimDaily,
  DailyNotReadyError,
  ensurePlayer,
  fetchLeaderboard,
  InsufficientBalanceError,
  recordBet,
} from "../db/players.js";
import { coinflipPayout, flipCoin, type CoinSide } from "../games/coinflip.js";
import { dicePayout, rollDice } from "../games/dice.js";
import { isSupabaseConfigured } from "../db/supabase.js";

const STARTING_HINT =
  "Play-money only — no real crypto yet. Run `/daily` if you need credits.";

function usernameFrom(interaction: ChatInputCommandInteraction): string {
  return interaction.user.displayName ?? interaction.user.username;
}

function requireDatabase(interaction: ChatInputCommandInteraction): boolean {
  if (isSupabaseConfigured()) return true;
  void interaction.reply({
    content:
      "Database is not configured on the host. Set `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`, then run the SQL migration in `supabase/migrations/`.",
    flags: MessageFlags.Ephemeral,
  });
  return false;
}

export async function handleCommand(
  interaction: ChatInputCommandInteraction
): Promise<void> {
  switch (interaction.commandName) {
    case "ping":
      await handlePing(interaction);
      break;
    case "help":
      await handleHelp(interaction);
      break;
    case "balance":
      await handleBalance(interaction);
      break;
    case "daily":
      await handleDaily(interaction);
      break;
    case "leaderboard":
      await handleLeaderboard(interaction);
      break;
    case "coinflip":
      await handleCoinflip(interaction);
      break;
    case "dice":
      await handleDice(interaction);
      break;
    default:
      await interaction.reply({
        content: "Unknown command.",
        flags: MessageFlags.Ephemeral,
      });
  }
}

async function handlePing(interaction: ChatInputCommandInteraction): Promise<void> {
  const sent = Date.now();
  await interaction.reply("Pong!");
  const latency = Date.now() - sent;
  await interaction.editReply(
    `Pong! Round-trip: ${latency}ms · API: ${Math.round(interaction.client.ws.ping)}ms`
  );
}

async function handleHelp(interaction: ChatInputCommandInteraction): Promise<void> {
  const embed = new EmbedBuilder()
    .setTitle("ByteBets — Discord community (play money)")
    .setDescription(
      [
        "Build the community first with **virtual credits**, leaderboards, and simple games.",
        "",
        "**Economy:** `/balance` · `/daily` · `/leaderboard`",
        "**Games (v1):** `/coinflip` · `/dice`",
        "**Coming next:** mines, crash, roulette, blackjack, baccarat, plinko — then a website + regulated crypto rails if you go that route.",
        "",
        "⚠️ Real-money gambling and branded slots (Sweet Bonanza, etc.) need **licenses and provider deals**. This bot does not include those.",
      ].join("\n")
    )
    .setColor(0x5865f2);

  await interaction.reply({ embeds: [embed] });
}

async function handleBalance(interaction: ChatInputCommandInteraction): Promise<void> {
  if (!requireDatabase(interaction)) return;

  const player = await ensurePlayer(interaction.user.id, usernameFrom(interaction));
  const pnl = player.total_profit;
  const pnlLabel = pnl >= 0 ? `+${pnl}` : `${pnl}`;

  const embed = new EmbedBuilder()
    .setTitle(`${usernameFrom(interaction)} — stats`)
    .addFields(
      { name: "Balance", value: `${player.balance} credits`, inline: true },
      { name: "Total wagered", value: `${player.total_wagered}`, inline: true },
      { name: "PNL (profit)", value: pnlLabel, inline: true }
    )
    .setFooter({ text: STARTING_HINT })
    .setColor(0x57f287);

  await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
}

async function handleDaily(interaction: ChatInputCommandInteraction): Promise<void> {
  if (!requireDatabase(interaction)) return;

  try {
    const { newBalance } = await claimDaily(
      interaction.user.id,
      usernameFrom(interaction)
    );
    await interaction.reply({
      content: `Daily claimed: **+500 credits**. New balance: **${newBalance}**.`,
      flags: MessageFlags.Ephemeral,
    });
  } catch (error) {
    if (error instanceof DailyNotReadyError) {
      await interaction.reply({
        content: "Daily already claimed. Come back in 24 hours.",
        flags: MessageFlags.Ephemeral,
      });
      return;
    }
    throw error;
  }
}

async function handleLeaderboard(interaction: ChatInputCommandInteraction): Promise<void> {
  if (!requireDatabase(interaction)) return;

  const metric = interaction.options.getString("metric", true) as "wagered" | "profit";
  const rows = await fetchLeaderboard(metric, 10);

  if (rows.length === 0) {
    await interaction.reply("No players yet. Use `/daily` or `/coinflip` to get on the board.");
    return;
  }

  const lines = rows.map((row, index) => {
    const value =
      metric === "wagered" ? row.total_wagered : row.total_profit;
    const suffix = metric === "profit" && value > 0 ? " PNL" : "";
    return `**${index + 1}.** ${row.discord_username} — **${value}**${suffix}`;
  });

  const embed = new EmbedBuilder()
    .setTitle(metric === "wagered" ? "Leaderboard — wagered" : "Leaderboard — profit (PNL)")
    .setDescription(lines.join("\n"))
    .setColor(0xfee75c);

  await interaction.reply({ embeds: [embed] });
}

async function handleCoinflip(interaction: ChatInputCommandInteraction): Promise<void> {
  if (!requireDatabase(interaction)) return;

  const amount = interaction.options.getInteger("amount", true);
  const side = interaction.options.getString("side", true) as CoinSide;

  const outcome = flipCoin();
  const won = outcome === side;
  const payout = coinflipPayout(amount, won);

  try {
    const { newBalance, profit } = await recordBet({
      discordId: interaction.user.id,
      username: usernameFrom(interaction),
      game: "coinflip",
      wager: amount,
      payout,
      metadata: { pick: side, outcome, won },
    });

    const embed = new EmbedBuilder()
      .setTitle(won ? "Coinflip — win" : "Coinflip — loss")
      .setDescription(`Coin landed on **${outcome}** (you picked **${side}**).`)
      .addFields(
        { name: "Wager", value: `${amount}`, inline: true },
        { name: "Payout", value: `${payout}`, inline: true },
        { name: "PNL", value: `${profit >= 0 ? "+" : ""}${profit}`, inline: true },
        { name: "Balance", value: `${newBalance}`, inline: true }
      )
      .setColor(won ? 0x57f287 : 0xed4245);

    await interaction.reply({ embeds: [embed] });
  } catch (error) {
    if (error instanceof InsufficientBalanceError) {
      await interaction.reply({
        content: `Not enough credits. Try \`/daily\` or lower the wager. ${STARTING_HINT}`,
        flags: MessageFlags.Ephemeral,
      });
      return;
    }
    throw error;
  }
}

async function handleDice(interaction: ChatInputCommandInteraction): Promise<void> {
  if (!requireDatabase(interaction)) return;

  const amount = interaction.options.getInteger("amount", true);
  const guess = interaction.options.getInteger("guess", true);

  const roll = rollDice();
  const won = roll === guess;
  const payout = dicePayout(amount, won);

  try {
    const { newBalance, profit } = await recordBet({
      discordId: interaction.user.id,
      username: usernameFrom(interaction),
      game: "dice",
      wager: amount,
      payout,
      metadata: { guess, roll, won },
    });

    const embed = new EmbedBuilder()
      .setTitle(won ? "Dice — win" : "Dice — loss")
      .setDescription(`Rolled **${roll}** (you guessed **${guess}**).`)
      .addFields(
        { name: "Wager", value: `${amount}`, inline: true },
        { name: "Payout", value: `${payout}`, inline: true },
        { name: "PNL", value: `${profit >= 0 ? "+" : ""}${profit}`, inline: true },
        { name: "Balance", value: `${newBalance}`, inline: true }
      )
      .setColor(won ? 0x57f287 : 0xed4245);

    await interaction.reply({ embeds: [embed] });
  } catch (error) {
    if (error instanceof InsufficientBalanceError) {
      await interaction.reply({
        content: `Not enough credits. Try \`/daily\` or lower the wager. ${STARTING_HINT}`,
        flags: MessageFlags.Ephemeral,
      });
      return;
    }
    throw error;
  }
}
