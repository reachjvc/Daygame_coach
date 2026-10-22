/**
 * Every coverage fixture is a valid program in the format (Phase 1.4), and
 * every number it expects points at a day and a lift that exist. Whether the
 * numbers come out right is Phase 2's test, through the engine.
 */

import { describe, expect, test } from "vitest"
import { checkSpec, stateKeyOf } from "@/src/programs/spec/schema"
import { FIXTURES } from "../../../fixtures/programs/corpus"

const RESOLVED_RUN = /^\d+(-\d+)?x(\d+(-\d+)?\+?|\d+(-\d+)?s|t\d+)(\|\d+x\d+)?(@(\d+(\.\d+)?(-\d+(\.\d+)?)?|bw(\+\d+(\.\d+)?)?|\?))?( (rir|rpe)(<=)?\d+(\.5)?(-\d+(\.5)?)?(\(last\))?)?$/

describe("coverage fixtures", () => {
  test("there is at least Starscream, and no two fixtures share an id", () => {
    const ids = FIXTURES.map((f) => f.id)
    expect(ids).toContain("starscream")
    expect(new Set(ids).size).toBe(ids.length)
  })

  for (const f of FIXTURES) {
    describe(f.id, () => {
      test("is a valid program", () => {
        const checked = checkSpec(f.spec)
        expect(checked.ok ? [] : checked.problems).toEqual([])
      })

      test("names its source, its terms and what it cannot say", () => {
        expect(f.source.url).toMatch(/^https:\/\//)
        expect(f.source.author.length).toBeGreaterThan(0)
        if (f.coverage === "close") expect(f.gaps?.length ?? 0).toBeGreaterThan(0)
      })

      test("expects at least week 1 and one later week, at lifts that exist", () => {
        expect(f.expect.length).toBeGreaterThanOrEqual(2)
        const firstAndLater = f.expect.map((e) => e.week ?? e.session ?? 0)
        expect(Math.min(...firstAndLater)).toBe(1)
        expect(Math.max(...firstAndLater)).toBeGreaterThan(1)
        const slots = new Map(f.spec.days.flatMap((d) => d.slots.map((s) => [s.id, d.id] as const)))
        const keys = new Set(f.spec.days.flatMap((d) => d.slots.map(stateKeyOf)))
        for (const e of f.expect) {
          expect(slots.has(e.slot), `${e.slot} is a lift`).toBe(true)
          if (e.day) expect(slots.get(e.slot), `${e.slot} is on ${e.day}`).toBe(e.day)
          expect((e.week == null) !== (e.session == null), "week or session, not both").toBe(true)
          if (e.week != null) expect(e.day, "a week needs a day").toBeTruthy()
          for (const run of e.sets.split(", ")) expect(run, `"${run}" is written in the fixture grammar`).toMatch(RESOLVED_RUN)
          expect(e.source.length).toBeGreaterThan(0)
        }
        for (const key of [...Object.keys(f.start.working ?? {}), ...Object.keys(f.start.maxes ?? {})]) {
          expect(keys.has(key), `start names "${key}", a lift in the program`).toBe(true)
        }
        for (const slot of Object.keys(f.picks ?? {})) expect(slots.has(slot), `pick for ${slot}`).toBe(true)
      })
    })
  }
})
