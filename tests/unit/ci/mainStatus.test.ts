// @vitest-environment node
/**
 * THE SESSION-START WARNING SAYS WHEN main IS RED, AND STAYS SILENT OTHERWISE.
 *
 * `scripts/ci/main-status.mjs` reads `gh run list`. These feed its parsing
 * made-up run lists: all green, CI red, an E2E red streak, a cancelled newest
 * run, scheduled runs, an empty list, and the script itself with no `gh`.
 */

import { describe, it, expect } from "vitest"
import { spawnSync } from "node:child_process"
import { findRed, formatLine, firstFailedJob } from "../../../scripts/ci/main-status.mjs"

let id = 100
const run = (workflowName: string, conclusion: string, createdAt: string, over: Record<string, unknown> = {}) => ({
  databaseId: id++,
  workflowName,
  event: "push",
  status: conclusion === "" ? "in_progress" : "completed",
  conclusion,
  createdAt,
  ...over,
})

describe("findRed", () => {
  it("is empty for an empty list or junk", () => {
    expect(findRed([])).toEqual([])
    expect(findRed(undefined as never)).toEqual([])
  })

  it("is empty when both workflows are green", () => {
    expect(findRed([run("CI", "success", "2026-11-18T10:00:00Z"), run("E2E Tests", "success", "2026-11-18T10:00:00Z")])).toEqual([])
  })

  it("reports CI red with its date and run id", () => {
    const failing = run("CI", "failure", "2026-11-18T10:00:00Z")
    const red = findRed([failing, run("CI", "success", "2026-11-17T10:00:00Z"), run("E2E Tests", "success", "2026-11-18T10:00:00Z")])
    expect(red).toEqual([{ workflow: "CI", runId: failing.databaseId, since: "2026-11-18", atLeast: false }])
    expect(formatLine(red[0], "checks")).toBe(`main is red since 2026-11-18: CI checks (run ${failing.databaseId})`)
    expect(formatLine(red[0])).toBe(`main is red since 2026-11-18: CI (run ${failing.databaseId})`)
  })

  it("dates an E2E red streak from its oldest red run", () => {
    const newest = run("E2E Tests", "failure", "2026-11-18T12:00:00Z")
    const red = findRed([
      newest,
      run("E2E Tests", "failure", "2026-11-17T12:00:00Z"),
      run("E2E Tests", "failure", "2026-11-16T12:00:00Z"),
      run("E2E Tests", "success", "2026-11-15T12:00:00Z"),
      run("E2E Tests", "failure", "2026-11-14T12:00:00Z"),
    ])
    expect(red).toEqual([{ workflow: "E2E Tests", runId: newest.databaseId, since: "2026-11-16", atLeast: false }])
  })

  it("skips a cancelled newest run and judges the next finished one", () => {
    expect(findRed([run("CI", "cancelled", "2026-11-18T10:00:00Z"), run("CI", "success", "2026-11-17T10:00:00Z")])).toEqual([])
    const failing = run("CI", "failure", "2026-11-17T10:00:00Z")
    expect(findRed([run("CI", "cancelled", "2026-11-18T10:00:00Z"), failing])).toEqual([
      { workflow: "CI", runId: failing.databaseId, since: "2026-11-17", atLeast: false },
    ])
  })

  it("ignores in-progress, queued, scheduled and manual runs", () => {
    expect(
      findRed([
        run("CI", "", "2026-11-18T10:00:00Z"),
        run("CI", "failure", "2026-11-18T09:00:00Z", { event: "schedule" }),
        run("CI", "failure", "2026-11-18T08:00:00Z", { event: "workflow_dispatch" }),
        run("CI", "success", "2026-11-17T10:00:00Z"),
        run("Nightly checks", "failure", "2026-11-18T10:00:00Z"),
      ]),
    ).toEqual([])
  })

  it("counts a run that never started (startup_failure) as red, not action_required", () => {
    const broken = run("CI", "startup_failure", "2026-11-18T10:00:00Z")
    expect(findRed([broken, run("CI", "success", "2026-11-17T10:00:00Z")])).toEqual([
      { workflow: "CI", runId: broken.databaseId, since: "2026-11-18", atLeast: false },
    ])
    expect(findRed([run("CI", "action_required", "2026-11-18T10:00:00Z"), run("CI", "success", "2026-11-17T10:00:00Z")])).toEqual([])
  })

  it("judges the nightly by its scheduled runs, and says 'since at least' when the window has no green run", () => {
    const night = run("Nightly checks", "failure", "2026-11-18T03:00:00Z", { event: "schedule" })
    expect(findRed([night, run("Nightly checks", "failure", "2026-11-18T09:00:00Z", { event: "push" })]).map((r) => r.workflow)).toEqual(["Nightly checks"])
    const many = Array.from({ length: 30 }, (_, i) => run("CI", "failure", `2026-11-${String(30 - i).padStart(2, "0")}T10:00:00Z`))
    const [red] = findRed(many)
    expect(red.atLeast).toBe(true)
    expect(formatLine(red)).toMatch(/^main is red since at least 2026-11-01: CI /)
    // a short, all-red list is the whole history seen, not a capped window
    expect(findRed(many.slice(0, 3))[0].atLeast).toBe(false)
  })

  it("reports both workflows when both are red", () => {
    expect(findRed([run("CI", "failure", "2026-11-18T10:00:00Z"), run("E2E Tests", "failure", "2026-11-18T10:00:00Z")]).map((r) => r.workflow)).toEqual([
      "CI",
      "E2E Tests",
    ])
  })
})

