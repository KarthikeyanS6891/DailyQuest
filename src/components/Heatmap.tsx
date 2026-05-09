import { cn } from "@/lib/cn";

export function Heatmap({ data }: { data: { date: string; pct: number }[] }) {
  const cols: { date: string; pct: number }[][] = [];
  let week: { date: string; pct: number }[] = [];
  data.forEach((d, i) => {
    const dow = new Date(d.date + "T00:00:00").getDay();
    if (i === 0 && dow !== 0) {
      for (let j = 0; j < dow; j++) week.push({ date: "", pct: -1 });
    }
    week.push(d);
    if (week.length === 7) {
      cols.push(week);
      week = [];
    }
  });
  if (week.length > 0) cols.push(week);

  const shade = (pct: number) => {
    if (pct < 0) return "bg-transparent";
    if (pct === 0) return "bg-tint/[0.04]";
    if (pct < 0.25) return "bg-brand/30";
    if (pct < 0.5) return "bg-brand/50";
    if (pct < 0.75) return "bg-brand/70";
    return "bg-gradient-to-br from-brand to-accent";
  };

  return (
    <div className="overflow-x-auto">
      <div className="flex gap-[3px]">
        {cols.map((col, ci) => (
          <div key={ci} className="flex flex-col gap-[3px]">
            {col.map((d, di) => (
              <div
                key={di}
                title={d.date ? `${d.date}: ${Math.round(d.pct * 100)}%` : ""}
                className={cn("h-2.5 w-2.5 rounded-[2px]", shade(d.pct))}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
