import {
  ButtonInteraction,
  ChatInputCommandInteraction,
  MessageFlags,
} from "discord.js";
import {
  InsufficientBalanceError,
  NonceMismatchError,
} from "../db/players.js";
import {
  baseFairMetadata,
  prepareFairPlay,
  recordBet,
  usernameFrom,
} from "./gameHelpers.js";
import { PAYTABLE_VERSION } from "../paytables/v1.js";
import {
  createMinesSession,
  endMinesSession,
  getMinesSession,
} from "../games/minesSessions.js";
import { isMine, minesCashoutPayout, safeRevealCount } from "../games/mines.js";
import { minesComponents, minesEmbed, minesGridAscii } from "./minesUi.js";
import { resultEmbed } from "../embeds/casino.js";

const activeByUser = new Map<string, string>();

export function clearMinesActiveForTests(): void {
  activeByUser.clear();
}

export async function handleMinesStart(
  interaction: ChatInputCommandInteraction
): Promise<void> {
  const amount = interaction.options.getInteger("amount", true);
  const mineCount = interaction.options.getInteger("mines", true);

  if (activeByUser.has(interaction.user.id)) {
    await interaction.reply({
      content: "You already have an active mines game. Finish it before starting another.",
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  const ctx = await prepareFairPlay(interaction);
  if (ctx.player.balance < amount) {
    throw new InsufficientBalanceError();
  }

  const session = createMinesSession({
    discordId: interaction.user.id,
    wager: amount,
    mineCount,
    serverSeed: ctx.serverSeed,
    clientSeed: ctx.clientSeed,
    nonce: ctx.nonce,
    serverSeedHash: ctx.serverSeedHash,
  });

  activeByUser.set(interaction.user.id, session.id);

  await interaction.reply({
    embeds: [
      minesEmbed(session, "Pick a tile or cash out after at least one safe reveal."),
    ],
    components: minesComponents(session),
  });
}

export async function handleMinesButton(
  interaction: ButtonInteraction
): Promise<void> {
  const parts = interaction.customId.split(":");
  const action = parts[1];
  const sessionId = parts[2];

  const session = getMinesSession(sessionId);
  if (!session || !session.active) {
    await interaction.reply({
      content: "This mines game has ended or expired.",
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  if (session.discordId !== interaction.user.id) {
    await interaction.reply({
      content: "This is not your mines game.",
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  if (action === "pick") {
    const tile = Number(parts[3]);
    if (session.revealed.has(tile)) {
      await interaction.deferUpdate();
      return;
    }

    session.revealed.add(tile);

    if (isMine(session, tile)) {
      session.active = false;
      activeByUser.delete(interaction.user.id);

      try {
        await recordBet({
          discordId: interaction.user.id,
          username: usernameFrom(interaction as unknown as ChatInputCommandInteraction),
          game: "mines",
          wager: session.wager,
          payout: 0,
          expectedNonce: session.nonce,
          metadata: {
            ...baseFairMetadata({
              serverSeedHash: session.serverSeedHash,
              clientSeed: session.clientSeed,
              nonce: session.nonce,
              game: "mines",
              cursor: 0,
            }),
            mine_count: session.mineCount,
            grid_size: 25,
            bust_tile: tile,
            won: false,
          },
        });
      } catch (error) {
        if (error instanceof NonceMismatchError) {
          await interaction.update({
            embeds: [resultEmbed("Mines", "Session expired (nonce drift). Wager not settled.", false)],
            components: [],
          });
          endMinesSession(sessionId);
          return;
        }
        throw error;
      }

      endMinesSession(sessionId);
      const desc = `${minesGridAscii(session, true)}\n\n**Boom!** You hit a mine.`;
      await interaction.update({
        embeds: [resultEmbed("Mines — loss", desc, false)],
        components: [],
      });
      return;
    }

    await interaction.update({
      embeds: [minesEmbed(session, "Safe! Keep going or cash out.")],
      components: minesComponents(session),
    });
    return;
  }

  if (action === "cashout") {
    const reveals = safeRevealCount(session);
    if (reveals === 0) {
      await interaction.reply({
        content: "Reveal at least one safe tile before cashing out.",
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    const payout = minesCashoutPayout(session.wager, session.mineCount, reveals);
    session.active = false;
    activeByUser.delete(interaction.user.id);

    const { newBalance, profit } = await recordBet({
      discordId: interaction.user.id,
      username: usernameFrom(interaction as unknown as ChatInputCommandInteraction),
      game: "mines",
      wager: session.wager,
      payout,
      expectedNonce: session.nonce,
      metadata: {
        ...baseFairMetadata({
          serverSeedHash: session.serverSeedHash,
          clientSeed: session.clientSeed,
          nonce: session.nonce,
          game: "mines",
          cursor: 0,
        }),
        mine_count: session.mineCount,
        grid_size: 25,
        safe_reveals: reveals,
        won: true,
        paytable_version: PAYTABLE_VERSION,
      },
    });

    endMinesSession(sessionId);
    const desc = `${minesGridAscii(session, false)}\n\nCashed out at **${payout}** credits.`;
    const embed = resultEmbed("Mines — win", desc, true).addFields(
      { name: "PNL", value: `${profit >= 0 ? "+" : ""}${profit}`, inline: true },
      { name: "Balance", value: `${newBalance}`, inline: true }
    );
    await interaction.update({ embeds: [embed], components: [] });
  }
}
