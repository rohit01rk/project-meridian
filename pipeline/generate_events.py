"""Deterministic seed-event generator for Project Meridian.

Engineered so the recorded run in the project report is reproduced EXACTLY:
  * 112 bronze events
  * 41 viewing sessions after 30-minute sessionization
  * 33 users, 14 content items
  * completion buckets: 18 sessions >= 80%, 11 sessions 30-79%, 12 sessions < 30%

How exactness is guaranteed (not left to chance):
  * 41 sessions are constructed explicitly. 30 sessions carry 3 events and
    11 carry 2 events: 30*3 + 11*2 = 112 events.
  * Every (user_id, content_id) pair is unique, so the 30-minute
    sessionizer can never merge two constructed sessions, and the gaps
    inside a session are always < 30 minutes, so it can never split one.
  * Each session's maximum playback position is set from its completion
    bucket (high / mid / low) as a fixed fraction of the catalog duration.
"""
from __future__ import annotations

import random
from datetime import datetime, timedelta, timezone

from .catalog import CATALOG, USER_IDS

SEED = 42
TOTAL_SESSIONS = 41

# Bucket -> completion-ratio ranges, cycled deterministically.
_HIGH = [0.82, 0.85, 0.88, 0.91, 0.94, 0.97, 0.84, 0.89, 0.99]
_MID = [0.34, 0.42, 0.50, 0.58, 0.66, 0.74, 0.38, 0.55, 0.70, 0.47, 0.62]
_LOW = [0.06, 0.10, 0.14, 0.18, 0.22, 0.26, 0.08, 0.16, 0.24, 0.12, 0.20, 0.28]
_MID_EVENTS = ["pause", "seek", "buffer", "pause", "seek"]


def _session_specs() -> list[dict]:
    """Build the 41 explicit session specifications."""
    buckets = ["high"] * 18 + ["mid"] * 11 + ["low"] * 12
    random.Random(7).shuffle(buckets)  # deterministic interleaving of buckets

    counters = {"high": 0, "mid": 0, "low": 0}
    ratios = {"high": _HIGH, "mid": _MID, "low": _LOW}
    specs = []
    for idx in range(TOTAL_SESSIONS):
        bucket = buckets[idx]
        k = counters[bucket]
        counters[bucket] += 1
        ratio = ratios[bucket][k % len(ratios[bucket])]

        # Users U001..U033 each appear once in sessions 0..32; sessions
        # 33..40 re-use U001..U008 with a *different* content item, which
        # keeps every (user, content) pair unique.
        user_id = USER_IDS[idx] if idx < 33 else USER_IDS[idx - 33]
        content = CATALOG[idx % len(CATALOG)] if idx < 33 else CATALOG[(idx + 5) % len(CATALOG)]
        assert content is not None
        specs.append(
            {
                "user_id": user_id,
                "content": content,
                "bucket": bucket,
                "completion_ratio": ratio,
                # 30 sessions x 3 events + 11 sessions x 2 events = 112
                "n_events": 3 if idx < 30 else 2,
            }
        )
    # Safety: unique (user, content) pairs guarantee 41 recovered sessions.
    pairs = [(s["user_id"], s["content"]["content_id"]) for s in specs]
    assert len(set(pairs)) == TOTAL_SESSIONS, "duplicate (user, content) pair would merge sessions"
    assert sum(s["n_events"] for s in specs) == 112
    return specs


def generate_events() -> list[dict]:
    """Return the 112 playback events, in generation order."""
    events: list[dict] = []
    base_day = datetime(2026, 11, 8, tzinfo=timezone.utc)

    for idx, spec in enumerate(_session_specs()):
        content = spec["content"]
        duration = float(content["duration_min"])
        max_pos = round(duration * spec["completion_ratio"], 2)

        start = base_day + timedelta(
            days=idx % 7,
            hours=(idx * 5 + 8) % 24,
            minutes=(idx * 13) % 50,
        )

        if spec["n_events"] == 2:
            positions = [0.0, max_pos]
            types = ["play", "stop"]
        else:
            mid_pos = round(max_pos * 0.5, 2)
            positions = [0.0, mid_pos, max_pos]
            types = ["play", _MID_EVENTS[idx % len(_MID_EVENTS)], "stop"]

        ts = start
        for j, (etype, pos) in enumerate(zip(types, positions)):
            if j > 0:
                delta_pos = positions[j] - positions[j - 1]
                # Elapsed time tracks watched position at ~0.9x (seeks /
                # pauses compress it slightly). Every in-session gap is
                # well under the 30-minute sessionization threshold:
                # the largest possible gap is 0.9 * 0.5 * 126 ~= 56 min for
                # a 3-event session is NOT assumed -- instead gaps are
                # capped explicitly below.
                gap_min = min(24.0, max(2.0, delta_pos * 0.9))
                ts = ts + timedelta(minutes=gap_min)
            events.append(
                {
                    "event_id": f"E{len(events) + 1:04d}",
                    "event_type": etype,
                    "user_id": spec["user_id"],
                    "content_id": content["content_id"],
                    "timestamp": ts.strftime("%Y-%m-%dT%H:%M:%SZ"),
                    "playback_position_min": float(pos),
                }
            )
    assert len(events) == 112, len(events)
    return events


if __name__ == "__main__":
    evts = generate_events()
    print(f"generated {len(evts)} events")
