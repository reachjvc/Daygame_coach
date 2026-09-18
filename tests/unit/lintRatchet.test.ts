// @vitest-environment node
/**
 * THE GATE THAT ONLY LETS THE NUMBER GO DOWN — PROVEN, NOT ASSUMED.
 *
 * WHAT A RATCHET IS. `npm run lint:ratchet` counts today's lint errors and
 * compares them with `eslint-baseline.json`, a written-down list of the errors
 * that already existed. A new error fails the run; an old one does not. The
 * whole value of that bargain is the word "new" — if the comparison ever
 * stopped noticing a new error, or if a run where eslint crashed were read as
 * "nothing found", the gate would be green forever and nobody would know.
 *
 * WHY THIS FILE EXISTS. Until now nothing in `npm test` imported
 * `scripts/lib/ratchet.mjs` at all. The promise "may only shrink" was made by a
 * comment and kept by nobody. These tests call the real comparison functions
 * with made-up findings, so the day someone loosens one, the suite says so.
 *
 * WHY process.exit IS STUBBED. `assertCheckerRan` and `applyRatchet` end a bad
 * run by calling `process.exit(1)` rather than throwing — right for a command
 * line tool, fatal inside a test runner, because it would kill the vitest
 * worker mid-file. So each test replaces `process.exit` with something that
 * throws `exit <code>` and then asserts on that message: same decision, visible
 * instead of lethal.
 */

import { describe, test, expect, afterEach, vi } from "vitest"
import { readFileSync, writeFileSync, mkdtempSync, rmSync, existsSync } from "node:fs"
import { tmpdir } from "node:os"
import { join, resolve } from "node:path"
import { excess, assertCheckerRan, applyRatchet } from "../../scripts/lib/ratchet.mjs"

const root = resolve(__dirname, "../..")

/** Run `fn` with `process.exit` turned into a throw, and give back what it threw. */
function exitCodeFrom(fn: () => void): string | null {
  const exit = vi.spyOn(process, "exit").mockImplementation(((code?: number) => {
    throw new Error(`exit ${code}`)
  }) as never)
  // The functions under test print their reason first; the reason is not what
  // is being asserted here, and it would bury the test output.
  const error = vi.spyOn(console, "error").mockImplementation(() => {})
  const warn = vi.spyOn(console, "warn").mockImplementation(() => {})
  const log = vi.spyOn(console, "log").mockImplementation(() => {})
  try {
    fn()
    return null
  } catch (e) {
    return (e as Error).message
  } finally {
    exit.mockRestore()
    error.mockRestore()
    warn.mockRestore()
    log.mockRestore()
  }
}

describe("the lint baseline can only shrink", () => {
  const baselined = { "a.ts": { "prefer-const: 'x' is never reassigned.": 1 } }

  test("one signature the baseline lacks is reported as new", () => {
    expect(excess({ "a.ts": { "no-undef: 'y' is not defined.": 1 } }, baselined)).toEqual([
      "a.ts: no-undef: 'y' is not defined.",
    ])
    // Same file, same rule, same count: nothing new, nothing reported.
    expect(excess(baselined, baselined)).toEqual([])
    // A file the baseline has never heard of is new in full.
    expect(excess({ "b.ts": { "prefer-const: 'x' is never reassigned.": 1 } }, baselined)).toEqual([
      "b.ts: prefer-const: 'x' is never reassigned.",
    ])
  })

  test("a count above the baselined count is new, and says how many", () => {
    const [line] = excess({ "a.ts": { "prefer-const: 'x' is never reassigned.": 3 } }, baselined)
    expect(line).toContain("a.ts: prefer-const")
    expect(line).toContain("x2 more than baselined")
  })
})

describe("a checker that did not run is not a checker that found nothing", () => {
  const ctx = { tool: "eslint", okStatuses: [0, 1], found: 3, output: "" }

  test("a crash, a kill signal, or a failure with no findings all fail the run", () => {
    // status 2 is eslint's own crash/config failure, not "checked, found problems".
    expect(exitCodeFrom(() => assertCheckerRan({ status: 2 }, ctx))).toBe("exit 1")
    // Killed part-way — usually out of memory. Its report is incomplete.
    expect(exitCodeFrom(() => assertCheckerRan({ status: null as unknown as number, signal: "SIGKILL" }, ctx))).toBe(
      "exit 1",
    )
    // "I failed" plus "I found nothing" is a configuration failure wearing a pass.
    expect(exitCodeFrom(() => assertCheckerRan({ status: 1 }, { ...ctx, found: 0 }))).toBe("exit 1")
    // Could not even be started.
    expect(exitCodeFrom(() => assertCheckerRan({ status: 0, error: new Error("ENOENT") }, ctx))).toBe("exit 1")
  })

  test("a real run that found real problems is allowed through", () => {
    expect(exitCodeFrom(() => assertCheckerRan({ status: 1 }, ctx))).toBe(null)
    expect(exitCodeFrom(() => assertCheckerRan({ status: 0 }, { ...ctx, found: 0 }))).toBe(null)
  })
})

