import type { Instrumentation } from "next"

/**
 * SERVER CRASHES GO WHERE BROWSER CRASHES GO.
 *
 * `/api/errors` only hears from browsers. A page that throws while the server
 * draws it answers 500 and the browser often recovers by drawing it itself, so
 * nobody reports anything, and the host's logs are not something we can read.
 * On 2026-11-18 every page drawn per request (the home page, /quit) answered
 * 500 on the live site with no trace anywhere. This puts the server's own error
 * in the same `error_reports` table, marked `server:` in the route.
 *
 * Some failures never reach `onRequestError`: Next catches an error outside
 * React's render itself, draws its fallback page and only logs the error. So
 * `register` also records any Error the server passes to `console.error`, at
 * most once a minute per fault per server instance.
 *
 * Never throws: a failure to record must not turn into a second failure.
 */
async function record(error: Error, route: string, where: string, userAgent: string): Promise<void> {
  try {
    const { recordErrorReports } = await import("@/src/db/errorReportRepo")
    const { fingerprint, scrubRoute, scrubText } = await import("@/src/shared/errorScrubService")
    const digest = "digest" in error ? String((error as { digest?: unknown }).digest) : ""
    const message = scrubText(`${error.name}: ${error.message}${digest ? ` (digest ${digest})` : ""}`, 1000) ?? "Unknown server error"
    const stack = scrubText(error.stack ?? null, 4000)
    const print = fingerprint(message, stack)
    const now = Date.now()
    if ((lastRecorded.get(print) ?? 0) > now - 60_000) return
    lastRecorded.set(print, now)
    await recordErrorReports([
      {
        fingerprint: print,
        message,
        stack,
        // A missing module's name is code, not anything a person typed; the
        // quote scrubber would hide it, so it is kept here without quotes.
        componentStack: scrubText(`${where}${missingModule(error)}`, 2000),
        route: `server:${scrubRoute(route)}`,
        userAgent: userAgent.slice(0, 300),
        release: process.env.NEXT_PUBLIC_BUILD_ID ?? "unknown",
        severity: "error",
        userId: null,
      },
    ])
  } catch {
    // Recording is best effort; the request has already failed on its own.
  }
}

const lastRecorded = new Map<string, number>()

function missingModule(error: Error): string {
  const name = /Cannot find module '([^']+)'/.exec(error.message)?.[1]
  return name ? ` missing module: ${name}` : ""
}

export function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return
  const original = console.error.bind(console)
  console.error = (...args: unknown[]) => {
    original(...args)
    const error = args.find((a): a is Error => a instanceof Error)
    if (!error) return
    const context = args.filter((a) => typeof a === "string").join(" ")
    void record(error, "console.error", context, "")
  }
}

export const onRequestError: Instrumentation.onRequestError = async (err, request, context) => {
  if (process.env.NEXT_RUNTIME !== "nodejs") return
  const error = err instanceof Error ? err : new Error(String(err))
  const ua = request.headers["user-agent"]
  const where = `${context.routeType} ${context.routePath} ${"renderSource" in context ? String(context.renderSource) : ""}`
  await record(error, request.path, where, Array.isArray(ua) ? (ua[0] ?? "") : (ua ?? ""))
}
