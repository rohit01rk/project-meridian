"""Silver cleaning: Bronze JSONL -> validated, typed playback events.

Rules (exactly the ones recorded in the report):
  * required fields must be present and non-null
  * event names normalized (trim + lower-case) and filtered to the
    supported set {play, pause, seek, buffer, stop}
  * identifiers normalized (trim + upper-case)
  * timestamps parsed as UTC
  * playback positions coerced to numeric; negative positions dropped
Output: Parquet when pyarrow is available, CSV otherwise.
"""
from __future__ import annotations

import json
from pathlib import Path

import pandas as pd

from .catalog import SUPPORTED_EVENTS

REQUIRED = ["event_id", "event_type", "user_id", "content_id", "timestamp", "playback_position_min"]


def load_bronze(bronze_path: Path) -> pd.DataFrame:
    rows = []
    with open(bronze_path, encoding="utf-8") as fh:
        for line in fh:
            line = line.strip()
            if line:
                rows.append(json.loads(line))
    return pd.DataFrame(rows)


def clean(df: pd.DataFrame) -> pd.DataFrame:
    if df.empty:
        return df
    df = df.copy()
    # Required fields present and non-null.
    df = df.dropna(subset=[c for c in REQUIRED if c in df.columns])
    for col in REQUIRED:
        if col not in df.columns:
            raise ValueError(f"bronze data is missing required column: {col}")

    df["event_type"] = df["event_type"].astype(str).str.strip().str.lower()
    df["user_id"] = df["user_id"].astype(str).str.strip().str.upper()
    df["content_id"] = df["content_id"].astype(str).str.strip().str.upper()
    df["event_id"] = df["event_id"].astype(str).str.strip()

    df["timestamp"] = pd.to_datetime(df["timestamp"], utc=True, errors="coerce")
    df = df.dropna(subset=["timestamp"])

    df["playback_position_min"] = pd.to_numeric(df["playback_position_min"], errors="coerce")
    df = df.dropna(subset=["playback_position_min"])
    df = df[df["event_type"].isin(SUPPORTED_EVENTS)]
    df = df[df["playback_position_min"] >= 0]

    # Silver order is the analytical order: user, content, event time.
    df = df.sort_values(["user_id", "content_id", "timestamp", "event_id"]).reset_index(drop=True)
    return df


def write_silver(df: pd.DataFrame, out_dir: Path) -> Path:
    out_dir.mkdir(parents=True, exist_ok=True)
    try:
        import pyarrow  # noqa: F401
        out = out_dir / "playback_events_clean.parquet"
        df.to_parquet(out, index=False)
    except ImportError:
        out = out_dir / "playback_events_clean.csv"
        df.to_csv(out, index=False)
    return out
