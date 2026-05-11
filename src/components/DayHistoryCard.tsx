"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, Repeat, CheckCircle2, Zap } from "lucide-react";
import { cn } from "@/lib/cn";

export type DayHistoryEntry = {
  kind: "task" | "habit";
  title: string;
  points: number;
  priority?: number;
};

export type DayHistory = {
  date: string;
  entries: DayHistoryEntry[];
  xp: number;
};

// Today's date in the user's timezone. Without this, browsers across
// timezones disagree past midnight: e.g. an IST user at 01:00 still sees
// "Yesterday" labeled as Today because `new Date().toISOString()` uses UTC.
function todayInTz(tz: string) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

function yesterdayInTz(tz: string) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(Date.now() - 86_400_000));
}

function formatLabel(iso: string, tz: string) {
  if (iso === todayInTz(tz)) return "Today";
  if (iso === yesterdayInTz(tz)) return "Yesterday";
  // The `iso` (YYYY-MM-DD) already represents a specific calendar day,
  // so parse as a local-time wall-clock and format the weekday/month/day.
  const d = new Date(iso + "T00:00:00");
  return d.toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

export function DayHistoryCard({
  day,
  timezone,
}: {
  day: DayHistory;
  timezone: string;
}) {
  const [open, setOpen] = useState(false);
  const count = day.entries.length;
  const isEmpty = count === 0;
  const taskCount = day.entries.filter((e) => e.kind === "task").length;
  const habitCount = day.entries.filter((e) => e.kind === "habit").length;
  const isToday = day.date === todayInTz(timezone);

  return (
    <motion.div
      layout
      className={cn(
        "rounded-xl border bg-surface transition",
        isToday ? "border-brand/40" : "border-border",
        isEmpty && "opacity-60",
      )}
    >
      <button
        onClick={() => !isEmpty && setOpen((v) => !v)}
        disabled={isEmpty}
        className={cn(
          "flex w-full items-center gap-3 px-3 py-2.5 text-left transition",
          !isEmpty && "hover:bg-tint/[0.02]",
        )}
      >
        <div className="flex flex-col items-center justify-center rounded-lg bg-surface2 px-2.5 py-1 text-center">
          <span className="text-[10px] uppercase tracking-wider text-muted">
            {new Date(day.date + "T00:00:00").toLocaleDateString(undefined, {
              month: "short",
            })}
          </span>
          <span className="text-base font-bold leading-none">
            {new Date(day.date + "T00:00:00").getDate()}
          </span>
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 text-sm font-medium">
            {formatLabel(day.date, timezone)}
            {isToday ? (
              <span className="rounded-full bg-brand/15 px-1.5 py-0.5 text-[10px] font-semibold text-brand">
                live
              </span>
            ) : null}
          </div>
          <div className="mt-0.5 flex items-center gap-2 text-[11px] text-muted">
            {isEmpty ? (
              <span>No quests completed</span>
            ) : (
              <>
                <span className="inline-flex items-center gap-1">
                  <CheckCircle2 size={11} className="text-success" /> {taskCount}
                </span>
                {habitCount > 0 ? (
                  <span className="inline-flex items-center gap-1">
                    <Repeat size={11} className="text-brand" /> {habitCount}
                  </span>
                ) : null}
              </>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {!isEmpty ? (
            <span className="rounded-full bg-brand/15 px-2 py-1 text-xs font-bold text-brand">
              <Zap size={10} className="-mt-0.5 mr-0.5 inline" />
              {day.xp}
            </span>
          ) : null}
          {!isEmpty ? (
            <ChevronDown
              size={16}
              className={cn(
                "text-muted transition",
                open && "rotate-180 text-text",
              )}
            />
          ) : null}
        </div>
      </button>

      <AnimatePresence initial={false}>
        {open && !isEmpty ? (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="overflow-hidden border-t border-border"
          >
            <ul className="divide-y divide-border/60">
              {day.entries.map((e, i) => (
                <li
                  key={i}
                  className="flex items-center gap-2 px-3 py-2 text-[13px]"
                >
                  {e.kind === "task" ? (
                    <CheckCircle2 size={13} className="shrink-0 text-success" />
                  ) : (
                    <Repeat size={13} className="shrink-0 text-brand" />
                  )}
                  <span className="min-w-0 flex-1 truncate">{e.title}</span>
                  <span className="shrink-0 rounded-full bg-tint/[0.04] px-1.5 py-0.5 text-[10px] font-semibold text-muted">
                    +{e.points}
                  </span>
                </li>
              ))}
            </ul>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </motion.div>
  );
}
