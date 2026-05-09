import { and, desc, eq, gte, inArray, sql } from "drizzle-orm";
import { db } from "@/db/client";
import {
  habitCompletions,
  habits as habitsT,
  redemptions as redemptionsT,
  rewardLedger,
  tasks as tasksT,
  users,
} from "@/db/schema";
import { pointsFor, type Priority } from "@/lib/points";

// ---------- Public types (shape preserved for the existing UI) ----------

export type Task = {
  id: string;
  title: string;
  priority: Priority;
  estimatedMinutes: number;
  scheduledFor: string | null;
  status: "pending" | "done" | "skipped";
  completedAt: string | null;
  pointsAwarded: number;
  createdAt: string;
};

export type Habit = {
  id: string;
  title: string;
  cadence: { type: "daily" } | { type: "weekly"; days: number[] };
  currentStreak: number;
  longestStreak: number;
  freezesRemaining: number;
  freezesResetMonth: string;
  active: boolean;
  createdAt: string;
};

export type LedgerEntry = {
  id: string;
  delta: number;
  reason: string;
  refId: string | null;
  balanceAfter: number;
  createdAt: string;
};

export type Reward = {
  id: string;
  title: string;
  emoji: string;
  cost: number;
  description: string;
  kind: "self" | "real";
};

export type Redemption = {
  id: string;
  rewardId: string;
  rewardTitle: string;
  rewardEmoji: string;
  cost: number;
  status: "pending" | "fulfilled" | "failed";
  createdAt: string;
};

export type Settings = {
  timezone: string;
  quietHoursStart: number;
  quietHoursEnd: number;
  notifications: boolean;
};

// ---------- Helpers ----------

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}
function monthIso() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}
function isoDateNDaysAgo(n: number) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}
function dayIndex(iso: string) {
  return new Date(iso + "T00:00:00").getDay();
}
function asIso(d: Date | null | undefined): string | null {
  return d ? new Date(d).toISOString() : null;
}

// Local-date string (YYYY-MM-DD) for a given instant in a given tz. Used to
// answer "is this task scheduled for today?" without UTC vs local confusion.
function localDateStr(d: Date | null | undefined, tz: string): string | null {
  if (!d) return null;
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(d));
}

function localTodayStr(tz: string): string {
  return localDateStr(new Date(), tz)!;
}

function localYesterdayStr(tz: string): string {
  return localDateStr(new Date(Date.now() - 86_400_000), tz)!;
}

// ---------- Reward catalog (static) ----------

export const REWARD_CATALOG: Reward[] = [
  { id: "coffee", title: "Buy yourself a coffee", emoji: "☕", cost: 100, kind: "self", description: "You earned it. Go grab one." },
  { id: "movie", title: "Movie night", emoji: "🎬", cost: 250, kind: "self", description: "Pick the film, no guilt." },
  { id: "takeout", title: "Order takeout", emoji: "🍜", cost: 400, kind: "self", description: "Skip cooking. You did the work." },
  { id: "book", title: "New book", emoji: "📚", cost: 600, kind: "self", description: "Add one to your shelf." },
  { id: "spa", title: "Spa / massage hour", emoji: "💆", cost: 1200, kind: "self", description: "Treat the body that carried you." },
  { id: "gadget", title: "Small gadget under $50", emoji: "🎧", cost: 2000, kind: "self", description: "That thing you've been eyeing." },
  { id: "weekend", title: "Weekend trip fund", emoji: "🏔️", cost: 5000, kind: "self", description: "Big milestone — pack the bag." },
  { id: "donate-5", title: "Donate $5 to charity", emoji: "💖", cost: 800, kind: "real", description: "Stub: would call Every.org in production." },
  { id: "giftcard-5", title: "$5 Amazon gift card", emoji: "🎁", cost: 1500, kind: "real", description: "Stub: would call Tango Card API in production." },
];

const REWARD_BY_ID: Map<string, Reward> = new Map(REWARD_CATALOG.map((r) => [r.id, r]));

// User creation happens in src/app/(auth)/actions.ts during sign-up.
// All store functions assume the user already exists (auth middleware enforces this).

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

