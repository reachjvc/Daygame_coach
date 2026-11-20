/**
 * EVERY DYNAMIC API ROUTE REFUSES A STRANGER WHO HOLDS A REAL ID.
 *
 * `api-signed-out.spec.ts` sends a made-up UUID, so a 404 there cannot tell
 * "refused a stranger" from "no such row". Here account A makes one real row
 * per family through the app's own routes, and then:
 *
 *   1. account B (signed in, someone else) sends A's real ids to every method
 *      of every dynamic route, with a valid body where the route wants one;
 *   2. a request with no session at all does the same;
 *   3. A reads every row again and it must be exactly as it was (a DELETE or
 *      PATCH that leaked shows here, even if its reply looked polite).
 *
 * The routes and their methods are read from disk (tests/support/apiRoutes.ts).
 * A dynamic route that has no entry in PLAN, or a write method without a body
 * in its entry, FAILS the spec: a new route is covered the day it exists, or
 * the spec says it is not.
 *
 * Allowed for B: 403, 404, 405. For a stranger with no session: 401, 403, 404,
 * 405. Never a 2xx (a leak, or a no-op that looks like one), never a 5xx, and
 * a 400/409/422 is a finding too: it must not stand in for an ownership check.
 *
 * KNOWN_FINDINGS: route + method -> why it answers something else for B while
 * leaving the row alone. The spec still runs the call and goes red if the entry
 * is no longer needed. An entry never hides a changed row: step 3 is separate.
 *
 * `test/scripts/[name]` is test-only and skipped on purpose (SKIPPED_ROUTES).
 */

import { randomUUID } from "node:crypto"
import type { APIRequestContext } from "@playwright/test"
import { test, expect, SIGNED_OUT } from "../fixtures/test"
import { createTestApproachViaAPI, createTestSessionViaAPI, ensureNoActiveSessionViaAPI } from "../helpers/auth.helper"
import { apiRoutes, WRITE_METHODS, type ApiMethod } from "../../support/apiRoutes"

const REFUSALS_B = [403, 404, 405]
const REFUSALS_SIGNED_OUT = [401, 403, 404, 405]

/** Test-only route, not part of the product. */
const SKIPPED_ROUTES = ["/api/test/scripts/[name]"]

/**
 * "METHOD /route" -> why B gets another status than 403/404/405. Every entry
 * below was measured with A's rows read back unchanged afterwards (the LEAK check
 * in the test): the call did nothing to A's data, it only says so in the wrong
 * words. They are status-code findings for the owner to decide on, not leaks.
 * The test still sends each call and goes red when an entry is no longer needed.
 */
const NO_OP_2XX = "answers 2xx to a delete that matched no row of B's (scoped by user id); A's row verified untouched"
const BAD_5XX = "the repo throws a plain error for a row that is not B's and the route turns it into 500; A's row verified untouched"
const BAD_409 = "the repo reports a row that is not B's as a refusal (409/422), not as not-found; A's row verified untouched"
const KNOWN_FINDINGS: Record<string, string> = {
  "DELETE /api/audit/slots/[id]": `${NO_OP_2XX} (documented: a resent delete answers 200)`,
  "DELETE /api/goals/[id]": NO_OP_2XX,
  "DELETE /api/notifications/devices/[id]": NO_OP_2XX,
  "DELETE /api/programs/drafts/[id]": NO_OP_2XX,
  "PUT /api/goals/[id]": BAD_5XX,
  "POST /api/goals/[id]/increment": BAD_5XX,
  "POST /api/goals/[id]/reset": BAD_5XX,
  "POST /api/programs/enrollments/[id]/action": BAD_5XX,
  "DELETE /api/programs/enrollments/[id]/log/[logId]": BAD_5XX,
  "POST /api/programs/enrollments/[id]/resume": BAD_5XX,
  "PUT /api/programs/enrollments/[id]/schedule": BAD_5XX,
  "DELETE /api/tracking/field-report/[id]": BAD_5XX,
  "DELETE /api/tracking/session/[id]": BAD_5XX,
  "PUT /api/tracking/templates/custom/[id]": BAD_5XX,
  "DELETE /api/tracking/templates/custom/[id]": BAD_5XX,
  "PATCH /api/programs/drafts/[id]": BAD_409,
  "POST /api/programs/drafts/[id]/start": BAD_409,
  "DELETE /api/programs/enrollments/[id]": BAD_409,
  "PUT /api/programs/enrollments/[id]/unit": BAD_409,
  "PATCH /api/workouts/[id]": BAD_409,
  "DELETE /api/workouts/[id]": BAD_409,
  "POST /api/workouts/[id]/finish": BAD_409,
  "PATCH /api/workouts/[id]/revise": BAD_409,
  "POST /api/workouts/[id]/sets": BAD_409,
  "PATCH /api/workouts/[id]/sets/[setId]": BAD_409,
  "DELETE /api/workouts/[id]/sets/[setId]": BAD_409,
}

