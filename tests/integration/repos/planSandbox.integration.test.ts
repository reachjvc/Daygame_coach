/**
 * THE COPY SPACE, against the real schema and real row security
 * (Plans/plan-in-steps.md, Phase 2).
 *
 * What is proved here, through real sign-ins and PostgREST:
 *   - the hidden account is made on first use and the server acts as it;
 *   - copy: per table, the same row count and equal content once ids are
 *     compared by name; the owner's reminders are copied switched OFF;
 *   - the owner's rows are byte-identical after copy, after edits in the copy
 *     and after reset (a fingerprint of every plan and day table);
 *   - the hidden account cannot read or write the owner's rows, nor the owner
 *     the hidden account's; no account but the owner resolves the copy space;
 *   - reset leaves the hidden account nothing, so it is brand new;
 *   - the senders skip it (a reminder due for it is sent to nobody).
 */
import { describe, it, expect, vi, beforeEach } from "vitest"
import { randomUUID } from "node:crypto"
import { actAs, admin, asOwner, newUser, stackEnv, type TestUser } from "@/tests/db/harness"
import { fullPlan } from "@/tests/support/fullLifePlan"
import { planToRows } from "@/src/goals/lifePlanMapper"
import { diffPlanRows } from "@/src/goals/lifePlanDiff"
import { applyLifePlanChanges, ensureLifePlan, readLifePlan } from "@/src/db/lifePlanRepo"
import { readDayRows, readNodeIds, saveDay } from "@/src/db/lifePlanDayRepo"
import { readReminder, writeReminder } from "@/src/db/lifePlanRemindersRepo"
import { registerDevice } from "@/src/db/notificationsRepo"
import { isSandboxUser, resolvePlanTarget, SandboxNotFoundError, type ResolvedPlanTarget } from "@/src/db/planSandbox"
import { copyIntoSandbox, resetSandbox } from "@/src/db/planSandboxCopy"
import { MAPPED_COLUMNS, NULLED_COLUMNS, canonicalDays, canonicalPlan } from "@/src/goals/planSandboxCopy"
import { PLAN_ROW_KEYS } from "@/src/db/lifePlanTypes"
import { runPlanReviewClock } from "@/src/goals/reviewReminderService"

vi.mock("@/src/db/supabase", async (importOriginal) =>
  (await import("@/tests/db/harness")).stackSupabaseModule(await importOriginal()),
)
vi.mock("@/src/db/notificationsRepo", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/src/db/notificationsRepo")>()),
  readNotificationSecret: async (name: string) => (name === "notifications_clock_secret" ? null : `test-${name}`),
}))
const sent: { endpoint: string }[] = []
vi.mock("web-push", () => ({
  default: {
    sendNotification: async (sub: { endpoint: string }) => {
      sent.push({ endpoint: sub.endpoint })
      return { statusCode: 201, body: "", headers: {} }
    },
  },
}))

beforeEach(() => {
  const env = stackEnv()
  process.env.NEXT_PUBLIC_SUPABASE_URL = env.API_URL
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = env.ANON_KEY
  sent.length = 0
})

/** Every plan and day table, by name (the plan's tables are the ones `apply_life_plan_changes` writes). */
const PLAN_TABLES = [
  "life_plan_nodes", "life_plan_north_stars", "life_plan_areas", "life_plan_goals", "life_plan_goal_checkpoints",
  "life_plan_goal_obstacles", "life_plan_goal_beliefs", "life_plan_routines", "life_plan_routine_steps",
  "life_plan_routine_split_days", "life_plan_experiences", "life_plan_fields", "life_plan_sub_steps", "life_plan_seasons",
  "life_plan_goal_feeds", "life_plan_goal_serves", "life_plan_routine_serves", "life_plan_step_serves", "life_plan_reviews",
  "life_plan_season_areas", "life_plan_season_goals", "life_plan_review_scores", "life_plan_review_goals", "life_plan_values",
  "life_plan_answers",
] as const
/** Link rows are keyed by the pair they join and have no id of their own. */
const LINK_TABLES = new Set<string>(["life_plan_goal_feeds", "life_plan_goal_serves", "life_plan_routine_serves", "life_plan_step_serves", "life_plan_season_areas", "life_plan_season_goals", "life_plan_review_scores", "life_plan_review_goals"])
const DAY_TABLES = ["life_plan_days", "life_plan_day_ratings", "life_plan_day_ticks", "life_plan_day_journal", "life_plan_day_numbers"] as const
const ALL_TABLES = ["life_plans", ...PLAN_TABLES, ...DAY_TABLES, "life_plan_reminders"] as const

