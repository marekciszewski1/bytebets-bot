import {
  houseCoinflipWinReturn,
  pvpCoinflipEconomics,
  assertStakeStep,
} from "./economics.js";
import {
  coinflipOutcomeFromSeed,
  generateRoundServerSeed,
  hashServerSeed,
} from "./perRoundRng.js";
import {
  createMatchRow,
  creditStake,
  getMatchByPublicId,
  journalEscrow,
  lockStake,
  newPublicMatchId,
  updateMatch,
  type CoinflipMatchRow,
} from "../db/coinflipMatches.js";
import { insertRound, newOpaqueRoundId, settleRound } from "../db/rounds.js";
import { ensurePlayer } from "../db/players.js";
import { PAYTABLE_VERSION } from "../paytables/v1.js";
import { getPublicBaseUrl } from "../config/publicUrl.js";

const MATCH_TTL_MS = 15 * 60 * 1000;

export async function createPvpMatch(input: {
  guildId: string;
  creatorId: string;
  creatorUsername: string;
  stakeSc: number;
  side: "heads" | "tails";
  visibility?: "public" | "private";
  inviteeId?: string;
}): Promise<{ match: CoinflipMatchRow; economics: ReturnType<typeof pvpCoinflipEconomics> }> {
  assertStakeStep(input.stakeSc);
  const econ = pvpCoinflipEconomics(input.stakeSc);
  const serverSeed = generateRoundServerSeed();
  const seedHash = hashServerSeed(serverSeed);
  const publicId = newPublicMatchId();
  const opaqueId = newOpaqueRoundId();

  const creator = await ensurePlayer(input.creatorId, input.creatorUsername);
  const clientSeedA = creator.client_seed || input.creatorId;

  const round = await insertRound({
    opaqueId,
    guildId: input.guildId,
    game: "coinflip_pvp",
    paytableVersion: PAYTABLE_VERSION,
    serverSeedHash: seedHash,
    clientSeedA,
    stakeSc: input.stakeSc,
    metadata: { mode: "pvp", public_match_id: publicId },
  });

  await lockStake(
    input.creatorId,
    input.creatorUsername,
    input.stakeSc,
    `match:${publicId}:lock:creator`
  );

  const match = await createMatchRow({
    public_id: publicId,
    guild_id: input.guildId,
    creator_id: input.creatorId,
    mode: "pvp",
    visibility: input.visibility ?? "public",
    creator_side: input.side,
    stake_sc: input.stakeSc,
    fee_sc: econ.feeSc,
    pot_sc: econ.potSc,
    winning_return_sc: econ.winningReturnSc,
    seed_hash: seedHash,
    client_seed_a: clientSeedA,
    server_seed: serverSeed,
    expires_at: new Date(Date.now() + MATCH_TTL_MS).toISOString(),
    opponent_id: input.inviteeId ?? null,
    round_id: round.id,
  });

  await journalEscrow({
    matchId: match.id,
    discordId: input.creatorId,
    amountSc: input.stakeSc,
    entryType: "lock",
    idempotencyKey: `journal:${publicId}:creator:lock`,
  });

  return { match, economics: econ };
}

export async function joinPvpMatch(input: {
  publicId: string;
  joinerId: string;
  joinerUsername: string;
}): Promise<CoinflipMatchRow> {
  const match = await getMatchByPublicId(input.publicId);
  if (!match || match.state !== "OPEN") throw new Error("match_not_open");
  if (match.mode !== "pvp") throw new Error("not_pvp");
  if (match.creator_id === input.joinerId) throw new Error("cannot_join_own");
  if (match.opponent_id && match.opponent_id !== input.joinerId) throw new Error("invite_mismatch");
  if (new Date(match.expires_at).getTime() < Date.now()) throw new Error("match_expired");

  const joiner = await ensurePlayer(input.joinerId, input.joinerUsername);
  await lockStake(
    input.joinerId,
    input.joinerUsername,
    match.stake_sc,
    `match:${input.publicId}:lock:joiner`
  );
  await journalEscrow({
    matchId: match.id,
    discordId: input.joinerId,
    amountSc: match.stake_sc,
    entryType: "lock",
    idempotencyKey: `journal:${input.publicId}:joiner:lock`,
  });

  return updateMatch(input.publicId, {
    opponent_id: input.joinerId,
    client_seed_b: joiner.client_seed || input.joinerId,
    state: "ACCEPTED",
    accepted_at: new Date().toISOString(),
  });
}