async function bumpDailyStreak(tx: Tx, userId: string): Promise<void> {
  const [u] = await tx
    .select({
      streak: users.streak,
      lastCompletionDate: users.lastCompletionDate,
      timezone: users.timezone,
    })
    .from(users)
    .where(eq(users.id, userId));
  if (!u) return;
  const tz = u.timezone || "UTC";
  const today = localTodayStr(tz);
  const yesterday = localYesterdayStr(tz);
  if (u.lastCompletionDate === today) return;
  const nextStreak = u.lastCompletionDate === yesterday ? u.streak + 1 : 1;
  await tx
    .update(users)
    .set({ streak: nextStreak, lastCompletionDate: today })
    .where(eq(users.id, userId));
}

async function rolloverFreezes(userId: string): Promise<void> {
  const m = monthIso();
  await db
    .update(habitsT)
    .set({ freezesRemaining: 2, freezesResetMonth: m })
    .where(and(eq(habitsT.userId, userId), sql`${habitsT.freezesResetMonth} <> ${m}`));
}

// ---------- Tasks ----------

type TaskRow = typeof tasksT.$inferSelect;

function rowToTask(r: TaskRow): Task {
  return {
    id: r.id,
    title: r.title,
    priority: r.priority as Priority,
    estimatedMinutes: r.estimatedMinutes,
    scheduledFor: asIso(r.scheduledFor),
    status: r.status as Task["status"],
    completedAt: asIso(r.completedAt),
    pointsAwarded: r.pointsAwarded,
    createdAt: r.createdAt.toISOString(),
  };
}

export async function getDayState(userId: string) {
  const [u] = await db
    .select({ xp: users.xp, streak: users.streak, timezone: users.timezone })
    .from(users)
    .where(eq(users.id, userId));
  const tz = u?.timezone || "UTC";
  const today = localTodayStr(tz);
  const allRows = await db
    .select()
    .from(tasksT)
    .where(eq(tasksT.userId, userId))
    .orderBy(sql`${tasksT.scheduledFor} NULLS LAST`, tasksT.createdAt);
  // Today's view: only tasks scheduled for today, plus unscheduled tasks
  // that are still pending or were completed today. Past-day tasks roll
  // off automatically; they remain visible in the Analytics history.
  const rows = allRows.filter((r) => {
    const sched = localDateStr(r.scheduledFor, tz);
    if (sched) return sched === today;
    if (r.status === "pending") return true;
    return localDateStr(r.completedAt, tz) === today;
  });
  const ledger = await db
    .select()
    .from(rewardLedger)
    .where(eq(rewardLedger.userId, userId))
    .orderBy(desc(rewardLedger.createdAt))
    .limit(20);
  return {
    tasks: rows.map(rowToTask),
    xp: u?.xp ?? 0,
    streak: u?.streak ?? 0,
    ledger: ledger.map((l) => ({
      id: l.id,
      delta: l.delta,
      reason: l.reason,
      refId: l.refId ?? null,
      balanceAfter: l.balanceAfter,
      createdAt: l.createdAt.toISOString(),
    })),
  };
}

export async function createTask(
  userId: string,
  input: {
    title: string;
    priority: Priority;
    estimatedMinutes: number;
    scheduledFor: string | null;
  },
): Promise<Task> {
const [row] = await db
    .insert(tasksT)
    .values({
      userId,
      title: input.title.trim(),
      priority: input.priority,
      estimatedMinutes: input.estimatedMinutes,
      scheduledFor: input.scheduledFor ? new Date(input.scheduledFor) : null,
    })
    .returning();
  return rowToTask(row);
}

export async function completeTask(
  userId: string,
  taskId: string,
): Promise<{ task: Task; awarded: number } | null> {
  return await db.transaction(async (tx) => {
    const [task] = await tx
      .select()
      .from(tasksT)
      .where(and(eq(tasksT.id, taskId), eq(tasksT.userId, userId)))
      .limit(1);
    if (!task || task.status === "done") return null;
    const awarded = pointsFor(task.priority as Priority, task.estimatedMinutes);
    const completedAt = new Date();
    const [updated] = await tx
      .update(tasksT)
      .set({ status: "done", completedAt, pointsAwarded: awarded })
      .where(eq(tasksT.id, taskId))
      .returning();
    const [u] = await tx
      .update(users)
      .set({ xp: sql`${users.xp} + ${awarded}` })
      .where(eq(users.id, userId))
      .returning({ xp: users.xp });
    await tx.insert(rewardLedger).values({
      userId,
      delta: awarded,
      reason: "task_complete",
      refId: taskId,
      balanceAfter: u.xp,
    });
    await bumpDailyStreak(tx, userId);
    return { task: rowToTask(updated), awarded };
  });
}

