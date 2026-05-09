import type { Metadata, Viewport } from "next";
import { cookies } from "next/headers";
import "./globals.css";
import { NO_FOUC_SCRIPT, THEME_COOKIE, isThemePref } from "@/lib/theme";

export const metadata: Metadata = {
  title: "DailyQuest — plan, complete, earn",
  description: "A daily planner that pays you back.",
  applicationName: "DailyQuest",
  appleWebApp: {
    capable: true,
    title: "DailyQuest",
    statusBarStyle: "black-translucent",
  },
  formatDetection: {
    telephone: false,
  },
};

export const viewport: Viewport = {
  // Note: themeColor is the OS-level chrome color (PWA standalone mode +
  // mobile address bar tint). Browsers don't yet read CSS vars here, so
  // we keep a sensible default — the page itself adapts via CSS.
  themeColor: "#0b0b10",
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  viewportFit: "cover",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  // Server-side: read the cookie so the SSR'd <html> already has the right
  // class. The pre-hydration script then handles "system" mode (which
  // depends on prefers-color-scheme, only known client-side).
  const jar = await cookies();
  const stored = jar.get(THEME_COOKIE)?.value;
  const pref = isThemePref(stored) ? stored : "system";
  // For SSR, we can't read prefers-color-scheme. Fall back to "dark" for
  // "system" — the inline script will correct it before the first paint.
  const ssrClass = pref === "light" ? "light" : "dark";

  return (
    <html lang="en" className={ssrClass} data-theme-pref={pref} suppressHydrationWarning>
      <head>
        {/* Pre-hydration script: applies the right theme class on <html>
            before React mounts so there's no flash of the wrong palette.
            NO_FOUC_SCRIPT is a hardcoded constant from src/lib/theme.ts —
            no user input flows into it. This is the standard Next.js
            pattern for theme bootstrapping (see next-themes, shadcn). */}
        <script
          // eslint-disable-next-line react/no-danger
          dangerouslySetInnerHTML={{ __html: NO_FOUC_SCRIPT }}
        />
      </head>
      <body className="min-h-screen bg-bg text-text font-sans">{children}</body>
    </html>
  );
}
