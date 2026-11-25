# Project Meridian — Viva Notes

## One-line pitch
A streaming-media data platform that turns raw playback events into
trustworthy engagement analytics: Kafka ingestion, a Bronze/Silver/Gold
medallion pipeline, ClickHouse + dbt analytics, and a FastAPI + React
delivery layer.

## Q&A

**Why a medallion architecture?**
Bronze preserves the raw record with its Kafka partition/offset and
ingestion time, so any later result can be traced and replayed. Silver
enforces one explicit validation contract. Gold is modelled for analysis
(fact + dimensions), so dashboards never query raw events.

**How does sessionization work?**
Events are sorted by user, content and timestamp. A new session starts
when the gap from the previous event for the same user+content exceeds
30 minutes. On the recorded run this turns 112 events into 41 sessions.

**How is completion calculated — and what is its weakness?**
Estimated completion = maximum playback position ÷ catalog duration,
capped at 100%. It is an estimate: a seek can jump the position without
the user watching everything in between, so it is not a true
watch-percentage.

**What does "session duration" actually mean here?**
Elapsed minutes between the session's first and last event — not
verified active playback time. Pauses are included. We state this
wherever the number is shown.

**Why did all 112 records survive cleaning?**
The seed dataset is generated valid by construction; the Silver rules
(required fields, supported event types, UTC timestamps, numeric,
non-negative positions) are still enforced and unit-verifiable with
malformed inputs — testing those cases is on the roadmap.

**What did the A/B test show?**
16 control vs 17 treatment users, Welch two-sample t-test on average
estimated watch time: p = 0.3121 in the recorded run — not significant.
The reproduced run in this repo gives p ≈ 0.30, the same conclusion.
A powered test needs 64 users per group (effect 0.5, α 0.05, power 0.80),
so the honest finding is "underpowered — collect more data", not a win
for either variant.

**Why ClickHouse?**
Columnar OLAP storage fits append-heavy event facts and fast group-by
aggregations (genre engagement, completion funnels) far better than a
row store.

**What does dbt add if pandas already builds Gold?**
dbt versions the SQL transformations (staging → intermediate → mart),
documents lineage, and runs data-quality tests (not_null, unique,
accepted_values) in the warehouse itself, close to where analysts query.

**What breaks first at production scale?**
Batch sessionization (needs watermarks + late-arrival policy),
duplicate delivery (needs deduplication keys), and catalog changes
(needs incremental, watermark-based ingestion with licensing expiry).

**Why is Airflow not running?**
A Docker storage-capacity issue blocked its deployment on the dev
machine. It is on the roadmap with a DAG that runs processing and dbt
in dependency order — we do not claim it as done.

## Numbers to quote
112 bronze events · 112 retained · 41 sessions · 33 users · 14 titles ·
completion 18 / 11 / 12 (≥80% / 30–79% / <30%) · features 33 × 13 ·
A/B 16 vs 17, p = 0.3121 (n.s.) · required sample 64/group.
