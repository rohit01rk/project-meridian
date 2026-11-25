"""File-based end-to-end run (no Kafka / ClickHouse required).

  python3 -m pipeline.run_pipeline_local        # from the repo root
  python3 pipeline/run_pipeline_local.py        # also works

Generates the deterministic seed events, writes Bronze JSONL, cleans to
Silver, sessionizes (30-min threshold), builds Gold fact/dim tables, user
features and the A/B test summary, then prints the verification counts.
The recorded run must print: bronze 112, retained 112, sessions 41,
users 33, content 14, completion buckets 18 / 11 / 12.
"""
from __future__ import annotations

import json
import sys
from pathlib import Path

# Support both `python -m pipeline.run_pipeline_local` and direct execution.
if __package__ in (None, ""):
    sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
    from pipeline import gold_build
    from pipeline.ab_test import run_ab_test
    from pipeline.consumer import write_bronze
    from pipeline.features import build_features
    from pipeline.generate_events import generate_events
    from pipeline.sessionize import sessionize
    from pipeline.silver_clean import clean, load_bronze, write_silver
else:
    from . import gold_build
    from .ab_test import run_ab_test
    from .consumer import write_bronze
    from .features import build_features
    from .generate_events import generate_events
    from .sessionize import sessionize
    from .silver_clean import clean, load_bronze, write_silver

ROOT = Path(__file__).resolve().parent.parent
DATA = ROOT / "data"

EXPECTED = {
    "bronze_events": 112,
    "silver_retained": 112,
    "sessions": 41,
    "users": 33,
    "content_items": 14,
    "bucket_high_ge_80": 18,
    "bucket_mid_30_79": 11,
    "bucket_low_lt_30": 12,
}


def main() -> int:
    events = generate_events()

    bronze_path = DATA / "bronze" / "playback_events.jsonl"
    n_bronze = write_bronze(events, bronze_path)

    bronze_df = load_bronze(bronze_path)
    silver_df = clean(bronze_df)
    silver_path = write_silver(silver_df, DATA / "silver")

    sessionized = sessionize(silver_df)
    catalog = gold_build.catalog_df()
    fact = gold_build.build_fact(sessionized, catalog)
    dim_user = gold_build.build_dim_user(fact)
    dim_content = gold_build.build_dim_content(fact, catalog)
    analytics = gold_build.build_content_analytics(fact)
    gold_build.write_gold(fact, dim_user, dim_content, analytics, catalog, DATA / "gold")

    features = build_features(fact)
    feat_dir = DATA / "features"
    feat_dir.mkdir(parents=True, exist_ok=True)
    features.to_csv(feat_dir / "user_features.csv", index=False)

    ab = run_ab_test(features)
    ab_dir = DATA / "ab_test"
    ab_dir.mkdir(parents=True, exist_ok=True)
    (ab_dir / "ab_test_results.json").write_text(json.dumps(ab, indent=2), encoding="utf-8")

    buckets = fact["completion_bucket"].value_counts().to_dict()
    counts = {
        "bronze_events": int(n_bronze),
        "silver_retained": int(len(silver_df)),
        "sessions": int(len(fact)),
        "users": int(fact["user_id"].nunique()),
        "content_items": int(fact["content_id"].nunique()),
        "bucket_high_ge_80": int(buckets.get("high_ge_80", 0)),
        "bucket_mid_30_79": int(buckets.get("mid_30_79", 0)),
        "bucket_low_lt_30": int(buckets.get("low_lt_30", 0)),
    }

    print("=== Project Meridian — pipeline verification ===")
    for k, v in counts.items():
        mark = "OK" if v == EXPECTED[k] else f"MISMATCH (expected {EXPECTED[k]})"
        print(f"{k}: {v} [{mark}]")
    print(f"feature_records: {len(features)}; feature_columns: {len(features.columns)}")
    print(f"silver_file: {silver_path.relative_to(ROOT)}")
    print(f"ab_test: control={ab['control_users']} treatment={ab['treatment_users']} "
          f"p_value={ab['p_value']} significant={ab['significant_at_0_05']} "
          f"required_per_group={ab['required_users_per_group']} required_total={ab['required_users_total']}")

    ok = counts == EXPECTED and len(features) == 33 and len(features.columns) == 13
    print("VERIFICATION:", "PASS" if ok else "FAIL")
    return 0 if ok else 1


if __name__ == "__main__":
    raise SystemExit(main())
