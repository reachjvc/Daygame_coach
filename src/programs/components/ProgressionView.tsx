"use client"

import { useMemo, useState } from "react"
import { Button } from "@/components/ui/button"
import { History, ChevronDown, ChevronUp } from "lucide-react"
import {
  formatLoad,
  summariseProgression,
  unbrokenRun,
  UNBROKEN_RUN_QUESTION_AT,
} from "../programsService"
import { Sparkline } from "./Sparkline"
import { effectiveProgram } from "../customize"
import { scheduleDaysOrNone } from "../customize"
import { requireProgram } from "../data/catalog"
import { UNIT_CONFIG } from "../config"
import type { ProgramEnrollment, ProgramSessionLogRow } from "../types"

/**
 * READ-ONLY NOW. Every prop that existed to write something — the enrollment
 * id it posted to, and the three callbacks it told the parent about — went
 * with the buttons to `ProgramSheet`. What is left reports.
 */
interface Props {
  logs: ProgramSessionLogRow[]
  /** Needed to turn stored ids back into the names and days a person recognises. */
  enrollment: ProgramEnrollment
}

export function ProgressionView({ logs, enrollment }: Props) {
  const [showAll, setShowAll] = useState(false)
  const [showHistory, setShowHistory] = useState(false)

  /**
   * The stored ids turned back into words.
   *
   * `entries` keys lifts by `exerciseId` and a session by `day_id`, so the panel
   * was printing `ohp-day` and `bench` at people. The program knows the names;
   * nothing was asking it.
   */
  // Lifted out of the memo below because the Skip button needs the schedule to
  // decide whether skipping means anything at all.
  const program = effectiveProgram(requireProgram(enrollment.program_id), enrollment.customSchedule)

  const { progress, dayLabel, unitLabel, run } = useMemo(() => {
    // OR NONE: a running plan has weeks, not days, and asking `scheduleDays`
    // for its days threw — taking the whole page down for anybody enrolled in
    // Couch to 5K. It has no lifts to name, which is an answer.
    const days = scheduleDaysOrNone(program.schedule)
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
  }, [logs, enrollment, program])


  /**
   * CHECK WHETHER IT WORKED.
   *
   * `await fetch(...)` with no look at the response, then `onChanged()`
   * regardless — so a 500 was indistinguishable from success. Tap "Skip
   * session", the screen refreshes showing the same session, tap again, and if
   * the second one lands you have skipped twice. "End program" was worse: it
   * navigated away from a program that was still running and still prescribing.
   */

  /**
   * `action` and `unenroll` lived here. Both moved to `ProgramSheet`, so the
   * sentence shown before a write and the write itself are in one file — the
   * reset box spent months promising a weight reset the code never performed
   * because they were in two.
   */

  /**
   * The headline, so the fold is worth leaving closed.
   *
   * This card carried the same visual weight as today's session and sat open
   * under it, which is most of why the page ran to 2264 pixels on a phone. What
   * somebody actually wants at a glance is one line: how much they have done and
   * whether the number is moving.
   */
  const headline =
    logs.length === 0
      ? "Nothing logged yet"
      : `${logs.length} session${logs.length === 1 ? "" : "s"}` +
        (progress[0] && progress[0].latest !== progress[0].first
          ? ` · ${progress[0].name} ${formatLoad(progress[0].first)} → ${formatLoad(progress[0].latest)} ${unitLabel}`
          : "")

  /*
   * A FOLDED PANEL IS NOT AN OBJECT EITHER.
   * Closed, this was a Card containing one line — 91px to say "History, nothing
   * logged yet", directly under the workout and in the same visual language as
   * it. It is a disclosure row now, matching the "Log a workout you already
   * did" row above it, so the bottom of the tab reads as two controls rather
   * than two more slabs.
   */
  return (
    <div className="rounded-md border border-border">
      <button
        type="button"
        onClick={() => setShowHistory((v) => !v)}
        aria-expanded={showHistory}
        data-testid="history-toggle"
        className="flex min-h-11 w-full items-center justify-between gap-3 px-3 py-2 text-left"
      >
        <span className="flex min-w-0 items-center gap-2">
          <History className="size-4 shrink-0 text-muted-foreground" />
          <span className="min-w-0 truncate text-sm">
            History
            <span className="ml-2 text-xs text-muted-foreground">{headline}</span>
          </span>
        </span>
        {showHistory ? <ChevronUp className="size-4 shrink-0" /> : <ChevronDown className="size-4 shrink-0" />}
      </button>

      {showHistory && (
      <div className="space-y-4 px-3 pb-3">
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
                              {/* NO COLOUR ON THE DIRECTION. Green in this app means finished — a
                                  ticked set, a rest that is over — and a screen that borrows it
                                  for "went up" takes the meaning away from the ticks that need
                                  it. The sign and the arrow already say which way. */}
                              <span className="ml-1.5 text-xs text-muted-foreground">
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
                  <li key={l.id} className="flex items-center justify-between gap-2 border-b pb-1 last:border-0">
                    <span className="min-w-0 flex-1 truncate">
                      {dayLabel(l.day_id)}
                      <span className="ml-1.5 text-xs text-muted-foreground">
                        cycle {l.cycle}, week {l.week}
                      </span>
                    </span>
                    <span className="shrink-0 text-muted-foreground">
                      {new Date(l.logged_at).toLocaleDateString()}
                    </span>
                    {/*
                      NO BIN HERE ANY MORE.
                      There were two lists of the same sessions with two different
                      deletes: this one, which could only remove a row, and
                      History, where you can open a session, read its sets, correct
                      it or delete it — and where deleting now replays the program.
                      Two ways to destroy the same thing is one too many, and this
                      was the one that showed you least before you did it.
                    */}
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
              <p className="mt-1 text-xs text-muted-foreground">
                Open one, correct it or delete it on the History tab.
              </p>
            </div>
          </>
        )}

        {/* THE CONTROLS MOVED TO THE ⋮ MENU (`ProgramSheet`).
            Four buttons in a wrapping row, on the screen you open to train,
            with End — the only one with consequences — a thumb-width from the
            rest, and every one of them asking through the browser's own
            `confirm()` box. */}
      </div>
      )}
    </div>
  )
}
