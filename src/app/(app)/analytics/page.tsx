import { CalendarDays, Lightbulb, Target, Trophy } from "lucide-react";
import { getAnalytics } from "@/store/memory";
import { Heatmap } from "@/components/Heatmap";
import { HourHistogram } from "@/components/HourHistogram";
import { DayHistoryCard } from "@/components/DayHistoryCard";
import { requireUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function AnalyticsPage() {
  const { id: userId } = await requireUser();
  const a = await getAnalytics(userId);

  const weekdayShort = ["S", "M", "T", "W", "T", "F", "S"];

  const last7 = a.last30.slice(-7);
  const weeklyAvg = last7.length === 0
    ? 0
    : Math.round(
        (last7.filter((d) => d.total > 0).reduce((acc, d) => acc + d.pct, 0) /
          Math.max(1, last7.filter((d) => d.total > 0).length)) * 100,
      );

  return (
    <main className="mx-auto max-w-xl px-4 pb-24 pt-8 sm:pt-10">
      <header className="mb-5">
        <p className="text-xs uppercase tracking-widest text-muted">Analytics</p>
        <h1 className="mt-1 text-2xl font-semibold leading-tight">How you actually work</h1>
      </header>

      <section className="mb-5 grid grid-cols-3 gap-3">
        <div className="rounded-2xl border border-brand/30 bg-gradient-to-br from-brand/15 to-surface p-4">
          <div className="flex items-center gap-1.5 text-[11px] uppercase tracking-wider text-muted">
            <Target size={11} /> Consistency
          </div>
          <div className="mt-1 flex items-end gap-1">
            <span className="text-3xl font-bold tabular-nums">{a.consistency}</span>
            <span className="mb-1 text-xs text-muted">/ 100</span>
          </div>
        </div>
        <div className="rounded-2xl border border-border bg-surface p-4">
          <div className="text-[11px] uppercase tracking-wider text-muted">7-day avg</div>
          <div className="mt-1 text-3xl font-bold tabular-nums">{weeklyAvg}%</div>
        </div>
        <div className="rounded-2xl border border-border bg-surface p-4">
          <div className="flex items-center gap-1.5 text-[11px] uppercase tracking-wider text-muted">
            <Trophy size={11} /> Total done
          </div>
          <div className="mt-1 text-3xl font-bold tabular-nums">{a.totalDone}</div>
        </div>
      </section>

      <section className="mb-5 rounded-2xl border border-border bg-surface p-4">
        <h2 className="mb-3 text-sm font-semibold">Last 30 days</h2>
        <div className="flex h-24 items-end gap-1">
          {a.last30.map((d, i) => {
            const pct = d.total > 0 ? d.pct : 0;
            const today = i === a.last30.length - 1;
            return (
              <div key={d.date} className="flex flex-1 flex-col items-center">
                <div
                  className={
                    "w-full rounded-sm transition-all duration-500 " +
                    (today
                      ? "bg-gradient-to-t from-brand to-accent"
                      : pct > 0
                        ? "bg-brand/40"
                        : d.total > 0
                          ? "bg-danger/20"
                          : "bg-tint/[0.04]")
                  }
                  style={{ height: `${Math.max(3, pct * 100)}%` }}
                  title={`${d.date} — ${d.done}/${d.total}`}
                />
              </div>
            );
          })}
        </div>
        <div className="mt-2 flex justify-between text-[10px] text-muted">
          <span>30d ago</span>
          <span>today</span>
        </div>
      </section>

      <section className="mb-5 rounded-2xl border border-border bg-surface p-4">
        <h2 className="mb-3 text-sm font-semibold">Activity heatmap (year)</h2>
        <Heatmap data={a.yearHeatmap} />
        <div className="mt-3 flex items-center justify-between text-[10px] text-muted">
          <span>less</span>
          <div className="flex gap-1">
            <span className="h-2.5 w-2.5 rounded-sm bg-tint/[0.04]" />
            <span className="h-2.5 w-2.5 rounded-sm bg-brand/30" />
            <span className="h-2.5 w-2.5 rounded-sm bg-brand/50" />
            <span className="h-2.5 w-2.5 rounded-sm bg-brand/70" />
            <span className="h-2.5 w-2.5 rounded-sm bg-gradient-to-br from-brand to-accent" />
          </div>
          <span>more</span>
        </div>
      </section>

      <section className="mb-5 rounded-2xl border border-border bg-surface p-4">
        <h2 className="mb-3 text-sm font-semibold">When you're most productive</h2>
        <HourHistogram hours={a.hours} />
      </section>

      <section className="mb-5">
        <h2 className="mb-2 flex items-center gap-1.5 px-1 text-[11px] font-semibold uppercase tracking-widest text-muted">
          <CalendarDays size={12} /> Recent days
        </h2>
        <div className="space-y-1.5">
          {a.dailyHistory.map((day) => (
            <DayHistoryCard key={day.date} day={day} timezone={a.timezone} />
          ))}
        </div>
      </section>

      <section className="rounded-2xl border border-accent/30 bg-gradient-to-br from-accent/10 to-surface p-4">
        <div className="mb-2 flex items-center gap-1.5 text-[11px] uppercase tracking-wider text-accent">
          <Lightbulb size={12} /> Insights
        </div>
        <ul className="space-y-1.5 text-sm">
          {a.insights.map((line, i) => (
            <li key={i} className="text-text/90">• {line}</li>
          ))}
        </ul>
      </section>

      <p className="mt-3 text-center text-[10px] text-muted">{weekdayShort.join(" ")}</p>
    </main>
  );
}