interface Seeds {
  goalId: string
  workoutOpen: { id: string; setId: string }
  workoutDone: { id: string; setId: string }
  /** A finished workout that answers the program: its id is also the program's log id. */
  workoutInProgram: { id: string }
  deviceId: string
  sessionActiveId: string
  sessionEndedId: string
  approachId: string
  fieldReportId: string
  templateId: string
  auditRunId: string
  auditSlotId: string
  enrollmentId: string
  draftId: string
}

type Params = Record<string, string>

interface RoutePlan {
  /** Every real id combination to send (e.g. an open and a finished workout). */
  cases: (s: Seeds) => { label: string; params: Params }[]
  /** Valid JSON body per write method. A write method with no entry fails the spec; DELETE may leave it out. */
  body: Partial<Record<ApiMethod, unknown>>
  /** Query string per method, e.g. "?permanent=1". */
  query?: Partial<Record<ApiMethod, string>>
}

const one = (label: string, pick: (s: Seeds) => Params) => (s: Seeds) => [{ label, params: pick(s) }]

const workoutCases = (s: Seeds) => [
  { label: "open", params: { id: s.workoutOpen.id } },
  { label: "finished", params: { id: s.workoutDone.id } },
]

const sessionCases = (s: Seeds) => [
  { label: "active", params: { id: s.sessionActiveId } },
  { label: "ended", params: { id: s.sessionEndedId } },
]

const HACK = "HACKED BY USER B"

const CUSTOM_DAY = {
  id: "day-a",
  label: "Day A",
  exercises: [
    {
      id: "squat",
      name: "Squat",
      metricType: "load",
      scheme: { kind: "linear", sets: 3, reps: 5 },
      progression: { kind: "linear_load", incrementKg: 2.5, incrementLb: 5, deloadAfterFails: 3, deloadPct: 0.1 },
    },
  ],
}
const CUSTOM_SCHEDULE = { kind: "linear_rotation", days: [CUSTOM_DAY] }