/** Row count and a hash of every row's text, per table, for one account. */
async function fingerprint(userId: string): Promise<Record<string, string>> {
  return asOwner(async (q) => {
    const out: Record<string, string> = {}
    for (const t of ALL_TABLES) {
      const [r] = await q(
        `select count(*)::int as n, md5(coalesce(string_agg(x::text, '|' order by x::text), '')) as h from public.${t} x where user_id = $1`,
        [userId],
      )
      out[t] = `${r.n}:${r.h}`
    }
    return out
  })
}
const counts = (fp: Record<string, string>) => Object.fromEntries(Object.entries(fp).map(([k, v]) => [k, Number(v.split(":")[0])]))

/** An owner with a copy space row, the full plan, and days with something in every day table. */
async function arrangeOwner(label: string) {
  const owner = await newUser(label)
  await asOwner((q) => q("insert into public.plan_sandboxes (owner_id) values ($1)", [owner.id]))
  actAs(owner)
  const made = await ensureLifePlan(owner.id, owner.client)
  const minted = new Map<string, string>()
  const rows = planToRows(fullPlan(), {
    planId: made.id,
    userId: owner.id,
    idFor: (l) => minted.get(l) ?? minted.set(l, randomUUID()).get(l)!,
  })
  await applyLifePlanChanges(diffPlanRows(null, rows), made.revision, owner.id, owner.client)
  const ids = await readNodeIds(owner.id, made.id, owner.client)
  const area = rows.nodes.find((n) => n.kind === "area")!.local_id
  const step = rows.nodes.find((n) => n.kind === "routine_step")!.local_id
  const goal = rows.nodes.find((n) => n.kind === "goal")!.local_id
  await saveDay(owner.id, made.id, { date: "2026-01-05", note: "a line", ratings: { [area]: 7 }, ticks: { [step]: true }, numbers: { [goal]: 3 }, journal: { f1: "Fine" }, asked: { f1: "How did it go?" } }, ids, owner.client)
  await saveDay(owner.id, made.id, { date: "2026-01-06", ratings: { [area]: 4 } }, ids, owner.client)
  await saveDay(owner.id, made.id, { date: "2026-01-07" }, ids, owner.client) // a day with nothing in it
  await writeReminder(owner.id, { pushOn: true, reviewDay: 3, reviewHour: 8 }, owner.client)
  return { owner, planId: made.id }
}

/** The owner as the copy code takes it: an id and the owner's own signed-in client. */
const sess = (u: TestUser) => ({ userId: u.id, supabase: u.client })

async function sandboxOf(owner: TestUser): Promise<ResolvedPlanTarget> {
  return resolvePlanTarget({ userId: owner.id, supabase: owner.client }, "sandbox")
}

