"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import Kpi from "@/components/Kpi";
import {
  catalog, fmtDateTime, nextLiveEvent, seed,
  type LiveEvent,
} from "@/lib/engine";

const TABS = [
  "Live Dashboard",
  "Content Analytics",
  "Sessions & Gold",
  "Data Quality & dbt",
  "Features & A/B Test",
  "Architecture & Roadmap",
] as const;
type Tab = (typeof TABS)[number];

const s = seed.summary;

/* ---------------- derived series (recorded run) ---------------- */
const HOURS = Array.from({ length: 24 }, (_, i) => i);
const hourOf = (iso: string) => Number(iso.slice(11, 13));
const sessionsByHour = HOURS.map(
  (h) => seed.factViewingSessions.filter((r) => hourOf(r.session_start) === h).length
);
const eventsByHour = HOURS.map((h) =>
  seed.factViewingSessions
    .filter((r) => hourOf(r.session_start) === h)
    .reduce((a, r) => a + r.event_count, 0)
);
const cumUsersByHour = (() => {
  const seen = new Set<string>();
  return HOURS.map((h) => {
    seed.factViewingSessions
      .filter((r) => hourOf(r.session_start) === h)
      .forEach((r) => seen.add(r.user_id));
    return seen.size;
  });
})();
const completionSeries = seed.factViewingSessions.map((r) => r.estimated_completion_pct);
const userEventsSeries = seed.dimUser.map((u) => u.total_events);
const peakHour = sessionsByHour.indexOf(Math.max(...sessionsByHour));

