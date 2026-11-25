"""Export the Gold outputs of the local pipeline run to lib/seed.json,
so the Next.js dashboard displays exactly the report's recorded run.

Usage: python3 pipeline/run_pipeline_local.py && python3 scripts/export_seed.py
"""
from __future__ import annotations

import json
from pathlib import Path

import pandas as pd

ROOT = Path(__file__).resolve().parent.parent


def records(path: Path) -> list[dict]:
    df = pd.read_csv(path)
    return json.loads(df.to_json(orient="records"))


def main() -> None:
    gold = ROOT / "data" / "gold"
    fact = records(gold / "fact_viewing_sessions.csv")
    buckets = {"high_ge_80": 0, "mid_30_79": 0, "low_lt_30": 0}
    for r in fact:
        buckets[r["completion_bucket"]] += 1
    ab = json.loads((ROOT / "data" / "ab_test" / "ab_test_results.json").read_text(encoding="utf-8"))
    seed = {
        "summary": {
            "bronzeEvents": 112,
            "silverRetained": 112,
            "sessions": len(fact),
            "users": len({r["user_id"] for r in fact}),
            "contentItems": len({r["content_id"] for r in fact}),
            "totalWatchMin": round(sum(r["duration_elapsed_min"] for r in fact), 2),
            "avgCompletionPct": round(sum(r["estimated_completion_pct"] for r in fact) / len(fact), 2),
            "completionBuckets": buckets,
        },
        "catalog": records(gold / "content_catalog.csv"),
        "factViewingSessions": fact,
        "dimUser": records(gold / "dim_user.csv"),
        "dimContent": records(gold / "dim_content.csv"),
        "contentAnalyticsByGenre": records(gold / "content_analytics_by_genre.csv"),
        "userFeatures": records(ROOT / "data" / "features" / "user_features.csv"),
        "abTest": {k: v for k, v in ab.items() if k != "assignments"},
        "abAssignments": ab["assignments"],
    }
    out = ROOT / "lib" / "seed.json"
    out.write_text(json.dumps(seed, indent=2), encoding="utf-8")
    print(f"wrote {out} — sessions={seed['summary']['sessions']} users={seed['summary']['users']} "
          f"content={seed['summary']['contentItems']} buckets={buckets}")


if __name__ == "__main__":
    main()
