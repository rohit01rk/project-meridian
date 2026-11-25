-- Intermediate: per-title engagement aggregated from staged sessions.
select
    content_id,
    title,
    genre,
    count() as sessions,
    uniqExact(user_id) as unique_viewers,
    sum(event_count) as total_events,
    round(sum(duration_elapsed_min), 2) as total_duration_min,
    round(avg(duration_elapsed_min), 2) as avg_duration_min,
    round(avg(estimated_completion_pct), 2) as avg_completion_pct,
    countIf(estimated_completion_pct >= 80) as high_completion_sessions
from {{ ref('stg_viewing_sessions') }}
group by content_id, title, genre
