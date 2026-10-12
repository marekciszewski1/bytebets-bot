import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
} from "discord.js";
import { COLORS } from "../config/branding.js";
import { MINES } from "../paytables/v1.js";
import type { MinesSession } from "../games/mines.js";
import { currentMultiplier, safeRevealCount } from "../games/mines.js";

const COLS = 5;

export function minesEmbed(session: MinesSession, status: string): EmbedBuilder {
  const revealed = safeRevealCount(session);
  const mult = currentMultiplier(session);
  return new EmbedBuilder()
    .setTitle("ByteBits · Mines")
    .setDescription(status)
    .addFields(
      { name: "Wager", value: `${session.wager}`, inline: true },
      { name: "Mines", value: `${session.mineCount}`, inline: true },
      { name: "Safe picks", value: `${revealed}`, inline: true },
      { name: "Multiplier", value: `${mult.toFixed(2)}×`, inline: true }
    )
    .setColor(COLORS.primary);
}

export function minesComponents(session: MinesSession): ActionRowBuilder<ButtonBuilder>[] {
  const rows: ActionRowBuilder<ButtonBuilder>[] = [];
  for (let row = 0; row < COLS; row++) {
    const actionRow = new ActionRowBuilder<ButtonBuilder>();
    for (let col = 0; col < COLS; col++) {
      const tile = row * COLS + col;
      const revealed = session.revealed.has(tile);
      const label = revealed ? "✓" : "·";
      actionRow.addComponents(
        new ButtonBuilder()
          .setCustomId(`mines:pick:${session.id}:${tile}`)
          .setLabel(label)
          .setStyle(revealed ? ButtonStyle.Success : ButtonStyle.Secondary)
          .setDisabled(!session.active || revealed)
      );
    }
    rows.push(actionRow);
  }

  const cashRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId(`mines:cashout:${session.id}`)
      .setLabel("Cash out")
      .setStyle(ButtonStyle.Primary)
      .setDisabled(!session.active || safeRevealCount(session) === 0)
  );
  rows.push(cashRow);
  return rows;
}

export function minesGridAscii(session: MinesSession, showMines: boolean): string {
  const lines: string[] = [];
  for (let row = 0; row < COLS; row++) {
    let line = "";
    for (let col = 0; col < COLS; col++) {
      const tile = row * COLS + col;
      if (showMines && session.minePositions.has(tile)) line += "💣";
      else if (session.revealed.has(tile)) line += "🟩";
      else line += "⬛";
    }
    lines.push(line);
  }
  return lines.join("\n");
}

export { MINES };