export async function uncompleteTask(userId: string, taskId: string): Promise<Task | null> {
  return await db.transaction(async (tx) => {
    const [task] = await tx
      .select()
      .from(tasksT)
      .where(and(eq(tasksT.id, taskId), eq(tasksT.userId, userId)))
      .limit(1);
    if (!task || task.status !== "done") return null;
    const refund = task.pointsAwarded;
    const [updated] = await tx
      .update(tasksT)
      .set({ status: "pending", completedAt: null, pointsAwarded: 0 })
      .where(eq(tasksT.id, taskId))
      .returning();
    const [u] = await tx
      .update(users)
      .set({ xp: sql`GREATEST(0, ${users.xp} - ${refund})` })
      .where(eq(users.id, userId))
      .returning({ xp: users.xp });
    await tx.insert(rewardLedger).values({
      userId,
      delta: -refund,
      reason: "task_uncomplete",
      refId: taskId,
      balanceAfter: u.xp,
    });
    return rowToTask(updated);
  });
}

export async function deleteTask(userId: string, taskId: string): Promise<boolean> {
  const result = await db
    .delete(tasksT)
    .where(and(eq(tasksT.id, taskId), eq(tasksT.userId, userId)))
    .returning({ id: tasksT.id });
  return result.length > 0;
}

// ---------- Habits ----------

type HabitRow = typeof habitsT.$inferSelect;

function rowToHabit(r: HabitRow): Habit {
  return {
    id: r.id,
    title: r.title,
    cadence: r.cadence as Habit["cadence"],
    currentStreak: r.currentStreak,
    longestStreak: r.longestStreak,
    freezesRemaining: r.freezesRemaining,
    freezesResetMonth: r.freezesResetMonth,
    active: r.active,
    createdAt: r.createdAt.toISOString(),
  };
}

function isHabitDueOn(habit: Habit, isoDate: string): boolean {
  if (!habit.active) return false;
  if (habit.cadence.type === "daily") return true;
  return habit.cadence.days.includes(dayIndex(isoDate));
}

function calcStreak(habit: Habit, completionDates: Set<string>): { current: number; longest: number } {
  let cur = 0;
  let longest = habit.longestStreak;
  let stillCurrent = true;
  for (let i = 0; i < 365; i++) {
    const d = isoDateNDaysAgo(i);
    if (!isHabitDueOn(habit, d)) continue;
    if (completionDates.has(d)) {
      cur += 1;
      if (cur > longest) longest = cur;
    } else {
      if (i === 0) {
        // today not yet done — don't break the streak retroactively
      } else if (stillCurrent) {
        break;
      }
      stillCurrent = false;
    }
  }
  return { current: cur, longest };
}

export async function getHabits(userId: string) {
await rolloverFreezes(userId);
  const rows = await db
    .select()
    .from(habitsT)
    .where(and(eq(habitsT.userId, userId), eq(habitsT.active, true)))
    .orderBy(habitsT.createdAt);
  const completions = await db
    .select()
    .from(habitCompletions)
    .where(
      and(
        eq(habitCompletions.userId, userId),
        gte(habitCompletions.date, isoDateNDaysAgo(364)),
      ),
    );
  const today = todayIso();
  const habits = rows.map((r) => {
    const habit = rowToHabit(r);
    const myDates = new Set(
      completions.filter((c) => c.habitId === habit.id).map((c) => c.date),
    );
    const { current, longest } = calcStreak(habit, myDates);
    habit.currentStreak = current;
    habit.longestStreak = longest;
    const last30 = Array.from({ length: 30 }, (_, i) => {
      const d = isoDateNDaysAgo(29 - i);
      return { date: d, due: isHabitDueOn(habit, d), done: myDates.has(d) };
    });
    return {
      ...habit,
      dueToday: isHabitDueOn(habit, today),
      completedToday: myDates.has(today),
      last30,
    };
  });
  return { habits, totalActive: habits.length };
}

