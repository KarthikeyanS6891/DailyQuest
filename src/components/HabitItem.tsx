"use client";

import { useState, useTransition } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Check, Flame, Snowflake, Trash2 } from "lucide-react";
import {
  toggleHabitAction,
  deleteHabitAction,
  freezeHabitAction,
} from "@/app/(app)/habits/actions";
import { Confetti } from "./Confetti";
import { cn } from "@/lib/cn";

export type ClientHabit = {
  id: string;
  title: string;
  cadence: { type: "daily" } | { type: "weekly"; days: number[] };
  currentStreak: number;
  longestStreak: number;
  freezesRemaining: number;
  dueToday: boolean;
  completedToday: boolean;
  last30: { date: string; due: boolean; done: boolean }[];
};

const DAYS = ["S", "M", "T", "W", "T", "F", "S"];

function cadenceLabel(c: ClientHabit["cadence"]) {
  if (c.type === "daily") return "Every day";
  return c.days.map((d) => DAYS[d]).join(" · ");
}

export function HabitItem({ habit }: { habit: ClientHabit }) {
  const [pending, start] = useTransition();
  const [celebrate, setCelebrate] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "group relative overflow-hidden rounded-2xl border bg-surface p-4 transition",
        habit.completedToday ? "border-success/40" : "border-border",
      )}
    >
      <Confetti show={celebrate} originX={12} originY={50} />
      <div className="flex items-center gap-3">
        <button
          aria-label={habit.completedToday ? "Unmark today" : "Mark today done"}
          disabled={pending}
          onClick={() => {
            if (!habit.completedToday) {
              setCelebrate(true);
              setTimeout(() => setCelebrate(false), 900);
            }
            start(async () => {
              await toggleHabitAction(habit.id);
            });
          }}
          className={cn(
            "flex h-9 w-9 shrink-0 items-center justify-center rounded-full border transition active:scale-90",
            habit.completedToday
              ? "border-success bg-success text-black"
              : habit.dueToday
                ? "border-brand/50 hover:border-brand hover:shadow-glow"
                : "border-border opacity-60",
          )}
        >
          {habit.completedToday ? <Check size={16} strokeWidth={3} /> : null}
        </button>
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-semibold">{habit.title}</div>
          <div className="mt-0.5 text-[11px] text-muted">{cadenceLabel(habit.cadence)}</div>
        </div>
        <div className="flex flex-col items-end gap-1">
          <span className={cn(
            "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold",
            habit.currentStreak > 0 ? "bg-accent/15 text-accent" : "bg-white/[0.04] text-muted",
          )}>
            <Flame size={11} /> {habit.currentStreak}
          </span>
          <span className="text-[10px] text-muted">best {habit.longestStreak}</span>
        </div>
      </div>

      <div className="mt-3 flex items-center gap-[3px]">
        {habit.last30.map((d, i) => (
          <div
            key={i}
            title={d.date}
            className={cn(
              "h-3 flex-1 rounded-sm transition",
              !d.due
                ? "bg-white/[0.025]"
                : d.done
                  ? "bg-gradient-to-t from-brand to-accent"
                  : "bg-white/[0.06]",
            )}
          />
        ))}
      </div>

      <div className="mt-3 flex items-center justify-between">
        <button
          onClick={() =>
            start(async () => {
              const res = await freezeHabitAction(habit.id);
              if (!res.ok && res.message) setMsg(res.message);
              else setMsg("Streak frozen for today ❄️");
              setTimeout(() => setMsg(null), 2200);
            })
          }
          disabled={pending || habit.completedToday || habit.freezesRemaining <= 0}
          className={cn(
            "inline-flex items-center gap-1 rounded-full border border-border px-2 py-1 text-[11px] text-muted transition hover:border-white/20 hover:text-text",
            (habit.completedToday || habit.freezesRemaining <= 0) && "opacity-40",
          )}
        >
          <Snowflake size={11} /> Freeze · {habit.freezesRemaining} left
        </button>
        <button
          onClick={() => start(async () => { await deleteHabitAction(habit.id); })}
          disabled={pending}
          className="rounded-md p-1.5 text-muted opacity-0 transition hover:bg-white/5 hover:text-danger group-hover:opacity-100"
          aria-label="Delete habit"
        >
          <Trash2 size={13} />
        </button>
      </div>

      <AnimatePresence>
        {msg ? (
          <motion.div
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            className="mt-2 text-[11px] text-muted"
          >
            {msg}
          </motion.div>
        ) : null}
      </AnimatePresence>
    </motion.div>
  );
}
