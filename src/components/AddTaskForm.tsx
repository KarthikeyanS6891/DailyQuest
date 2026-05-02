"use client";

import { useRef, useState, useTransition } from "react";
import { Plus } from "lucide-react";
import { addTaskAction } from "@/app/actions";
import { cn } from "@/lib/cn";

export function AddTaskForm() {
  const [pending, start] = useTransition();
  const [open, setOpen] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  return (
    <div className="rounded-2xl border border-border bg-surface">
      {!open ? (
        <button
          onClick={() => setOpen(true)}
          className="flex w-full items-center gap-2 px-4 py-3 text-sm text-muted transition hover:bg-white/[0.03] hover:text-text"
        >
          <Plus size={16} />
          Add a task
        </button>
      ) : (
        <form
          ref={formRef}
          action={(fd) =>
            start(async () => {
              await addTaskAction(fd);
              formRef.current?.reset();
              setOpen(false);
            })
          }
          className="flex flex-col gap-3 p-3"
        >
          <input
            name="title"
            autoFocus
            required
            placeholder="What needs doing?"
            className="rounded-lg bg-surface2 px-3 py-2 text-sm outline-none ring-1 ring-border focus:ring-brand"
          />
          <div className="grid grid-cols-3 gap-2">
            <select
              name="priority"
              defaultValue="2"
              className="rounded-lg bg-surface2 px-2 py-2 text-sm outline-none ring-1 ring-border focus:ring-brand"
            >
              <option value="1">P1 — must</option>
              <option value="2">P2 — should</option>
              <option value="3">P3 — nice</option>
            </select>
            <input
              name="estimatedMinutes"
              type="number"
              min={5}
              max={240}
              step={5}
              defaultValue={25}
              className="rounded-lg bg-surface2 px-2 py-2 text-sm outline-none ring-1 ring-border focus:ring-brand"
            />
            <input
              name="time"
              type="time"
              className="rounded-lg bg-surface2 px-2 py-2 text-sm outline-none ring-1 ring-border focus:ring-brand"
            />
          </div>
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
              {pending ? "Adding…" : "Add task"}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