describe("the hidden account", () => {
  it("is made on first use, is not the owner, signs in for real, and is recorded on the owner's row", async () => {
    const { owner } = await arrangeOwner("sbx-first")
    const sandbox = await sandboxOf(owner)
    expect(sandbox.userId).not.toBe(owner.id)
    const me = await sandbox.supabase.auth.getUser()
    expect(me.data.user?.id).toBe(sandbox.userId)
    expect(me.data.user?.email).toMatch(/^plan-sandbox-.+@sandbox\.invalid$/)
    expect(me.data.user?.app_metadata).toMatchObject({ plan_sandbox: true })
    const [row] = await asOwner((q) => q("select sandbox_user_id from public.plan_sandboxes where owner_id = $1", [owner.id]))
    expect(row.sandbox_user_id).toBe(sandbox.userId)
    expect((await sandboxOf(owner)).userId).toBe(sandbox.userId)
    // The profile row exists (the real signup trigger), so nothing that expects one fails.
    const prof = await asOwner((q) => q("select id from public.profiles where id = $1", [sandbox.userId]))
    expect(prof).toHaveLength(1)
  })

  it("is made once even when two first requests race", async () => {
    const owner = await newUser("sbx-race")
    await asOwner((q) => q("insert into public.plan_sandboxes (owner_id) values ($1)", [owner.id]))
    const [a, b, c] = await Promise.all([sandboxOf(owner), sandboxOf(owner), sandboxOf(owner)])
    expect(new Set([a.userId, b.userId, c.userId]).size).toBe(1)
    const made = await asOwner((q) => q("select count(*)::int as n from auth.users where id = $1", [a.userId]))
    expect(made[0].n).toBe(1)
    // The accounts the losers made are gone: only one hidden account exists for this owner.
    const [row] = await asOwner((q) => q("select sandbox_user_id from public.plan_sandboxes where owner_id = $1", [owner.id]))
    expect(row.sandbox_user_id).toBe(a.userId)
  })

  it("is found only by its owner: an account with no row gets NotFound, and the row cannot be made from a browser session", async () => {
    const { owner } = await arrangeOwner("sbx-owner")
    const stranger = await newUser("sbx-stranger")
    await expect(resolvePlanTarget({ userId: stranger.id, supabase: stranger.client }, "sandbox")).rejects.toBeInstanceOf(SandboxNotFoundError)

    // Row security: select-own only, nothing to write.
    const own = await owner.client.from("plan_sandboxes").select("owner_id, sandbox_user_id")
    expect(own.data).toHaveLength(1)
    expect((await stranger.client.from("plan_sandboxes").select("*")).data).toEqual([])
    const made = await stranger.client.from("plan_sandboxes").insert({ owner_id: stranger.id })
    expect(made.error).not.toBeNull()
    const moved = await owner.client.from("plan_sandboxes").update({ sandbox_user_id: stranger.id }).eq("owner_id", owner.id).select()
    expect(moved.data ?? []).toEqual([])
    const stolen = await stranger.client.from("plan_sandboxes").update({ owner_id: stranger.id }).eq("owner_id", owner.id).select()
    expect(stolen.data ?? []).toEqual([])
    const removed = await owner.client.from("plan_sandboxes").delete().eq("owner_id", owner.id).select()
    expect(removed.data ?? []).toEqual([])
    expect(await asOwner((q) => q("select 1 from public.plan_sandboxes where owner_id = $1", [owner.id]))).toHaveLength(1)

    // Nothing resolves from the hidden account back to the owner.
    const sandbox = await sandboxOf(owner)
    expect((await sandbox.supabase.from("plan_sandboxes").select("*")).data).toEqual([])
    await expect(resolvePlanTarget({ userId: sandbox.userId, supabase: sandbox.supabase }, "sandbox")).rejects.toBeInstanceOf(SandboxNotFoundError)
  })

  it("the schema holds no uuid column the copy does not know about", async () => {
    const cols = await asOwner((q) =>
      q(
        `select table_name, column_name from information_schema.columns
          where table_schema = 'public' and table_name like 'life_plan%' and udt_name = 'uuid'`,
      ),
    )
    const known = new Set<string>([...MAPPED_COLUMNS, ...NULLED_COLUMNS, "user_id"])
    const unknown = cols.filter((c) => !known.has(c.column_name as string)).map((c) => `${c.table_name}.${c.column_name}`)
    expect(unknown, "a uuid column the id remap does not rewrite: add it to MAPPED_COLUMNS or NULLED_COLUMNS").toEqual([])
    // And the list holds nothing the schema does not have, so it cannot rot unnoticed.
    const present = new Set(cols.map((c) => c.column_name as string))
    for (const c of [...MAPPED_COLUMNS, ...NULLED_COLUMNS]) expect(present.has(c), `${c} is not a uuid column any more`).toBe(true)
  })
})

