/**
 * AT THE CAP, A PERSON GETS ONE SHORT LINE, NOT AN ERROR DUMP.
 *
 * Every route that can reach Claude answers a used-up cap with status 429, the
 * line from AI_CAP_REACHED_MESSAGE and the code "AI_CAP_REACHED", which the
 * pages recognise. The first test finds those routes by following imports
 * from each route file to the guard, so a new AI route that forgets the
 * answer fails here. The rest call real routes with the service replaced by
 * one that hits the cap.
 */
import { describe, test, expect, vi } from "vitest"
import * as fs from "fs"
import * as path from "path"

const auth = vi.hoisted(() => ({
  requireAuth: vi.fn(async () => ({ success: true, userId: "user-1" })),
  requirePremium: vi.fn(async () => ({ success: true, userId: "user-1" })),
}))
const hitsCap = vi.hoisted(() => async () => {
  const { AiCapReachedError } = await import("@/src/api_ai/aiGuard")
  throw new AiCapReachedError("keep-it-going")
})

vi.mock("@/src/db/auth", async (importOriginal) => ({ ...(await importOriginal<object>()), ...auth }))
vi.mock("@/src/scenarios", async (importOriginal) => ({
  ...(await importOriginal<object>()),
  handleChatMessage: hitsCap,
}))
vi.mock("@/src/scenarios/scenarioLabService", () => ({
  startLabSession: hitsCap,
  labRespond: hitsCap,
  labDebrief: hitsCap,
}))
vi.mock("@/src/goals/visionPlanClaude", () => ({ queryVisionClaude: hitsCap }))

import { AI_CAP_REACHED_MESSAGE } from "@/src/api_ai/config"
import { POST as chatPOST } from "@/app/api/scenarios/chat/route"
import { POST as labPOST } from "@/app/api/scenarios/lab/route"
import { POST as visionPOST } from "@/app/api/test/goals/vision-plan/route"

const root = path.resolve(__dirname, "../../..")

/** The file an import names, or null for a package. */
function resolveImport(from: string, spec: string): string | null {
  const base = spec.startsWith("@/")
    ? path.join(root, spec.slice(2))
    : spec.startsWith(".")
      ? path.resolve(path.dirname(from), spec)
      : null
  if (!base) return null
  for (const candidate of [base, `${base}.ts`, `${base}.tsx`, path.join(base, "index.ts"), path.join(base, "index.tsx")]) {
    if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) return candidate
  }
  return null
}

const IMPORT = /(?:import|export)\s[^"'`;]*?from\s*["']([^"']+)["']|import\(\s*["']([^"']+)["']\s*\)/g
const GUARD = path.join(root, "src/api_ai/aiGuard.ts")

/** Does this file, through its imports, reach the guard? */
function reachesGuard(file: string, seen = new Set<string>()): boolean {
  if (file === GUARD) return true
  if (seen.has(file)) return false
  seen.add(file)
  const text = fs.readFileSync(file, "utf-8")
  for (const m of text.matchAll(IMPORT)) {
    const next = resolveImport(file, m[1] ?? m[2])
    if (next && reachesGuard(next, seen)) return true
  }
  return false
}

function routeFiles(dir: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const full = path.join(dir, e.name)
    if (e.isDirectory()) return routeFiles(full)
    return e.name === "route.ts" ? [full] : []
  })
}

const post = (body: unknown) =>
  new Request("http://localhost/api", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) })

async function expectCapAnswer(res: Response) {
  expect(res.status).toBe(429)
  expect(await res.json()).toEqual({ error: AI_CAP_REACHED_MESSAGE, code: "AI_CAP_REACHED" })
}

describe("routes that can call Claude, at the cap", () => {
  test("every route that reaches the guard gives the cap answer", () => {
    const aiRoutes = routeFiles(path.join(root, "app/api")).filter((f) => reachesGuard(f))
    const rel = (f: string) => path.relative(root, f).split(path.sep).join("/")

    // The import walk found the AI routes at all, before its answer means anything.
    expect(aiRoutes.map(rel)).toContain("app/api/scenarios/chat/route.ts")
    const missing = aiRoutes.filter((f) => !fs.readFileSync(f, "utf-8").includes("aiCapReachedResponse(")).map(rel)
    expect(missing, "catch the cap with aiCapReachedResponse (src/api_ai/capResponse.ts)").toEqual([])
  })

  test("the Scenarios chat answers with the cap line", async () => {
    await expectCapAnswer(await chatPOST(post({ message: "hi", scenario_type: "keep-it-going" })))
  })

  test("the Scenario Lab answers with the cap line", async () => {
    await expectCapAnswer(await labPOST(post({ action: "start", kind: "coldread", seed: "s" })))
  })

  test("the vision plan answers with the cap line", async () => {
    const intent = { id: "i1", text: "run", pillarId: "p", pillarLabel: "P", objectiveId: null, objectiveLabel: null }
    await expectCapAnswer(await visionPOST(post({ vision: "fit", intents: [intent] })))
  })
})
