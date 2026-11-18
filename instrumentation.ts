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
 * Never throws: a failure to record must not turn into a second failure.
 */
export const onRequestError: Instrumentation.onRequestError = async (err, request, context) => {
  if (process.env.NEXT_RUNTIME !== "nodejs") return
  try {
    const { recordErrorReports } = await import("@/src/db/errorReportRepo")
    const { fingerprint, scrubRoute, scrubText } = await import("@/src/shared/errorScrubService")
    const error = err instanceof Error ? err : new Error(String(err))
    const digest = typeof err === "object" && err !== null && "digest" in err ? String(err.digest) : ""
    const message = scrubText(`${error.name}: ${error.message}${digest ? ` (digest ${digest})` : ""}`, 1000) ?? "Unknown server error"
    const stack = scrubText(error.stack ?? null, 4000)
    const ua = request.headers["user-agent"]
    await recordErrorReports([
      {
        fingerprint: fingerprint(message, stack),
        message,
        stack,
        componentStack: scrubText(`${context.routeType} ${context.routePath} ${"renderSource" in context ? String(context.renderSource) : ""}`, 2000),
        route: `server:${scrubRoute(request.path)}`,
        userAgent: (Array.isArray(ua) ? ua[0] : (ua ?? "")).slice(0, 300),
        release: process.env.NEXT_PUBLIC_BUILD_ID ?? "unknown",
        severity: "error",
        userId: null,
      },
    ])
  } catch {
    // Recording is best effort; the request has already failed on its own.
  }
}
