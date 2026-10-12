/**
 * Authoritative paytable v1 — ~95% RTP (≈5% house edge) on even-chance games.
 * Import only from this module for payouts and published odds.
 */

export const PAYTABLE_VERSION = "v1" as const;

/** Target RTP for even-chance games (coinflip, dice). */
export const TARGET_RTP = 0.95;

export const COINFLIP = {
  id: "coinflip",
  winProbability: 0.5,
  winMultiplier: 1.9, // 0.5 × 1.9 = 0.95 RTP
  description: "50% to win · 1.90× payout on win",
} as const;

export const DICE = {
  id: "dice",
  sides: 6,
  winProbability: 1 / 6,
  winMultiplier: 5.7, // (1/6) × 5.7 = 0.95 RTP
  description: "1 in 6 to win · 5.70× payout on win",
} as const;

/** 5×5 mines grid */
export const MINES = {
  id: "mines",
  gridSize: 25,
  minMineCount: 1,
  maxMineCount: 24,
  /** Multiplier after k safe reveals with m mines (includes edge scaling). */
  multiplierAfterReveals(mineCount: number, safeReveals: number): number {
    if (safeReveals <= 0) return 1;
    const total = MINES.gridSize;
    const safeTiles = total - mineCount;
    let mult = 1;
    for (let i = 0; i < safeReveals; i++) {
      const remainingSafe = safeTiles - i;
      const remainingTotal = total - i;
      const fairStep = remainingTotal / remainingSafe;
      mult *= fairStep * TARGET_RTP;
    }
    return Math.floor(mult * 100) / 100;
  },
  description: "Reveal safe tiles · cash out anytime · hit a mine = loss",
} as const;

/** European roulette (single zero). */
export const ROULETTE = {
  id: "roulette",
  pockets: 37,
  /** Pocket 0–36 */
  colorPayout: 2, // red/black pays 2× (true odds 18/37 → built-in edge)
  dozenPayout: 3,
  singlePayout: 36,
  description: "European wheel (0–36) · standard payout table",
} as const;

export const ALL_GAMES = [COINFLIP, DICE, MINES, ROULETTE] as const;

export function coinflipPayout(wager: number, won: boolean): number {
  if (!won) return 0;
  return Math.floor(wager * COINFLIP.winMultiplier);
}

export function dicePayout(wager: number, won: boolean): number {
  if (!won) return 0;
  return Math.floor(wager * DICE.winMultiplier);
}

export function minesCashoutPayout(wager: number, mineCount: number, safeReveals: number): number {
  const mult = MINES.multiplierAfterReveals(mineCount, safeReveals);
  return Math.floor(wager * mult);
}

export type RouletteBetType = "red" | "black" | "odd" | "even" | "low" | "high" | "single";

export function roulettePayout(
  wager: number,
  betType: RouletteBetType,
  won: boolean,
  _pocket: number
): number {
  if (!won) return 0;
  switch (betType) {
    case "single":
      return wager * ROULETTE.singlePayout;
    case "red":
    case "black":
    case "odd":
    case "even":
    case "low":
    case "high":
      return wager * ROULETTE.colorPayout;
    default:
      return 0;
  }
}
