import { randomCoinSide, randomIntInclusive, roulettePocket, shuffleIndices } from "./rng.js";
import type { CoinSide } from "../games/coinflip.js";
import type { RouletteBetType } from "../paytables/v1.js";
import { evaluateRouletteBet } from "../games/roulette.js";

export type FairnessMeta = {
  paytable_version: string;
  server_seed_hash: string;
  client_seed: string;
  nonce: number;
  cursor?: number;
  digest?: string;
  game: string;
  [key: string]: unknown;
};

export type VerifyResult =
  | { ok: true; detail: string }
  | { ok: false; reason: string };

export function verifyBetReplay(
  serverSeed: string,
  meta: FairnessMeta
): VerifyResult {
  const { game, client_seed, nonce } = meta;
  const cursor = meta.cursor ?? 0;

  switch (game) {
    case "coinflip": {
      const pick = meta.pick as CoinSide;
      const { side, digest } = randomCoinSide(serverSeed, client_seed, nonce, cursor);
      if (meta.digest && meta.digest !== digest) {
        return { ok: false, reason: "Digest mismatch for coinflip" };
      }
      const won = side === pick;
      return {
        ok: true,
        detail: `Coin ${side}, pick ${pick}, ${won ? "win" : "loss"}`,
      };
    }
    case "dice": {
      const guess = Number(meta.guess);
      const { value, digest } = randomIntInclusive(serverSeed, client_seed, nonce, cursor, 1, 6);
      if (meta.digest && meta.digest !== digest) {
        return { ok: false, reason: "Digest mismatch for dice" };
      }
      return {
        ok: true,
        detail: `Roll ${value}, guess ${guess}, ${value === guess ? "win" : "loss"}`,
      };
    }
    case "roulette": {
      const betType = meta.bet_type as RouletteBetType;
      const number = meta.number as number | undefined;
      const { pocket, digest } = roulettePocket(serverSeed, client_seed, nonce, cursor);
      if (meta.digest && meta.digest !== digest) {
        return { ok: false, reason: "Digest mismatch for roulette" };
      }
      const won = evaluateRouletteBet(betType, pocket, number);
      return {
        ok: true,
        detail: `Pocket ${pocket}, bet ${betType}, ${won ? "win" : "loss"}`,
      };
    }
    case "mines": {
      const mineCount = Number(meta.mine_count);
      const total = Number(meta.grid_size ?? 25);
      const { order } = shuffleIndices(serverSeed, client_seed, nonce, total, cursor);
      const minePositions = order.slice(0, mineCount).sort((a, b) => a - b);
      return {
        ok: true,
        detail: `Mine indices: ${minePositions.join(", ")}`,
      };
    }
    default:
      return { ok: false, reason: `Unknown game: ${game}` };
  }
}
