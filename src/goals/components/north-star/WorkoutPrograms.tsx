"use client"

/**
 * Ready-made training programs, on the Templates tab, next to everything else
 * this page hands you.
 *
 * WHAT WAS MISSING. Saying "four workouts a week" here produced a number and a
 * split of DAY NAMES — Push, Pull, Legs — and nothing underneath them. Meanwhile
 * the app already carried thirteen cited programs with a working progression
 * engine, and they lived at /test/programs where nobody planning their life was
 * going to find them. So the plan said you would train four times a week and
 * the app could not tell you what to do on any of the four.
 *
 * This closes that. Pick a program, change it until it is yours, and start it —
 * which creates a real enrollment, so the first session is prescribed and every
 * logged session progresses the weights and feeds the tracked metrics the rest
 * of the app already reads.
 *
 * TWO THINGS HAPPEN ON START, and both are the point:
 *   1. a real enrollment, in the database, tracked from now on
 *   2. the program's days are written into this plan's workout routine, so the
 *      week you are looking at here and the week you are training are the same
 *      week. They used to be able to disagree.
 *
 * IT NEEDS AN ACCOUNT, and says so rather than pretending. The rest of this
 * page is localStorage and works signed out; an enrollment is per-user data in
 * a table with own-row policies, and there is nowhere to put one for a browser
 * with no account. Editing works signed out — only starting needs the account.
 */

import { useState } from "react"
import { Check, Loader2 } from "lucide-react"
import { DISCIPLINES, LEVEL_LABELS } from "@/src/programs/config"
import { programsByDiscipline, requireProgram, resolveProgramForLevel } from "@/src/programs/data/catalog"
import {
  isCustomizable,
  isModified,
  materializeSchedule,
  missingWorkingWeights,
  scheduleDays,
  scheduleProblems,
} from "@/src/programs/customize"
import { fromKg, roundToLoadable } from "@/src/programs/programsService"
import { hasWeight, numericWeights } from "@/src/programs/builder"
import { ProgramEditor } from "@/src/programs/components/ProgramEditor"
import type { Discipline, LevelId, ProgramSchedule, UnitSystem } from "@/src/programs/types"

/** The disciplines offered under Fitness, in the order people ask for them. */
const OFFERED: Discipline[] = ["strength", "bodybuilding", "calisthenics", "cardio", "flexibility", "triathlon"]

export const PROGRAM_COPY = {
  title: "Take a training program",
  help: "A goal says where you are going. A program says what you do on Tuesday. Pick one, change anything you like about it, and start it — the app then prescribes each session and moves the weights for you as you log them.",
  editHint: "Everything here is editable. Rename the days, reorder them, swap a lift for one your gym has, change the sets and reps. It stays your version.",
  needsAccount: "Starting a program saves it to your account, so you will need to be signed in. You can build your version first — it will still be here.",
}

interface Props {
  /**
   * Write the started program's day names into the plan's workout routine, so
   * the training week on this page matches the one being tracked. Null when the
   * plan has no workout routine yet, in which case starting still enrolls.
   */
  onProgramStarted: (dayNames: string[]) => void
}

