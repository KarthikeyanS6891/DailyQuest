import type { Priority } from "./points";

export type Parsed = {
  title: string;
  priority: Priority;
  estimatedMinutes: number;
  time: string | null;
};

const TIME_RE = /\b(\d{1,2})(?::(\d{2}))?\s?(am|pm)?\b/i;
const DUR_RE = /\b(\d{1,3})\s?(m|min|mins|minutes|h|hr|hrs|hour|hours)\b/i;
const PRI_RE = /(?:^|\s)!(1|2|3)\b/;

export function parseQuickAdd(raw: string): Parsed {
  let s = ` ${raw} `;

  let priority: Priority = 2;
  const pri = s.match(PRI_RE);
  if (pri) {
    priority = Number(pri[1]) as Priority;
    s = s.replace(PRI_RE, " ");
  }

  let estimatedMinutes = 25;
  const dur = s.match(DUR_RE);
  if (dur) {
    const n = Number(dur[1]);
    const unit = dur[2].toLowerCase();
    estimatedMinutes = unit.startsWith("h") ? n * 60 : n;
    estimatedMinutes = Math.max(5, Math.min(240, estimatedMinutes));
    s = s.replace(DUR_RE, " ");
  }

  let time: string | null = null;
  const tm = s.match(TIME_RE);
  if (tm) {
    let h = Number(tm[1]);
    const m = tm[2] ? Number(tm[2]) : 0;
    const mer = tm[3]?.toLowerCase();
    if (mer === "pm" && h < 12) h += 12;
    if (mer === "am" && h === 12) h = 0;
    if (h <= 23 && m <= 59 && (mer || tm[2])) {
      time = `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
      s = s.replace(TIME_RE, " ");
    }
  }

  const title = s.replace(/\s+/g, " ").trim();
  return { title, priority, estimatedMinutes, time };
}
