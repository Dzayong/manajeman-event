type Segment = { label: string; value: number; colorClass: string };

/** Small SVG donut — no chart library needed for a handful of static arcs. */
export function DonutChart({
  segments,
  size = 88,
}: {
  segments: Segment[];
  size?: number;
}) {
  const total = segments.reduce((s, seg) => s + seg.value, 0);
  const radius = size / 2 - 8;
  const circumference = 2 * Math.PI * radius;
  let offset = 0;

  return (
    <div className="flex items-center gap-3">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          className="text-slate-100"
          strokeWidth={8}
        />
        {total > 0 &&
          segments
            .filter((s) => s.value > 0)
            .map((seg, i) => {
              const fraction = seg.value / total;
              const dash = fraction * circumference;
              const dashOffset = -offset;
              offset += dash;
              return (
                <circle
                  key={i}
                  cx={size / 2}
                  cy={size / 2}
                  r={radius}
                  fill="none"
                  stroke="currentColor"
                  className={seg.colorClass}
                  strokeWidth={8}
                  strokeDasharray={`${dash} ${circumference - dash}`}
                  strokeDashoffset={dashOffset}
                  strokeLinecap="butt"
                  transform={`rotate(-90 ${size / 2} ${size / 2})`}
                />
              );
            })}
        <text
          x="50%"
          y="50%"
          textAnchor="middle"
          dominantBaseline="central"
          className="fill-slate-900 text-sm font-semibold"
        >
          {total > 0 ? `${Math.round(((segments.find((s) => s.label === "Selesai")?.value ?? 0) / total) * 100)}%` : "-"}
        </text>
      </svg>
      <div className="space-y-1 text-xs">
        {segments.map((seg) => (
          <div key={seg.label} className="flex items-center gap-1.5">
            <span
              className={`h-2 w-2 rounded-full ${seg.colorClass.replace("text-", "bg-")}`}
            />
            <span className="text-slate-600">
              {seg.label} · {seg.value}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
