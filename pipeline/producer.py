"""Kafka producer: publishes playback events to the `playback-events` topic.

kafka-python is optional: without it (or with --file) the producer prints /
writes the events so the rest of the pipeline can be developed offline.
"""
from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

try:  # allow `python pipeline/producer.py` as well as `-m pipeline.producer`
    from .generate_events import generate_events
except ImportError:  # pragma: no cover
    sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
    from pipeline.generate_events import generate_events

TOPIC = "playback-events"


def publish(events: list[dict], bootstrap_servers: str = "localhost:9092") -> int:
    try:
        from kafka import KafkaProducer  # optional dependency, guarded
    except ImportError:
        print("kafka-python not installed — printing events instead of publishing.")
        for e in events:
            print(json.dumps(e))
        return len(events)

    producer = KafkaProducer(
        bootstrap_servers=bootstrap_servers,
        value_serializer=lambda v: json.dumps(v).encode("utf-8"),
        key_serializer=lambda k: k.encode("utf-8") if k else None,
    )
    for e in events:
        producer.send(TOPIC, key=e["user_id"], value=e)
    producer.flush()
    producer.close()
    return len(events)


def main() -> None:
    ap = argparse.ArgumentParser(description="Project Meridian playback-event producer")
    ap.add_argument("--bootstrap-servers", default="localhost:9092")
    ap.add_argument("--file", help="Write JSONL to this file instead of Kafka")
    args = ap.parse_args()
    events = generate_events()
    if args.file:
        Path(args.file).parent.mkdir(parents=True, exist_ok=True)
        with open(args.file, "w", encoding="utf-8") as fh:
            for e in events:
                fh.write(json.dumps(e) + "\n")
        print(f"wrote {len(events)} events to {args.file}")
    else:
        n = publish(events, args.bootstrap_servers)
        print(f"published {n} events to topic '{TOPIC}'")


if __name__ == "__main__":
    main()