const PLAN: Record<string, RoutePlan> = {
  "/api/goals/[id]": {
    cases: one("goal", (s) => ({ id: s.goalId })),
    body: { PUT: { title: HACK } },
  },
  "/api/goals/[id]/achievements": {
    cases: one("goal", (s) => ({ id: s.goalId })),
    body: { PUT: { totalPinned: true } },
  },
  "/api/goals/[id]/children": { cases: one("goal", (s) => ({ id: s.goalId })), body: {} },
  "/api/goals/[id]/increment": {
    cases: one("goal", (s) => ({ id: s.goalId })),
    body: { POST: { amount: 1 } },
  },
  "/api/goals/[id]/reset": {
    cases: one("goal", (s) => ({ id: s.goalId })),
    body: { POST: {} },
  },
  "/api/workouts/[id]": {
    cases: workoutCases,
    body: { PATCH: { notes: HACK } },
  },
  "/api/workouts/[id]/sets": {
    cases: workoutCases,
    body: { POST: { exerciseId: null, exercise: "Bench Press", weight: 50, reps: 5, setNumber: 9, kind: "working" } },
  },
  "/api/workouts/[id]/sets/[setId]": {
    cases: (s) => [
      { label: "open", params: { id: s.workoutOpen.id, setId: s.workoutOpen.setId } },
      { label: "finished", params: { id: s.workoutDone.id, setId: s.workoutDone.setId } },
    ],
    body: { PATCH: { kind: "warmup" } },
  },
  "/api/workouts/[id]/revise": {
    cases: workoutCases,
    body: {
      PATCH: {
        sets: [{ exercise: "Bench Press", exerciseId: null, weightKg: 1, reps: 1, setNumber: 1, kind: "working" }],
      },
    },
  },
  "/api/workouts/[id]/finish": {
    cases: workoutCases,
    body: { POST: { intensity: 3 } },
  },
  "/api/workouts/[id]/summary": { cases: workoutCases, body: {} },
  "/api/notifications/devices/[id]": {
    cases: one("device", (s) => ({ id: s.deviceId })),
    body: { PATCH: { enabled: false } },
  },
  "/api/tracking/session/[id]": {
    cases: sessionCases,
    body: { PATCH: { primary_location: HACK } },
  },
  "/api/tracking/session/[id]/reactivate": { cases: sessionCases, body: { POST: {} } },
  "/api/tracking/session/[id]/abandon": { cases: sessionCases, body: { POST: {} } },
  "/api/tracking/session/[id]/end": { cases: sessionCases, body: { POST: {} } },
  "/api/tracking/field-report/[id]": {
    cases: one("report", (s) => ({ id: s.fieldReportId })),
    body: { PUT: { title: HACK, fields: { note: HACK } } },
  },
  "/api/tracking/approach/[id]": {
    cases: one("approach", (s) => ({ id: s.approachId })),
    body: { PATCH: { outcome: "number", note: HACK } },
  },
  "/api/tracking/templates/custom/[id]": {
    cases: one("template", (s) => ({ id: s.templateId })),
    body: { PUT: { name: HACK, description: "x", fields: [{ id: "f1", type: "text", label: "Note" }] } },
  },
  "/api/audit/slots/[id]": {
    cases: one("slot", (s) => ({ id: s.auditSlotId })),
    body: {},
  },
  "/api/audit/runs/[id]": {
    cases: one("run", (s) => ({ id: s.auditRunId })),
    body: { PATCH: { end: true } },
  },
  "/api/programs/enrollments/[id]": {
    cases: one("enrollment", (s) => ({ id: s.enrollmentId })),
    body: {},
  },
  "/api/programs/enrollments/[id]/resume": {
    cases: one("enrollment", (s) => ({ id: s.enrollmentId })),
    body: { POST: {} },
  },
  "/api/programs/enrollments/[id]/unit": {
    cases: one("enrollment", (s) => ({ id: s.enrollmentId })),
    body: { PUT: { unitSystem: "lb" } },
  },
  "/api/programs/enrollments/[id]/schedule": {
    cases: one("enrollment", (s) => ({ id: s.enrollmentId })),
    body: { PUT: { customSchedule: CUSTOM_SCHEDULE } },
  },
  "/api/programs/enrollments/[id]/action": {
    cases: one("enrollment", (s) => ({ id: s.enrollmentId })),
    body: { POST: { action: "reset" } },
  },
  "/api/programs/enrollments/[id]/log/[logId]": {
    cases: one("log", (s) => ({ id: s.enrollmentId, logId: s.workoutInProgram.id })),
    body: {},
  },
  "/api/programs/drafts/[id]": {
    cases: one("draft", (s) => ({ id: s.draftId })),
    body: { PATCH: { name: HACK } },
  },
  "/api/programs/drafts/[id]/start": {
    cases: one("draft", (s) => ({ id: s.draftId })),
    body: { POST: {} },
  },
}

function fill(route: string, params: Params): string {
  return route.replace(/\[(\w+)\]/g, (_m, name: string) => {
    const value = params[name]
    if (!value) throw new Error(`${route}: no value for [${name}]`)
    return value
  })
}

async function must<T>(what: string, res: { ok(): boolean; status(): number; text(): Promise<string>; json(): Promise<unknown> }): Promise<T> {
  if (!res.ok()) throw new Error(`could not seed ${what}: ${res.status()} ${(await res.text()).slice(0, 300)}`)
  return (await res.json()) as T
}

const JSON_HEADERS = { "Content-Type": "application/json" }

