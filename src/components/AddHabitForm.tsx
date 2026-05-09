"use client";

import { useRef, useState, useTransition } from "react";
import { Plus } from "lucide-react";
import { addHabitAction } from "@/app/(app)/habits/actions";
import { cn } from "@/lib/cn";

export function AddHabitForm() {
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);

  return (
    <div className="rounded-2xl border border-border bg-surface">
      {!open ? (
        <button
          onClick={() => setOpen(true)}
          className="flex w-full items-center gap-2 px-4 py-3 text-sm text-muted transition hover:bg-tint/[0.03] hover:text-text"
        >
          <Plus size={16} />
          New habit
        </button>
      ) : (
        <form
          ref={formRef}
          action={(fd) =>
            start(async () => {
              await addHabitAction(fd);
              formRef.current?.reset();
              setOpen(false);
            })
          }
          className="flex flex-col gap-3 p-3"
        >
          <input
            name="title"
            required
            autoFocus
            placeholder="Habit name (e.g. Stretch 10 min)"
            className="rounded-lg bg-surface2 px-3 py-2 text-sm outline-none ring-1 ring-border focus:ring-brand"
          />
          <select
            name="cadence"
            defaultValue="daily"
            className="rounded-lg bg-surface2 px-3 py-2 text-sm outline-none ring-1 ring-border focus:ring-brand"
          >
            <option value="daily">Every day</option>
            <option value="weekdays">Weekdays (Mon–Fri)</option>
            <option value="weekends">Weekends</option>
            <option value="mwf">Mon · Wed · Fri</option>
            <option value="tts">Tue · Thu · Sat</option>
          </select>
          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded-lg px-3 py-1.5 text-sm text-muted hover:text-text"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={pending}
              className={cn(
                "rounded-lg bg-brand px-3 py-1.5 text-sm font-medium text-white transition hover:bg-brand-dim",
                pending && "opacity-60",
              )}
            >
              {pending ? "Adding…" : "Add habit"}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
