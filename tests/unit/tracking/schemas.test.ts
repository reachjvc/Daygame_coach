/**
 * WHAT THE TRACKING SCHEMAS DECIDE.
 *
 * Every case here is a bound, a refine or a default: where a range starts and
 * stops, which strings a refine refuses, what a field left out becomes. That an
 * enum accepts its own members, an optional field may be left out, or a
 * complete payload parses only restates the declaration, so none of that is
 * asserted (it was, 56 times, until 2026-10-13).
 */

import { afterEach, beforeEach, describe, test, expect, vi } from "vitest"
import {
  CreateSessionSchema,
  UpdateSessionSchema,
  CreateApproachSchema,
  UpdateApproachSchema,
  CreateFieldReportSchema,
  CreateReviewSchema,
} from "@/src/tracking/schemas"

type Verdict = "accepts" | "refuses"
type Case = [verdict: Verdict, name: string, input: Record<string, unknown>]

const verdictOf = (result: { success: boolean }): Verdict => (result.success ? "accepts" : "refuses")
const chars = (n: number) => "a".repeat(n)
const tags = (n: number) => Array.from({ length: n }, (_, i) => `tag${i}`)

// ============================================================================
// Sessions
// ============================================================================

describe("CreateSessionSchema", () => {
  test.each<Case>([
    ["accepts", "goal at minimum (1)", { goal: 1 }],
    ["accepts", "goal at maximum (100)", { goal: 100 }],
    ["refuses", "goal below minimum (0)", { goal: 0 }],
    ["refuses", "goal above maximum (101)", { goal: 101 }],
    ["refuses", "a non-integer goal", { goal: 5.5 }],
    ["accepts", "pre_session_mood at minimum (1)", { pre_session_mood: 1 }],
    ["accepts", "pre_session_mood at maximum (5)", { pre_session_mood: 5 }],
    ["refuses", "pre_session_mood below minimum (0)", { pre_session_mood: 0 }],
    ["refuses", "pre_session_mood above maximum (6)", { pre_session_mood: 6 }],
    ["refuses", "primary_location over 200 chars", { primary_location: chars(201) }],
    ["refuses", "session_focus over 500 chars", { session_focus: chars(501) }],
  ])("%s %s", (verdict, _name, input) => {
    expect(verdictOf(CreateSessionSchema.safeParse(input))).toBe(verdict)
  })
})

describe("UpdateSessionSchema", () => {
  test("refuses a goal above the maximum", () => {
    expect(verdictOf(UpdateSessionSchema.safeParse({ goal: 150 }))).toBe("refuses")
  })
})

// ============================================================================
// Approaches
// ============================================================================

describe("CreateApproachSchema", () => {
  test.each<Case>([
    ["accepts", "mood at minimum (1)", { mood: 1 }],
    ["accepts", "mood at maximum (5)", { mood: 5 }],
    ["refuses", "mood below minimum (0)", { mood: 0 }],
    ["refuses", "mood above maximum (6)", { mood: 6 }],
    ["accepts", "latitude at minimum (-90)", { latitude: -90 }],
    ["accepts", "latitude at maximum (90)", { latitude: 90 }],
    ["refuses", "latitude below minimum (-91)", { latitude: -91 }],
    ["refuses", "latitude above maximum (91)", { latitude: 91 }],
    ["accepts", "longitude at minimum (-180)", { longitude: -180 }],
    ["accepts", "longitude at maximum (180)", { longitude: 180 }],
    ["refuses", "longitude below minimum (-181)", { longitude: -181 }],
    ["refuses", "longitude above maximum (181)", { longitude: 181 }],
    ["accepts", "tags at maximum (10)", { tags: tags(10) }],
    ["refuses", "tags over maximum (11)", { tags: tags(11) }],
    ["refuses", "a tag over 50 chars", { tags: [chars(51)] }],
    ["refuses", "a note over 2000 chars", { note: chars(2001) }],
  ])("%s %s", (verdict, _name, input) => {
    expect(verdictOf(CreateApproachSchema.safeParse(input))).toBe(verdict)
  })

  /**
   * NOT IN THE FUTURE. One approach dated 2099 is "the most recent" forever, so
   * every recount collapses the daily and weekly streaks to zero — and the
   * recount is deterministic, so it never recovers. A minute of slack absorbs a
   * phone clock that runs slightly ahead.
   */
  describe("timestamp", () => {
    const NOW = new Date("2026-10-13T12:00:00.000Z")
    const offset = (ms: number) => new Date(NOW.getTime() + ms).toISOString()

    beforeEach(() => {
      vi.useFakeTimers()
      vi.setSystemTime(NOW)
    })
    afterEach(() => {
      vi.useRealTimers()
    })

    test.each<Case>([
      ["accepts", "an approach an hour ago", { timestamp: offset(-3_600_000) }],
      ["accepts", "a phone clock 59 seconds ahead", { timestamp: offset(59_000) }],
      ["refuses", "two minutes in the future", { timestamp: offset(120_000) }],
      ["refuses", "an approach dated 2099", { timestamp: "2099-01-01T10:00:00.000Z" }],
    ])("%s %s", (verdict, _name, input) => {
      expect(verdictOf(CreateApproachSchema.safeParse(input))).toBe(verdict)
    })
  })
})

