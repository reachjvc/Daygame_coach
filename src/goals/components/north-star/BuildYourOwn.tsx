"use client"

/**
 * Build your own — the empty page you design a training week on.
 *
 * WHERE IT LIVES. Beside the catalogue on the Templates step, behind the same
 * switch, because "take a ready-made program" and "build my own" are two
 * answers to one question. It was briefly its own step in the rail, which made
 * somebody choose between them before seeing either, and put the two halves of
 * one decision in two different places.
 *
 * ITS OWN STORAGE KEY, not part of the plan. A half-built program is workshop
 * state, not something you would want to read back on the Commit step or lose
 * to "start over" — clearing your plan should not take your training week with
 * it. The design is written to `custom-program-v1`; only the day names cross
 * into the plan, and only once the program is actually started.
 */

import { useEffect, useState } from "react"
import {
  BUILDER_STORAGE_KEY,
  CustomProgramBuilder,
  emptyCustomSchedule,
} from "@/src/programs/components/CustomProgramBuilder"
import type { NsRoutineProgram } from "@/src/goals/types"
import { scheduleDays } from "@/src/programs/customize"
import {
  CUSTOM_LIFTS_STORAGE_KEY,
  forgetCustomLift,
  parseCustomLifts,
  rememberCustomLift,
  serializeCustomLifts,
} from "@/src/programs/customLifts"
import type { LibraryExercise } from "@/src/programs/types"
import type { ProgramSchedule, UnitSystem } from "@/src/programs/types"

export const BUILD_OWN_INTRO = {
  title: "Build your own training week",
  help: "For when you already know what you do and want the app to track it, rather than tell you. Nothing here is prescribed for you.",
  vsTemplates:
    "If you would rather start from something proven and change it, the Templates step next door has thirteen cited programs that are all fully editable.",
}

/** What is written to localStorage — the design plus the numbers beside it. */
interface SavedDesign {
  schedule: ProgramSchedule
  unit: UnitSystem
  weights: Record<string, string>
}

function load(raw: string | null): SavedDesign | null {
  if (!raw) return null
  try {
    const parsed = JSON.parse(raw) as Partial<SavedDesign>
    if (!parsed.schedule || typeof parsed.schedule !== "object") return null
    // Only the shapes this builder writes. A hand-edited or stale key is
    // discarded rather than fed to the editor, which would throw on the first
    // render and take the whole tab with it.
    if (parsed.schedule.kind !== "linear_rotation") return null
    scheduleDays(parsed.schedule)
    return {
      schedule: parsed.schedule,
      unit: parsed.unit === "lb" ? "lb" : "kg",
      weights: parsed.weights && typeof parsed.weights === "object" ? parsed.weights : {},
    }
  } catch {
    return null
  }
}

export function BuildYourOwn({
  onProgramStarted,
}: {
  onProgramStarted: (dayNames: string[], program: NsRoutineProgram | null) => void
}) {
  const [schedule, setSchedule] = useState<ProgramSchedule>(emptyCustomSchedule)
  const [unit, setUnit] = useState<UnitSystem>("kg")
  const [weights, setWeights] = useState<Record<string, string>>({})
  /**
   * SEPARATE STORAGE FROM THE DESIGN, on purpose.
   *
   * A lift you invented outlives the week you invented it in. Clearing the
   * program, or rewriting it from scratch, must not make you type "One Arm
   * Tricep" again — and because its id is derived from its name, the progress
   * already logged against it is still its progress when you add it back.
   */
  const [ownLifts, setOwnLifts] = useState<LibraryExercise[]>([])
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    const saved = load(window.localStorage.getItem(BUILDER_STORAGE_KEY))
    if (saved) {
      setSchedule(saved.schedule)
      setUnit(saved.unit)
      setWeights(saved.weights)
    }
    setOwnLifts(parseCustomLifts(window.localStorage.getItem(CUSTOM_LIFTS_STORAGE_KEY)))
    setLoaded(true)
  }, [])

  // Saving before the load has finished would write the empty design over the
  // saved one on every refresh — the same trap the plan itself guards against.
  useEffect(() => {
    if (!loaded) return
    window.localStorage.setItem(BUILDER_STORAGE_KEY, JSON.stringify({ schedule, unit, weights }))
  }, [schedule, unit, weights, loaded])

  useEffect(() => {
    if (!loaded) return
    window.localStorage.setItem(CUSTOM_LIFTS_STORAGE_KEY, serializeCustomLifts(ownLifts))
  }, [ownLifts, loaded])

  return (
    <div className="rounded-2xl border border-sky-400/20 bg-sky-500/[0.03]">
      <div className="px-5 pt-4 pb-3 border-b border-sky-400/15">
        <h2 className="text-sm font-semibold text-zinc-200">{BUILD_OWN_INTRO.title}</h2>
        <p className="text-[11.5px] text-zinc-400 mt-1 leading-relaxed">{BUILD_OWN_INTRO.help}</p>
        <p className="text-[10.5px] text-zinc-600 mt-1.5 leading-relaxed">{BUILD_OWN_INTRO.vsTemplates}</p>
      </div>

      <div className="px-5 py-4">
        {loaded && (
          <CustomProgramBuilder
            schedule={schedule}
            onChange={setSchedule}
            unit={unit}
            onUnit={setUnit}
            weights={weights}
            onWeight={(id, raw) => setWeights((w) => ({ ...w, [id]: raw }))}
            onWeights={setWeights}
            ownLifts={ownLifts}
            /* Only lifts that are actually somebody's own are remembered; the
               153-lift pool does not need a copy of itself in localStorage. */
            onRememberLift={(entry) => {
              if (!entry.id.startsWith("custom_")) return
              setOwnLifts((cur) => rememberCustomLift(cur, entry))
            }}
            onForget={(id) => setOwnLifts((cur) => forgetCustomLift(cur, id))}
            onStarted={onProgramStarted}
          />
        )}
      </div>
    </div>
  )
}
