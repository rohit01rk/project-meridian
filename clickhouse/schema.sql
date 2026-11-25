-- Project Meridian — ClickHouse analytical layer
CREATE DATABASE IF NOT EXISTS meridian;

-- Gold fact: one row per viewing session (30-min inactivity sessionization).
-- duration_elapsed_min is elapsed first-to-last event time, NOT verified
-- active playback time. estimated_completion_pct = max playback position /
-- catalog duration, capped at 100.
CREATE TABLE IF NOT EXISTS meridian.fact_viewing_sessions
(
    session_id                String,
    user_id                   String,
    content_id                String,
    title                     String,
    genre                     LowCardinality(String),
    session_start             DateTime64(3, 'UTC'),
    session_end               DateTime64(3, 'UTC'),
    duration_elapsed_min      Float64,
    event_count               UInt32,
    play_events               UInt32,
    pause_events              UInt32,
    seek_events               UInt32,
    buffer_events             UInt32,
    stop_events               UInt32,
    max_playback_position_min Float64,
    catalog_duration_min      Float64,
    estimated_completion_pct  Float64,
    completion_bucket         LowCardinality(String)
)
ENGINE = MergeTree
ORDER BY (genre, session_start, session_id);

-- Content catalog.
CREATE TABLE IF NOT EXISTS meridian.content_catalog
(
    content_id   String,
    title        String,
    genre        LowCardinality(String),
    duration_min Float64,
    release_year UInt16
)
ENGINE = ReplacingMergeTree
ORDER BY content_id;

-- User features (13 columns, one row per user — from pipeline/features.py).
CREATE TABLE IF NOT EXISTS meridian.user_features
(
    user_id                   String,
    total_sessions            UInt32,
    total_events              UInt32,
    total_watch_min           Float64,
    avg_session_duration_min  Float64,
    avg_max_position_min      Float64,
    avg_completion_pct        Float64,
    night_sessions            UInt32,
    avg_viewing_hour          Float64,
    distinct_content          UInt32,
    play_events               UInt32,
    stop_events               UInt32,
    high_completion_sessions  UInt32
)
ENGINE = ReplacingMergeTree
ORDER BY user_id;

-- Genre-level engagement — the shape the FastAPI /analytics/content
-- endpoint and the dashboard content-engagement table consume.
CREATE OR REPLACE VIEW meridian.v_content_engagement AS
SELECT
    genre,
    count()                       AS sessions,
    uniqExact(user_id)            AS unique_viewers,
    round(sum(duration_elapsed_min), 2) AS total_duration_min,
    round(avg(duration_elapsed_min), 2) AS avg_duration_min,
    round(avg(estimated_completion_pct), 2) AS avg_completion_pct
FROM meridian.fact_viewing_sessions
GROUP BY genre
ORDER BY genre;

-- Per-title comparison for content ranking / recommendation foundations.
CREATE OR REPLACE VIEW meridian.v_content_comparison AS
SELECT
    content_id,
    title,
    genre,
    count()                       AS sessions,
    uniqExact(user_id)            AS unique_viewers,
    round(sum(duration_elapsed_min), 2) AS total_duration_min,
    round(avg(estimated_completion_pct), 2) AS avg_completion_pct,
    countIf(estimated_completion_pct >= 80) AS high_completion_sessions
FROM meridian.fact_viewing_sessions
GROUP BY content_id, title, genre
ORDER BY avg_completion_pct DESC;

-- Completion funnel buckets (recorded run: 18 / 11 / 12).
CREATE OR REPLACE VIEW meridian.v_completion_buckets AS
SELECT completion_bucket, count() AS sessions
FROM meridian.fact_viewing_sessions
GROUP BY completion_bucket;
