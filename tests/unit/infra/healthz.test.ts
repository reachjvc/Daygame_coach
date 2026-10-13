// @vitest-environment node
/**
 * THE ANSWER A DEPLOY STAKES AN IMAGE ON.
 *
 * `infra/deploy.sh` keeps a new image only if `/api/healthz` says 200 with that
 * image's commit, and rolls it back otherwise. So a 200 must mean the database
 * really answered, a slow database must read as down rather than hang the
 * deploy, and the endpoint must not let anyone hammer the database through it.
 * The route is driven with its real probe logic; only the query is replaced.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"

import { GET } from "@/app/api/healthz/route"
import { PROBE_CACHE_MS, PROBE_TIMEOUT_MS } from "@/src/db/readinessRepo"

const probeAnswer = vi.hoisted(() => ({ value: true }))

vi.mock("@/src/db/readinessRepo", async (importOriginal) => {
  const real = await importOriginal<typeof import("@/src/db/readinessRepo")>()
  return {
    ...real,
    databaseAnswers: vi.fn(async () => probeAnswer.value),
  }
})

const request = (headers: Record<string, string> = {}) =>
  new Request("http://app:3000/api/healthz", { headers })

describe("GET /api/healthz", () => {
  beforeEach(() => {
    probeAnswer.value = true
  })

  it("answers 200 with the build, the database and the protocol", async () => {
    vi.stubEnv("NEXT_PUBLIC_BUILD_ID", "f".repeat(40))
    const res = await GET(request({ "x-forwarded-proto": "https" }))
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({
      status: "ok",
      buildId: "f".repeat(40),
      db: "ok",
      proto: "https",
    })
    expect(res.headers.get("cache-control")).toBe("no-store")
    vi.unstubAllEnvs()
  })

  it("answers 503 when the database does not, and says nothing more", async () => {
    probeAnswer.value = false
    const res = await GET(request())
    expect(res.status).toBe(503)
    const body = await res.json()
    expect(body).toMatchObject({ status: "unavailable", db: "unreachable" })
    expect(Object.keys(body).sort()).toEqual(["buildId", "db", "proto", "status"])
  })

  it("reports http when no proxy said https", async () => {
    expect((await (await GET(request())).json()).proto).toBe("http")
    expect((await (await GET(request({ "x-forwarded-proto": "http" }))).json()).proto).toBe("http")
  })

  it("reads the first hop of a chained x-forwarded-proto", async () => {
    const res = await GET(request({ "x-forwarded-proto": "https, http" }))
    expect((await res.json()).proto).toBe("https")
  })
})

describe("the database probe", () => {
  // The real function, not the route's mock above.
  type Probe = typeof import("@/src/db/readinessRepo")
  let real: Probe["databaseAnswers"]
  beforeEach(async () => {
    const actual = await vi.importActual<Probe>("@/src/db/readinessRepo")
    real = actual.databaseAnswers
    actual.forgetReadiness()
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  it("is true when the query answers", async () => {
    expect(await real(async () => {}, 0)).toBe(true)
  })

  it("is false when the query throws", async () => {
    expect(await real(async () => { throw new Error("connection refused") }, 0)).toBe(false)
  })

  it("is false after 2 s, and aborts the query it gave up on", async () => {
    vi.useFakeTimers()
    let aborted = false
    const hangs = (signal: AbortSignal) =>
      new Promise<void>((resolve) => {
        signal.addEventListener("abort", () => {
          aborted = true
          resolve()
        })
      })
    const answer = real(hangs, 0)
    await vi.advanceTimersByTimeAsync(PROBE_TIMEOUT_MS)
    expect(await answer).toBe(false)
    expect(aborted).toBe(true)
  })

  it("asks the database at most once per 10 s, and shares a probe in flight", async () => {
    const probe = vi.fn(async () => {})
    await Promise.all([real(probe, 1_000), real(probe, 1_000)])
    await real(probe, 1_000 + PROBE_CACHE_MS - 1)
    expect(probe).toHaveBeenCalledTimes(1)
    await real(probe, 1_000 + PROBE_CACHE_MS)
    expect(probe).toHaveBeenCalledTimes(2)
  })

  it("caches a failure too, so a dead database is not asked on every request", async () => {
    const probe = vi.fn(async () => { throw new Error("down") })
    expect(await real(probe, 0)).toBe(false)
    expect(await real(probe, PROBE_CACHE_MS - 1)).toBe(false)
    expect(probe).toHaveBeenCalledTimes(1)
  })
})