async function seed(a: APIRequestContext, page: Parameters<typeof createTestSessionViaAPI>[0]): Promise<Seeds> {
  // goal
  const goal = await must<{ id: string }>("goal", await a.post("/api/goals", { data: { title: "Other-account goal", target_value: 5, category: "fitness" } }))

  // tracking: an ended session first, then the active one (the helper ends any active one before it starts)
  const sessionEndedId = await createTestSessionViaAPI(page, "IDOR ended")
  await must("ending the first session", await a.post(`/api/tracking/session/${sessionEndedId}/end`, { data: {} }))
  const sessionActiveId = await createTestSessionViaAPI(page, "IDOR active")
  const approachId = await createTestApproachViaAPI(page, sessionActiveId, "short")

  // field report and custom template
  const report = await must<{ id: string }>(
    "field report",
    await a.post("/api/tracking/field-report", { data: { title: "Other-account report", fields: { note: "mine" }, is_draft: false } }),
  )
  const template = await must<{ id: string }>(
    "custom template",
    await a.post("/api/tracking/templates/custom", { data: { name: "Other-account template", description: "mine", fields: [{ id: "f1", type: "text", label: "Note" }] } }),
  )

  // device (an address the server accepts as a push service; never contacted)
  const device = await must<{ id: string | null }>(
    "device",
    await a.post("/api/notifications/devices", {
      data: {
        intent: "enable",
        label: "IDOR test browser",
        subscription: { endpoint: `https://fcm.googleapis.com/fcm/send/idor-${randomUUID()}`, keys: { p256dh: "BNcRdreALRFXTkOOUHK1EtK2wtaz5Ry4YfYCA_0QTpQtUbVlUls0VJXg7A8u-Ts1XbjhazAkj7I99e8QcYP7DkM", auth: "tBHItJI5svbpez7KI4CCXg" } },
      },
    }),
  )
  if (!device.id) throw new Error("could not seed device: the route registered no row")

  // audit: a run, and one answered quarter
  const auditRunId = randomUUID()
  await must("audit run", await a.post("/api/audit/runs", { data: { id: auditRunId } }))
  const auditSlotId = randomUUID()
  const quarter = new Date(Math.floor(Date.now() / 900_000) * 900_000).toISOString()
  const saved = await must<{ refused?: unknown[]; stored?: number }>(
    "audit answer",
    await a.put("/api/audit/slots", {
      data: { slots: [{ id: auditSlotId, runId: auditRunId, slotAt: quarter, activity: "Other-account activity", energy: 4, growth: 4, avoiding: false }] },
    }),
  )
  if ((saved.refused ?? []).length > 0) throw new Error(`could not seed audit answer: ${JSON.stringify(saved)}`)

  // draft (runnable: one day, one lift)
  const draft = await must<{ id: string }>(
    "draft",
    await a.post("/api/programs/drafts", { data: { name: "Other-account week", schedule: CUSTOM_SCHEDULE } }),
  )

  // program enrolment + one finished program workout; then a plain finished one; then an open one
  const { enrollment } = await must<{ enrollment: { id: string } }>(
    "enrollment",
    await a.post("/api/programs/enrollments", { data: { programId: "stronglifts-5x5", level: "beginner", unitSystem: "kg" } }),
  )
  const startWorkout = async (extra: Record<string, unknown>) =>
    (await must<{ id: string }>("workout start", await a.post("/api/workouts", { data: { clientKey: `idor-${randomUUID()}`, ...extra } }))).id
  const addSet = async (workoutId: string, setNumber: number) =>
    await must(`set on ${workoutId}`, await a.post(`/api/workouts/${workoutId}/sets`, { data: { exerciseId: null, exercise: "Squat", weight: 60, reps: 5, setNumber, kind: "working" } }))
  const finish = async (workoutId: string) =>
    await must(`finish ${workoutId}`, await a.post(`/api/workouts/${workoutId}/finish`, { headers: JSON_HEADERS, data: { intensity: 3 } }))
  const firstSetId = async (workoutId: string) => {
    const sets = await must<{ id: string }[]>(`sets of ${workoutId}`, await a.get(`/api/workouts/${workoutId}`))
    if (!sets[0]?.id) throw new Error(`workout ${workoutId} has no set`)
    return sets[0].id
  }

  const inProgramId = await startWorkout({ enrollmentId: enrollment.id })
  await addSet(inProgramId, 1)
  await finish(inProgramId)

  const doneId = await startWorkout({})
  await addSet(doneId, 1)
  await finish(doneId)

  const openId = await startWorkout({})
  await addSet(openId, 1)

  return {
    goalId: goal.id,
    workoutOpen: { id: openId, setId: await firstSetId(openId) },
    workoutDone: { id: doneId, setId: await firstSetId(doneId) },
    workoutInProgram: { id: inProgramId },
    deviceId: device.id,
    sessionActiveId,
    sessionEndedId,
    approachId,
    fieldReportId: report.id,
    templateId: template.id,
    auditRunId,
    auditSlotId,
    enrollmentId: enrollment.id,
    draftId: draft.id,
  }
}

