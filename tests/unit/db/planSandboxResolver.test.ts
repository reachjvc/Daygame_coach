/**
 * WHO A COPY-SPACE REQUEST ACTS AS (Plans/plan-in-steps.md, Phase 2.3).
 *
 * The properties that keep the copy away from the real account, with the
 * Supabase pieces faked so each can be broken on purpose:
 *   - the target is found ONLY through the signed-in account's own row;
 *   - no row is a 404, and nothing else is tried;
 *   - the minted session must belong to the hidden account or nothing is returned;
 *   - the service role touches nothing but `plan_sandboxes` and the auth admin calls;
 *   - a request naming any account but the one it acts on is refused.
 * The same properties are proved on a real database in
 * tests/integration/repos/planSandbox.integration.test.ts.
 */
import { describe, it, expect, vi, beforeEach } from "vitest"

const OWNER = "00000000-0000-4000-8000-0000000000a1"
const OTHER = "00000000-0000-4000-8000-0000000000b2"
const HIDDEN = "00000000-0000-4000-8000-0000000000c3"

const adminFromTables: string[] = []
const calls: { eq: [string, unknown][]; isNull: string[]; updated: unknown[]; deleted: string[]; created: unknown[]; links: string[] } = {
  eq: [],
  isNull: [],
  updated: [],
  deleted: [],
  created: [],
  links: [],
}
let ownerRow: { sandbox_user_id: string | null } | null = null
let claimResult: { data: unknown[]; error: null } = { data: [{ sandbox_user_id: HIDDEN }], error: null }
let winnerRow: { sandbox_user_id: string | null } | null = { sandbox_user_id: HIDDEN }
let verifyUserId = HIDDEN
let lookupFails = false
let realUser: { email: string; app_metadata: Record<string, unknown> } | null = null
let lookupRows: unknown[] = [{ owner_id: OWNER }]

const admin = {
  auth: {
    admin: {
      createUser: vi.fn(async (args: unknown) => {
        calls.created.push(args)
        return { data: { user: { id: HIDDEN } }, error: null }
      }),
      deleteUser: vi.fn(async (id: string) => {
        calls.deleted.push(id)
        return { error: null }
      }),
      getUserById: vi.fn(async () => ({ data: { user: realUser ?? { email: "plan-sandbox-x@sandbox.invalid", app_metadata: { plan_sandbox: true } } }, error: null })),
      generateLink: vi.fn(async (args: { email: string }) => {
        calls.links.push(args.email)
        return { data: { properties: { hashed_token: "hash" } }, error: null }
      }),
    },
  },
  from: vi.fn((table: string) => {
    adminFromTables.push(table)
    return {
      update: (v: unknown) => {
        calls.updated.push(v)
        const q: Record<string, unknown> = {
          eq: () => q,
          is: (c: string) => {
            calls.isNull.push(c)
            return q
          },
          select: async () => claimResult,
        }
        return q
      },
      select: () => {
        const q: Record<string, unknown> = {
          eq: () => q,
          limit: async () => (lookupFails ? { data: null, error: { message: "down" } } : { data: lookupRows, error: null }),
          maybeSingle: async () => ({ data: winnerRow, error: null }),
        }
        return q
      },
    }
  }),
}

const minted = { verifyOtp: vi.fn(async () => ({ data: { session: { expires_in: 3600 }, user: { id: verifyUserId } }, error: null })) }
vi.mock("@supabase/supabase-js", () => ({ createClient: () => ({ auth: minted, tag: "sandbox-client" }) }))

const serverClient = { auth: { getUser: vi.fn() }, from: vi.fn() }
vi.mock("@/src/db/supabase", () => ({
  createAdminSupabaseClient: () => admin,
  createServerSupabaseClient: async () => serverClient,
  unmemoizedFetch: fetch,
}))

import {
  SandboxNotFoundError,
  isSandboxUser,
  readTarget,
  requirePlanTarget,
  resolvePlanTarget,
} from "@/src/db/planSandbox"

function sessionWithRow(row: { sandbox_user_id: string | null } | null) {
  ownerRow = row
  const from = vi.fn((table: string) => {
    const q: Record<string, unknown> = {
      select: () => q,
      eq: (c: string, v: unknown) => {
        calls.eq.push([`${table}.${c}`, v])
        return q
      },
      maybeSingle: async () => ({ data: ownerRow, error: null }),
    }
    return q
  })
  return { userId: OWNER, supabase: { from } as never, from }
}

