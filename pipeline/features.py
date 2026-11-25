"""User feature engineering: one row per user, exactly 13 columns.

Columns: user_id, total_sessions, total_events, total_watch_min,
avg_session_duration_min, avg_max_position_min, avg_completion_pct,
night_sessions, avg_viewing_hour, distinct_content, play_events,
stop_events, high_completion_sessions.
"""
from __future__ import annotations

import pandas as pd

FEATURE_COLUMNS = [
    "user_id", "total_sessions", "total_events", "total_watch_min",
    "avg_session_duration_min", "avg_max_position_min", "avg_completion_pct",
    "night_sessions", "avg_viewing_hour", "distinct_content",
    "play_events", "stop_events", "high_completion_sessions",
]


def build_features(fact: pd.DataFrame) -> pd.DataFrame:
    fact = fact.copy()
    fact["session_start"] = pd.to_datetime(fact["session_start"], utc=True)
    fact["start_hour"] = fact["session_start"].dt.hour
    fact["is_night"] = ((fact["start_hour"] >= 22) | (fact["start_hour"] < 5)).astype(int)
    fact["is_high"] = (fact["estimated_completion_pct"] >= 80).astype(int)

    feats = (
        fact.groupby("user_id")
        .agg(
            total_sessions=("session_id", "count"),
            total_events=("event_count", "sum"),
            total_watch_min=("duration_elapsed_min", "sum"),
            avg_session_duration_min=("duration_elapsed_min", "mean"),
            avg_max_position_min=("max_playback_position_min", "mean"),
            avg_completion_pct=("estimated_completion_pct", "mean"),
            night_sessions=("is_night", "sum"),
            avg_viewing_hour=("start_hour", "mean"),
            distinct_content=("content_id", "nunique"),
            play_events=("play_events", "sum"),
            stop_events=("stop_events", "sum"),
            high_completion_sessions=("is_high", "sum"),
        )
        .reset_index()
        .sort_values("user_id")
        .reset_index(drop=True)
    )
    for c in ["total_watch_min", "avg_session_duration_min", "avg_max_position_min",
              "avg_completion_pct", "avg_viewing_hour"]:
        feats[c] = feats[c].round(2)
    assert list(feats.columns) == FEATURE_COLUMNS, list(feats.columns)
    return feats[FEATURE_COLUMNS]
