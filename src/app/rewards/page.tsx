import { Coins, TrendingUp, History } from "lucide-react";
import { getRewardsState } from "@/store/memory";
import { RewardCard } from "@/components/RewardCard";

export const dynamic = "force-dynamic";

function formatRelative(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}

export default function RewardsPage() {
  const userId = process.env.DEV_USER_ID ?? "dev-user";
  const { catalog, balance, redemptions, ledger, totalEarned, totalSpent } = getRewardsState(userId);

  const sorted = [...catalog].sort((a, b) => {
    const aff = (n: number) => (balance >= n ? 0 : 1);
    return aff(a.cost) - aff(b.cost) || a.cost - b.cost;
  });

  return (
    <main className="mx-auto max-w-xl px-4 pb-24 pt-8 sm:pt-10">
      <header className="mb-5">
        <p className="text-xs uppercase tracking-widest text-muted">Rewards</p>
        <h1 className="mt-1 text-2xl font-semibold leading-tight">Spend what you earned</h1>
      </header>

      <section className="relative mb-5 overflow-hidden rounded-2xl border border-brand/30 bg-gradient-to-br from-brand/15 via-surface to-accent/10 p-5">
        <div className="absolute -right-6 -top-6 h-32 w-32 rounded-full bg-brand/20 blur-2xl" />
        <div className="relative flex items-end justify-between">
          <div>
            <p className="text-[11px] uppercase tracking-widest text-muted">Balance</p>
            <div className="mt-1 flex items-end gap-2">
              <span className="text-4xl font-bold tabular-nums">{balance}</span>
              <span className="mb-1 text-sm text-muted">xp</span>
            </div>
          </div>
          <div className="text-right">
            <div className="flex items-center justify-end gap-1 text-[11px] text-success">
              <TrendingUp size={11} /> {totalEarned} earned
            </div>
            <div className="mt-1 flex items-center justify-end gap-1 text-[11px] text-muted">
              <Coins size={11} /> {totalSpent} spent
            </div>
          </div>
        </div>
      </section>

      <section className="mb-6 grid gap-3 sm:grid-cols-2">
        {sorted.map((r) => (
          <RewardCard key={r.id} reward={r} balance={balance} />
        ))}
      </section>

      <section>
        <h2 className="mb-2 px-1 text-[11px] font-semibold uppercase tracking-widest text-muted">
          Recent activity
        </h2>
        {ledger.length === 0 && redemptions.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-surface/50 px-4 py-8 text-center text-sm text-muted">
            No activity yet. Complete a task to start earning.
          </div>
        ) : (
          <div className="space-y-1.5">
            {redemptions.slice(0, 4).map((r) => (
              <div
                key={r.id}
                className="flex items-center gap-3 rounded-xl border border-border bg-surface px-3 py-2.5 text-sm"
              >
                <span className="text-xl">{r.rewardEmoji}</span>
                <div className="min-w-0 flex-1">
                  <div className="truncate font-medium">{r.rewardTitle}</div>
                  <div className="text-[11px] text-muted">
                    {formatRelative(r.createdAt)} · {r.status}
                  </div>
                </div>
                <span className="rounded-full bg-danger/15 px-2 py-0.5 text-xs font-semibold text-danger">
                  −{r.cost}
                </span>
              </div>
            ))}
            {ledger
              .filter((l) => l.reason !== "redeem")
              .slice(0, 6)
              .map((l) => (
                <div
                  key={l.id}
                  className="flex items-center gap-3 rounded-xl border border-border bg-surface px-3 py-2 text-sm"
                >
                  <History size={14} className="text-muted" />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-xs text-muted">
                      {l.reason.replace(/_/g, " ")}
                    </div>
                    <div className="text-[10px] text-muted/70">
                      {formatRelative(l.createdAt)}
                    </div>
                  </div>
                  <span
                    className={
                      l.delta >= 0
                        ? "rounded-full bg-success/15 px-2 py-0.5 text-xs font-semibold text-success"
                        : "rounded-full bg-danger/15 px-2 py-0.5 text-xs font-semibold text-danger"
                    }
                  >
                    {l.delta >= 0 ? "+" : ""}
                    {l.delta}
                  </span>
                </div>
              ))}
          </div>
        )}
      </section>
    </main>
  );
}
