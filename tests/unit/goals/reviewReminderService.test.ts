import { describe, it, expect } from "vitest"
import { reminderEntryId, reminderPayload } from "@/src/goals/reviewReminderService"
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

describe("the reminder's one-send key (Phase 6: one per week)", () => {
  it("is the Monday of the ISO week the reminder goes out in, whatever the day", () => {
    // Monday 9 to Sunday 15 Nov 2026 share one key; Monday 16 starts the next.
    for (const day of ["2026-11-09", "2026-11-11", "2026-11-13", "2026-11-15"]) {
      expect(reminderEntryId("u1", day)).toBe("plan-review:u1:2026-11-09")
    }
    expect(reminderEntryId("u1", "2026-11-16")).toBe("plan-review:u1:2026-11-16")
  })

  it("crosses a year the way ISO weeks do: Friday 1 Jan 2027 belongs to the week of Monday 28 Dec", () => {
    expect(reminderEntryId("u1", "2027-01-01")).toBe("plan-review:u1:2026-12-28")
  })
})
