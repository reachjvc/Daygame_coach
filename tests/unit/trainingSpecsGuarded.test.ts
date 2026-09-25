/**
 * A SPEC THAT DELETES TRAINING ROWS MUST REFUSE THE WRONG ACCOUNT ITSELF.
 *
 * `resetAndEnroll` and `cleanUp` in `tests/e2e/helpers/training.helper.ts` check
 * the account before they touch anything. On 2026-09-24 it turned out that the
 * specs going through them are a minority: ten spec files run their own
 * `fetch(…, { method: "DELETE" })` loops inside `page.evaluate` —
 * `programs-history-progress` seventeen of them — and not one of those calls
 * passed through a function that could refuse.
 *
 * Nothing was broken. Every one of those files is listed in a `training*`
 * project and signed in as the training account, which was verified rather than
 * assumed. The objection is to WHAT the safety rests on: a `testMatch` entry in
 * `playwright.config.ts`, a shared file that was swept into another session's
 * commit twice in a single day. Until 2026-09-23 those specs were pointed at
 * `TEST_USER` — the account `.claude/rules/ui.md` sends a person to for
 * hand-checking — and `npm run test:e2e` took somebody's program away
 * mid-walkthrough. The fix then was a third account. This is the other half:
 * the spec itself says which account it is willing to run as.
 *
 * So: one `guardTrainingAccount()` call at the top of any spec that deletes
 * training rows, which registers a `beforeEach` refusing any project not signed
 * in as the training account — before the test body runs, rather than on an
 * assertion three minutes later with the rows already gone.
 */

import { describe, test, expect } from "vitest"
import * as fs from "fs"
import * as path from "path"

const projectRoot = path.resolve(__dirname, "../..")
const e2eDir = path.join(projectRoot, "tests/e2e")

function specFiles(): string[] {
  const out: string[] = []
  const walk = (dir: string) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name)
      if (entry.isDirectory()) walk(full)
      else if (entry.name.endsWith(".spec.ts")) out.push(full)
    }
  }
  walk(e2eDir)
  return out.sort()
}

/**
 * Deletes training rows of its own accord: a DELETE, and a training endpoint to
 * point it at. Both in the same file is the hazard; either alone is not. A spec
 * that only calls `resetAndEnroll` or `cleanUp` is already covered inside them.
 */
function deletesTrainingRows(code: string): boolean {
  return /method:\s*["']DELETE["']/.test(code) && /\/api\/(workouts|programs)\b/.test(code)
}

describe("specs that delete training rows refuse the wrong account", () => {
  const files = specFiles().map((file) => ({
    rel: path.relative(projectRoot, file).replace(/\\/g, "/"),
    // Comments blanked: a sentence about deleting is not a delete.
    code: fs
      .readFileSync(file, "utf-8")
      .replace(/\/\*[\s\S]*?\*\//g, "")
      .replace(/\/\/[^\n]*/g, ""),
  }))

  test("every one of them calls guardTrainingAccount()", () => {
    const unguarded = files
      .filter(({ code }) => deletesTrainingRows(code))
      .filter(({ code }) => !/guardTrainingAccount\(\)/.test(code))
      .map(({ rel }) => rel)

    expect(
      unguarded,
      "These specs delete workouts or enrollments on whatever account they are\n" +
        "handed, and nothing in the file says which account that may be. Add at\n" +
        "the top, after the imports:\n\n" +
        "  import { guardTrainingAccount } from \"./helpers/training.helper\"\n" +
        "  guardTrainingAccount()\n\n" +
        "Being listed in a training project is not enough: that is one line in a\n" +
        "shared config, and the account it points at has been the wrong one before:\n" +
        unguarded.join("\n")
    ).toEqual([])
  })

  /**
   * THE INSTRUMENT, NOT THE POPULATION.
   *
   * This asserted that at least eight spec files still LOOK destructive, to
   * catch a regex that had stopped matching and left the test above asserting
   * that an empty list is empty. Right worry, wrong floor — and wrong in the
   * worst direction: converting those ten specs to `resetAndEnroll`/`cleanUp`,
   * which is the outcome this whole file argues for, drops the count to zero
   * and turns a good change red. A guard that fails when its own goal is
   * reached teaches people to delete the guard.
   *
   * What needs asserting is that the predicate still recognises the shape, and
   * that is answerable without reference to how many real files match.
   */
  test("the scan recognises a destructive spec and ignores a harmless one", () => {
    const deletesAWorkout = 'await fetch(`/api/workouts/${live.id}`, { method: "DELETE" })'
    const deletesAnEnrollment = 'await fetch(`/api/programs/enrollments/${e.id}`, { method: "DELETE" })'
    const readsOnly = 'const live = await (await fetch("/api/workouts/live")).json()'
    const deletesSomethingElse = 'await fetch(`/api/goals/${id}`, { method: "DELETE" })'

    expect(deletesTrainingRows(deletesAWorkout), "a workout DELETE is the shape").toBe(true)
    expect(deletesTrainingRows(deletesAnEnrollment), "an enrollment DELETE is the shape").toBe(true)
    expect(deletesTrainingRows(readsOnly), "reading the live workout is not").toBe(false)
    expect(
      deletesTrainingRows(deletesSomethingElse),
      "deleting a goal is somebody else's account rule, not this one"
    ).toBe(false)
  })
})