describe("--update refuses to write a baseline that accepts a new error", () => {
  let dir: string | null = null
  afterEach(() => {
    if (dir) rmSync(dir, { recursive: true, force: true })
    dir = null
  })

  function tempBaseline() {
    dir = mkdtempSync(join(tmpdir(), "ratchet-"))
    const path = join(dir, "baseline.json")
    writeFileSync(
      path,
      JSON.stringify({
        _format: "test-v1",
        total: 1,
        files: { "a.ts": { "prefer-const: 'x' is never reassigned.": 1 } },
      }),
    )
    return path
  }

  const args = (path: string, current: Record<string, Record<string, number>>, acceptNew: boolean) => ({
    path,
    format: "test-v1",
    comment: "test",
    current,
    total: Object.values(current).reduce((n, sigs) => n + Object.values(sigs).reduce((m, c) => m + c, 0), 0),
    noun: "lint error",
    label: "Lint errors",
    update: true,
    acceptNew,
    regenerate: "node scripts/lint-ratchet.mjs --update",
  })

  test("a new finding stops the regeneration, and the file on disk is untouched", () => {
    const path = tempBaseline()
    const before = readFileSync(path, "utf8")
    const current = { "a.ts": { "prefer-const: 'x' is never reassigned.": 1, "no-undef: 'y' is not defined.": 1 } }
    expect(exitCodeFrom(() => applyRatchet(args(path, current, false)))).toBe("exit 1")
    expect(readFileSync(path, "utf8")).toBe(before)
  })

  test("--accept-new writes it, so blessing an error is a visible decision", () => {
    const path = tempBaseline()
    const current = { "a.ts": { "prefer-const: 'x' is never reassigned.": 1, "no-undef: 'y' is not defined.": 1 } }
    expect(exitCodeFrom(() => applyRatchet(args(path, current, true)))).toBe("exit 0")
    expect(JSON.parse(readFileSync(path, "utf8")).files["a.ts"]["no-undef: 'y' is not defined."]).toBe(1)
  })

  test("a shrinking baseline is written without any flag", () => {
    const path = tempBaseline()
    expect(exitCodeFrom(() => applyRatchet(args(path, {}, false)))).toBe("exit 0")
    expect(JSON.parse(readFileSync(path, "utf8")).total).toBe(0)
  })
})

describe("what the real baseline is allowed to contain", () => {
  const baseline = JSON.parse(readFileSync(join(root, "eslint-baseline.json"), "utf8")) as {
    files: Record<string, Record<string, number>>
  }
  const files = Object.keys(baseline.files)

  /**
   * The training feature is the one being rebuilt, so it is the one place where
   * "there is a known error here, ignore it" is not acceptable: its own tests
   * carried nine unused variables and two `let`s that should have been `const`,
   * excused by the baseline, in the files that are meant to be its proof.
   */
  test("the lint baseline excuses nothing in the training slice", () => {
    const trainingPrefixes = [
      "src/programs/",
      "app/programs/",
      "src/health/",
      "app/api/workouts/",
      "app/api/programs/",
      "app/api/health/",
      "tests/unit/programs/",
      "tests/unit/health/",
      "tests/e2e/programs-",
      "tests/e2e/dashboard-training-card",
      "tests/e2e/mobile/mobile-training",
      "tests/e2e/life-mastery-",
      "tests/e2e/health-",
      "tests/e2e/helpers/training",
    ]
    const trainingFiles = [
      "src/db/workoutRepo.ts",
      "src/db/programRepo.ts",
      "src/db/healthRepo.ts",
      "src/db/settingsRepo.ts",
    ]
    const excused = files.filter((f) => trainingPrefixes.some((p) => f.startsWith(p)) || trainingFiles.includes(f))
    expect(excused, "fix these rather than baselining them — the training slice is lint-clean").toEqual([])
  })

  /**
   * A baseline entry for a deleted file is debt that can never be paid off: it
   * sits in the total forever and nobody can find the code it describes.
   * Deleting a file has to make the number go down honestly.
   */
  test("the baseline names only files that exist", () => {
    const missing = files.filter((f) => !existsSync(join(root, f)))
    expect(missing, "regenerate with: node scripts/lint-ratchet.mjs --update").toEqual([])
  })
})
