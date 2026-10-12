import {
  ChatInputCommandInteraction,
  MessageFlags,
} from "discord.js";
import {
  claimDaily,
  DailyNotReadyError,
  ensurePlayer,
  fetchBetById,
  fetchLeaderboard,
  InsufficientBalanceError,
  InvalidClientSeedError,
  setClientSeed,
} from "../db/players.js";
import { coinflipPayout, flipCoinFair, type CoinSide } from "../games/coinflip.js";
import { dicePayout, rollDiceFair } from "../games/dice.js";
import {
  evaluateRouletteBet,
  pocketColor,
  roulettePayout,
  spinRouletteFair,
  type RouletteBetType,
} from "../games/roulette.js";
import { isSupabaseConfigured } from "../db/supabase.js";
import { baseEmbed, resultEmbed } from "../embeds/casino.js";
import {
  ALL_GAMES,
  COINFLIP,
  DICE,
  MINES,
  PAYTABLE_VERSION,
  ROULETTE,
  TARGET_RTP,
} from "../paytables/v1.js";
import { verifyBetReplay } from "../fairness/verify.js";
import { verifyServerSeed } from "../fairness/commitment.js";
import {
  baseFairMetadata,
  prepareFairPlay,
  recordBetAndTrack,
  usernameFrom,
} from "./gameHelpers.js";
import { ensureActiveServerSeed } from "../fairness/serverSeed.js";
import { handleMinesStart } from "./minesHandlers.js";
import { COLORS } from "../config/branding.js";
import {
  handleCasinoCommand,
  handleChallengeCommand,
  handleProfileCommand,
  handleWalletCommand,
} from "./lobbyHandlers.js";
import { handleAdmin } from "./adminHandlers.js";

const STARTING_HINT =
  "Play-money only · `/daily` for free credits · `/paytable` for odds";

