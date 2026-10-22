/**
 * The 13 built-in programs prescribe exactly what they prescribed on 2026-10-18.
 *
 * The files under `tests/fixtures/programs/golden-v1/` were written once, by
 * this test with `GOLDEN_WRITE=1`, from the engine as it stood before the
 * program builder rebuilt it (Plans/program-builder.md, Phase 0.2). They are
 * never rewritten: a difference is a changed prescription, and a changed
 * prescription is a bug until the plan's Phase 2 evidence names it.
 */

import { describe, expect, test } from "vitest"
import fs from "node:fs"
import path from "node:path"
import { ALL_PROGRAMS } from "@/src/programs/data/catalog"
import { runGolden, type GoldenFile } from "./goldenRun"
import { legacyEngine } from "./legacyEngine"

const DIR = path.resolve(__dirname, "../../../fixtures/programs/golden-v1")
const WRITE = process.env.GOLDEN_WRITE === "1"

describe("golden runs of the built-in programs (v1)", () => {
  test("there are 13 built-in programs, one golden file each", () => {
    expect(ALL_PROGRAMS).toHaveLength(13)
    if (WRITE) return
    const files = fs.readdirSync(DIR).filter((f) => f.endsWith(".json")).sort()
    expect(files).toEqual(ALL_PROGRAMS.map((p) => `${p.id}.json`).sort())
  })

  for (const program of ALL_PROGRAMS) {
    test(`${program.id}: today's engine reproduces its golden file`, () => {
      const run = runGolden(legacyEngine, program)
      const file = path.join(DIR, `${program.id}.json`)
      if (WRITE) {
        fs.mkdirSync(DIR, { recursive: true })
        fs.writeFileSync(file, JSON.stringify(run) + "\n")
        return
      }
      const golden = JSON.parse(fs.readFileSync(file, "utf8")) as GoldenFile
      expect(run).toEqual(golden)
    })

    test(`${program.id}: replaying each run's history rebuilds the state it ended with`, () => {
      const run = runGolden(legacyEngine, program)
      for (const r of run.runs) {
        expect({ lifter: r.lifter, ...r.replayed }).toEqual({ lifter: r.lifter, ...r.final })
      }
    })
  }
})