describe("copying the owner's plan in", () => {
  it("copies every table: the same row count, and equal content once ids are compared by name", async () => {
    const { owner, planId } = await arrangeOwner("sbx-copy")
    const sandbox = await sandboxOf(owner)
    const ownerBefore = await fingerprint(owner.id)

    expect(await copyIntoSandbox(sess(owner), sandbox)).toBe(true)

    const theirs = counts(await fingerprint(sandbox.userId))
    const mine = counts(ownerBefore)
    for (const t of ALL_TABLES) expect(theirs[t], `${t}: row count`).toBe(mine[t])
    // The fixture fills the whole plan, or "equal" would be vacuous.
    for (const t of [...PLAN_TABLES, ...DAY_TABLES, "life_plans", "life_plan_reminders"]) expect(mine[t], `${t} is empty in the fixture`).toBeGreaterThan(0)

    const ownerPlan = (await readLifePlan(owner.id, owner.client))!
    const copy = (await readLifePlan(sandbox.userId, sandbox.supabase))!
    const a = canonicalPlan(ownerPlan.rows)
    const b = canonicalPlan(copy.rows)
    for (const table of PLAN_ROW_KEYS) expect(b[table], table).toEqual(a[table])

    const ownerDays = await readDayRows(owner.id, planId, owner.client)
    const copyDays = await readDayRows(sandbox.userId, copy.rows.plan_id, sandbox.supabase)
    expect(canonicalDays(copyDays, copy.rows.nodes)).toEqual(canonicalDays(ownerDays, ownerPlan.rows.nodes))
    expect(copyDays.days).toHaveLength(3)

    // No id is shared between the two accounts, in any table.
    const shared = await asOwner(async (q) => {
      let n = 0
      for (const t of ["life_plans", ...PLAN_TABLES.filter((x) => !LINK_TABLES.has(x)), "life_plan_days", "life_plan_day_journal"]) {
        const [r] = await q(
          `select count(*)::int as n from public.${t} a join public.${t} b on a.id = b.id where a.user_id = $1 and b.user_id = $2`,
          [owner.id, sandbox.userId],
        )
        n += r.n as number
      }
      return n
    })
    expect(shared).toBe(0)

    // The training enrollment belongs to the owner; the copy holds none.
    const refs = await asOwner((q) => q("select count(*)::int as n from public.life_plan_routines where user_id = $1 and enrollment_id is not null", [sandbox.userId]))
    expect(refs[0].n).toBe(0)

    // The owner's own rows did not move.
    expect(await fingerprint(owner.id)).toEqual(ownerBefore)
  })

  it("copies the reminder switched OFF, keeping its day and hour", async () => {
    const { owner } = await arrangeOwner("sbx-reminder")
    const sandbox = await sandboxOf(owner)
    await copyIntoSandbox(sess(owner), sandbox)
    expect(await readReminder(sandbox.userId, sandbox.supabase)).toEqual({ pushOn: false, reviewDay: 3, reviewHour: 8 })
    expect((await readReminder(owner.id, owner.client)).pushOn).toBe(true)
  })

  it("replaces an earlier copy: copying twice leaves one plan, not two", async () => {
    const { owner } = await arrangeOwner("sbx-twice")
    const sandbox = await sandboxOf(owner)
    await copyIntoSandbox(sess(owner), sandbox)
    const once = counts(await fingerprint(sandbox.userId))
    await copyIntoSandbox(sess(owner), sandbox)
    expect(counts(await fingerprint(sandbox.userId))).toEqual(once)
  })

  it("an owner with no plan yet gets an empty copy", async () => {
    const owner = await newUser("sbx-noplan")
    await asOwner((q) => q("insert into public.plan_sandboxes (owner_id) values ($1)", [owner.id]))
    actAs(owner)
    const sandbox = await sandboxOf(owner)
    expect(await copyIntoSandbox(sess(owner), sandbox)).toBe(false)
    expect(await readLifePlan(sandbox.userId, sandbox.supabase)).toBeNull()
  })

  it("refuses to run against the real account", async () => {
    const { owner } = await arrangeOwner("sbx-guard")
    const self = await resolvePlanTarget({ userId: owner.id, supabase: owner.client }, "self")
    await expect(copyIntoSandbox(sess(owner), self)).rejects.toThrow(/copy space/)
    await expect(resetSandbox(self)).rejects.toThrow(/copy space/)
  })
})

