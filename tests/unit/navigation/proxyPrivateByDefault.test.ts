// @vitest-environment node
/**
 * EVERY PAGE IS PRIVATE UNLESS IT IS SAID TO BE PUBLIC.
 *
 * The sign-in guard used to protect a hand-kept list of address prefixes,
 * typed twice in `proxy.ts`. A page outside the list was unguarded at the edge,
 * and moving a page to a new address (which `Plans/site-structure.md` does to
 * most of them) would have taken it out of the guard unless somebody
 * remembered the list. Now the proxy runs on every page and lets a signed-out
 * visitor through only where `isPublicPage` says so, so a forgotten page fails
 * closed.
 *
 * Two halves, and each is tested for what it does rather than read for a
 * string: Next's own matcher decides whether a request reaches the proxy at
 * all, and the proxy decides what it answers.
 */

import { describe, it, expect, afterEach, vi } from "vitest"
import { NextRequest } from "next/server"
import { unstable_doesMiddlewareMatch } from "next/experimental/testing/server"
import { proxy, config } from "../../../proxy"
import { ROUTES, isPublicPage, isUnder } from "@/src/shared/routes"
import { productRoutes } from "@/tests/support/appRoutes"

/**
 * The proxy builds a Supabase client, which throws without these. With no
 * session cookie on the request, `getUser()` answers "no user" without a
 * network call, which is exactly the signed-out visitor this file is about.
 */
function stubSupabaseEnv() {
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://stub.supabase.co")
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "stub-anon-key")
}

afterEach(() => {
  vi.unstubAllEnvs()
})

const BASE = "https://daygame-coach.vercel.app"
const req = (pathname: string) => new NextRequest(new URL(pathname, BASE))
const reachesProxy = (url: string) => unstable_doesMiddlewareMatch({ config, url })

/** Every product page, with a stand-in for each dynamic segment. */
const PAGES = productRoutes().map((r) => r.route.replace(/\[[^\]]+\]/g, "x"))
const PRIVATE_PAGES = PAGES.filter((p) => !isPublicPage(p))

describe("the proxy runs where it must", () => {
  it("found pages to check", () => {
    expect(PRIVATE_PAGES.length).toBeGreaterThan(15)
  })

  it.each(PAGES)("runs on the page %s", (page) => {
    expect(reachesProxy(page)).toBe(true)
  })

  it("runs on the two API prefixes it guards", () => {
    expect(reachesProxy("/api/test/articles")).toBe(true)
    expect(reachesProxy("/api/timetrack/sync")).toBe(true)
  })

  it("stays out of every other API call, Next's assets and public files", () => {
    // An API handler checks the user itself; a getUser() in front of each
    // would be a network call per request for nothing.
    for (const url of [
      "/api/tracking/stats",
      "/_next/static/chunks/main.js",
      "/_next/image",
      "/sw.js",
      "/manifest.webmanifest",
      "/favicon.ico",
      "/icon-192.png",
    ]) {
      expect(reachesProxy(url), url).toBe(false)
    }
  })
})

describe("a signed-out visitor", () => {
  it.each(PRIVATE_PAGES)("is sent to sign in from %s, and back afterwards", async (page) => {
    stubSupabaseEnv()

    const res = await proxy(req(`${page}?keep=1`))

    expect(res.status).toBe(307)
    // The header is absolute; compare its parts, never the raw string.
    const to = new URL(res.headers.get("location")!)
    expect(to.pathname).toBe("/auth/login")
    expect(to.searchParams.get("next")).toBe(`${page}?keep=1`)
  })

  it.each(["/", "/auth/login", "/auth/sign-up", "/test/goals"])("may open %s", async (page) => {
    stubSupabaseEnv()

    const res = await proxy(req(page))

    expect(res.headers.get("location")).toBeNull()
    expect(res.status).toBe(200)
  })

  it("gets a 401 from the time tracker's API, never a login page", async () => {
    stubSupabaseEnv()

    const res = await proxy(req("/api/timetrack/sync"))

    expect(res.status).toBe(401)
  })

  it("is not sent to a login page from the sandbox API in development", async () => {
    vi.stubEnv("NODE_ENV", "development")
    stubSupabaseEnv()

    const res = await proxy(req("/api/test/scripts"))

    expect(res.headers.get("location")).toBeNull()
  })
})

describe("isUnder", () => {
  it("matches the address itself and what lies below it, nothing beside it", () => {
    expect(isUnder("/plan", "/plan")).toBe(true)
    expect(isUnder("/plan/quit-vice", "/plan")).toBe(true)
    expect(isUnder("/timeline", "/time")).toBe(false)
    expect(isUnder("/time", "/timeline")).toBe(false)
    expect(isUnder(ROUTES.tracking, ROUTES.dashboard)).toBe(true)
    expect(isUnder("/dashboards", ROUTES.dashboard)).toBe(false)
  })
})
