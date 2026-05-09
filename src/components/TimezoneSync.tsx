"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { updateTimezoneAction } from "@/app/(app)/actions";

// Detects the browser's IANA timezone on first authenticated mount and
// updates the user's stored timezone if it differs. Triggers a router
// refresh on change so the Today filter (which relies on user.timezone)
// shows the correct day immediately, not after a manual reload.
export function TimezoneSync() {
  const router = useRouter();
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (!tz) return;
    void (async () => {
      try {
        const res = await updateTimezoneAction(tz);
        if (res?.changed) router.refresh();
      } catch {
        // best-effort; failure is harmless
      }
    })();
  }, [router]);

  return null;
}
