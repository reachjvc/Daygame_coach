/**
 * GOLDEN EQUIVALENCE — the rebuilt engine prescribes what the old one did.
 *
 * Plans/program-builder.md, Phase 2.5 and Part 2 rule 6: every lifting
 * built-in, converted to the program format and run on the new engine through
 * the same scripted lifters, reproduces its golden-v1 file exactly. Running
 * plans and the splits program are not converted (Q3) and keep being checked
 * against the old engine in `golden.test.ts`.
 */

import { describe, expect, test } from "vitest"
import fs from "node:fs"
import path from "node:path"
import { ALL_PROGRAMS } from "@/src/programs/data/catalog"
import { isLiftingSchedule } from "@/src/programs/spec/fromLegacy"
import { runGolden, type GoldenFile } from "./goldenRun"
import { specEngine } from "./specEngine"

const DIR = path.resolve(__dirname, "../../../fixtures/programs/golden-v1")
const LIFTING = ALL_PROGRAMS.filter((p) => isLiftingSchedule(p.schedule))

describe("golden equivalence of the rebuilt engine", () => {
  test("seven built-ins are lifting programs and run on it", () => {
    expect(LIFTING.map((p) => p.id).sort()).toEqual(
      ["bodyweight-foundations", "phul", "push-pull-legs", "starting-strength", "stronglifts-5x5", "upper-lower", "wendler-531"].sort()
    )
  })

  for (const program of LIFTING) {
    test(`${program.id}: the new engine reproduces golden-v1 exactly`, () => {
      const golden = JSON.parse(fs.readFileSync(path.join(DIR, `${program.id}.json`), "utf8")) as GoldenFile
      expect(runGolden(specEngine, program)).toEqual(golden)
    })
  }
})
