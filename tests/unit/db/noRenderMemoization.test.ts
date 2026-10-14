/**
 * THE SERVER'S SUPABASE CLIENTS NEVER LET NEXT.JS MEMOIZE A DATABASE READ.
 *
 * Next.js dedupes identical `fetch` GETs within one server render, so a read
 * repeated after a write — inside the same page — was answered from the first
 * read. `src/db/supabase.ts` says how that broke every new account's tracking
 * dashboard. A fetch with a signal is not memoized; these check that every
 * request from both server clients carries one, and that a caller's own signal
 * is the one kept.
 */
import { afterEach, describe, expect, test, vi } from "vitest"

const seen = vi.hoisted(() => ({ ssr: null as unknown, admin: null as unknown }))

vi.mock("@supabase/ssr", () => ({
  createServerClient: (_url: string, _key: string, options: unknown) => {
    seen.ssr = options
    return {}
  },
}))
vi.mock("@supabase/supabase-js", () => ({
  createClient: (_url: string, _key: string, options: unknown) => {
    seen.admin = options
    return {}
  },
}))
vi.mock("next/headers", () => ({
  cookies: async () => ({ getAll: () => [], set: () => {} }),
  headers: async () => new Headers(),
}))

import { createAdminSupabaseClient, createServerSupabaseClient, unmemoizedFetch } from "@/src/db/supabase"

const fetchOf = (options: unknown) => (options as { global?: { fetch?: typeof fetch } } | undefined)?.global?.fetch

afterEach(() => vi.unstubAllGlobals())

describe("database reads during a render", () => {
  test("every request carries a signal, so Next.js cannot answer it from an earlier one", async () => {
    const real = vi.fn(async () => new Response("[]"))
    vi.stubGlobal("fetch", real)
    await unmemoizedFetch("https://db.test/rest/v1/user_tracking_stats?user_id=eq.1")
    await unmemoizedFetch("https://db.test/rest/v1/user_tracking_stats?user_id=eq.1")
    const signals = real.mock.calls.map((call) => (call as unknown as [string, RequestInit])[1].signal)
    expect(signals.every((s) => s instanceof AbortSignal)).toBe(true)
    // one each: a shared signal would still be "the same options"
    expect(signals[0]).not.toBe(signals[1])
  })

  test("a caller's own signal is kept, not replaced", async () => {
    const real = vi.fn(async () => new Response("[]"))
    vi.stubGlobal("fetch", real)
    const mine = new AbortController().signal
    await unmemoizedFetch("https://db.test/x", { signal: mine })
    expect((real.mock.calls[0] as unknown as [string, RequestInit])[1].signal).toBe(mine)
  })

  test("both server clients read through it", async () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL ??= "https://db.test"
    process.env.SUPABASE_SERVICE_ROLE_KEY ??= "service"
    await createServerSupabaseClient()
    createAdminSupabaseClient()
    expect(fetchOf(seen.ssr), "createServerSupabaseClient").toBe(unmemoizedFetch)
    expect(fetchOf(seen.admin), "createAdminSupabaseClient").toBe(unmemoizedFetch)
  })
})