export async function createHabit(
  userId: string,
  input: { title: string; cadence: Habit["cadence"] },
): Promise<Habit> {
const [row] = await db
    .insert(habitsT)
    .values({
      userId,
      title: input.title.trim(),
      cadence: input.cadence,
      freezesResetMonth: monthIso(),
    })
    .returning();
  return rowToHabit(row);
}

const HABIT_POINTS = 20;

export async function toggleHabitToday(
  userId: string,
  habitId: string,
): Promise<{ done: boolean; awarded: number } | null> {
  return await db.transaction(async (tx) => {
    const [habit] = await tx
      .select()
      .from(habitsT)
      .where(and(eq(habitsT.id, habitId), eq(habitsT.userId, userId)))
      .limit(1);
    if (!habit) return null;
    const today = todayIso();
    const existing = await tx
      .select()
      .from(habitCompletions)
      .where(and(eq(habitCompletions.habitId, habitId), eq(habitCompletions.date, today)))
      .limit(1);
    if (existing.length > 0) {
      await tx
        .delete(habitCompletions)
        .where(and(eq(habitCompletions.habitId, habitId), eq(habitCompletions.date, today)));
      const [u] = await tx
        .update(users)
        .set({ xp: sql`GREATEST(0, ${users.xp} - ${HABIT_POINTS})` })
        .where(eq(users.id, userId))
        .returning({ xp: users.xp });
      await tx.insert(rewardLedger).values({
        userId,
        delta: -HABIT_POINTS,
        reason: "habit_uncomplete",
        refId: habitId,
        balanceAfter: u.xp,
      });
      return { done: false, awarded: -HABIT_POINTS };
    }
    await tx.insert(habitCompletions).values({
      userId,
      habitId,
      date: today,
      effortPct: "1.000",
    });
    const [u] = await tx
      .update(users)
      .set({ xp: sql`${users.xp} + ${HABIT_POINTS}` })
      .where(eq(users.id, userId))
      .returning({ xp: users.xp });
    await tx.insert(rewardLedger).values({
      userId,
      delta: HABIT_POINTS,
      reason: "habit_complete",
      refId: habitId,
      balanceAfter: u.xp,
    });
    await bumpDailyStreak(tx, userId);
    return { done: true, awarded: HABIT_POINTS };
  });
}

export async function deleteHabit(userId: string, habitId: string): Promise<boolean> {
  const result = await db
    .delete(habitsT)
    .where(and(eq(habitsT.id, habitId), eq(habitsT.userId, userId)))
    .returning({ id: habitsT.id });
  return result.length > 0;
}

export async function freezeHabit(
  userId: string,
  habitId: string,
): Promise<{ ok: boolean; message?: string }> {
  await rolloverFreezes(userId);
  const [habit] = await db
    .select()
    .from(habitsT)
    .where(and(eq(habitsT.id, habitId), eq(habitsT.userId, userId)))
    .limit(1);
  if (!habit) return { ok: false, message: "Habit not found" };
  if (habit.freezesRemaining <= 0) return { ok: false, message: "No freezes left this month" };
  const today = todayIso();
  const existing = await db
    .select()
    .from(habitCompletions)
    .where(and(eq(habitCompletions.habitId, habitId), eq(habitCompletions.date, today)))
    .limit(1);
  if (existing.length > 0) return { ok: false, message: "Already complete today" };
  await db.transaction(async (tx) => {
    await tx.insert(habitCompletions).values({
      userId,
      habitId,
      date: today,
      effortPct: "0.000",
    });
    await tx
      .update(habitsT)
      .set({ freezesRemaining: sql`${habitsT.freezesRemaining} - 1` })
      .where(eq(habitsT.id, habitId));
  });
  return { ok: true };
}

// ---------- Rewards ----------

