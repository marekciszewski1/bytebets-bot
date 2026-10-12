/** Comma-separated Discord user IDs allowed to run /admin commands. */
export function getAdminDiscordIds(): Set<string> {
  const raw = process.env.ADMIN_DISCORD_IDS ?? "";
  return new Set(
    raw
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean)
  );
}

export function isAdminDiscordUser(discordId: string): boolean {
  const admins = getAdminDiscordIds();
  if (admins.size === 0) return false;
  return admins.has(discordId);
}
