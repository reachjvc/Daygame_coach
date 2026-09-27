"use client"

/**
 * The page where a catalogue program becomes YOUR program.
 *
 * ── WHAT CHANGED, 2026-09-23 ─────────────────────────────────────────────────
 *
 * THE WEEK COULD NOT BE CHANGED BEFORE IT WAS STARTED. Life Mastery's Templates
 * step offered the editor here — rename a day, swap a lift you cannot do, drop
 * one your gym has no machine for — and this screen offered only the weights.
 * So the only way to start an edited program was through a screen that is being
 * deleted, and the editing surface that survived was the one you reach AFTER
 * committing. The editor is mounted here, under the level and the units.
 *
 * ONE ORANGE PER SCREEN. Level and units were `Button variant="default"`, which
 * is the app's one loud button — so "Beginner", "kg" and "Start StrongLifts
 * 5×5" were three equally shouting controls and the only one that does anything
 * irreversible was the third. The choices are tinted outline chips now, from
 * `CHIP_ON`, and Start is the only solid button on the screen.
 *
 * SWITCHING kg↔lb CONVERTS WHAT YOU TYPED. The boxes kept their numbers and the
 * unit label changed underneath them, so a 60 typed as kilograms silently
 * became 60 pounds — a 27 kg squat for somebody who had said 60. (The screen
 * this replaces cleared the boxes instead, which loses the answer but at least
 * does not lie about it.) Every typed number is converted and re-rounded to
 * something loadable.
 *
 * THE LIFTS ASKED ABOUT ARE THE EDITED WEEK'S, not the catalogue's. With an
 * editor on the page that can add a lift, a grid built from the catalogue would
 * ask for weights for lifts that are no longer in the program and say nothing
 * about the one just added — and `seedEnrollment` throws rather than invent a
 * starting weight, so Start would fail with a message about a lift nobody could
 * see a box for.
 */

import Link from "next/link"
import { useMemo, useRef, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { refreshEnrollments } from "../hooks/useEnrollment"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ArrowLeft } from "lucide-react"
import { requireProgram, resolveProgramForLevel } from "../data/catalog"
import { distanceUnitFor, fromKg, roundToLoadable, toKg } from "../programsService"
import { isCustomizable, isModified, materializeSchedule, scheduleDaysOrNone } from "../customize"
import { ProgramEditor } from "./ProgramEditor"
import { CHIP_ON } from "./trainingStyles"
import { LEVEL_LABELS } from "../config"
import type { LevelId, ProgramEnrollment, ProgramSchedule, UnitSystem } from "../types"

interface Props {
  programId: string
  onBack: () => void
  onEnrolled: (enrollmentId: string) => void
  /**
   * What is running, so this screen can stop offering to start something that
   * already is. `BuildYourWeek` has had this since it was written; the
   * catalogue, which is how most people start a program, did not.
   */
  enrollments: readonly ProgramEnrollment[]
}

