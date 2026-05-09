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
        // Base (browser tab): compact pill that matches the rest of the
        // header chips. PWA standalone mode bumps padding + text size so
        // the touch target meets iOS's 44pt accessibility guideline and
        // isn't crammed against the safe-area top edge. Same position,
        // bigger hit area.
        "inline-flex items-center gap-1.5 rounded-full border border-border bg-surface px-3 py-1.5 text-xs font-medium text-muted transition active:scale-95 hover:border-danger/40 hover:text-danger",
        "standalone:gap-2 standalone:px-4 standalone:py-2.5 standalone:text-sm",
        pending && "opacity-60",
      )}
    >
      <LogOut size={12} className="standalone:hidden" />
      <LogOut size={16} className="hidden standalone:inline-block" />
      {pending ? "Signing out…" : "Sign out"}
    </button>
  );
}
