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
import { getProgram } from "../data/catalog"
import { LEVEL_LABELS } from "../config"
import type { ProgramEnrollment } from "../types"

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

  const load = useCallback(async () => {
    try {
      const r = await fetch("/api/programs/enrollments?past=1")
      setPast(r.ok ? await r.json() : [])
    } catch {
      setPast([])
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
      const res = await fetch(`/api/programs/enrollments/${e.id}/resume`, { method: "POST" })
      const body = (await res.json().catch(() => null)) as
        | { displaced?: { program_id: string }[]; error?: string }
        | null
      if (!res.ok) {
        alert(body?.error ?? "Could not restart that program.")
        return
      }
      // Say what it displaced rather than letting somebody discover it later —
      // being silently swapped is the fault this whole feature is recovering from.
      const displaced = body?.displaced ?? []
      if (displaced.length > 0) {
        const names = displaced.map((d) => getProgram(d.program_id)?.name ?? d.program_id).join(", ")
        alert(`${name} is running again. ${names} moved to your finished programs — everything it logged is kept.`)
      }
      onResumed?.()
      await load()
    } finally {
      setBusy(null)
    }
  }

  async function erase(e: ProgramEnrollment, name: string) {
    const n = e.sessionsLogged ?? 0
    const what = n === 0 ? "It has no logged sessions." : `Its ${n} logged session${n === 1 ? "" : "s"} will be erased.`
    if (!confirm(`Delete ${name} permanently? ${what} This cannot be undone.`)) return
    setBusy(e.id)
    try {
      await fetch(`/api/programs/enrollments/${e.id}?permanent=1`, { method: "DELETE" })
      await load()
    } finally {
      setBusy(null)
    }
  }

  // Nothing to say until there is a past. No empty state, no skeleton — this
  // sits under the thing people came for.
  if (!past || past.length === 0) return null

  return (
    <div className="space-y-2" data-testid="past-programs">
      <h2 className="text-sm font-semibold text-muted-foreground">Programs you have finished</h2>
      <Card>
        <CardContent className="divide-y p-0">
          {(showAll ? past : past.slice(0, SHOWN)).map((e) => {
            const name = getProgram(e.program_id)?.name ?? e.program_id
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
