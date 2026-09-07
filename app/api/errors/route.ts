import { NextResponse } from "next/server"

import { createServerSupabaseClient } from "@/src/db/server"
import { recordErrorReports } from "@/src/db/errorReportRepo"
import { fingerprint, scrubRoute, scrubText } from "@/src/shared/errorScrubService"
import { checkRateLimit } from "@/src/timetrack/rateLimitService"

/** Record crashes. Open to signed-out callers on purpose — see the repo comment. */
export async function POST(request: Request) {
  const supabase = await createServerSupabaseClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const who = user?.id ?? request.headers.get("x-forwarded-for") ?? "anonymous"
  if (!checkRateLimit(`errors:${who}`, 20, 60_000).allowed) {
    return NextResponse.json({ error: "Too many reports" }, { status: 429 })
  }

  try {
    const body = (await request.json()) as { reports?: unknown[] }
    const incoming = Array.isArray(body.reports) ? body.reports.slice(0, 50) : []
    // set at build time from the commit, in next.config.mjs. "unknown" means the
    // build machine had no git and no Vercel commit — worth seeing, not guessing at.
    const release = process.env.NEXT_PUBLIC_BUILD_ID ?? "unknown"

    const cleaned = incoming.flatMap((raw) => {
      const r = raw as Record<string, unknown>
      const message = scrubText(String(r.message ?? "").trim(), 1000)
      if (!message) return []
      const stack = scrubText(typeof r.stack === "string" ? r.stack : null, 4000)
      return [{
        fingerprint: fingerprint(message, stack),
        message,
        stack,
        componentStack: scrubText(typeof r.componentStack === "string" ? r.componentStack : null, 2000),
        route: scrubRoute(String(r.route ?? "/")),
        userAgent: (request.headers.get("user-agent") ?? "").slice(0, 300),
        release,
        severity: r.severity === "warning" ? ("warning" as const) : ("error" as const),
        userId: user?.id ?? null,
      }]
    })

    return NextResponse.json({ stored: await recordErrorReports(cleaned) })
  } catch (error) {
    console.error("Could not record a crash report:", error)
    return NextResponse.json({ error: "Could not record the report" }, { status: 500 })
  }
}
