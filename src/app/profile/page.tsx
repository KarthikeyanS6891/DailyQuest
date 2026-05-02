import { Flame, Gift, ListTodo, Repeat } from "lucide-react";
import { getSettings } from "@/store/memory";
import { SettingsForm } from "@/components/SettingsForm";
import { ResetButton } from "@/components/ResetButton";
import { levelForXp } from "@/lib/points";

export const dynamic = "force-dynamic";

export default function ProfilePage() {
  const userId = process.env.DEV_USER_ID ?? "dev-user";
  const data = getSettings(userId);
  const { level } = levelForXp(data.xp);

  return (
    <main className="mx-auto max-w-xl px-4 pb-24 pt-8 sm:pt-10">
      <header className="mb-5">
        <p className="text-xs uppercase tracking-widest text-muted">You</p>
        <h1 className="mt-1 text-2xl font-semibold leading-tight">Your quest log</h1>
      </header>

      <section className="mb-5 rounded-2xl border border-brand/30 bg-gradient-to-br from-brand/15 via-surface to-accent/10 p-5">
        <div className="flex items-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-brand text-2xl font-bold text-white">
            {level}
          </div>
          <div>
            <div className="text-sm text-muted">Level {level} · {data.xp} xp</div>
            <div className="mt-1 text-lg font-semibold">Adventurer</div>
          </div>
        </div>
      </section>

      <section className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat icon={<Flame size={14} className="text-accent" />} label="Streak" value={data.streak} />
        <Stat icon={<ListTodo size={14} className="text-brand" />} label="Tasks" value={data.totalTasks} />
        <Stat icon={<Repeat size={14} className="text-brand" />} label="Habits" value={data.totalHabits} />
        <Stat icon={<Gift size={14} className="text-accent" />} label="Redeemed" value={data.totalRedeemed} />
      </section>

      <section className="mb-5">
        <h2 className="mb-2 px-1 text-[11px] font-semibold uppercase tracking-widest text-muted">
          Settings
        </h2>
        <SettingsForm settings={data.settings} />
      </section>

      <section>
        <ResetButton />
      </section>
    </main>
  );
}

function Stat({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-border bg-surface p-3">
      <div className="flex items-center gap-1.5 text-[11px] uppercase tracking-wider text-muted">
        {icon} {label}
      </div>
      <div className="mt-1 text-2xl font-bold tabular-nums">{value}</div>
    </div>
  );
}
