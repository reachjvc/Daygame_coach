import { describe, expect, it } from "vitest"

import {
  councilReminderAllowed,
  councilReminderEntryId,
  councilReminderPayload,
  readSettingsPatch,
  weekOf,
  weekValueFor,
} from "@/src/role-models/councilReminderService"

const CPH = "Europe/Copenhagen"

describe("the council's daily reminder and quiet hours", () => {
  it("goes out in the day and never at night, in the person's own zone", () => {
    // 2026-11-10 is winter time in Copenhagen: UTC+1.
    expect(councilReminderAllowed(new Date("2026-11-10T07:00:00Z"), CPH)).toBe(true) // 08:00
    expect(councilReminderAllowed(new Date("2026-11-10T20:30:00Z"), CPH)).toBe(true) // 21:30
    expect(councilReminderAllowed(new Date("2026-11-10T21:00:00Z"), CPH)).toBe(false) // 22:00
    expect(councilReminderAllowed(new Date("2026-11-10T02:00:00Z"), CPH)).toBe(false) // 03:00
    expect(councilReminderAllowed(new Date("2026-11-10T05:59:00Z"), CPH)).toBe(false) // 06:59
    expect(councilReminderAllowed(new Date("2026-11-10T06:00:00Z"), CPH)).toBe(true) // 07:00
  })

  it("the same instant is night in one zone and day in another", () => {
    const at = new Date("2026-11-10T13:00:00Z")
    expect(councilReminderAllowed(at, CPH)).toBe(true) // 14:00
    expect(councilReminderAllowed(at, "Pacific/Auckland")).toBe(false) // 02:00 next day
  })

  it("is sent once a local day", () => {
    expect(councilReminderEntryId("u1", "2026-11-10")).toBe("council-daily:u1:2026-11-10")
    expect(councilReminderEntryId("u1", "2026-11-10")).not.toBe(councilReminderEntryId("u1", "2026-11-11"))
  })

  it("names the member and the values taken, and opens Today", () => {
    const p = councilReminderPayload("Marcus Aurelius", "he", ["Discipline"])
    expect(p.title).toBe("Your council today: Marcus Aurelius")
    expect(p.body).toBe("Today, as if he were watching. You take: Discipline.")
    expect(p.url).toBe("/plan?step=today")
    expect(councilReminderPayload("Marie Curie", "she", []).body).toBe("Today, as if she were watching.")
  })
})

describe("settings", () => {
  it("takes only its own keys, types and hours", () => {
    expect(readSettingsPatch({ remindOn: true, remindHour: 8 })).toEqual({ remindOn: true, remindHour: 8 })
    expect(readSettingsPatch({ weekValue: "Discipline" })).toEqual({ weekValue: "Discipline" })
    expect(readSettingsPatch({ weekValue: null })).toEqual({ weekValue: null })
    expect(readSettingsPatch({ remindHour: 6 })).toBeNull()
    expect(readSettingsPatch({ remindHour: 22 })).toBeNull()
    expect(readSettingsPatch({ remindHour: 8.5 })).toBeNull()
    expect(readSettingsPatch({ weekValue: "" })).toBeNull()
    expect(readSettingsPatch({ remindOn: true, userId: "x" })).toBeNull()
    expect(readSettingsPatch({})).toBeNull()
    expect(readSettingsPatch([])).toBeNull()
  })

  it("a week value counts only in the week it was chosen for", () => {
    const monday = weekOf("2026-11-11")
    expect(monday).toBe("2026-11-09")
    expect(weekValueFor({ weekValue: "Discipline", weekOf: monday }, "2026-11-15")).toBe("Discipline")
    expect(weekValueFor({ weekValue: "Discipline", weekOf: monday }, "2026-11-16")).toBeNull()
    expect(weekValueFor({ weekValue: null, weekOf: monday }, "2026-11-11")).toBeNull()
  })
})
