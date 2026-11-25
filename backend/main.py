"""Project Meridian — FastAPI delivery layer.

Endpoints:
  GET /                  service status
  GET /health            ClickHouse connectivity when CLICKHOUSE_HOST is
                         configured; otherwise falls back to the Gold CSVs
                         produced by pipeline/run_pipeline_local.py and
                         reports mode="gold_csv_fallback".
  GET /analytics/content genre-level content engagement from the Gold
                         layer (ClickHouse when configured, else Gold CSV).

Run:  uvicorn backend.main:app --reload --port 8000
"""
from __future__ import annotations

import os
from pathlib import Path

import pandas as pd
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

ROOT = Path(__file__).resolve().parent.parent
GOLD = ROOT / "data" / "gold"

app = FastAPI(title="Project Meridian API", version="1.0.0")
app.add_middleware(
    CORSMiddleware, allow_origins=["http://localhost:3000"], allow_methods=["GET"], allow_headers=["*"]
)


def _clickhouse_client():
    """Return a ClickHouse client or None when not configured/available."""
    host = os.getenv("CLICKHOUSE_HOST")
    if not host:
        return None
    try:
        import clickhouse_connect  # optional dependency
        return clickhouse_connect.get_client(
            host=host, port=int(os.getenv("CLICKHOUSE_PORT", "8123")),
            database=os.getenv("CLICKHOUSE_DB", "meridian"),
        )
    except Exception:
        return None


def _gold_analytics() -> pd.DataFrame:
    return pd.read_csv(GOLD / "content_analytics_by_genre.csv")


@app.get("/")
def root() -> dict:
    return {"service": "project-meridian", "status": "ok",
            "pipeline": "Producer -> Kafka -> Bronze -> Silver -> Gold -> ClickHouse/dbt -> FastAPI -> React"}


@app.get("/health")
def health() -> dict:
    client = _clickhouse_client()
    if client is not None:
        try:
            client.query("SELECT 1")
            return {"status": "healthy", "database": "clickhouse", "mode": "clickhouse"}
        except Exception as exc:  # fall through to CSV mode, but say so
            return {"status": "degraded", "database": "unreachable", "mode": "gold_csv_fallback",
                    "detail": str(exc)[:200]}
    gold_ok = (GOLD / "fact_viewing_sessions.csv").exists()
    return {"status": "healthy" if gold_ok else "degraded", "database": "not_configured",
            "mode": "gold_csv_fallback", "gold_data_present": gold_ok}


@app.get("/analytics/content")
def content_analytics() -> dict:
    client = _clickhouse_client()
    if client is not None:
        try:
            rows = client.query(
                "SELECT genre, sessions, unique_viewers, total_duration_min, "
                "avg_duration_min, avg_completion_pct FROM meridian.v_content_engagement ORDER BY genre"
            ).result_rows
            cols = ["genre", "sessions", "unique_viewers", "total_duration_min",
                    "avg_duration_min", "avg_completion_pct"]
            return {"source": "clickhouse", "items": [dict(zip(cols, r)) for r in rows]}
        except Exception:
            pass  # fall back to Gold CSV below
    df = _gold_analytics()
    return {"source": "gold_csv", "items": df.to_dict(orient="records")}
