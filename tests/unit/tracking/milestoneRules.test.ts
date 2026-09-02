/**
 * THE RULE BOOK IS COMPLETE, AND EVERY NUMBER IN IT IS THE RIGHT NUMBER.
 *
 * Two failures these tests exist for, both of which shipped:
 *
 * 1. A badge on screen with no code behind it. 51 of the 101 badges in the
 *    catalog could never be won by anybody — the awarding code simply had no
 *    branch for them, and nothing said so. `MILESTONE_RULES` is typed
 *    `Record<MilestoneType, MilestoneRule>` so that cannot compile, but
 *    `next.config.mjs` sets `ignoreBuildErrors: true`, so the type alone is not
 *    a guarantee anybody runs. The first test is that guarantee at runtime.
 *
 * 2. The right badge with the wrong threshold. The rule table is transcribed by
 *    hand; a compiler catches a missing entry but not `nth(f.approaches, 50)`
 *    written under `100_approaches`. The transcription test reads the number out
 *    of each badge's own name and checks the rule fires at exactly that count —
 *    every threshold badge, in one pass, without a hand-written expectation per
 *    badge that could carry the same typo.
 */

import { readFileSync } from "fs"
import { join } from "path"
import { describe, test, expect } from "vitest"
import {
  MILESTONE_RULES,
  emptyFacts,
  nth,
  merge,
  dayStreakReachedAt,
  weekStreakReachedAt,
} from "@/src/tracking/data/milestoneRules"
import { ALL_MILESTONES } from "@/src/tracking/data/milestones"
import { MILESTONE_TYPES, type MilestoneType } from "@/src/db/trackingEnums"
import { APPROACH_TAGS } from "@/src/tracking/config"
import type { MilestoneFacts } from "@/src/tracking/types"

/** ISO timestamps one minute apart, so the nth is identifiable at a glance. */
function timestamps(count: number, startISO = "2026-01-01T10:00:00.000Z"): string[] {
  const start = new Date(startISO).getTime()
  return Array.from({ length: count }, (_, i) =>
    new Date(start + i * 60_000).toISOString()
  )
}

describe("the catalog, the type list and the rule book agree", () => {
  test("every badge that exists has presentation data and a rule", () => {
    // Arrange
    const declared = [...MILESTONE_TYPES].sort()

    // Act
    const withInfo = Object.keys(ALL_MILESTONES).sort()
    const withRule = Object.keys(MILESTONE_RULES).sort()

    // Assert
    expect(withInfo).toEqual(declared)
    expect(withRule).toEqual(declared)
  })

  test("no badge is defined twice", () => {
    expect(new Set(MILESTONE_TYPES).size).toBe(MILESTONE_TYPES.length)
  })

  test("every rule returns null for a user who has done nothing", () => {
    // Arrange
    const facts = emptyFacts()

    // Act
    const earned = Object.entries(MILESTONE_RULES)
      .map(([type, rule]) => [type, rule(facts)] as const)
      .filter(([, at]) => at !== null)

    // Assert: a rule reading a field that does not exist returns undefined, not
    // null, and would show up here.
    expect(earned).toEqual([])
  })
})

