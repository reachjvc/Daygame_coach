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

export function PastPrograms() {
  const [past, setPast] = useState<ProgramEnrollment[] | null>(null)
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
    void load()
  }, [load])

  /**
   * The only permanent delete in the feature, and it lives only here.
   *
   * Ending a program archives it, which is what makes that button safe to press.
   * The cost of that is data you can never remove, which is its own fault — so
   * erasing exists, but only for a program you have already finished, and only
   * behind a confirmation that says the number of sessions out loud. A count is
   * the one thing that makes "permanently" mean something.
   */
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
          {past.map((e) => {
            const name = getProgram(e.program_id)?.name ?? e.program_id
            const n = e.sessionsLogged ?? 0
            return (
              <div key={e.id} className="flex items-baseline justify-between gap-3 px-4 py-2.5 text-sm">
                <span className="min-w-0">
                  <span className="block truncate">{name}</span>
                  <span className="block text-xs text-muted-foreground">
                    {LEVEL_LABELS[e.level]} · started {new Date(e.started_at).toLocaleDateString()}
                  </span>
                </span>
                <span className="flex shrink-0 items-center gap-3">
                  <span className="text-right text-xs text-muted-foreground">
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
    </div>
  )
}
