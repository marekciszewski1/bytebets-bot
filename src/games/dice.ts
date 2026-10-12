export function rollDice(): number {
  return Math.floor(Math.random() * 6) + 1;
}

/** Guess 1–6; pays 5× on hit (house edge ~16.7%, same family as many simple dice games). */
export function dicePayout(wager: number, won: boolean): number {
  return won ? wager * 5 : 0;
}