export async function settlePvpMatch(publicId: string): Promise<{
  match: CoinflipMatchRow;
  roundOpaqueId: string;
  verifyUrl: string;
}> {
  let match = await getMatchByPublicId(publicId);
  if (!match) throw new Error("match_not_found");
  if (match.state === "SETTLED") {
    const opaque = await opaqueIdForMatch(match);
    return finalizeUrls(match, opaque);
  }
  if (match.state !== "ACCEPTED") throw new Error("match_not_ready");

  match = await updateMatch(publicId, { state: "ANIMATING" });

  const serverSeed = match.server_seed;
  if (!serverSeed) throw new Error("missing_server_seed");

  const roundRow = await settleRoundLookup(match.seed_hash);
  const opaqueId = roundRow?.opaque_id ?? newOpaqueRoundId();

  const { side, digest } = coinflipOutcomeFromSeed(
    serverSeed,
    opaqueId,
    match.client_seed_a,
    match.client_seed_b || match.opponent_id || "house",
    match.nonce
  );

  const creatorWins = side === match.creator_side;
  const winnerId = creatorWins ? match.creator_id : match.opponent_id!;
  const loserId = creatorWins ? match.opponent_id! : match.creator_id;

  await creditStake(
    winnerId,
    "winner",
    match.winning_return_sc,
    `match:${publicId}:payout:winner`
  );
  await journalEscrow({
    matchId: match.id,
    discordId: winnerId,
    amountSc: match.winning_return_sc,
    entryType: "payout",
    idempotencyKey: `journal:${publicId}:winner:payout`,
  });

  if (match.fee_sc > 0) {
    await journalEscrow({
      matchId: match.id,
      discordId: "house_fee_sink",
      amountSc: match.fee_sc,
      entryType: "fee_sink",
      idempotencyKey: `journal:${publicId}:fee`,
    });
  }

  await settleRound({
    opaqueId,
    serverSeed,
    outcome: {
      side,
      digest,
      creator_side: match.creator_side,
      winner_id: winnerId,
      loser_id: loserId,
    },
    payoutSc: match.winning_return_sc,
    feeSc: match.fee_sc,
    proofStatus: "verifiable",
  });

  match = await updateMatch(publicId, {
    state: "SETTLED",
    winner_id: winnerId,
    settled_at: new Date().toISOString(),
  });

  return finalizeUrls(match, opaqueId);
}

async function opaqueIdForMatch(match: CoinflipMatchRow): Promise<string> {
  if (!match.round_id) return newOpaqueRoundId();
  const { getSupabase } = await import("../db/supabase.js");
  const supabase = getSupabase();
  const { data } = await supabase.from("rounds").select("opaque_id").eq("id", match.round_id).maybeSingle();
  return (data as { opaque_id: string } | null)?.opaque_id ?? newOpaqueRoundId();
}

async function settleRoundLookup(seedHash: string) {
  const { getSupabase } = await import("./../db/supabase.js");
  const supabase = getSupabase();
  const { data } = await supabase
    .from("rounds")
    .select("opaque_id")
    .eq("server_seed_hash", seedHash)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return data as { opaque_id: string } | null;
}

function finalizeUrls(match: CoinflipMatchRow, opaqueId?: string) {
  const id = opaqueId ?? "unknown";
  return {
    match,
    roundOpaqueId: id,
    verifyUrl: `${getPublicBaseUrl()}/fair/${id}`,
  };
}

export async function cancelOpenMatch(input: {
  publicId: string;
  requesterId: string;
  username: string;
}): Promise<CoinflipMatchRow> {
  const match = await getMatchByPublicId(input.publicId);
  if (!match || match.state !== "OPEN") throw new Error("match_not_open");
  if (match.creator_id !== input.requesterId) throw new Error("not_creator");

  await creditStake(
    match.creator_id,
    input.username,
    match.stake_sc,
    `match:${input.publicId}:refund:creator`
  );
  await journalEscrow({
    matchId: match.id,
    discordId: match.creator_id,
    amountSc: match.stake_sc,
    entryType: "refund",
    idempotencyKey: `journal:${input.publicId}:creator:refund`,
  });

  return updateMatch(input.publicId, { state: "CANCELLED" });
}

export async function playHouseCoinflip(input: {
  guildId: string;
  userId: string;
  username: string;
  stakeSc: number;
  side: "heads" | "tails";
}): Promise<{
  won: boolean;
  payoutSc: number;
  side: "heads" | "tails";
  verifyUrl: string;
  roundOpaqueId: string;
}> {
  assertStakeStep(input.stakeSc);
  const serverSeed = generateRoundServerSeed();
  const seedHash = hashServerSeed(serverSeed);
  const opaqueId = newOpaqueRoundId();
  const player = await ensurePlayer(input.userId, input.username);
  const clientSeed = player.client_seed || input.userId;

  await insertRound({
    opaqueId,
    guildId: input.guildId,
    game: "coinflip_house",
    paytableVersion: PAYTABLE_VERSION,
    serverSeedHash: seedHash,
    clientSeedA: clientSeed,
    clientSeedB: "bytebits-house-dealer",
    stakeSc: input.stakeSc,
    metadata: { mode: "house" },
  });

  await lockStake(input.userId, input.username, input.stakeSc, `house:${opaqueId}:stake`);

  const { side, digest } = coinflipOutcomeFromSeed(
    serverSeed,
    opaqueId,
    clientSeed,
    "bytebits-house-dealer",
    0
  );
  const won = side === input.side;
  const payoutSc = won ? houseCoinflipWinReturn(input.stakeSc) : 0;

  if (payoutSc > 0) {
    await creditStake(input.userId, input.username, payoutSc, `house:${opaqueId}:payout`);
  }

  await settleRound({
    opaqueId,
    serverSeed,
    outcome: { side, digest, pick: input.side, won, dealer: "ByteBits House Dealer 🤖" },
    payoutSc,
    feeSc: won ? input.stakeSc * 2 - payoutSc : input.stakeSc,
    proofStatus: "verifiable",
  });

  return {
    won,
    payoutSc,
    side,
    verifyUrl: `${getPublicBaseUrl()}/fair/${opaqueId}`,
    roundOpaqueId: opaqueId,
  };
}
