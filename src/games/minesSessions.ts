import { randomUUID } from "node:crypto";
import type { MinesSession } from "./mines.js";
import { generateMineField } from "./mines.js";
import { MINES } from "../paytables/v1.js";
import { isSupabaseConfigured } from "../db/supabase.js";
import {
  closeMinesSession as closeDbSession,
  getActiveMinesSessionForUser,
  getMinesSessionById,
  insertMinesSession,
  updateMinesSession,
} from "../db/minesDb.js";

const memorySessions = new Map<string, MinesSession>();
const memoryActiveByUser = new Map<string, string>();

export async function createMinesSession(input: {
  discordId: string;
  wager: number;
  mineCount: number;
  serverSeed: string;
  clientSeed: string;
  nonce: number;
  serverSeedHash: string;
}): Promise<MinesSession> {
  if (input.mineCount < MINES.minMineCount || input.mineCount > MINES.maxMineCount) {
    throw new Error("invalid_mine_count");
  }

  const existing = await getMinesSessionForUser(input.discordId);
  if (existing?.active) {
    throw new Error("mines_session_active");
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

  if (isSupabaseConfigured()) {
    await insertMinesSession(session);
  } else {
    memorySessions.set(session.id, session);
    memoryActiveByUser.set(input.discordId, session.id);
  }

  return session;
}

export async function getMinesSession(sessionId: string): Promise<MinesSession | undefined> {
  if (isSupabaseConfigured()) {
    const row = await getMinesSessionById(sessionId);
    return row ?? undefined;
  }
  return memorySessions.get(sessionId);
}

export async function getMinesSessionForUser(discordId: string): Promise<MinesSession | undefined> {
  if (isSupabaseConfigured()) {
    const row = await getActiveMinesSessionForUser(discordId);
    return row ?? undefined;
  }
  const id = memoryActiveByUser.get(discordId);
  return id ? memorySessions.get(id) : undefined;
}

export async function persistMinesSession(session: MinesSession): Promise<void> {
  if (isSupabaseConfigured()) {
    await updateMinesSession(session);
  }
}

export async function endMinesSession(sessionId: string, discordId?: string): Promise<void> {
  if (isSupabaseConfigured()) {
    await closeDbSession(sessionId);
  } else {
    memorySessions.delete(sessionId);
    if (discordId) memoryActiveByUser.delete(discordId);
  }
}

export function clearAllMinesSessionsForTests(): void {
  memorySessions.clear();
  memoryActiveByUser.clear();
}
