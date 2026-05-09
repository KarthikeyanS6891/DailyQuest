import { Flame, Gift, ListTodo, LogOut, Mail, Repeat } from "lucide-react";
import { getSettings } from "@/store/memory";
import { SettingsForm } from "@/components/SettingsForm";
import { ResetButton } from "@/components/ResetButton";
import { SignOutButton, SignOutFullWidth } from "@/components/SignOutButton";
import { ThemeToggle } from "@/components/ThemeToggle";
import { levelForXp } from "@/lib/points";
import { requireUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  const user = await requireUser();
  const data = await getSettings(user.id);
  const { level } = levelForXp(data.xp);

  return (
    <main className="mx-auto max-w-xl px-4 pb-24 pt-8 sm:pt-10">
      <header className="mb-5 flex items-start justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-widest text-muted">You</p>
          <h1 className="mt-1 text-2xl font-semibold leading-tight">Your quest log</h1>
        </div>
        {/* Top-right sign-out, hidden when launched as a PWA — see
            globals.css. The thumb-friendly version below takes over. */}
        <div className="hide-in-standalone">
          <SignOutButton />
        </div>
      </header>

      <section className="mb-5 rounded-2xl border border-brand/30 bg-gradient-to-br from-brand/15 via-surface to-accent/10 p-5">
        <div className="flex items-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-brand text-2xl font-bold text-white">
            {level}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 text-sm text-muted">
              <Mail size={12} /> <span className="truncate">{user.email}</span>
            </div>
            <div className="mt-0.5 text-lg font-semibold">Level {level} · {data.xp} xp</div>
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
          Appearance
        </h2>
        <ThemeToggle />
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

      {/* Thumb-friendly sign-out, only visible in PWA standalone mode. */}
      <section className="show-in-standalone mt-5">
        <SignOutFullWidth />
      </section>

      <p className="mt-4 hide-in-standalone flex items-center justify-center gap-1 text-[10px] text-muted">
        <LogOut size={10} /> Use the button up top to sign out.
      </p>
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
