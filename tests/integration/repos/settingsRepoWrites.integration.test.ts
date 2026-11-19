/**
 * WHAT settingsRepo's WRITES LEAVE ON `profiles` AND `purchases`.
 *
 * Plans/tests-catch-what-matters.md, Phase 4 (group B). Each writer: the column
 * it sets holds the value, nothing else on the person's row moved, and a second
 * person's row, created first, is byte-identical afterwards. A caller passing
 * somebody else's id changes nothing (row security).
 */
import { describe, it, expect, vi } from "vitest"
import { randomUUID } from "node:crypto"
import { actAs, asOwner, newUser, type TestUser } from "@/tests/db/harness"
import {
  getSandboxSettings,
  resetSandboxSettings,
  updateCurveStyle,
  updateDifficulty,
  updatePreferredLanguage,
  updateSandboxSettings,
  updateSubscriptionCancelledAt,
  updateSubscriptionStatus,
  updateTimezone,
  updateVoiceLanguage,
} from "@/src/db/settingsRepo"
import { DEFAULT_SANDBOX_SETTINGS } from "@/src/scenarios/config"

vi.mock("@/src/db/supabase", async (importOriginal) =>
  (await import("@/tests/db/harness")).stackSupabaseModule(await importOriginal())
)

type Row = Record<string, unknown>

async function profileOf(userId: string): Promise<Row> {
  const [row] = await asOwner((q) => q("select to_jsonb(p) as j from profiles p where id = $1", [userId]))
  return row.j as Row
}

/** The writer is run once; only `column` may differ from before, and it must equal `expected`. */
async function expectOnlyColumnChanged(
  user: TestUser,
  other: TestUser,
  write: () => Promise<unknown>,
  expected: Row
) {
  const before = await profileOf(user.id)
  const othersBefore = await profileOf(other.id)
  actAs(user)

  await write()

  const after = await profileOf(user.id)
  expect(after).toEqual({ ...before, ...expected })
  expect(await profileOf(other.id)).toEqual(othersBefore)
}

async function expectIntruderChangesNothing(owner: TestUser, intruder: TestUser, write: () => Promise<unknown>) {
  const before = await profileOf(owner.id)
  actAs(intruder)
  await write().catch(() => undefined)
  expect(await profileOf(owner.id)).toEqual(before)
}

describe("a person's settings", () => {
  it("updateDifficulty writes difficulty and nothing else", async () => {
    const me = await newUser("set-diff")
    const other = await newUser("set-diff-other")
    await expectOnlyColumnChanged(me, other, () => updateDifficulty(me.id, "expert"), { difficulty: "expert" })
    await expectIntruderChangesNothing(me, other, () => updateDifficulty(me.id, "beginner"))
  })

  it("updateVoiceLanguage writes voice_language and nothing else", async () => {
    const me = await newUser("set-voice")
    const other = await newUser("set-voice-other")
    await expectOnlyColumnChanged(me, other, () => updateVoiceLanguage(me.id, "da-DK"), { voice_language: "da-DK" })
    await expectIntruderChangesNothing(me, other, () => updateVoiceLanguage(me.id, "en-US"))
  })

  it("updatePreferredLanguage writes preferred_language and nothing else", async () => {
    const me = await newUser("set-lang")
    const other = await newUser("set-lang-other")
    await expectOnlyColumnChanged(me, other, () => updatePreferredLanguage(me.id, "da"), { preferred_language: "da" })
    await expectIntruderChangesNothing(me, other, () => updatePreferredLanguage(me.id, "en"))
  })

  it("updateCurveStyle writes curve_style and nothing else", async () => {
    const me = await newUser("set-curve")
    const other = await newUser("set-curve-other")
    await expectOnlyColumnChanged(me, other, () => updateCurveStyle(me.id, "sharp"), { curve_style: "sharp" })
    await expectIntruderChangesNothing(me, other, () => updateCurveStyle(me.id, "zen"))
  })

  it("updateTimezone writes the zone and its source together and nothing else, the source defaulting to chosen", async () => {
    const me = await newUser("set-tz")
    const other = await newUser("set-tz-other")
    await expectOnlyColumnChanged(me, other, () => updateTimezone(me.id, "Asia/Tokyo"), {
      timezone: "Asia/Tokyo",
      timezone_source: "chosen",
    })
    await updateTimezone(me.id, "Europe/Paris", "detected")
    expect(await profileOf(me.id)).toMatchObject({ timezone: "Europe/Paris", timezone_source: "detected" })
    await expectIntruderChangesNothing(me, other, () => updateTimezone(me.id, "UTC", "signup_default"))
  })

  it("updateSubscriptionCancelledAt writes the stamp, and writes null to clear it, and nothing else", async () => {
    const me = await newUser("set-cancel")
    const other = await newUser("set-cancel-other")
    await expectOnlyColumnChanged(
      me,
      other,
      () => updateSubscriptionCancelledAt(me.id, "2026-05-06T07:08:09+00:00"),
      { subscription_cancelled_at: "2026-05-06T07:08:09+00:00" }
    )
    await expectOnlyColumnChanged(me, other, () => updateSubscriptionCancelledAt(me.id, null), {
      subscription_cancelled_at: null,
    })
    await expectIntruderChangesNothing(me, other, () => updateSubscriptionCancelledAt(me.id, "2026-01-01T00:00:00+00:00"))
  })
})

