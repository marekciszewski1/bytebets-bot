import { createHash } from "node:crypto";

export type ChallengeTemplate = {
  id: string;
  title: string;
  description: string;
  goal: number;
  metric: "wager" | "wins" | "games";
  reward: number;
};

export const CHALLENGE_TEMPLATES: ChallengeTemplate[] = [
  {
    id: "wager_500",
    title: "High roller",
    description: "Wager **500** credits today",
    goal: 500,
    metric: "wager",
    reward: 250,
  },
  {
    id: "win_3",
    title: "Winning streak",
    description: "Win **3** bets today",
    goal: 3,
    metric: "wins",
    reward: 250,
  },
  {
    id: "play_5",
    title: "Table hopper",
    description: "Play **5** games today",
    goal: 5,
    metric: "games",
    reward: 250,
  },
];

export function todayUtcDateString(now = new Date()): string {
  return now.toISOString().slice(0, 10);
}

export function pickDailyChallenge(discordId: string, day: string): ChallengeTemplate {
  const hash = createHash("sha256").update(`${day}:${discordId}`).digest("hex");
  const index = parseInt(hash.slice(0, 8), 16) % CHALLENGE_TEMPLATES.length;
  return CHALLENGE_TEMPLATES[index];
}

export function challengeProgressLabel(
  template: ChallengeTemplate,
  progress: number,
  completed: boolean
): string {
  const pct = Math.min(100, Math.floor((progress / template.goal) * 100));
  const status = completed ? "✅ Complete" : `${progress}/${template.goal} (${pct}%)`;
  return `${template.title} — ${template.description}\nProgress: **${status}** · Reward: **${template.reward}** credits`;
}