export function WorkoutPrograms({ onProgramStarted }: Props) {
  const [discipline, setDiscipline] = useState<Discipline>("strength")
  const [programId, setProgramId] = useState<string | null>(null)
  const [level, setLevel] = useState<LevelId>("intermediate")
  const [unit, setUnit] = useState<UnitSystem>("kg")
  const [schedule, setSchedule] = useState<ProgramSchedule | null>(null)
  const [weights, setWeights] = useState<Record<string, string>>({})
  const [oneRms, setOneRms] = useState<Record<string, string>>({})
  const [state, setState] = useState<"idle" | "saving" | "done">("idle")
  const [error, setError] = useState<string | null>(null)

  const programs = programsByDiscipline(discipline)
  // A level can route to a different program entirely (Layer-1 calibration),
  // and it is the RESOLVED one that gets enrolled and edited.
  const resolved = programId ? resolveProgramForLevel(programId, level) : null
  const program = resolved?.program ?? null
  const routed = program && programId !== program.id

  function choose(id: string) {
    if (programId === id) {
      setProgramId(null)
      setSchedule(null)
      return
    }
    const p = requireProgram(id)
    const lvl = p.levels.find((l) => !l.structuralVariantOf)?.id ?? p.levels[0].id
    const target = resolveProgramForLevel(id, lvl).program
    setProgramId(id)
    setLevel(lvl)
    setSchedule(isCustomizable(target) ? materializeSchedule(target) : null)
    setWeights({})
    setOneRms({})
    setState("idle")
    setError(null)
  }

  function changeLevel(next: LevelId) {
    setLevel(next)
    setState("idle")
    setError(null)
    if (!programId) return
    // A different level can resolve to a different program, whose schedule this
    // one's edits would not mean anything against — so the edit resets with it,
    // rather than being silently carried onto a program it did not come from.
    const target = resolveProgramForLevel(programId, next).program
    setSchedule(isCustomizable(target) ? materializeSchedule(target) : null)
    setWeights({})
    setOneRms({})
  }

  const modified = program && schedule ? isModified(program, schedule) : false
  const missing = program && schedule ? missingWorkingWeights(program, schedule, level, unit) : []
  const needs1RM = program?.levels.find((l) => l.id === level)?.requires1RM ?? false

  const oneRmExercises =
    needs1RM && schedule && (schedule.kind === "linear_rotation" || schedule.kind === "weekly_waved")
      ? [
          ...new Map(
            schedule.days
              .flatMap((d) => d.exercises)
              .filter((e) => e.progression.kind === "percentage_tm")
              .map((e) => [e.id, e])
          ).values(),
        ]
      : []

  const missingFilled = missing.every((m) => hasWeight(weights, m.exerciseId))
  const oneRmsFilled = oneRmExercises.every((e) => Number(oneRms[e.id]) > 0)
  // A day added but not yet filled makes the program unstartable, not invalid —
  // it is a normal half-finished edit, so it is named rather than blocked.
  const problems = schedule ? scheduleProblems(schedule) : []
  const canStart = !!program && problems.length === 0 && missingFilled && oneRmsFilled && state !== "saving"

  async function start() {
    if (!program || !programId) return
    setState("saving")
    setError(null)
    try {
      const res = await fetch("/api/programs/enrollments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          programId,
          level,
          unitSystem: unit,
          ...(oneRmExercises.length ? { oneRepMaxes: numericWeights(oneRms) } : {}),
          ...(Object.keys(weights).length ? { workingWeights: numericWeights(weights) } : {}),
          // Only send a schedule that actually differs — an untouched program
          // stays on the catalog and keeps getting its corrections.
          customSchedule: modified ? schedule : null,
        }),
      })

      if (res.status === 401) {
        setError("Sign in to start a program — your version here is kept until you do.")
        setState("idle")
        return
      }
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { error?: string } | null
        setError(body?.error ?? "Could not start the program.")
        setState("idle")
        return
      }

      if (schedule && isCustomizable(program)) {
        onProgramStarted(scheduleDays(schedule).map((d) => d.label))
      }
      setState("done")
    } catch {
      setError("Could not reach the server. Nothing was started.")
      setState("idle")
    }
  }

  return (
    <div>
      <h2 className="text-sm font-semibold text-zinc-200">{PROGRAM_COPY.title}</h2>
      <p className="text-[12.5px] text-zinc-400 mt-1 leading-relaxed">{PROGRAM_COPY.help}</p>

      {/* Discipline */}
      <div className="flex flex-wrap gap-1 mt-2">
        {OFFERED.map((d) => (
          <button
            key={d}
            onClick={() => {
              setDiscipline(d)
              setProgramId(null)
              setSchedule(null)
              setState("idle")
              setError(null)
            }}
            className={`text-[11px] px-2 py-0.5 rounded border transition-colors ${
              discipline === d
                ? "border-emerald-400/40 bg-emerald-500/10 text-emerald-200"
                : "border-white/10 text-zinc-400 hover:bg-white/5"
            }`}
          >
            {DISCIPLINES[d].label}
          </button>
        ))}
      </div>

      {/* Programs */}
      <div className="grid gap-1.5 sm:grid-cols-2 mt-2">
        {programs.map((p) => {
          const active = programId === p.id
          return (
            <button
              key={p.id}
              onClick={() => choose(p.id)}
              className={`text-left rounded-lg border px-2.5 py-2 transition-colors ${
                active
                  ? "border-emerald-400/50 bg-emerald-500/[0.08]"
                  : "border-white/10 bg-white/[0.02] hover:bg-white/[0.06]"
              }`}
            >
              <span className="flex items-center gap-1.5">
                {active && <Check className="size-3 text-emerald-300 shrink-0" />}
                <span className="text-[12.5px] font-medium text-zinc-100">{p.name}</span>
              </span>
              <span className="block text-[11px] text-zinc-500 mt-0.5 leading-relaxed line-clamp-2">
                {p.blurb}
              </span>
            </button>
          )
        })}
      </div>

      {program && (
        <div className="mt-2.5 rounded-lg border border-white/10 bg-black/20 p-2.5 space-y-2.5">
          {/* Level + units */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-1">
              {requireProgram(programId!).levels.map((l) => (
                <button
                  key={l.id}
                  onClick={() => changeLevel(l.id)}
                  className={`text-[11px] px-2 py-0.5 rounded border transition-colors ${
                    level === l.id
                      ? "border-emerald-400/40 bg-emerald-500/10 text-emerald-200"
                      : "border-white/10 text-zinc-400 hover:bg-white/5"
                  }`}
                >
                  {LEVEL_LABELS[l.id]}
                </button>
              ))}
            </div>
            {program.metricType === "load" && (
              <div className="flex items-center gap-1">
                {(["kg", "lb"] as UnitSystem[]).map((u) => (
                  <button
                    key={u}
                    onClick={() => {
                      setUnit(u)
                      setWeights({})
                      setOneRms({})
                    }}
                    className={`text-[11px] px-2 py-0.5 rounded border transition-colors ${
                      unit === u ? "border-white/25 bg-white/10 text-white" : "border-white/10 text-zinc-400 hover:bg-white/5"
                    }`}
                  >
                    {u}
                  </button>
                ))}
              </div>
            )}
          </div>

          {routed && (
            <p className="text-[11px] text-amber-300/80 leading-relaxed">
              {LEVEL_LABELS[level]} runs <strong>{program.name}</strong> instead — it is the better
              fit at this level, and it is the one you will be editing and starting.
            </p>
          )}

          <p className="text-[10px] text-zinc-600 leading-relaxed">{PROGRAM_COPY.editHint}</p>

          {schedule && (
            <ProgramEditor
              program={program}
              schedule={schedule}
              level={level}
              unit={unit}
              onChange={setSchedule}
              workingWeights={weights}
              onWorkingWeight={(id, raw) => setWeights((w) => ({ ...w, [id]: raw }))}
              onReset={() => {
                setSchedule(materializeSchedule(program))
                setWeights({})
              }}
            />
          )}

          {!schedule && !isCustomizable(program) && (
            <ProgramEditor
              program={program}
              schedule={program.schedule}
              level={level}
              unit={unit}
              onChange={() => {}}
              workingWeights={{}}
              onWorkingWeight={() => {}}
              onReset={() => {}}
            />
          )}

          {/* 5/3/1 and anything else built on a training max needs a real 1RM. */}
          {oneRmExercises.length > 0 && (
            <div>
              <p className="text-[11px] text-zinc-300">Your one-rep max on each main lift ({unit})</p>
              <p className="text-[10px] text-zinc-600 mt-0.5 leading-relaxed">
                This program prescribes percentages of a training max, so it cannot start without
                them. An honest recent single, not a best-ever.
              </p>
              <div className="grid sm:grid-cols-2 gap-1.5 mt-1.5">
                {oneRmExercises.map((ex) => (
                  <label key={ex.id} className="flex items-center gap-2">
                    <span className="flex-1 min-w-0 text-[12.5px] text-zinc-300 truncate">{ex.name}</span>
                    <input
                      type="number"
                      inputMode="decimal"
                      value={oneRms[ex.id] ?? ""}
                      onChange={(e) => setOneRms((r) => ({ ...r, [ex.id]: e.target.value }))}
                      aria-label={`One-rep max for ${ex.name} in ${unit}`}
                      className="w-20 bg-white/5 border border-white/15 rounded px-1.5 py-0.5 text-[12.5px] text-white focus:outline-none focus:border-white/30"
                    />
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* Starting weights the level DOES seed, shown so they can be corrected. */}
          {program.metricType === "load" && !needs1RM && schedule && (
            <SeededWeights
              program={program}
              schedule={schedule}
              level={level}
              unit={unit}
              values={weights}
              onChange={(id, raw) => setWeights((w) => ({ ...w, [id]: raw }))}
            />
          )}

          {error && (
            <p className="text-[11px] text-rose-300/90 bg-rose-500/[0.07] border border-rose-400/20 rounded-md px-2.5 py-1.5">
              {error}
            </p>
          )}

          {state === "done" ? (
            <p className="text-[12.5px] text-emerald-300/90 flex items-center gap-1.5">
              <Check className="size-3.5" /> {program.name} is running
              {modified ? " — your version" : ""}. Your first session is waiting, and your training
              week here now matches it.
            </p>
          ) : (
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={start}
                disabled={!canStart}
                className="flex items-center gap-1.5 text-[12.5px] px-3 py-1.5 rounded-md border border-emerald-400/40 bg-emerald-500/10 text-emerald-200 hover:bg-emerald-500/20 disabled:opacity-30 disabled:hover:bg-emerald-500/10 transition-colors"
              >
                {state === "saving" && <Loader2 className="size-3 animate-spin" />}
                Start tracking this
              </button>
              {problems.length > 0 && (
                <span className="text-[11px] text-amber-300/80">{problems[0]}</span>
              )}
              {problems.length === 0 && !missingFilled && (
                <span className="text-[11px] text-amber-300/80">
                  Fill in the starting weights above first.
                </span>
              )}
              {problems.length === 0 && missingFilled && !oneRmsFilled && (
                <span className="text-[11px] text-amber-300/80">
                  Enter all {oneRmExercises.length} maxes first.
                </span>
              )}
            </div>
          )}

          <p className="text-[10px] text-zinc-600 leading-relaxed">{PROGRAM_COPY.needsAccount}</p>
        </div>
      )}
    </div>
  )
}

/**
 * The lifts the level already has a number for, shown rather than hidden.
 *
 * These are optional — leaving them blank starts at the level's own suggestion —
 * but a beginner squat seeded at 20 kg for somebody who squats 80 makes the
 * first three weeks meaningless, and the fix should not be "log six sessions
 * and let it ratchet".
 */
function SeededWeights({
  program,
  schedule,
  level,
  unit,
  values,
  onChange,
}: {
  program: import("@/src/programs/types").ProgramDefinition
  schedule: ProgramSchedule
  level: LevelId
  unit: UnitSystem
  values: Record<string, string>
  onChange: (exerciseId: string, raw: string) => void
}) {
  if (schedule.kind !== "linear_rotation" && schedule.kind !== "weekly_waved") return null
  const seeds = program.levels.find((l) => l.id === level)?.seedWorkingWeightKg ?? {}
  const seeded = [
    ...new Map(
      schedule.days
        .flatMap((d) => d.exercises)
        .filter((e) => seeds[e.id] != null)
        .map((e) => [e.id, e])
    ).values(),
  ]
  if (seeded.length === 0) return null

  return (
    <div>
      <p className="text-[11px] text-zinc-300">Starting weights ({unit})</p>
      <p className="text-[10px] text-zinc-600 mt-0.5 leading-relaxed">
        Prefilled from {LEVEL_LABELS[level]}. Change any that are wrong — starting too light costs
        weeks, starting too heavy costs the lift.
      </p>
      <div className="grid sm:grid-cols-2 gap-1.5 mt-1.5">
        {seeded.map((ex) => (
          <label key={ex.id} className="flex items-center gap-2">
            <span className="flex-1 min-w-0 text-[12.5px] text-zinc-400 truncate">{ex.name}</span>
            <input
              type="number"
              inputMode="decimal"
              value={values[ex.id] ?? ""}
              placeholder={String(roundToLoadable(fromKg(seeds[ex.id]!, unit), unit))}
              onChange={(e) => onChange(ex.id, e.target.value)}
              aria-label={`Starting weight for ${ex.name} in ${unit}`}
              className="w-20 bg-white/5 border border-white/10 rounded px-1.5 py-0.5 text-[12.5px] text-white focus:outline-none focus:border-white/30"
            />
          </label>
        ))}
      </div>
    </div>
  )
}