describe("sandbox settings", () => {
  it("updateSandboxSettings merges the change into what is there, keeps every other group, and returns what it wrote", async () => {
    const me = await newUser("set-sandbox")
    const other = await newUser("set-sandbox-other")
    actAs(me)
    await updateSandboxSettings(me.id, { weather: { ...DEFAULT_SANDBOX_SETTINGS.weather, rain: true } as never })
    const otherBefore = await profileOf(other.id)
    const before = await profileOf(me.id)

    const returned = await updateSandboxSettings(me.id, { energy: { ...DEFAULT_SANDBOX_SETTINGS.energy, tired: true } as never })

    const after = await profileOf(me.id)
    expect(after.sandbox_settings).toEqual(returned)
    expect(returned.weather).toMatchObject({ rain: true })
    expect(returned.energy).toMatchObject({ tired: true })
    expect(returned.movement).toEqual(DEFAULT_SANDBOX_SETTINGS.movement)
    expect(await getSandboxSettings(me.id)).toEqual(returned)
    expect({ ...after, sandbox_settings: null }).toEqual({ ...before, sandbox_settings: null })
    expect(await profileOf(other.id)).toEqual(otherBefore)
  })

  it("updateSandboxSettings cannot change somebody else's settings", async () => {
    const owner = await newUser("set-sandbox-owner")
    const intruder = await newUser("set-sandbox-intruder")
    await expectIntruderChangesNothing(owner, intruder, () =>
      updateSandboxSettings(owner.id, { weather: { ...DEFAULT_SANDBOX_SETTINGS.weather, rain: true } as never })
    )
  })

  it("resetSandboxSettings puts back the defaults for that person only, and nothing else on their row", async () => {
    const me = await newUser("set-sandbox-reset")
    const other = await newUser("set-sandbox-reset-other")
    actAs(me)
    await updateSandboxSettings(me.id, { weather: { ...DEFAULT_SANDBOX_SETTINGS.weather, rain: true } as never })
    actAs(other)
    await updateSandboxSettings(other.id, { weather: { ...DEFAULT_SANDBOX_SETTINGS.weather, rain: true } as never })
    const before = await profileOf(me.id)
    const othersBefore = await profileOf(other.id)
    actAs(me)

    const returned = await resetSandboxSettings(me.id)

    expect(returned).toEqual(DEFAULT_SANDBOX_SETTINGS)
    expect(await profileOf(me.id)).toEqual({ ...before, sandbox_settings: DEFAULT_SANDBOX_SETTINGS })
    expect(await profileOf(other.id)).toEqual(othersBefore)
  })
})

describe("the subscription status on a purchase", () => {
  /** A purchase of the person's own, as the table owner. */
  async function purchaseFor(userId: string, stripeSubscriptionId: string, status: string): Promise<void> {
    await asOwner((q) =>
      q(
        `insert into purchases (user_id, stripe_session_id, stripe_subscription_id, subscription_status, status, product_id, amount_cents)
         values ($1, $2, $3, $4, 'completed', 'test-product', 100)`,
        [userId, `cs_${randomUUID()}`, stripeSubscriptionId, status]
      )
    )
  }
  async function purchasesOf(userId: string): Promise<Row[]> {
    return asOwner(async (q) =>
      (await q("select to_jsonb(p) as j from purchases p where user_id = $1 order by stripe_subscription_id", [userId])).map((r) => r.j as Row)
    )
  }

  it("updateSubscriptionStatus writes the status on the subscription named and on no other purchase", async () => {
    const me = await newUser("set-sub")
    const other = await newUser("set-sub-other")
    const tag = randomUUID().slice(0, 8)
    await purchaseFor(me.id, `sub_a_${tag}`, "active")
    await purchaseFor(me.id, `sub_b_${tag}`, "active")
    await purchaseFor(other.id, `sub_c_${tag}`, "active")
    const myBefore = await purchasesOf(me.id)
    const othersBefore = await purchasesOf(other.id)
    actAs(me)

    await updateSubscriptionStatus(me.id, `sub_a_${tag}`, "canceled")

    const mine = await purchasesOf(me.id)
    expect(mine).toEqual(myBefore.map((p) => (p.stripe_subscription_id === `sub_a_${tag}` ? { ...p, subscription_status: "canceled" } : p)))
    expect(await purchasesOf(other.id)).toEqual(othersBefore)
  })

  it("updateSubscriptionStatus does not touch somebody else's purchase, even one the caller names", async () => {
    const me = await newUser("set-sub-mine")
    const other = await newUser("set-sub-theirs")
    const tag = randomUUID().slice(0, 8)
    await purchaseFor(other.id, `sub_d_${tag}`, "active")
    const othersBefore = await purchasesOf(other.id)
    actAs(me)

    await updateSubscriptionStatus(me.id, `sub_d_${tag}`, "canceled")

    expect(await purchasesOf(other.id)).toEqual(othersBefore)
  })
})