export function ProgramDetail({ programId, enrollments, onBack, onEnrolled }: Props) {
  const program = requireProgram(programId)
  const [level, setLevel] = useState<LevelId>(program.levels[0].id)
  const [unit, setUnit] = useState<UnitSystem>("kg")
  const [overrides, setOverrides] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  /**
   * The programs this enrolment ended, and the id to go to once it has been
   * read. Held rather than navigated straight past, because the message
   * belongs on a screen that stays — this one unmounts the moment
   * `onEnrolled` fires.
   */
  const [displaced, setDisplaced] = useState<{ id: string; names: string[] } | null>(null)

  // Resolve routing (Layer-1): which program a (program, level) actually delivers.
  const resolved = useMemo(() => resolveProgramForLevel(programId, level), [programId, level])

  /**
   * IS THIS ONE ALREADY RUNNING? The catalogue marked nothing, and this page
   * offered a plain "Start Couch to 5K" for the program the account was three
   * weeks into. Pressing it archived that enrolment and began a new one:
   *
   *   before  cursor {week:1, cycle:1, dayIndex:1, sessionCount:1}
   *   after   cursor {week:1, cycle:1, dayIndex:0, sessionCount:0}
   *
   * The cursor is the smaller half. `enrollInProgram` re-seeds from the
   * level's defaults, and `PastPrograms.tsx` says of that path
   * "re-enrolling from the catalogue would reset it to the level's starting
   * weights" — so on a strength program a year of progression goes with it.
   *
   * `BuildYourWeek` has refused this since it was written, under a comment
   * saying the enabled Start "silently paused the very week it had just
   * started". The same sentence was true here and nobody had said it.
   */
  const alreadyRunning = useMemo(
    () => enrollments.find((e) => e.program_id === resolved.program.id && e.is_active) ?? null,
    [enrollments, resolved.program.id]
  )
  const routed = resolved.program.id !== programId

  /**
   * The week being edited, and WHICH PROGRAM IT BELONGS TO.
   *
   * Kept beside the schedule rather than reset by an effect: picking a level
   * that routes to a different program (Layer-1) must not carry an edit made
   * against the other program's days across to it. Derived in render, so there
   * is no frame in which the schedule and the program disagree.
   *
   * Keyed by id rather than cleared outright, which is a deliberate departure
   * from the step's "reset when the resolved program changes": looking at
   * another level and coming back does not throw your edit away, and nothing
   * goes stale by it — `missingWorkingWeights` is recomputed against the level
   * on every render.
   */
  const base = useMemo(
    () =>
      isCustomizable(resolved.program)
        ? materializeSchedule(resolved.program)
        : resolved.program.schedule,
    [resolved]
  )
  const [edited, setEdited] = useState<{ programId: string; schedule: ProgramSchedule } | null>(null)
  const schedule = edited?.programId === resolved.program.id ? edited.schedule : base
  const modified = isCustomizable(resolved.program) && isModified(resolved.program, schedule)

  /** Unique lifts of the week AS EDITED, and whether it is a 1RM program. */
  const { exercises, requires1RM } = useMemo(() => {
    const seen = new Map<string, { id: string; name: string; percentage: boolean }>()
    for (const day of scheduleDaysOrNone(schedule)) {
      for (const ex of day.exercises) {
        if (ex.metricType !== "load") continue
        if (!seen.has(ex.id)) {
          seen.set(ex.id, {
            id: ex.id,
            name: ex.name,
            percentage: ex.progression.kind === "percentage_tm",
          })
        }
      }
    }
    const list = [...seen.values()]
    return { exercises: list, requires1RM: list.some((e) => e.percentage) }
  }, [schedule])

  /**
   * Does this program ask for a distance? `unitSystem` drives two things —
   * the weights, and the km/miles the finish sheet asks an endurance session
   * for — so a plan with neither is a plan the picker does not touch.
   */
  const asksDistance = schedule.kind === "endurance_weeks"

  const levelSeed = resolved.program.levels.find((l) => l.id === resolved.level)

  function defaultFor(id: string): string {
    if (requires1RM) return ""
    const kg = levelSeed?.seedWorkingWeightKg?.[id]
    if (kg == null) return ""
    return String(roundToLoadable(fromKg(kg, unit), unit))
  }

  /**
   * Change the unit AND every number somebody typed in the old one.
   *
   * Only what was typed: a box showing the level's own seed carries no value in
   * `overrides`, and `defaultFor` recomputes it in the new unit on its own.
   */
  function changeUnit(next: UnitSystem) {
    if (next === unit) return
    setOverrides((was) => {
      const out: Record<string, string> = {}
      for (const [id, raw] of Object.entries(was)) {
        const n = Number(raw)
        // A box left blank or half-typed stays exactly as it is: converting
        // nothing produces 0, and 0 is a weight somebody did not choose.
        if (raw.trim() === "" || !Number.isFinite(n)) {
          out[id] = raw
          continue
        }
        /**
         * "free", NOT the barbell default — and this is a correction to the
         * step, which said a typed 60 kg becomes 132.5 lb.
         *
         * It does not. `roundToLoadable`'s barbell path floors at the bar and
         * snaps to a plate pair, so 60 kg comes out as 130 lb and anything
         * light — a 6 kg lateral raise — is dragged up to the 45 lb bar, which
         * is a weight that person may not be able to lift. The number in these
         * boxes is one somebody TYPED, not a prescription, so the conversion
         * only keeps it sane: 132 lb, at `FREE_PRECISION.lb` of 1.
         */
        out[id] = String(roundToLoadable(fromKg(toKg(n, unit), next), next, "free"))
      }
      return out
    })
    setUnit(next)
  }

  /**
   * True from the first press until the screen has moved or the attempt has
   * failed. A ref and not state, because state is not readable by the second
   * press in the same frame.
   */
  const enrolling = useRef(false)

  async function enroll() {
    /**
     * A SECOND PRESS CANNOT GET IN. `setSaving(true)` is a state update, so it
     * does not take effect until the next render — two taps inside one frame
     * both pass the disabled check. The ref is synchronous.
     */
    if (enrolling.current) return
    enrolling.current = true
    setSaving(true)
    setError(null)
    try {
      const nums: Record<string, number> = {}
      for (const ex of exercises) {
        const raw = overrides[ex.id] ?? defaultFor(ex.id)
        const n = Number(raw)
        if (!raw || !Number.isFinite(n) || n <= 0) {
          throw new Error(`Enter a ${requires1RM ? "1RM" : "starting weight"} for ${ex.name}`)
        }
        nums[ex.id] = n
      }
      const body = {
        programId,
        level,
        unitSystem: unit,
        ...(requires1RM ? { oneRepMaxes: nums } : { workingWeights: nums }),
        // ONLY WHEN IT DIFFERS. Sending an untouched snapshot would give the
        // enrollment a copy-on-write schedule it never asked for, and a copy
        // stops picking up catalogue corrections for ever.
        ...(modified ? { customSchedule: schedule } : {}),
      }
      const res = await fetch("/api/programs/enrollments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })
      if (!res.ok) throw new Error((await res.json()).error ?? "Enroll failed")
      /**
       * WHAT THIS JUST ENDED, SAID OUT LOUD.
       *
       * Enrolling deactivates every active program in the SAME discipline, and
       * the route returns `displaced` for that reason — `programRepo` says of
       * it: "it REPORTS what it displaced rather than doing it silently". This
       * handler threw the field away, so starting Starting Strength from the
       * catalogue moved StrongLifts to the finished programs with no
       * confirmation before and no message after. `BuildYourWeek` does say it;
       * the catalogue, which is how most people start a program, did not.
       */
      const answer = (await res.json()) as {
        enrollment: { id: string }
        displaced?: { label?: string | null; program_id?: string }[]
      }
      const ended = (answer.displaced ?? [])
        .map((d) => d.label ?? d.program_id ?? "")
        .filter((name): name is string => Boolean(name))
      await refreshEnrollments()
      if (ended.length > 0) {
        setDisplaced({ id: answer.enrollment.id, names: ended })
        enrolling.current = false
        setSaving(false)
        return
      }
      /**
       * AND IT STAYS "Starting…" UNTIL THE SCREEN ACTUALLY MOVES.
       *
       * This cleared `saving` in a `finally`, which runs the moment the
       * handler returns — while `onEnrolled → router.replace` is still in
       * flight. Timed, polling every 500ms after one click:
       *
       *   0.0s  "Starting…"                 ?view=detail&catalog=stronglifts-5x5
       *   0.5s  POST /api/programs/enrollments 201
       *   1.0s  "Start StrongLifts 5×5"     <- live again, screen unchanged
       *   3.0s  ?program=777d00ed…          <- only now does anything move
       *
       * Two seconds of an armed Start on a screen that has not changed. A
       * second press in that window made a SECOND enrolment which displaced
       * the first: two identical rows in "Programs you have finished", two
       * controls with the same accessible name, no `displaced` confirmation,
       * and the URL left on the archived id still drawing a live Today card.
       *
       * Navigation is the end of this handler's job, so the button belongs to
       * the navigation, not to the fetch.
       */
      onEnrolled(answer.enrollment.id)
    } catch (e) {
      setError((e as Error).message)
      enrolling.current = false
      setSaving(false)
    }
  }

  if (displaced) {
    // The same shape `BuildYourWeek` uses, for the same reason: what this just
    // ended is a fact somebody needs before they walk away from the screen.
    return (
      <div className="space-y-3" data-testid="enrolled-displaced">
        <p role="status" className="text-base font-semibold">
          {program.name} is running.
        </p>
        {displaced.names.map((name) => (
          <p key={name} className="text-sm text-muted-foreground">
            {name} moved to your finished programs — everything it logged is kept.
          </p>
        ))}
        <Button onClick={() => onEnrolled(displaced.id)}>Go to today&apos;s session</Button>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <Button variant="ghost" size="sm" onClick={onBack}>
        <ArrowLeft className="size-4 mr-2" /> All programs
      </Button>

      <Card>
        <CardHeader>
          <CardTitle>{program.name}</CardTitle>
          <p className="text-sm text-muted-foreground">{program.blurb}</p>
          <p className="text-xs text-muted-foreground">Source: {program.sourceCitation}</p>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Level */}
          <div>
            <Label className="mb-1.5 block">Starting level</Label>
            <div className="flex gap-2">
              {program.levels.map((l) => (
                <Button
                  key={l.id}
                  size="sm"
                  variant="outline"
                  aria-pressed={level === l.id}
                  className={level === l.id ? CHIP_ON : undefined}
                  onClick={() => setLevel(l.id)}
                >
                  {LEVEL_LABELS[l.id]}
                </Button>
              ))}
            </div>
            {routed && (
              <p className="mt-2 text-xs text-amber-600">
                {LEVEL_LABELS[level]} routes to <strong>{resolved.program.name}</strong> — a better fit for this level.
              </p>
            )}
          </div>

          {/*
            Unit. LABELLED FOR WHAT IT ACTUALLY CONTROLS.

            `unitSystem` decides two things: the weights, and the distance the
            finish sheet asks for (`distanceUnitFor` — km for kg, miles for
            lb). On a program with no lifts in it at all — Couch to 5K is
            entirely endurance — the per-lift weight boxes below are correctly
            hidden, and this row was left reading "Units: kg / lb" above
            nothing. Picking "lb" changed the screen not at all, so the only
            control on the page looked broken; what it had really done was
            switch the run to miles, silently.
          */}
          {/*
            AND HIDDEN WHEN IT CONTROLS NOTHING ON THIS SCREEN.

            The label was chosen by `exercises.length > 0` — "no lifts, so it
            must be distances". That is true of every program in the catalogue
            today, because each one is either all-load or all-endurance, so
            the proxy is exact by accident. A mobility or yoga plan has
            neither lifts nor distances, and it would have read
            "Distances: km / miles" above a control that changes nothing —
            the bug just fixed, relabelled. `asksDistance` asks the question
            the label answers.
          */}
          {(exercises.length > 0 || asksDistance) && (
          <div>
            <Label className="mb-1.5 block">{exercises.length > 0 ? "Units" : "Distances"}</Label>
            <div className="flex gap-2">
              {(["kg", "lb"] as UnitSystem[]).map((u) => (
                <Button
                  key={u}
                  size="sm"
                  variant="outline"
                  aria-pressed={unit === u}
                  className={unit === u ? CHIP_ON : undefined}
                  onClick={() => changeUnit(u)}
                >
                  {exercises.length > 0 ? u : distanceUnitFor(u)}
                </Button>
              ))}
            </div>
          </div>
          )}

          {/* The week itself, before it is started. */}
          <ProgramEditor
            program={resolved.program}
            schedule={schedule}
            level={resolved.level}
            unit={unit}
            onChange={(next) => setEdited({ programId: resolved.program.id, schedule: next })}
            workingWeights={overrides}
            onWorkingWeight={(id, raw) => setOverrides((o) => ({ ...o, [id]: raw }))}
            onReset={() => setEdited(null)}
          />

          {/* Per-exercise overrides (load programs only) */}
          {exercises.length > 0 && (
          <div>
            <Label className="mb-1.5 block">
              {requires1RM ? `Your 1-rep max per lift (${unit})` : `Starting working weight per lift (${unit})`}
            </Label>
            <div className="grid gap-2 sm:grid-cols-2">
              {exercises.map((ex) => (
                <div key={ex.id} className="flex items-center gap-2">
                  <span className="w-32 text-sm">{ex.name}</span>
                  <Input
                    type="number"
                    inputMode="decimal"
                    aria-label={`${requires1RM ? "1-rep max" : "Starting weight"} for ${ex.name} in ${unit}`}
                    placeholder={defaultFor(ex.id) || (requires1RM ? "1RM" : "weight")}
                    value={overrides[ex.id] ?? defaultFor(ex.id)}
                    onChange={(e) => setOverrides((o) => ({ ...o, [ex.id]: e.target.value }))}
                  />
                </div>
              ))}
            </div>
          </div>
          )}

          {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
          {/* THE ONE ORANGE. Everything above is an outline chip. */}
          {alreadyRunning ? (
            /* Not a second Start — see `alreadyRunning`. The way in, not a
               way to lose the weeks already on it. */
            <Button asChild data-testid="program-already-running">
              <Link href={`/programs?program=${alreadyRunning.id}`}>
                Already running — go to today&apos;s session
              </Link>
            </Button>
          ) : (
            <Button onClick={enroll} disabled={saving} data-testid="start-program">
              {saving ? "Starting…" : `Start ${resolved.program.name}`}
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
