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
 */

import { useMemo, useState } from "react"
import { ArrowLeftRight, Check, ChevronDown, ChevronUp, Plus, X } from "lucide-react"
import { Action, IconButton, Panel, TYPE } from "./ui"
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
import {
  EXERCISE_LIBRARY,
  PATTERN_LABELS,
  PATTERN_ORDER,
  libraryByPattern,
  patternForName,
} from "../data/exerciseLibrary"
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
  /** Put the catalog program back. Hidden when nothing has been changed. */
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
  const [newDay, setNewDay] = useState("")
  const [error, setError] = useState<string | null>(null)

  if (!isCustomizable(program)) {
    return (
      <div className="rounded-lg border border-amber-400/20 bg-amber-500/[0.05] px-3 py-2.5">
        <p className="text-[12.5px] text-amber-200/90">{program.name} is a week-by-week plan.</p>
        <p className="text-[11px] text-zinc-400 mt-1 leading-relaxed">
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

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <p className={TYPE.label}>Your training week</p>
        {modified && <Action onClick={onReset}>Reset to {program.name}</Action>}
      </div>

      {error && (
        <p className="text-[11px] text-rose-300/90 bg-rose-500/[0.07] border border-rose-400/20 rounded-md px-2.5 py-1.5">
          {error}
        </p>
      )}

      <div className="space-y-1.5">
        {days.map((day, i) => {
          const open = openDay === day.id
          return (
            <Panel key={day.id}>
              <div className="flex items-center gap-2 px-2.5 py-2">
                <input
                  value={day.label}
                  onChange={(e) => apply(() => renameDay(schedule, day.id, e.target.value || day.label))}
                  aria-label={`Name of training day ${i + 1}`}
                  className="flex-1 min-w-0 bg-transparent text-[12.5px] font-medium text-zinc-100 border-b border-transparent hover:border-white/10 focus:border-white/30 focus:outline-none py-0.5"
                />
                <span className={`shrink-0 ${TYPE.meta}`}>
                  {day.exercises.length} {day.exercises.length === 1 ? "lift" : "lifts"}
                </span>
                <span className="flex shrink-0 items-center gap-1">
                  <IconButton
                    icon={ChevronUp}
                    label={`Move ${day.label} earlier`}
                    onClick={() => apply(() => moveDay(schedule, i, -1))}
                    disabled={i === 0}
                  />
                  <IconButton
                    icon={ChevronDown}
                    label={`Move ${day.label} later`}
                    onClick={() => apply(() => moveDay(schedule, i, 1))}
                    disabled={i === days.length - 1}
                  />
                  <IconButton
                    icon={X}
                    label={`Remove ${day.label}`}
                    onClick={() => apply(() => removeDay(schedule, day.id))}
                    disabled={days.length <= 1}
                    tone="danger"
                  />
                  <IconButton
                    icon={open ? ChevronUp : ChevronDown}
                    label={open ? `Collapse ${day.label}` : `Open ${day.label}`}
                    onClick={() => setOpenDay(open ? null : day.id)}
                  />
                </span>
              </div>

              {open && (
                <div className="border-t border-white/5 px-2.5 py-2 space-y-1">
                  {day.exercises.map((ex, exIndex) => (
                    <ExerciseRow
                      key={ex.id}
                      exercise={ex}
                      index={exIndex}
                      count={day.exercises.length}
                      editable={loadProgram}
                      unit={unit}
                      needsWeight={missing.find((m) => m.exerciseId === ex.id)}
                      weightValue={workingWeights[ex.id] ?? ""}
                      onWeight={(raw) => onWorkingWeight(ex.id, raw)}
                      onMove={(dir) => apply(() => moveExercise(schedule, day.id, exIndex, dir))}
                      onRemove={() => apply(() => removeExercise(schedule, day.id, ex.id))}
                      onSwap={(entry) => apply(() => swapExercise(schedule, day.id, ex.id, entry).schedule)}
                      onScheme={(patch) => apply(() => updateExerciseScheme(schedule, day.id, ex.id, patch))}
                    />
                  ))}

                  {loadProgram ? (
                    <AddExercise onAdd={(entry) => apply(() => addExercise(schedule, day.id, entry).schedule)} />
                  ) : (
                    <p className="text-[10px] text-zinc-600 pt-1 leading-relaxed">
                      This program progresses by unlocking harder variations, not by adding weight, so
                      its movements come as ladders rather than from the lift library. Reorder or drop
                      the ones you do not want.
                    </p>
                  )}
                </div>
              )}
            </Panel>
          )
        })}
      </div>

      <div className="flex items-center gap-1.5">
        <input
          value={newDay}
          onChange={(e) => setNewDay(e.target.value)}
          onKeyDown={(e) => {
            if (e.key !== "Enter" || !newDay.trim()) return
            apply(() => addDay(schedule, newDay))
            setNewDay("")
          }}
          placeholder="Add a day — Arms, Conditioning, Saturday…"
          aria-label="Name of a new training day"
          className="flex-1 min-w-0 bg-white/5 border border-white/10 rounded-md px-2.5 py-1.5 text-[12.5px] text-white placeholder:text-zinc-600 focus:outline-none focus:border-white/25"
        />
        <button
          onClick={() => {
            if (!newDay.trim()) return
            apply(() => addDay(schedule, newDay))
            setNewDay("")
          }}
          disabled={!newDay.trim()}
          className="flex items-center gap-1 text-[12.5px] px-2.5 py-1.5 rounded-md border border-white/10 text-zinc-300 hover:bg-white/5 disabled:opacity-30 transition-colors shrink-0"
        >
          <Plus className="size-3" /> day
        </button>
      </div>

      {missing.length > 0 && (
        <p className="text-[11px] text-amber-300/80 leading-relaxed">
          {missing.length === 1 ? "One lift needs" : `${missing.length} lifts need`} a starting weight
          before this can begin — open the day and fill it in. The suggestion beside each is a
          starting point, not a number the app will assume for you.
        </p>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------

function ExerciseRow({
  exercise,
  index,
  count,
  editable,
  unit,
  needsWeight,
  weightValue,
  onWeight,
  onMove,
  onRemove,
  onSwap,
  onScheme,
}: {
  exercise: AnyExercise
  index: number
  count: number
  editable: boolean
  unit: UnitSystem
  needsWeight?: { suggested: number }
  weightValue: string
  onWeight: (raw: string) => void
  onMove: (dir: -1 | 1) => void
  onRemove: () => void
  onSwap: (entry: LibraryExercise) => void
  onScheme: (patch: { sets?: number; reps?: number; repMin?: number; repMax?: number }) => void
}) {
  const [swapping, setSwapping] = useState(false)
  const isLoad = exercise.metricType === "load"
  const scheme = isLoad ? (exercise as LoadExercise).scheme : null
  const waved = scheme?.kind === "percentage_tm"

  return (
    <div className="rounded-md bg-white/[0.02] border border-white/5 px-2 py-1.5">
      <div className="flex items-center gap-1.5">
        <span className="flex-1 min-w-0 text-[12.5px] text-zinc-200 truncate">{exercise.name}</span>
        <span className="text-[11px] text-zinc-600 shrink-0">{prescriptionSummary(exercise)}</span>
        <span className="flex shrink-0 items-center gap-1">
          {editable && (
            <IconButton
              icon={ArrowLeftRight}
              label={swapping ? `Cancel swapping ${exercise.name}` : `Swap ${exercise.name}`}
              onClick={() => setSwapping((v) => !v)}
            />
          )}
          <IconButton
            icon={ChevronUp}
            label={`Move ${exercise.name} up`}
            onClick={() => onMove(-1)}
            disabled={index === 0}
          />
          <IconButton
            icon={ChevronDown}
            label={`Move ${exercise.name} down`}
            onClick={() => onMove(1)}
            disabled={index === count - 1}
          />
          <IconButton
            icon={X}
            label={`Remove ${exercise.name}`}
            onClick={onRemove}
            disabled={count <= 1}
            tone="danger"
          />
        </span>
      </div>

      {/* Sets and reps, where the program allows them to move. */}
      {isLoad && !waved && scheme && (
        <div className="flex flex-wrap items-center gap-2 mt-1.5">
          <NumberBox
            label="sets"
            value={scheme.kind === "linear" ? scheme.sets : scheme.sets}
            onCommit={(n) => onScheme({ sets: n })}
          />
          {scheme.kind === "linear" ? (
            <NumberBox label="reps" value={scheme.reps} onCommit={(n) => onScheme({ reps: n })} />
          ) : (
            <>
              <NumberBox label="reps from" value={scheme.repMin} onCommit={(n) => onScheme({ repMin: n })} />
              <NumberBox label="to" value={scheme.repMax} onCommit={(n) => onScheme({ repMax: n })} />
            </>
          )}
        </div>
      )}

      {waved && (
        <p className="text-[10px] text-zinc-600 mt-1 leading-relaxed">
          Sets fixed — this lift runs the program&apos;s percentage wave, which is the part of 5/3/1
          that makes it 5/3/1. Swap it for another lift if you want something else here.
        </p>
      )}

      {/* A lift the catalog never seeded has to be given a starting weight. */}
      {needsWeight && (
        <label className="flex items-center gap-2 mt-1.5">
          <span className="text-[11px] text-amber-300/80">start at</span>
          <input
            type="number"
            inputMode="decimal"
            value={weightValue}
            onChange={(e) => onWeight(e.target.value)}
            placeholder={needsWeight.suggested > 0 ? String(needsWeight.suggested) : "weight"}
            aria-label={`Starting weight for ${exercise.name} in ${unit}`}
            className="w-20 bg-white/5 border border-amber-400/25 rounded px-1.5 py-0.5 text-[12.5px] text-white focus:outline-none focus:border-amber-400/50"
          />
          <span className="text-[11px] text-zinc-500">{UNIT_CONFIG[unit].label}</span>
          {needsWeight.suggested > 0 && !weightValue && (
            <button
              onClick={() => onWeight(String(needsWeight.suggested))}
              className="text-[10px] text-zinc-500 hover:text-zinc-200 transition-colors"
            >
              use {needsWeight.suggested}
            </button>
          )}
        </label>
      )}

      {swapping && (
        <SwapPicker
          currentName={exercise.name}
          onPick={(entry) => {
            setSwapping(false)
            onSwap(entry)
          }}
        />
      )}
    </div>
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

  function commit() {
    const n = Number(shown)
    setDraft(null)
    if (Number.isInteger(n) && n >= 1 && n !== value) onCommit(n)
  }

  return (
    <label className="flex items-center gap-1">
      <span className="text-[10px] text-zinc-600">{label}</span>
      <input
        type="number"
        inputMode="numeric"
        value={shown}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Enter") (e.target as HTMLInputElement).blur()
        }}
        aria-label={label}
        className="w-12 bg-white/5 border border-white/10 rounded px-1.5 py-0.5 text-[12.5px] text-white focus:outline-none focus:border-white/30"
      />
    </label>
  )
}

/**
 * What else could go in this slot.
 *
 * The lifts that do the same job come first, because that is the swap somebody
 * actually wants — a bench that hurts becomes a dumbbell press, not a calf
 * raise. The rest of the library is underneath rather than hidden, since the
 * pattern match is a good guess and not a rule.
 */
function SwapPicker({
  currentName,
  onPick,
}: {
  currentName: string
  onPick: (entry: LibraryExercise) => void
}) {
  const pattern = patternForName(currentName)
  const [showAll, setShowAll] = useState(pattern === null)

  const alike = useMemo(
    () =>
      pattern
        ? libraryByPattern(pattern).filter((e) => e.name.toLowerCase() !== currentName.toLowerCase())
        : [],
    [pattern, currentName]
  )

  return (
    <div className="mt-1.5 rounded-md border border-white/10 bg-black/20 p-2">
      {alike.length > 0 && (
        <>
          <p className="text-[10px] uppercase tracking-[0.12em] text-zinc-600 mb-1">
            Same job as {currentName}
          </p>
          <div className="flex flex-wrap gap-1">
            {alike.map((e) => (
              <SwapChip key={e.id} entry={e} onPick={onPick} />
            ))}
          </div>
        </>
      )}

      {!showAll ? (
        <button
          onClick={() => setShowAll(true)}
          className="text-[10px] text-zinc-500 hover:text-zinc-200 transition-colors mt-1.5"
        >
          something else entirely
        </button>
      ) : (
        <div className="mt-2 space-y-1.5 max-h-56 overflow-y-auto">
          {PATTERN_ORDER.map((p) => {
            const list = libraryByPattern(p)
            if (list.length === 0) return null
            return (
              <div key={p}>
                <p className="text-[10px] uppercase tracking-[0.12em] text-zinc-600">
                  {PATTERN_LABELS[p]}
                </p>
                <div className="flex flex-wrap gap-1 mt-0.5">
                  {list.map((e) => (
                    <SwapChip key={e.id} entry={e} onPick={onPick} />
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

function SwapChip({ entry, onPick }: { entry: LibraryExercise; onPick: (e: LibraryExercise) => void }) {
  return (
    <button
      onClick={() => onPick(entry)}
      className="text-[11px] px-2 py-0.5 rounded border border-white/10 text-zinc-300 hover:bg-white/10 hover:text-white transition-colors"
    >
      {entry.name}
    </button>
  )
}

/** Add a lift to a day, from the same pool the swap picker uses. */
function AddExercise({ onAdd }: { onAdd: (entry: LibraryExercise) => void }) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState("")

  const results = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return null
    return EXERCISE_LIBRARY.filter((e) => e.name.toLowerCase().includes(q)).slice(0, 12)
  }, [query])

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-1 text-[11px] text-zinc-500 hover:text-zinc-200 transition-colors pt-1"
      >
        <Plus className="size-3" /> add a lift
      </button>
    )
  }

  return (
    <div className="mt-1 rounded-md border border-white/10 bg-black/20 p-2">
      <div className="flex items-center gap-1.5 mb-1.5">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search lifts…"
          aria-label="Search the lift library"
          autoFocus
          className="flex-1 min-w-0 bg-white/5 border border-white/10 rounded px-2 py-1 text-[12.5px] text-white placeholder:text-zinc-600 focus:outline-none focus:border-white/25"
        />
        <button
          onClick={() => {
            setOpen(false)
            setQuery("")
          }}
          aria-label="Close the lift library"
          className="p-0.5 text-zinc-600 hover:text-zinc-200 transition-colors"
        >
          <X className="size-3.5" />
        </button>
      </div>

      <div className="max-h-56 overflow-y-auto space-y-1.5">
        {results ? (
          results.length > 0 ? (
            <div className="flex flex-wrap gap-1">
              {results.map((e) => (
                <SwapChip key={e.id} entry={e} onPick={onAdd} />
              ))}
            </div>
          ) : (
            <p className="text-[11px] text-zinc-500">
              Nothing called that. The library covers the barbell, dumbbell, cable and machine lifts
              the programs are built from — browse by pattern instead.
            </p>
          )
        ) : (
          PATTERN_ORDER.map((p) => {
            const list = libraryByPattern(p)
            if (list.length === 0) return null
            return (
              <div key={p}>
                <p className="text-[10px] uppercase tracking-[0.12em] text-zinc-600">
                  {PATTERN_LABELS[p]}
                </p>
                <div className="flex flex-wrap gap-1 mt-0.5">
                  {list.map((e) => (
                    <SwapChip key={e.id} entry={e} onPick={onAdd} />
                  ))}
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}

/** Shown after a program is running, so the tab can confirm without re-rendering the editor. */
export function ProgramEditedBadge({ modified }: { modified: boolean }) {
  if (!modified) return null
  return (
    <span className="inline-flex items-center gap-1 text-[10px] text-emerald-300/80">
      <Check className="size-3" /> your version
    </span>
  )
}
