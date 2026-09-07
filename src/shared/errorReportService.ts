"use client"

/**
 * The one place a crash is reported from.
 *
 * WHY ONE PLACE: today these reports go to your own database. If they ever go
 * to a service instead, this file changes and nothing else does. Scattering
 * `fetch("/api/errors")` through the app is how that becomes a week's work.
 *
 * WHAT IS NEVER SENT: anything a person typed. A crash report should tell you
 * the shape of a fault — which line, which browser, which page — not the
 * contents of somebody's afternoon. The stripping itself happens on the server
 * too, in `errorScrubService`, because a client can be old or lying.
 *
 * WHEN THE NETWORK IS ALSO BROKEN: a crash and a dead connection arrive
 * together more often than either alone. Unsent reports wait in this browser
 * and go out on the next visit.
 */

const QUEUE_KEY = "error-reports:pending"
/** A phone offline for a week should not report a week of noise on reconnect */
const MAX_QUEUED = 50

export interface ErrorReport {
  message: string
  stack?: string
  componentStack?: string
  route: string
  severity: "error" | "warning"
  at: string
}

function readQueue(): ErrorReport[] {
  try {
    const raw = window.localStorage.getItem(QUEUE_KEY)
    const parsed = raw ? (JSON.parse(raw) as ErrorReport[]) : []
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function writeQueue(reports: ErrorReport[]): void {
  try {
    window.localStorage.setItem(QUEUE_KEY, JSON.stringify(reports.slice(-MAX_QUEUED)))
  } catch {
    // storage full or blocked. The report is lost, and that is preferable to
    // throwing from inside the code that handles throwing.
  }
}

async function send(reports: ErrorReport[]): Promise<boolean> {
  const response = await fetch("/api/errors", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ reports }),
    // a crash report must never keep the page alive waiting for it
    keepalive: true,
  })
  return response.ok
}

/** Send everything that has been waiting. Safe to call as often as you like. */
export async function flushErrorReports(): Promise<void> {
  if (typeof window === "undefined") return
  const queued = readQueue()
  if (queued.length === 0) return
  try {
    if (await send(queued)) writeQueue([])
  } catch {
    // still no network; they stay queued for next time
  }
}

/**
 * Record that something broke. Never throws — code that reports a failure must
 * not become a second failure.
 */
export function reportError(
  error: unknown,
  context: { componentStack?: string; severity?: "error" | "warning" } = {},
): void {
  if (typeof window === "undefined") return
  try {
    const report: ErrorReport = {
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      componentStack: context.componentStack,
      // the path only. A query string is where password-reset tokens live.
      route: window.location.pathname,
      severity: context.severity ?? "error",
      at: new Date().toISOString(),
    }
    const queued = [...readQueue(), report]
    writeQueue(queued)
    void send(queued)
      .then((ok) => {
        if (ok) writeQueue([])
      })
      .catch(() => {
        // queued already; the next visit will carry it
      })
  } catch {
    // reporting must never be the thing that breaks the page
  }
}

/**
 * Catch the two kinds of failure a React boundary cannot see: an error thrown
 * outside rendering, and a promise nobody handled.
 */
export function listenForUncaughtErrors(): () => void {
  const onError = (event: ErrorEvent) => reportError(event.error ?? event.message)
  const onRejection = (event: PromiseRejectionEvent) => reportError(event.reason)
  window.addEventListener("error", onError)
  window.addEventListener("unhandledrejection", onRejection)
  void flushErrorReports()
  return () => {
    window.removeEventListener("error", onError)
    window.removeEventListener("unhandledrejection", onRejection)
  }
}