export async function getRewardsState(userId: string) {
const [u] = await db.select({ xp: users.xp }).from(users).where(eq(users.id, userId));
  const reds = await db
    .select()
    .from(redemptionsT)
    .where(eq(redemptionsT.userId, userId))
    .orderBy(desc(redemptionsT.createdAt))
    .limit(12);
  const ledger = await db
    .select()
    .from(rewardLedger)
    .where(eq(rewardLedger.userId, userId))
    .orderBy(desc(rewardLedger.createdAt))
    .limit(15);
  const [{ totalEarned, totalSpent }] = await db
    .select({
      totalEarned: sql<number>`COALESCE(SUM(CASE WHEN ${rewardLedger.delta} > 0 THEN ${rewardLedger.delta} ELSE 0 END), 0)::int`,
      totalSpent: sql<number>`COALESCE(SUM(CASE WHEN ${rewardLedger.delta} < 0 AND ${rewardLedger.reason} = 'redeem' THEN -${rewardLedger.delta} ELSE 0 END), 0)::int`,
    })
    .from(rewardLedger)
    .where(eq(rewardLedger.userId, userId));
  const redemptions: Redemption[] = reds.map((r) => {
    const meta = REWARD_BY_ID.get(r.itemId);
    return {
      id: r.id,
      rewardId: r.itemId,
      rewardTitle: meta?.title ?? r.itemId,
      rewardEmoji: meta?.emoji ?? "🎁",
      cost: r.costPoints,
      status: r.status as Redemption["status"],
      createdAt: r.createdAt.toISOString(),
    };
  });
  return {
    catalog: REWARD_CATALOG,
    balance: u?.xp ?? 0,
    redemptions,
    ledger: ledger.map((l) => ({
      id: l.id,
      delta: l.delta,
      reason: l.reason,
      refId: l.refId ?? null,
      balanceAfter: l.balanceAfter,
      createdAt: l.createdAt.toISOString(),
    })),
    totalEarned: Number(totalEarned ?? 0),
    totalSpent: Number(totalSpent ?? 0),
  };
}

export async function redeemReward(
  userId: string,
  rewardId: string,
): Promise<{ ok: boolean; message?: string }> {
  const reward = REWARD_BY_ID.get(rewardId);
  if (!reward) return { ok: false, message: "Reward not found" };
  return await db.transaction(async (tx) => {
    const [u] = await tx
      .select({ xp: users.xp })
      .from(users)
      .where(eq(users.id, userId))
      .for("update");
    if (!u || u.xp < reward.cost) return { ok: false, message: "Not enough XP" };
    const [updatedUser] = await tx
      .update(users)
      .set({ xp: sql`${users.xp} - ${reward.cost}` })
      .where(eq(users.id, userId))
      .returning({ xp: users.xp });
    const [redemption] = await tx
      .insert(redemptionsT)
      .values({
        userId,
        itemId: reward.id,
        costPoints: reward.cost,
        status: reward.kind === "self" ? "fulfilled" : "pending",
      })
      .returning();
    await tx.insert(rewardLedger).values({
      userId,
      delta: -reward.cost,
      reason: "redeem",
      refId: redemption.id,
      balanceAfter: updatedUser.xp,
    });
    return { ok: true };
  });
}

// ---------- Analytics ----------