/** Every URL A reads to see her rows. */
function readUrls(s: Seeds): string[] {
  return [
    `/api/goals/${s.goalId}`,
    `/api/goals/${s.goalId}/achievements`,
    `/api/workouts/${s.workoutOpen.id}`,
    `/api/workouts/${s.workoutDone.id}`,
    `/api/workouts/${s.workoutDone.id}/summary`,
    `/api/workouts/${s.workoutInProgram.id}/summary`,
    "/api/workouts/live",
    "/api/notifications/devices",
    `/api/tracking/session/${s.sessionActiveId}`,
    `/api/tracking/session/${s.sessionEndedId}`,
    `/api/tracking/field-report/${s.fieldReportId}`,
    `/api/tracking/templates/custom/${s.templateId}`,
    `/api/audit?run=${s.auditRunId}`,
    `/api/programs/enrollments/${s.enrollmentId}`,
    `/api/programs/drafts/${s.draftId}`,
  ]
}

async function snapshot(a: APIRequestContext, s: Seeds): Promise<Record<string, string>> {
  const out: Record<string, string> = {}
  for (const url of readUrls(s)) {
    const res = await a.get(url)
    let text = await res.text()
    // `now` and the like move on their own; the rows must not.
    if (url.startsWith("/api/audit")) {
      const body = JSON.parse(text) as Record<string, unknown>
      delete body.now
      delete body.timeEntries
      text = JSON.stringify(body)
    }
    out[url] = `${res.status()} ${text}`
  }
  return out
}

interface Row {
  route: string
  method: ApiMethod
  label: string
  status: number | string
}

async function ask(ctx: APIRequestContext, plan: RoutePlan, route: string, method: ApiMethod, params: Params): Promise<number | string> {
  const url = fill(route, params) + (plan.query?.[method] ?? "")
  const isWrite = (WRITE_METHODS as readonly string[]).includes(method)
  const body = plan.body[method]
  try {
    const res = isWrite && body !== undefined
      ? await ctx.fetch(url, { method, data: body, maxRedirects: 0 })
      : await ctx.fetch(url, { method, maxRedirects: 0 })
    return res.status()
  } catch (error) {
    return `no answer (${error instanceof Error ? error.message.split("\n")[0] : "error"})`
  }
}

