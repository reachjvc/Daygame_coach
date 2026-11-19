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
const want = { sha: SHA, path: PATH, branch: "main" }

const run = (over: Record<string, unknown>) => ({
  path: PATH,
  head_sha: SHA,
  status: "completed",
  conclusion: "success",
  created_at: "2026-10-13T10:00:00Z",
  html_url: "https://github.com/x/y/actions/runs/1",
  event: "push",
  head_branch: "main",
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

  it("ignores another branch's run of the same commit, which may be newer and still running", () => {
    // Reported by daygame-coach-ff when staging published from training-rebuild:
    // a second branch at the same commit has a run of its own, and the wait
    // would time out on it.
    const runs = [
      run({ conclusion: "success", created_at: "2026-10-13T10:00:00Z" }),
      run({ head_branch: "beta", status: "in_progress", conclusion: null, created_at: "2026-10-13T11:00:00Z" }),
    ]
    expect(decide(runs, want).state).toBe("pass")
  })

  it("counts only push runs, not a manual or scheduled run of the same commit", () => {
    expect(decide([run({ event: "workflow_dispatch" })], want).state).toBe("none")
    expect(decide([run({ event: "schedule" })], want).state).toBe("none")
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

  it("a run still queued at the timeout ends neutral (unfinished), not red, when the caller asks", async () => {
    let unfinished = false
    const lines: string[] = []
    const ok = await awaitWorkflow({
      getRuns: async () => [run({ status: "pending", conclusion: null })],
      onUnfinished: () => void (unfinished = true),
      want,
      timeoutMs: 45 * 60_000,
      pollMs: 30_000,
      ...clock(),
      log: (l: string) => void lines.push(l),
    })
    expect(ok).toBe(true)
    expect(unfinished).toBe(true)
    expect(lines.join("\n")).toMatch(/not failed/)
  })

  it("unfinished never covers a red run, a run that never appeared, or a broken API", async () => {
    for (const getRuns of [
      async () => [run({ conclusion: "failure" })],
      async () => [run({ conclusion: "timed_out" })],
      async () => [],
      async () => {
        throw new Error("502")
      },
    ]) {
      let unfinished = false
      const ok = await awaitWorkflow({
        getRuns,
        onUnfinished: () => void (unfinished = true),
        want,
        timeoutMs: 45 * 60_000,
        pollMs: 30_000,
        ...clock(),
        log: quiet,
      })
      expect(ok).toBe(false)
      expect(unfinished).toBe(false)
    }
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

describe("a run cancelled because main moved on (superseded)", () => {
  const clock = () => {
    let t = 0
    return { now: () => t, sleep: async (ms: number) => void (t += ms) }
  }
  const cancelled = [run({ conclusion: "cancelled" })]
  const go = async (opts: { getTip?: () => Promise<string>; runs?: Array<object> }) => {
    const lines: string[] = []
    let superseded = false
    const ok = await awaitWorkflow({
      getRuns: async () => opts.runs ?? cancelled,
      getTip: opts.getTip,
      onSuperseded: () => void (superseded = true),
      want,
      timeoutMs: 60_000,
      pollMs: 30_000,
      ...clock(),
      log: (l) => void lines.push(l),
    })
    return { ok, superseded, lines }
  }

  it("ends successfully, says so, and flags that nothing is to be published", async () => {
    const r = await go({ getTip: async () => "b".repeat(40) })
    expect(r.ok).toBe(true)
    expect(r.superseded).toBe(true)
    expect(r.lines.join("\n")).toMatch(/superseded/)
  })

  it("still fails when the cancelled commit is still main's tip", async () => {
    const r = await go({ getTip: async () => SHA })
    expect(r.ok).toBe(false)
    expect(r.superseded).toBe(false)
  })

  it("still fails when main's tip cannot be read", async () => {
    const r = await go({
      getTip: async () => {
        throw new Error("502")
      },
    })
    expect(r.ok).toBe(false)
    expect(r.superseded).toBe(false)
  })

  it("still fails when it was told nothing about main's tip", async () => {
    expect((await go({})).ok).toBe(false)
  })

  it("only a cancellation can be superseded: a red run on a commit main has left is still red", async () => {
    for (const conclusion of ["failure", "timed_out", "skipped", "neutral", "action_required"]) {
      const r = await go({ runs: [run({ conclusion })], getTip: async () => "b".repeat(40) })
      expect(r.ok, conclusion).toBe(false)
      expect(r.superseded, conclusion).toBe(false)
    }
  })

  it("decide marks a cancellation, and only that, as one", () => {
    expect(decide(cancelled, want).cancelled).toBe(true)
    expect(decide([run({ conclusion: "failure" })], want).cancelled).toBe(false)
  })
})