beforeEach(() => {
  adminFromTables.length = 0
  Object.assign(calls, { eq: [], isNull: [], updated: [], deleted: [], created: [], links: [] })
  claimResult = { data: [{ sandbox_user_id: HIDDEN }], error: null }
  winnerRow = { sandbox_user_id: HIDDEN }
  verifyUserId = HIDDEN
  lookupFails = false
  realUser = null
  lookupRows = [{ owner_id: OWNER }]
  vi.clearAllMocks()
  process.env.NEXT_PUBLIC_SUPABASE_URL = "http://stack"
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "anon"
})

describe("resolving a plan target", () => {
  it("'self' is the signed-in account and its own client, and asks nothing", async () => {
    const s = sessionWithRow(null)
    const t = await resolvePlanTarget(s, "self")
    expect(t).toMatchObject({ userId: OWNER, ownerId: OWNER, target: "self" })
    expect(t.supabase).toBe(s.supabase)
    expect(s.from).not.toHaveBeenCalled()
    expect(admin.from).not.toHaveBeenCalled()
  })

  it("'sandbox' with no row is NotFound, and nothing is made or minted", async () => {
    await expect(resolvePlanTarget(sessionWithRow(null), "sandbox")).rejects.toBeInstanceOf(SandboxNotFoundError)
    expect(admin.auth.admin.createUser).not.toHaveBeenCalled()
    expect(admin.auth.admin.generateLink).not.toHaveBeenCalled()
  })

  it("finds the row only by the SESSION's own id, never by anything the caller supplies", async () => {
    await resolvePlanTarget(sessionWithRow({ sandbox_user_id: HIDDEN }), "sandbox")
    expect(calls.eq).toEqual([["plan_sandboxes.owner_id", OWNER]])
  })

  it("acts as the hidden account: its id, a minted client, the owner kept as the owner", async () => {
    const t = await resolvePlanTarget(sessionWithRow({ sandbox_user_id: HIDDEN }), "sandbox")
    expect(t).toMatchObject({ userId: HIDDEN, ownerId: OWNER, target: "sandbox" })
    expect((t.supabase as unknown as { tag: string }).tag).toBe("sandbox-client")
    expect(t.userId).not.toBe(OWNER)
  })

  it("never returns a client whose session belongs to anybody but the hidden account", async () => {
    verifyUserId = OTHER
    const s = sessionWithRow({ sandbox_user_id: "00000000-0000-4000-8000-0000000000d4" })
    await expect(resolvePlanTarget(s, "sandbox")).rejects.toThrow(/wrong account|sign in to the copy space/)
  })

  it("never mints for an account that is not plainly a hidden one, whatever the row says", async () => {
    const REAL = "00000000-0000-4000-8000-0000000000e5"
    for (const user of [
      { email: "jo@example.com", app_metadata: {} },
      { email: "jo@example.com", app_metadata: { plan_sandbox: true } },
      { email: "plan-sandbox-x@sandbox.invalid", app_metadata: {} },
      { email: "plan-sandbox-x@sandbox.invalid", app_metadata: { plan_sandbox: "true" } },
    ]) {
      realUser = user
      await expect(resolvePlanTarget(sessionWithRow({ sandbox_user_id: REAL }), "sandbox")).rejects.toThrow(/not a copy space account/)
    }
    expect(admin.auth.admin.generateLink).not.toHaveBeenCalled()
  })

  it("makes the hidden account on first use: undeliverable address, no password, claimed only while still empty", async () => {
    verifyUserId = HIDDEN
    const t = await resolvePlanTarget(sessionWithRow({ sandbox_user_id: null }), "sandbox")
    expect(t.userId).toBe(HIDDEN)
    const made = calls.created[0] as { email: string; password?: string; email_confirm: boolean }
    expect(made.email).toMatch(/^plan-sandbox-[0-9a-f-]+@sandbox\.invalid$/)
    expect(made.password).toBeUndefined()
    expect(calls.isNull).toEqual(["sandbox_user_id"])
  })

  it("a lost race deletes the account it made and uses the winner's", async () => {
    claimResult = { data: [], error: null }
    winnerRow = { sandbox_user_id: HIDDEN }
    const t = await resolvePlanTarget(sessionWithRow({ sandbox_user_id: null }), "sandbox")
    expect(calls.deleted).toEqual([HIDDEN])
    expect(t.userId).toBe(HIDDEN)
  })

  it("uses the service role for nothing but the sandbox table", async () => {
    await resolvePlanTarget(sessionWithRow({ sandbox_user_id: null }), "sandbox")
    claimResult = { data: [], error: null }
    await resolvePlanTarget(sessionWithRow({ sandbox_user_id: null }), "sandbox")
    expect(new Set(adminFromTables)).toEqual(new Set(["plan_sandboxes"]))
  })
})

