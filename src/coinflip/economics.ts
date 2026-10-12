/** PvP coinflip pot economics — 5% fee on combined pot, single deduction. */

export type PvpCoinflipEconomics = {
  stakeSc: number;
  potSc: number;
  feeSc: number;
  winningReturnSc: number;
  winnerNetSc: number;
  loserNetSc: number;
  feePercentOfPot: number;
  edgePercentPerStake: number;
};

export function assertStakeStep(stakeSc: number): void {
  if (stakeSc <= 0 || stakeSc % 10 !== 0) {
    throw new Error("stake_must_be_multiple_of_10");
  }
}

/** Both players stake `stakeSc`. Fee is 5% of pot (2*stake). Winner receives pot - fee. */
export function pvpCoinflipEconomics(stakeSc: number): PvpCoinflipEconomics {
  assertStakeStep(stakeSc);
  const potSc = stakeSc * 2;
  const feeSc = Math.floor(potSc * 0.05);
  const winningReturnSc = potSc - feeSc;
  const winnerNetSc = winningReturnSc - stakeSc;
  const loserNetSc = -stakeSc;
  const edgePercentPerStake = (-winnerNetSc * 0.5 + stakeSc * 0.5) / stakeSc * 100; // EV loss per stake at 50/50
  return {
    stakeSc,
    potSc,
    feeSc,
    winningReturnSc,
    winnerNetSc,
    loserNetSc,
    feePercentOfPot: 5,
    edgePercentPerStake: 5,
  };
}

/** House coinflip: 50/50, return 1.90× stake on win (same as paytable v1). */
export function houseCoinflipWinReturn(stakeSc: number): number {
  assertStakeStep(stakeSc);
  return Math.floor(stakeSc * 1.9);
}
