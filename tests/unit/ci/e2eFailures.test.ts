// @vitest-environment node
/**
 * THE E2E FAILURES LIST KEEPS THE COMMIT A TEST FIRST WENT RED AT.
 *
 * `scripts/ci/e2e-failures.mjs` turns a merged Playwright JSON report plus the previous
 * run's list into the next list: carry forward, new failure, a fixed test dropping out,
 * no previous file, and the 5-run flaky window.
 */
import { describe, it, expect } from "vitest"
import { buildFailures, collectTests, summaryTable } from "../../../scripts/ci/e2e-failures.mjs"

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
