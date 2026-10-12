import { shuffleIndices } from "../fairness/rng.js";
import { MINES, minesCashoutPayout } from "../paytables/v1.js";

export type MinesSession = {
  id: string;
  discordId: string;
  wager: number;
  mineCount: number;
  minePositions: Set<number>;
  revealed: Set<number>;
  nonce: number;
  clientSeed: string;
  serverSeedHash: string;
  cursor: number;
  active: boolean;
};

export function generateMineField(
  serverSeed: string,
  clientSeed: string,
  nonce: number,
  mineCount: number,
  cursor = 0
): { minePositions: number[]; cursorEnd: number } {
  const { order } = shuffleIndices(serverSeed, clientSeed, nonce, MINES.gridSize, cursor);
  const minePositions = order.slice(0, mineCount).sort((a, b) => a - b);
  return { minePositions, cursorEnd: cursor + mineCount };
}

export function isMine(session: MinesSession, tile: number): boolean {
  return session.minePositions.has(tile);
}

export function safeRevealCount(session: MinesSession): number {
  return session.revealed.size;
}

export function currentMultiplier(session: MinesSession): number {
  return MINES.multiplierAfterReveals(session.mineCount, safeRevealCount(session));
}

export { MINES, minesCashoutPayout };