describe("UpdateApproachSchema", () => {
  test("refuses a mood above the maximum", () => {
    expect(verdictOf(UpdateApproachSchema.safeParse({ mood: 10 }))).toBe("refuses")
  })
})

// ============================================================================
// Field reports
// ============================================================================

describe("CreateFieldReportSchema", () => {
  test.each<Case>([
    ["accepts", "approach_count at minimum (0)", { approach_count: 0 }],
    ["accepts", "approach_count at maximum (1000)", { approach_count: 1000 }],
    ["refuses", "approach_count below minimum (-1)", { approach_count: -1 }],
    ["refuses", "approach_count above maximum (1001)", { approach_count: 1001 }],
    ["accepts", "tags at maximum (20)", { tags: tags(20) }],
    ["refuses", "tags over maximum (21)", { tags: tags(21) }],
    ["refuses", "a tag over 50 chars", { tags: [chars(51)] }],
    ["refuses", "a location over 200 chars", { location: chars(201) }],
    ["accepts", "a title at maximum (200)", { title: chars(200) }],
    ["refuses", "a title over 200 chars", { title: chars(201) }],
  ])("%s %s", (verdict, _name, input) => {
    expect(verdictOf(CreateFieldReportSchema.safeParse({ fields: {}, ...input }))).toBe(verdict)
  })

  test("defaults is_draft to false", () => {
    const result = CreateFieldReportSchema.safeParse({ fields: {} })
    if (!result.success) throw result.error
    expect(result.data.is_draft).toBe(false)
  })

  test("refuses both template_id and system_template_slug", () => {
    const result = CreateFieldReportSchema.safeParse({
      fields: {},
      template_id: "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
      system_template_slug: "quick-log",
    })
    expect(verdictOf(result)).toBe("refuses")
  })
})

// ============================================================================
// Reviews
// ============================================================================

describe("CreateReviewSchema", () => {
  const validInput = {
    review_type: "weekly" as const,
    fields: {},
    period_start: "2024-01-08",
    period_end: "2024-01-14",
  }

  test("defaults is_draft to false", () => {
    const result = CreateReviewSchema.safeParse(validInput)
    if (!result.success) throw result.error
    expect(result.data.is_draft).toBe(false)
  })

  test("refuses an instant where a calendar date belongs", () => {
    // This is the payload that filed every weekly review one week early — an ISO
    // instant lands in a DATE column as its UTC date, which for a Copenhagen
    // Monday midnight is the Sunday before.
    const input = { ...validInput, period_start: "2024-01-08T00:00:00Z" }
    expect(verdictOf(CreateReviewSchema.safeParse(input))).toBe("refuses")
  })

  test("accepts the calendar date the review pages send", () => {
    const input = { ...validInput, period_start: "2026-08-24", period_end: "2026-08-30" }
    expect(verdictOf(CreateReviewSchema.safeParse(input))).toBe("accepts")
  })

  test("refuses a period_end that is not YYYY-MM-DD", () => {
    const input = { ...validInput, period_end: "January 14, 2024" }
    expect(verdictOf(CreateReviewSchema.safeParse(input))).toBe("refuses")
  })

  test("refuses a template_id that is neither a UUID nor a system id", () => {
    const input = { ...validInput, template_id: "not-uuid" }
    expect(verdictOf(CreateReviewSchema.safeParse(input))).toBe("refuses")
  })

  test.each<Case>([
    ["refuses", "previous_commitment over 1000 chars", { previous_commitment: chars(1001) }],
    ["refuses", "new_commitment over 1000 chars", { new_commitment: chars(1001) }],
  ])("%s %s", (verdict, _name, input) => {
    expect(verdictOf(CreateReviewSchema.safeParse({ ...validInput, ...input }))).toBe(verdict)
  })
})