function requireDatabase(interaction: ChatInputCommandInteraction): boolean {
  if (isSupabaseConfigured()) return true;
  void interaction.reply({
    content:
      "Database is not configured. Set `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`, then run migrations in `supabase/migrations/`.",
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
    case "casino":
      if (!requireDatabase(interaction)) return;
      await handleCasinoCommand(interaction);
      break;
    case "wallet":
      if (!requireDatabase(interaction)) return;
      await handleWalletCommand(interaction);
      break;
    case "profile":
      if (!requireDatabase(interaction)) return;
      await handleProfileCommand(interaction);
      break;
    case "challenge":
      if (!requireDatabase(interaction)) return;
      await handleChallengeCommand(interaction);
      break;
    case "admin":
      if (!requireDatabase(interaction)) return;
      await handleAdmin(interaction);
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
    case "fairness":
      await handleFairness(interaction);
      break;
    case "seed":
      await handleSeed(interaction);
      break;
    case "paytable":
      await handlePaytable(interaction);
      break;
    case "verify":
      await handleVerify(interaction);
      break;
    case "coinflip":
      await handleCoinflip(interaction);
      break;
    case "dice":
      await handleDice(interaction);
      break;
    case "roulette":
      await handleRoulette(interaction);
      break;
    case "mines":
      await handleMines(interaction);
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
  const embed = baseEmbed("Casino lobby")
    .setDescription(
      [
        "Premium **virtual** casino for Discord — provably fair, published paytables.",
        "",
        "**Lobby:** `/casino` · `/wallet` · `/profile` · `/challenge`",
        "**Wallet:** `/balance` · `/daily` · `/leaderboard`",
        "**Fairness:** `/fairness` · `/seed` · `/paytable` · `/verify`",
        "**Games:** `/coinflip` · `/dice` · `/roulette` · `/mines start`",
        "",
        "No real-money deposits, cashouts, or redemption.",
      ].join("\n")
    )
    .setColor(COLORS.primary);

  await interaction.reply({ embeds: [embed] });
}

async function handleBalance(interaction: ChatInputCommandInteraction): Promise<void> {
  if (!requireDatabase(interaction)) return;

  const player = await ensurePlayer(interaction.user.id, usernameFrom(interaction));
  const pnl = player.total_profit;
  const pnlLabel = pnl >= 0 ? `+${pnl}` : `${pnl}`;

  const embed = baseEmbed("Wallet")
    .addFields(
      { name: "Balance", value: `${player.balance} credits`, inline: true },
      { name: "Total wagered", value: `${player.total_wagered}`, inline: true },
      { name: "PNL", value: pnlLabel, inline: true },
      { name: "Next bet nonce", value: `${player.nonce}`, inline: true }
    )
    .setColor(COLORS.gold);

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
    await interaction.reply("No players yet. Use `/daily` or play a game to appear.");
    return;
  }

  const lines = rows.map((row, index) => {
    const value = metric === "wagered" ? row.total_wagered : row.total_profit;
    return `**${index + 1}.** ${row.discord_username} — **${value}**`;
  });

  const embed = baseEmbed(
    metric === "wagered" ? "Leaderboard · wagered" : "Leaderboard · profit"
  )
    .setDescription(lines.join("\n"))
    .setColor(COLORS.gold);

  await interaction.reply({ embeds: [embed] });
}

async function handleFairness(interaction: ChatInputCommandInteraction): Promise<void> {
  if (!requireDatabase(interaction)) return;

  const player = await ensurePlayer(interaction.user.id, usernameFrom(interaction));
  const active = await ensureActiveServerSeed();

  const embed = baseEmbed("Provably fair")
    .addFields(
      {
        name: "Active server seed hash",
        value: `\`${active.serverSeedHash}\``,
      },
      { name: "Your client seed", value: `\`${player.client_seed || interaction.user.id}\``, inline: true },
      { name: "Next nonce", value: `${player.nonce}`, inline: true },
      {
        name: "Paytable",
        value: `\`${PAYTABLE_VERSION}\` · target RTP ${(TARGET_RTP * 100).toFixed(0)}%`,
      }
    )
    .setDescription(
      "Outcomes use HMAC-SHA256(server_seed, client_seed:nonce:cursor). The server seed stays secret until rotation; the hash commits in advance."
    );

  await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
}

async function handleSeed(interaction: ChatInputCommandInteraction): Promise<void> {
  if (!requireDatabase(interaction)) return;

  const value = interaction.options.getString("value", true);
  try {
    const player = await setClientSeed(
      interaction.user.id,
      usernameFrom(interaction),
      value
    );
    await interaction.reply({
      content: `Client seed updated to \`${player.client_seed}\`. Applies to your next bet.`,
      flags: MessageFlags.Ephemeral,
    });
  } catch (error) {
    if (error instanceof InvalidClientSeedError) {
      await interaction.reply({
        content: "Invalid client seed (1–64 characters required).",
        flags: MessageFlags.Ephemeral,
      });
      return;
    }
    throw error;
  }
}

async function handlePaytable(interaction: ChatInputCommandInteraction): Promise<void> {
  const lines = [
    `**Version:** \`${PAYTABLE_VERSION}\` · **Target RTP:** ~${(TARGET_RTP * 100).toFixed(0)}% on even-chance games`,
    "",
    `**Coinflip** — ${COINFLIP.description}`,
    `**Dice** — ${DICE.description}`,
    `**Mines** — ${MINES.description}`,
    `**Roulette** — ${ROULETTE.description} · single straight-up **${ROULETTE.singlePayout}×** · even-money **${ROULETTE.colorPayout}×**`,
  ];

  await interaction.reply({
    embeds: [baseEmbed("Published paytable").setDescription(lines.join("\n"))],
  });
}

async function handleVerify(interaction: ChatInputCommandInteraction): Promise<void> {
  if (!requireDatabase(interaction)) return;

  const betId = interaction.options.getString("bet_id", true);
  const serverSeed = interaction.options.getString("server_seed", true);
  const bet = await fetchBetById(interaction.user.id, betId);

  if (!bet) {
    await interaction.reply({
      content: "Bet not found for your account.",
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  const meta = bet.metadata as Record<string, unknown>;
  const hash = String(meta.server_seed_hash ?? "");
  if (!verifyServerSeed(serverSeed, hash)) {
    await interaction.reply({
      content: "Server seed does not match the bet's committed hash.",
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  const result = verifyBetReplay(serverSeed, meta as Parameters<typeof verifyBetReplay>[1]);
  const embed = baseEmbed("Verify bet").addFields(
    { name: "Bet ID", value: betId },
    { name: "Game", value: bet.game },
    {
      name: "Result",
      value: result.ok ? `✅ ${result.detail}` : `❌ ${result.reason}`,
    }
  );

  await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
}

async function handleCoinflip(interaction: ChatInputCommandInteraction): Promise<void> {
  if (!requireDatabase(interaction)) return;

  const amount = interaction.options.getInteger("amount", true);
  const side = interaction.options.getString("side", true) as CoinSide;
  const ctx = await prepareFairPlay(interaction);

  const { outcome, digest } = flipCoinFair(
    ctx.serverSeed,
    ctx.clientSeed,
    ctx.nonce,
    0
  );
  const won = outcome === side;
  const payout = coinflipPayout(amount, won);

  try {
    const { newBalance, profit } = await recordBetAndTrack({
      discordId: interaction.user.id,
      username: usernameFrom(interaction),
      game: "coinflip",
      wager: amount,
      payout,
      expectedNonce: ctx.nonce,
      won,
      metadata: {
        ...baseFairMetadata({
          serverSeedHash: ctx.serverSeedHash,
          clientSeed: ctx.clientSeed,
          nonce: ctx.nonce,
          game: "coinflip",
          digest,
        }),
        pick: side,
        outcome,
        won,
      },
    });

    const embed = resultEmbed(
      won ? "Coinflip · win" : "Coinflip · loss",
      `Landed **${outcome}** · you picked **${side}** · ${COINFLIP.winMultiplier}× on win`,
      won
    ).addFields(
      { name: "Wager", value: `${amount}`, inline: true },
      { name: "Payout", value: `${payout}`, inline: true },
      { name: "PNL", value: `${profit >= 0 ? "+" : ""}${profit}`, inline: true },
      { name: "Balance", value: `${newBalance}`, inline: true }
    );

    await interaction.reply({ embeds: [embed] });
  } catch (error) {
    if (error instanceof InsufficientBalanceError) {
      await interaction.reply({
        content: `Not enough credits. ${STARTING_HINT}`,
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
  const ctx = await prepareFairPlay(interaction);

  const { roll, digest } = rollDiceFair(ctx.serverSeed, ctx.clientSeed, ctx.nonce, 0);
  const won = roll === guess;
  const payout = dicePayout(amount, won);

  try {
    const { newBalance, profit } = await recordBetAndTrack({
      discordId: interaction.user.id,
      username: usernameFrom(interaction),
      game: "dice",
      wager: amount,
      payout,
      expectedNonce: ctx.nonce,
      won,
      metadata: {
        ...baseFairMetadata({
          serverSeedHash: ctx.serverSeedHash,
          clientSeed: ctx.clientSeed,
          nonce: ctx.nonce,
          game: "dice",
          digest,
        }),
        guess,
        roll,
        won,
      },
    });

    const embed = resultEmbed(
      won ? "Dice · win" : "Dice · loss",
      `Rolled **${roll}** · guess **${guess}** · ${DICE.winMultiplier}× on win`,
      won
    ).addFields(
      { name: "Wager", value: `${amount}`, inline: true },
      { name: "Payout", value: `${payout}`, inline: true },
      { name: "PNL", value: `${profit >= 0 ? "+" : ""}${profit}`, inline: true },
      { name: "Balance", value: `${newBalance}`, inline: true }
    );

    await interaction.reply({ embeds: [embed] });
  } catch (error) {
    if (error instanceof InsufficientBalanceError) {
      await interaction.reply({
        content: `Not enough credits. ${STARTING_HINT}`,
        flags: MessageFlags.Ephemeral,
      });
      return;
    }
    throw error;
  }
}

async function handleRoulette(interaction: ChatInputCommandInteraction): Promise<void> {
  if (!requireDatabase(interaction)) return;

  const amount = interaction.options.getInteger("amount", true);
  const betType = interaction.options.getString("bet", true) as RouletteBetType;
  const number = interaction.options.getInteger("number");

  if (betType === "single" && number === null) {
    await interaction.reply({
      content: "Single bets require the `number` option (0–36).",
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  const ctx = await prepareFairPlay(interaction);
  const { pocket, digest } = spinRouletteFair(
    ctx.serverSeed,
    ctx.clientSeed,
    ctx.nonce,
    0
  );
  const won = evaluateRouletteBet(
    betType,
    pocket,
    betType === "single" ? (number ?? undefined) : undefined
  );
  const payout = roulettePayout(amount, betType, won, pocket);

  try {
    const { newBalance, profit } = await recordBetAndTrack({
      discordId: interaction.user.id,
      username: usernameFrom(interaction),
      game: "roulette",
      wager: amount,
      payout,
      expectedNonce: ctx.nonce,
      won,
      metadata: {
        ...baseFairMetadata({
          serverSeedHash: ctx.serverSeedHash,
          clientSeed: ctx.clientSeed,
          nonce: ctx.nonce,
          game: "roulette",
          digest,
        }),
        bet_type: betType,
        number: betType === "single" ? number : undefined,
        pocket,
        color: pocketColor(pocket),
        won,
      },
    });

    const embed = resultEmbed(
      won ? "Roulette · win" : "Roulette · loss",
      `Ball landed on **${pocket}** (${pocketColor(pocket)}) · bet **${betType}**`,
      won
    ).addFields(
      { name: "Wager", value: `${amount}`, inline: true },
      { name: "Payout", value: `${payout}`, inline: true },
      { name: "PNL", value: `${profit >= 0 ? "+" : ""}${profit}`, inline: true },
      { name: "Balance", value: `${newBalance}`, inline: true }
    );

    await interaction.reply({ embeds: [embed] });
  } catch (error) {
    if (error instanceof InsufficientBalanceError) {
      await interaction.reply({
        content: `Not enough credits. ${STARTING_HINT}`,
        flags: MessageFlags.Ephemeral,
      });
      return;
    }
    throw error;
  }
}

async function handleMines(interaction: ChatInputCommandInteraction): Promise<void> {
  if (!requireDatabase(interaction)) return;

  const sub = interaction.options.getSubcommand(true);
  if (sub === "start") {
    try {
      await handleMinesStart(interaction);
    } catch (error) {
      if (error instanceof InsufficientBalanceError) {
        await interaction.reply({
          content: `Not enough credits. ${STARTING_HINT}`,
          flags: MessageFlags.Ephemeral,
        });
        return;
      }
      throw error;
    }
  }
}

/** Exported for tests / docs */
export const PAYTABLE_GAMES = ALL_GAMES;
