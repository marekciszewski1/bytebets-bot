/** Cosmetic VIP tiers from lifetime wagered volume — no gameplay advantage. */

export type VipTierId = "bronze" | "silver" | "gold" | "platinum" | "diamond";

export type VipTier = {
  id: VipTierId;
  label: string;
  minWagered: number;
  frame: string;
  badge: string;
  color: number;
};

export const VIP_TIERS: VipTier[] = [
  { id: "bronze", label: "Bronze", minWagered: 0, frame: "default", badge: "🎲", color: 0xcd7f32 },
  { id: "silver", label: "Silver", minWagered: 10_000, frame: "silver", badge: "✨", color: 0xc0c0c0 },
  { id: "gold", label: "Gold", minWagered: 50_000, frame: "gold", badge: "👑", color: 0xfbbf24 },
  { id: "platinum", label: "Platinum", minWagered: 200_000, frame: "platinum", badge: "💎", color: 0xa78bfa },
  { id: "diamond", label: "Diamond", minWagered: 1_000_000, frame: "diamond", badge: "🔥", color: 0x22d3ee },
];

export const COSMETIC_BADGES: { id: string; label: string; minTier: VipTierId }[] = [
  { id: "none", label: "None", minTier: "bronze" },
  { id: "dice", label: "Lucky dice", minTier: "bronze" },
  { id: "sparkle", label: "Sparkle", minTier: "silver" },
  { id: "crown", label: "Crown", minTier: "gold" },
  { id: "gem", label: "Gem", minTier: "platinum" },
  { id: "flame", label: "Flame", minTier: "diamond" },
];

export function tierForWagered(totalWagered: number): VipTier {
  let current = VIP_TIERS[0];
  for (const tier of VIP_TIERS) {
    if (totalWagered >= tier.minWagered) current = tier;
  }
  return current;
}

export function tierRank(id: VipTierId): number {
  return VIP_TIERS.findIndex((t) => t.id === id);
}

export function canUseBadge(totalWagered: number, badgeId: string): boolean {
  const badge = COSMETIC_BADGES.find((b) => b.id === badgeId);
  if (!badge) return false;
  const playerTier = tierForWagered(totalWagered);
  return tierRank(playerTier.id) >= tierRank(badge.minTier);
}
