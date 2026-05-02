"use client";

import { useState, useTransition } from "react";
import { resetUserAction } from "@/app/profile/actions";
import { cn } from "@/lib/cn";

export function ResetButton() {
  const [confirming, setConfirming] = useState(false);
  const [pending, start] = useTransition();
  return (
    <div className="rounded-2xl border border-danger/30 bg-danger/5 p-4">
      <h3 className="text-sm font-semibold text-danger">Reset everything</h3>
      <p className="mt-1 text-[12px] text-muted">
        Wipes tasks, habits, XP, redemptions, and reseeds the demo. Useful while you're playing with the app.
      </p>
      {!confirming ? (
        <button
          onClick={() => setConfirming(true)}
          className="mt-3 rounded-lg border border-danger/40 px-3 py-1.5 text-sm text-danger transition hover:bg-danger/10"
        >
          Reset…
        </button>
      ) : (
        <div className="mt-3 flex items-center gap-2">
          <button
            onClick={() => setConfirming(false)}
            className="rounded-lg border border-border px-3 py-1.5 text-sm text-muted hover:text-text"
          >
            Cancel
          </button>
          <button
            disabled={pending}
            onClick={() => start(async () => {
              await resetUserAction();
              setConfirming(false);
            })}
            className={cn(
              "rounded-lg bg-danger px-3 py-1.5 text-sm font-medium text-white transition hover:opacity-90",
              pending && "opacity-60",
            )}
          >
            {pending ? "Resetting…" : "Yes, wipe it"}
          </button>
        </div>
      )}
    </div>
  );
}