describe("firstFailedJob", () => {
  it("names the first failed job, or nothing", () => {
    expect(firstFailedJob({ jobs: [{ name: "lint", conclusion: "success" }, { name: "checks", conclusion: "failure" }] })).toBe("checks")
    expect(firstFailedJob({ jobs: [] })).toBeUndefined()
    expect(firstFailedJob(undefined)).toBeUndefined()
  })
})

describe("the script", () => {
  it("prints nothing and exits 0 when gh is missing", () => {
    const res = spawnSync(process.execPath, ["scripts/ci/main-status.mjs"], {
      encoding: "utf8",
      env: { NODE_ENV: "test", PATH: "/nonexistent" },
    })
    expect(res.status).toBe(0)
    expect(res.stdout).toBe("")
  })
})

describe("the burst case (per-workflow query)", () => {
  it("main() asks gh once per workflow, for finished runs, and reports red when the shared list would have hidden it", async () => {
    const dir = (await import("node:fs")).mkdtempSync((await import("node:path")).join((await import("node:os")).tmpdir(), "gh-"))
    const fs = await import("node:fs")
    const ghPath = dir + "/gh"
    // fake gh: a run list answers only for the asked workflow; logs the calls
    fs.writeFileSync(
      ghPath,
      `#!/bin/sh
echo "$@" >> ${dir}/calls
case "$*" in
  *"--workflow CI "*) echo '[{"databaseId":7,"workflowName":"CI","event":"push","status":"completed","conclusion":"failure","createdAt":"2026-11-18T10:00:00Z"}]';;
  *"run view"*) echo '{"jobs":[{"name":"checks","conclusion":"failure"}]}';;
  *) echo '[]';;
esac
`,
      { mode: 0o755 },
    )
    const res = spawnSync(process.execPath, ["scripts/ci/main-status.mjs"], {
      encoding: "utf8",
      env: { NODE_ENV: "test", PATH: `${dir}:/usr/bin:/bin` },
    })
    expect(res.status).toBe(0)
    expect(res.stdout.trim()).toBe("main is red since 2026-11-18: CI checks (run 7)")
    const calls = fs.readFileSync(dir + "/calls", "utf8")
    for (const wf of ["CI", "E2E Tests", "Nightly checks"]) expect(calls).toContain(`--workflow ${wf} `)
    expect(calls).toContain("--status completed")
    fs.rmSync(dir, { recursive: true, force: true })
  })
})
