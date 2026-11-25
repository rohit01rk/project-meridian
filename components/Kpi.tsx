import { useId, type ReactNode } from "react";

interface Pt {
  x: number;
  y: number;
}

function smoothPath(pts: Pt[]): string {
  if (pts.length < 2) return "";
  let d = `M ${pts[0].x.toFixed(2)} ${pts[0].y.toFixed(2)}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[Math.max(0, i - 1)];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[Math.min(pts.length - 1, i + 2)];
    const c1x = p1.x + (p2.x - p0.x) / 6;
    const c1y = p1.y + (p2.y - p0.y) / 6;
    const c2x = p2.x - (p3.x - p1.x) / 6;
    const c2y = p2.y - (p3.y - p1.y) / 6;
    d += ` C ${c1x.toFixed(2)} ${c1y.toFixed(2)}, ${c2x.toFixed(2)} ${c2y.toFixed(2)}, ${p2.x.toFixed(2)} ${p2.y.toFixed(2)}`;
  }
  return d;
}

function Sparkline({ data }: { data: number[] }) {
  const gid = useId().replace(/[^a-zA-Z0-9]/g, "");
  const w = 96;
  const h = 30;
  const pad = 3;
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  const pts: Pt[] = data.map((v, i) => ({
    x: pad + (i * (w - pad * 2)) / Math.max(1, data.length - 1),
    y: h - pad - 1 - ((v - min) / range) * (h - pad * 2 - 2),
  }));
  const line = smoothPath(pts);
  const last = pts[pts.length - 1];
  const area = `${line} L ${last.x.toFixed(2)} ${h} L ${pts[0].x.toFixed(2)} ${h} Z`;
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} className="shrink-0" aria-hidden="true">
      <defs>
        <linearGradient id={`spark-${gid}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#C6FF3D" stopOpacity="0.25" />
          <stop offset="100%" stopColor="#C6FF3D" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#spark-${gid})`} />
      <path d={line} fill="none" stroke="#C6FF3D" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={last.x} cy={last.y} r="2.4" fill="#C6FF3D" />
    </svg>
  );
}

export default function Kpi({
  icon,
  label,
  chip,
  chipTone = "good",
  value,
  caption,
  spark,
  delay = 0,
}: {
  icon: ReactNode;
  label: string;
  chip: string;
  chipTone?: "good" | "warn";
  value: string;
  caption: string;
  spark: number[];
  delay?: number;
}) {
  return (
    <div className="card fade-up h-full p-5" style={{ animationDelay: `${delay}ms` }}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-line bg-raised text-lime">
          {icon}
        </div>
        <span
          className={`rounded-full px-2 py-1 font-mono text-[11px] leading-none ${
            chipTone === "warn"
              ? "bg-amber/10 text-amber shadow-[inset_0_0_0_1px_rgba(255,181,71,0.25)]"
              : "bg-lime/10 text-lime shadow-[inset_0_0_0_1px_rgba(198,255,61,0.22)]"
          }`}
        >
          {chip}
        </span>
      </div>
      <div className="mt-4 text-[13px] text-muted">{label}</div>
      <div className="mt-1 font-display text-[32px] font-semibold leading-none tracking-tight text-text">
        {value}
      </div>
      <div className="mt-3 flex items-end justify-between gap-2">
        <div className="text-xs leading-snug text-faint">{caption}</div>
        <Sparkline data={spark} />
      </div>
    </div>
  );
}
