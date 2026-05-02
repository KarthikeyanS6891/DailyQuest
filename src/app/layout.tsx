import type { Metadata } from "next";
import "./globals.css";
import { BottomNav } from "@/components/BottomNav";

export const metadata: Metadata = {
  title: "DailyQuest — plan, complete, earn",
  description: "A daily planner that pays you back.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-bg text-text font-sans">
        {children}
        <BottomNav />
      </body>
    </html>
  );
}
