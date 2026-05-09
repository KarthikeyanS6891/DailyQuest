import { BottomNav } from "@/components/BottomNav";
import { TimezoneSync } from "@/components/TimezoneSync";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <TimezoneSync />
      {children}
      <BottomNav />
    </>
  );
}
