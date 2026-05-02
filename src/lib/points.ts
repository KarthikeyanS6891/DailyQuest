export type Priority = 1 | 2 | 3;

const PRIORITY_WEIGHT: Record<Priority, number> = { 1: 1.5, 2: 1.0, 3: 0.7 };

export function pointsFor(priority: Priority, estimatedMinutes: number): number {
  const base = Math.max(5, Math.min(estimatedMinutes, 180));
  const weighted = base * PRIORITY_WEIGHT[priority];
  return Math.round(weighted);
}

export function levelForXp(xp: number): { level: number; into: number; toNext: number } {
  let level = 1;
  let cost = 100;
  let remaining = xp;
  while (remaining >= cost && level < 100) {
    remaining -= cost;
    level += 1;
    cost = Math.round(cost * 1.18);
  }
  return { level, into: remaining, toNext: cost };
}
