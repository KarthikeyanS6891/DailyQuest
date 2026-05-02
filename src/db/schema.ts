import {
  pgTable,
  uuid,
  text,
  integer,
  smallint,
  timestamp,
  date,
  boolean,
  jsonb,
  numeric,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  id: text("id").primaryKey(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash"),
  timezone: text("timezone").notNull().default("UTC"),
  level: integer("level").notNull().default(1),
  xp: integer("xp").notNull().default(0),
  streak: integer("streak").notNull().default(0),
  lastCompletionDate: date("last_completion_date"),
  quietHoursStart: smallint("quiet_hours_start").notNull().default(22),
  quietHoursEnd: smallint("quiet_hours_end").notNull().default(7),
  notifications: boolean("notifications").notNull().default(true),
  subscriptionTier: text("subscription_tier").notNull().default("free"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const tasks = pgTable(
  "tasks",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    notes: text("notes"),
    priority: smallint("priority").notNull().default(2),
    estimatedMinutes: integer("estimated_minutes").notNull().default(15),
    scheduledFor: timestamp("scheduled_for", { withTimezone: true }),
    habitId: uuid("habit_id"),
    status: text("status").notNull().default("pending"),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    pointsAwarded: integer("points_awarded").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    byUserDate: index("tasks_user_scheduled_idx").on(t.userId, t.scheduledFor),
    byUserStatus: index("tasks_user_status_idx").on(t.userId, t.status, t.scheduledFor),
  }),
);

export const habits = pgTable("habits", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  cadence: jsonb("cadence").notNull(),
  currentStreak: integer("current_streak").notNull().default(0),
  longestStreak: integer("longest_streak").notNull().default(0),
  freezesRemaining: integer("freezes_remaining").notNull().default(2),
  freezesResetMonth: text("freezes_reset_month").notNull(),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const habitCompletions = pgTable(
  "habit_completions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    habitId: uuid("habit_id").notNull().references(() => habits.id, { onDelete: "cascade" }),
    userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    date: date("date").notNull(),
    effortPct: numeric("effort_pct", { precision: 4, scale: 3 }).notNull().default("1.000"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    uniqHabitDate: uniqueIndex("habit_completions_habit_date_uniq").on(t.habitId, t.date),
  }),
);

export const rewardLedger = pgTable(
  "reward_ledger",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    delta: integer("delta").notNull(),
    reason: text("reason").notNull(),
    refId: uuid("ref_id"),
    balanceAfter: integer("balance_after").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    byUser: index("reward_ledger_user_idx").on(t.userId, t.createdAt),
  }),
);

export const redemptions = pgTable("redemptions", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  itemId: text("item_id").notNull(),
  costPoints: integer("cost_points").notNull(),
  status: text("status").notNull().default("pending"),
  externalId: text("external_id"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
