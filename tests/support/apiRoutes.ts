/**
 * EVERY API ROUTE ON DISK, AND WHICH ONES ARE PUBLIC ON PURPOSE.
 *
 * Shared by `tests/e2e/sweep/api-signed-out.spec.ts` (asks each route as a
 * stranger) and `tests/unit/apiRoutes.test.ts` (keeps PUBLIC_API honest).
 * Routes and methods are read from the `route.ts` files under `app/api`, never
 * typed, so a new route is asked the day it exists.
 */

import { readdirSync, readFileSync, statSync } from "node:fs"
import path from "node:path"

const API_DIR = path.join(process.cwd(), "app", "api")

export const WRITE_METHODS = ["POST", "PUT", "PATCH", "DELETE"] as const
export const METHODS = ["GET", ...WRITE_METHODS] as const
export type ApiMethod = (typeof METHODS)[number]

export interface ApiRoute {
  /** Path as Next.js names it, e.g. "/api/goals/[id]/children". */
  route: string
  /** Absolute path of the route.ts file. */
  file: string
  methods: ApiMethod[]
}

function routeFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const full = path.join(dir, name)
    if (statSync(full).isDirectory()) return routeFiles(full)
    return name === "route.ts" ? [full] : []
  })
}

/** Methods a route file exports: `export function GET`, `export const GET`, `export { GET, POST }`. */
export function exportedMethods(src: string): ApiMethod[] {
  return METHODS.filter((m) => {
    const direct = new RegExp(`export\\s+(?:async\\s+)?(?:function|const|let)\\s+${m}\\b`).test(src)
    const listed = [...src.matchAll(/export\s*\{([^}]*)\}/g)].some((b) =>
      b[1].split(",").some((part) => part.trim().split(/\s+as\s+/).pop() === m),
    )
    return direct || listed
  })
}

export function apiRoutes(): ApiRoute[] {
  return routeFiles(API_DIR)
    .map((file) => {
      const rel = path.relative(path.join(process.cwd(), "app"), path.dirname(file)).replace(/\\/g, "/")
      // A folder in parentheses is a route group: it never appears in the address.
      const segments = rel.split("/").filter((s) => s && !/^\(.+\)$/.test(s))
      return { route: "/" + segments.join("/"), file, methods: exportedMethods(readFileSync(file, "utf-8")) }
    })
    .sort((a, b) => a.route.localeCompare(b.route))
}

/** Dynamic segments (`[id]`, `[...rest]`, `[[...rest]]`) get a made-up id; no row exists for it. */
export function concretePath(route: string, id: string): string {
  return route.replace(/\[\[?(?:\.\.\.)?\w+\]?\]/g, id)
}

export interface PublicApi {
  route: string
  method: ApiMethod
  /** Why a stranger may call this. */
  reason: string
  /** Every status a stranger may get for the spec's request; the spec asserts one of these. */
  answers: number[]
}

/**
 * Routes a stranger may call on purpose. Each says why, and what the stranger
 * gets for the spec's request (no cookies; writes send `{}` as JSON). A public
 * route that starts answering something else goes red, so one that begins
 * leaking data or failing with a 500 is caught.
 */
export const PUBLIC_API: PublicApi[] = [
  {
    route: "/api/healthz",
    method: "GET",
    reason: "Deploy check, Docker healthcheck and uptime monitor ask it with no session; it holds no secret.",
    answers: [200],
  },
  {
    route: "/api/errors",
    method: "POST",
    reason: "Crash reports must arrive from signed-out visitors too; rate limited, text scrubbed.",
    answers: [200],
  },
  {
    route: "/api/auth/sign-out",
    method: "POST",
    reason: "Ending a session must work even when the session is already gone; it changes nothing for a stranger.",
    answers: [200],
  },
  {
    route: "/api/notifications/tick",
    method: "POST",
    reason: "The database clock calls it with a secret in the Authorization header; no secret means 401, no secret configured means 503.",
    answers: [401, 503],
  },
  {
    route: "/api/quit/count",
    method: "POST",
    reason: "Anonymous step counter of the quit tools: stores nothing, takes only a small valid JSON body, so `{}` is a 400 by design.",
    answers: [400],
  },
]