describe("what a request may name as its target", () => {
  it("accepts nothing or 'sandbox', and refuses everything else, user ids included", () => {
    expect(readTarget("http://x/api/life-plan")).toBe("self")
    expect(readTarget("http://x/api/life-plan?target=sandbox")).toBe("sandbox")
    expect(readTarget(`http://x/api/life-plan?target=${OTHER}`)).toBe("invalid")
    expect(readTarget("http://x/api/life-plan?target=self")).toBe("invalid")
    expect(readTarget("http://x/api/life-plan?target=")).toBe("invalid")
    expect(readTarget("http://x/api/life-plan?target=sandbox&target=owner")).toBe("sandbox")
  })
})

describe("a plan route's sign-in and target", () => {
  const req = (url: string, headers: Record<string, string> = {}) => new Request(url, { headers })
  const signedIn = (id = OWNER) => serverClient.auth.getUser.mockResolvedValue({ data: { user: { id } }, error: null })
  const withRow = (row: { sandbox_user_id: string | null } | null) => {
    ownerRow = row
    serverClient.from.mockImplementation(() => {
      const q: Record<string, unknown> = { select: () => q, eq: () => q, maybeSingle: async () => ({ data: ownerRow, error: null }) }
      return q
    })
  }

  it("refuses a user id as the target with 400", async () => {
    signedIn()
    const out = await requirePlanTarget(req(`http://x/api/life-plan?target=${OTHER}`))
    expect(out.success).toBe(false)
    if (!out.success) expect(out.response.status).toBe(400)
  })

  it("refuses the signed-out with 401", async () => {
    serverClient.auth.getUser.mockResolvedValue({ data: { user: null }, error: null })
    const out = await requirePlanTarget(req("http://x/api/life-plan?target=sandbox"))
    expect(out.success === false && out.response.status).toBe(401)
  })

  it("answers 404 to an account with no copy space, and mints nothing", async () => {
    signedIn(OTHER)
    withRow(null)
    const out = await requirePlanTarget(req("http://x/api/life-plan?target=sandbox"))
    expect(out.success === false && out.response.status).toBe(404)
    expect(admin.auth.admin.generateLink).not.toHaveBeenCalled()
  })

  it("lets a request that names the hidden account act on it", async () => {
    signedIn()
    withRow({ sandbox_user_id: HIDDEN })
    const out = await requirePlanTarget(req("http://x/api/life-plan?target=sandbox", { "x-page-account": HIDDEN }))
    expect(out.success && out.userId).toBe(HIDDEN)
  })

  it("refuses a sandbox request that names the OWNER (409), and one that names a stranger", async () => {
    signedIn()
    withRow({ sandbox_user_id: HIDDEN })
    for (const named of [OWNER, OTHER]) {
      const out = await requirePlanTarget(req("http://x/api/life-plan?target=sandbox", { "x-page-account": named }))
      expect(out.success === false && out.response.status).toBe(409)
    }
  })

  it("a real-account request still has to name its own account", async () => {
    signedIn()
    const ok = await requirePlanTarget(req("http://x/api/life-plan", { "x-page-account": OWNER }))
    expect(ok.success && ok.userId).toBe(OWNER)
    const refused = await requirePlanTarget(req("http://x/api/life-plan", { "x-page-account": HIDDEN }))
    expect(refused.success === false && refused.response.status).toBe(409)
  })

  it("the copy-only routes act on the copy space whatever the address says", async () => {
    signedIn()
    withRow({ sandbox_user_id: HIDDEN })
    const out = await requirePlanTarget(req("http://x/api/plan-sandbox/reset"), "sandbox")
    expect(out.success && out.target).toBe("sandbox")
  })
})

describe("senders", () => {
  it("know a hidden account; a failed lookup is logged and thrown, never taken for either answer", async () => {
    expect(await isSandboxUser(HIDDEN)).toBe(true)
    lookupRows = []
    expect(await isSandboxUser(OWNER)).toBe(false)
    lookupFails = true
    const logged = vi.spyOn(console, "error").mockImplementation(() => {})
    await expect(isSandboxUser(OWNER)).rejects.toThrow(/look up the copy space/)
    expect(logged).toHaveBeenCalled()
    logged.mockRestore()
  })
})