export async function getAnalytics(userId: string) {
const today = todayIso();
  const since30 = isoDateNDaysAgo(29);
  const since365 = isoDateNDaysAgo(364);

  const allTasks = await db
    .select({
      title: tasksT.title,
      priority: tasksT.priority,
      pointsAwarded: tasksT.pointsAwarded,
      status: tasksT.status,
      scheduledFor: tasksT.scheduledFor,
      completedAt: tasksT.completedAt,
    })
    .from(tasksT)
    .where(eq(tasksT.userId, userId));

  const completions = await db
    .select({ date: habitCompletions.date, habitId: habitCompletions.habitId })
    .from(habitCompletions)
    .where(and(eq(habitCompletions.userId, userId), gte(habitCompletions.date, since365)));

  // Build a per-day log of what the user actually completed in the last 14
  // days — task titles + habit names, plus XP earned. Used by the History
  // section on the Analytics page.
  const allHabits = await db
    .select({ id: habitsT.id, title: habitsT.title })
    .from(habitsT)
    .where(eq(habitsT.userId, userId));
  const habitTitleById = new Map(allHabits.map((h) => [h.id, h.title]));

  type DayLogEntry = {
    kind: "task" | "habit";
    title: string;
    points: number;
    priority?: number;
  };
  const historyMap = new Map<string, { entries: DayLogEntry[]; xp: number }>();
  for (let i = 13; i >= 0; i--) {
    historyMap.set(isoDateNDaysAgo(i), { entries: [], xp: 0 });
  }
  for (const t of allTasks) {
    if (t.status !== "done" || !t.completedAt) continue;
    const k = new Date(t.completedAt).toISOString().slice(0, 10);
    const bucket = historyMap.get(k);
    if (!bucket) continue;
    bucket.entries.push({
      kind: "task",
      title: t.title,
      points: t.pointsAwarded,
      priority: t.priority,
    });
    bucket.xp += t.pointsAwarded;
  }
  for (const c of completions) {
    const bucket = historyMap.get(c.date);
    if (!bucket) continue;
    bucket.entries.push({
      kind: "habit",
      title: habitTitleById.get(c.habitId) ?? "Habit",
      points: 20,
    });
    bucket.xp += 20;
  }
  const dailyHistory = Array.from(historyMap.entries())
    .map(([date, v]) => ({ date, ...v }))
    .sort((a, b) => b.date.localeCompare(a.date));

  const habitsRows = await db
    .select({ longestStreak: habitsT.longestStreak, title: habitsT.title })
    .from(habitsT)
    .where(eq(habitsT.userId, userId))
    .orderBy(desc(habitsT.longestStreak))
    .limit(1);

  const days: { date: string; total: number; done: number }[] = [];
  for (let i = 29; i >= 0; i--) {
    days.push({ date: isoDateNDaysAgo(i), total: 0, done: 0 });
  }
  const dayMap = new Map(days.map((d) => [d.date, d]));
  for (const t of allTasks) {
    const ref = t.completedAt ?? t.scheduledFor;
    if (!ref) continue;
    const iso = new Date(ref).toISOString().slice(0, 10);
    const bucket = dayMap.get(iso);
    if (!bucket) continue;
    bucket.total += 1;
    if (t.status === "done") bucket.done += 1;
  }
  const last30 = days.map((d) => ({ ...d, pct: d.total === 0 ? 0 : d.done / d.total }));

  const eligible = last30.filter((d) => d.total > 0);
  const consistency =
    eligible.length === 0
      ? 0
      : Math.round(
          (eligible.reduce((acc, d) => acc + d.pct, 0) / eligible.length) * 100,
        );

  const completionsByDate = new Map<string, number>();
  for (const t of allTasks) {
    if (t.status !== "done" || !t.completedAt) continue;
    const k = new Date(t.completedAt).toISOString().slice(0, 10);
    completionsByDate.set(k, (completionsByDate.get(k) ?? 0) + 1);
  }
  for (const c of completions) {
    completionsByDate.set(c.date, (completionsByDate.get(c.date) ?? 0) + 1);
  }
  const yearHeatmap: { date: string; pct: number }[] = [];
  for (let i = 364; i >= 0; i--) {
    const d = isoDateNDaysAgo(i);
    yearHeatmap.push({ date: d, pct: Math.min(1, (completionsByDate.get(d) ?? 0) / 5) });
  }

  const hours = Array.from({ length: 24 }, () => 0);
  for (const t of allTasks) {
    if (t.status === "done" && t.completedAt) {
      hours[new Date(t.completedAt).getHours()] += 1;
    }
  }

  const totalDone = allTasks.filter((t) => t.status === "done").length;
  const longestHabit = habitsRows[0];

  const insights: string[] = [];
  if (eligible.length >= 3) {
    const best = [...eligible].sort((a, b) => b.pct - a.pct)[0];
    if (best && best.pct > 0.5) {
      const dow = new Date(best.date + "T00:00:00").toLocaleDateString(undefined, { weekday: "long" });
      insights.push(`Your strongest day this month was ${dow} at ${Math.round(best.pct * 100)}% completion.`);
    }
  }
  const peakHour = hours.indexOf(Math.max(...hours));
  if (Math.max(...hours) >= 3) {
    insights.push(`You complete the most tasks around ${peakHour}:00 — try blocking deep work there.`);
  }
  if (longestHabit && longestHabit.longestStreak >= 3) {
    insights.push(`Your longest habit streak is ${longestHabit.longestStreak} days on "${longestHabit.title}".`);
  }
  if (insights.length === 0) {
    insights.push("Complete a few more tasks to unlock personal insights.");
  }

  return {
    consistency,
    last30,
    yearHeatmap,
    hours,
    totalDone,
    insights,
    today,
    since30,
    dailyHistory,
  };
}

