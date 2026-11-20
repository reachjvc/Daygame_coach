// @vitest-environment node
/**
 * THE POLL THAT WAITS FOR THE LIVE SITE TO RUN THE DEPLOYED COMMIT (scripts/ci/live-wait.mjs).
 * A fake fetch plays /api/healthz, a fake clock and sleep keep it instant.
 */

import { describe, it, expect } from "vitest"
import { waitForBuild, githubIsNewer } from "../../../scripts/ci/live-wait.mjs"

const SHA = "a".repeat(40)
const OLD = "b".repeat(40)
const NEWER = "c".repeat(40)

/** healthz answers one entry per call (a build id, a status number, or "down"); the last repeats. */
function healthz(answers: Array<string | number>) {
  let i = 0
  const urls: string[] = []
  const fakeFetch = (async (url: string) => {
    urls.push(String(url))
    const a = answers[Math.min(i++, answers.length - 1)]
    if (a === "down") throw new Error("ECONNRESET")
    if (typeof a === "number") return { ok: false, status: a, json: async () => ({}) }
    return { ok: true, status: 200, json: async () => ({ status: "ok", buildId: a }) }
  }) as unknown as typeof fetch
  return { fakeFetch, urls }
}

function clock() {
  let t = 0
  return { now: () => t, sleep: async (ms: number) => void (t += ms) }
}

const run = (answers: Array<string | number>, isNewer: (id: string) => Promise<boolean>, timeoutMs = 600_000) => {
  const { fakeFetch, urls } = healthz(answers)
  const c = clock()
  return waitForBuild({ fetch: fakeFetch, liveUrl: "https://live.example", sha: SHA, isNewer, timeoutMs, intervalMs: 15_000, ...c }).then((r) => ({ ...r, urls }))
}

describe("waitForBuild", () => {
  it("matches at once when the site already runs the commit", async () => {
    const r = await run([SHA], async () => false)
    expect(r).toMatchObject({ state: "match", buildId: SHA, polls: 1 })
    expect(r.urls).toEqual(["https://live.example/api/healthz"])
  })

  it("keeps polling through an older build, a 503 and a dropped connection, then matches", async () => {
    const r = await run([OLD, 503, "down", OLD, SHA], async () => false)
    expect(r).toMatchObject({ state: "match", polls: 5 })
  })

  it("is superseded when a newer commit is live first, and never waits for the old one", async () => {
    const asked: string[] = []
    const r = await run([OLD, NEWER], async (id) => {
      asked.push(id)
      return id === NEWER
    })
    expect(r).toMatchObject({ state: "superseded", buildId: NEWER, polls: 2 })
    expect(asked).toEqual([OLD, NEWER])
  })

  it("treats a failed compare as not newer and keeps waiting", async () => {
    const r = await run([OLD, SHA], async () => {
      throw new Error("compare answered 404")
    })
    expect(r.state).toBe("match")
  })

  it("times out after ten minutes of an older build, reporting what was live", async () => {
    const r = await run([OLD], async () => false)
    expect(r.state).toBe("timeout")
    expect(r.buildId).toBe(OLD)
    expect(r.polls).toBeGreaterThan(30)
    expect(r.polls).toBeLessThanOrEqual(41)
  })

  it("ignores a buildId that is not a 40-char commit sha: never asks GitHub about it", async () => {
    const asked: string[] = []
    const r = await run(["../../x?y=1", "ABC", SHA], async (id) => {
      asked.push(id)
      return false
    }, 60_000)
    expect(r).toMatchObject({ state: "match", polls: 3 })
    expect(asked).toEqual([])
  })

  it("times out when the site never answers", async () => {
    const r = await run(["down"], async () => false, 60_000)
    expect(r).toMatchObject({ state: "timeout", buildId: undefined })
  })
})

describe("githubIsNewer", () => {
  const compare = (status: number, body: unknown) => {
    const calls: Array<{ url: string; auth: string }> = []
    const f = (async (url: string, init: { headers: Record<string, string> }) => {
      calls.push({ url, auth: init.headers.authorization })
      return { ok: status === 200, status, json: async () => body }
    }) as unknown as typeof fetch
    return { isNewer: githubIsNewer({ fetch: f, repo: "o/r", token: "tok", sha: SHA }), calls }
  }

  it("is true only when the live build is ahead of the deployed commit", async () => {
    const { isNewer, calls } = compare(200, { status: "ahead" })
    expect(await isNewer(NEWER)).toBe(true)
    expect(calls[0]).toEqual({ url: `https://api.github.com/repos/o/r/compare/${SHA}...${NEWER}`, auth: "Bearer tok" })
    for (const status of ["behind", "diverged", "identical"]) expect(await compare(200, { status }).isNewer(OLD)).toBe(false)
  })

  it("throws on an API error so the poll can keep waiting", async () => {
    await expect(compare(404, {}).isNewer(OLD)).rejects.toThrow("compare answered 404")
  })
})
