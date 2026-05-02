import { Flame, Sparkles, Zap, Trophy } from "lucide-react";
import { ProgressRing } from "@/components/ProgressRing";
import { TaskItem } from "@/components/TaskItem";
import { QuickAdd } from "@/components/QuickAdd";
import { AnimatedNumber } from "@/components/AnimatedNumber";
import { getDayState } from "@/store/memory";
import { levelForXp } from "@/lib/points";

export const dynamic = "force-dynamic";

export default function TodayPage() {
  const userId = process.env.DEV_USER_ID ?? "dev-user";
  const { tasks, xp, streak } = getDayState(userId);

  const today = new Date();
  const headline = today.toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  const totalEffort = tasks.reduce((s, t) => s + t.estimatedMinutes, 0);
  const doneEffort = tasks
    .filter((t) => t.status === "done")
    .reduce((s, t) => s + t.estimatedMinutes, 0);
  const pct = totalEffort === 0 ? 0 : doneEffort / totalEffort;
  const { level, into, toNext } = levelForXp(xp);
  const earnedToday = tasks
    .filter((t) => t.status === "done")
    .reduce((s, t) => s + t.pointsAwarded, 0);
  const remainingToLevel = Math.max(0, toNext - into);

  return (
    <main className="mx-auto max-w-xl px-4 pb-24 pt-8 sm:pt-10">
      <header className="mb-6 flex items-start justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-widest text-muted">Today</p>
          <h1 className="mt-1 text-2xl font-semibold leading-tight">{headline}</h1>
          <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-surface2 px-2.5 py-1 text-accent">
              <Flame size={14} />
              <span className="font-semibold tabular-nums">
                <AnimatedNumber value={streak} />
              </span>
              <span className="text-muted">day{streak === 1 ? "" : "s"}</span>
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-surface2 px-2.5 py-1 text-brand">
              <Zap size={14} />
              <span className="font-semibold">
                <AnimatedNumber value={xp} />
              </span>
              <span className="text-muted">xp</span>
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-surface2 px-2.5 py-1">
              <Sparkles size={14} className="text-accent" />
              <span className="font-semibold">Lv {level}</span>
            </span>
          </div>
        </div>
        <ProgressRing
          pct={pct}
          label={`${Math.round(pct * 100)}%`}
          sub={`${doneEffort}/${totalEffort}m`}
        />
      </header>

      <section className="mb-5">
        <div className="flex items-center justify-between text-xs">
          <span className="inline-flex items-center gap-1.5 text-muted">
            <Trophy size={12} className="text-accent" />
            <span className="font-medium text-text">{remainingToLevel} xp</span>
            to Lv {level + 1}
          </span>
          <span className="text-muted">
            <span className="font-semibold text-success">+{earnedToday}</span> earned today
          </span>
        </div>
        <div className="mt-2 h-2 overflow-hidden rounded-full bg-surface">
          <div
            className="h-full rounded-full bg-gradient-to-r from-brand via-pink-400 to-accent shadow-[0_0_12px_rgba(124,92,255,0.6)] transition-all duration-700"
            style={{ width: `${Math.min(100, (into / toNext) * 100)}%` }}
          />
        </div>
      </section>

      <section className="mb-4">
        <QuickAdd />
      </section>

      <section className="space-y-2">
        <h2 className="px-1 text-[11px] font-semibold uppercase tracking-widest text-muted">
          Today's quests · {tasks.filter((t) => t.status !== "done").length} open
        </h2>
        {tasks.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-surface/50 px-4 py-10 text-center text-sm text-muted">
            <div className="text-2xl">🌱</div>
            <div className="mt-2">A blank slate. What's the first move?</div>
            <div className="mt-1 text-xs">Type above and press ↵.</div>
          </div>
        ) : (
          tasks.map((t) => <TaskItem key={t.id} task={t} />)
        )}
      </section>

      <footer className="mt-10 text-center text-[11px] text-muted">
        DailyQuest · MVP scaffold · in-memory store (resets on server restart)
      </footer>
    </main>
  );
}
