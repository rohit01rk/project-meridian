"""Sessionization: a new viewing session starts when the gap between
adjacent events for the same (user_id, content_id) exceeds 30 minutes.
"""
from __future__ import annotations

import pandas as pd

GAP_THRESHOLD = pd.Timedelta(minutes=30)


def sessionize(df: pd.DataFrame) -> pd.DataFrame:
    """Add `session_id` and `session_seq` to a Silver-cleaned frame."""
    if df.empty:
        return df.assign(session_id=pd.Series(dtype=str), session_seq=pd.Series(dtype=int))
    df = df.sort_values(["user_id", "content_id", "timestamp", "event_id"]).reset_index(drop=True)
    gap = df.groupby(["user_id", "content_id"])["timestamp"].diff()
    is_new = gap.isna() | (gap > GAP_THRESHOLD)
    df["session_seq"] = is_new.groupby([df["user_id"], df["content_id"]]).cumsum().astype(int)
    df["session_id"] = (
        "S-" + df["user_id"] + "-" + df["content_id"] + "-" + df["session_seq"].astype(str).str.zfill(2)
    )
    return df
