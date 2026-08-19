"use client"

/**
 * The Customize step — the empty page you design a training week on.
 *
 * WHY IT IS A STEP OF ITS OWN. Templates offers cited programs to take or
 * adapt, which serves the person who wants to be told what to do. It does
 * nothing for the person who already knows exactly what their week is and just
 * wants the app to track it, and folding a from-scratch builder into a
 * catalogue would have made the catalogue the main road and the builder a
 * footnote on it. The rail marks it in sky rather than violet because it is a
 * tool rather than a section of the plan — the same reason it carries no
 * progress ring.
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
import { scheduleDays } from "@/src/programs/customize"
import type { ProgramSchedule, UnitSystem } from "@/src/programs/types"

export const CUSTOMIZE_INTRO = {
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

export function CustomizeTab({ onProgramStarted }: { onProgramStarted: (dayNames: string[]) => void }) {
  const [schedule, setSchedule] = useState<ProgramSchedule>(emptyCustomSchedule)
  const [unit, setUnit] = useState<UnitSystem>("kg")
  const [weights, setWeights] = useState<Record<string, string>>({})
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    const saved = load(window.localStorage.getItem(BUILDER_STORAGE_KEY))
    if (saved) {
      setSchedule(saved.schedule)
      setUnit(saved.unit)
      setWeights(saved.weights)
    }
    setLoaded(true)
  }, [])

  // Saving before the load has finished would write the empty design over the
  // saved one on every refresh — the same trap the plan itself guards against.
  useEffect(() => {
    if (!loaded) return
    window.localStorage.setItem(BUILDER_STORAGE_KEY, JSON.stringify({ schedule, unit, weights }))
  }, [schedule, unit, weights, loaded])

  return (
    <div className="rounded-2xl border border-sky-400/20 bg-sky-500/[0.03]">
      <div className="px-5 pt-4 pb-3 border-b border-sky-400/15">
        <h2 className="text-sm font-semibold text-zinc-200">{CUSTOMIZE_INTRO.title}</h2>
        <p className="text-[11.5px] text-zinc-400 mt-1 leading-relaxed">{CUSTOMIZE_INTRO.help}</p>
        <p className="text-[10.5px] text-zinc-600 mt-1.5 leading-relaxed">{CUSTOMIZE_INTRO.vsTemplates}</p>
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
            onStarted={onProgramStarted}
          />
        )}
      </div>
    </div>
  )
}
