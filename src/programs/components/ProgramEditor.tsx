"use client"

/**
 * Making a picked program yours.
 *
 * The catalog programs are cited and correct, and almost nobody can run one
 * exactly as written. The rack has no leg press, the shoulder will not overhead
 * press, Tuesday is gone. Before this, the only answers were "follow it anyway"
 * or "do not use the app for training", and the second one is what people
 * actually pick.
 *
 * So: rename, reorder, add and remove the training days; swap, add, remove and
 * re-spec the lifts inside them. Everything edits a LOCAL copy of the schedule
 * and hands the whole thing back through `onChange` — the caller decides when
 * that becomes an enrollment, because picking and committing are different
 * decisions and the editor should not be making the second one.
 *
 * TWO THINGS IT REFUSES TO DO, both on purpose and both visible in the UI
 * rather than silent:
 *
 *   1. A 5/3/1 main lift will not take a sets/reps edit. The 65/75/85 wave IS
 *      the program; a sets box cannot express a per-week table, and letting one
 *      overwrite it would quietly turn 5/3/1 into something else wearing its
 *      name.
 *   2. Endurance plans (Couch-to-5K, the triathlon builds) are not editable at
 *      all. Week 6 only means anything because weeks 1–5 happened. The editor
 *      says so instead of offering controls that would produce a broken plan.
 *
 * Every lift the catalog did not seed — anything added or swapped in — asks for
 * a starting weight before the program can start, because `seedEnrollment`
 * throws rather than invent one and that refusal is the right one.
 *
 * ── WHAT CHANGED, 2026-09-23 ─────────────────────────────────────────────────
 *
 * WHY IT WAS UNUSABLE ON A PHONE, which is where people plan their training.
 * A day row was a text input committing a rename PER KEYSTROKE beside four
 * 44-px icon buttons; at 390 px the name got 96 px of that row and "Workout A"
 * read as "Wor…". Four icons is also four decisions on a row whose job is to
 * say which day it is. Now: the full name, one options button, and the four
 * actions are rows in a sheet with words on them.
 *
 * THE RENAME IS A DIALOG, NOT A LIVE BOX. `DraftInput` had already fixed the
 * per-keystroke trim that ate the space in "Upper Body", but a box you can
 * leave half-typed is the wrong shape for a name that cannot be blank: the
 * refusal had nowhere to appear except as a thrown error. A dialog has a
 * Save button, so "A training day needs a name" is something you read before
 * anything is attempted. `renameDay` still throws on blank — that stays as the
 * last line of defence and is no longer how the refusal reaches anybody.
 *
 * ONE LIFT SEARCH FOR THE WHOLE APP. The editor had `AddExercise` and
 * `SwapPicker` — a search box and a chip palette — and the live screen has
 * `AddLift`. Three ways to name a lift, and the live one is the one that has
 * been used at a rack. It is rendered inside the sheet here.
 */

import { useState } from "react"
import { MoreVertical, Plus } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { BottomSheet, SheetRow } from "@/components/BottomSheet"
import { AddLift } from "./live/AddLift"
import { TRAINING_CARD } from "./trainingStyles"
import {
  addDay,
  addExercise,
  isCustomizable,
  isModified,
  missingWorkingWeights,
  moveDay,
  moveExercise,
  removeDay,
  removeExercise,
  renameDay,
  scheduleDays,
  swapExercise,
  updateExerciseScheme,
  type AnyExercise,
} from "../customize"
import { freeLiftEntry, libraryByName, libraryExercise } from "../data/exerciseLibrary"
import { UNIT_CONFIG } from "../config"
import type {
  LevelId,
  LibraryExercise,
  LoadExercise,
  ProgramDefinition,
  ProgramSchedule,
  UnitSystem,
} from "../types"

interface Props {
  /** The catalog program — the thing being edited away from. */
  program: ProgramDefinition
  /** The current schedule (the user's copy, or a snapshot of the catalog's). */
  schedule: ProgramSchedule
  level: LevelId
  unit: UnitSystem
  onChange: (schedule: ProgramSchedule) => void
  /** Starting weights for lifts the level does not seed, keyed by exercise id. */
  workingWeights: Record<string, string>
  onWorkingWeight: (exerciseId: string, raw: string) => void
  /** Put the catalog program back. Offered only when something has changed. */
  onReset: () => void
}

