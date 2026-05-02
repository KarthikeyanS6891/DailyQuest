import { Sparkles } from "lucide-react";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="relative flex min-h-screen items-center justify-center px-4 py-10">
      <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(60%_50%_at_50%_0%,rgba(124,92,255,0.18),transparent),radial-gradient(50%_40%_at_50%_100%,rgba(245,180,0,0.10),transparent)]" />
      <div className="w-full max-w-sm">
        <div className="mb-6 flex items-center justify-center gap-2 text-brand">
          <Sparkles size={20} />
          <span className="text-lg font-bold tracking-tight">DailyQuest</span>
        </div>
        {children}
        <p className="mt-6 text-center text-[11px] text-muted">
          Plan your day · Build streaks · Earn real rewards
        </p>
      </div>
    </main>
  );
}
