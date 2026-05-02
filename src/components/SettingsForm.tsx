"use client";

import { useTransition } from "react";
import { updateSettingsAction } from "@/app/(app)/profile/actions";
import { cn } from "@/lib/cn";

type Settings = {
  timezone: string;
  quietHoursStart: number;
  quietHoursEnd: number;
  notifications: boolean;
};

export function SettingsForm({ settings }: { settings: Settings }) {
  const [pending, start] = useTransition();
  return (
    <form
      action={(fd) => start(async () => { await updateSettingsAction(fd); })}
      className="space-y-3 rounded-2xl border border-border bg-surface p-4"
    >
      <div>
        <label className="text-[11px] uppercase tracking-wider text-muted">Timezone</label>
        <input
          name="timezone"
          defaultValue={settings.timezone}
          className="mt-1 w-full rounded-lg bg-surface2 px-3 py-2 text-sm outline-none ring-1 ring-border focus:ring-brand"
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-[11px] uppercase tracking-wider text-muted">Quiet hours start</label>
          <input
            name="quietHoursStart"
            type="number"
            min={0}
            max={23}
            defaultValue={settings.quietHoursStart}
            className="mt-1 w-full rounded-lg bg-surface2 px-3 py-2 text-sm outline-none ring-1 ring-border focus:ring-brand"
          />
        </div>
        <div>
          <label className="text-[11px] uppercase tracking-wider text-muted">Quiet hours end</label>
          <input
            name="quietHoursEnd"
            type="number"
            min={0}
            max={23}
            defaultValue={settings.quietHoursEnd}
            className="mt-1 w-full rounded-lg bg-surface2 px-3 py-2 text-sm outline-none ring-1 ring-border focus:ring-brand"
          />
        </div>
      </div>
      <label className="flex items-center gap-2 text-sm">
        <input
          name="notifications"
          type="checkbox"
          defaultChecked={settings.notifications}
          className="h-4 w-4 accent-brand"
        />
        Send reminder nudges
      </label>
      <div className="flex justify-end">
        <button
          type="submit"
          disabled={pending}
          className={cn(
            "rounded-lg bg-brand px-3 py-1.5 text-sm font-medium text-white transition hover:bg-brand-dim",
            pending && "opacity-60",
          )}
        >
          {pending ? "Saving…" : "Save"}
        </button>
      </div>
    </form>
  );
}
