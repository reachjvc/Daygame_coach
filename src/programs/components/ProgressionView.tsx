"use client"

import { useMemo, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { History, SkipForward, RotateCcw, Trash2 } from "lucide-react"
import { formatLoad, summariseProgression, unbrokenRun, UNBROKEN_RUN_QUESTION_AT } from "../programsService"
import { Sparkline } from "./Sparkline"
import { effectiveProgram } from "../customize"
import { scheduleDays } from "../customize"
import { requireProgram } from "../data/catalog"
import { UNIT_CONFIG } from "../config"
import type { ProgramEnrollment, ProgramSessionLogRow } from "../types"

interface Props {
  enrollmentId: string
  logs: ProgramSessionLogRow[]
  /** Needed to turn stored ids back into the names and days a person recognises. */
  enrollment: ProgramEnrollment
  onChanged: () => void
  onUnenrolled: () => void
}

export function ProgressionView({ enrollmentId, logs, enrollment, onChanged, onUnenrolled }: Props) {
  const [busy, setBusy] = useState(false)
  const [showAll, setShowAll] = useState(false)

  /**
   * The stored ids turned back into words.
   *
   * `entries` keys lifts by `exerciseId` and a session by `day_id`, so the panel
   * was printing `ohp-day` and `bench` at people. The program knows the names;
   * nothing was asking it.
   */
  const { progress, dayLabel, unitLabel, run } = useMemo(() => {
    const program = effectiveProgram(requireProgram(enrollment.program_id), enrollment.customSchedule)
    const days = scheduleDays(program.schedule)
    const liftNames = new Map<string, string>()
    for (const d of days) for (const ex of d.exercises) liftNames.set(ex.id, ex.name)
    const dayNames = new Map(days.map((d) => [d.id, d.label]))
    /** Fixed rep target per lift; null where a lift cannot be "missed". */
    const targetReps = new Map<string, number | null>()
    for (const d of days) {
      for (const ex of d.exercises) {
        // Only load lifts carry a fixed rep target. A skill tier and a timed
        // hold cannot be "missed" in this sense, so they neither break a run
        // nor extend one.
        if (ex.metricType !== "load") {
          targetReps.set(ex.id, null)
          continue
        }
        const scheme = ex.scheme
        targetReps.set(
          ex.id,
          scheme.kind === "linear" ? scheme.reps : scheme.kind === "rep_range" ? scheme.repMin : null
        )
      }
    }
    return {
      progress: summariseProgression(logs, (id) => liftNames.get(id) ?? id),
      dayLabel: (id: string) => dayNames.get(id) ?? id,
      unitLabel: UNIT_CONFIG[enrollment.unitSystem].label,
      run: unbrokenRun(logs, (id) => targetReps.get(id) ?? null),
    }
  }, [logs, enrollment])

  async function action(action: "skip" | "reset") {
    setBusy(true)
    try {
      await fetch(`/api/programs/enrollments/${enrollmentId}/action`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      })
      onChanged()
    } finally {
      setBusy(false)
    }
  }

  async function unenroll() {
    // It no longer removes anything. Ending a program archives it, so the
    // sessions stay and can be read back; what stops is the prescribing.
    if (!confirm("End this program? It stops prescribing sessions. Everything you logged is kept.")) return
    setBusy(true)
    try {
      await fetch(`/api/programs/enrollments/${enrollmentId}`, { method: "DELETE" })
      onUnenrolled()
    } finally {
      setBusy(false)
    }
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <History className="size-4" /> History
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {logs.length === 0 ? (
          <p className="text-sm text-muted-foreground">No sessions logged yet.</p>
        ) : (
          <>
            {/* WHAT THE NUMBERS DID. The panel used to open on a list of dates;
                the reason anybody logs a session is the column on the right. */}
            {/* THE 395 KG SQUAT, asked about rather than capped. The programs
                here are cited, so inventing a ceiling would be editing somebody
                else's program with a number we made up. What can be said
                honestly is what the log shows. */}
            {run >= UNBROKEN_RUN_QUESTION_AT && (
              <p
                data-testid="unbroken-run-notice"
                className="rounded-md border border-amber-500/30 bg-amber-500/10 px-2.5 py-2 text-xs text-amber-600 dark:text-amber-400"
              >
                {run} sessions in a row logged with every rep hit. That is a long time
                without a miss — if a lift has got heavy, correct the reps when you log it.
                Missing reps is what tells the program to back the weight off.
              </p>
            )}

            {progress.length > 0 && (
              <div data-testid="lift-progress">
                <p className="mb-1.5 text-xs font-medium text-muted-foreground">
                  {logs.length} session{logs.length === 1 ? "" : "s"} logged
                </p>
                <ul className="space-y-1 text-sm">
                  {progress.map((l) => {
                    const moved = l.latest - l.first
                    return (
                      <li key={l.exerciseId} className="flex items-center justify-between gap-3 border-b pb-1 last:border-0">
                        <span className="min-w-0 flex-1 truncate">{l.name}</span>
                        <Sparkline
                          points={l.points}
                          label={`${l.name}: ${formatLoad(l.first)} to ${formatLoad(l.latest)} ${unitLabel} over ${l.sessions} sessions, ${new Date(l.firstAt).toLocaleDateString()} to ${new Date(l.latestAt).toLocaleDateString()}`}
                        />
                        <span className="shrink-0 text-muted-foreground">
                          {l.first === l.latest ? (
                            <>
                              {formatLoad(l.latest)} {unitLabel}
                              <span className="ml-1.5 text-xs">· held over {l.sessions}</span>
                            </>
                          ) : (
                            <>
                              {formatLoad(l.first)} → <span className="text-foreground font-medium">{formatLoad(l.latest)} {unitLabel}</span>
                              <span className={`ml-1.5 text-xs ${moved > 0 ? "text-emerald-600" : "text-amber-600"}`}>
                                {moved > 0 ? "+" : ""}{formatLoad(moved)}
                              </span>
                            </>
                          )}
                          {/* Best above latest means a deload, not a lost record. */}
                          {l.best > l.latest && (
                            <span className="ml-1.5 text-xs text-muted-foreground">best {formatLoad(l.best)}</span>
                          )}
                        </span>
                      </li>
                    )
                  })}
                </ul>
              </div>
            )}

            <div>
              <p className="mb-1.5 text-xs font-medium text-muted-foreground">Sessions</p>
              <ul className="space-y-1 text-sm">
                {(showAll ? logs : logs.slice(0, 8)).map((l) => (
                  <li key={l.id} className="flex justify-between border-b pb-1 last:border-0">
                    <span>
                      {dayLabel(l.day_id)}
                      <span className="ml-1.5 text-xs text-muted-foreground">
                        cycle {l.cycle}, week {l.week}
                      </span>
                    </span>
                    <span className="text-muted-foreground">{new Date(l.logged_at).toLocaleDateString()}</span>
                  </li>
                ))}
              </ul>
              {/* A year is ~150 sessions. Twelve of them, with no way to the
                  rest, is a log you cannot actually read. */}
              {logs.length > 8 && (
                <Button variant="ghost" size="sm" className="mt-1" onClick={() => setShowAll((v) => !v)}>
                  {showAll ? "Show recent only" : `Show all ${logs.length}`}
                </Button>
              )}
            </div>
          </>
        )}

        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" disabled={busy} onClick={() => action("skip")}>
            <SkipForward className="size-4 mr-1" /> Skip session
          </Button>
          <Button variant="outline" size="sm" disabled={busy} onClick={() => action("reset")}>
            <RotateCcw className="size-4 mr-1" /> Reset to start
          </Button>
          <Button variant="ghost" size="sm" disabled={busy} onClick={unenroll} className="text-destructive">
            <Trash2 className="size-4 mr-1" /> End program
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
