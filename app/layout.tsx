import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Project Meridian — Streaming Media Data Platform",
  description:
    "Streaming-media data engineering & analytics: Kafka playback events, Bronze/Silver/Gold medallion pipeline, ClickHouse + dbt, FastAPI and a live engagement dashboard.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
