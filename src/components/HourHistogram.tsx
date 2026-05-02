export function HourHistogram({ hours }: { hours: number[] }) {
  const max = Math.max(...hours, 1);
  return (
    <div className="flex h-24 items-end gap-[2px]">
      {hours.map((v, h) => {
        const pct = (v / max) * 100;
        const peak = v === max && v > 0;
        return (
          <div key={h} className="flex flex-1 flex-col items-center gap-1">
            <div
              className={
                "w-full rounded-sm transition-all duration-500 " +
                (peak
                  ? "bg-gradient-to-t from-brand to-accent"
                  : v > 0
                    ? "bg-brand/40"
                    : "bg-white/[0.04]")
              }
              style={{ height: `${Math.max(2, pct)}%` }}
              title={`${h}:00 — ${v} task${v === 1 ? "" : "s"}`}
            />
            {h % 6 === 0 ? (
              <span className="text-[9px] text-muted">{h}</span>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
