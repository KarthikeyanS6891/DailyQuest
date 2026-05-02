"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, Zap, Clock, Flag, ArrowRight } from "lucide-react";
import { addTaskAction } from "@/app/actions";
import { parseQuickAdd } from "@/lib/parseQuickAdd";
import { pointsFor, type Priority } from "@/lib/points";
import { cn } from "@/lib/cn";

const PLACEHOLDERS = [
  "Try: Gym 7am 45m !1",
  "Try: Deep work on launch deck 90m",
  "Try: Read 20 pages 9pm 25m",
  "Try: Call mom 6:30pm 15m !2",
  "Type your next quest…",
];

const DURATIONS = [10, 15, 25, 45, 60, 90];

export function QuickAdd() {
  const [text, setText] = useState("");
  const [priority, setPriority] = useState<Priority>(2);
  const [minutes, setMinutes] = useState(25);
  const [time, setTime] = useState<string>("");
  const [phIdx, setPhIdx] = useState(0);
  const [pending, start] = useTransition();
  const [bursts, setBursts] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const id = setInterval(() => setPhIdx((i) => (i + 1) % PLACEHOLDERS.length), 3500);
    return () => clearInterval(id);
  }, []);

  const parsed = useMemo(() => parseQuickAdd(text), [text]);

  const effectivePriority: Priority = parsed.priority !== 2 ? parsed.priority : priority;
  const effectiveMinutes = parsed.estimatedMinutes !== 25 ? parsed.estimatedMinutes : minutes;
  const effectiveTime = parsed.time ?? time;
  const effectiveTitle = parsed.title || text.trim();

  const previewPoints = effectiveTitle ? pointsFor(effectivePriority, effectiveMinutes) : 0;

  const submit = () => {
    if (!effectiveTitle) return;
    const fd = new FormData();
    fd.set("title", effectiveTitle);
    fd.set("priority", String(effectivePriority));
    fd.set("estimatedMinutes", String(effectiveMinutes));
    if (effectiveTime) fd.set("time", effectiveTime);
    start(async () => {
      await addTaskAction(fd);
      setText("");
      setPriority(2);
      setMinutes(25);
      setTime("");
      setBursts((n) => n + 1);
      setTimeout(() => inputRef.current?.focus(), 50);
    });
  };

  return (
    <div className="relative">
      <motion.div
        layout
        className={cn(
          "relative overflow-hidden rounded-2xl border bg-gradient-to-br from-surface to-surface2 p-3 transition",
          effectiveTitle
            ? "border-brand/60 shadow-glow"
            : "border-border hover:border-white/20",
        )}
      >
        {!effectiveTitle ? (
          <motion.div
            aria-hidden
            initial={{ opacity: 0.4 }}
            animate={{ opacity: [0.25, 0.6, 0.25] }}
            transition={{ duration: 3.2, repeat: Infinity, ease: "easeInOut" }}
            className="pointer-events-none absolute -inset-1 -z-0 bg-[radial-gradient(60%_60%_at_20%_0%,rgba(124,92,255,0.18),transparent),radial-gradient(60%_60%_at_100%_100%,rgba(245,180,0,0.12),transparent)]"
          />
        ) : null}

        <div className="relative z-10 flex items-center gap-2">
          <motion.div
            animate={effectiveTitle ? { rotate: [0, 12, -8, 0], scale: [1, 1.15, 1] } : { rotate: 0 }}
            transition={{ duration: 0.6 }}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand/15 text-brand"
          >
            <Sparkles size={18} />
          </motion.div>

          <input
            ref={inputRef}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                submit();
              }
            }}
            placeholder={PLACEHOLDERS[phIdx]}
            className="min-w-0 flex-1 bg-transparent text-base outline-none placeholder:text-muted/70"
          />

          <AnimatePresence>
            {effectiveTitle ? (
              <motion.div
                key="reward"
                initial={{ opacity: 0, scale: 0.6, x: 6 }}
                animate={{ opacity: 1, scale: 1, x: 0 }}
                exit={{ opacity: 0, scale: 0.6 }}
                className="flex items-center gap-1 rounded-full bg-brand/15 px-2.5 py-1 text-sm font-semibold text-brand"
              >
                <Zap size={14} />+{previewPoints}
              </motion.div>
            ) : null}
          </AnimatePresence>

          <button
            onClick={submit}
            disabled={!effectiveTitle || pending}
            className={cn(
              "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl transition",
              effectiveTitle
                ? "bg-brand text-white hover:bg-brand-dim"
                : "bg-white/[0.04] text-muted",
              pending && "opacity-60",
            )}
            aria-label="Add quest"
          >
            <ArrowRight size={16} />
          </button>
        </div>

        <div className="relative z-10 mt-3 flex flex-wrap items-center gap-1.5">
          <span className="mr-1 inline-flex items-center gap-1 text-[11px] uppercase tracking-wider text-muted">
            <Flag size={11} /> priority
          </span>
          {[1, 2, 3].map((p) => {
            const active = effectivePriority === p;
            return (
              <button
                key={p}
                onClick={() => setPriority(p as Priority)}
                className={cn(
                  "rounded-full border px-2.5 py-1 text-xs font-semibold transition",
                  active
                    ? p === 1
                      ? "border-brand bg-brand text-white"
                      : p === 2
                        ? "border-white/30 bg-white/10 text-text"
                        : "border-white/10 bg-white/[0.04] text-muted"
                    : "border-border bg-transparent text-muted hover:border-white/20 hover:text-text",
                )}
              >
                P{p}
              </button>
            );
          })}

          <span className="mx-2 h-3 w-px bg-border" />

          <span className="mr-1 inline-flex items-center gap-1 text-[11px] uppercase tracking-wider text-muted">
            <Clock size={11} /> duration
          </span>
          {DURATIONS.map((m) => {
            const active = effectiveMinutes === m;
            return (
              <button
                key={m}
                onClick={() => setMinutes(m)}
                className={cn(
                  "rounded-full border px-2 py-1 text-xs transition",
                  active
                    ? "border-brand bg-brand/20 text-brand"
                    : "border-border text-muted hover:border-white/20 hover:text-text",
                )}
              >
                {m}m
              </button>
            );
          })}

          <span className="mx-2 h-3 w-px bg-border" />

          <input
            type="time"
            value={effectiveTime}
            onChange={(e) => setTime(e.target.value)}
            className="rounded-full border border-border bg-transparent px-2 py-1 text-xs text-muted outline-none focus:border-brand focus:text-text"
          />

          <span className="ml-auto text-[11px] text-muted">
            <kbd className="rounded border border-border bg-surface2 px-1.5 py-0.5 text-[10px]">↵</kbd> to add
          </span>
        </div>
      </motion.div>

      <AnimatePresence>
        {Array.from({ length: bursts }).slice(-1).map((_, i) => (
          <motion.div
            key={`burst-${bursts}-${i}`}
            initial={{ opacity: 0, scale: 0.4, y: 0 }}
            animate={{ opacity: [0, 1, 0], scale: [0.4, 1.6, 1.8], y: -28 }}
            transition={{ duration: 0.9 }}
            onAnimationComplete={() => setBursts(0)}
            className="pointer-events-none absolute left-1/2 top-2 -translate-x-1/2 text-2xl"
          >
            ✨
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