describe("playing in the copy, and resetting it", () => {
  it("edits made in the copy never reach the owner, and reset leaves the copy empty and the owner untouched", async () => {
    const { owner } = await arrangeOwner("sbx-play")
    const sandbox = await sandboxOf(owner)
    await copyIntoSandbox(sess(owner), sandbox)
    const ownerBefore = await fingerprint(owner.id)

    // Edit the plan the way the page does: a change-only save, as the hidden account.
    const copy = (await readLifePlan(sandbox.userId, sandbox.supabase))!
    const goal = copy.rows.goals[0]
    const edited = { ...copy.rows, goals: copy.rows.goals.map((g) => (g.id === goal.id ? { ...g, title: "Changed in the copy" } : g)) }
    await applyLifePlanChanges(diffPlanRows(copy.rows, edited), copy.revision, sandbox.userId, sandbox.supabase)
    const ids = await readNodeIds(sandbox.userId, copy.rows.plan_id, sandbox.supabase)
    const area = copy.rows.nodes.find((n) => n.kind === "area")!.local_id
    await saveDay(sandbox.userId, copy.rows.plan_id, { date: "2026-02-02", note: "only in the copy", ratings: { [area]: 9 } }, ids, sandbox.supabase)
    // Remove a goal outright, which cascades its ticks and numbers in the copy.
    const gone = copy.rows.goals[1]
    await applyLifePlanChanges(diffPlanRows(edited, { ...edited, goals: edited.goals.filter((g) => g.id !== gone.id) }), copy.revision + 1, sandbox.userId, sandbox.supabase)

    expect((await readLifePlan(sandbox.userId, sandbox.supabase))!.rows.goals.some((g) => g.title === "Changed in the copy")).toBe(true)
    expect(await fingerprint(owner.id)).toEqual(ownerBefore)

    await resetSandbox(sandbox)
    const empty = counts(await fingerprint(sandbox.userId))
    for (const t of ALL_TABLES) expect(empty[t], `${t} after reset`).toBe(0)
    expect(await readLifePlan(sandbox.userId, sandbox.supabase)).toBeNull()
    expect(await fingerprint(owner.id)).toEqual(ownerBefore)

    // Copying again after a reset works, from the owner's unchanged data.
    await copyIntoSandbox(sess(owner), sandbox)
    expect(counts(await fingerprint(sandbox.userId))).toEqual(counts(ownerBefore))
    expect(await fingerprint(owner.id)).toEqual(ownerBefore)
  })

  it("the hidden account cannot read or write the owner's plan, nor the owner the hidden account's", async () => {
    const { owner, planId } = await arrangeOwner("sbx-fence")
    const sandbox = await sandboxOf(owner)
    await copyIntoSandbox(sess(owner), sandbox)
    const ownerBefore = await fingerprint(owner.id)

    // Reads: only its own rows come back, however it asks.
    const seen = await sandbox.supabase.from("life_plans").select("id, user_id")
    expect((seen.data ?? []).every((r) => r.user_id === sandbox.userId)).toBe(true)
    expect(((await sandbox.supabase.from("life_plans").select("id").eq("id", planId)).data ?? [])).toEqual([])
    expect(((await sandbox.supabase.from("life_plan_goals").select("id").eq("user_id", owner.id)).data ?? [])).toEqual([])
    // Writes: the save function finds nothing of the owner's to write to.
    const ownerNode = (await owner.client.from("life_plan_nodes").select("id, local_id").eq("plan_id", planId).limit(1)).data![0]
    const attempt = await sandbox.supabase.rpc("apply_life_plan_changes", {
      p_changes: { plan_id: planId, plan: {}, upsert: {}, remove: { nodes: [{ id: ownerNode.id }] }, replace: [] },
      p_expected_rev: 0,
    })
    expect(attempt.error).not.toBeNull()
    const direct = await sandbox.supabase.from("life_plan_goals").update({ title: "hacked" }).eq("user_id", owner.id).select()
    expect(direct.data ?? []).toEqual([])
    const del = await sandbox.supabase.from("life_plans").delete().eq("id", planId).select()
    expect(del.data ?? []).toEqual([])
    expect(await fingerprint(owner.id)).toEqual(ownerBefore)

    // And the other way.
    const theirPlan = (await readLifePlan(sandbox.userId, sandbox.supabase))!.rows.plan_id
    expect(((await owner.client.from("life_plans").select("id").eq("id", theirPlan)).data ?? [])).toEqual([])
    const theirs = await owner.client.from("life_plan_goals").update({ title: "hacked" }).eq("user_id", sandbox.userId).select()
    expect(theirs.data ?? []).toEqual([])
  })
})

