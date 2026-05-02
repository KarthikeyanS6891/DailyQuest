"use client";

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, Check, Loader2, X } from "lucide-react";
import { signInAction, signUpAction } from "@/app/(auth)/actions";
import { checkPassword, isValidEmail } from "@/lib/validation";
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
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [emailTouched, setEmailTouched] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);
  const c = COPY[mode];
  const action = mode === "signin" ? signInAction : signUpAction;

  const emailValid = useMemo(() => isValidEmail(email), [email]);
  const showEmailError = emailTouched && email.length > 0 && !emailValid;

  const checks = useMemo(() => checkPassword(password), [password]);
  const allPwOk = checks.every((c) => c.ok);

  const submitDisabled = pending || !emailValid || (mode === "signup" ? !allPwOk : password.length === 0);

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
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onBlur={() => setEmailTouched(true)}
            className={cn(
              "mt-1 w-full rounded-lg bg-surface px-3 py-2.5 text-sm outline-none ring-1 transition focus:ring-brand",
              showEmailError ? "ring-danger/60" : "ring-border",
            )}
          />
          <AnimatePresence>
            {showEmailError ? (
              <motion.p
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="mt-1.5 text-[11px] text-danger"
              >
                Enter a valid email like name@domain.com
              </motion.p>
            ) : null}
          </AnimatePresence>
        </div>

        <div>
          <label className="text-[11px] uppercase tracking-wider text-muted">Password</label>
          <input
            name="password"
            type="password"
            required
            autoComplete={mode === "signup" ? "new-password" : "current-password"}
            placeholder={mode === "signup" ? "8+ chars · letter · digit · special" : "Your password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onFocus={() => setPasswordFocused(true)}
            className={cn(
              "mt-1 w-full rounded-lg bg-surface px-3 py-2.5 text-sm outline-none ring-1 transition focus:ring-brand",
              mode === "signup" && password.length > 0 && !allPwOk ? "ring-danger/40" : "ring-border",
              mode === "signup" && allPwOk ? "ring-success/40" : "",
            )}
          />

          <AnimatePresence initial={false}>
            {mode === "signup" && (passwordFocused || password.length > 0) ? (
              <motion.ul
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="mt-2 grid grid-cols-1 gap-1 overflow-hidden text-[11px]"
              >
                {checks.map((rule) => (
                  <li
                    key={rule.id}
                    className={cn(
                      "flex items-center gap-1.5 transition",
                      rule.ok ? "text-success" : "text-muted",
                    )}
                  >
                    <span
                      className={cn(
                        "flex h-3.5 w-3.5 items-center justify-center rounded-full transition",
                        rule.ok ? "bg-success/20" : "bg-white/[0.06]",
                      )}
                    >
                      {rule.ok ? <Check size={9} strokeWidth={3} /> : <X size={9} strokeWidth={3} />}
                    </span>
                    {rule.label}
                  </li>
                ))}
              </motion.ul>
            ) : null}
          </AnimatePresence>
        </div>

        {error ? (
          <div className="rounded-lg border border-danger/30 bg-danger/10 px-3 py-2 text-xs text-danger">
            {error}
          </div>
        ) : null}

        <button
          type="submit"
          disabled={submitDisabled}
          className={cn(
            "mt-2 flex w-full items-center justify-center gap-2 rounded-lg bg-brand px-3 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-dim",
            submitDisabled && "cursor-not-allowed opacity-60 hover:bg-brand",
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
