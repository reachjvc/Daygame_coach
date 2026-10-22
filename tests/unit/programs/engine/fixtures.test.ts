/**
 * EVERY COVERAGE FIXTURE PRESCRIBES WHAT ITS SOURCE SAYS — Plans/program-builder.md,
 * Phase 2 acceptance.
 *
 * Each fixture is run forward by `simulate` with its starting numbers, and the
 * named lift in the named week (or session) is compared, as a line, with the
 * number the fixture copied from the program's own source.
 */

import { describe, expect, test } from "vitest"
import { describeResolved, simulate } from "@/src/programs/engine"
import { FIXTURES } from "../../../fixtures/programs/corpus"

describe("coverage fixtures through the engine", () => {
  for (const f of FIXTURES) {
    describe(f.id, () => {
      const weeks = Math.max(...f.expect.map((e) => e.week ?? 1))
      const sessions = Math.max(...f.expect.map((e) => e.session ?? 1))
      const run = () =>
        simulate(f.spec, {
          unit: f.spec.unit,
          start: { working: f.start.working, maxes: f.start.maxes },
          ...(f.spec.calendar.lengthWeeks != null ? { weeks } : { sessions }),
          picks: f.picks,
          amrapExtra: f.outcome?.amrapExtra,
        })
      for (const e of f.expect) {
        const when = e.week != null ? `week ${e.week} ${e.day}` : `session ${e.session}`
        test(`${when}, ${e.slot}: ${e.sets}`, () => {
          const sim = run()
          const session = e.week != null ? sim.find((s) => s.pass === e.week && s.dayId === e.day) : sim[e.session! - 1]
          expect(session, `${when} was simulated`).toBeTruthy()
          const ex = session!.exercises.find((x) => x.slotId === e.slot)
          expect(ex, `${e.slot} is on that day`).toBeTruthy()
          expect(describeResolved(ex!), e.source).toBe(e.sets)
        })
      }
    })
  }
})
