// @vitest-environment node
/**
 * requireAuth answers in the same three states as the proxy
 * (src/db/authResilience.ts): a plain no is 401, could-not-tell is a 503 the
 * caller retries, and neither lets anyone in. The time tracker stops for good
 * on a 401 and keeps trying on a 5xx, which is why the difference matters.
 */
import { describe, it, expect, vi, beforeEach } from "vitest"
import { AuthApiError, AuthRetryableFetchError, AuthSessionMissingError, AuthUnknownError } from "@supabase/supabase-js"
import { requireAuth } from "@/src/db/auth"

const getUser = vi.fn()
/** Set by the one test whose client throws: a throw from a `vi.fn` is reported as the test's own failure. */
let throwing: Error | null = null
vi.mock("@/src/db/supabase", () => ({
  createServerSupabaseClient: async () => ({
    auth: {
      getUser: async () => {
        if (throwing) throw throwing
        return getUser()
      },
    },
  }),
}))
vi.mock("next/headers", () => ({ headers: async () => new Headers() }))


beforeEach(() => {
  getUser.mockReset()
  throwing = null
})

describe("requireAuth", () => {
  it("a plain yes lets the request in", async () => {
    getUser.mockResolvedValue({ data: { user: { id: "u1", email: "a@example.com" } }, error: null })
    const result = await requireAuth()
    expect(result.success).toBe(true)
  })

  it.each([
    ["no session", new AuthSessionMissingError()],
    ["a spent refresh token", new AuthApiError("Invalid Refresh Token: Already Used", 400, "refresh_token_already_used")],
    ["a bad token", new AuthApiError("invalid JWT", 403, "bad_jwt")],
  ])("a plain no (%s) is 401", async (_, error) => {
    getUser.mockResolvedValue({ data: { user: null }, error })
    const result = await requireAuth()
    expect(result.success).toBe(false)
    if (!result.success) expect(result.response.status).toBe(401)
  })

  it.each([
    ["no network", new AuthRetryableFetchError("fetch failed", 0)],
    ["a 503", new AuthRetryableFetchError("Service Unavailable", 503)],
    ["a server error", new AuthApiError("unexpected_failure", 500, "unexpected_failure")],
    ["a rate limit", new AuthApiError("rate limit", 429, "over_request_rate_limit")],
    ["an unreadable answer", new AuthUnknownError("Unexpected token <", null)],
  ])("could not tell (%s) is a 503, and nobody is let in", async (_, error) => {
    getUser.mockResolvedValue({ data: { user: null }, error })
    const result = await requireAuth()
    expect(result.success).toBe(false)
    if (!result.success) expect(result.response.status).toBe(503)
  })

  it("a network failure thrown by the client is could-not-tell: 503", async () => {
    throwing = new AuthRetryableFetchError("fetch failed", 0)
    const result = await requireAuth()
    expect(result.success).toBe(false)
    if (!result.success) expect(result.response.status).toBe(503)
  })

  it("any other throw is an unreadable session: 401, so the person can sign in again", async () => {
    throwing = new Error('Invalid Base64-URL character "%" at position 0')
    const result = await requireAuth()
    expect(result.success).toBe(false)
    if (!result.success) expect(result.response.status).toBe(401)
  })
})
