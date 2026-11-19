// @vitest-environment node
/**
 * THE E2E FAILURES LIST KEEPS THE COMMIT A TEST FIRST WENT RED AT.
 *
 * `scripts/ci/e2e-failures.mjs` turns a merged Playwright JSON report plus the previous
 * run's list into the next list: carry forward, new failure, a fixed test dropping out,
 * no previous file, and the 5-run flaky window. Also which earlier run's list counts as the
 * previous file (cancelled runs keep none), and the commit range a new failure is blamed on
 * when that file sits several commits back.
 */
import { describe, it, expect } from "vitest"
import { spawnSync } from "node:child_process"
import * as fs from "node:fs"
import * as os from "node:os"
import * as path from "node:path"
import { buildFailures, collectTests, previousRunCandidates, summaryTable } from "../../../scripts/ci/e2e-failures.mjs"
import { formatFailures } from "../../../scripts/ci/main-status.mjs"

type T = [file: string, line: number, title: string, status: string, project?: string]
const report = (tests: T[]) => ({
  suites: [
    {
      title: "root",
      specs: [],
      suites: tests.map(([file, line, title, status, project = "desktop"]) => ({
        title: file,
        specs: [{ file, line, title, tests: [{ projectName: project, status, results: [] }] }],
      })),
    },
  ],
})
const ctx = { sha: "bbbbbbbbbbbb", subject: "Second commit", runId: 2 }
const prev = (over = {}) => ({
  sha: "aaaaaaaaaaaa",
  subject: "First commit",
  runId: 1,
  failed: [{ id: "a.spec.ts:1 one", project: "desktop", firstSha: "0000000000", firstSubject: "Old", firstRunId: 0 }],
  flaky: [],
  ...over,
})

describe("collectTests", () => {
  it("reads unexpected as failed and flaky as flaky, nested suites too, ignores the rest", () => {
    const r = collectTests({
      suites: [{ title: "x", suites: [{ title: "y", specs: [{ file: "a.spec.ts", line: 3, title: "t", tests: [{ projectName: "p", status: "unexpected" }, { projectName: "q", status: "flaky" }, { projectName: "r", status: "expected" }, { projectName: "s", status: "skipped" }] }] }] }],
    })
    expect(r.failed).toEqual([{ id: "a.spec.ts:3 t", project: "p" }])
    expect(r.flaky).toEqual([{ id: "a.spec.ts:3 t", project: "q" }])
  })
  it("survives an empty or junk report", () => {
    expect(collectTests({})).toEqual({ failed: [], flaky: [] })
    expect(collectTests(undefined)).toEqual({ failed: [], flaky: [] })
  })
})

describe("buildFailures", () => {
  it("carries the first red commit forward when a test fails in both runs", () => {
    const r = buildFailures(report([["a.spec.ts", 1, "one", "unexpected"]]), prev(), ctx)
    expect(r.failed).toEqual([{ id: "a.spec.ts:1 one", project: "desktop", firstSha: "0000000000", firstSubject: "Old", firstRunId: 0 }])
    expect(r).toMatchObject({ sha: "bbbbbbbbbbbb", subject: "Second commit", runId: 2 })
  })
  it("gives a new failure this run's commit", () => {
    const r = buildFailures(report([["a.spec.ts", 1, "one", "unexpected"], ["b.spec.ts", 2, "two", "unexpected"]]), prev(), ctx)
    expect(r.failed.find((f: { id: string }) => f.id.startsWith("b.spec.ts"))).toMatchObject({ firstSha: "bbbbbbbbbbbb", firstSubject: "Second commit", firstRunId: 2 })
    expect(r.failed.find((f: { id: string }) => f.id.startsWith("a.spec.ts"))?.firstSha).toBe("0000000000")
  })
  it("treats the same title in another project as another test", () => {
    const r = buildFailures(report([["a.spec.ts", 1, "one", "unexpected", "android"]]), prev(), ctx)
    expect(r.failed).toHaveLength(1)
    expect(r.failed[0].firstSha).toBe("bbbbbbbbbbbb")
  })
  it("a test that moved lines keeps its firstSha and shows the new line", () => {
    const r = buildFailures(report([["a.spec.ts", 42, "one", "unexpected"]]), prev(), ctx)
    expect(r.failed).toEqual([{ id: "a.spec.ts:42 one", project: "desktop", firstSha: "0000000000", firstSubject: "Old", firstRunId: 0 }])
  })
  it("a flaky test that moved lines keeps its window", () => {
    const first = buildFailures(report([["f.spec.ts", 9, "f", "flaky"]]), undefined, ctx)
    const next = buildFailures(report([["f.spec.ts", 20, "f", "flaky"]]), first, ctx)
    expect(next.flaky).toEqual([{ id: "f.spec.ts:20 f", project: "desktop", last5: [true, true] }])
  })
  it("drops a test that passed", () => {
    expect(buildFailures(report([["a.spec.ts", 1, "one", "expected"]]), prev(), ctx).failed).toEqual([])
  })
  it("with no previous file the first commit is null", () => {
    const r = buildFailures(report([["a.spec.ts", 1, "one", "unexpected"]]), undefined, ctx)
    expect(r.failed[0]).toMatchObject({ firstSha: null, firstSubject: null, firstRunId: null })
  })
  it("builds the flaky window: starts, carries, caps at 5, drops when clean", () => {
    let list: ReturnType<typeof buildFailures> = buildFailures(report([["f.spec.ts", 9, "f", "flaky"]]), undefined, ctx)
    expect(list.flaky).toEqual([{ id: "f.spec.ts:9 f", project: "desktop", last5: [true] }])
    list = buildFailures(report([["f.spec.ts", 9, "f", "expected"]]), list, ctx)
    expect(list.flaky[0].last5).toEqual([true, false])
    list = buildFailures(report([["f.spec.ts", 9, "f", "flaky"]]), list, ctx)
    expect(list.flaky[0].last5).toEqual([true, false, true])
    for (let i = 0; i < 2; i++) list = buildFailures(report([]), list, ctx)
    expect(list.flaky[0].last5).toEqual([true, false, true, false, false])
    list = buildFailures(report([]), list, ctx)
    expect(list.flaky[0].last5).toEqual([false, true, false, false, false])
    list = buildFailures(report([]), list, ctx)
    expect(list.flaky[0].last5).toEqual([true, false, false, false, false])
    list = buildFailures(report([]), list, ctx)
    expect(list.flaky).toEqual([])
  })
  it("renders a summary table", () => {
    const md = summaryTable(buildFailures(report([["a.spec.ts", 1, "one", "unexpected"]]), prev(), ctx))
    expect(md).toContain("| a.spec.ts:1 one | desktop | 00000000 Old |")
  })
})

