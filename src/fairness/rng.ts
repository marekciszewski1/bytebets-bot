import { createHmac, createHash, randomBytes } from "node:crypto";

export function sha256Hex(input: string): string {
  return createHash("sha256").update(input, "utf8").digest("hex");
}

export function generateServerSeed(): string {
  return randomBytes(32).toString("hex");
}

export function hmacHex(serverSeed: string, message: string): string {
  return createHmac("sha256", serverSeed).update(message, "utf8").digest("hex");
}

/** Provably fair message for a single random draw cursor. */
export function fairnessMessage(clientSeed: string, nonce: number, cursor: number): string {
  return `${clientSeed}:${nonce}:${cursor}`;
}

export function digestFor(serverSeed: string, clientSeed: string, nonce: number, cursor: number): string {
  return hmacHex(serverSeed, fairnessMessage(clientSeed, nonce, cursor));
}

/** Uniform float in [0, 1) from hex digest prefix. */
export function digestToUnitFloat(hexDigest: string, sliceIndex = 0): number {
  const start = (sliceIndex * 8) % Math.max(hexDigest.length - 8, 1);
  const slice = hexDigest.slice(start, start + 8);
  const value = parseInt(slice.padEnd(8, "0").slice(0, 8), 16);
  return value / 0x1_0000_0000;
}

export function randomIntInclusive(
  serverSeed: string,
  clientSeed: string,
  nonce: number,
  cursor: number,
  min: number,
  max: number
): { value: number; digest: string } {
  const digest = digestFor(serverSeed, clientSeed, nonce, cursor);
  const unit = digestToUnitFloat(digest, 0);
  const span = max - min + 1;
  const value = min + Math.floor(unit * span);
  return { value: Math.min(max, Math.max(min, value)), digest };
}

export function randomCoinSide(
  serverSeed: string,
  clientSeed: string,
  nonce: number,
  cursor = 0
): { side: "heads" | "tails"; digest: string } {
  const { value, digest } = randomIntInclusive(serverSeed, clientSeed, nonce, cursor, 0, 1);
  return { side: value === 0 ? "heads" : "tails", digest };
}

/** Fisher–Yates partial shuffle indices 0..total-1 using sequential cursors. */
export function shuffleIndices(
  serverSeed: string,
  clientSeed: string,
  nonce: number,
  total: number,
  startCursor = 0
): { order: number[]; digests: string[] } {
  const order = Array.from({ length: total }, (_, i) => i);
  const digests: string[] = [];
  let cursor = startCursor;
  for (let i = total - 1; i > 0; i--) {
    const { value, digest } = randomIntInclusive(serverSeed, clientSeed, nonce, cursor, 0, i);
    digests.push(digest);
    cursor += 1;
    const j = value;
    [order[i], order[j]] = [order[j], order[i]];
  }
  return { order, digests };
}

export function roulettePocket(
  serverSeed: string,
  clientSeed: string,
  nonce: number,
  cursor = 0
): { pocket: number; digest: string } {
  const { value, digest } = randomIntInclusive(serverSeed, clientSeed, nonce, cursor, 0, 36);
  return { pocket: value, digest };
}
