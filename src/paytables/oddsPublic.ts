import {
  COINFLIP,
  DICE,
  MINES,
  PAYTABLE_VERSION,
  ROULETTE,
  TARGET_RTP,
} from "./v1.js";

export type OddsLine = {
  game: string;
  winProbability: string;
  payout: string;
  theoreticalRtp: string;
  notes: string;
};

/** Published win probabilities and RTP — single source derived from paytable v1. */
export function buildOddsDisclosure(): OddsLine[] {
  const coinflipRtp = COINFLIP.winProbability * COINFLIP.winMultiplier;
  const diceRtp = DICE.winProbability * DICE.winMultiplier;
  const rouletteEven = (18 / ROULETTE.pockets) * ROULETTE.colorPayout;
  const rouletteSingle = (1 / ROULETTE.pockets) * ROULETTE.singlePayout;
  const minesExample = MINES.multiplierAfterReveals(3, 1);

  return [
    {
      game: "Coinflip",
      winProbability: `${(COINFLIP.winProbability * 100).toFixed(1)}%`,
      payout: `${COINFLIP.winMultiplier}×`,
      theoreticalRtp: `${(coinflipRtp * 100).toFixed(2)}%`,
      notes: COINFLIP.description,
    },
    {
      game: "Dice",
      winProbability: `${(DICE.winProbability * 100).toFixed(2)}%`,
      payout: `${DICE.winMultiplier}×`,
      theoreticalRtp: `${(diceRtp * 100).toFixed(2)}%`,
      notes: DICE.description,
    },
    {
      game: "Roulette (even money)",
      winProbability: `${((18 / ROULETTE.pockets) * 100).toFixed(2)}%`,
      payout: `${ROULETTE.colorPayout}×`,
      theoreticalRtp: `${(rouletteEven * 100).toFixed(2)}%`,
      notes: "Red/black/odd/even/low/high · single zero",
    },
    {
      game: "Roulette (straight up)",
      winProbability: `${((1 / ROULETTE.pockets) * 100).toFixed(2)}%`,
      payout: `${ROULETTE.singlePayout}×`,
      theoreticalRtp: `${(rouletteSingle * 100).toFixed(2)}%`,
      notes: "One number 0–36",
    },
    {
      game: "Mines (example)",
      winProbability: "Varies by picks",
      payout: `${minesExample}× after 1 safe (3 mines)`,
      theoreticalRtp: `~${(TARGET_RTP * 100).toFixed(0)}% at cash-out curve`,
      notes: MINES.description,
    },
  ];
}

export function formatOddsEmbedDescription(): string {
  const header = `Paytable **${PAYTABLE_VERSION}** · even-chance target RTP **${(TARGET_RTP * 100).toFixed(0)}%**\n`;
  const lines = buildOddsDisclosure().map(
    (row) =>
      `**${row.game}**\nWin ${row.winProbability} · Payout ${row.payout} · RTP ${row.theoreticalRtp}\n_${row.notes}_`
  );
  return header + "\n" + lines.join("\n\n");
}
