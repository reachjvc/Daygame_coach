import { readFileSync } from "node:fs"
import { describe, expect, test } from "vitest"
import { judge, REQUIRED_CHECKS } from "../../../scripts/ci/commit-checks.mjs"

const run = (name: string, status: string, conclusion: string | null, started_at = "2026-11-20T10:00:00Z") => ({
  name,
  status,
  conclusion,
  started_at,
})

describe("commit-checks: main takes a commit only when both gates passed", () => {
  test("both gates green is a yes", () => {
    expect(judge([run("CI passed", "completed", "success"), run("E2E passed", "completed", "success")]).state).toBe("success")
  })

  test("a missing gate is not a yes: it may not have started yet", () => {
    expect(judge([run("CI passed", "completed", "success")]).state).toBe("pending")
  })

  test("a running gate waits", () => {
    expect(judge([run("CI passed", "in_progress", null), run("E2E passed", "completed", "success")]).state).toBe("pending")
  })

  test("a red gate is a no, also while the other still runs", () => {
    expect(judge([run("CI passed", "completed", "failure"), run("E2E passed", "queued", null)]).state).toBe("failure")
  })

  test("skipped or cancelled is a no, never a pass", () => {
    for (const c of ["skipped", "cancelled", "neutral", "timed_out"]) {
      expect(judge([run("CI passed", "completed", c), run("E2E passed", "completed", "success")]).state).toBe("failure")
    }
  })

  test("after a rerun the newest run of a gate counts", () => {
    const runs = [
      run("CI passed", "completed", "failure", "2026-11-20T10:00:00Z"),
      run("CI passed", "completed", "success", "2026-11-20T10:30:00Z"),
      run("E2E passed", "completed", "success"),
    ]
    expect(judge(runs).state).toBe("success")
  })

  test("other checks with similar names do not count", () => {
    expect(judge([run("unit 1/2", "completed", "success"), run("e2e-fast", "completed", "success")]).state).toBe("pending")
  })

  test("the workflows define the gate jobs under exactly these names", () => {
    const ci = readFileSync(".github/workflows/ci.yml", "utf8")
    const e2e = readFileSync(".github/workflows/e2e.yml", "utf8")
    expect(REQUIRED_CHECKS).toEqual(["CI passed", "E2E passed"])
    expect(ci).toMatch(/^ {2}ci-passed:\n {4}name: CI passed\n {4}needs: \[static, unit, database\]\n {4}if: \$\{\{ always\(\) \}\}$/m)
    expect(e2e).toMatch(/^ {2}e2e-passed:\n(?: {4}#.*\n)* {4}name: \$\{\{ \(github\.event_name != 'push' \|\| github\.ref == 'refs\/heads\/main' \|\| github\.ref == 'refs\/heads\/beta' \|\| startsWith\(github\.ref, 'refs\/heads\/ship-'\)\) && !inputs\.grep && 'E2E passed' \|\| 'E2E quick passed' \}\}\n {4}needs: \[e2e-fast, lanes, timelog-guard, timelog-photos\]$/m)
  })

  test("a light E2E run (a plain branch push, or a dispatch filtered by grep) is not named like the full gate", () => {
    // Branch protection matches "E2E passed" by name on the commit. A light run under that
    // name let its commit onto main without the lanes.
    const e2e = readFileSync(".github/workflows/e2e.yml", "utf8")
    const gate = e2e.match(/^ {2}e2e-passed:\n(?: {4}#.*\n)* {4}name: (.*)$/m)?.[1] ?? ""
    expect(gate).toContain("'E2E quick passed'")
    expect(gate).toContain("!inputs.grep")
    expect(gate).toContain("startsWith(github.ref, 'refs/heads/ship-')")
  })

  test("a queued rerun counts as the newest run, so an older pass cannot stand in for it", () => {
    const old = { ...run("E2E passed", "completed", "success"), started_at: "2026-11-27T00:00:00Z" }
    const queued = { name: "E2E passed", status: "queued", conclusion: null } // no started_at yet, as GitHub sends it
    expect(judge([run("CI passed", "completed", "success"), old, queued]).state).toBe("pending")
  })

  test("Vercel does not deploy the ship-* test branches", () => {
    const vercel = JSON.parse(readFileSync("vercel.json", "utf8"))
    expect(vercel.git.deploymentEnabled["ship-*"]).toBe(false)
  })
})
