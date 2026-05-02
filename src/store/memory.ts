import fs from "node:fs";
import path from "node:path";
import { nanoid } from "nanoid";
import { pointsFor, type Priority } from "@/lib/points";

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

export type HabitCompletion = {
  id: string;
  habitId: string;
  date: string;
  effortPct: number;
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

type UserState = {
  tasks: Task[];
  habits: Habit[];
  habitCompletions: HabitCompletion[];
  ledger: LedgerEntry[];
  redemptions: Redemption[];
  xp: number;
  streak: number;
  lastCompletionDate: string | null;
  settings: Settings;
};

declare global {
  // eslint-disable-next-line no-var
  var __dq_store: Map<string, UserState> | undefined;
}

const DATA_DIR = path.join(process.cwd(), ".data");
const DATA_FILE = path.join(DATA_DIR, "store.json");

function ensureLoaded(): Map<string, UserState> {
  if (globalThis.__dq_store) return globalThis.__dq_store;
  const map = new Map<string, UserState>();
  try {
    if (fs.existsSync(DATA_FILE)) {
      const raw = JSON.parse(fs.readFileSync(DATA_FILE, "utf8")) as Record<string, UserState>;
      for (const [k, v] of Object.entries(raw)) map.set(k, v);
    }
  } catch {
    /* ignore corrupt store */
  }
  globalThis.__dq_store = map;
  return map;
}

let writeTimer: NodeJS.Timeout | null = null;
function persist() {
  if (writeTimer) clearTimeout(writeTimer);
  writeTimer = setTimeout(() => {
    try {
      fs.mkdirSync(DATA_DIR, { recursive: true });
      const obj: Record<string, UserState> = {};
      for (const [k, v] of ensureLoaded()) obj[k] = v;
      fs.writeFileSync(DATA_FILE, JSON.stringify(obj, null, 2), "utf8");
    } catch {
      /* ignore */
    }
  }, 50);
}

const store = ensureLoaded();

function todayIso() {
  const d = new Date();
  return d.toISOString().slice(0, 10);
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

function ensureUser(userId: string): UserState {
  let s = store.get(userId);
  if (!s) {
    s = seed();
    store.set(userId, s);
    persist();
  }
  return s;
}

function seed(): UserState {
  const now = new Date();
  const at = (h: number, m = 0) => {
    const d = new Date(now);
    d.setHours(h, m, 0, 0);
    return d.toISOString();
  };
  const t = (
    title: string,
    priority: Priority,
    estimatedMinutes: number,
    scheduledFor: string | null,
  ): Task => ({
    id: nanoid(),
    title,
    priority,
    estimatedMinutes,
    scheduledFor,
    status: "pending",
    completedAt: null,
    pointsAwarded: 0,
    createdAt: new Date().toISOString(),
  });
  const h = (title: string, cadence: Habit["cadence"]): Habit => ({
    id: nanoid(),
    title,
    cadence,
    currentStreak: 0,
    longestStreak: 0,
    freezesRemaining: 2,
    freezesResetMonth: monthIso(),
    active: true,
    createdAt: new Date().toISOString(),
  });
  return {
    tasks: [
      t("Deep work — draft project brief", 1, 90, at(9, 0)),
      t("Workout (45m)", 1, 45, at(7, 0)),
      t("Inbox zero", 2, 20, at(11, 30)),
      t("Read 20 pages", 2, 25, at(20, 0)),
      t("Plan tomorrow", 3, 10, at(21, 30)),
    ],
    habits: [
      h("Meditate 10 min", { type: "daily" }),
      h("No phone after 10pm", { type: "daily" }),
      h("Run", { type: "weekly", days: [1, 3, 5] }),
    ],
    habitCompletions: [],
    ledger: [],
    redemptions: [],
    xp: 0,
    streak: 0,
    lastCompletionDate: null,
    settings: {
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC",
      quietHoursStart: 22,
      quietHoursEnd: 7,
      notifications: true,
    },
  };
}

// ---------- Tasks ----------

export function getDayState(userId: string) {
  const s = ensureUser(userId);
  const tasks = [...s.tasks].sort((a, b) => {
    const at = a.scheduledFor ?? "";
    const bt = b.scheduledFor ?? "";
    return at.localeCompare(bt);
  });
  return {
    tasks,
    xp: s.xp,
    streak: s.streak,
    ledger: s.ledger.slice(-20).reverse(),
  };
}

export function createTask(
  userId: string,
  input: {
    title: string;
    priority: Priority;
    estimatedMinutes: number;
    scheduledFor: string | null;
  },
): Task {
  const s = ensureUser(userId);
  const task: Task = {
    id: nanoid(),
    title: input.title.trim(),
    priority: input.priority,
    estimatedMinutes: input.estimatedMinutes,
    scheduledFor: input.scheduledFor,
    status: "pending",
    completedAt: null,
    pointsAwarded: 0,
    createdAt: new Date().toISOString(),
  };
  s.tasks.push(task);
  persist();
  return task;
}

function bumpDailyStreak(s: UserState) {
  const today = todayIso();
  if (s.lastCompletionDate !== today) {
    const yesterday = isoDateNDaysAgo(1);
    s.streak = s.lastCompletionDate === yesterday ? s.streak + 1 : 1;
    s.lastCompletionDate = today;
  }
}

export function completeTask(userId: string, taskId: string): { task: Task; awarded: number } | null {
  const s = ensureUser(userId);
  const task = s.tasks.find((t) => t.id === taskId);
  if (!task || task.status === "done") return null;
  const awarded = pointsFor(task.priority, task.estimatedMinutes);
  task.status = "done";
  task.completedAt = new Date().toISOString();
  task.pointsAwarded = awarded;
  s.xp += awarded;
  s.ledger.push({
    id: nanoid(),
    delta: awarded,
    reason: "task_complete",
    refId: task.id,
    balanceAfter: s.xp,
    createdAt: task.completedAt,
  });
  bumpDailyStreak(s);
  persist();
  return { task, awarded };
}

export function uncompleteTask(userId: string, taskId: string): Task | null {
  const s = ensureUser(userId);
  const task = s.tasks.find((t) => t.id === taskId);
  if (!task || task.status !== "done") return null;
  const refund = task.pointsAwarded;
  task.status = "pending";
  task.completedAt = null;
  task.pointsAwarded = 0;
  s.xp = Math.max(0, s.xp - refund);
  s.ledger.push({
    id: nanoid(),
    delta: -refund,
    reason: "task_uncomplete",
    refId: task.id,
    balanceAfter: s.xp,
    createdAt: new Date().toISOString(),
  });
  persist();
  return task;
}

export function deleteTask(userId: string, taskId: string): boolean {
  const s = ensureUser(userId);
  const before = s.tasks.length;
  s.tasks = s.tasks.filter((t) => t.id !== taskId);
  const ok = s.tasks.length < before;
  if (ok) persist();
  return ok;
}

// ---------- Habits ----------

function isHabitDueOn(habit: Habit, isoDate: string): boolean {
  if (!habit.active) return false;
  if (habit.cadence.type === "daily") return true;
  return habit.cadence.days.includes(dayIndex(isoDate));
}

function recalcHabitStreak(habit: Habit, completions: HabitCompletion[]): void {
  const myDates = new Set(
    completions.filter((c) => c.habitId === habit.id).map((c) => c.date),
  );
  let streak = 0;
  let longest = 0;
  let cur = 0;
  for (let i = 0; i < 365; i++) {
    const d = isoDateNDaysAgo(i);
    if (!isHabitDueOn(habit, d)) {
      continue;
    }
    if (myDates.has(d)) {
      cur += 1;
      if (i === streak) streak = cur;
      if (cur > longest) longest = cur;
    } else {
      if (i === 0) {
        cur = 0;
      } else {
        if (streak === 0) streak = 0;
        break;
      }
    }
  }
  habit.currentStreak = streak;
  habit.longestStreak = Math.max(habit.longestStreak, longest, streak);
}

function recalcAllStreaks(s: UserState) {
  for (const h of s.habits) recalcHabitStreak(h, s.habitCompletions);
}

function rolloverFreezes(s: UserState) {
  const m = monthIso();
  for (const h of s.habits) {
    if (h.freezesResetMonth !== m) {
      h.freezesRemaining = 2;
      h.freezesResetMonth = m;
    }
  }
}

export function getHabits(userId: string) {
  const s = ensureUser(userId);
  rolloverFreezes(s);
  recalcAllStreaks(s);
  const today = todayIso();
  const completedToday = new Set(
    s.habitCompletions.filter((c) => c.date === today).map((c) => c.habitId),
  );
  const habits = s.habits
    .filter((h) => h.active)
    .map((h) => ({
      ...h,
      dueToday: isHabitDueOn(h, today),
      completedToday: completedToday.has(h.id),
      last30: Array.from({ length: 30 }, (_, i) => {
        const d = isoDateNDaysAgo(29 - i);
        const due = isHabitDueOn(h, d);
        const done = s.habitCompletions.some((c) => c.habitId === h.id && c.date === d);
        return { date: d, due, done };
      }),
    }));
  return { habits, totalActive: habits.length };
}

export function createHabit(
  userId: string,
  input: { title: string; cadence: Habit["cadence"] },
): Habit {
  const s = ensureUser(userId);
  const h: Habit = {
    id: nanoid(),
    title: input.title.trim(),
    cadence: input.cadence,
    currentStreak: 0,
    longestStreak: 0,
    freezesRemaining: 2,
    freezesResetMonth: monthIso(),
    active: true,
    createdAt: new Date().toISOString(),
  };
  s.habits.push(h);
  persist();
  return h;
}

export function toggleHabitToday(userId: string, habitId: string): { done: boolean; awarded: number } | null {
  const s = ensureUser(userId);
  const habit = s.habits.find((h) => h.id === habitId);
  if (!habit) return null;
  const today = todayIso();
  const existingIdx = s.habitCompletions.findIndex(
    (c) => c.habitId === habitId && c.date === today,
  );
  if (existingIdx >= 0) {
    s.habitCompletions.splice(existingIdx, 1);
    const refund = 20;
    s.xp = Math.max(0, s.xp - refund);
    s.ledger.push({
      id: nanoid(),
      delta: -refund,
      reason: "habit_uncomplete",
      refId: habitId,
      balanceAfter: s.xp,
      createdAt: new Date().toISOString(),
    });
    recalcHabitStreak(habit, s.habitCompletions);
    persist();
    return { done: false, awarded: -refund };
  }
  s.habitCompletions.push({
    id: nanoid(),
    habitId,
    date: today,
    effortPct: 1,
    createdAt: new Date().toISOString(),
  });
  const awarded = 20;
  s.xp += awarded;
  s.ledger.push({
    id: nanoid(),
    delta: awarded,
    reason: "habit_complete",
    refId: habitId,
    balanceAfter: s.xp,
    createdAt: new Date().toISOString(),
  });
  recalcHabitStreak(habit, s.habitCompletions);
  bumpDailyStreak(s);
  persist();
  return { done: true, awarded };
}

export function deleteHabit(userId: string, habitId: string): boolean {
  const s = ensureUser(userId);
  const before = s.habits.length;
  s.habits = s.habits.filter((h) => h.id !== habitId);
  const ok = s.habits.length < before;
  if (ok) {
    s.habitCompletions = s.habitCompletions.filter((c) => c.habitId !== habitId);
    persist();
  }
  return ok;
}

export function freezeHabit(userId: string, habitId: string): { ok: boolean; message?: string } {
  const s = ensureUser(userId);
  const habit = s.habits.find((h) => h.id === habitId);
  if (!habit) return { ok: false, message: "Habit not found" };
  rolloverFreezes(s);
  if (habit.freezesRemaining <= 0)
    return { ok: false, message: "No freezes left this month" };
  const today = todayIso();
  if (s.habitCompletions.some((c) => c.habitId === habitId && c.date === today))
    return { ok: false, message: "Already complete today" };
  s.habitCompletions.push({
    id: nanoid(),
    habitId,
    date: today,
    effortPct: 0,
    createdAt: new Date().toISOString(),
  });
  habit.freezesRemaining -= 1;
  recalcHabitStreak(habit, s.habitCompletions);
  persist();
  return { ok: true };
}

// ---------- Rewards ----------

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

export function getRewardsState(userId: string) {
  const s = ensureUser(userId);
  const recent = [...s.redemptions].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 12);
  const ledger = [...s.ledger].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 15);
  const totalEarned = s.ledger.filter((l) => l.delta > 0).reduce((acc, l) => acc + l.delta, 0);
  const totalSpent = s.ledger.filter((l) => l.delta < 0 && l.reason === "redeem").reduce((acc, l) => acc - l.delta, 0);
  return { catalog: REWARD_CATALOG, balance: s.xp, redemptions: recent, ledger, totalEarned, totalSpent };
}

