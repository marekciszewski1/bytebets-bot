export type CoinSide = "heads" | "tails";

export function flipCoin(): CoinSide {
  return Math.random() < 0.5 ? "heads" : "tails";
}

export function coinflipPayout(wager: number, won: boolean): number {
  return won ? wager * 2 : 0;
}
