import { Repeat } from "lucide-react";
import { getHabits } from "@/store/memory";
import { HabitItem } from "@/components/HabitItem";
import { AddHabitForm } from "@/components/AddHabitForm";
import { requireUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function HabitsPage() {
  const { id: userId } = await requireUser();
  const { habits } = await getHabits(userId);

  const dueToday = habits.filter((h) => h.dueToday);
  const completedToday = dueToday.filter((h) => h.completedToday).length;

  return (
    <main className="mx-auto max-w-xl px-4 pb-24 pt-8 sm:pt-10">
      <header className="mb-6">
        <p className="text-xs uppercase tracking-widest text-muted">Habits</p>
        <h1 className="mt-1 text-2xl font-semibold leading-tight">
          {dueToday.length === 0 ? "Build something steady" : `${completedToday}/${dueToday.length} due today`}
        </h1>
        <p className="mt-1 text-sm text-muted">
          Keep streaks alive. Each completion is +20 XP. Out of time? Freeze it — twice a month, free.
        </p>
      </header>

      <section className="mb-4 space-y-2">
        {habits.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-surface/50 px-4 py-10 text-center">
            <Repeat className="mx-auto text-muted" size={28} />
            <div className="mt-2 text-sm text-muted">No habits yet. Start with one.</div>
          </div>
        ) : (
          habits.map((h) => <HabitItem key={h.id} habit={h} />)
        )}
      </section>

      <AddHabitForm />
    </main>
  );
}
