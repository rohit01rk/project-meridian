-- Mart: genre-level content engagement — the table behind the FastAPI
-- /analytics/content endpoint and the dashboard engagement table.
select
    genre,
    sum(sessions) as sessions,
    sum(unique_viewers) as unique_viewers,
    round(sum(total_duration_min), 2) as total_duration_min,
    round(sum(total_duration_min) / nullIf(sum(sessions), 0), 2) as avg_duration_min,
    round(avg(avg_completion_pct), 2) as avg_completion_pct,
    sum(high_completion_sessions) as high_completion_sessions
from {{ ref('int_content_engagement') }}
group by genre
order by genre
