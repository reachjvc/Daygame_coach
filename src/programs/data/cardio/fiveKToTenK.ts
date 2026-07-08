/**
 * 5K to 10K — 6-week distance builder.
 *
 * Source: standard 5K→10K progression structure (intervals + tempo + a growing
 * long run, 3 runs/week) — durations re-implemented as data. Assumes you can
 * already run ~5K. Each week: one interval session, one steady run, one long run
 * that grows from ~30 to ~60 minutes (≈10K). The engine walks you through it.
 */

import type { EnduranceBlock, EnduranceSession, EnduranceWeek, ProgramDefinition } from "../../types"

const warm: EnduranceBlock = { kind: "warmup", label: "Easy jog", durationSec: 300 }
const cool: EnduranceBlock = { kind: "cooldown", label: "Walk", durationSec: 300 }
const run = (sec: number): EnduranceBlock => ({ kind: "run", label: "Run", durationSec: sec })
const jog = (sec: number): EnduranceBlock => ({ kind: "jog", label: "Easy jog", durationSec: sec })
const steady = (sec: number): EnduranceBlock => ({ kind: "steady", label: "Steady run", durationSec: sec })

const session = (id: string, label: string, work: EnduranceSession["sets"]): EnduranceSession => ({
  id, label, sets: [{ repeat: 1, blocks: [warm] }, ...work, { repeat: 1, blocks: [cool] }],
})

const week = (n: number, intervals: EnduranceSession["sets"], steadySec: number, longSec: number): EnduranceWeek => ({
  label: `Week ${n}`,
  sessions: [
    session(`w${n}-intervals`, "Intervals", intervals),
    session(`w${n}-steady`, "Steady run", [{ repeat: 1, blocks: [steady(steadySec)] }]),
    session(`w${n}-long`, "Long run", [{ repeat: 1, blocks: [run(longSec)] }]),
  ],
})

const weeks: EnduranceWeek[] = [
  week(1, [{ repeat: 6, blocks: [run(120), jog(60)] }], 1500, 1800),
  week(2, [{ repeat: 6, blocks: [run(180), jog(90)] }], 1680, 2100),
  week(3, [{ repeat: 5, blocks: [run(240), jog(90)] }], 1800, 2400),
  week(4, [{ repeat: 4, blocks: [run(300), jog(120)] }], 1920, 2700),
  week(5, [{ repeat: 3, blocks: [run(480), jog(120)] }], 2100, 3000),
  week(6, [{ repeat: 2, blocks: [run(720), jog(120)] }], 1800, 3600),
]

export const fiveKToTenK: ProgramDefinition = {
  id: "5k-to-10k",
  discipline: "cardio",
  metricType: "endurance",
  name: "5K to 10K",
  blurb: "Already run 5K? Build up to a 10K over 6 weeks — one interval session, one steady run and a growing long run each week.",
  sourceCitation: "Standard 5K→10K progression (intervals + tempo + long run); durations re-implemented as data",
  popularityRank: 2,
  levels: [{ id: "intermediate", label: "Intermediate" }],
  schedule: { kind: "endurance_weeks", weeks },
}
