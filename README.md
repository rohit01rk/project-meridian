# Project Meridian

**Streaming-Media Data Engineering and Analytics Platform**

Rohit Kumar · BTech CSE (Final Year) · GD Goenka University
GitHub: [github.com/rohit01rk](https://github.com/rohit01rk)
Live Demo: [project-meridian-three.vercel.app](https://project-meridian-three.vercel.app)

---

## Abstract

Project Meridian is a streaming-media data engineering and analytics platform that collects playback events, transforms them into reliable analytical datasets, and presents content-engagement insights. The platform captures play, pause, seek, stop, and buffer events together with user identifiers, content identifiers, timestamps, and playback positions. Its processing design separates raw ingestion, data quality management, and business-ready analysis into Bronze, Silver, and Gold layers.

## Problem Statement

Streaming platforms produce continuous interaction data, but raw playback events are not immediately suitable for reporting. Records may arrive out of order, fields may be missing or invalid, and individual events must be grouped into meaningful viewing sessions. Without a structured pipeline, session boundaries remain unclear, content comparisons require repeated manual queries, and analytical results are difficult to expose through an application.

## Objectives

- Ingest and preserve playback events through a Python producer, Apache Kafka, and a traceable Bronze storage layer.
- Clean and organise the data by validating fields, normalising timestamps, creating viewing sessions, and producing Gold fact and dimension datasets.
- Support analysis through ClickHouse tables and views, dbt transformations, and content-engagement metrics.
- Expose results through FastAPI endpoints and a React dashboard that displays analytics and system status.
- Establish a foundation for user features, experiment evaluation, recommendations, orchestration, monitoring, and deployment automation.

## System Architecture

```
Python Producer → Apache Kafka → Kafka Consumer → Bronze (JSONL)
    → Silver (Cleaning and Sessionization) → Gold (Fact / Dimension Datasets)
    → ClickHouse and dbt → FastAPI → React Dashboard
```

| Stage | Description |
|---|---|
| Event production | A Python producer creates playback records containing event type, user ID, content ID, timestamp, and playback position, and publishes them to the `playback-events` Kafka topic. |
| Stream transport | Apache Kafka provides the event transport layer and preserves stream position for traceability. |
| Bronze capture | The consumer appends incoming records to `bronze/playback_events.jsonl` and adds the Kafka partition, offset, and ingestion timestamp. |
| Silver cleaning | Python and pandas validate required fields, normalise event names and identifiers, parse timestamps as UTC, convert playback positions to numeric values, filter unsupported event types, and remove negative playback positions. Cleaned data is written to Parquet/CSV. |
| Sessionization | Valid events are sorted by user, content, and timestamp. A new viewing session begins when the gap between adjacent events exceeds the 30-minute inactivity threshold. |
| Gold modelling | The pipeline produces a viewing-session fact dataset together with user and content dimensions that summarise sessions, event counts, duration indicators, and maximum playback positions. |
| Analytical storage | ClickHouse stores the viewing-session fact table, content catalog, user features, and analytical views. dbt organises SQL transformations into staging, intermediate, and mart models and applies configured data-quality tests. |
| Delivery | FastAPI exposes health and content-analytics endpoints, and the React dashboard presents system status and engagement data in the browser. |

## Technology Stack

| Technology | Role |
|---|---|
| Python, pandas | Event generation, cleaning, sessionization, and feature engineering |
| Apache Kafka | Playback-event topic and stream transport |
| JSONL / Parquet | Raw records and processed datasets |
| ClickHouse | Analytical tables, views, and queries |
| dbt + dbt-clickhouse | Staging, intermediate, and mart transformations; data-quality tests |
| FastAPI | Health and content-analytics API endpoints |
| React + Vite / Next.js | Dashboard consuming the API |
| Docker Compose | Local service containers (Kafka, ClickHouse) |
| Apache Airflow | Scheduled pipeline orchestration (setup in progress) |
| GitHub Actions / Terraform | CI/CD and infrastructure automation (planned) |

## Results

| Measure | Result |
|---|---|
| Bronze events | 112 |
| Records retained after validation | 112 |
| Viewing sessions | 41 |
| Users | 33 |
| Content items | 14 |

The Gold layer contains the `fact_viewing_sessions` dataset and the `dim_user` and `dim_content` dimensions. Session facts include start and end timestamps, an elapsed-duration estimate, event counts by type, and maximum playback position.

### Engagement and Completion Analysis

Sessions were categorised by estimated completion:

| Category | Sessions | Share |
|---|---|---|
| Completion at or above 80% | 18 | 43.90% |
| Completion between 30% and 79% | 11 | 26.83% |
| Completion below 30% | 12 | 29.27% |

These results describe the current small demo dataset and are not representative audience findings.

### Feature Engineering

The feature-generation step produces 33 user records with 13 columns, including total sessions, total estimated watch minutes, average session duration, total event counts, average maximum playback position, night-viewing sessions, and average viewing hour. These features provide a foundation for ranking and recommendation work.

### A/B Testing

Users were randomly assigned to control and treatment groups (16 and 17 users) and average estimated watch time was compared using a Welch two-sample t-test. The measured difference was not statistically significant (p = 0.3121). A sample-size calculation estimated 64 users per group, or 128 in total, under the assumptions of effect size 0.5, alpha 0.05, and statistical power 0.80.

## API and Dashboard

FastAPI provides a root status endpoint, a health endpoint, and a content-analytics endpoint. The health endpoint verifies database connectivity. Content analytics returns genre, session count, unique viewers, total session-duration minutes, average session duration, and estimated completion percentage. The dashboard requests health and analytics data, displays backend and database status, and presents the content-engagement results in tabular form.

## How to Run

```bash
# 1) Run the data pipeline locally (no Kafka or ClickHouse required)
python3 -m pipeline.run_pipeline_local

# 2) Run the dashboard
npm install
npm run dev            # http://localhost:3000

# 3) Optional: full stack with Kafka and ClickHouse
docker compose up -d
python3 -m pipeline.producer
uvicorn backend.main:app --port 8000
```

## Repository Structure

- `pipeline/` — event producer, Kafka consumer, Bronze/Silver processing, sessionization, Gold build, feature engineering, and A/B testing scripts
- `backend/` — FastAPI application (`/`, `/health`, `/analytics/content`)
- `clickhouse/` — analytical schema: tables and views
- `dbt/` — dbt project with staging, intermediate, and mart models and data-quality tests
- `app/`, `lib/`, `components/` — dashboard application
- `data/` — Bronze, Silver, and Gold datasets and generated outputs
- `docs/` — project notes and viva preparation material
- `docker-compose.yml` — local Kafka and ClickHouse services

## Limitations

- The prototype uses a relatively small synthetic/demo dataset.
- Sessionization currently sorts records in batch and applies a 30-minute inactivity threshold, rather than implementing streaming watermarks and late-arrival processing.
- Session duration represents elapsed time between the first and last event, not verified active playback time.
- Estimated completion is based on maximum recorded playback position relative to catalog duration, capped at 100%; it is not a precise watch-percentage measure.

## Future Work

- Complete a reliable Airflow deployment with a DAG that runs processing and dbt steps in dependency order.
- Add watermark-based content-catalog ingestion with explicit handling for licensing expiry.
- Introduce late-arrival policies, deduplication, and robust event-time handling.
- Improve feature definitions with rolling 30-day genre preferences and implement a recommendation API.
- Add dashboard visualisations for concurrent viewers, the completion funnel, and A/B-test outcomes.
- Add automated unit and integration tests, GitHub Actions CI, Terraform, logging, and monitoring.

## Conclusion

Project Meridian connects Kafka-based event ingestion, Python-based Bronze/Silver/Gold processing, ClickHouse analytics, dbt transformations, a FastAPI service layer, and a React dashboard into one working prototype. It demonstrates the complete data path from playback events to content-engagement outputs that can be queried and displayed, and provides a foundation for recommendations, experiment evaluation, automated scheduling, and operational monitoring.

---

**Author:** Rohit Kumar — BTech CSE (Final Year), GD Goenka University — [github.com/rohit01rk](https://github.com/rohit01rk)
