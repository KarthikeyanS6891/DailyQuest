"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Repeat, Gift, BarChart3, User } from "lucide-react";
import { cn } from "@/lib/cn";

const TABS = [
  { href: "/", label: "Today", Icon: Home },
  { href: "/habits", label: "Habits", Icon: Repeat },
  { href: "/rewards", label: "Rewards", Icon: Gift },
  { href: "/analytics", label: "Stats", Icon: BarChart3 },
  { href: "/profile", label: "You", Icon: User },
];

export function BottomNav() {
  const pathname = usePathname();
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-bg/85 backdrop-blur-md">
      <div className="mx-auto flex max-w-xl items-stretch justify-between px-2 py-1.5">
        {TABS.map(({ href, label, Icon }) => {
          const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex flex-1 flex-col items-center gap-0.5 rounded-lg px-1.5 py-1.5 text-[11px] font-medium transition",
                active ? "text-brand" : "text-muted hover:text-text",
              )}
            >
              <Icon size={18} className={cn(active && "drop-shadow-[0_0_8px_rgba(124,92,255,0.6)]")} />
              <span>{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
