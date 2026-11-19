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
import * as fs from "node:fs"
import * as os from "node:os"
import * as path from "node:path"
import { findRed, formatLine, firstFailedJob, formatFailures } from "../../../scripts/ci/main-status.mjs"

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

describe("the live check (deployment_status runs)", () => {
  const live = (conclusion: string, createdAt: string) =>
    run("Live check", conclusion, createdAt, { event: "deployment_status" })

  it("reports a red live check, and ignores the skipped runs a Preview deploy leaves", () => {
    const failing = live("failure", "2026-11-19T10:00:00Z")
    const red = findRed([live("skipped", "2026-11-19T11:00:00Z"), failing, live("success", "2026-11-18T10:00:00Z")])
    expect(red).toEqual([{ workflow: "Live check", runId: failing.databaseId, since: "2026-11-19", atLeast: false }])
    expect(formatLine(red[0])).toBe(`main is red since 2026-11-19: Live check (run ${failing.databaseId})`)
  })

  it("is quiet when the newest finished live check is green (superseded runs end green)", () => {
    expect(findRed([live("success", "2026-11-19T10:00:00Z"), live("failure", "2026-11-18T10:00:00Z")])).toEqual([])
  })

  it("does not count a live-check run of another event", () => {
    expect(findRed([run("Live check", "failure", "2026-11-19T10:00:00Z")])).toEqual([])
  })

  it("asks gh for it without a branch filter, in the same parallel round", async () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "gh-live-"))
    fs.writeFileSync(
      dir + "/gh",
      `#!/bin/sh
echo "$@" >> ${dir}/calls
case "$*" in
  *"--workflow Live check "*) echo '[{"databaseId":55,"workflowName":"Live check","event":"deployment_status","status":"completed","conclusion":"failure","createdAt":"2026-11-19T10:00:00Z"}]';;
  *"run view"*) echo '{"jobs":[{"name":"live","conclusion":"failure"}]}';;
  *) echo '[]';;
esac
`,
      { mode: 0o755 },
    )
    const res = spawnSync(process.execPath, ["scripts/ci/main-status.mjs"], { encoding: "utf8", env: { NODE_ENV: "test", PATH: `${dir}:/usr/bin:/bin` } })
    expect(res.status).toBe(0)
    expect(res.stdout.trim()).toBe("main is red since 2026-11-19: Live check live (run 55)")
    const calls = fs.readFileSync(dir + "/calls", "utf8").split("\n").filter((l) => l.includes("--workflow Live check "))
    expect(calls).toHaveLength(1)
    expect(calls[0]).toContain("--event deployment_status")
    expect(calls[0]).not.toContain("--branch")
    fs.rmSync(dir, { recursive: true, force: true })
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

describe("formatFailures", () => {
  const f = (id: string, firstSha: string | null, firstSubject: string | null = null) => ({ id, project: "desktop", firstSha, firstSubject, firstRunId: 1 })
  it("groups by first red commit, biggest first, and names an example", () => {
    const lines = formatFailures({
      failed: [
        f("e2e/cold-open.spec.ts:192 a", "886a1721ffff", "Plan new: V1 sequence"),
        f("e2e/programs.spec.ts:191 b", "3423892fffff", "Rebrand Phase 7: Training card on Your day"),
        f("e2e/programs.spec.ts:200 c", "3423892fffff", "Rebrand Phase 7: Training card on Your day"),
      ],
      flaky: [{ id: "e2e/audit.spec.ts:411 x", project: "desktop", last5: [true, false, true, true, false] }],
    })
    expect(lines).toEqual([
      '  2 tests first red at 3423892f "Rebrand Phase 7: Training card on You…" (e.g. programs.spec.ts:191)',
      '  1 test first red at 886a1721 "Plan new: V1 sequence" (e.g. cold-open.spec.ts:192)',
      "  flaky on main: audit.spec.ts:411 (3 of 5 runs)",
    ])
  })
  it("says so when the start is unknown, caps at 3 groups, ignores a test that flaked once", () => {
    const lines = formatFailures({
      failed: [f("a.spec.ts:1 a", null), f("b.spec.ts:1 b", "1"), f("c.spec.ts:1 c", "2"), f("d.spec.ts:1 d", "3")],
      flaky: [{ id: "z.spec.ts:1 z", project: "p", last5: [true, false, false] }],
    })
    expect(lines).toHaveLength(3)
    expect(lines.join("\n")).toContain("red since before tracking began")
    expect(lines.join("\n")).not.toContain("flaky")
  })
  it("names the commit range when the list before sat several commits back, apart from exact starts", () => {
    const lines = formatFailures({
      failed: [
        { ...f("e2e/a.spec.ts:1 a", "d75c752fffff", "Quit: tool 8 copy"), afterSha: "c38e0657ffff", afterRunId: 7, commits: 8 },
        { ...f("e2e/b.spec.ts:2 b", "d75c752fffff", "Quit: tool 8 copy"), afterSha: "c38e0657ffff", afterRunId: 7, commits: 8 },
        f("e2e/c.spec.ts:3 c", "d75c752fffff", "Quit: tool 8 copy"),
        { ...f("e2e/d.spec.ts:4 d", "eeeeeeeeffff", "Other"), afterSha: "d75c752fffff", afterRunId: 8, commits: null },
      ],
      flaky: [],
    })
    expect(lines).toEqual([
      '  2 tests first red between c38e0657 and d75c752f "Quit: tool 8 copy" (8 commits) (e.g. a.spec.ts:1)',
      '  1 test first red at d75c752f "Quit: tool 8 copy" (e.g. c.spec.ts:3)',
      '  1 test first red between d75c752f and eeeeeeee "Other" (e.g. d.spec.ts:4)',
    ])
  })
  it("prints nothing for a green list or junk", () => {
    expect(formatFailures({ failed: [], flaky: [] })).toEqual([])
    expect(formatFailures(undefined)).toEqual([])
    expect(formatFailures({ failed: [null, { id: 5 }] })).toEqual([])
  })
})

describe("the script with the failures artifact", () => {
  const redRun = JSON.stringify([{ databaseId: 9, workflowName: "E2E Tests", event: "push", status: "completed", conclusion: "failure", createdAt: "2026-11-19T10:00:00Z" }])
  const failures = (failed: unknown[]) => JSON.stringify({ failed, flaky: [] })
  const run = (dir: string, extra: Record<string, string>) =>
    spawnSync(process.execPath, ["scripts/ci/main-status.mjs"], { encoding: "utf8", env: { NODE_ENV: "test", PATH: "/nonexistent", ...extra } })

  it("prints the grouped line after the red line (fixtures)", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "ms-"))
    fs.writeFileSync(dir + "/runs.json", redRun)
    fs.writeFileSync(dir + "/f.json", failures([{ id: "x/a.spec.ts:7 t", project: "d", firstSha: "abcdef1234", firstSubject: "Break it", firstRunId: 3 }]))
    const res = run(dir, { MAIN_STATUS_FIXTURE: dir + "/runs.json", MAIN_STATUS_FAILURES_FIXTURE: dir + "/f.json" })
    expect(res.status).toBe(0)
    expect(res.stdout.trim().split("\n")).toEqual([
      "main is red since 2026-11-19: E2E Tests (run 9)",
      '  1 test first red at abcdef12 "Break it" (e.g. a.spec.ts:7)',
    ])
    fs.rmSync(dir, { recursive: true, force: true })
  })
  it("prints the range line after the red line (fixtures)", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "ms-"))
    fs.writeFileSync(dir + "/runs.json", redRun)
    fs.writeFileSync(dir + "/f.json", failures([{ id: "x/a.spec.ts:7 t", project: "d", firstSha: "abcdef1234", firstSubject: "Break it", firstRunId: 3, afterSha: "0123456789", afterRunId: 2, commits: 6 }]))
    const res = run(dir, { MAIN_STATUS_FIXTURE: dir + "/runs.json", MAIN_STATUS_FAILURES_FIXTURE: dir + "/f.json" })
    expect(res.status).toBe(0)
    expect(res.stdout.trim().split("\n")).toEqual([
      "main is red since 2026-11-19: E2E Tests (run 9)",
      '  1 test first red between 01234567 and abcdef12 "Break it" (6 commits) (e.g. a.spec.ts:7)',
    ])
    fs.rmSync(dir, { recursive: true, force: true })
  })
  it("prints nothing for a green fixture", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "ms-"))
    fs.writeFileSync(dir + "/runs.json", redRun.replace("failure", "success"))
    fs.writeFileSync(dir + "/f.json", failures([{ id: "a:1 t", project: "d", firstSha: "abc", firstSubject: "x", firstRunId: 3 }]))
    expect(run(dir, { MAIN_STATUS_FIXTURE: dir + "/runs.json", MAIN_STATUS_FAILURES_FIXTURE: dir + "/f.json" }).stdout).toBe("")
    fs.rmSync(dir, { recursive: true, force: true })
  })
  it("keeps just the red line when the artifact is missing, broken, or gh is slow", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "ms-"))
    const redOnly = "main is red since 2026-11-19: E2E Tests (run 9)"
    // missing artifact: gh run download fails
    // slow: gh sleeps far longer than the budget on download
    fs.writeFileSync(
      dir + "/gh",
      `#!/bin/sh
case "$*" in
  *"run list"*"E2E Tests"*) echo '${redRun}';;
  *"run list"*) echo '[]';;
  *"run view"*) echo '{"jobs":[]}';;
  *"run download"*) if [ -f ${dir}/slow ]; then sleep 30; else exit 1; fi;;
esac
`,
      { mode: 0o755 },
    )
    const env = { PATH: `${dir}:/usr/bin:/bin` }
    let res = run(dir, env)
    expect(res.status).toBe(0)
    expect(res.stdout.trim()).toBe(redOnly)
    fs.writeFileSync(dir + "/slow", "")
    const t0 = Date.now()
    res = run(dir, env)
    expect(Date.now() - t0).toBeLessThan(5000)
    expect(res.status).toBe(0)
    expect(res.stdout.trim()).toBe(redOnly)
    fs.rmSync(dir, { recursive: true, force: true })
  })
})
