/**
 * THE CLOCK'S ADDRESS: called once a minute by the database's own clock
 * (`pg_cron` + `pg_net`, migration 20261030130000_thoughts_clock.sql), and
 * later by a server timer when the app leaves Vercel (Plans/thought.md, Q15).
 *
 * Refuses anything without the clock's secret (src/notifications/clockAuth.ts).
 * Each call sends every reminder due now, once (`runPromptClock`).
 */

import { NextResponse } from "next/server"
import { bearerMatches, clockSecret } from "@/src/notifications/clockAuth"
import { runPromptClock } from "@/src/thoughts/promptService"

export async function POST(req: Request) {
  const expected = await clockSecret()
  if (!expected) return NextResponse.json({ error: "Not set up" }, { status: 503 })
  if (!bearerMatches(req.headers.get("authorization"), expected)) {
    return NextResponse.json({ error: "Not allowed" }, { status: 401 })
  }

  try {
    return NextResponse.json(await runPromptClock())
  } catch (error) {
    console.error("[thoughts clock] tick failed", error instanceof Error ? error.message : "unknown")
    return NextResponse.json({ error: "Tick failed" }, { status: 500 })
  }
}
