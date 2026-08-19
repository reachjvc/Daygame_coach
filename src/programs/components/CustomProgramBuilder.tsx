"use client"

/**
 * Design your own training week, from an empty page.
 *
 * The program editor next door starts from a cited program and changes it. This
 * starts from nothing, and the difference is what has to be decided rather than
 * inherited: how each lift is prescribed, whether it progresses and how,
 * whether it is paired with the one under it.
 *
 * WHAT IT REUSES. Days and lifts are added, moved and removed by the same
 * `customize.ts` operations the program editor uses, and lifts come from the
 * same `exerciseLibrary`. Only the choices unique to authoring — scheme kind,
 * progression rule, weight step, supersets, notes — live in `builder.ts`.
 * Building a second, parallel day/exercise editor would have meant two sets of
 * rules about empty days and colliding ids.
 *
 * ORDER IS THE PRIORITY. There is no separate "importance" field, because one
 * with no effect on what gets prescribed would be decoration. The order you put
 * lifts in IS the order the session gives them to you, and the first lift in a
 * day is the one you are freshest for — so the up/down controls are the
 * prioritising, and the first lift is marked as the day's main lift.
 *
 * Saved to localStorage as you go, like the rest of this page. Starting it
 * creates a real enrollment against the `custom` shell program, which is what
 * makes it trackable by the same engine as everything else.
 */

import { useMemo, useState } from "react"
import { Check, ChevronDown, ChevronUp, Loader2, Plus, Settings2, X } from "lucide-react"
import { Action, Field, GroupLabel, IconButton, Panel, Segmented, Stepper, TYPE } from "./ui"
import {
  addDay,
  addExercise,
  moveDay,
  moveExercise,
  removeDay,
  removeExercise,
  renameDay,
  scheduleDays,
  updateExerciseScheme,
} from "../customize"
import {
  PROGRESSION_CHOICES,
  designProblems,
  emptyCustomSchedule,
  hasWeight,
  numericWeights,
  joinWithNext,
  setIncrement,
  setNote,
  setProgression,
  setSchemeKind,
  setDropSets,
  supersetLabel,
  unjoin,
} from "../builder"
import {
  PATTERN_LABELS,
  PATTERN_ORDER,
  customLibraryEntry,
  libraryByPattern,
  searchLibrary,
} from "../data/exerciseLibrary"
import { CUSTOM_PROGRAM_ID } from "../data/customProgram"
import {
  PROGRAM_TEXT_PLACEHOLDER,
  carryAuthoredSettings,
  formatProgramText,
  parseProgramText,
} from "../programText"
import { UNIT_CONFIG } from "../config"
import type { LibraryExercise, LoadExercise, MovementPattern, ProgramSchedule, UnitSystem } from "../types"

export const BUILDER_STORAGE_KEY = "custom-program-v1"

export const WRITE_COPY = {
  title: "Write your week",
  help: "One lift per line, the way you would write it down. A blank line starts a new day, and the first line of each block is the day's name.",
  legend: "3x8 is sets by reps · 3x8-12 is a rep range · @60 is your starting weight · @bw is bodyweight · a line starting with + is supersetted with the one above · +2 drops at the end of a line is a drop set",
  apply: "Use this",
  applied: "Applied.",
  unreadable: (n: number) => `${n} ${n === 1 ? "line" : "lines"} could not be read — nothing is dropped, but they are not in your program:`,
  tweak: "Everything below is the same program. Use it to set how each lift progresses, or anything else the writing does not cover.",
}

export const CUSTOM_COPY = {
  empty: "Nothing here yet. Add your first training day — call it whatever you call it.",
  orderNote: "The order is the session. Move the lifts you care most about to the top of the day, where you are freshest.",
}

