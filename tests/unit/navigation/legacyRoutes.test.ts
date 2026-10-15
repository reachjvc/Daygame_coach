// @vitest-environment node
/**
 * EVERY ADDRESS THAT MOVED STILL ARRIVES.
 *
 * `Plans/site-structure.md` moved most signed-in pages to addresses that say
 * what belongs to what (`/dashboard/settings` became `/settings`). Bookmarks,
 * the installed app's history and the time tracker's copied start links all
 * carry the old ones, so `proxy.ts` answers each with a permanent redirect
 * from one table, `LEGACY_ROUTES` in src/shared/routes.ts.
 *
 * Checked over the whole table, so a row added later is covered the moment it
 * exists: it must point at a page that exists, from an address that no longer
 * has one, never at another old address, and nothing in the product may link to
 * the old address on purpose.
 */

import { describe, it, expect, afterEach, vi } from "vitest"
import * as fs from "fs"
import * as path from "path"
import { NextRequest } from "next/server"
import { proxy } from "../../../proxy"
import { LEGACY_ROUTES, legacyRedirect } from "@/src/shared/routes"
import { code, productRoutes, writesPath } from "@/tests/support/appRoutes"

const root = path.resolve(__dirname, "../../..")
const ROUTE_LIST = path.join(root, "src/shared/routes.ts")
const served = new Set(productRoutes().map((r) => r.route))

afterEach(() => vi.unstubAllEnvs())

/** Product code, including the lab pages under app/test (they link in too). */
function productFiles(): string[] {
  const out: string[] = []
  const walk = (dir: string) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name)
      if (entry.isDirectory()) {
        if (["node_modules", ".next", ".git", "coverage"].includes(entry.name)) continue
        walk(full)
      } else if (/\.tsx?$/.test(entry.name) && !entry.name.endsWith(".d.ts")) {
        out.push(full)
      }
    }
  }
  for (const dir of ["src", "app", "components"]) walk(path.join(root, dir))
  return out
}

describe("the table of moved addresses", () => {
  it("has rows to check", () => {
    expect(LEGACY_ROUTES.length).toBeGreaterThan(0)
  })

  it.each(LEGACY_ROUTES)("$from is no longer a page, and $to is", ({ from, to }) => {
    expect(served.has(from), `${from} still has a page, so its redirect would hide it`).toBe(false)
    expect(served.has(to), `${to} has no page: the redirect would land on a 404`).toBe(true)
  })

  it("never sends one old address to another", () => {
    const froms = new Set(LEGACY_ROUTES.map((r) => r.from))
    expect(LEGACY_ROUTES.filter((r) => froms.has(r.to))).toEqual([])
  })

  it("is the only place an old address is written out", () => {
    const offenders: string[] = []
    for (const file of productFiles()) {
      if (file === ROUTE_LIST) continue
      const src = code(fs.readFileSync(file, "utf-8"))
      for (const { from } of LEGACY_ROUTES) {
        if (writesPath(src, from)) offenders.push(`${path.relative(root, file)} -> ${from}`)
      }
    }
    expect(
      offenders,
      `These link to an address that moved. It still redirects, so nothing looks broken;\n` +
        `use ROUTES from src/shared/routes instead:\n${offenders.join("\n")}`,
    ).toEqual([])
  })
})

describe("legacyRedirect", () => {
  it("leaves an address that did not move alone", () => {
    expect(legacyRedirect("/dashboard")).toBeNull()
    expect(legacyRedirect("/")).toBeNull()
  })

  it.each(LEGACY_ROUTES)("sends $from, and what lies below it, to $to", ({ from, to }) => {
    expect(legacyRedirect(from)).toBe(to)
    expect(legacyRedirect(`${from}/below`)).toBe(`${to}/below`)
    // Segment-aware: an address that merely starts with the same letters is not under it.
    expect(legacyRedirect(`${from}x`)).toBeNull()
  })
})

describe("the proxy, on an old address", () => {
  it.each(LEGACY_ROUTES)("answers $from with a permanent redirect to $to, query kept", async ({ from, to }) => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://stub.supabase.co")
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "stub-anon-key")

    const res = await proxy(new NextRequest(new URL(`${from}?start=1&description=x`, "https://daygame-coach.vercel.app")))

    expect(res.status).toBe(308)
    // The header is absolute; compare its parts, never the raw string.
    const location = new URL(res.headers.get("location")!)
    expect(location.pathname).toBe(to)
    expect(location.search).toBe("?start=1&description=x")
  })
})
