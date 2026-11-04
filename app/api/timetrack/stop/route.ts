/**
 * STOP, FROM THE NOTIFICATION SHADE (Plans/time-tracker-like-toggl.md, Phase 7).
 *
 * The worker posts `{entryId, at, sentAt}` when Stop is tapped on the running
 * timer's notification, or later, when a stop tapped with no signal finally
 * goes. Each answer carries a `title` and `body` the worker shows as it is.
 *
 *   200  stopped                "Stopped · Gym 1:12"
 *   409  already stopped        "Already stopped at 18:00" (Q4 scenario 7), or deleted
 *   404  not found              someone else's entry and a missing one get the
 *                               same answer, so this cannot be asked whose an id is
 *   400  a bad body, a stop in the future, or one before the entry started
 *
 * WHO IT ACTS FOR. The signed-in person, from their cookies (`requireAuth`, as
 * every route here). The entry is read and written with THEIR client, not the
 * service role, so row security decides what is theirs; the write is the same
 * versioned write as every sync (D1), so a device's later sync cannot undo it.
 * See `stopRunningTimer`.
 *
 * WHO IT LISTENS TO. A same-origin JSON request only. A form on another site
 * cannot send `application/json`, and a browser that says the request came
 * from another site (`Sec-Fetch-Site`) is refused outright. The session cookie
 * is SameSite=Lax as well; this does not lean on that alone.
 */

import { NextResponse } from "next/server"
import { requireAuth } from "@/src/db/auth"
import { getUserTimezone } from "@/src/db/settingsRepo"
import { afterResponse } from "@/src/shared/afterResponse"
import { announce, clockIn, readStopRequest, stopRunningTimer, stoppedPayload, timerName } from "@/src/timetrack/runningTimerService"

function fromAnotherSite(req: Request): boolean {
  const site = req.headers.get("sec-fetch-site")
  return site !== null && site !== "same-origin" && site !== "none"
}

export async function POST(req: Request) {
  const auth = await requireAuth()
  if (!auth.success) return auth.response
  if (fromAnotherSite(req)) return NextResponse.json({ error: "Not from this site" }, { status: 403 })
  if (!(req.headers.get("content-type") ?? "").toLowerCase().startsWith("application/json")) {
    return NextResponse.json({ error: "Send JSON" }, { status: 415 })
  }

  const now = new Date()
  const input = readStopRequest(await req.json().catch(() => null), now)
  if ("error" in input) return NextResponse.json({ error: input.error, title: "Not stopped", body: input.error }, { status: 400 })

  try {
    const answer = await stopRunningTimer(auth.userId, input.entryId, input.at)
    if (answer.outcome === "not-found") {
      return NextResponse.json({ outcome: "not-found", error: "No such timer", title: "Not stopped", body: "That timer is not on this account." }, { status: 404 })
    }

    const timezone = await getUserTimezone(auth.userId).catch(() => "UTC")
    const entry = answer.entry
    switch (answer.outcome) {
      case "stopped": {
        // Every other device showing the timer hears it stopped, once this answer has gone.
        afterResponse(() => announce(auth.userId, { kind: "stopped", entry }, now))
        const { title, body } = stoppedPayload(entry, timezone)
        return NextResponse.json({ outcome: "stopped", entryId: entry.id, stoppedAt: entry.stoppedAt, title, body })
      }
      case "already-stopped":
        return NextResponse.json(
          { outcome: "already-stopped", stoppedAt: entry.stoppedAt, title: `Already stopped at ${clockIn(entry.stoppedAt!, timezone)}`, body: timerName(entry) },
          { status: 409 },
        )
      case "deleted":
        return NextResponse.json({ outcome: "deleted", title: "Not stopped", body: `${timerName(entry)} was deleted.` }, { status: 409 })
      case "before-start":
        return NextResponse.json(
          { outcome: "before-start", error: "That is before the timer started", title: "Not stopped", body: `${timerName(entry)} started at ${clockIn(entry.startedAt, timezone)}.` },
          { status: 400 },
        )
    }
  } catch (error) {
    console.error("[timetrack stop] failed", error instanceof Error ? error.message : "unknown")
    return NextResponse.json({ error: "Could not stop the timer" }, { status: 500 })
  }
}
