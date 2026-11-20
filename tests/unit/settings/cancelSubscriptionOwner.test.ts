/**
 * A user can insert his own `purchases` row with any Stripe subscription id.
 * Cancelling or resuming must still refuse a subscription whose Stripe
 * customer is somebody else, and must not call Stripe's update.
 */
import { describe, it, expect, vi, beforeEach } from "vitest"

import { handleCancelSubscription, handleReactivateSubscription } from "@/src/settings/settingsService"

const m = vi.hoisted(() => ({
  update: vi.fn(async () => ({})),
  customerEmail: "me@example.com",
  profileEmail: "me@example.com",
}))

vi.mock("@/src/settings/stripe", () => ({
  getStripe: () => ({
    subscriptions: {
      retrieve: async () => ({ customer: "cus_x" }),
      update: m.update,
    },
    customers: { retrieve: async () => ({ id: "cus_x", email: m.customerEmail }) },
  }),
}))

vi.mock("@/src/db/settingsRepo", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/src/db/settingsRepo")>()),
  getActiveSubscriptionPurchase: vi.fn(async () => ({ stripe_subscription_id: "sub_foreign" })),
  getSettingsProfile: vi.fn(async () => ({ id: "u1", email: m.profileEmail })),
  updateSubscriptionStatus: vi.fn(async () => {}),
  updateSubscriptionCancelledAt: vi.fn(async () => {}),
}))

beforeEach(() => {
  m.update.mockClear()
  m.customerEmail = "me@example.com"
  m.profileEmail = "me@example.com"
})

describe("subscription belongs to the user", () => {
  it("refuses a foreign subscription and never calls Stripe update (cancel)", async () => {
    m.customerEmail = "someone-else@example.com"
    await expect(handleCancelSubscription("u1")).rejects.toMatchObject({ code: "UNAUTHORIZED" })
    expect(m.update).not.toHaveBeenCalled()
  })

  it("refuses a foreign subscription and never calls Stripe update (reactivate)", async () => {
    m.customerEmail = "someone-else@example.com"
    await expect(handleReactivateSubscription("u1")).rejects.toMatchObject({ code: "UNAUTHORIZED" })
    expect(m.update).not.toHaveBeenCalled()
  })

  it("refuses when the profile has no email", async () => {
    m.profileEmail = ""
    await expect(handleCancelSubscription("u1")).rejects.toMatchObject({ code: "UNAUTHORIZED" })
    expect(m.update).not.toHaveBeenCalled()
  })

  it("cancels his own subscription (email match ignores case)", async () => {
    m.customerEmail = "ME@Example.com"
    await handleCancelSubscription("u1")
    expect(m.update).toHaveBeenCalledWith("sub_foreign", { cancel_at_period_end: true })
  })
})
