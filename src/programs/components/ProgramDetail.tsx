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

import { useMemo, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { refreshEnrollments } from "../hooks/useEnrollment"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ArrowLeft } from "lucide-react"
import { requireProgram, resolveProgramForLevel } from "../data/catalog"
import { fromKg, roundToLoadable, toKg } from "../programsService"
import { isCustomizable, isModified, materializeSchedule, scheduleDaysOrNone } from "../customize"
import { ProgramEditor } from "./ProgramEditor"
import { CHIP_ON } from "./trainingStyles"
import { LEVEL_LABELS } from "../config"
import type { LevelId, ProgramSchedule, UnitSystem } from "../types"

interface Props {
  programId: string
  onBack: () => void
  onEnrolled: (enrollmentId: string) => void
}

export function ProgramDetail({ programId, onBack, onEnrolled }: Props) {
  const program = requireProgram(programId)
  const [level, setLevel] = useState<LevelId>(program.levels[0].id)
  const [unit, setUnit] = useState<UnitSystem>("kg")
  const [overrides, setOverrides] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Resolve routing (Layer-1): which program a (program, level) actually delivers.
  const resolved = useMemo(() => resolveProgramForLevel(programId, level), [programId, level])
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

  async function enroll() {
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
      const { enrollment } = await res.json()
      await refreshEnrollments()
      onEnrolled(enrollment.id)
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setSaving(false)
    }
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

          {/* Unit */}
          <div>
            <Label className="mb-1.5 block">Units</Label>
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
                  {u}
                </Button>
              ))}
            </div>
          </div>

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
          <Button onClick={enroll} disabled={saving} data-testid="start-program">
            {saving ? "Starting…" : `Start ${resolved.program.name}`}
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
