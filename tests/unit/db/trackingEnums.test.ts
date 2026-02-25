import { describe, test, expect } from "vitest"
import {
  APPROACH_OUTCOMES, SET_TYPES, REVIEW_TYPES, FIELD_TYPES,
  STICKING_POINT_STATUSES, SESSION_END_REASONS,
  ApproachOutcomeSchema, SetTypeSchema, ReviewTypeSchema,
  FieldTypeSchema, StickingPointStatusSchema, SessionEndReasonSchema,
  isKnownOutcome, isKnownSetType, isKnownReviewType,
  isKnownFieldType, isKnownStickingPointStatus, isKnownSessionEndReason,
} from "@/src/db/trackingEnums"
import { OUTCOME_OPTIONS, SET_TYPE_OPTIONS } from "@/src/tracking/config"

// ============================================================================
// Const array sanity checks
// ============================================================================

describe("const arrays", () => {
  test("APPROACH_OUTCOMES has 5 values", () => {
    expect(APPROACH_OUTCOMES.length).toBe(5)
    expect(APPROACH_OUTCOMES).toContain("blowout")
    expect(APPROACH_OUTCOMES).toContain("instadate")
  })

  test("SET_TYPES has 15 values", () => {
    expect(SET_TYPES.length).toBe(15)
    expect(SET_TYPES).toContain("solo")
    expect(SET_TYPES).toContain("triple_set")
  })

  test("REVIEW_TYPES has 3 values", () => {
    expect(REVIEW_TYPES.length).toBe(3)
    expect(REVIEW_TYPES).toContain("weekly")
    expect(REVIEW_TYPES).toContain("quarterly")
  })

  test("FIELD_TYPES has 11 values", () => {
    expect(FIELD_TYPES.length).toBe(11)
    expect(FIELD_TYPES).toContain("text")
    expect(FIELD_TYPES).toContain("audio")
  })

  test("STICKING_POINT_STATUSES has 3 values", () => {
    expect(STICKING_POINT_STATUSES.length).toBe(3)
    expect(STICKING_POINT_STATUSES).toContain("active")
    expect(STICKING_POINT_STATUSES).toContain("resolved")
  })

  test("SESSION_END_REASONS has 2 values", () => {
    expect(SESSION_END_REASONS.length).toBe(2)
    expect(SESSION_END_REASONS).toContain("completed")
    expect(SESSION_END_REASONS).toContain("abandoned")
  })
})

// ============================================================================
// Zod schemas — accept valid, reject invalid
// ============================================================================

describe("Zod schemas", () => {
  test("ApproachOutcomeSchema accepts all valid values", () => {
    for (const v of APPROACH_OUTCOMES) {
      expect(ApproachOutcomeSchema.safeParse(v).success).toBe(true)
    }
  })

  test("ApproachOutcomeSchema rejects invalid value", () => {
    expect(ApproachOutcomeSchema.safeParse("nonexistent").success).toBe(false)
  })

  test("SetTypeSchema accepts all valid values", () => {
    for (const v of SET_TYPES) {
      expect(SetTypeSchema.safeParse(v).success).toBe(true)
    }
  })

  test("SetTypeSchema rejects invalid value", () => {
    expect(SetTypeSchema.safeParse("quad_set").success).toBe(false)
  })

  test("ReviewTypeSchema accepts all valid values", () => {
    for (const v of REVIEW_TYPES) {
      expect(ReviewTypeSchema.safeParse(v).success).toBe(true)
    }
  })

  test("ReviewTypeSchema rejects invalid value", () => {
    expect(ReviewTypeSchema.safeParse("daily").success).toBe(false)
  })

  test("FieldTypeSchema accepts all valid values", () => {
    for (const v of FIELD_TYPES) {
      expect(FieldTypeSchema.safeParse(v).success).toBe(true)
    }
  })

  test("FieldTypeSchema rejects invalid value", () => {
    expect(FieldTypeSchema.safeParse("checkbox").success).toBe(false)
  })

  test("StickingPointStatusSchema accepts all valid values", () => {
    for (const v of STICKING_POINT_STATUSES) {
      expect(StickingPointStatusSchema.safeParse(v).success).toBe(true)
    }
  })

  test("StickingPointStatusSchema rejects invalid value", () => {
    expect(StickingPointStatusSchema.safeParse("archived").success).toBe(false)
  })

  test("SessionEndReasonSchema accepts all valid values", () => {
    for (const v of SESSION_END_REASONS) {
      expect(SessionEndReasonSchema.safeParse(v).success).toBe(true)
    }
  })

  test("SessionEndReasonSchema rejects invalid value", () => {
    expect(SessionEndReasonSchema.safeParse("paused").success).toBe(false)
  })
})

// ============================================================================
// Type guards
// ============================================================================

describe("type guards", () => {
  test("isKnownOutcome", () => {
    expect(isKnownOutcome("blowout")).toBe(true)
    expect(isKnownOutcome("instadate")).toBe(true)
    expect(isKnownOutcome("unknown")).toBe(false)
    expect(isKnownOutcome("")).toBe(false)
  })

  test("isKnownSetType", () => {
    expect(isKnownSetType("solo")).toBe(true)
    expect(isKnownSetType("triple_set")).toBe(true)
    expect(isKnownSetType("quad_set")).toBe(false)
    expect(isKnownSetType("")).toBe(false)
  })

  test("isKnownReviewType", () => {
    expect(isKnownReviewType("weekly")).toBe(true)
    expect(isKnownReviewType("quarterly")).toBe(true)
    expect(isKnownReviewType("daily")).toBe(false)
  })

  test("isKnownFieldType", () => {
    expect(isKnownFieldType("text")).toBe(true)
    expect(isKnownFieldType("audio")).toBe(true)
    expect(isKnownFieldType("checkbox")).toBe(false)
  })

  test("isKnownStickingPointStatus", () => {
    expect(isKnownStickingPointStatus("active")).toBe(true)
    expect(isKnownStickingPointStatus("resolved")).toBe(true)
    expect(isKnownStickingPointStatus("archived")).toBe(false)
  })

  test("isKnownSessionEndReason", () => {
    expect(isKnownSessionEndReason("completed")).toBe(true)
    expect(isKnownSessionEndReason("abandoned")).toBe(true)
    expect(isKnownSessionEndReason("paused")).toBe(false)
  })
})

// ============================================================================
// Exhaustiveness — config.ts must stay in sync
// ============================================================================

describe("config.ts exhaustiveness", () => {
  test("OUTCOME_OPTIONS covers all APPROACH_OUTCOMES values", () => {
    const optionValues = new Set(OUTCOME_OPTIONS.map(o => o.value))
    for (const outcome of APPROACH_OUTCOMES) {
      expect(optionValues.has(outcome)).toBe(true)
    }
    expect(optionValues.size).toBe(APPROACH_OUTCOMES.length)
  })

  test("SET_TYPE_OPTIONS covers all SET_TYPES values", () => {
    const optionValues = new Set(SET_TYPE_OPTIONS.map(o => o.value))
    for (const st of SET_TYPES) {
      expect(optionValues.has(st)).toBe(true)
    }
    expect(optionValues.size).toBe(SET_TYPES.length)
  })
})
