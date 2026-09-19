"use client"

/**
 * The programs you have finished with, and what you did on them.
 *
 * Ending a program archives it rather than deleting it — that was the fix for a
 * button that used to destroy a year of sessions. But an archive nobody can open
 * is only marginally better than no archive: somebody who ran StrongLifts for a
 * year and moved to 5/3/1 had that year vanish from every screen the moment they
 * switched.
 *
 * Deliberately a short list of facts, not a second History panel. What a past
 * program has to answer is "did I do this, and for how long" — the per-lift
 * detail belongs to the program you are running now.
 */

import { useCallback, useEffect, useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { enrollmentName } from "../data/catalog"
import { LEVEL_LABELS } from "../config"
import type { ProgramEnrollment } from "../types"
import { restartProgram, deletePastProgram } from "../programActions"

/**
 * How many finished programs to show before folding the rest away.
 *
 * Somebody who has trained for years has a long list of them, and this sits
 * under the thing they came to do. Three is enough to recognise the one you are
 * looking for; the rest are one tap away.
 */
const SHOWN = 3

export function PastPrograms({
  initial,
  onResumed,
}: { initial?: ProgramEnrollment[]; onResumed?: () => void } = {}) {
  const [showAll, setShowAll] = useState(false)
  // Seeded by the server component so this is not a third round trip.
  const [past, setPast] = useState<ProgramEnrollment[] | null>(initial ?? null)
  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  /**
   * A FAILED READ IS NOT AN EMPTY ARCHIVE.
   *
   * This set `past` to `[]` on any failure, and the component renders nothing
   * when `past` is empty — so somebody who ran StrongLifts for a year and
   * switched to 5/3/1 opened Training during a hiccup and their finished
   * programs were simply not on the page. No heading, no message, and with them
   * went the only "Start again" button, which is the whole reason this
   * component exists. `failed` is a third state, distinct from "you have none".
   */
  const [failed, setFailed] = useState(false)

  const load = useCallback(async () => {
    try {
      const r = await fetch("/api/programs/enrollments?past=1")
      if (!r.ok) throw new Error(String(r.status))
      const body = (await r.json()) as unknown
      if (!Array.isArray(body)) throw new Error("unexpected shape")
      setPast(body as ProgramEnrollment[])
      setFailed(false)
    } catch {
      // The list is left exactly as it was, and the screen says so.
      setFailed(true)
    }
  }, [])

  useEffect(() => {
    // The server already answered; asking again would be the waterfall this
    // page was rebuilt to remove.
    if (initial) return
    void load()
  }, [load, initial])

  /**
   * The only permanent delete in the feature, and it lives only here.
   *
   * Ending a program archives it, which is what makes that button safe to press.
   * The cost of that is data you can never remove, which is its own fault — so
   * erasing exists, but only for a program you have already finished, and only
   * behind a confirmation that says the number of sessions out loud. A count is
   * the one thing that makes "permanently" mean something.
   */
  /**
   * Pick it back up, weights and all.
   *
   * Without this an archived program was a museum exhibit. The one that hurt was
   * a program somebody WROTE — self-built programs are filed under "strength",
   * so starting any cited strength program silently archived theirs, and there
   * was no way back. Resuming keeps `exercise_state`, so a year of progression
   * survives; re-enrolling from the catalogue would reset it to the level's
   * starting weights.
   */
  async function resume(e: ProgramEnrollment, name: string) {
    setBusy(e.id)
    try {
      const res = await restartProgram(e.id)
      if (!res.ok) {
        alert(res.error)
        return
      }
      // Say what it displaced rather than letting somebody discover it later —
      // being silently swapped is the fault this whole feature is recovering from.
      const displaced = res.data?.displaced ?? []
      if (displaced.length > 0) {
        const names = displaced.map(enrollmentName).join(", ")
        alert(`${name} is running again. ${names} moved to your finished programs — everything it logged is kept.`)
      }
      onResumed?.()
      await load()
    } finally {
      setBusy(null)
    }
  }

  /**
   * SAY WHAT ACTUALLY HAPPENS.
   *
   * This used to promise "Its 47 logged sessions will be erased. This cannot be
   * undone." Not one of them was erased. `deleteEnrollmentPermanently` removes
   * the program row only, and `workout_logs.enrollment_id` is `ON DELETE SET
   * NULL` — so every session survives and is quietly detached from the program
   * instead. The app claimed to destroy training history and then did not, which
   * is the worst of both: nobody who wanted it gone got what they asked for, and
   * anybody who mis-tapped was told their year was gone.
   *
   * The sessions are the thing lifters say they fear losing most, so the button
   * keeps them and the words now match. What is actually lost is the link, and
   * that is what the confirmation names.
   */
  async function erase(e: ProgramEnrollment, name: string) {
    const n = e.sessionsLogged ?? 0
    const what =
      n === 0
        ? "It has no logged sessions."
        : `Its ${n} logged session${n === 1 ? "" : "s"} stay${n === 1 ? "s" : ""} in your history, ` +
          `and stop${n === 1 ? "s" : ""} counting towards this program.`
    if (!confirm(`Remove ${name} from your finished programs? ${what}`)) return
    setBusy(e.id)
    setError(null)
    try {
      const res = await deletePastProgram(e.id)
      if (!res.ok) {
        setError(res.error)
        return
      }
      await load()
    } finally {
      setBusy(null)
    }
  }

  // Could not find out. Say so rather than showing the same nothing as an
  // account with no finished programs.
  if (failed) {
    return (
      <div className="space-y-2" data-testid="past-programs-error">
        <h2 className="text-sm font-semibold text-muted-foreground">Programs you have finished</h2>
        <Card>
          <CardContent className="flex items-center justify-between gap-2 p-4 text-sm">
            <span className="text-amber-600 dark:text-amber-400">
              These could not be loaded, so this list may be incomplete.
            </span>
            <button
              type="button"
              onClick={() => void load()}
              className="shrink-0 rounded-md border border-border px-2.5 py-1 text-xs transition-colors hover:bg-accent"
            >
              Try again
            </button>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Nothing to say until there is a past. No empty state, no skeleton — this
  // sits under the thing people came for.
  if (!past || past.length === 0) return null

  return (
    <div className="space-y-2" data-testid="past-programs">
      <h2 className="text-sm font-semibold text-muted-foreground">Programs you have finished</h2>
      {error && <p className="text-xs text-red-500">{error}</p>}
      <Card>
        <CardContent className="divide-y p-0">
          {(showAll ? past : past.slice(0, SHOWN)).map((e) => {
            const name = enrollmentName(e)
            const n = e.sessionsLogged ?? 0
            // STACKED ON A PHONE. Side by side, the name was crushed to
            // "Upper / Lo…" by two buttons and the date wrapped onto three
            // lines. A row that cannot fit its own name is not a row.
            return (
              <div key={e.id} className="flex flex-col gap-2 px-4 py-2.5 text-sm sm:flex-row sm:items-baseline sm:justify-between sm:gap-3">
                <span className="min-w-0">
                  <span className="block truncate font-medium">{name}</span>
                  <span className="block text-xs text-muted-foreground">
                    {LEVEL_LABELS[e.level]} · started {new Date(e.started_at).toLocaleDateString()}
                  </span>
                </span>
                <span className="flex shrink-0 items-center gap-3">
                  <span className="flex-1 text-xs text-muted-foreground sm:flex-none sm:text-right">
                    {n === 0 ? (
                      "never trained"
                    ) : (
                      <>
                        <span className="text-foreground">{n} session{n === 1 ? "" : "s"}</span>
                        {e.lastLoggedAt && (
                          <span className="block">last {new Date(e.lastLoggedAt).toLocaleDateString()}</span>
                        )}
                      </>
                    )}
                  </span>
                  <button
                    type="button"
                    onClick={() => resume(e, name)}
                    disabled={busy === e.id}
                    data-testid="resume-program"
                    className="rounded-md border border-border px-2 py-1 text-[11px] transition-colors hover:bg-accent disabled:opacity-40"
                  >
                    {busy === e.id ? "…" : "Start again"}
                  </button>
                  <button
                    type="button"
                    onClick={() => erase(e, name)}
                    disabled={busy === e.id}
                    aria-label={`Delete ${name} permanently`}
                    data-testid="delete-past-program"
                    className="rounded-md border border-border px-2 py-1 text-[11px] text-muted-foreground transition-colors hover:bg-accent hover:text-destructive disabled:opacity-40"
                  >
                    {busy === e.id ? "Deleting…" : "Delete"}
                  </button>
                </span>
              </div>
            )
          })}
        </CardContent>
      </Card>
      {past.length > SHOWN && (
        <button
          type="button"
          onClick={() => setShowAll((v) => !v)}
          className="text-xs text-muted-foreground underline underline-offset-2 hover:text-foreground"
        >
          {showAll ? "Show fewer" : `Show all ${past.length}`}
        </button>
      )}
    </div>
  )
}
