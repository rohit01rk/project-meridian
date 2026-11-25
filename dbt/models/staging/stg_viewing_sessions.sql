-- Staging: Gold viewing-session fact, one row per session.
-- Duration is elapsed first-to-last event time (not verified active
-- playback); completion is max position / catalog duration capped at 100.
select
    session_id,
    user_id,
    content_id,
    title,
    genre,
    session_start,
    session_end,
    duration_elapsed_min,
    event_count,
    play_events,
    pause_events,
    seek_events,
    buffer_events,
    stop_events,
    max_playback_position_min,
    catalog_duration_min,
    estimated_completion_pct,
    completion_bucket
from {{ source('meridian_raw', 'fact_viewing_sessions') }}
