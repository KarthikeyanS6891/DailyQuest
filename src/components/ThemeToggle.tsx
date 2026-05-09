"use client";

import { useEffect, useState } from "react";
import { Sun, Moon, Monitor } from "lucide-react";
import { THEME_COOKIE, type ThemePref } from "@/lib/theme";
import { cn } from "@/lib/cn";

const OPTIONS: { value: ThemePref; label: string; Icon: typeof Sun }[] = [
  { value: "light", label: "Light", Icon: Sun },
  { value: "dark", label: "Dark", Icon: Moon },
  { value: "system", label: "System", Icon: Monitor },
];

function applyTheme(pref: ThemePref) {
  const actual: "light" | "dark" =
    pref === "system"
      ? window.matchMedia("(prefers-color-scheme: dark)").matches
        ? "dark"
        : "light"
      : pref;
  const r = document.documentElement;
  r.classList.remove("light", "dark");
  r.classList.add(actual);
  r.setAttribute("data-theme-pref", pref);
}

function readCookie(): ThemePref {
  if (typeof document === "undefined") return "system";
  const c = document.cookie
    .split("; ")
    .find((x) => x.startsWith(`${THEME_COOKIE}=`));
  if (!c) return "system";
  const v = decodeURIComponent(c.split("=")[1]);
  if (v === "light" || v === "dark" || v === "system") return v;
  return "system";
}

function writeCookie(pref: ThemePref) {
  // 1 year. Not HttpOnly because we read it client-side. Lax is fine.
  document.cookie = `${THEME_COOKIE}=${pref}; path=/; max-age=${60 * 60 * 24 * 365}; samesite=lax`;
}

export function ThemeToggle() {
  const [pref, setPref] = useState<ThemePref>("system");

  useEffect(() => {
    setPref(readCookie());
  }, []);

  // When pref is "system", live-update on OS theme change.
  useEffect(() => {
    if (pref !== "system") return;
    const mql = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = () => applyTheme("system");
    mql.addEventListener("change", handler);
    return () => mql.removeEventListener("change", handler);
  }, [pref]);

  const onPick = (value: ThemePref) => {
    setPref(value);
    writeCookie(value);
    applyTheme(value);
  };

  return (
    <div className="rounded-2xl border border-border bg-surface p-4">
      <h3 className="text-sm font-semibold">Appearance</h3>
      <p className="mt-0.5 text-[12px] text-muted">
        Pick a theme. <span className="text-text/80">System</span> follows your device setting.
      </p>
      <div
        role="radiogroup"
        aria-label="Theme"
        className="mt-3 grid grid-cols-3 gap-2"
      >
        {OPTIONS.map(({ value, label, Icon }) => {
          const active = pref === value;
          return (
            <button
              key={value}
              role="radio"
              aria-checked={active}
              onClick={() => onPick(value)}
              className={cn(
                "flex flex-col items-center gap-1 rounded-xl border px-3 py-2.5 text-xs font-medium transition",
                active
                  ? "border-brand bg-brand/15 text-brand shadow-glow"
                  : "border-border bg-surface2 text-muted hover:border-tint/20 hover:text-text",
              )}
            >
              <Icon size={16} />
              {label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
