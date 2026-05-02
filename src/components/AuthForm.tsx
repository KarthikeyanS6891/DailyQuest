"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { motion } from "framer-motion";
import { ArrowRight, Loader2 } from "lucide-react";
import { signInAction, signUpAction } from "@/app/(auth)/actions";
import { cn } from "@/lib/cn";

type Mode = "signin" | "signup";

const COPY: Record<Mode, { title: string; sub: string; cta: string; alt: { href: string; label: string } }> = {
  signin: {
    title: "Welcome back",
    sub: "Sign in to your quest log.",
    cta: "Sign in",
    alt: { href: "/signup", label: "New here? Create an account" },
  },
  signup: {
    title: "Start your quest",
    sub: "Free, takes 10 seconds. No credit card.",
    cta: "Create account",
    alt: { href: "/signin", label: "Already have an account? Sign in" },
  },
};

export function AuthForm({ mode }: { mode: Mode }) {
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const c = COPY[mode];
  const action = mode === "signin" ? signInAction : signUpAction;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl border border-border bg-gradient-to-br from-surface to-surface2 p-5 shadow-glow/10"
    >
      <h1 className="text-xl font-semibold">{c.title}</h1>
      <p className="mt-1 text-sm text-muted">{c.sub}</p>

      <form
        action={(fd) =>
          start(async () => {
            setError(null);
            const result = await action(fd);
            if (result && !result.ok) setError(result.error);
          })
        }
        className="mt-5 space-y-3"
      >
        <div>
          <label className="text-[11px] uppercase tracking-wider text-muted">Email</label>
          <input
            name="email"
            type="email"
            required
            autoComplete="email"
            placeholder="you@example.com"
            className="mt-1 w-full rounded-lg bg-surface px-3 py-2.5 text-sm outline-none ring-1 ring-border focus:ring-brand"
          />
        </div>
        <div>
          <label className="text-[11px] uppercase tracking-wider text-muted">Password</label>
          <input
            name="password"
            type="password"
            required
            minLength={8}
            autoComplete={mode === "signup" ? "new-password" : "current-password"}
            placeholder={mode === "signup" ? "8+ characters" : "Your password"}
            className="mt-1 w-full rounded-lg bg-surface px-3 py-2.5 text-sm outline-none ring-1 ring-border focus:ring-brand"
          />
        </div>

        {error ? (
          <div className="rounded-lg border border-danger/30 bg-danger/10 px-3 py-2 text-xs text-danger">
            {error}
          </div>
        ) : null}

        <button
          type="submit"
          disabled={pending}
          className={cn(
            "mt-2 flex w-full items-center justify-center gap-2 rounded-lg bg-brand px-3 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-dim",
            pending && "opacity-70",
          )}
        >
          {pending ? <Loader2 size={14} className="animate-spin" /> : <ArrowRight size={14} />}
          {pending ? "Working…" : c.cta}
        </button>
      </form>

      <Link
        href={c.alt.href}
        className="mt-4 block text-center text-xs text-muted transition hover:text-text"
      >
        {c.alt.label}
      </Link>
    </motion.div>
  );
}
