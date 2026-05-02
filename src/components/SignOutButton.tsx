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
