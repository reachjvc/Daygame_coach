/**
 * THE /api/test/* ROUTES MUST NOT ANSWER IN PRODUCTION.
 *
 * WHAT THESE ROUTES ARE. Eleven endpoints that back the `/test/*` pages: the
 * article authoring bench, the calibration viewer, the script builder. Ten of
 * the eleven take no authentication at all, and six of them WRITE — `writeFile`
 * and `mkdir` under `process.cwd()`, driven by an unauthenticated POST body.
 * `/api/test/scripts/[name]` joins a URL segment straight into a file path, so
 * a `..` in the name walks out of its directory.
 *
 * WHY A TEST AND NOT JUST THE GUARD. The pages are sealed by
 * `app/test/layout.tsx`, which returns 404 in production. Their APIs are not
 * sealed by that layout — a layout gates pages, not route handlers — so for a
 * long time the pages were hidden and the endpoints behind them were not. The
 * guard now lives in `proxy.ts`, in one place rather than eleven.
 *
 * That is the right design and it is also the fragile kind: a single early
 * return near the top of a middleware that does several other jobs, plus one
 * line in a `matcher` array that Next reads at build time. Delete either half —
 * reorder the guard below the Supabase client, drop "/api/test/:path*" while
 * tidying the matcher — and everything still compiles, every page still works,
 * and the endpoints quietly start answering the internet again. Nothing else in
 * the suite would notice.
 *
 * So this test calls the real `proxy` function with a real request and checks
 * what it actually returns, rather than reading the source for a string.
 */

import { describe, it, expect, afterEach, vi } from "vitest"
import * as fs from "fs"
import * as path from "path"
import { NextRequest } from "next/server"
import { proxy, config } from "../../../proxy"

const root = path.resolve(__dirname, "../../..")

/**
 * `process.env` refuses `Object.defineProperty`, and NODE_ENV is readonly in
 * the types. `vi.stubEnv` is the supported way in and restores on unstub.
 */
function setNodeEnv(value: string) {
  vi.stubEnv("NODE_ENV", value)
}

/**
 * When the guard correctly does NOT fire, the proxy carries on and builds a
 * Supabase client, which throws without these. Stubbing them is what lets the
 * negative cases prove the guard let the request through, rather than passing
 * because something else blew up first.
 */
function stubSupabaseEnv() {
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://stub.supabase.co")
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "stub-anon-key")
}

afterEach(() => {
  vi.unstubAllEnvs()
})

function req(pathname: string) {
  return new NextRequest(new URL(pathname, "https://daygame-coach.vercel.app"))
}

describe("the /test API surface is sealed in production", () => {
  it("404s a test route in production", async () => {
    setNodeEnv("production")
    vi.stubEnv("ENABLE_TEST_ROUTES", "")

    const res = await proxy(req("/api/test/articles"))

    expect(res.status, "an unauthenticated sandbox endpoint answered in production").toBe(404)
  })

  it("404s the path-traversal shape too, not just the tidy one", async () => {
    setNodeEnv("production")
    vi.stubEnv("ENABLE_TEST_ROUTES", "")

    // `scripts/[name]` reads `docs/conversation-scripts/${name}.json` with no
    // sanitising. The guard has to fire before the handler regardless of shape.
    const res = await proxy(req("/api/test/scripts/..%2F..%2Fpackage"))

    expect(res.status).toBe(404)
  })

  it("still answers in development, or the /test pages are useless", async () => {
    setNodeEnv("development")
    stubSupabaseEnv()

    const res = await proxy(req("/api/test/articles"))

    expect(res.status, "the guard fired outside production").not.toBe(404)
  })

  it("honours the deliberate ENABLE_TEST_ROUTES escape hatch", async () => {
    setNodeEnv("production")
    vi.stubEnv("ENABLE_TEST_ROUTES", "true")
    stubSupabaseEnv()

    const res = await proxy(req("/api/test/articles"))

    expect(res.status).not.toBe(404)
  })

  /**
   * The guard only runs on paths Next hands to the middleware, and that list is
   * a build-time literal. A matcher that stops covering /api/test disables the
   * guard without touching the guard.
   */
  it("the matcher still routes /api/test through the proxy at all", () => {
    expect(
      config.matcher,
      "removing this entry silently disables every assertion above",
    ).toContain("/api/test/:path*")
  })

  /**
   * A new endpoint under app/api/test/ is covered automatically by the prefix
   * guard. This asserts nobody has moved one OUT to a path the guard misses,
   * which is the way a sandbox endpoint escapes without anyone editing proxy.ts.
   */
  it("every unauthenticated sandbox route still lives under /api/test", () => {
    const escaped: string[] = []
    const apiDir = path.join(root, "app/api")

    const walk = (dir: string) => {
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const p = path.join(dir, entry.name)
        if (entry.isDirectory()) walk(p)
        else if (entry.name === "route.ts") {
          const rel = path.relative(root, p)
          if (rel.startsWith("app/api/test/")) continue
          const src = fs.readFileSync(p, "utf8")
          // A route that reads or writes the repo's own files and takes no auth
          // is the sandbox shape, wherever it happens to live.
          const touchesRepoFiles = /process\.cwd\(\)/.test(src)
          const hasAuth = /requireAuth|requireAccess|getUser\(\)|ADMIN_KEY|adminKey/.test(src)
          if (touchesRepoFiles && !hasAuth) escaped.push(rel)
        }
      }
    }
    walk(apiDir)

    expect(
      escaped,
      "these read or write repo files with no auth and sit outside the /api/test guard",
    ).toEqual([])
  })
})
