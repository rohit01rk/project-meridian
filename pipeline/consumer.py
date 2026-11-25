"""Kafka consumer -> Bronze layer.

Appends every record to bronze/playback_events.jsonl, preserving the source
record verbatim plus its ingestion context (Kafka partition, offset and
ingestion timestamp) — the Bronze contract: raw, traceable, never mutated.

Also provides `write_bronze()`, the file-based equivalent used by the local
end-to-end run when Kafka is not available.
"""
from __future__ import annotations

import argparse
import json
import sys
from datetime import datetime, timezone
from pathlib import Path

TOPIC = "playback-events"


def bronze_record(event: dict, partition: int, offset: int) -> dict:
    rec = dict(event)
    rec["kafka_partition"] = int(partition)
    rec["kafka_offset"] = int(offset)
    rec["ingested_at"] = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
    return rec


def write_bronze(events: list[dict], out_path: Path) -> int:
    out_path.parent.mkdir(parents=True, exist_ok=True)
    with open(out_path, "w", encoding="utf-8") as fh:
        for i, e in enumerate(events):
            # Single-partition local run: offsets are sequential, partition 0.
            fh.write(json.dumps(bronze_record(e, partition=0, offset=i)) + "\n")
    return len(events)


def consume(bootstrap_servers: str, out_path: Path) -> int:  # pragma: no cover
    try:
        from kafka import KafkaConsumer  # optional dependency, guarded
    except ImportError:
        print("kafka-python not installed — cannot consume. "
              "Use run_pipeline_local.py for the file-based run.", file=sys.stderr)
        return 0
    consumer = KafkaConsumer(
        TOPIC,
        bootstrap_servers=bootstrap_servers,
        auto_offset_reset="earliest",
        enable_auto_commit=True,
        value_deserializer=lambda v: json.loads(v.decode("utf-8")),
    )
    n = 0
    out_path.parent.mkdir(parents=True, exist_ok=True)
    with open(out_path, "a", encoding="utf-8") as fh:
        for msg in consumer:
            fh.write(json.dumps(bronze_record(msg.value, msg.partition, msg.offset)) + "\n")
            fh.flush()
            n += 1
    return n


def main() -> None:
    ap = argparse.ArgumentParser(description="Project Meridian Bronze consumer")
    ap.add_argument("--bootstrap-servers", default="localhost:9092")
    ap.add_argument("--out", default="data/bronze/playback_events.jsonl")
    args = ap.parse_args()
    consume(args.bootstrap_servers, Path(args.out))


if __name__ == "__main__":
    main()
