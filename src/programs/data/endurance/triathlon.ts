/**
 * Triathlon & Ironman — periodized multi-sport plans (swim / bike / run).
 *
 * Source: standard triathlon periodization (build → peak → taper, 6 sessions/
 * week across the three sports plus a weekly brick) — session durations
 * generated from a per-week volume curve, re-implemented as data. Peak volumes
 * and plan lengths follow common sprint / Olympic / 70.3 training structures.
 * The final week tapers hard into race day. The endurance engine walks you
 * through every dated session; there's no per-session tuning.
 */

import type { EnduranceSession, EnduranceWeek, ProgramDefinition, Discipline, LevelId } from "../../types"

interface PeakBase {
  swim: number // minutes at peak
  bike: number
  run: number
  brickBike: number
  brickRun: number
}

const min = (mins: number, factor: number) => Math.max(10, Math.round(mins * factor)) * 60

// Six sessions a week: two swims, two bikes, a run, and a brick (bike→run).
function triWeek(n: number, factor: number, base: PeakBase, isRaceWeek: boolean): EnduranceWeek {
  const s = (id: string, label: string, sets: EnduranceSession["sets"]): EnduranceSession => ({ id, label, sets })
  const one = (kind: "swim" | "bike" | "run", label: string, mins: number): EnduranceSession["sets"] => [
    { repeat: 1, blocks: [{ kind, label, durationSec: min(mins, factor) }] },
  ]
  return {
    label: `Week ${n}${isRaceWeek ? " · Race week 🏁" : factor >= 1 ? " · Peak" : factor < 0.6 ? " · Taper" : ""}`,
    sessions: [
      s(`w${n}-swim1`, "Swim", one("swim", "Endurance swim", base.swim)),
      s(`w${n}-bike1`, "Bike", one("bike", "Endurance ride", base.bike)),
      s(`w${n}-run1`, "Run", one("run", "Endurance run", base.run)),
      s(`w${n}-swim2`, "Swim (technique)", one("swim", "Technique swim", base.swim * 0.8)),
      s(`w${n}-bike2`, "Bike (intervals)", one("bike", "Interval ride", base.bike * 0.8)),
      s(`w${n}-brick`, "Brick", [
        { repeat: 1, blocks: [
          { kind: "bike", label: "Brick ride", durationSec: min(base.brickBike, factor) },
          { kind: "run", label: "Transition run", durationSec: min(base.brickRun, factor) },
        ] },
      ]),
    ],
  }
}

function triProgram(
  id: string, name: string, blurb: string, discipline: Discipline, popularityRank: number,
  level: LevelId, factors: number[], base: PeakBase, citation: string
): ProgramDefinition {
  const weeks: EnduranceWeek[] = factors.map((f, i) => triWeek(i + 1, f, base, i === factors.length - 1))
  return {
    id, discipline, metricType: "endurance", name, blurb,
    sourceCitation: citation, popularityRank,
    levels: [{ id: level, label: level[0].toUpperCase() + level.slice(1) }],
    schedule: { kind: "endurance_weeks", weeks },
  }
}

const CITE = "Standard triathlon periodization (build/peak/taper); session durations re-implemented as data"

export const sprintTriathlon = triProgram(
  "sprint-triathlon", "Sprint Triathlon", "8-week build to a sprint-distance race (≈750m swim / 20km bike / 5km run). Six sessions a week, tapering into race day.",
  "triathlon", 1, "beginner",
  [0.6, 0.7, 0.8, 0.9, 0.95, 1.0, 0.7, 0.45],
  { swim: 30, bike: 60, run: 35, brickBike: 40, brickRun: 15 }, CITE,
)

export const olympicTriathlon = triProgram(
  "olympic-triathlon", "Olympic Triathlon", "12-week plan for the Olympic distance (1.5km swim / 40km bike / 10km run). Progressive build, peak, then taper.",
  "triathlon", 2, "intermediate",
  [0.5, 0.6, 0.65, 0.7, 0.75, 0.8, 0.85, 0.9, 0.95, 1.0, 0.7, 0.45],
  { swim: 40, bike: 90, run: 50, brickBike: 60, brickRun: 20 }, CITE,
)

export const halfIronman = triProgram(
  "half-ironman", "70.3 Half Ironman", "16-week half-Ironman build (1.9km swim / 90km bike / 21km run). Long endurance volume with a structured taper.",
  "ironman", 1, "intermediate",
  [0.45, 0.5, 0.55, 0.6, 0.65, 0.7, 0.75, 0.8, 0.85, 0.9, 0.92, 0.95, 1.0, 1.0, 0.7, 0.4],
  { swim: 50, bike: 150, run: 75, brickBike: 120, brickRun: 30 }, CITE,
)
