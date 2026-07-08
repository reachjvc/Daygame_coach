/**
 * Couch to 5K — 9-week beginner running plan (run/walk intervals → 30-min run).
 *
 * Source: NHS "Couch to 5K" (nhs.uk). 3 runs/week for 9 weeks; each run starts
 * and ends with a 5-minute brisk walk. Weeks 1–4 and 7–9 use three identical
 * sessions; weeks 5–6 progress across the three sessions. Structure transcribed
 * from the published plan. The engine just walks you through the weeks — there's
 * no per-exercise progression to tune.
 */

import type { EnduranceBlock, EnduranceSession, EnduranceWeek, ProgramDefinition } from "../../types"

const warm: EnduranceBlock = { kind: "warmup", label: "Brisk walk", durationSec: 300 }
const cool: EnduranceBlock = { kind: "cooldown", label: "Walk", durationSec: 300 }
const run = (sec: number): EnduranceBlock => ({ kind: "run", label: "Run", durationSec: sec })
const jog = (sec: number): EnduranceBlock => ({ kind: "jog", label: "Jog", durationSec: sec })
const walk = (sec: number): EnduranceBlock => ({ kind: "walk", label: "Walk", durationSec: sec })

// A session = warm-up walk, the work, cool-down walk.
const session = (id: string, label: string, work: EnduranceSession["sets"]): EnduranceSession => ({
  id,
  label,
  sets: [{ repeat: 1, blocks: [warm] }, ...work, { repeat: 1, blocks: [cool] }],
})

// A week of three identical sessions.
const repeatWeek = (label: string, id: string, work: EnduranceSession["sets"]): EnduranceWeek => ({
  label,
  sessions: [1, 2, 3].map((n) => session(`${id}-r${n}`, `Run ${n}`, work)),
})

const weeks: EnduranceWeek[] = [
  repeatWeek("Week 1", "w1", [{ repeat: 8, blocks: [jog(60), walk(90)] }]),
  repeatWeek("Week 2", "w2", [{ repeat: 6, blocks: [jog(90), walk(120)] }]),
  repeatWeek("Week 3", "w3", [{ repeat: 2, blocks: [jog(90), walk(90), run(180), walk(180)] }]),
  repeatWeek("Week 4", "w4", [{ repeat: 1, blocks: [run(180), walk(90), run(300), walk(150), run(180), walk(90), run(300)] }]),
  {
    label: "Week 5",
    sessions: [
      session("w5-1", "Run 1", [{ repeat: 1, blocks: [run(300), walk(180), run(300), walk(180), run(300)] }]),
      session("w5-2", "Run 2", [{ repeat: 1, blocks: [run(480), walk(300), run(480)] }]),
      session("w5-3", "Run 3", [{ repeat: 1, blocks: [run(1200)] }]),
    ],
  },
  {
    label: "Week 6",
    sessions: [
      session("w6-1", "Run 1", [{ repeat: 1, blocks: [run(300), walk(180), run(480), walk(180), run(300)] }]),
      session("w6-2", "Run 2", [{ repeat: 1, blocks: [run(600), walk(180), run(600)] }]),
      session("w6-3", "Run 3", [{ repeat: 1, blocks: [run(1500)] }]),
    ],
  },
  repeatWeek("Week 7", "w7", [{ repeat: 1, blocks: [run(1500)] }]),
  repeatWeek("Week 8", "w8", [{ repeat: 1, blocks: [run(1680)] }]),
  repeatWeek("Week 9", "w9", [{ repeat: 1, blocks: [run(1800)] }]),
]

export const couchTo5k: ProgramDefinition = {
  id: "couch-to-5k",
  discipline: "cardio",
  metricType: "endurance",
  name: "Couch to 5K",
  blurb: "Go from the sofa to a non-stop 30-minute run in 9 weeks. Three run/walk sessions a week, gradually more running.",
  sourceCitation: "NHS Couch to 5K (nhs.uk)",
  popularityRank: 1,
  levels: [{ id: "beginner", label: "Beginner" }],
  schedule: { kind: "endurance_weeks", weeks },
}
