import { randomUUID } from "node:crypto";
import type { MinesSession } from "./mines.js";
import { generateMineField } from "./mines.js";
import { MINES } from "../paytables/v1.js";

const sessions = new Map<string, MinesSession>();

export function createMinesSession(input: {
  discordId: string;
  wager: number;
  mineCount: number;
  serverSeed: string;
  clientSeed: string;
  nonce: number;
  serverSeedHash: string;
}): MinesSession {
  if (input.mineCount < MINES.minMineCount || input.mineCount > MINES.maxMineCount) {
    throw new Error("invalid_mine_count");
  }

  const { minePositions } = generateMineField(
    input.serverSeed,
    input.clientSeed,
    input.nonce,
    input.mineCount,
    0
  );

  const session: MinesSession = {
    id: randomUUID(),
    discordId: input.discordId,
    wager: input.wager,
    mineCount: input.mineCount,
    minePositions: new Set(minePositions),
    revealed: new Set(),
    nonce: input.nonce,
    clientSeed: input.clientSeed,
    serverSeedHash: input.serverSeedHash,
    cursor: 0,
    active: true,
  };

  sessions.set(session.id, session);
  return session;
}

export function getMinesSession(sessionId: string): MinesSession | undefined {
  return sessions.get(sessionId);
}

export function endMinesSession(sessionId: string): void {
  sessions.delete(sessionId);
}

export function clearAllMinesSessionsForTests(): void {
  sessions.clear();
}
