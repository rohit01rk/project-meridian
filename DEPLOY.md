# Deploy — Project Meridian

## GitHub (Rohit's account)
1. Create a public repo under **rohit01rk**: `project-meridian` (no README — this repo has one).
2. Push all files, including `package-lock.json` and every text extension
   (`.py`, `.sql`, `.yml`, `.md`, `.json`, `.ts`, `.tsx`) in the same commit set.

## Vercel (Rohit's account — team cardioCare, signed in via GitHub as rohit01rk)
1. Add New → Project → Import `rohit01rk/project-meridian`.
2. Framework: Next.js (auto-detected), Root: `./`, Build: `npm run build` (default). No env vars needed.
3. Deploy → live URL will be `project-meridian-*.vercel.app` / `project-meridian.vercel.app`.
4. Verify live: header "Project Meridian", LIVE badge, KPI strip reads
   112 bronze events / 41 sessions / 33 users / 14 content, completion
   buckets 18 / 11 / 12, and all six tabs render.

## Notes
- The Vercel deployment serves the verified Gold seed data
  (`lib/seed.json`, generated from the Python pipeline) and simulates the
  live event stream in the browser. The full Kafka/ClickHouse/FastAPI
  stack runs locally via `docker compose up -d` — see README.
- No secrets or env vars are required for the demo deployment.