describe("transcription — the number in the badge name is the number in the rule", () => {
  /**
   * Which fact list each threshold family counts. A badge named `<n>_<suffix>`
   * must fire on the nth entry of the list its suffix names.
   */
  const FAMILIES: Array<{
    suffix: string
    apply: (facts: MilestoneFacts, times: string[]) => void
  }> = [
    { suffix: "approaches", apply: (f, t) => { f.approaches = t } },
    { suffix: "numbers", apply: (f, t) => { f.numbers = t } },
    { suffix: "instadates", apply: (f, t) => { f.instadates = t } },
    { suffix: "sessions", apply: (f, t) => { f.sessions = t } },
    { suffix: "field_reports", apply: (f, t) => { f.fieldReports = t } },
    { suffix: "rejections", apply: (f, t) => { f.rejections = t } },
    { suffix: "seated", apply: (f, t) => { f.setTypes.seated = t } },
    { suffix: "double_sets", apply: (f, t) => { f.setTypes.double_set = t } },
    { suffix: "wingman_sessions", apply: (f, t) => { f.wingmanSessions = t } },
  ]

  const thresholdBadges = MILESTONE_TYPES.flatMap((type) => {
    const match = /^(\d+)_(.+)$/.exec(type)
    if (!match) return []
    const family = FAMILIES.find((f) => f.suffix === match[2])
    return family ? [{ type, n: Number(match[1]), family }] : []
  })

  test("there are threshold badges to check", () => {
    // A broken regex here would silently make every test below vacuous.
    expect(thresholdBadges.length).toBeGreaterThanOrEqual(25)
  })

  test.each(thresholdBadges)("$type fires on event $n and not before", ({ type, n, family }) => {
    // Arrange
    const justShort = emptyFacts()
    family.apply(justShort, timestamps(n - 1))
    const exactly = emptyFacts()
    const times = timestamps(n)
    family.apply(exactly, times)

    // Act
    const rule = MILESTONE_RULES[type as MilestoneType]

    // Assert
    expect(rule(justShort)).toBeNull()
    expect(rule(exactly)).toBe(times[n - 1])
  })

  test.each([
    ["first_approach", (f: MilestoneFacts, t: string[]) => { f.approaches = t }],
    ["first_number", (f: MilestoneFacts, t: string[]) => { f.numbers = t }],
    ["first_instadate", (f: MilestoneFacts, t: string[]) => { f.instadates = t }],
    ["first_session", (f: MilestoneFacts, t: string[]) => { f.sessions = t }],
    ["first_field_report", (f: MilestoneFacts, t: string[]) => { f.fieldReports = t }],
    ["first_rejection", (f: MilestoneFacts, t: string[]) => { f.rejections = t }],
    ["first_blowout", (f: MilestoneFacts, t: string[]) => { f.blowouts = t }],
    ["first_weekly_review", (f: MilestoneFacts, t: string[]) => { f.weeklyReviews = t }],
  ] as const)("%s fires on the very first one", (type, apply) => {
    // Arrange
    const facts = emptyFacts()
    const times = timestamps(1)
    apply(facts, times)

    // Act & Assert
    expect(MILESTONE_RULES[type](emptyFacts())).toBeNull()
    expect(MILESTONE_RULES[type](facts)).toBe(times[0])
  })
})

describe("the bug this was built for", () => {
  test("Getting Started is dated to the 5th approach, not to today", () => {
    // Arrange: the reported account's real first six approaches, read from the
    // live database. The 5th happened at 10:11:33 on 28 January 2026.
    //
    // The old counter had already lost one of the two approaches logged two
    // seconds apart at 10:10:34/36, so it did not reach five until 10:13:03 —
    // and by then the version running that morning had no five-approach badge
    // in it at all. Counting the rows gives the honest answer.
    const facts = emptyFacts()
    facts.approaches = [
      "2026-01-28T10:10:34.881175Z",
      "2026-01-28T10:10:36.131581Z",
      "2026-01-28T10:11:11.826214Z",
      "2026-01-28T10:11:32.861830Z",
      "2026-01-28T10:11:33.068740Z",
      "2026-01-28T10:13:03.938773Z",
      ...timestamps(27, "2026-01-29T12:00:00.000Z"),
    ]

    // Act
    const earnedAt = MILESTONE_RULES["5_approaches"](facts)

    // Assert
    expect(earnedAt).toBe("2026-01-28T10:11:33.068740Z")
  })

  test("a badge already passed stays earned as the count keeps climbing", () => {
    // Arrange
    const facts = emptyFacts()
    facts.approaches = timestamps(40)

    // Act & Assert: the answer is the 5th approach whether the user has 5 or 40.
    expect(MILESTONE_RULES["5_approaches"](facts)).toBe(facts.approaches[4])
    expect(MILESTONE_RULES["25_approaches"](facts)).toBe(facts.approaches[24])
    expect(MILESTONE_RULES["50_approaches"](facts)).toBeNull()
  })
})

