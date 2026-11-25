import { NextResponse } from "next/server";
import { seed } from "@/lib/engine";

// Vercel demo health: the full Kafka/ClickHouse stack runs locally via
// Docker Compose; on Vercel the API serves the verified Gold seed data.
export async function GET() {
  return NextResponse.json({
    status: "healthy",
    mode: "vercel_demo_seed_data",
    database: "clickhouse_local_only",
    gold_sessions: seed.summary.sessions,
    note: "Full Kafka/ClickHouse stack runs locally via Docker Compose.",
  });
}
