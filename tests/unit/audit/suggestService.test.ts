/**
 * SUGGESTIONS — src/audit/suggestService.ts (Plans/energy-audit.md, D-SUGGEST).
 */
import { describe, expect, it } from "vitest"
import { applySuggestion, matchActivities, topActivities } from "@/src/audit/suggestService"

const items = [
  { activity: "Email", count: 9 },
  { activity: "Daygame city centre", count: 4 },
  { activity: "Gym legs", count: 6 },
  { activity: "Gym arms", count: 2 },
  { activity: "Cooking", count: 1 },
  { activity: "Reading", count: 3 },
  { activity: "Walk", count: 5 },
]

describe("matchActivities", () => {
  it("'ema' finds Email", () => {
    expect(matchActivities("ema", items).map((i) => i.activity)).toContain("Email")
  })
  it("'emial' finds Email", () => {
    expect(matchActivities("emial", items).map((i) => i.activity)).toContain("Email")
  })
  it("in 'Gym legs', changing 'Gym' to 'Day' with the cursor after 'Day' offers 'Daygame city centre'", () => {
    const field = "Day legs"
    const cursor = 3
    const found = matchActivities(field.slice(0, cursor), items)
    expect(found[0].activity).toBe("Daygame city centre")
    expect(applySuggestion(field, cursor, found[0].activity)).toEqual({ text: "Daygame city centre", cursor: 19 })
  })
  it("never repeats the words before the edited one", () => {
    const field = "Gym ar"
    const found = matchActivities(field, items)
    expect(found[0].activity).toBe("Gym arms")
    expect(applySuggestion(field, field.length, found[0].activity).text).toBe("Gym arms")
  })
  it("ranks the more frequent first within a kind", () => {
    expect(matchActivities("gym", items).map((i) => i.activity)).toEqual(["Gym legs", "Gym arms"])
  })
  it("matches nothing for an empty field", () => {
    expect(matchActivities("", items)).toEqual([])
  })
})

describe("topActivities", () => {
  it("the six most frequent", () => {
    expect(topActivities(items).map((i) => i.activity)).toEqual(["Email", "Gym legs", "Walk", "Daygame city centre", "Reading", "Gym arms"])
  })
})
