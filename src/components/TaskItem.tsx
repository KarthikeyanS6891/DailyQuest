"use client";

import { useState, useTransition } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Check, Trash2, Undo2 } from "lucide-react";
import {
  completeTaskAction,
  deleteTaskAction,
  uncompleteTaskAction,
} from "@/app/actions";
import { Confetti } from "./Confetti";
import { cn } from "@/lib/cn";
import { pointsFor, type Priority } from "@/lib/points";

export type ClientTask = {
  id: string;
  title: string;
  priority: Priority;
  estimatedMinutes: number;
  scheduledFor: string | null;
  status: "pending" | "done" | "skipped";
  pointsAwarded: number;
};

const priorityStyles: Record<Priority, string> = {
  1: "bg-brand/15 text-brand border-brand/30",
  2: "bg-white/5 text-text border-white/10",
  3: "bg-white/[0.03] text-muted border-white/5",
};

const priorityLabel: Record<Priority, string> = { 1: "P1", 2: "P2", 3: "P3" };

function formatTime(iso: string | null) {
  if (!iso) return "Anytime";
  const d = new Date(iso);
  return d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

export function TaskItem({ task }: { task: ClientTask }) {
  const [pending, start] = useTransition();
  const [celebrate, setCelebrate] = useState(false);
  const done = task.status === "done";
  const willEarn = pointsFor(task.priority, task.estimatedMinutes);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "group relative flex items-center gap-3 overflow-hidden rounded-xl border border-border bg-surface px-3 py-3 transition",
        done && "opacity-60",
      )}
    >
      <Confetti show={celebrate} originX={6} originY={50} />
      <AnimatePresence>
        {celebrate ? (
          <motion.div
            initial={{ opacity: 0, x: 16, scale: 0.6 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.6 }}
            className="pointer-events-none absolute right-3 top-1/2 z-10 -translate-y-1/2 rounded-full bg-success/20 px-2 py-1 text-xs font-bold text-success"
          >
            +{willEarn} XP
          </motion.div>
        ) : null}
      </AnimatePresence>
      <button
        aria-label={done ? "Mark incomplete" : "Mark complete"}
        disabled={pending}
        onClick={() => {
          if (!done) {
            setCelebrate(true);
            setTimeout(() => setCelebrate(false), 900);
          }
          start(async () => {
            if (done) await uncompleteTaskAction(task.id);
            else await completeTaskAction(task.id);
          });
        }}
        className={cn(
          "relative flex h-7 w-7 shrink-0 items-center justify-center rounded-full border transition active:scale-90",
          done
            ? "border-success bg-success text-black"
            : "border-border hover:border-brand hover:shadow-glow hover:scale-110",
        )}
      >
        {done ? <Check size={15} strokeWidth={3} /> : null}
        {!done ? (
          <span className="absolute inset-0 rounded-full bg-brand/30 opacity-0 transition group-hover:opacity-100 group-hover:animate-ping" />
        ) : null}
      </button>

      <div className="min-w-0 flex-1">
        <div
          className={cn(
            "truncate text-sm font-medium",
            done && "line-through decoration-muted",
          )}
        >
          {task.title}
        </div>
        <div className="mt-0.5 flex items-center gap-2 text-[11px] text-muted">
          <span>{formatTime(task.scheduledFor)}</span>
          <span className="text-border">•</span>
          <span>{task.estimatedMinutes}m</span>
          <span className="text-border">•</span>
          <span
            className={cn(
              "rounded-full border px-1.5 py-0.5 text-[10px] font-semibold",
              priorityStyles[task.priority],
            )}
          >
            {priorityLabel[task.priority]}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <span
          className={cn(
            "rounded-full px-2 py-1 text-[11px] font-semibold tabular-nums",
            done ? "bg-success/15 text-success" : "bg-white/[0.04] text-muted",
          )}
        >
          {done ? `+${task.pointsAwarded}` : `+${willEarn}`}
        </span>
        <button
          aria-label={done ? "Undo complete" : "Delete task"}
          disabled={pending}
          onClick={() =>
            start(async () => {
              if (done) await uncompleteTaskAction(task.id);
              else await deleteTaskAction(task.id);
            })
          }
          className="rounded-md p-1.5 text-muted opacity-0 transition hover:bg-white/5 hover:text-text group-hover:opacity-100"
        >
          {done ? <Undo2 size={14} /> : <Trash2 size={14} />}
        </button>
      </div>
    </motion.div>
  );
}