// main's real E2E push runs on 2026-11-19, newest first (`gh run list -w e2e.yml -b main -e push`).
// Run 44604232598 (d75c752f) once tried only the 5 newest completed runs, all cancelled, so its
// 15 new failures were blamed on nobody.
const realRuns = [
  [44606174105, "df3880da", "failure"],
  [44605700407, "3a1fe1f0", "cancelled"],
  [44605647359, "a6e6b4b5", "cancelled"],
  [44605491885, "0e760f46", "cancelled"],
  [44604904515, "c57a214b", "cancelled"],
  [44604671128, "8dcf466b", "cancelled"],
  [44604232598, "d75c752f", "failure"],
  [44604120982, "6425d9b6", "cancelled"],
  [44604079420, "ee1ae8db", "cancelled"],
  [44603532248, "48d242d6", "cancelled"],
  [44603410525, "f5e02383", "cancelled"],
  [44602619207, "c38e0657", "failure"],
  [44602388480, "3260a2db", "cancelled"],
  [44602300565, "fc0365f7", "cancelled"],
  [44601062979, "1782fe5c", "cancelled"],
  [44601036458, "300cea02", "cancelled"],
  [44600730312, "114b5de7", "failure"],
  [44599822013, "336513ba", "cancelled"],
  [44599561980, "86b46c85", "failure"],
  [44598007336, "2ae85b01", "failure"],
  [44596562185, "7c956d55", "failure"],
] as const
const apiRuns = (rows: readonly (readonly [number, string, string])[]) => ({
  workflow_runs: rows.map(([id, sha, conclusion]) => ({ id, head_sha: sha, status: "completed", conclusion })),
})

describe("previousRunCandidates", () => {
  it("skips cancelled runs, so a run behind 4 cancelled ones still finds the last finished run", () => {
    // d75c752f's run: the 4 runs before it were cancelled; c38e0657's run (44602619207) is next.
    expect(previousRunCandidates(apiRuns(realRuns), 44604232598)).toEqual([44602619207, 44600730312, 44599561980, 44598007336, 44596562185])
    // df3880da's run: 5 cancelled runs before it, then d75c752f's.
    expect(previousRunCandidates(apiRuns(realRuns), 44606174105)[0]).toBe(44604232598)
  })
  it("ignores this run and newer ones, skipped and startup_failure runs, and runs not finished", () => {
    const runs = apiRuns([
      [50, "n", "failure"],
      [40, "t", "failure"],
      [39, "s", "skipped"],
      [38, "u", "startup_failure"],
      [37, "o", "timed_out"],
      [36, "p", "success"],
    ])
    runs.workflow_runs.push({ id: 35, head_sha: "q", status: "in_progress", conclusion: null as never })
    expect(previousRunCandidates(runs, 40)).toEqual([37, 36])
  })
  it("tries at most 5, newest first, and survives junk", () => {
    const many = apiRuns(Array.from({ length: 9 }, (_, i) => [10 + i, String(i), "failure"] as const))
    expect(previousRunCandidates(many, 100)).toEqual([18, 17, 16, 15, 14])
    expect(previousRunCandidates(undefined, 1)).toEqual([])
    expect(previousRunCandidates({ workflow_runs: [null, { id: "x" }] }, 5)).toEqual([])
  })
  it("the CLI prints one run id per line", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "prev-runs-"))
    fs.writeFileSync(dir + "/runs.json", JSON.stringify(apiRuns(realRuns)))
    const res = spawnSync(process.execPath, ["scripts/ci/e2e-failures.mjs", "--previous-runs", dir + "/runs.json", "44604232598"], { encoding: "utf8", env: { NODE_ENV: "test", PATH: "/nonexistent" } })
    expect(res.status).toBe(0)
    expect(res.stdout.trim().split("\n")[0]).toBe("44602619207")
    fs.rmSync(dir, { recursive: true, force: true })
  })
})