describe("senders", () => {
  const CPH = "Europe/Copenhagen"
  const SUNDAY_1905 = new Date("2026-11-15T18:05:00Z")

  it("know the hidden account, and not the owner", async () => {
    const { owner } = await arrangeOwner("sbx-known")
    const sandbox = await sandboxOf(owner)
    expect(await isSandboxUser(sandbox.userId)).toBe(true)
    expect(await isSandboxUser(owner.id)).toBe(false)
  })

  it("send a due weekly reminder to a real person and to nobody in the copy space", async () => {
    const { owner } = await arrangeOwner("sbx-clock")
    const sandbox = await sandboxOf(owner)
    const real = await newUser("sbx-clock-real")
    actAs(real)

    // The same setup for both: a phone with reminders on, and the reminder due Sunday 19:00 in Copenhagen.
    const endpoint = (label: string) => `https://fcm.googleapis.com/fcm/send/${label}-${randomUUID()}`
    const phones = { real: endpoint("real"), hidden: endpoint("hidden") }
    for (const [who, id] of [["real", real.id], ["hidden", sandbox.userId]] as const) {
      await asOwner((q) => q("update public.profiles set timezone = $2 where id = $1", [id, CPH]))
      await registerDevice(id, { endpoint: phones[who], p256dh: "BNcR", auth: "tBHI", label: "Phone" })
      await asOwner((q) =>
        q(
          `insert into public.life_plan_reminders (user_id, push_on, review_day, review_hour) values ($1, true, 7, 19)
           on conflict (user_id) do update set push_on = true, review_day = 7, review_hour = 19`,
          [id],
        ),
      )
    }
    // Both are due: the database's own list names both. Only the exclusion keeps the hidden one out.
    const due = await admin().rpc("plan_reviews_due", { p_limit: 500, p_now: SUNDAY_1905.toISOString() })
    const dueIds = ((due.data ?? []) as { user_id: string }[]).map((r) => r.user_id)
    expect(dueIds).toContain(real.id)
    expect(dueIds).toContain(sandbox.userId)

    await runPlanReviewClock(SUNDAY_1905)

    const to = (e: string) => sent.filter((s) => s.endpoint === e)
    expect(to(phones.real), "the control person is reminded, so the clock ran").toHaveLength(1)
    expect(to(phones.hidden)).toHaveLength(0)
    const records = await asOwner((q) => q("select 1 from public.notification_sends where user_id = $1", [sandbox.userId]))
    expect(records).toHaveLength(0)
  })
})
