// @vitest-environment node
/**
 * THE COUNCIL ROUTES AND THE COPY SPACE (Plans/plan-new-from-real.md, Phase 3.4 and its security review).
 *
 * The four routes (`council`, `week`, `settings`, `area`) take `?target=` through `requirePlanTarget`:
 *  - `?target=sandbox` for an account with no `plan_sandboxes` row is a 404 and touches nothing;
 *  - any other target is a 400, a user id is never accepted;
 *  - the copy space's reminder stays off: `remindOn` sent to settings there is dropped before the write.
 */
import { describe, it, expect, vi, beforeEach } from "vitest"

const OWNER = "00000000-0000-4000-8000-0000000000a1"
const HIDDEN = "00000000-0000-4000-8000-0000000000c3"

let ownerRow: { sandbox_user_id: string | null } | null = null
const serverClient = {
  auth: { getUser: vi.fn(async () => ({ data: { user: { id: OWNER } }, error: null })) },
  from: vi.fn(() => {
    const q: Record<string, unknown> = {
      select: () => q,
      eq: () => q,
      maybeSingle: async () => ({ data: ownerRow, error: null }),
    }
    return q
  }),
}
const admin = { from: vi.fn(), auth: { admin: {} } }
vi.mock("@/src/db/supabase", () => ({
  createAdminSupabaseClient: () => admin,
  createServerSupabaseClient: async () => serverClient,
  unmemoizedFetch: fetch,
}))

const repo = vi.hoisted(() => ({
  readCouncil: vi.fn(async () => []),
  saveCouncilMember: vi.fn(async () => undefined),
  writeCouncilOrder: vi.fn(async () => undefined),
  removeCouncilMember: vi.fn(async () => undefined),
  readCouncilSettings: vi.fn(async () => ({ weekValue: null, weekOf: null, remindOn: false, remindHour: 8 })),
  writeCouncilSettings: vi.fn(async () => undefined),
  readWeekMarks: vi.fn(async () => []),
  writeWeekMark: vi.fn(async () => undefined),
}))
vi.mock("@/src/db/roleModelsRepo", async (orig) => ({ ...(await orig<typeof import("@/src/db/roleModelsRepo")>()), ...repo }))
vi.mock("@/src/db/notificationsRepo", () => ({ listDevices: vi.fn(async () => []) }))
vi.mock("@/src/db/settingsRepo", () => ({ getUserTimezone: vi.fn(async () => "UTC") }))

import * as council from "@/app/api/role-models/council/route"
import * as week from "@/app/api/role-models/week/route"
import * as settings from "@/app/api/role-models/settings/route"
import * as area from "@/app/api/role-models/area/route"

const URL_BASE = "http://localhost/api/role-models"
const json = (method: string, url: string, body?: unknown) =>
  new Request(url, { method, headers: { "content-type": "application/json" }, body: body === undefined ? undefined : JSON.stringify(body) })

const CASES: Array<[string, string, (req: Request) => Promise<Response>, unknown?]> = [
  ["council GET", "council", council.GET],
  ["council PUT", "council", council.PUT, { order: [] }],
  ["council DELETE", "council", council.DELETE],
  ["week GET", "week", week.GET],
  ["week PUT", "week", week.PUT, {}],
  ["settings GET", "settings", settings.GET],
  ["settings PUT", "settings", settings.PUT, { remindOn: true }],
  ["area GET", "area", area.GET],
]

beforeEach(() => {
  ownerRow = null
  vi.clearAllMocks()
  process.env.NEXT_PUBLIC_SUPABASE_URL = "http://stack"
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "anon"
})

describe.each(CASES)("%s", (name, path, handler, body) => {
  const method = name.split(" ")[1]

  it("?target=sandbox with no copy-space row is 404, and nothing is read or written", async () => {
    ownerRow = null
    const res = await handler(json(method, `${URL_BASE}/${path}?target=sandbox`, body))
    expect(res.status).toBe(404)
    for (const fn of Object.values(repo)) expect(fn).not.toHaveBeenCalled()
  })

  it("an unknown target is 400, and the session is not even asked", async () => {
    const res = await handler(json(method, `${URL_BASE}/${path}?target=x`, body))
    expect(res.status).toBe(400)
    expect(serverClient.auth.getUser).not.toHaveBeenCalled()
    for (const fn of Object.values(repo)) expect(fn).not.toHaveBeenCalled()
  })

  it("a user id is not a target", async () => {
    const res = await handler(json(method, `${URL_BASE}/${path}?target=${HIDDEN}`, body))
    expect(res.status).toBe(400)
  })
})