describe("decisions that were open questions, now pinned by a test", () => {
  test("Never Give Up needs the user to keep going after the fifth rejection", () => {
    // The fact builder decides this; here we only assert the rule reads it.
    const kept = emptyFacts()
    kept.firstSessionAfter5ConsecutiveRejections = "2026-03-01T12:00:00.000Z"

    expect(MILESTONE_RULES.never_give_up(emptyFacts())).toBeNull()
    expect(MILESTONE_RULES.never_give_up(kept)).toBe("2026-03-01T12:00:00.000Z")
  })

  test("First Group counts a 3+ set recorded under either picker", () => {
    // Arrange
    const viaThreePlus = emptyFacts()
    viaThreePlus.setTypes.three_plus = ["2026-02-02T10:00:00.000Z"]
    const viaTripleSet = emptyFacts()
    viaTripleSet.setTypes.triple_set = ["2026-02-01T10:00:00.000Z"]
    const both = emptyFacts()
    both.setTypes.three_plus = ["2026-02-02T10:00:00.000Z"]
    both.setTypes.triple_set = ["2026-02-01T10:00:00.000Z"]

    // Act & Assert
    expect(MILESTONE_RULES.first_group(viaThreePlus)).toBe("2026-02-02T10:00:00.000Z")
    expect(MILESTONE_RULES.first_group(viaTripleSet)).toBe("2026-02-01T10:00:00.000Z")
    // Whichever came first, across both pickers.
    expect(MILESTONE_RULES.first_group(both)).toBe("2026-02-01T10:00:00.000Z")
  })

  test("Polyglot is five foreign-language sets, matching its description", () => {
    // Arrange
    const four = emptyFacts()
    four.setTypes.foreign_language = timestamps(4)
    const five = emptyFacts()
    five.setTypes.foreign_language = timestamps(5)

    // Act & Assert
    expect(MILESTONE_RULES.polyglot(four)).toBeNull()
    expect(MILESTONE_RULES.polyglot(five)).toBe(five.setTypes.foreign_language[4])
    expect(ALL_MILESTONES.polyglot.description).toContain("5 foreign-language sets")
  })

  test("badges restored from the database are earnable again", () => {
    // night_owl and early_bird rows exist in production but had been dropped
    // from the catalog, so the users who earned them could not see them.
    const late = emptyFacts()
    late.firstSessionStartedAfter9pm = "2026-01-30T21:30:00.000Z"
    const early = emptyFacts()
    early.firstSessionStartedBefore10am = "2026-01-30T08:30:00.000Z"

    expect(MILESTONE_RULES.night_owl(late)).toBe("2026-01-30T21:30:00.000Z")
    expect(MILESTONE_RULES.early_bird(early)).toBe("2026-01-30T08:30:00.000Z")
  })
})

describe("rules can only depend on things a user can actually record", () => {
  /**
   * `facts.tags` is keyed by whatever the user tagged an approach with, so it is
   * typed `Record<string, string[]>` and the compiler cannot check these. A rule
   * naming a tag the app never offers is a badge nobody can win — and that is
   * not hypothetical: `mall` and `bookstore` were added to APPROACH_TAGS for
   * Mall Rat and Bookworm, and were silently reverted by a concurrent edit an
   * hour later. Nothing failed. This is what should have failed.
   */
  test("every tag a rule depends on is offered by the tag picker", () => {
    // Arrange
    const source = readFileSync(
      join(process.cwd(), "src/tracking/data/milestoneRules.ts"),
      "utf-8"
    )
    const offered = new Set<string>(Object.values(APPROACH_TAGS).flat())

    // Act
    const referenced = [
      ...source.matchAll(/f\.(?:tags|numbersByTag)\.([a-z_]+)/g),
    ].map((m) => m[1])

    // Assert
    expect(referenced.length).toBeGreaterThan(3)
    expect(referenced.filter((t) => !offered.has(t))).toEqual([])
  })
})

