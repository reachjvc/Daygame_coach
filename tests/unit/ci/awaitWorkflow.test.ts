// @vitest-environment node
/**
 * THE STAGING IMAGE WAITS FOR THE BROWSER TESTS, AND ONLY A PASS LETS IT GO.
 *
 * `scripts/ci/await-workflow.mjs` stands between a red browser suite and a
 * published image. These drive it with made-up API answers: a run that has not
 * started, one in progress, each way a run can end, a renamed workflow, a
 * GitHub API that keeps failing, and the 45-minute ceiling.
 */

import { describe, it, expect } from "vitest"
import { awaitWorkflow, decide } from "../../../scripts/ci/await-workflow.mjs"

const SHA = "a".repeat(40)
const PATH = ".github/workflows/e2e.yml"
const want = { sha: SHA, path: PATH }

const run = (over: Record<string, unknown>) => ({
  path: PATH,
  head_sha: SHA,
  status: "completed",
  conclusion: "success",
  created_at: "2026-10-13T10:00:00Z",
  html_url: "https://github.com/x/y/actions/runs/1",
  event: "push",
  name: "E2E Tests",
  ...over,
})

describe("decide", () => {
  it("waits while there is no run yet", () => {
    expect(decide([], want).state).toBe("none")
  })

  it("ignores other workflows and other commits", () => {
    const runs = [run({ path: ".github/workflows/ci.yml" }), run({ head_sha: "b".repeat(40) })]
    expect(decide(runs, want).state).toBe("none")
  })

  it("waits while the run is queued or in progress", () => {
    expect(decide([run({ status: "in_progress", conclusion: null })], want).state).toBe("wait")
    expect(decide([run({ status: "queued", conclusion: null })], want).state).toBe("wait")
  })

  it("passes only a run that succeeded", () => {
    expect(decide([run({})], want).state).toBe("pass")
    for (const conclusion of ["failure", "cancelled", "timed_out", "skipped", "neutral", "action_required"]) {
      expect(decide([run({ conclusion })], want).state, conclusion).toBe("fail")
    }
  })

  it("reads the newest run when the commit ran more than once", () => {
    const runs = [
      run({ conclusion: "failure", created_at: "2026-10-13T10:00:00Z" }),
      run({ conclusion: "success", created_at: "2026-10-13T11:00:00Z" }),
    ]
    expect(decide(runs, want).state).toBe("pass")
  })

  it("finds the workflow by its file, whatever it is called", () => {
    expect(decide([run({ name: "Browser tests (renamed)" })], want).state).toBe("pass")
  })
})

describe("awaitWorkflow", () => {
  const clock = () => {
    let t = 0
    return { now: () => t, sleep: async (ms: number) => void (t += ms) }
  }
  const quiet = () => {}

  it("polls until the run passes", async () => {
    const answers = [[], [run({ status: "in_progress", conclusion: null })], [run({})]]
    const c = clock()
    const ok = await awaitWorkflow({
      getRuns: async () => answers.shift() ?? [],
      want,
      timeoutMs: 45 * 60_000,
      pollMs: 30_000,
      ...c,
      log: quiet,
    })
    expect(ok).toBe(true)
    expect(c.now()).toBe(60_000)
  })

  it("fails when the run fails", async () => {
    const ok = await awaitWorkflow({
      getRuns: async () => [run({ conclusion: "failure" })],
      want,
      timeoutMs: 60_000,
      pollMs: 30_000,
      ...clock(),
      log: quiet,
    })
    expect(ok).toBe(false)
  })

  it("gives up at the timeout instead of waiting forever", async () => {
    const c = clock()
    const ok = await awaitWorkflow({
      getRuns: async () => [run({ status: "in_progress", conclusion: null })],
      want,
      timeoutMs: 45 * 60_000,
      pollMs: 30_000,
      ...c,
      log: quiet,
    })
    expect(ok).toBe(false)
    expect(c.now()).toBeLessThanOrEqual(45 * 60_000)
  })

  it("fails after three API errors in a row rather than reading them as a pass", async () => {
    let calls = 0
    const ok = await awaitWorkflow({
      getRuns: async () => {
        calls += 1
        throw new Error("502")
      },
      want,
      timeoutMs: 45 * 60_000,
      pollMs: 30_000,
      ...clock(),
      log: quiet,
    })
    expect(ok).toBe(false)
    expect(calls).toBe(3)
  })
})
