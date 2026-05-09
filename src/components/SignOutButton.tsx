"use client";

import { useTransition } from "react";
import { LogOut } from "lucide-react";
import { signOutAction } from "@/app/(app)/profile/actions";
import { cn } from "@/lib/cn";

export function SignOutButton() {
  const [pending, start] = useTransition();
  return (
    <button
      onClick={() => start(async () => { await signOutAction(); })}
      disabled={pending}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border border-border bg-surface px-3 py-1.5 text-xs font-medium text-muted transition hover:border-danger/40 hover:text-danger",
        pending && "opacity-60",
      )}
    >
      <LogOut size={12} />
      {pending ? "Signing out…" : "Sign out"}
    </button>
  );
}

// Thumb-friendly variant for PWA standalone mode: full-width, taller hit
// area, danger-colored so the action is unambiguous on the bottom of the
// page where it lands when scrolled to.
export function SignOutFullWidth() {
  const [pending, start] = useTransition();
  return (
    <button
      onClick={() => start(async () => { await signOutAction(); })}
      disabled={pending}
      className={cn(
        "flex w-full items-center justify-center gap-2 rounded-2xl border border-danger/40 bg-danger/10 px-4 py-3.5 text-sm font-semibold text-danger transition active:scale-[0.99] hover:bg-danger/15",
        pending && "opacity-60",
      )}
    >
      <LogOut size={16} />
      {pending ? "Signing out…" : "Sign out"}
    </button>
  );
}