describe("helpers", () => {
  test("nth is 1-indexed and null past the end", () => {
    const list = timestamps(3)
    expect(nth(list, 1)).toBe(list[0])
    expect(nth(list, 3)).toBe(list[2])
    expect(nth(list, 4)).toBeNull()
    expect(nth([], 1)).toBeNull()
  })

  test("merge interleaves two lists chronologically", () => {
    expect(merge(["2026-01-02T00:00:00.000Z"], ["2026-01-01T00:00:00.000Z"])).toEqual([
      "2026-01-01T00:00:00.000Z",
      "2026-01-02T00:00:00.000Z",
    ])
  })

  describe("dayStreakReachedAt", () => {
    test("returns the day the run completed, at a time every zone agrees on", () => {
      const days = ["2026-03-01", "2026-03-02", "2026-03-03"]
      expect(dayStreakReachedAt(days, 3)).toBe("2026-03-03T12:00:00.000Z")
    })

    test("a gap restarts the run", () => {
      const days = ["2026-03-01", "2026-03-02", "2026-03-05", "2026-03-06"]
      expect(dayStreakReachedAt(days, 3)).toBeNull()
    })

    test("counts a later run when an earlier one fell short", () => {
      const days = ["2026-03-01", "2026-03-05", "2026-03-06", "2026-03-07"]
      expect(dayStreakReachedAt(days, 3)).toBe("2026-03-07T12:00:00.000Z")
    })

    test("crosses a month and a leap day", () => {
      const days = ["2028-02-27", "2028-02-28", "2028-02-29", "2028-03-01"]
      expect(dayStreakReachedAt(days, 4)).toBe("2028-03-01T12:00:00.000Z")
    })

    test("is null when there are fewer days than the run needs", () => {
      expect(dayStreakReachedAt(["2026-03-01"], 2)).toBeNull()
      expect(dayStreakReachedAt([], 1)).toBeNull()
    })
  })

  describe("weekStreakReachedAt", () => {
    // Weeks are named by their Monday, in the user's timezone — the same strings
    // buildFacts actually produces. This block used to feed ISO-week labels
    // ("2026-W01") that no caller ever emits, which is why it stayed green while
    // every week-streak badge was unearnable.
    const week = (monday: string, at: string) => ({ week: monday, qualifiedAt: at })

    test("returns the moment the nth consecutive week qualified", () => {
      const weeks = [
        week("2026-01-05", "2026-01-07T10:00:00.000Z"),
        week("2026-01-12", "2026-01-14T10:00:00.000Z"),
      ]
      expect(weekStreakReachedAt(weeks, 2)).toBe("2026-01-14T10:00:00.000Z")
    })

    test("a skipped week restarts the run", () => {
      const weeks = [
        week("2026-01-05", "2026-01-07T10:00:00.000Z"),
        week("2026-01-19", "2026-01-21T10:00:00.000Z"),
      ]
      expect(weekStreakReachedAt(weeks, 2)).toBeNull()
    })

    test("counts a later run when an earlier one fell short", () => {
      const weeks = [
        week("2026-01-05", "2026-01-07T10:00:00.000Z"),
        week("2026-01-19", "2026-01-21T10:00:00.000Z"),
        week("2026-01-26", "2026-01-28T10:00:00.000Z"),
        week("2026-02-02", "2026-02-04T10:00:00.000Z"),
      ]
      expect(weekStreakReachedAt(weeks, 3)).toBe("2026-02-04T10:00:00.000Z")
    })

    test("carries a run across the new year", () => {
      const weeks = [
        week("2025-12-29", "2025-12-31T10:00:00.000Z"),
        week("2026-01-05", "2026-01-07T10:00:00.000Z"),
      ]
      expect(weekStreakReachedAt(weeks, 2)).toBe("2026-01-07T10:00:00.000Z")
    })

    test("is null when there are fewer weeks than the run needs", () => {
      expect(weekStreakReachedAt([week("2026-01-05", "2026-01-07T10:00:00.000Z")], 2)).toBeNull()
      expect(weekStreakReachedAt([], 1)).toBeNull()
    })
  })
})