// ---------- Settings ----------

export async function getSettings(userId: string) {
const [u] = await db.select().from(users).where(eq(users.id, userId));
  const [{ taskCount }] = await db
    .select({ taskCount: sql<number>`COUNT(*)::int` })
    .from(tasksT)
    .where(eq(tasksT.userId, userId));
  const [{ habitCount }] = await db
    .select({ habitCount: sql<number>`COUNT(*)::int` })
    .from(habitsT)
    .where(eq(habitsT.userId, userId));
  const [{ redeemCount }] = await db
    .select({ redeemCount: sql<number>`COUNT(*)::int` })
    .from(redemptionsT)
    .where(eq(redemptionsT.userId, userId));
  return {
    settings: {
      timezone: u?.timezone ?? "UTC",
      quietHoursStart: u?.quietHoursStart ?? 22,
      quietHoursEnd: u?.quietHoursEnd ?? 7,
      notifications: u?.notifications ?? true,
    },
    xp: u?.xp ?? 0,
    streak: u?.streak ?? 0,
    totalTasks: Number(taskCount ?? 0),
    totalHabits: Number(habitCount ?? 0),
    totalRedeemed: Number(redeemCount ?? 0),
  };
}

export async function updateSettings(userId: string, patch: Partial<Settings>): Promise<Settings> {
const updates: Record<string, unknown> = {};
  if (patch.timezone !== undefined) updates.timezone = patch.timezone;
  if (patch.quietHoursStart !== undefined) updates.quietHoursStart = patch.quietHoursStart;
  if (patch.quietHoursEnd !== undefined) updates.quietHoursEnd = patch.quietHoursEnd;
  if (patch.notifications !== undefined) updates.notifications = patch.notifications;
  if (Object.keys(updates).length > 0) {
    await db.update(users).set(updates).where(eq(users.id, userId));
  }
  const [u] = await db.select().from(users).where(eq(users.id, userId));
  return {
    timezone: u.timezone,
    quietHoursStart: u.quietHoursStart,
    quietHoursEnd: u.quietHoursEnd,
    notifications: u.notifications,
  };
}

export async function resetUser(userId: string): Promise<void> {
  // Wipe all activity for this user but keep their account + email/password.
  await db.transaction(async (tx) => {
    await tx.delete(redemptionsT).where(eq(redemptionsT.userId, userId));
    await tx.delete(rewardLedger).where(eq(rewardLedger.userId, userId));
    await tx.delete(habitCompletions).where(eq(habitCompletions.userId, userId));
    await tx.delete(habitsT).where(eq(habitsT.userId, userId));
    await tx.delete(tasksT).where(eq(tasksT.userId, userId));
    await tx
      .update(users)
      .set({ xp: 0, level: 1, streak: 0, lastCompletionDate: null })
      .where(eq(users.id, userId));
    const now = new Date();
    const at = (h: number, m = 0) => {
      const d = new Date(now);
      d.setHours(h, m, 0, 0);
      return d;
    };
    await tx.insert(tasksT).values([
      { userId, title: "Deep work — draft project brief", priority: 1, estimatedMinutes: 90, scheduledFor: at(9, 0) },
      { userId, title: "Workout (45m)", priority: 1, estimatedMinutes: 45, scheduledFor: at(7, 0) },
      { userId, title: "Inbox zero", priority: 2, estimatedMinutes: 20, scheduledFor: at(11, 30) },
      { userId, title: "Read 20 pages", priority: 2, estimatedMinutes: 25, scheduledFor: at(20, 0) },
      { userId, title: "Plan tomorrow", priority: 3, estimatedMinutes: 10, scheduledFor: at(21, 30) },
    ]);
    await tx.insert(habitsT).values([
      { userId, title: "Meditate 10 min", cadence: { type: "daily" }, freezesResetMonth: monthIso() },
      { userId, title: "No phone after 10pm", cadence: { type: "daily" }, freezesResetMonth: monthIso() },
      { userId, title: "Run", cadence: { type: "weekly", days: [1, 3, 5] }, freezesResetMonth: monthIso() },
    ]);
  });
}

// Avoid unused-import warnings for typed helpers we kept for future use.
void inArray;