/* ---------------- icons (16-18px stroke) ---------------- */
type IconProps = { className?: string };
function Svg({ className = "h-[18px] w-[18px]", children }: IconProps & { children: ReactNode }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"
      strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      {children}
    </svg>
  );
}
const IconActivity = (p: IconProps) => (<Svg {...p}><polyline points="22 12 18 12 15 21 9 3 6 12 2 12" /></Svg>);
const IconChart = (p: IconProps) => (<Svg {...p}><line x1="18" y1="20" x2="18" y2="10" /><line x1="12" y1="20" x2="12" y2="4" /><line x1="6" y1="20" x2="6" y2="14" /></Svg>);
const IconLayers = (p: IconProps) => (<Svg {...p}><polygon points="12 2 2 7 12 12 22 7" /><polyline points="2 17 12 22 22 17" /><polyline points="2 12 12 17 22 12" /></Svg>);
const IconShield = (p: IconProps) => (<Svg {...p}><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /><polyline points="9 11.5 11 13.5 15 9.5" /></Svg>);
const IconShuffle = (p: IconProps) => (<Svg {...p}><polyline points="16 3 21 3 21 8" /><line x1="4" y1="20" x2="21" y2="3" /><polyline points="21 16 21 21 16 21" /><line x1="15" y1="15" x2="21" y2="21" /><line x1="4" y1="4" x2="9" y2="9" /></Svg>);
const IconBox = (p: IconProps) => (<Svg {...p}><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" /><polyline points="3.27 6.96 12 12.01 20.73 6.96" /><line x1="12" y1="22.08" x2="12" y2="12" /></Svg>);
const IconDatabase = (p: IconProps) => (<Svg {...p}><ellipse cx="12" cy="5" rx="9" ry="3" /><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" /><path d="M3 12c0 1.66 4 3 9 3s9-1.34 9-3" /></Svg>);
const IconUsers = (p: IconProps) => (<Svg {...p}><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></Svg>);
const IconPercent = (p: IconProps) => (<Svg {...p}><line x1="19" y1="5" x2="5" y2="19" /><circle cx="6.5" cy="6.5" r="2.5" /><circle cx="17.5" cy="17.5" r="2.5" /></Svg>);
const IconZap = (p: IconProps) => (<Svg {...p}><polygon points="13 2 3 14 12 14 11 22 21 10 12 10" /></Svg>);

function LogoMark({ size = 28 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 28 28" aria-hidden="true" className="shrink-0">
      <rect x="0" y="0" width="28" height="28" rx="8" fill="#C6FF3D" />
      <polyline points="5.5,16.5 10,16.5 12.5,8.5 16,20.5 18.2,16.5 23,16.5"
        fill="none" stroke="#0B0F14" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

const NAV: { group: string; items: { label: Tab; Icon: (p: IconProps) => ReactNode }[] }[] = [
  {
    group: "Monitor",
    items: [
      { label: "Live Dashboard", Icon: IconActivity },
      { label: "Content Analytics", Icon: IconChart },
      { label: "Sessions & Gold", Icon: IconLayers },
      { label: "Data Quality & dbt", Icon: IconShield },
    ],
  },
  {
    group: "Insights",
    items: [
      { label: "Features & A/B Test", Icon: IconShuffle },
      { label: "Architecture & Roadmap", Icon: IconBox },
    ],
  },
];

/* ---------------- shared bits ---------------- */
function TableCard({ title, children, delay = 0 }: { title: string; children: ReactNode; delay?: number }) {
  return (
    <div className="card fade-up h-full overflow-hidden" style={{ animationDelay: `${delay}ms` }}>
      <div className="px-5 pb-1 pt-[18px] font-display text-[15px] font-semibold text-text">{title}</div>
      <div className="scrollthin overflow-x-auto px-2 pb-2">{children}</div>
    </div>
  );
}

function Check() {
  return (
    <span className="mt-[1px] flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full border border-lime/25 bg-lime/10">
      <svg viewBox="0 0 12 12" className="h-3 w-3" fill="none" stroke="#C6FF3D" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <polyline points="2.5 6.5 5 9 9.5 3.5" />
      </svg>
    </span>
  );
}

function LivePill({ count, paused, compact = false }: { count: number; paused: boolean; compact?: boolean }) {
  return (
    <div className="flex items-center gap-2 rounded-full border border-line bg-panel px-3 py-1.5">
      <span className={paused ? "relative flex h-2 w-2" : "live-dot-wrap flex h-2 w-2"}>
        <span className={`h-2 w-2 rounded-full ${paused ? "bg-faint" : "bg-lime"}`} />
      </span>
      <span className="font-mono text-[11px] text-muted">
        {paused ? "Paused" : "Live"} · {count} events
      </span>
      {!compact && <span className="sr-only">live event count</span>}
    </div>
  );
}

/* ---------------- hero chart ---------------- */
const CW = 720, CH = 260, CPL = 38, CPR = 14, CPT = 20, CPB = 30;
const plotW = CW - CPL - CPR;
const plotH = CH - CPT - CPB;
const yMax = Math.ceil(Math.max(...eventsByHour, ...sessionsByHour) * 1.15) || 1;
const xFor = (h: number) => CPL + (h / 23) * plotW;
const yFor = (v: number) => CPT + plotH - (v / yMax) * plotH;

interface Pt { x: number; y: number }
function smoothPath(pts: Pt[]): string {
  if (pts.length < 2) return "";
  let d = `M ${pts[0].x.toFixed(1)} ${pts[0].y.toFixed(1)}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[Math.max(0, i - 1)], p1 = pts[i], p2 = pts[i + 1], p3 = pts[Math.min(pts.length - 1, i + 2)];
    const c1x = p1.x + (p2.x - p0.x) / 6, c1y = p1.y + (p2.y - p0.y) / 6;
    const c2x = p2.x - (p3.x - p1.x) / 6, c2y = p2.y - (p3.y - p1.y) / 6;
    d += ` C ${c1x.toFixed(1)} ${c1y.toFixed(1)}, ${c2x.toFixed(1)} ${c2y.toFixed(1)}, ${p2.x.toFixed(1)} ${p2.y.toFixed(1)}`;
  }
  return d;
}

function HeroChart() {
  const [hover, setHover] = useState<number | null>(null);
  const sessPts = HOURS.map((h) => ({ x: xFor(h), y: yFor(sessionsByHour[h]) }));
  const evPts = HOURS.map((h) => ({ x: xFor(h), y: yFor(eventsByHour[h]) }));
  const sessLine = smoothPath(sessPts);
  const sessArea = `${sessLine} L ${xFor(23).toFixed(1)} ${yFor(0)} L ${xFor(0).toFixed(1)} ${yFor(0)} Z`;
  const ticks = [0, 1, 2, 3].map((i) => Math.round((yMax * i) / 3));

  const onMove = (e: React.MouseEvent<SVGSVGElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * CW;
    const idx = Math.round(((x - CPL) / plotW) * 23);
    setHover(Math.max(0, Math.min(23, idx)));
  };

  return (
    <div className="card fade-up relative h-full overflow-hidden p-5" style={{ animationDelay: "280ms" }}>
      <div className="pointer-events-none absolute inset-0"
        style={{ background: "radial-gradient(600px circle at 30% 0%, rgba(198,255,61,0.08), transparent 60%)" }} />
      <div className="relative">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="font-display text-[15px] font-semibold text-text">Playback activity</div>
            <div className="mt-0.5 text-xs text-muted">Sessions and events by hour (recorded run)</div>
          </div>
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1.5 text-xs text-muted">
              <span className="h-[3px] w-4 rounded bg-lime" /> Sessions
            </span>
            <span className="flex items-center gap-1.5 text-xs text-muted">
              <span className="w-4 border-t-2 border-dashed border-muted" /> Events
            </span>
            <span className="rounded-full border border-line bg-raised px-2.5 py-1 font-mono text-[11px] text-muted">
              {s.sessions} sessions
            </span>
          </div>
        </div>

        <div className="relative mt-3">
          <svg viewBox={`0 0 ${CW} ${CH}`} className="h-auto w-full"
            onMouseMove={onMove} onMouseLeave={() => setHover(null)} role="img"
            aria-label="Sessions and events by hour of day">
            <defs>
              <linearGradient id="heroArea" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#C6FF3D" stopOpacity="0.20" />
                <stop offset="100%" stopColor="#C6FF3D" stopOpacity="0" />
              </linearGradient>
            </defs>
            {ticks.map((t) => (
              <g key={t}>
                <line x1={CPL} x2={CW - CPR} y1={yFor(t)} y2={yFor(t)} stroke="#1F2833" strokeDasharray="3 4" />
                <text x={CPL - 8} y={yFor(t) + 3} textAnchor="end" fontSize="10" fill="#5A6675"
                  fontFamily="'JetBrains Mono', monospace">{t}</text>
              </g>
            ))}
            {HOURS.filter((h) => h % 3 === 0).map((h) => (
              <text key={h} x={xFor(h)} y={CH - 8} textAnchor="middle" fontSize="10" fill="#5A6675"
                fontFamily="'JetBrains Mono', monospace">{String(h).padStart(2, "0")}:00</text>
            ))}
            <path d={sessArea} fill="url(#heroArea)" />
            <path d={smoothPath(evPts)} fill="none" stroke="#8B98A8" strokeWidth="1.5" strokeDasharray="4 4" />
            <path d={sessLine} fill="none" stroke="#C6FF3D" strokeWidth="2" strokeLinecap="round" />
            {/* peak marker */}
            <circle cx={xFor(peakHour)} cy={yFor(sessionsByHour[peakHour])} r="4" fill="#FFB547" stroke="#0B0F14" strokeWidth="1.5" />
            <text x={xFor(peakHour)} y={yFor(sessionsByHour[peakHour]) - 11} textAnchor="middle" fontSize="10"
              fill="#FFB547" fontFamily="'JetBrains Mono', monospace">Peak</text>
            {/* hover crosshair */}
            {hover !== null && (
              <g>
                <line x1={xFor(hover)} x2={xFor(hover)} y1={CPT} y2={CPT + plotH} stroke="#2A3542" />
                <circle cx={xFor(hover)} cy={yFor(sessionsByHour[hover])} r="3.5" fill="#C6FF3D" stroke="#0B0F14" strokeWidth="1.5" />
                <circle cx={xFor(hover)} cy={yFor(eventsByHour[hover])} r="3.5" fill="#8B98A8" stroke="#0B0F14" strokeWidth="1.5" />
              </g>
            )}
          </svg>
          {hover !== null && (
            <div className="pointer-events-none absolute top-0 z-10 -translate-x-1/2 rounded-lg border border-linestrong bg-raised px-2.5 py-1.5 font-mono text-[11px] text-text shadow-lg"
              style={{ left: `${(xFor(hover) / CW) * 100}%` }}>
              {String(hover).padStart(2, "0")}:00 · {sessionsByHour[hover]} sessions · {eventsByHour[hover]} events
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ---------------- live gauge ---------------- */
function LiveGauge({ liveCount }: { liveCount: number }) {
  const R = 80;
  const CIRC = 2 * Math.PI * R;
  const ARC = CIRC * (240 / 360);
  const frac = Math.min(liveCount, 120) / 120;
  return (
    <div className="card fade-up h-full p-5" style={{ animationDelay: "350ms" }}>
      <div className="flex items-center justify-between">
        <div className="font-display text-[15px] font-semibold text-text">Live stream</div>
        <span className="rounded-full border border-line px-2 py-1 font-mono text-[10px] uppercase tracking-wider text-faint">
          Browser sim
        </span>
      </div>
      <div className="relative mx-auto mt-1 w-[212px]">
        <svg viewBox="0 0 200 200" className="w-full" role="img" aria-label={`Live events this session: ${liveCount}`}>
          <defs>
            <linearGradient id="gaugeGrad" x1="0" y1="1" x2="1" y2="0">
              <stop offset="0%" stopColor="#8FBF1F" />
              <stop offset="100%" stopColor="#C6FF3D" />
            </linearGradient>
          </defs>
          <circle cx="100" cy="100" r={R} fill="none" stroke="#1F2833" strokeWidth="13"
            strokeLinecap="round" strokeDasharray={`${ARC} ${CIRC}`} transform="rotate(150 100 100)" />
          <circle cx="100" cy="100" r={R} fill="none" stroke="url(#gaugeGrad)" strokeWidth="13"
            strokeLinecap="round" strokeDasharray={`${ARC * frac} ${CIRC}`} transform="rotate(150 100 100)"
            style={{ transition: "stroke-dasharray 600ms ease" }} />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-faint">Events</span>
          <span className="font-display text-[40px] font-semibold leading-none text-text">{liveCount}</span>
          <span className="mt-1 font-mono text-[10px] text-faint">of 120 scale</span>
        </div>
      </div>
      <p className="-mt-2 text-center text-[11px] text-faint">live simulation · new event every 1.8s</p>
      <div className="mt-4 grid grid-cols-3 divide-x divide-line border-t border-line pt-4 text-center">
        <div>
          <div className="font-display text-[17px] font-semibold text-text">{s.contentItems}</div>
          <div className="mt-0.5 text-[10.5px] uppercase tracking-wider text-faint">Content items</div>
        </div>
        <div>
          <div className="font-display text-[17px] font-semibold text-text">{s.totalWatchMin.toFixed(0)} min</div>
          <div className="mt-0.5 text-[10.5px] uppercase tracking-wider text-faint">Total watch</div>
        </div>
        <div>
          <div className="font-display text-[17px] font-semibold text-text">{s.silverRetained}/{s.bronzeEvents}</div>
          <div className="mt-0.5 text-[10.5px] uppercase tracking-wider text-faint">Silver retained</div>
        </div>
      </div>
    </div>
  );
}

/* ---------------- breakdown bars ---------------- */
interface BarItem {
  name: string;
  value: number;
  share: string;
  bar: string;
  valueColor: string;
  glow?: boolean;
}

function Breakdown() {
  const [mode, setMode] = useState<"genres" | "buckets">("genres");
  const genreItems: BarItem[] = [...seed.contentAnalyticsByGenre]
    .sort((a, b) => b.sessions - a.sessions)
    .map((g, i) => ({
      name: g.genre,
      value: g.sessions,
      share: `${((g.sessions / s.sessions) * 100).toFixed(1)}%`,
      bar: i === 0 ? "#C6FF3D" : "#2A3542",
      valueColor: i === 0 ? "#C6FF3D" : "#8B98A8",
      glow: i === 0,
    }));
  const bucketItems: BarItem[] = [
    { name: "High ≥ 80%", value: s.completionBuckets.high_ge_80, share: "43.90%", bar: "#C6FF3D", valueColor: "#C6FF3D", glow: true },
    { name: "Mid 30–79%", value: s.completionBuckets.mid_30_79, share: "26.83%", bar: "#FFB547", valueColor: "#FFB547" },
    { name: "Low < 30%", value: s.completionBuckets.low_lt_30, share: "29.27%", bar: "#2A3542", valueColor: "#FFB547" },
  ];
  const items = mode === "genres" ? genreItems : bucketItems;
  const max = Math.max(...items.map((i) => i.value));

  return (
    <div className="card fade-up h-full p-5" style={{ animationDelay: "420ms" }}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="font-display text-[15px] font-semibold text-text">Where viewing went</div>
          <div className="mt-0.5 text-xs text-muted">
            {mode === "genres" ? "Sessions per genre — recorded run" : "Sessions by completion bucket — 41 sessions"}
          </div>
        </div>
        <div className="inline-flex rounded-full border border-line bg-raised p-1">
          {(["genres", "buckets"] as const).map((m) => (
            <button key={m} onClick={() => setMode(m)}
              className={`rounded-full px-3.5 py-1.5 text-xs font-medium capitalize transition-colors ${
                mode === m ? "border border-line bg-ink text-lime" : "border border-transparent text-muted hover:text-text"
              }`}>
              {m}
            </button>
          ))}
        </div>
      </div>
      <div key={mode} className="mt-4 flex items-start gap-2 px-1 sm:gap-3">
        {items.map((it, i) => (
          <div key={it.name} className="flex min-w-0 flex-1 flex-col items-center">
            <div className="flex h-5 items-end font-mono text-xs" style={{ color: it.valueColor }}>{it.value}</div>
            <div className="flex h-[118px] w-full items-end justify-center">
              <div className="bar-grow w-full max-w-[62px] rounded-t-lg"
                style={{
                  height: `${Math.max(6, (it.value / max) * 118)}px`,
                  background: it.bar,
                  animationDelay: `${i * 70}ms`,
                  boxShadow: it.glow ? "0 0 28px rgba(198,255,61,0.30)" : undefined,
                }} />
            </div>
            <div className="mt-2.5 w-full text-center">
              <div className="truncate text-xs font-medium text-text">{it.name}</div>
              <div className="mt-0.5 font-mono text-[10.5px] text-faint">{it.share} share</div>
            </div>
          </div>
        ))}
      </div>
      {mode === "buckets" && (
        <p className="mt-3 text-[11px] leading-relaxed text-faint">
          Estimated completion = max playback position ÷ catalog duration, capped at 100%. Small demo dataset — not representative audience findings.
        </p>
      )}
    </div>
  );
}

/* ---------------- activity feed ---------------- */
function chipClasses(type: string): string {
  if (type === "play") return "border-lime/25 bg-lime/10 text-lime";
  if (type === "buffer") return "border-amber/25 bg-amber/10 text-amber";
  return "border-line bg-raised text-muted";
}

function ActivityFeed({
  live, liveCount, liveSessions, paused, onToggle,
}: {
  live: LiveEvent[];
  liveCount: number;
  liveSessions: number;
  paused: boolean;
  onToggle: () => void;
}) {
  return (
    <div className="card fade-up flex h-full flex-col p-5" style={{ animationDelay: "490ms" }}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="font-display text-[15px] font-semibold text-text">Live playback events</div>
          <div className="mt-0.5 text-xs text-muted">
            {liveCount} events this session · {liveSessions} viewing sessions started
          </div>
        </div>
        <button onClick={onToggle}
          className="shrink-0 rounded-lg border border-line bg-raised px-3 py-1.5 text-xs font-semibold text-text transition-colors hover:border-linestrong">
          {paused ? "Resume" : "Pause"}
        </button>
      </div>
      <div className="scrollthin mt-2 max-h-[424px] flex-1 overflow-y-auto pr-1">
        {live.length === 0 && <p className="py-6 text-sm text-muted">Waiting for the first event…</p>}
        <div className="divide-y divide-line">
          {live.map((e) => (
            <div key={e.id} className="flex items-center gap-3 py-2.5">
              <span className={`w-[62px] shrink-0 rounded-md border px-1.5 py-1 text-center font-mono text-[10px] font-semibold uppercase tracking-wide ${chipClasses(e.event_type)}`}>
                {e.event_type}
              </span>
              <div className="min-w-0 flex-1">
                <div className="truncate text-[13px] font-medium text-text">{e.title}</div>
                <div className="truncate text-xs text-muted">
                  {e.genre} · {e.user_id} · position {e.playback_position_min} min
                </div>
              </div>
              <span className="shrink-0 font-mono text-[11px] text-faint">{e.at}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ---------------- other views ---------------- */
function GenreTable() {
  return (
    <TableCard title="Engagement by genre (mart_content_engagement)">
      <table className="tbl w-full">
        <thead><tr><th>Genre</th><th>Sessions</th><th>Unique viewers</th><th>Total duration (min)</th><th>Avg duration (min)</th><th>Avg completion %</th></tr></thead>
        <tbody>
          {seed.contentAnalyticsByGenre.map((g) => (
            <tr key={g.genre}>
              <td className="t">{g.genre}</td>
              <td className="n">{g.sessions}</td>
              <td className="n">{g.unique_viewers}</td>
              <td className="n">{g.total_duration_min.toFixed(2)}</td>
              <td className="n">{g.avg_duration_min.toFixed(2)}</td>
              <td className="n">{g.avg_completion_pct.toFixed(2)}%</td>
            </tr>
          ))}
        </tbody>
      </table>
    </TableCard>
  );
}

function ContentAnalyticsView() {
  return (
    <section className="space-y-5">
      <GenreTable />
      <TableCard title="Per-title engagement (dim_content)" delay={80}>
        <table className="tbl w-full">
          <thead><tr><th>Title</th><th>Genre</th><th>Duration</th><th>Sessions</th><th>Viewers</th><th>Total watch (min)</th><th>Avg completion %</th></tr></thead>
          <tbody>
            {seed.dimContent.map((c) => (
              <tr key={c.content_id}>
                <td className="t">{c.title}</td>
                <td>{c.genre}</td>
                <td className="n">{c.duration_min} min</td>
                <td className="n">{c.total_sessions}</td>
                <td className="n">{c.unique_viewers}</td>
                <td className="n">{c.total_watch_min.toFixed(2)}</td>
                <td className="n">{c.avg_completion_pct.toFixed(2)}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </TableCard>
    </section>
  );
}

function SessionsView() {
  return (
    <section className="space-y-5">
      <TableCard title="fact_viewing_sessions — all 41 sessions">
        <table className="tbl w-full">
          <thead><tr><th>Session</th><th>User</th><th>Title</th><th>Start (UTC)</th><th>Elapsed (min)</th><th>Events</th><th>Max position</th><th>Completion</th><th>Bucket</th></tr></thead>
          <tbody>
            {seed.factViewingSessions.map((r) => (
              <tr key={r.session_id}>
                <td className="n">{r.session_id}</td>
                <td>{r.user_id}</td>
                <td className="t">{r.title}</td>
                <td className="n">{fmtDateTime(r.session_start)}</td>
                <td className="n">{r.duration_elapsed_min.toFixed(2)}</td>
                <td className="n">{r.event_count}</td>
                <td className="n">{r.max_playback_position_min} / {r.catalog_duration_min}</td>
                <td className="n">{r.estimated_completion_pct.toFixed(1)}%</td>
                <td>{r.completion_bucket}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </TableCard>
      <div className="grid gap-5 lg:grid-cols-2">
        <TableCard title="dim_user (33 rows — first 10)" delay={80}>
          <table className="tbl w-full">
            <thead><tr><th>User</th><th>Sessions</th><th>Events</th><th>Watch (min)</th><th>Avg completion %</th></tr></thead>
            <tbody>
              {seed.dimUser.slice(0, 10).map((u) => (
                <tr key={u.user_id}>
                  <td className="t">{u.user_id}</td>
                  <td className="n">{u.total_sessions}</td>
                  <td className="n">{u.total_events}</td>
                  <td className="n">{u.total_watch_min.toFixed(2)}</td>
                  <td className="n">{u.avg_completion_pct.toFixed(2)}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </TableCard>
        <div className="card fade-up h-full p-5" style={{ animationDelay: "140ms" }}>
          <div className="mb-3 font-display text-[15px] font-semibold text-text">Gold datasets</div>
          <ul className="list-disc space-y-2 pl-5 text-sm leading-relaxed text-muted">
            <li><b className="text-text">fact_viewing_sessions</b> — 41 rows, session start/end, elapsed duration, event counts by type, max position, estimated completion.</li>
            <li><b className="text-text">dim_user</b> — 33 rows of per-user session / event / duration aggregates.</li>
            <li><b className="text-text">dim_content</b> — 14 catalog titles with engagement aggregates.</li>
          </ul>
        </div>
      </div>
    </section>
  );
}

function DataQualityView() {
  const checks = [
    `Bronze events captured: ${s.bronzeEvents}`,
    `Records retained after validation: ${s.silverRetained} (100%)`,
    "Required fields present & non-null — PASS",
    "Event types within {play, pause, seek, buffer, stop} — PASS",
    "Timestamps parsed as UTC — PASS",
    "Negative playback positions — none retained",
    "dbt build (recorded run) — completed, no test errors",
  ];
  return (
    <section className="grid gap-5 lg:grid-cols-2">
      <div className="card fade-up p-5">
        <div className="mb-3 font-display text-[15px] font-semibold text-text">Silver validation — recorded run</div>
        <ul className="space-y-2.5 text-sm text-muted">
          {checks.map((x) => (
            <li key={x} className="flex gap-2.5"><Check /><span>{x}</span></li>
          ))}
        </ul>
        <p className="mt-4 text-xs leading-relaxed text-faint">
          Still to test (roadmap): malformed events, duplicate delivery, out-of-order / late events, empty inputs, expired catalog licenses.
        </p>
      </div>
      <div className="card fade-up p-5" style={{ animationDelay: "80ms" }}>
        <div className="mb-3 font-display text-[15px] font-semibold text-text">dbt models (dbt-clickhouse)</div>
        <ul className="space-y-2.5 text-sm text-muted">
          <li><span className="font-mono text-[13px] text-lime">stg_playback_events</span> — staging, typed Silver events</li>
          <li><span className="font-mono text-[13px] text-lime">stg_viewing_sessions</span> — staging, Gold session fact</li>
          <li><span className="font-mono text-[13px] text-lime">int_content_engagement</span> — intermediate, per-title engagement</li>
          <li><span className="font-mono text-[13px] text-lime">mart_content_engagement</span> — mart, genre engagement served by FastAPI</li>
        </ul>
        <p className="mt-4 text-xs leading-relaxed text-faint">
          schema.yml tests: not_null, unique, accepted_values on event types and completion buckets.
        </p>
      </div>
    </section>
  );
}

function FeaturesView() {
  const featureSample = seed.userFeatures.slice(0, 12);
  return (
    <section className="space-y-5">
      <div className="grid gap-5 lg:grid-cols-3">
        <div className="card fade-up p-5">
          <div className="mb-2 font-display text-[15px] font-semibold text-text">A/B test — recorded run</div>
          <p className="text-sm text-muted">Control <b className="text-text">{seed.abTest.control_users} users</b> · Treatment <b className="text-text">{seed.abTest.treatment_users} users</b></p>
          <p className="mt-2 text-sm text-muted">
            Welch two-sample t-test on average estimated watch time:{" "}
            <b className="font-mono text-[13px] text-text">p = {seed.abTest.reported_run_p_value}</b>
          </p>
          <p className="mt-1.5 text-sm font-semibold text-amber">Not statistically significant.</p>
        </div>
        <div className="card fade-up p-5" style={{ animationDelay: "80ms" }}>
          <div className="mb-2 font-display text-[15px] font-semibold text-text">Reproduced run (this repo)</div>
          <p className="text-sm text-muted">Control mean <span className="font-mono text-[13px] text-text">{seed.abTest.control_mean_watch_min} min</span> · Treatment mean <span className="font-mono text-[13px] text-text">{seed.abTest.treatment_mean_watch_min} min</span></p>
          <p className="mt-2 text-sm text-muted">
            t = <span className="font-mono text-[13px] text-text">{seed.abTest.t_statistic}</span>, p = <span className="font-mono text-[13px] text-text">{seed.abTest.p_value}</span> — also not significant, consistent with the recorded run.
          </p>
        </div>
        <div className="card fade-up p-5" style={{ animationDelay: "160ms" }}>
          <div className="mb-2 font-display text-[15px] font-semibold text-text">Sample size required</div>
          <p className="text-sm text-muted"><b className="text-text">{seed.abTest.required_users_per_group} users per group · {seed.abTest.required_users_total} total</b></p>
          <p className="mt-2 text-xs leading-relaxed text-faint">
            Effect size 0.5, alpha 0.05, power 0.80 — the current 33-user demo is underpowered by design; that is the honest conclusion.
          </p>
        </div>
      </div>
      <TableCard title="User features — 33 records × 13 columns (first 12 shown)" delay={120}>
        <table className="tbl w-full">
          <thead><tr><th>User</th><th>Group</th><th>Sessions</th><th>Events</th><th>Watch (min)</th><th>Avg session (min)</th><th>Avg max pos</th><th>Avg completion %</th><th>Night sessions</th><th>Avg hour</th></tr></thead>
          <tbody>
            {featureSample.map((f) => (
              <tr key={f.user_id}>
                <td className="t">{f.user_id}</td>
                <td>{seed.abAssignments[f.user_id]}</td>
                <td className="n">{f.total_sessions}</td>
                <td className="n">{f.total_events}</td>
                <td className="n">{f.total_watch_min.toFixed(2)}</td>
                <td className="n">{f.avg_session_duration_min.toFixed(2)}</td>
                <td className="n">{f.avg_max_position_min.toFixed(2)}</td>
                <td className="n">{f.avg_completion_pct.toFixed(2)}%</td>
                <td className="n">{f.night_sessions}</td>
                <td className="n">{f.avg_viewing_hour.toFixed(1)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </TableCard>
    </section>
  );
}

function ArchitectureView() {
  return (
    <section className="grid gap-5 lg:grid-cols-2">
      <div className="card fade-up p-5">
        <div className="mb-3 font-display text-[15px] font-semibold text-text">Architecture</div>
        <ol className="list-decimal space-y-2.5 pl-5 text-sm leading-relaxed text-muted">
          <li><b className="text-text">Producer</b> — Python generates play / pause / seek / buffer / stop events → Kafka topic <span className="font-mono text-[13px] text-text">playback-events</span>.</li>
          <li><b className="text-text">Bronze</b> — consumer appends raw JSONL with partition, offset, ingested_at.</li>
          <li><b className="text-text">Silver</b> — pandas validation, UTC timestamps, numeric positions, supported types only.</li>
          <li><b className="text-text">Sessionization</b> — sorted by user + content + time; new session after a &gt;30-min gap.</li>
          <li><b className="text-text">Gold</b> — fact_viewing_sessions + dim_user + dim_content.</li>
          <li><b className="text-text">Analytics</b> — ClickHouse tables/views; dbt staging → intermediate → mart with tests.</li>
          <li><b className="text-text">Delivery</b> — FastAPI /, /health, /analytics/content → React dashboard.</li>
        </ol>
      </div>
      <div className="card fade-up p-5" style={{ animationDelay: "80ms" }}>
        <div className="mb-3 font-display text-[15px] font-semibold text-text">Limitations &amp; roadmap</div>
        <ul className="list-disc space-y-2.5 pl-5 text-sm leading-relaxed text-muted">
          <li>Small synthetic demo dataset (112 events) — results are not representative audience findings.</li>
          <li>Session duration = elapsed first-to-last event, not verified active playback time.</li>
          <li>Airflow orchestration in progress — Docker storage-capacity issue blocked its deployment.</li>
          <li>Next: watermark-based catalog ingestion + licensing expiry, late-arrival / dedup policies, rolling 30-day genre features + recommendation API, concurrent-viewer &amp; funnel charts, GitHub Actions CI + Terraform.</li>
        </ul>
      </div>
      <div className="card fade-up p-5 lg:col-span-2" style={{ animationDelay: "160ms" }}>
        <div className="mb-3 font-display text-[15px] font-semibold text-text">Service status (demo)</div>
        <div className="flex flex-wrap gap-x-10 gap-y-2 text-sm text-muted">
          <span>FastAPI <span className="font-semibold text-lime">● simulated healthy (demo)</span></span>
          <span>ClickHouse <span className="font-semibold text-lime">● seed Gold data (demo)</span></span>
          <span>Kafka topic <span className="font-mono text-[13px] text-text">playback-events</span></span>
          <span>Catalog titles returned <span className="font-mono text-[13px] text-text">{catalog.length}</span></span>
        </div>
      </div>
    </section>
  );
}

/* ---------------- page ---------------- */
export default function Page() {
  const [tab, setTab] = useState<Tab>("Live Dashboard");
  const [live, setLive] = useState<LiveEvent[]>([]);
  const [liveCount, setLiveCount] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (paused) return;
    const t = setInterval(() => {
      setLiveCount((c) => {
        const ev = nextLiveEvent(c + 1);
        setLive((prev) => [ev, ...prev].slice(0, 14));
        return c + 1;
      });
    }, 1800);
    return () => clearInterval(t);
  }, [paused]);

  const liveSessions = useMemo(
    () => new Set(live.filter((e) => e.event_type === "play").map((e) => `${e.user_id}-${e.content_id}`)).size,
    [live]
  );

  const navButton = (label: Tab, Icon: (p: IconProps) => ReactNode) => {
    const active = tab === label;
    return (
      <button key={label} onClick={() => setTab(label)}
        className={`relative flex w-full items-center gap-3 rounded-[10px] px-3 py-2.5 text-left text-[13.5px] transition-colors ${
          active ? "bg-raised font-medium text-text" : "text-muted hover:bg-raised/60 hover:text-text"
        }`}>
        {active && <span className="absolute left-0 top-1/2 h-5 w-[2px] -translate-y-1/2 rounded bg-lime" />}
        <span className={active ? "text-lime" : "text-faint"}><Icon className="h-[17px] w-[17px]" /></span>
        {label}
      </button>
    );
  };

  return (
    <div className="min-h-screen bg-ink font-sans text-text lg:pl-[248px]">
      {/* ===== sidebar (desktop) ===== */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-[248px] flex-col border-r border-line bg-panel lg:flex">
        <div className="flex items-center gap-2.5 px-5 pt-5">
          <LogoMark />
          <span className="font-display text-[17px] font-semibold tracking-tight text-text">Meridian</span>
        </div>

        <div className="mx-4 mt-5 flex items-center gap-3 rounded-2xl border border-line bg-raised p-3.5">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-lime/20 bg-lime/10 text-lime">
            <IconZap className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <div className="truncate text-[13px] font-semibold text-text">Project Meridian</div>
            <div className="truncate font-mono text-[10.5px] text-faint">Kafka · ClickHouse · dbt</div>
          </div>
        </div>

        <nav className="scrollthin mt-6 flex-1 space-y-6 overflow-y-auto px-3 pb-4">
          {NAV.map((g) => (
            <div key={g.group}>
              <div className="px-3 pb-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-faint">{g.group}</div>
              <div className="space-y-1">
                {g.items.map((it) => navButton(it.label, it.Icon))}
              </div>
            </div>
          ))}
        </nav>

        <div className="mx-4 mb-4 rounded-2xl border border-line bg-raised p-4">
          <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-faint">Data quality</div>
          <div className="mt-2 font-mono text-xs text-text">{s.silverRetained} / {s.bronzeEvents} events retained</div>
          <div className="mt-2.5 h-1.5 w-full overflow-hidden rounded-full bg-line">
            <div className="h-full w-full rounded-full bg-lime shadow-[0_0_10px_rgba(198,255,61,0.45)]" />
          </div>
          <div className="mt-2 text-[11px] text-muted">{s.sessions} sessions · {s.users} users · {s.contentItems} titles</div>
        </div>

        <div className="flex items-center gap-3 border-t border-line px-5 py-4">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-line bg-raised font-display text-[13px] font-semibold text-lime">
            RK
          </div>
          <div className="min-w-0">
            <div className="truncate text-[13px] font-medium text-text">Rohit Kumar</div>
            <div className="truncate text-[11px] text-faint">BTech CSE · Final Year</div>
          </div>
        </div>
      </aside>

      {/* ===== mobile header ===== */}
      <div className="sticky top-0 z-40 border-b border-line bg-ink/85 backdrop-blur lg:hidden">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2.5">
            <LogoMark size={26} />
            <span className="font-display text-[16px] font-semibold text-text">Meridian</span>
          </div>
          <LivePill count={liveCount} paused={paused} compact />
        </div>
        <nav className="scrollthin flex gap-1.5 overflow-x-auto px-4 pb-3">
          {TABS.map((t) => (
            <button key={t} onClick={() => setTab(t)}
              className={`whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                tab === t ? "bg-raised text-lime shadow-[inset_0_0_0_1px_#2A3542]" : "text-muted"
              }`}>
              {t}
            </button>
          ))}
        </nav>
      </div>

      {/* ===== top bar (desktop) ===== */}
      <header className="sticky top-0 z-30 hidden border-b border-line bg-ink/80 backdrop-blur lg:block">
        <div className="mx-auto flex h-[72px] max-w-[1320px] items-center justify-between gap-4 px-8">
          <div>
            <h1 className="font-display text-2xl font-semibold tracking-tight text-text">Project Meridian</h1>
            <p className="mt-0.5 text-[13px] text-muted">Streaming-media data engineering · recorded run + live simulation</p>
          </div>
          <div className="flex items-center gap-2.5">
            <span className="rounded-full border border-line bg-panel px-3 py-1.5 font-mono text-[11px] text-muted">
              Recorded run · 8 Nov 2026
            </span>
            <LivePill count={liveCount} paused={paused} />
          </div>
        </div>
      </header>

      {/* ===== main ===== */}
      <main className="mx-auto max-w-[1320px] px-5 pb-10 pt-6 sm:px-8 lg:pt-7">
        {/* mobile title */}
        <div className="mb-5 lg:hidden">
          <h1 className="font-display text-[22px] font-semibold tracking-tight text-text">Project Meridian</h1>
          <p className="mt-0.5 text-[13px] text-muted">Streaming-media data engineering · recorded run + live simulation</p>
          <span className="mt-2.5 inline-block rounded-full border border-line bg-panel px-3 py-1.5 font-mono text-[11px] text-muted">
            Recorded run · 8 Nov 2026
          </span>
        </div>

        {tab === "Live Dashboard" && (
          <div>
            <div className="fade-up mb-5 rounded-2xl border border-amber/25 bg-amber/[0.06] px-4 py-3 text-xs leading-relaxed text-amber/90" style={{ animationDelay: "40ms" }}>
              Live demo on Vercel — full Kafka/ClickHouse stack runs locally via Docker. Numbers below are the verified
              recorded run (112 events → 41 sessions) generated by <span className="font-mono">pipeline/run_pipeline_local.py</span>;
              the live feed is a browser simulation of the Python Kafka producer.
            </div>

            <section className="grid grid-cols-12 gap-5">
              <div className="col-span-12 sm:col-span-6 xl:col-span-3">
                <Kpi icon={<IconDatabase className="h-4 w-4" />} label="Bronze events" chip="100% retained"
                  value={String(s.bronzeEvents)} caption="raw JSONL · Kafka playback-events" spark={eventsByHour} delay={60} />
              </div>
              <div className="col-span-12 sm:col-span-6 xl:col-span-3">
                <Kpi icon={<IconLayers className="h-4 w-4" />} label="Viewing sessions" chip="30-min threshold"
                  value={String(s.sessions)} caption="from 112 events" spark={sessionsByHour} delay={130} />
              </div>
              <div className="col-span-12 sm:col-span-6 xl:col-span-3">
                <Kpi icon={<IconUsers className="h-4 w-4" />} label="Users" chip="13 features each"
                  value={String(s.users)} caption="Gold dim_user" spark={cumUsersByHour} delay={200} />
              </div>
              <div className="col-span-12 sm:col-span-6 xl:col-span-3">
                <Kpi icon={<IconPercent className="h-4 w-4" />} label="Avg completion" chip="12 low <30%" chipTone="warn"
                  value={`${s.avgCompletionPct.toFixed(2)}%`} caption="18 high ≥80% · 11 mid" spark={completionSeries} delay={270} />
              </div>

              <div className="col-span-12 xl:col-span-8"><HeroChart /></div>
              <div className="col-span-12 xl:col-span-4"><LiveGauge liveCount={liveCount} /></div>

              <div className="col-span-12 xl:col-span-7"><Breakdown /></div>
              <div className="col-span-12 xl:col-span-5">
                <ActivityFeed live={live} liveCount={liveCount} liveSessions={liveSessions}
                  paused={paused} onToggle={() => setPaused((p) => !p)} />
              </div>

              <div className="card fade-up col-span-12 p-5" style={{ animationDelay: "560ms" }}>
                <div className="mb-2 font-display text-[15px] font-semibold text-text">Pipeline flow</div>
                <p className="text-sm leading-7 text-muted">
                  Python Producer → Apache Kafka → Consumer → <b className="text-lime">Bronze</b> JSONL → <b className="text-lime">Silver</b> cleaning →
                  Sessionization (30 min) → <b className="text-lime">Gold</b> fact / dimensions → ClickHouse + dbt → FastAPI → React
                </p>
              </div>
            </section>
          </div>
        )}

        {tab === "Content Analytics" && <div key="ca"><ContentAnalyticsView /></div>}
        {tab === "Sessions & Gold" && <div key="sg"><SessionsView /></div>}
        {tab === "Data Quality & dbt" && <div key="dq"><DataQualityView /></div>}
        {tab === "Features & A/B Test" && <div key="ab"><FeaturesView /></div>}
        {tab === "Architecture & Roadmap" && <div key="ar"><ArchitectureView /></div>}

        <footer className="mt-10 text-center text-xs text-faint">
          Project Meridian · Rohit Kumar · github.com/rohit01rk · Pipeline: Python / Kafka / pandas / ClickHouse / dbt / FastAPI / React (Next.js)
        </footer>
      </main>
    </div>
  );
}