export function redeemReward(userId: string, rewardId: string): { ok: boolean; message?: string } {
  const s = ensureUser(userId);
  const reward = REWARD_CATALOG.find((r) => r.id === rewardId);
  if (!reward) return { ok: false, message: "Reward not found" };
  if (s.xp < reward.cost) return { ok: false, message: "Not enough XP" };
  s.xp -= reward.cost;
  const redemption: Redemption = {
    id: nanoid(),
    rewardId: reward.id,
    rewardTitle: reward.title,
    rewardEmoji: reward.emoji,
    cost: reward.cost,
    status: reward.kind === "self" ? "fulfilled" : "pending",
    createdAt: new Date().toISOString(),
  };
  s.redemptions.push(redemption);
  s.ledger.push({
    id: nanoid(),
    delta: -reward.cost,
    reason: "redeem",
    refId: redemption.id,
    balanceAfter: s.xp,
    createdAt: redemption.createdAt,
  });
  persist();
  return { ok: true };
}

// ---------- Analytics ----------

export function getAnalytics(userId: string) {
  const s = ensureUser(userId);
  const today = todayIso();
  const days: { date: string; total: number; done: number }[] = [];
  for (let i = 29; i >= 0; i--) {
    const d = isoDateNDaysAgo(i);
    days.push({ date: d, total: 0, done: 0 });
  }
  const dayMap = new Map(days.map((d) => [d.date, d]));
  for (const t of s.tasks) {
    if (!t.scheduledFor && !t.completedAt) continue;
    const iso = (t.completedAt ?? t.scheduledFor ?? "").slice(0, 10);
    const bucket = dayMap.get(iso);
    if (!bucket) continue;
    bucket.total += 1;
    if (t.status === "done") bucket.done += 1;
  }
  const last30 = days.map((d) => ({
    ...d,
    pct: d.total === 0 ? 0 : d.done / d.total,
  }));

  const eligible = last30.filter((d) => d.total > 0);
  const consistency = eligible.length === 0 ? 0 : Math.round(
    (eligible.reduce((acc, d) => acc + d.pct, 0) / eligible.length) * 100,
  );

  const yearHeatmap: { date: string; pct: number }[] = [];
  const completionsByDate = new Map<string, number>();
  for (const t of s.tasks) {
    if (t.status !== "done" || !t.completedAt) continue;
    const k = t.completedAt.slice(0, 10);
    completionsByDate.set(k, (completionsByDate.get(k) ?? 0) + 1);
  }
  for (const c of s.habitCompletions) {
    completionsByDate.set(c.date, (completionsByDate.get(c.date) ?? 0) + 1);
  }
  for (let i = 364; i >= 0; i--) {
    const d = isoDateNDaysAgo(i);
    const cnt = completionsByDate.get(d) ?? 0;
    const pct = Math.min(1, cnt / 5);
    yearHeatmap.push({ date: d, pct });
  }

  const hours = Array.from({ length: 24 }, () => 0);
  for (const t of s.tasks) {
    if (t.status === "done" && t.completedAt) {
      const h = new Date(t.completedAt).getHours();
      hours[h] += 1;
    }
  }

  const totalDone = s.tasks.filter((t) => t.status === "done").length;
  const longestHabit = [...s.habits].sort((a, b) => b.longestStreak - a.longestStreak)[0];

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
  };
}

// ---------- Settings ----------

export function getSettings(userId: string) {
  const s = ensureUser(userId);
  return {
    settings: s.settings,
    xp: s.xp,
    streak: s.streak,
    totalTasks: s.tasks.length,
    totalHabits: s.habits.length,
    totalRedeemed: s.redemptions.length,
  };
}

export function updateSettings(userId: string, patch: Partial<Settings>): Settings {
  const s = ensureUser(userId);
  s.settings = { ...s.settings, ...patch };
  persist();
  return s.settings;
}

export function resetUser(userId: string): void {
  store.set(userId, seed());
  persist();
}
