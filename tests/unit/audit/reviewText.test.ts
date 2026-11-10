/**
 * THE REVIEW IN PLAIN WORDS — src/audit/reviewText.ts (alpha picky-eye-14/15,
 * fast-audit "176.75 waking hours"). Written before the functions.
 */
import { describe, expect, it } from "vitest"
import { distinctWhys, durationText, scoreText, wakingHoursText } from "@/src/audit/reviewText"

describe("durationText", () => {
  it("says hours and minutes, never decimal hours", () => {
    expect(durationText(0)).toBe("0 min")
    expect(durationText(15)).toBe("15 min")
    expect(durationText(60)).toBe("1 hour")
    expect(durationText(90)).toBe("1 h 30 min")
    expect(durationText(120)).toBe("2 hours")
    expect(durationText(795)).toBe("13 h 15 min")
    expect(durationText(6345)).toBe("105 h 45 min")
  })

  it("rounds stray seconds to a whole minute", () => {
    expect(durationText(134.99)).toBe("2 h 15 min")
  })
})

describe("wakingHoursText", () => {
  it("rounds to whole hours and says so when it rounded", () => {
    expect(wakingHoursText(176.75)).toBe("about 177 waking hours")
    expect(wakingHoursText(195)).toBe("195 waking hours")
    expect(wakingHoursText(1)).toBe("1 waking hour")
    expect(wakingHoursText(0.25)).toBe("15 waking minutes")
  })

  it("says minutes for a run shorter than an hour, never about 1 waking hour", () => {
    expect(wakingHoursText(0.5)).toBe("30 waking minutes")
    expect(wakingHoursText(0.75)).toBe("45 waking minutes")
    expect(wakingHoursText(1.25)).toBe("about 1 waking hour")
  })
})

describe("scoreText", () => {
  it("drops a trailing .0 and keeps one decimal otherwise", () => {
    expect(scoreText(6)).toBe("6")
    expect(scoreText(6.0)).toBe("6")
    expect(scoreText(6.7)).toBe("6.7")
    expect(scoreText(3.25)).toBe("3.3")
  })
})

describe("distinctWhys", () => {
  const at = (h: number) => new Date(Date.UTC(2026, 10, 9, h)).toISOString()

  it("lists each note once, with every quarter it was written for, newest first", () => {
    const out = distinctWhys([
      { text: "Avoiding the tax form", slotAt: at(14) },
      { text: "tired", slotAt: at(13) },
      { text: "Avoiding the tax form", slotAt: at(12) },
      { text: "avoiding  the tax form", slotAt: at(11) },
      { text: "Avoiding the tax form.", slotAt: at(10) },
    ])
    expect(out).toEqual([
      { text: "Avoiding the tax form", slotAts: [at(14), at(12), at(11)] },
      { text: "tired", slotAts: [at(13)] },
      // Punctuation is part of what was written: a different note.
      { text: "Avoiding the tax form.", slotAts: [at(10)] },
    ])
  })

  it("is empty for no notes", () => {
    expect(distinctWhys([])).toEqual([])
  })
})
