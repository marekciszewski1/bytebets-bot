import { roulettePocket } from "../fairness/rng.js";
import { ROULETTE, roulettePayout, type RouletteBetType } from "../paytables/v1.js";

const RED = new Set([
  1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36,
]);

export function spinRouletteFair(
  serverSeed: string,
  clientSeed: string,
  nonce: number,
  cursor = 0
): { pocket: number; digest: string } {
  return roulettePocket(serverSeed, clientSeed, nonce, cursor);
}

export function pocketColor(pocket: number): "green" | "red" | "black" {
  if (pocket === 0) return "green";
  return RED.has(pocket) ? "red" : "black";
}

export function evaluateRouletteBet(
  betType: RouletteBetType,
  pocket: number,
  singleNumber?: number
): boolean {
  if (pocket === 0 && betType !== "single") return false;

  switch (betType) {
    case "red":
      return pocketColor(pocket) === "red";
    case "black":
      return pocketColor(pocket) === "black";
    case "odd":
      return pocket !== 0 && pocket % 2 === 1;
    case "even":
      return pocket !== 0 && pocket % 2 === 0;
    case "low":
      return pocket >= 1 && pocket <= 18;
    case "high":
      return pocket >= 19 && pocket <= 36;
    case "single":
      return singleNumber !== undefined && pocket === singleNumber;
    default:
      return false;
  }
}

export { ROULETTE, roulettePayout, type RouletteBetType };
