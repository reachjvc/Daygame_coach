// @vitest-environment node
/**
 * WHICH MIGRATIONS THE TEST DATABASE GETS ON TOP OF THE BASELINE.
 *
 * The baseline is stamped with the newest migration production has. The stack
 * applies what is newer. A migration approved long after it was written is
 * OLDER than the stamp, so it must be named on purpose or no test ever sees it
 * (the delete/revise-workout functions, 2026-11-28).
 */
import { describe, expect, it } from "vitest"
import fs from "node:fs"
import path from "node:path"
import { migrationsOnTop, OLDER_NOT_YET_LIVE } from "../../../scripts/db/test-stack.mjs"

const ROOT = path.resolve(__dirname, "../../..")

describe("test database migration plan", () => {
  it("takes a migration newer than the stamp", () => {
    expect(migrationsOnTop(["20261201000000_a.sql"], "20261110130000", [])).toEqual(["20261201000000_a.sql"])
  })

  it("leaves out a migration older than the stamp that is not named", () => {
    expect(migrationsOnTop(["20260101000000_old.sql"], "20261110130000", [])).toEqual([])
  })

  it("takes an older migration that is named, in order before the newer ones", () => {
    const files = ["20261201000000_new.sql", "20260923150000_old.sql", "20260101000000_skip.sql", "notes.txt"]
    expect(migrationsOnTop(files, "20261110130000", ["20260923150000_old.sql"])).toEqual([
      "20260923150000_old.sql",
      "20261201000000_new.sql",
    ])
  })

  it("names only files that exist in supabase/migrations (a rename must not silently drop one)", () => {
    const present = fs.readdirSync(path.join(ROOT, "supabase/migrations"))
    expect(OLDER_NOT_YET_LIVE.filter((f: string) => !present.includes(f))).toEqual([])
  })

  it("puts the approved delete/revise-workout migration on the test database", () => {
    const stamp = /^-- baseline-stamp: (\d+)/.exec(fs.readFileSync(path.join(ROOT, "tests/db/baseline.sql"), "utf8"))![1]
    const all = fs.readdirSync(path.join(ROOT, "supabase/migrations"))
    expect(migrationsOnTop(all, stamp)).toContain("20260923150000_delete_and_revise_program_workout.sql")
  })
})
