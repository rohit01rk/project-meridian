import seedJson from "./seed.json";

export interface CatalogItem {
  content_id: string;
  title: string;
  genre: string;
  duration_min: number;
  release_year: number;
}

export interface SessionRow {
  session_id: string;
  user_id: string;
  content_id: string;
  title: string;
  genre: string;
  session_start: string;
  session_end: string;
  duration_elapsed_min: number;
  event_count: number;
  max_playback_position_min: number;
  catalog_duration_min: number;
  estimated_completion_pct: number;
  completion_bucket: string;
}

export interface GenreAnalytics {
  genre: string;
  sessions: number;
  unique_viewers: number;
  total_duration_min: number;
  avg_duration_min: number;
  avg_completion_pct: number;
}

export interface UserFeature {
  user_id: string;
  total_sessions: number;
  total_events: number;
  total_watch_min: number;
  avg_session_duration_min: number;
  avg_max_position_min: number;
  avg_completion_pct: number;
  night_sessions: number;
  avg_viewing_hour: number;
  distinct_content: number;
  play_events: number;
  stop_events: number;
  high_completion_sessions: number;
}

export interface DimContent extends CatalogItem {
  total_sessions: number;
  unique_viewers: number;
  total_events: number;
  total_watch_min: number;
  avg_session_duration_min: number;
  avg_completion_pct: number;
}

export interface DimUser {
  user_id: string;
  total_sessions: number;
  total_events: number;
  total_watch_min: number;
  avg_session_duration_min: number;
  avg_completion_pct: number;
  distinct_content: number;
}

interface Seed {
  summary: {
    bronzeEvents: number;
    silverRetained: number;
    sessions: number;
    users: number;
    contentItems: number;
    totalWatchMin: number;
    avgCompletionPct: number;
    completionBuckets: { high_ge_80: number; mid_30_79: number; low_lt_30: number };
  };
  catalog: CatalogItem[];
  factViewingSessions: SessionRow[];
  dimUser: DimUser[];
  dimContent: DimContent[];
  contentAnalyticsByGenre: GenreAnalytics[];
  userFeatures: UserFeature[];
  abTest: {
    control_users: number;
    treatment_users: number;
    control_mean_watch_min: number;
    treatment_mean_watch_min: number;
    t_statistic: number;
    p_value: number;
    significant_at_0_05: boolean;
    interpretation: string;
    reported_run_p_value: number;
    required_users_per_group: number;
    required_users_total: number;
  };
  abAssignments: Record<string, string>;
}

export const seed = seedJson as unknown as Seed;
export const catalog: CatalogItem[] = seed.catalog;
export const EVENT_TYPES = ["play", "pause", "seek", "buffer", "stop"] as const;
export type PlaybackEventType = (typeof EVENT_TYPES)[number];

export interface LiveEvent {
  id: number;
  event_type: PlaybackEventType;
  user_id: string;
  content_id: string;
  title: string;
  genre: string;
  playback_position_min: number;
  at: string;
}

/** Live simulator: emits one plausible playback event per tick (~1.8s in
 * the dashboard). Playback positions advance within a title's duration;
 * a fresh "play" at position 0 starts a new live viewing session. This is
 * a browser-side simulation of the Kafka producer for the Vercel demo —
 * the real producer is pipeline/producer.py. */
export function nextLiveEvent(id: number): LiveEvent {
  const item = catalog[Math.floor(Math.random() * catalog.length)];
  const user = `U${String(1 + Math.floor(Math.random() * 33)).padStart(3, "0")}`;
  const roll = Math.random();
  const event_type: PlaybackEventType =
    roll < 0.34 ? "play" : roll < 0.52 ? "pause" : roll < 0.68 ? "seek" : roll < 0.8 ? "buffer" : "stop";
  const position =
    event_type === "play"
      ? 0
      : Math.round(Math.random() * item.duration_min * 10) / 10;
  return {
    id,
    event_type,
    user_id: user,
    content_id: item.content_id,
    title: item.title,
    genre: item.genre,
    playback_position_min: position,
    at: new Date().toLocaleTimeString("en-GB"),
  };
}

export function fmtDateTime(iso: string): string {
  return iso.replace("T", " ").replace("+00:00", "").slice(0, 16) + " UTC";
}
