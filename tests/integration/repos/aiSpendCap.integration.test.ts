/**
 * THE AI SPEND CAP HOLDS IN THE DATABASE, EVEN WHEN CALLS ARRIVE TOGETHER.
 *
 * `reserveAiSpend` books a call's expected cost before the call runs, and
 * `settleAiSpend` swaps the guess for the real price afterwards
 * (src/db/aiSpendRepo.ts, migration 20261128120000_ai_spend_cap.sql). What
 * only a real Postgres can show: that ten bookings fired at once for the same
 * person cannot all pass a check that each of them reads, and that a settled
 * call counts at its real price.
 *
 * Each test makes its own user and reads only that user's rows.
 */
import { describe, it, expect, vi } from "vitest"
import { asOwner, asUser, newUser } from "@/tests/db/harness"
import { reserveAiSpend, settleAiSpend } from "@/src/db/aiSpendRepo"

vi.mock("@/src/db/supabase", async (importOriginal) =>
  (await import("@/tests/db/harness")).stackSupabaseModule(await importOriginal())
)

const booking = (userId: string, over: Partial<Parameters<typeof reserveAiSpend>[0]> = {}) => ({
  userId,
  feature: "keep-it-going",
  operation: "evaluate",
  model: "claude-haiku-4-5-20251001",
  capCents: 20,
  estimateCents: 3,
  ...over,
})

async function bookedCents(userId: string): Promise<number> {
  const rows = await asOwner((q) =>
    q("select coalesce(sum(total_cost_cents), 0) as cents from ai_usage_logs where user_id = $1", [userId])
  )
  return Number(rows[0].cents)
}

describe("booking AI spend against a person's cap", () => {
  it("books a call that fits under the cap", async () => {
    const user = await newUser("ai-cap")

    const id = await reserveAiSpend(booking(user.id))

    expect(id).toEqual(expect.any(String))
    expect(await bookedCents(user.id)).toBe(3)
  })

  it("refuses a call that would pass the cap, and books nothing", async () => {
    const user = await newUser("ai-cap")
    await reserveAiSpend(booking(user.id, { estimateCents: 18 }))

    const refused = await reserveAiSpend(booking(user.id, { estimateCents: 3 }))

    expect(refused).toBeNull()
    expect(await bookedCents(user.id)).toBe(18)
  })

  it("lets ten calls fired at once book no more than the cap", async () => {
    const user = await newUser("ai-cap")

    const ids = await Promise.all(Array.from({ length: 10 }, () => reserveAiSpend(booking(user.id))))

    // 20 cents of room, 3 cents each: six fit, four are refused.
    expect(ids.filter((id) => id !== null)).toHaveLength(6)
    expect(await bookedCents(user.id)).toBe(18)
  })

  it("counts a settled call at its real price, not its guess", async () => {
    const user = await newUser("ai-cap")
    const id = await reserveAiSpend(booking(user.id, { estimateCents: 15 }))
    if (!id) throw new Error("setup: the booking was refused")

    await settleAiSpend(id, {
      inputTokens: 1200,
      outputTokens: 80,
      cacheCreationTokens: 0,
      cacheReadTokens: 0,
      inputCostCents: 0.12,
      outputCostCents: 0.04,
      cacheCreationCostCents: 0,
      cacheReadCostCents: 0,
      totalCostCents: 0.16,
      responseTimeMs: 900,
    })

    // 0.16 spent, so a 15-cent call fits again.
    expect(await bookedCents(user.id)).toBe(0.16)
    expect(await reserveAiSpend(booking(user.id, { estimateCents: 15 }))).toEqual(expect.any(String))
  })

  it("keeps each feature's spend under its own cap", async () => {
    const user = await newUser("ai-cap")
    await reserveAiSpend(booking(user.id, { feature: "scenario-lab", estimateCents: 20 }))

    const chat = await reserveAiSpend(booking(user.id, { feature: "keep-it-going", estimateCents: 3 }))

    expect(chat).toEqual(expect.any(String))
  })

  it("cannot be run by a signed-in person", async () => {
    const user = await newUser("ai-cap")

    const run = asUser(user.id, (q) =>
      q("select public.ai_spend_reserve($1, 'keep-it-going', 'evaluate', 'm', null, 1000000, 1)", [user.id])
    )

    await expect(run).rejects.toMatchObject({ code: "42501" })
  })

  it("leaves a signed-in person no way to write their own usage rows", async () => {
    const user = await newUser("ai-cap")

    const run = asUser(user.id, (q) =>
      q(
        `insert into ai_usage_logs (user_id, feature, operation, model, input_tokens, output_tokens,
           input_cost_cents, output_cost_cents, total_cost_cents) values ($1, 'keep-it-going', 'x', 'm', 0, 0, 0, 0, -100)`,
        [user.id]
      )
    )

    await expect(run).rejects.toMatchObject({ code: "42501" })
  })
})