describe("a new failure after a gap of cancelled runs names the commit range", () => {
  it("records the previous list's commit and the commit count; a test red in both keeps its range", () => {
    const r = buildFailures(report([["a.spec.ts", 1, "one", "unexpected"], ["b.spec.ts", 2, "two", "unexpected"]]), prev(), { ...ctx, rangeCommits: 4 })
    expect(r.previous).toEqual({ sha: "aaaaaaaaaaaa", runId: 1 })
    expect(r.failed.find((f: { id: string }) => f.id.startsWith("b.spec.ts"))).toEqual({
      id: "b.spec.ts:2 two",
      project: "desktop",
      firstSha: "bbbbbbbbbbbb",
      firstSubject: "Second commit",
      firstRunId: 2,
      afterSha: "aaaaaaaaaaaa",
      afterRunId: 1,
      commits: 4,
    })
    // the older failure keeps its exact start, with no range added
    expect(r.failed.find((f: { id: string }) => f.id.startsWith("a.spec.ts"))).toEqual(prev().failed[0])
    const next = buildFailures(report([["b.spec.ts", 2, "two", "unexpected"]]), r, { sha: "cccccccccccc", subject: "Third", runId: 3, rangeCommits: 1 })
    expect(next.failed[0]).toMatchObject({ firstSha: "bbbbbbbbbbbb", afterSha: "aaaaaaaaaaaa", afterRunId: 1, commits: 4 })
  })
  it("a range of one commit is that commit alone, no range fields", () => {
    const r = buildFailures(report([["b.spec.ts", 2, "two", "unexpected"]]), prev(), { ...ctx, rangeCommits: 1 })
    expect(r.failed[0]).toEqual({ id: "b.spec.ts:2 two", project: "desktop", firstSha: "bbbbbbbbbbbb", firstSubject: "Second commit", firstRunId: 2 })
  })
  it("an unknown count still names the range, with commits null", () => {
    const r = buildFailures(report([["b.spec.ts", 2, "two", "unexpected"]]), prev(), ctx)
    expect(r.failed[0]).toMatchObject({ firstSha: "bbbbbbbbbbbb", afterSha: "aaaaaaaaaaaa", commits: null })
    expect(summaryTable(r)).toContain("| b.spec.ts:2 two | desktop | between aaaaaaaa and bbbbbbbb Second commit |")
  })
  it("no previous file stays 'before tracking began' with no range and previous null", () => {
    const r = buildFailures(report([["b.spec.ts", 2, "two", "unexpected"]]), undefined, { ...ctx, rangeCommits: 7 })
    expect(r.previous).toBeNull()
    expect(r.failed[0]).toEqual({ id: "b.spec.ts:2 two", project: "desktop", firstSha: null, firstSubject: null, firstRunId: null })
  })
  it("reproduces main on 2026-11-19: 13 red at c38e0657, 7 cancelled runs, 28 red at d75c752f", () => {
    const old13: T[] = Array.from({ length: 13 }, (_, i) => [`e2e/old-${i}.spec.ts`, 10, `old ${i}`, "unexpected"])
    const new15: T[] = Array.from({ length: 15 }, (_, i) => [`e2e/new-${i}.spec.ts`, 20, `new ${i}`, "unexpected"])
    // c38e0657's run found no earlier list: its 13 are "before tracking began".
    const atC38 = buildFailures(report(old13), undefined, { sha: "c38e0657aaaa", subject: "Commit c38", runId: 44602619207 })
    // d75c752f's run: the lookup now skips the cancelled runs and lands on c38e0657's run.
    const lists: Record<number, unknown> = { 44602619207: atC38 }
    const used = previousRunCandidates(apiRuns(realRuns), 44604232598).find((id) => lists[id])
    expect(used).toBe(44602619207)
    const atD75 = buildFailures(report([...old13, ...new15]), lists[used!], { sha: "d75c752fbbbb", subject: "Commit d75", runId: 44604232598, rangeCommits: 8 })
    expect(atD75.failed).toHaveLength(28)
    expect(atD75.failed.filter((f: { firstSha: string | null }) => f.firstSha === null)).toHaveLength(13)
    const blamed = atD75.failed.filter((f: { firstSha: string | null }) => f.firstSha !== null)
    expect(blamed).toHaveLength(15)
    for (const f of blamed) expect(f).toMatchObject({ firstSha: "d75c752fbbbb", afterSha: "c38e0657aaaa", afterRunId: 44602619207, commits: 8 })
    expect(formatFailures(atD75)).toEqual([
      '  15 tests first red between c38e0657 and d75c752f "Commit d75" (8 commits) (e.g. new-0.spec.ts:20)',
      "  13 tests red since before tracking began (e.g. old-0.spec.ts:10)",
    ])
  })
})
