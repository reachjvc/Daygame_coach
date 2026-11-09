import { describe, it, expect } from "vitest"
import { reminderPayload } from "@/src/goals/reviewReminderService"
import { periodOf } from "@/src/goals/reviewService"

describe("the weekly review reminder's notification", () => {
  it("names the week and opens it, and carries nothing else", () => {
    // It takes only a period, so nothing the person wrote can reach it.
    expect(reminderPayload(periodOf("week", "2026-11-09"))).toEqual({
      title: "Weekly review",
      body: "Look back at 9 – 15 Nov 2026: score, magic moments, next week.",
      url: "/plan?step=review&period=week-2026-11-09",
      tag: "plan-review",
      renotify: false,
    })
  })
})