test.describe("API routes with another account's real id", () => {
  // Each route compiles on first request under `next dev`.
  test.setTimeout(900_000)

  test("every dynamic route and method refuses a stranger who holds a real id, and the rows stay as they were", async ({ page, browser, secondUser }, testInfo) => {
    const routes = apiRoutes().filter((r) => r.route.includes("[") && !SKIPPED_ROUTES.includes(r.route))
    expect(routes.length, "dynamic route files found").toBeGreaterThan(20)

    // FAIL LOUDLY on anything the plan does not cover, before any request.
    const uncovered: string[] = []
    for (const r of routes) {
      const plan = PLAN[r.route]
      if (!plan) {
        uncovered.push(`${r.route}: no entry in PLAN, so no real id is sent to it`)
        continue
      }
      for (const m of r.methods) {
        if ((WRITE_METHODS as readonly string[]).includes(m) && m !== "DELETE" && plan.body[m] === undefined) {
          uncovered.push(`${m} ${r.route}: no valid body in PLAN`)
        }
      }
    }
    for (const route of Object.keys(PLAN)) {
      if (!routes.some((r) => r.route === route)) uncovered.push(`${route}: in PLAN but no such route on disk`)
    }
    expect(uncovered, "dynamic routes the spec does not cover").toEqual([])

    const a = page.request
    const seeds = await seed(a, page)

    const contextB = await browser.newContext({ storageState: secondUser.storageState })
    const contextOut = await browser.newContext({ storageState: SIGNED_OUT })
    try {
      const b = contextB.request
      const out = contextOut.request

      const before = await snapshot(a, seeds)
      for (const [url, answer] of Object.entries(before)) {
        expect(answer.startsWith("200 "), `A cannot read her own row at ${url} before the test starts: ${answer.slice(0, 200)}`).toBe(true)
      }

      const rowsB: Row[] = []
      const rowsOut: Row[] = []
      for (const { route, methods } of routes) {
        const plan = PLAN[route]
        for (const c of plan.cases(seeds)) {
          for (const method of methods) {
            rowsB.push({ route, method, label: c.label, status: await ask(b, plan, route, method, c.params) })
          }
        }
      }
      const afterB = await snapshot(a, seeds)

      for (const { route, methods } of routes) {
        const plan = PLAN[route]
        for (const c of plan.cases(seeds)) {
          for (const method of methods) {
            rowsOut.push({ route, method, label: c.label, status: await ask(out, plan, route, method, c.params) })
          }
        }
      }
      const afterOut = await snapshot(a, seeds)

      const table = (title: string, rows: Row[]) =>
        `${title}\n` + rows.map((r) => `  ${String(r.status).padEnd(4)} ${r.method.padEnd(6)} ${r.route} (${r.label})`).join("\n")
      console.log(table("As B (another signed-in account):", rowsB))
      console.log(table("Signed out:", rowsOut))
      testInfo.annotations.push({ type: "checked", description: `${routes.length} dynamic routes, ${rowsB.length} calls as B, ${rowsOut.length} signed out` })

      const problems: string[] = []
      const seenKnown = new Set<string>()
      const judge = (who: string, rows: Row[], allowed: number[], applyKnown: boolean) => {
        for (const r of rows) {
          if (typeof r.status === "number" && allowed.includes(r.status)) continue
          const key = `${r.method} ${r.route}`
          if (applyKnown && KNOWN_FINDINGS[key]) {
            seenKnown.add(key)
            continue
          }
          const kind =
            typeof r.status === "string" ? r.status
              : r.status >= 200 && r.status < 300 ? "2xx: answered a stranger"
              : r.status >= 500 ? "5xx: fell over instead of refusing"
              : `${r.status}: not a refusal of ownership`
          problems.push(`${who} ${key} [${r.label}]: got ${r.status} (${kind})`)
        }
      }
      judge("B", rowsB, REFUSALS_B, true)
      judge("signed out", rowsOut, REFUSALS_SIGNED_OUT, false)
      for (const key of Object.keys(KNOWN_FINDINGS)) {
        if (!seenKnown.has(key)) problems.push(`${key}: listed in KNOWN_FINDINGS but now refuses correctly; remove the entry`)
      }

      for (const [stage, after] of [["B", afterB], ["the signed-out calls", afterOut]] as const) {
        for (const url of Object.keys(before)) {
          if (after[url] !== before[url]) problems.push(`LEAK: after ${stage}, A's ${url} changed:\n    was ${before[url].slice(0, 300)}\n    now ${after[url].slice(0, 300)}`)
        }
      }

      expect(problems, "answers that are not a refusal, and rows that changed").toEqual([])
    } finally {
      await contextB.close()
      await contextOut.close()
      // The worker's next test starts on this account: leave no session, no open workout, no program.
      // ensureNoActiveSessionViaAPI ends whichever session is active, not only the seeded one.
      await ensureNoActiveSessionViaAPI(page).catch(() => undefined)
      await a.delete(`/api/workouts/${seeds.workoutOpen.id}`).catch(() => undefined)
    }
  })
})