interface Props {
  schedule: ProgramSchedule
  onChange: (schedule: ProgramSchedule) => void
  unit: UnitSystem
  onUnit: (unit: UnitSystem) => void
  weights: Record<string, string>
  onWeight: (exerciseId: string, raw: string) => void
  /** Replace every weight at once — what applying written text does. */
  onWeights: (weights: Record<string, string>) => void
  /** Day names go into the plan's workout routine once it is started. */
  onStarted: (dayNames: string[]) => void
}

export function CustomProgramBuilder({
  schedule,
  onChange,
  unit,
  onUnit,
  weights,
  onWeight,
  onWeights,
  onStarted,
}: Props) {
  const [newDay, setNewDay] = useState("")
  /**
   * The written form, while it is being edited.
   *
   * `null` means "follow the design" — the box is regenerated from the schedule,
   * so reordering a day with the arrows below is reflected up here instead of
   * leaving two versions of the truth on one screen. It becomes a string only
   * while the user is typing, and goes back to null once applied.
   */
  const [draft, setDraft] = useState<string | null>(null)
  const [applied, setApplied] = useState(false)
  /** The written form is a drawer, shut by default — clicking is the way in. */
  const [writing, setWriting] = useState(false)
  const [openDay, setOpenDay] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [state, setState] = useState<"idle" | "saving" | "done">("idle")

  const fromDesign = formatProgramText(schedule, weights)
  const written = draft ?? fromDesign
  const parsed = useMemo(() => parseProgramText(written), [written])
  const dirty = draft !== null && draft !== fromDesign

  function applyWritten() {
    // Carried rather than replaced, so progression rules and notes set below —
    // which have no written form — survive a re-apply of the text.
    onChange(carryAuthoredSettings(schedule, parsed.schedule))
    onWeights(parsed.weights)
    setDraft(null)
    setApplied(true)
  }

  const days = scheduleDays(schedule)
  const problems = designProblems(schedule)
  const allLifts = days.flatMap((d) => d.exercises as LoadExercise[])
  const missingWeights = allLifts.filter((e) => !hasWeight(weights, e.id))
  const canStart = problems.length === 0 && missingWeights.length === 0 && state !== "saving"

  function apply(fn: () => ProgramSchedule) {
    try {
      setError(null)
      onChange(fn())
    } catch (e) {
      setError((e as Error).message)
    }
  }

  function add() {
    if (!newDay.trim()) return
    apply(() => addDay(schedule, newDay))
    setNewDay("")
  }

  async function start() {
    setState("saving")
    setError(null)
    try {
      const res = await fetch("/api/programs/enrollments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          programId: CUSTOM_PROGRAM_ID,
          level: "intermediate",
          unitSystem: unit,
          workingWeights: numericWeights(weights),
          customSchedule: schedule,
        }),
      })
      if (res.status === 401) {
        setError("Sign in to start your program — the design here is kept until you do.")
        setState("idle")
        return
      }
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { error?: string } | null
        setError(body?.error ?? "Could not start your program.")
        setState("idle")
        return
      }
      onStarted(days.map((d) => d.label))
      setState("done")
    } catch {
      setError("Could not reach the server. Nothing was started.")
      setState("idle")
    }
  }

  return (
    <div className="space-y-3">
      {/* CLICKING IS THE WAY IN. Writing the week out in `3x8 @60` shorthand is
          faster once you know it and is nobody's first choice — it is syntax,
          and asking somebody to learn syntax to add a bench press is the same
          mistake as making them search for one. So the days and the palette are
          the page, and the written form is a drawer for people who want to
          paste a program in. */}
      <div className="flex flex-wrap items-center justify-between gap-2.5">
        <div className="flex flex-wrap items-center gap-2.5">
          <Segmented
            label="Weight unit"
            value={unit}
            onChange={(u) => onUnit(u)}
            options={[
              { value: "kg" as UnitSystem, label: "kg" },
              { value: "lb" as UnitSystem, label: "lb" },
            ]}
            size="sm"
          />
          <span className={TYPE.meta}>
            {days.length} {days.length === 1 ? "day" : "days"} · {allLifts.length}{" "}
            {allLifts.length === 1 ? "lift" : "lifts"}
          </span>
        </div>
        <Action onClick={() => setWriting((v) => !v)}>
          {writing ? "Hide the written version" : "Paste or write it instead"}
        </Action>
      </div>

      {writing && (
        <div className="rounded-md border border-white/10 bg-black/20 p-3">
          <h3 className={TYPE.title}>{WRITE_COPY.title}</h3>
          <p className={`mt-1 ${TYPE.hint}`}>{WRITE_COPY.help}</p>
          <textarea
            value={written}
            onChange={(e) => {
              setDraft(e.target.value)
              setApplied(false)
            }}
            spellCheck={false}
            rows={Math.min(24, Math.max(8, written.split("\n").length + 2))}
            placeholder={PROGRAM_TEXT_PLACEHOLDER}
            aria-label="Write your training week"
            className="mt-2 w-full rounded-md border border-white/12 bg-black/30 px-3 py-2.5 font-mono text-[12.5px] leading-relaxed text-zinc-100 placeholder:text-zinc-700 transition-colors focus:border-sky-400/50 focus:outline-none"
          />
          <p className={`mt-1.5 ${TYPE.hint}`}>{WRITE_COPY.legend}</p>

          {parsed.problems.length > 0 && (
            <div className="mt-2 rounded-md border border-amber-400/25 bg-amber-500/[0.06] px-3 py-2">
              <p className="text-[11px] text-amber-200/90">
                {WRITE_COPY.unreadable(parsed.problems.length)}
              </p>
              <ul className="mt-1.5 space-y-1">
                {parsed.problems.map((p) => (
                  <li key={p.line} className="text-[11px] text-amber-100/70">
                    <span className="tabular-nums text-amber-300/80">Line {p.line}</span> — {p.reason}
                    <span className="text-zinc-500"> ({p.text})</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="mt-2 flex flex-wrap items-center gap-2">
            <Action onClick={applyWritten} disabled={!dirty} variant="primary">
              {WRITE_COPY.apply}
            </Action>
            {dirty ? (
              <span className={TYPE.meta}>
                {parsed.schedule.kind !== "endurance_weeks" ? parsed.schedule.days.length : 0} days ·{" "}
                {parsed.schedule.kind !== "endurance_weeks"
                  ? parsed.schedule.days.reduce((n, d) => n + d.exercises.length, 0)
                  : 0}{" "}
                lifts
              </span>
            ) : applied ? (
              <span className="inline-flex items-center gap-1 text-[11px] text-sky-300/80">
                <Check className="size-3" /> {WRITE_COPY.applied}
              </span>
            ) : null}
          </div>
        </div>
      )}

      {error && (
        <p className="rounded-md border border-rose-400/25 bg-rose-500/[0.07] px-3 py-2 text-[11px] text-rose-300/90">
          {error}
        </p>
      )}

      {days.length === 0 ? (
        <p className={`py-2 ${TYPE.hint}`}>{CUSTOM_COPY.empty}</p>
      ) : (
        <>
          <p className={TYPE.hint}>{CUSTOM_COPY.orderNote}</p>
          <div className="space-y-1.5">
            {days.map((day, i) => (
              <DayCard
                key={day.id}
                day={day as { id: string; label: string; exercises: LoadExercise[] }}
                index={i}
                dayCount={days.length}
                open={openDay === day.id}
                onToggle={() => setOpenDay(openDay === day.id ? null : day.id)}
                unit={unit}
                weights={weights}
                onWeight={onWeight}
                apply={apply}
                schedule={schedule}
              />
            ))}
          </div>
        </>
      )}

      <div className="flex items-center gap-2">
        <input
          value={newDay}
          onChange={(e) => setNewDay(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && add()}
          placeholder={days.length === 0 ? "Your first day — Push, Legs, Monday…" : "Add another day"}
          aria-label="Name of a new training day"
          className="min-w-0 flex-1 rounded-md border border-white/12 bg-black/25 px-2.5 py-1.5 text-[12.5px] text-zinc-100 placeholder:text-zinc-600 transition-colors focus:border-sky-400/50 focus:outline-none"
        />
        <Action onClick={add} disabled={!newDay.trim()}>
          Add day
        </Action>
      </div>

      {days.length > 0 && (
        <div className="border-t border-white/10 pt-3 space-y-2">
          {state === "done" ? (
            <p className="flex items-center gap-1.5 text-[12.5px] text-sky-300/90">
              <Check className="size-3.5" /> Your program is running. Your first session is waiting, and
              your training week now says what you actually do.
            </p>
          ) : (
            <div className="flex flex-wrap items-center gap-2.5">
              <Action onClick={start} disabled={!canStart} variant="primary">
                <span className="inline-flex items-center gap-1.5">
                  {state === "saving" && <Loader2 className="size-3 animate-spin" />}
                  Start tracking this
                </span>
              </Action>
              {problems.length > 0 ? (
                <span className="text-[11px] text-amber-300/80">{problems[0]}</span>
              ) : missingWeights.length > 0 ? (
                <span className="text-[11px] text-amber-300/80">
                  {missingWeights.length === 1
                    ? `${missingWeights[0].name} needs a starting weight.`
                    : `${missingWeights.length} lifts still need a starting weight.`}
                </span>
              ) : null}
            </div>
          )}
          <p className={TYPE.hint}>
            Starting saves it to your account, so you will need to be signed in. Nothing here is
            guessed for you — every lift needs a starting weight, because there is no cited program to
            take one from.
          </p>
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------

function DayCard({
  day,
  index,
  dayCount,
  open,
  onToggle,
  unit,
  weights,
  onWeight,
  apply,
  schedule,
}: {
  day: { id: string; label: string; exercises: LoadExercise[] }
  index: number
  dayCount: number
  open: boolean
  onToggle: () => void
  unit: UnitSystem
  weights: Record<string, string>
  onWeight: (id: string, raw: string) => void
  apply: (fn: () => ProgramSchedule) => void
  schedule: ProgramSchedule
}) {
  return (
    <Panel>
      {/* The day's number carries the order, so moving one is visible rather
          than inferred from where the card ended up. */}
      <div className="flex items-center gap-2 px-2.5 py-2">
        <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-white/[0.07] text-[10px] tabular-nums text-zinc-400">
          {index + 1}
        </span>
        <input
          value={day.label}
          onChange={(e) => apply(() => renameDay(schedule, day.id, e.target.value || day.label))}
          aria-label={`Name of training day ${index + 1}`}
          className="min-w-0 flex-1 border-b border-transparent bg-transparent py-0.5 text-[12.5px] font-medium text-zinc-100 transition-colors hover:border-white/10 focus:border-sky-400/50 focus:outline-none"
        />
        <span className={`shrink-0 ${TYPE.meta}`}>
          {day.exercises.length} {day.exercises.length === 1 ? "lift" : "lifts"}
        </span>
        {/* Grouped, and all the same shape. They used to be three bare icons
            and the word "edit", which is four different kinds of control in
            one row. */}
        <span className="flex shrink-0 items-center gap-1">
          <IconButton
            icon={ChevronUp}
            label={`Move ${day.label} earlier`}
            onClick={() => apply(() => moveDay(schedule, index, -1))}
            disabled={index === 0}
          />
          <IconButton
            icon={ChevronDown}
            label={`Move ${day.label} later`}
            onClick={() => apply(() => moveDay(schedule, index, 1))}
            disabled={index === dayCount - 1}
          />
          <IconButton
            icon={X}
            label={`Remove ${day.label}`}
            onClick={() => apply(() => removeDay(schedule, day.id))}
            disabled={dayCount <= 1}
            tone="danger"
          />
          <IconButton
            icon={open ? ChevronUp : ChevronDown}
            label={open ? `Collapse ${day.label}` : `Open ${day.label}`}
            onClick={onToggle}
          />
        </span>
      </div>

      {open && (
        <div className="space-y-1.5 border-t border-white/8 px-2.5 py-2.5">
          {day.exercises.length === 0 && (
            <p className={`py-1 ${TYPE.hint}`}>
              Empty. Add the first lift and it becomes this day&apos;s main one.
            </p>
          )}
          {day.exercises.map((ex, i) => (
            <LiftRow
              key={ex.id}
              exercise={ex}
              index={i}
              exercises={day.exercises}
              dayId={day.id}
              unit={unit}
              weight={weights[ex.id] ?? ""}
              onWeight={(raw) => onWeight(ex.id, raw)}
              apply={apply}
              schedule={schedule}
            />
          ))}
          <ExercisePalette
            onAdd={(entry: LibraryExercise) =>
              apply(() => addExercise(schedule, day.id, entry).schedule)
            }
            alreadyIn={new Set(day.exercises.map((e) => e.name.toLowerCase()))}
          />
        </div>
      )}
    </Panel>
  )
}

// ---------------------------------------------------------------------------

function LiftRow({
  exercise,
  index,
  exercises,
  dayId,
  unit,
  weight,
  onWeight,
  apply,
  schedule,
}: {
  exercise: LoadExercise
  index: number
  exercises: LoadExercise[]
  dayId: string
  unit: UnitSystem
  weight: string
  onWeight: (raw: string) => void
  apply: (fn: () => ProgramSchedule) => void
  schedule: ProgramSchedule
}) {
  const [open, setOpen] = useState(false)
  const label = supersetLabel(exercises, index)
  const scheme = exercise.scheme
  const waved = scheme.kind === "percentage_tm"
  const canPair = index < exercises.length - 1
  const increment =
    "incrementKg" in exercise.progression
      ? unit === "kg"
        ? exercise.progression.incrementKg
        : exercise.progression.incrementLb
      : null

  return (
    <div
      className={`rounded-md border px-2.5 py-2 ${
        label ? "border-sky-400/25 bg-sky-500/[0.05]" : "border-white/8 bg-white/[0.02]"
      }`}
    >
      <div className="flex items-center gap-2">
        {label && (
          <span className="shrink-0 rounded bg-sky-500/20 px-1.5 py-0.5 text-[10px] font-semibold tabular-nums text-sky-200">
            {label}
          </span>
        )}
        <span className="min-w-0 flex-1 truncate text-[12.5px] text-zinc-100">{exercise.name}</span>
        {index === 0 && <span className={`shrink-0 ${TYPE.label}`}>Main</span>}
        <span className="flex shrink-0 items-center gap-1">
          <IconButton
            icon={Settings2}
            label={open ? `Hide settings for ${exercise.name}` : `Settings for ${exercise.name}`}
            onClick={() => setOpen((v) => !v)}
          />
          <IconButton
            icon={ChevronUp}
            label={`Move ${exercise.name} up`}
            onClick={() => apply(() => moveExercise(schedule, dayId, index, -1))}
            disabled={index === 0}
          />
          <IconButton
            icon={ChevronDown}
            label={`Move ${exercise.name} down`}
            onClick={() => apply(() => moveExercise(schedule, dayId, index, 1))}
            disabled={index === exercises.length - 1}
          />
          <IconButton
            icon={X}
            label={`Remove ${exercise.name}`}
            onClick={() => apply(() => removeExercise(schedule, dayId, exercise.id))}
            disabled={exercises.length <= 1}
            tone="danger"
          />
        </span>
      </div>

      {/* THE PRESCRIPTION, AS FIELDS. This was an inline run of words and boxes
          — "sets 3 reps 8 start at 60 kg" — which reads as a broken sentence
          rather than a form, and said the unit again after every number. */}
      <div className="mt-2 flex flex-wrap items-end gap-2.5">
        {!waved && (
          <>
            <Stepper
              label="Sets"
              value={scheme.sets}
              max={20}
              ariaLabel={`sets for ${exercise.name}`}
              onChange={(n) => apply(() => updateExerciseScheme(schedule, dayId, exercise.id, { sets: n }))}
            />
            {scheme.kind === "linear" ? (
              <Stepper
                label="Reps"
                value={scheme.reps}
                ariaLabel={`reps for ${exercise.name}`}
                onChange={(n) => apply(() => updateExerciseScheme(schedule, dayId, exercise.id, { reps: n }))}
              />
            ) : (
              <>
                <Stepper
                  label="Reps from"
                  value={scheme.repMin}
                  ariaLabel={`bottom of the rep range for ${exercise.name}`}
                  onChange={(n) => apply(() => updateExerciseScheme(schedule, dayId, exercise.id, { repMin: n }))}
                />
                <Stepper
                  label="to"
                  value={scheme.repMax}
                  ariaLabel={`top of the rep range for ${exercise.name}`}
                  onChange={(n) => apply(() => updateExerciseScheme(schedule, dayId, exercise.id, { repMax: n }))}
                />
              </>
            )}
          </>
        )}
        <Field
          label="Start at"
          value={weight}
          onChange={onWeight}
          suffix={UNIT_CONFIG[unit].label}
          width="w-20"
          inputMode="decimal"
          invalid={!(weight.trim() !== "" && Number(weight) >= 0)}
          ariaLabel={`Starting weight for ${exercise.name} in ${unit}`}
        />
      </div>

      {open && (
        <div className="mt-2.5 space-y-3 border-t border-white/8 pt-2.5">
          {/* Three settings, three identical segmented controls. They were
              three differently-shaped rows of loose chips, which made one
              screen look like it had been assembled by three people. */}
          {!waved && (
            <div className="flex flex-col gap-1">
              <GroupLabel>Prescribed as</GroupLabel>
              <Segmented
                label={`How ${exercise.name} is prescribed`}
                value={scheme.kind}
                size="sm"
                onChange={(kind) => apply(() => setSchemeKind(schedule, dayId, exercise.id, kind))}
                options={[
                  { value: "linear" as const, label: "Straight sets", hint: "The same reps every set — 5×5." },
                  { value: "rep_range" as const, label: "Rep range", hint: "A window to work inside — 3×8–12." },
                ]}
              />
            </div>
          )}

          <div className="flex flex-col gap-1">
            <GroupLabel>Progression</GroupLabel>
            <Segmented
              label={`How ${exercise.name} progresses`}
              value={exercise.progression.kind}
              size="sm"
              onChange={(kind) => apply(() => setProgression(schedule, dayId, exercise.id, kind))}
              options={PROGRESSION_CHOICES.map((c) => ({ value: c.id, label: c.label, hint: c.hint }))}
            />
            <p className={TYPE.hint}>
              {PROGRESSION_CHOICES.find((c) => c.id === exercise.progression.kind)?.hint}
            </p>
            {increment !== null && (
              <div className="mt-0.5">
                <IncrementField
                  increment={increment}
                  unit={unit}
                  name={exercise.name}
                  onCommit={(n) => apply(() => setIncrement(schedule, dayId, exercise.id, n, unit))}
                />
              </div>
            )}
          </div>

          {/* THE TWO MODIFIERS, and neither changes what the lift is
              prescribed as. A superset says what it is done WITH; a drop set
              says what happens after the last one. Sets, reps and progression
              are untouched by both, and the engine reads neither — which is
              what keeps a drop set from looking to it like the working weight
              collapsed. */}
          <div className="flex flex-col gap-1">
            <GroupLabel>Drop sets</GroupLabel>
            <div className="flex flex-wrap items-center gap-2">
              <Segmented
                label={`Drop sets on ${exercise.name}`}
                value={String(exercise.dropSets ?? 0)}
                size="sm"
                onChange={(v) => apply(() => setDropSets(schedule, dayId, exercise.id, Number(v)))}
                options={[
                  { value: "0", label: "None", hint: "The last set is the last set." },
                  { value: "1", label: "+1", hint: "Strip the weight once after the last set and go again." },
                  { value: "2", label: "+2", hint: "Two strips after the last set, each to failure." },
                  { value: "3", label: "+3", hint: "Three strips after the last set, each to failure." },
                ]}
              />
              <span className={TYPE.meta}>
                {exercise.dropSets
                  ? "Extra work off the last set. Not counted as sets, and it will not move your weights."
                  : "Strip the weight at the end of the last set and keep going."}
              </span>
            </div>
          </div>

          <div className="flex flex-col gap-1">
            <GroupLabel>Superset</GroupLabel>
            {exercise.supersetGroup ? (
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[11px] text-sky-200">Paired as {label}</span>
                <Action onClick={() => apply(() => unjoin(schedule, dayId, exercise.id))}>Unpair</Action>
              </div>
            ) : (
              <div className="flex flex-wrap items-center gap-2">
                <Action
                  onClick={() => apply(() => joinWithNext(schedule, dayId, index))}
                  disabled={!canPair}
                >
                  Pair with the lift below
                </Action>
                {!canPair && <span className={TYPE.meta}>Nothing under this one to pair with.</span>}
              </div>
            )}
          </div>

          <label className="flex flex-col gap-1">
            <span className={TYPE.label}>Note</span>
            <input
              defaultValue={exercise.note ?? ""}
              onBlur={(e) => apply(() => setNote(schedule, dayId, exercise.id, e.target.value))}
              placeholder="Tempo, cues, left side first…"
              aria-label={`Note for ${exercise.name}`}
              className="w-full rounded-md border border-white/12 bg-black/25 px-2.5 py-1.5 text-[12.5px] text-zinc-100 placeholder:text-zinc-600 transition-colors focus:border-sky-400/50 focus:outline-none"
            />
          </label>
        </div>
      )}

      {!open && exercise.note && (
        <p className={`mt-1.5 italic ${TYPE.hint}`}>{exercise.note}</p>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------

/** The weight step, in the user's own unit. Same shape as every other field. */
function IncrementField({
  increment,
  unit,
  name,
  onCommit,
}: {
  increment: number
  unit: UnitSystem
  name: string
  onCommit: (n: number) => void
}) {
  const [draft, setDraft] = useState<string | null>(null)
  const shown = draft ?? String(increment)
  return (
    <Field
      label="Goes up by"
      value={shown}
      width="w-20"
      inputMode="decimal"
      suffix={UNIT_CONFIG[unit].label}
      ariaLabel={`Weight step for ${name}`}
      onChange={setDraft}
      onBlur={() => {
        const n = Number(shown)
        setDraft(null)
        if (Number.isFinite(n) && n > 0 && n !== increment) onCommit(n)
      }}
    />
  )
}

/**
 * The lift palette. Always open, one click adds.
 *
 * WHY IT IS NOT A SEARCH BOX. It was: "add a lift" opened a field you typed
 * into and then clicked a result in — three actions per lift, per day, and a
 * blank box that told you nothing about what was there. Building a five-day
 * week that way is punishment, and the fix is not a faster search, it is not
 * making you search at all. The lifts are on screen, grouped by the body part
 * you would look under, and adding one is a single click that leaves the
 * palette exactly where it was — so the next lift is also a single click.
 *
 * The filter is still here and still uses `searchLibrary`, which is
 * hyphen-insensitive and ranks prefix matches first ("pull up" finds Pull-up).
 * It narrows what is shown. It is never the way in.
 *
 * And a lift the pool has never heard of can still be typed, because no pool is
 * ever complete — `customLibraryEntry` shapes it and it goes straight into this
 * day without polluting everybody else's library.
 */
function ExercisePalette({
  onAdd,
  alreadyIn,
}: {
  onAdd: (entry: LibraryExercise) => void
  /** Names already in this day, so the palette shows what you have taken. */
  alreadyIn: Set<string>
}) {
  const [group, setGroup] = useState<MovementPattern>(PATTERN_ORDER[0])
  const [filter, setFilter] = useState("")

  const query = filter.trim()
  const shown = query ? searchLibrary(query) : libraryByPattern(group)
  // Offered only when the filter genuinely matches nothing in the pool.
  const custom = query && shown.length === 0 ? customLibraryEntry(query, group) : null

  return (
    <div className="mt-1.5 rounded-md border border-white/10 bg-black/25 p-2.5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <GroupLabel>Add a lift — one tap</GroupLabel>
        <input
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          placeholder="Or search…"
          aria-label="Search the lift list"
          className="w-32 rounded-md border border-white/12 bg-black/30 px-2 py-1 text-[11px] text-zinc-100 placeholder:text-zinc-600 transition-colors focus:border-sky-400/50 focus:outline-none"
        />
      </div>

      {/* Body-part tabs, hidden while searching because a search crosses them. */}
      {!query && (
        <div className="mt-2 flex flex-wrap gap-1">
          {PATTERN_ORDER.map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => setGroup(p)}
              aria-pressed={group === p}
              className={`rounded-md px-2 py-1 text-[11px] transition-colors ${
                group === p
                  ? "bg-sky-500/20 text-sky-100"
                  : "text-zinc-400 hover:bg-white/[0.07] hover:text-zinc-200"
              }`}
            >
              {PATTERN_LABELS[p]}
            </button>
          ))}
        </div>
      )}

      <div className="mt-2 flex flex-wrap gap-1.5">
        {shown.map((entry) => (
          <LiftChip
            key={entry.id}
            entry={entry}
            already={alreadyIn.has(entry.name.toLowerCase())}
            onAdd={onAdd}
          />
        ))}

        {custom && (
          <button
            type="button"
            onClick={() => {
              onAdd(custom)
              setFilter("")
            }}
            className="inline-flex items-center gap-1 rounded-md border border-dashed border-sky-400/40 px-2.5 py-1.5 text-[12px] text-sky-200 transition-colors hover:bg-sky-500/10"
          >
            <Plus className="size-3 shrink-0" />
            Add “{custom.name}” as your own
          </button>
        )}

        {!custom && shown.length === 0 && (
          <p className={TYPE.hint}>Nothing called that — clear the search to browse.</p>
        )}
      </div>
    </div>
  )
}

/**
 * One lift, one tap.
 *
 * A lift already in the day is marked rather than disabled: doing the same
 * movement twice in a session is normal (a lift at the start and again as a
 * back-off), so the tick is information, not a refusal.
 */
function LiftChip({
  entry,
  already,
  onAdd,
}: {
  entry: LibraryExercise
  already: boolean
  onAdd: (entry: LibraryExercise) => void
}) {
  return (
    <button
      type="button"
      onClick={() => onAdd(entry)}
      title={already ? `${entry.name} is already in this day` : `Add ${entry.name}`}
      className={`inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-[12px] transition-colors ${
        already
          ? "border-sky-400/30 bg-sky-500/10 text-sky-200/80"
          : "border-white/12 bg-white/[0.03] text-zinc-200 hover:border-sky-400/40 hover:bg-sky-500/10 hover:text-sky-100"
      }`}
    >
      {already ? (
        <Check className="size-3 shrink-0" />
      ) : (
        <Plus className="size-3 shrink-0 text-zinc-500" />
      )}
      {entry.name}
    </button>
  )
}

export { emptyCustomSchedule }
