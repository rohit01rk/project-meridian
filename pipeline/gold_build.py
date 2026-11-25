"""Gold layer: fact_viewing_sessions, dim_user, dim_content.

Honest metric definitions (also in README):
  * session duration = elapsed minutes between the session's first and
    last event — NOT verified active playback time.
  * estimated completion = max playback position / catalog duration,
    capped at 100% — NOT a precise watch-percentage measure.
"""
from __future__ import annotations

from pathlib import Path

import pandas as pd

from .catalog import CATALOG


def catalog_df() -> pd.DataFrame:
    return pd.DataFrame(CATALOG)


def build_fact(sessionized: pd.DataFrame, catalog: pd.DataFrame) -> pd.DataFrame:
    rows = []
    for (session_id, user_id, content_id), g in sessionized.groupby(
        ["session_id", "user_id", "content_id"], sort=True
    ):
        g = g.sort_values("timestamp")
        cat = catalog[catalog["content_id"] == content_id].iloc[0]
        max_pos = float(g["playback_position_min"].max())
        duration_min = float(cat["duration_min"])
        counts = g["event_type"].value_counts().to_dict()
        start, end = g["timestamp"].iloc[0], g["timestamp"].iloc[-1]
        completion = min(100.0, round(max_pos / duration_min * 100, 2)) if duration_min else 0.0
        rows.append(
            {
                "session_id": session_id,
                "user_id": user_id,
                "content_id": content_id,
                "title": cat["title"],
                "genre": cat["genre"],
                "session_start": start,
                "session_end": end,
                "duration_elapsed_min": round((end - start).total_seconds() / 60.0, 2),
                "event_count": int(len(g)),
                "play_events": int(counts.get("play", 0)),
                "pause_events": int(counts.get("pause", 0)),
                "seek_events": int(counts.get("seek", 0)),
                "buffer_events": int(counts.get("buffer", 0)),
                "stop_events": int(counts.get("stop", 0)),
                "max_playback_position_min": max_pos,
                "catalog_duration_min": duration_min,
                "estimated_completion_pct": completion,
                "completion_bucket": (
                    "high_ge_80" if completion >= 80 else "mid_30_79" if completion >= 30 else "low_lt_30"
                ),
            }
        )
    fact = pd.DataFrame(rows).sort_values(["session_start", "session_id"]).reset_index(drop=True)
    return fact


def build_dim_user(fact: pd.DataFrame) -> pd.DataFrame:
    dim = (
        fact.groupby("user_id")
        .agg(
            total_sessions=("session_id", "count"),
            total_events=("event_count", "sum"),
            total_watch_min=("duration_elapsed_min", "sum"),
            avg_session_duration_min=("duration_elapsed_min", "mean"),
            avg_completion_pct=("estimated_completion_pct", "mean"),
            distinct_content=("content_id", "nunique"),
        )
        .reset_index()
        .sort_values("user_id")
    )
    for c in ["total_watch_min", "avg_session_duration_min", "avg_completion_pct"]:
        dim[c] = dim[c].round(2)
    return dim


def build_dim_content(fact: pd.DataFrame, catalog: pd.DataFrame) -> pd.DataFrame:
    agg = (
        fact.groupby(["content_id", "title", "genre"])
        .agg(
            total_sessions=("session_id", "count"),
            unique_viewers=("user_id", "nunique"),
            total_events=("event_count", "sum"),
            total_watch_min=("duration_elapsed_min", "sum"),
            avg_session_duration_min=("duration_elapsed_min", "mean"),
            avg_completion_pct=("estimated_completion_pct", "mean"),
        )
        .reset_index()
    )
    dim = catalog.merge(agg, on=["content_id", "title", "genre"], how="left")
    for c in ["total_sessions", "unique_viewers", "total_events"]:
        dim[c] = dim[c].fillna(0).astype(int)
    for c in ["total_watch_min", "avg_session_duration_min", "avg_completion_pct"]:
        dim[c] = dim[c].fillna(0).round(2)
    return dim.sort_values("content_id").reset_index(drop=True)


def build_content_analytics(fact: pd.DataFrame) -> pd.DataFrame:
    """The genre-level table the FastAPI /analytics/content endpoint serves."""
    out = (
        fact.groupby("genre")
        .agg(
            sessions=("session_id", "count"),
            unique_viewers=("user_id", "nunique"),
            total_duration_min=("duration_elapsed_min", "sum"),
            avg_duration_min=("duration_elapsed_min", "mean"),
            avg_completion_pct=("estimated_completion_pct", "mean"),
        )
        .reset_index()
        .sort_values("genre")
    )
    for c in ["total_duration_min", "avg_duration_min", "avg_completion_pct"]:
        out[c] = out[c].round(2)
    return out


def write_gold(fact: pd.DataFrame, dim_user: pd.DataFrame, dim_content: pd.DataFrame,
               analytics: pd.DataFrame, catalog: pd.DataFrame, out_dir: Path) -> None:
    out_dir.mkdir(parents=True, exist_ok=True)
    fact.to_csv(out_dir / "fact_viewing_sessions.csv", index=False)
    dim_user.to_csv(out_dir / "dim_user.csv", index=False)
    dim_content.to_csv(out_dir / "dim_content.csv", index=False)
    analytics.to_csv(out_dir / "content_analytics_by_genre.csv", index=False)
    catalog.to_csv(out_dir / "content_catalog.csv", index=False)