/** One line describing what a lift prescribes, without opening anything. */
function prescriptionSummary(ex: AnyExercise): string {
  if (ex.metricType === "load") {
    const s = ex.scheme
    if (s.kind === "linear") return `${s.sets}×${s.reps}`
    if (s.kind === "rep_range") return `${s.sets}×${s.repMin}–${s.repMax}`
    return "percentage wave"
  }
  if (ex.metricType === "skill_tier") {
    const tier = ex.tiers[0]
    return `${ex.tiers.length} tiers · from ${tier.sets}×${tier.unlockReps}`
  }
  return `${ex.sets}× ${ex.startSec}s → ${ex.targetSec}s`
}

/**
 * Which sheet is open, if any. One piece of state rather than four booleans:
 * two sheets open at once is a state this screen has no drawing for, and four
 * booleans is four chances to leave one of them true.
 */
type Sheet =
  | { kind: "week" }
  | { kind: "day"; dayId: string }
  | { kind: "lift"; dayId: string; exerciseId: string }
  | { kind: "swap"; dayId: string; exerciseId: string }
  | { kind: "add"; dayId: string }

/** The rename dialog. `dayId: null` means it is naming a NEW day. */
type Naming = { dayId: string | null; value: string; problem: string | null }

export function ProgramEditor({
  program,
  schedule,
  level,
  unit,
  onChange,
  workingWeights,
  onWorkingWeight,
  onReset,
}: Props) {
  const [openDay, setOpenDay] = useState<string | null>(null)
  const [sheet, setSheet] = useState<Sheet | null>(null)
  const [naming, setNaming] = useState<Naming | null>(null)
  const [error, setError] = useState<string | null>(null)

  if (!isCustomizable(program)) {
    return (
      <div className="space-y-2" data-testid="editor-fixed-plan">
        <Badge variant="secondary">Week by week</Badge>
        <p className="text-sm text-muted-foreground">
          Week six only means something because weeks one to five happened, so the sessions are not
          separate pieces you can swap around. Pick the level that matches where you are and the plan
          starts there — everything after that is prescribed for you.
        </p>
      </div>
    )
  }

  const days = scheduleDays(schedule)
  const modified = isModified(program, schedule)
  const loadProgram = schedule.kind === "linear_rotation" || schedule.kind === "weekly_waved"
  const missing = missingWorkingWeights(program, schedule, level, unit)

  /** Every edit funnels through here so a refusal becomes a message, not a crash. */
  function apply(fn: () => ProgramSchedule) {
    try {
      setError(null)
      onChange(fn())
    } catch (e) {
      setError((e as Error).message)
    }
  }

  const dayOf = (dayId: string) => days.find((d) => d.id === dayId)
  const liftOf = (dayId: string, exerciseId: string) =>
    dayOf(dayId)?.exercises.find((e) => e.id === exerciseId) as AnyExercise | undefined

  /**
   * The library entry behind whatever the search handed back.
   *
   * A lift the library has never heard of is still a lift you are planning, and
   * the app already has a rule for one — the text parser keeps it under the
   * name as written, on double progression. `freeLiftEntry` IS that rule, so
   * this screen and the written week cannot disagree about what an invented
   * lift is.
   */
  const entryFor = (picked: { name: string; libraryId?: string }): LibraryExercise | null =>
    (picked.libraryId ? libraryExercise(picked.libraryId) : undefined) ??
    libraryByName(picked.name) ??
    // Null for a name that is nothing but whitespace — the one case
    // `freeLiftEntry` refuses. Answered by the caller rather than cast away.
    freeLiftEntry(picked.name)

  function saveName() {
    if (!naming) return
    const value = naming.value.trim()
    // The refusal is READ, not thrown. `renameDay` and `addDay` both reject a
    // blank name, and that throw stays underneath as the last line of defence.
    if (!value) {
      setNaming({ ...naming, problem: "A training day needs a name" })
      return
    }
    const { dayId } = naming
    setNaming(null)
    apply(() => (dayId === null ? addDay(schedule, value) : renameDay(schedule, dayId, value)))
  }

  return (
    <div className="space-y-2">
      <div className="flex min-h-11 items-center justify-between gap-2">
        <p className="text-sm font-semibold">Your training week</p>
        {modified && (
          <Button
            variant="ghost"
            size="icon"
            aria-label="Options for your training week"
            data-testid="editor-week-menu"
            onClick={() => setSheet({ kind: "week" })}
          >
            <MoreVertical className="size-5" />
          </Button>
        )}
      </div>

      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}

      <Card className={TRAINING_CARD}>
        <ul className="divide-y divide-border">
          {days.map((day) => {
            const open = openDay === day.id
            const n = day.exercises.length
            return (
              <li key={day.id}>
                <div className="flex min-h-11 items-center justify-between gap-2 px-4">
                  {/* A span, not the `p` the spec drew: a paragraph inside a
                      button is invalid markup, and the browser closes the
                      button early — which puts the lift count outside the
                      control that is supposed to open the day. */}
                  <button
                    type="button"
                    aria-expanded={open}
                    data-testid={`editor-day-${day.id}`}
                    onClick={() => setOpenDay(open ? null : day.id)}
                    className="flex min-h-11 min-w-0 flex-1 items-center gap-2 text-left"
                  >
                    {/* NO `truncate` ON THE NAME. The meta goes first: which
                        day this is matters more than how many lifts are in it,
                        and clipping the name is what made the row unreadable. */}
                    <span className="text-sm font-medium">{day.label}</span>
                    <span className="min-w-0 truncate text-xs text-muted-foreground">
                      {n} {n === 1 ? "lift" : "lifts"}
                    </span>
                  </button>
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label={`Options for ${day.label}`}
                    data-testid={`editor-day-menu-${day.id}`}
                    onClick={() => setSheet({ kind: "day", dayId: day.id })}
                  >
                    <MoreVertical className="size-5" />
                  </Button>
                </div>

                {open && (
                  <ul className="divide-y divide-border border-t border-border">
                    {day.exercises.map((ex) => (
                      <LiftRow
                        key={ex.id}
                        exercise={ex}
                        waved={isWaved(ex)}
                        needsWeight={Boolean(missing.find((m) => m.exerciseId === ex.id))}
                        onMenu={() => setSheet({ kind: "lift", dayId: day.id, exerciseId: ex.id })}
                      />
                    ))}
                    {loadProgram ? (
                      <li className="px-4 py-2">
                        {/* `Button`, not a hand-rolled one: `--accent` in this
                            app is the sunset red, so the dashed row copied
                            from the live screen flashed red on hover. */}
                        <Button
                          variant="outline"
                          className="w-full border-dashed text-muted-foreground"
                          data-testid={`editor-add-lift-${day.id}`}
                          onClick={() => setSheet({ kind: "add", dayId: day.id })}
                        >
                          <Plus className="size-4" /> Add a lift
                        </Button>
                      </li>
                    ) : (
                      <li className="px-4 py-2">
                        <p className="text-sm text-muted-foreground">
                          This program progresses by unlocking harder variations, not by adding
                          weight, so its movements come as ladders rather than from the lift library.
                          Reorder or drop the ones you do not want.
                        </p>
                      </li>
                    )}
                  </ul>
                )}
              </li>
            )
          })}
        </ul>
      </Card>

      <Button
        variant="outline"
        className="w-full border-dashed text-muted-foreground"
        data-testid="editor-add-day"
        onClick={() => setNaming({ dayId: null, value: "", problem: null })}
      >
        <Plus className="size-4" /> Add a day
      </Button>

      {missing.length > 0 && (
        <p className="text-sm text-muted-foreground">
          {missing.length === 1 ? "One lift needs" : `${missing.length} lifts need`} a starting weight
          before this can begin — open the day and fill it in. The suggestion beside each is a
          starting point, not a number the app will assume for you.
        </p>
      )}

      {/* ── The sheets ─────────────────────────────────────────────────────── */}

      <BottomSheet
        open={sheet?.kind === "week"}
        onClose={() => setSheet(null)}
        title="Your training week"
        testId="editor-week-sheet"
      >
        <SheetRow
          testId="editor-reset"
          onClick={() => {
            setSheet(null)
            onReset()
          }}
        >
          Reset to {program.name}
        </SheetRow>
      </BottomSheet>

      {sheet?.kind === "day" && (
        <DaySheet
          day={dayOf(sheet.dayId)}
          index={days.findIndex((d) => d.id === sheet.dayId)}
          count={days.length}
          onClose={() => setSheet(null)}
          onRename={(dayId, label) => {
            setSheet(null)
            setNaming({ dayId, value: label, problem: null })
          }}
          onMove={(index, dir) => {
            setSheet(null)
            apply(() => moveDay(schedule, index, dir))
          }}
          onRemove={(dayId) => {
            setSheet(null)
            setOpenDay((was) => (was === dayId ? null : was))
            apply(() => removeDay(schedule, dayId))
          }}
        />
      )}

      {sheet?.kind === "lift" && liftOf(sheet.dayId, sheet.exerciseId) && (
        <LiftSheet
          exercise={liftOf(sheet.dayId, sheet.exerciseId)!}
          unit={unit}
          index={(dayOf(sheet.dayId)?.exercises ?? []).findIndex((e) => e.id === sheet.exerciseId)}
          count={dayOf(sheet.dayId)?.exercises.length ?? 0}
          editable={loadProgram}
          needsWeight={missing.find((m) => m.exerciseId === sheet.exerciseId)}
          weightValue={workingWeights[sheet.exerciseId] ?? ""}
          onWeight={(raw) => onWorkingWeight(sheet.exerciseId, raw)}
          onClose={() => setSheet(null)}
          onScheme={(patch) =>
            apply(() =>
              updateExerciseScheme(
                schedule,
                (sheet as { dayId: string }).dayId,
                (sheet as { exerciseId: string }).exerciseId,
                patch
              )
            )
          }
          onMove={(index, dir) => {
            const { dayId } = sheet
            setSheet(null)
            apply(() => moveExercise(schedule, dayId, index, dir))
          }}
          onSwap={() => setSheet({ kind: "swap", dayId: sheet.dayId, exerciseId: sheet.exerciseId })}
          onRemove={() => {
            const { dayId, exerciseId } = sheet
            setSheet(null)
            apply(() => removeExercise(schedule, dayId, exerciseId))
          }}
        />
      )}

      {(sheet?.kind === "swap" || sheet?.kind === "add") && (
        <BottomSheet
          open
          onClose={() => setSheet(null)}
          title={
            sheet.kind === "swap"
              ? `Swap ${liftOf(sheet.dayId, sheet.exerciseId)?.name ?? "this lift"}`
              : `Add a lift to ${dayOf(sheet.dayId)?.label ?? "this day"}`
          }
          testId="editor-lift-search"
        >
          {/* THE SAME SEARCH AS THE LIVE SCREEN, open already: the sheet's
              heading has said what is happening, so a closed "Add a lift"
              button inside it would be the action named twice. */}
          <AddLift
            startOpen
            alreadyHere={(dayOf(sheet.dayId)?.exercises ?? []).map((e) => e.name)}
            onCancel={() => setSheet(null)}
            onAdd={(picked) => {
              const current = sheet
              const entry = entryFor(picked)
              setSheet(null)
              if (!entry) {
                setError("That lift needs a name.")
                return
              }
              apply(() =>
                current.kind === "swap"
                  ? swapExercise(schedule, current.dayId, current.exerciseId, entry).schedule
                  : addExercise(schedule, current.dayId, entry).schedule
              )
            }}
          />
        </BottomSheet>
      )}

      {/* ── The name dialog ───────────────────────────────────────────────── */}

      <Dialog open={naming !== null} onOpenChange={(next) => !next && setNaming(null)}>
        <DialogContent data-testid="editor-name-dialog">
          <DialogHeader>
            <DialogTitle>{naming?.dayId === null ? "Name the new day" : "Rename this day"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="editor-day-name">Name</Label>
            <Input
              id="editor-day-name"
              value={naming?.value ?? ""}
              autoFocus
              placeholder="Upper Body, Conditioning, Saturday…"
              onChange={(e) =>
                setNaming((was) => (was ? { ...was, value: e.target.value, problem: null } : was))
              }
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault()
                  saveName()
                }
              }}
            />
            {naming?.problem && (
              <p role="alert" className="text-sm text-destructive">
                {naming.problem}
              </p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNaming(null)}>
              Cancel
            </Button>
            <Button onClick={saveName} data-testid="editor-name-save">
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

/** A 5/3/1 main lift: the percentage wave is the program, not a default. */
function isWaved(ex: AnyExercise): boolean {
  return ex.metricType === "load" && (ex as LoadExercise).scheme.kind === "percentage_tm"
}

// ---------------------------------------------------------------------------

function LiftRow({
  exercise,
  waved,
  needsWeight,
  onMenu,
}: {
  exercise: AnyExercise
  waved: boolean
  needsWeight: boolean
  onMenu: () => void
}) {
  return (
    <li className="flex min-h-11 items-center justify-between gap-2 px-4">
      <span className="min-w-0 flex-1">
        <span className="block text-sm">{exercise.name}</span>
        <span className="block text-xs text-muted-foreground">
          {waved ? "the program's wave" : prescriptionSummary(exercise)}
          {/* Said on the row, not only inside the sheet: a program that cannot
              start is worth knowing about before you tap into four days
              looking for the reason. */}
          {needsWeight ? " · needs a starting weight" : ""}
        </span>
      </span>
      <Button
        variant="ghost"
        size="icon"
        aria-label={`Options for ${exercise.name}`}
        data-testid={`editor-lift-menu-${exercise.id}`}
        onClick={onMenu}
      >
        <MoreVertical className="size-5" />
      </Button>
    </li>
  )
}

function DaySheet({
  day,
  index,
  count,
  onClose,
  onRename,
  onMove,
  onRemove,
}: {
  day: { id: string; label: string } | undefined
  index: number
  count: number
  onClose: () => void
  onRename: (dayId: string, label: string) => void
  onMove: (index: number, dir: -1 | 1) => void
  onRemove: (dayId: string) => void
}) {
  if (!day) return null
  return (
    <BottomSheet open onClose={onClose} title={day.label} testId="editor-day-sheet">
      <SheetRow testId="editor-day-rename" onClick={() => onRename(day.id, day.label)}>
        Rename
      </SheetRow>
      {/* Disabled and visible, not hidden: a sheet whose rows move around
          between openings is a sheet you cannot learn. */}
      <SheetRow testId="editor-day-up" disabled={index === 0} onClick={() => onMove(index, -1)}>
        Move up
      </SheetRow>
      <SheetRow
        testId="editor-day-down"
        disabled={index === count - 1}
        onClick={() => onMove(index, 1)}
      >
        Move down
      </SheetRow>
      <SheetRow
        testId="editor-day-remove"
        destructive
        disabled={count <= 1}
        onClick={() => onRemove(day.id)}
      >
        Remove this day
      </SheetRow>
    </BottomSheet>
  )
}

function LiftSheet({
  exercise,
  unit,
  index,
  count,
  editable,
  needsWeight,
  weightValue,
  onWeight,
  onClose,
  onScheme,
  onMove,
  onSwap,
  onRemove,
}: {
  exercise: AnyExercise
  unit: UnitSystem
  /** Where it sits in the day, for the two move rows. */
  index: number
  count: number
  editable: boolean
  needsWeight?: { suggested: number }
  weightValue: string
  onWeight: (raw: string) => void
  onClose: () => void
  onScheme: (patch: { sets?: number; reps?: number; repMin?: number; repMax?: number }) => void
  onMove: (index: number, dir: -1 | 1) => void
  onSwap: () => void
  onRemove: () => void
}) {
  // `removeExercise` throws on the last lift in a day; the row says so by being
  // off rather than by throwing when it is tapped.
  const onlyLift = count <= 1
  const isLoad = exercise.metricType === "load"
  const scheme = isLoad ? (exercise as LoadExercise).scheme : null
  const waved = scheme?.kind === "percentage_tm"

  return (
    <BottomSheet open onClose={onClose} title={exercise.name} testId="editor-lift-sheet">
      {waved && (
        <div className="space-y-1.5 px-3 py-2">
          <Badge variant="secondary">The program&apos;s wave</Badge>
          <p className="text-sm text-muted-foreground">
            Sets fixed — this lift runs the program&apos;s percentage wave, which is the part of 5/3/1
            that makes it 5/3/1. Swap it for another lift if you want something else here.
          </p>
        </div>
      )}

      {scheme && !waved && (
        <div className="flex flex-wrap items-end gap-3 px-3 py-2">
          <NumberBox label="Sets" value={scheme.sets} onCommit={(n) => onScheme({ sets: n })} />
          {scheme.kind !== "rep_range" ? (
            <NumberBox label="Reps" value={scheme.reps} onCommit={(n) => onScheme({ reps: n })} />
          ) : (
            <>
              <NumberBox
                label="Reps from"
                value={scheme.repMin}
                onCommit={(n) => onScheme({ repMin: n })}
              />
              <NumberBox
                label="to"
                value={scheme.repMax}
                onCommit={(n) => onScheme({ repMax: n })}
              />
            </>
          )}
        </div>
      )}

      {needsWeight && (
        <div className="space-y-1.5 px-3 py-2">
          <Label htmlFor={`start-${exercise.id}`}>
            Starting weight ({UNIT_CONFIG[unit].label})
          </Label>
          <Input
            id={`start-${exercise.id}`}
            className="w-24"
            type="number"
            inputMode="decimal"
            value={weightValue}
            placeholder={needsWeight.suggested > 0 ? String(needsWeight.suggested) : "weight"}
            onChange={(e) => onWeight(e.target.value)}
          />
          <p className="text-sm text-muted-foreground">
            {needsWeight.suggested > 0
              ? `A starting point would be ${needsWeight.suggested} ${UNIT_CONFIG[unit].label} — the app will not assume it for you.`
              : "The catalog does not seed this lift, so it needs a number before the program can start."}
          </p>
        </div>
      )}

      {editable && (
        <SheetRow testId="editor-lift-swap" onClick={onSwap}>
          Swap this lift
        </SheetRow>
      )}

      {/*
        THE TWO MOVE ROWS ARE A DELIBERATE ADDITION to the step's list of
        sheet rows, which named Swap, Sets and reps, Starting weight and
        Remove. Dropping them would take away reordering the lifts inside a
        day — and the order IS the session: squats before the accessories, the
        press before the flies. The screen it replaced had it on every row, and
        the non-load case on this very screen still tells people to "reorder or
        drop the ones you do not want".
      */}
      <SheetRow testId="editor-lift-up" disabled={index <= 0} onClick={() => onMove(index, -1)}>
        Move up
      </SheetRow>
      <SheetRow
        testId="editor-lift-down"
        disabled={index < 0 || index >= count - 1}
        onClick={() => onMove(index, 1)}
      >
        Move down
      </SheetRow>

      <SheetRow testId="editor-lift-remove" destructive disabled={onlyLift} onClick={onRemove}>
        {onlyLift ? "The only lift — remove the day instead" : "Remove this lift"}
      </SheetRow>
    </BottomSheet>
  )
}

/**
 * A number that only commits when it is a number.
 *
 * Typing "1" on the way to "12" must not apply a 1-set prescription and then
 * fight the user for the cursor, and clearing the box to retype must not throw
 * the validation error at them mid-keystroke. So the box holds text, and only a
 * valid whole number on blur or Enter reaches the schedule.
 */
function NumberBox({
  label,
  value,
  onCommit,
}: {
  label: string
  value: number
  onCommit: (n: number) => void
}) {
  const [draft, setDraft] = useState<string | null>(null)
  const shown = draft ?? String(value)
  const id = `scheme-${label.replace(/\s+/g, "-").toLowerCase()}`

  function commit() {
    const n = Number(shown)
    setDraft(null)
    if (Number.isInteger(n) && n >= 1 && n !== value) onCommit(n)
  }

  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        className="w-20"
        type="number"
        inputMode="numeric"
        value={shown}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Enter") (e.target as HTMLInputElement).blur()
        }}
      />
    </div>
  )
}
