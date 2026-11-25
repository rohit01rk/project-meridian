-- Staging: typed, cleaned playback events from the Silver layer.
-- Mirrors pipeline/silver_clean.py rules (supported event types only,
-- non-negative playback positions, UTC timestamps).
select
    event_id,
    lower(trim(event_type)) as event_type,
    upper(trim(user_id)) as user_id,
    upper(trim(content_id)) as content_id,
    toDateTime64(timestamp, 3, 'UTC') as event_timestamp,
    toFloat64(playback_position_min) as playback_position_min,
    kafka_partition,
    kafka_offset
from {{ source('meridian_raw', 'playback_events_silver') }}
where event_type in ('play', 'pause', 'seek', 'buffer', 'stop')
  and playback_position_min >= 0
