import { describe, test, expect } from "vitest"
import {
  ApproachOutcomeSchema,
  SetTypeSchema,
  ReviewTypeSchema,
  CreateSessionSchema,
  UpdateSessionSchema,
  CreateApproachSchema,
  UpdateApproachSchema,
  CreateFieldReportSchema,
  CreateReviewSchema,
} from "@/src/tracking/schemas"

// ============================================================================
// Enum Schemas
// ============================================================================

describe("ApproachOutcomeSchema", () => {
  const validOutcomes = ["blowout", "short", "good", "number", "instadate"]

  test.each(validOutcomes)('should accept valid outcome "%s"', (outcome) => {
    // Arrange & Act
    const result = ApproachOutcomeSchema.safeParse(outcome)

    // Assert
    expect(result.success).toBe(true)
  })

  test("should reject invalid outcome", () => {
    // Arrange
    const invalidOutcome = "invalid"

    // Act
    const result = ApproachOutcomeSchema.safeParse(invalidOutcome)

    // Assert
    expect(result.success).toBe(false)
  })

  test("should reject empty string", () => {
    // Arrange
    const outcome = ""

    // Act
    const result = ApproachOutcomeSchema.safeParse(outcome)

    // Assert
    expect(result.success).toBe(false)
  })
})

describe("SetTypeSchema", () => {
  const validSetTypes = [
    "solo",
    "two_set",
    "three_plus",
    "mixed_group",
    "mom_daughter",
    "sisters",
    "tourist",
    "moving",
    "seated",
    "working",
    "gym",
    "foreign_language",
    "celebrity_vibes",
    "double_set",
    "triple_set",
  ]

  test.each(validSetTypes)('should accept valid set type "%s"', (setType) => {
    // Arrange & Act
    const result = SetTypeSchema.safeParse(setType)

    // Assert
    expect(result.success).toBe(true)
  })

  test("should reject invalid set type", () => {
    // Arrange
    const invalidSetType = "invalid"

    // Act
    const result = SetTypeSchema.safeParse(invalidSetType)

    // Assert
    expect(result.success).toBe(false)
  })
})

describe("ReviewTypeSchema", () => {
  const validReviewTypes = ["weekly", "monthly", "quarterly"]

  test.each(validReviewTypes)('should accept valid review type "%s"', (reviewType) => {
    // Arrange & Act
    const result = ReviewTypeSchema.safeParse(reviewType)

    // Assert
    expect(result.success).toBe(true)
  })

  test("should reject invalid review type", () => {
    // Arrange
    const invalidReviewType = "yearly"

    // Act
    const result = ReviewTypeSchema.safeParse(invalidReviewType)

    // Assert
    expect(result.success).toBe(false)
  })
})

// ============================================================================
// CreateSessionSchema
// ============================================================================

describe("CreateSessionSchema", () => {
  describe("valid inputs", () => {
    test("should accept empty object (all fields optional)", () => {
      // Arrange
      const input = {}

      // Act
      const result = CreateSessionSchema.safeParse(input)

      // Assert
      expect(result.success).toBe(true)
    })

    test("should accept full valid input", () => {
      // Arrange
      const input = {
        goal: 10,
        primary_location: "Copenhagen",
        session_focus: "Approach anxiety",
        technique_focus: "Eye contact",
        if_then_plan: "If I feel nervous, then I take a deep breath",
        custom_intention: "Have fun",
        pre_session_mood: 4,
      }

      // Act
      const result = CreateSessionSchema.safeParse(input)

      // Assert
      expect(result.success).toBe(true)
    })

    test("should accept goal at minimum (1)", () => {
      // Arrange
      const input = { goal: 1 }

      // Act
      const result = CreateSessionSchema.safeParse(input)

      // Assert
      expect(result.success).toBe(true)
    })

    test("should accept goal at maximum (100)", () => {
      // Arrange
      const input = { goal: 100 }

      // Act
      const result = CreateSessionSchema.safeParse(input)

      // Assert
      expect(result.success).toBe(true)
    })

    test("should accept pre_session_mood at minimum (1)", () => {
      // Arrange
      const input = { pre_session_mood: 1 }

      // Act
      const result = CreateSessionSchema.safeParse(input)

      // Assert
      expect(result.success).toBe(true)
    })

    test("should accept pre_session_mood at maximum (5)", () => {
      // Arrange
      const input = { pre_session_mood: 5 }

      // Act
      const result = CreateSessionSchema.safeParse(input)

      // Assert
      expect(result.success).toBe(true)
    })
  })

  describe("invalid inputs", () => {
    test("should reject goal below minimum (0)", () => {
      // Arrange
      const input = { goal: 0 }

      // Act
      const result = CreateSessionSchema.safeParse(input)

      // Assert
      expect(result.success).toBe(false)
    })

    test("should reject goal above maximum (101)", () => {
      // Arrange
      const input = { goal: 101 }

      // Act
      const result = CreateSessionSchema.safeParse(input)

      // Assert
      expect(result.success).toBe(false)
    })

    test("should reject non-integer goal", () => {
      // Arrange
      const input = { goal: 5.5 }

      // Act
      const result = CreateSessionSchema.safeParse(input)

      // Assert
      expect(result.success).toBe(false)
    })

    test("should reject primary_location exceeding 200 chars", () => {
      // Arrange
      const input = { primary_location: "a".repeat(201) }

      // Act
      const result = CreateSessionSchema.safeParse(input)

      // Assert
      expect(result.success).toBe(false)
    })

    test("should reject session_focus exceeding 500 chars", () => {
      // Arrange
      const input = { session_focus: "a".repeat(501) }

      // Act
      const result = CreateSessionSchema.safeParse(input)

      // Assert
      expect(result.success).toBe(false)
    })

    test("should reject pre_session_mood below minimum (0)", () => {
      // Arrange
      const input = { pre_session_mood: 0 }

      // Act
      const result = CreateSessionSchema.safeParse(input)

      // Assert
      expect(result.success).toBe(false)
    })

    test("should reject pre_session_mood above maximum (6)", () => {
      // Arrange
      const input = { pre_session_mood: 6 }

      // Act
      const result = CreateSessionSchema.safeParse(input)

      // Assert
      expect(result.success).toBe(false)
    })
  })
})

// ============================================================================
// UpdateSessionSchema
// ============================================================================

describe("UpdateSessionSchema", () => {
  test("should accept empty object", () => {
    // Arrange
    const input = {}

    // Act
    const result = UpdateSessionSchema.safeParse(input)

    // Assert
    expect(result.success).toBe(true)
  })

  test("should accept valid goal update", () => {
    // Arrange
    const input = { goal: 15 }

    // Act
    const result = UpdateSessionSchema.safeParse(input)

    // Assert
    expect(result.success).toBe(true)
  })

  test("should accept valid primary_location update", () => {
    // Arrange
    const input = { primary_location: "Stockholm" }

    // Act
    const result = UpdateSessionSchema.safeParse(input)

    // Assert
    expect(result.success).toBe(true)
  })

  test("should reject invalid goal", () => {
    // Arrange
    const input = { goal: 150 }

    // Act
    const result = UpdateSessionSchema.safeParse(input)

    // Assert
    expect(result.success).toBe(false)
  })
})

// ============================================================================
// CreateApproachSchema
// ============================================================================

describe("CreateApproachSchema", () => {
  describe("valid inputs", () => {
    test("should accept empty object", () => {
      // Arrange
      const input = {}

      // Act
      const result = CreateApproachSchema.safeParse(input)

      // Assert
      expect(result.success).toBe(true)
    })

    test("should accept full valid input", () => {
      // Arrange
      const input = {
        session_id: "123e4567-e89b-12d3-a456-426614174000",
        outcome: "good",
        set_type: "solo",
        tags: ["blonde", "tall"],
        mood: 4,
        note: "Great conversation",
        latitude: 55.6761,
        longitude: 12.5683,
        timestamp: "2024-01-15T14:30:00Z",
      }

      // Act
      const result = CreateApproachSchema.safeParse(input)

      // Assert
      expect(result.success).toBe(true)
    })

    test("should accept valid UUID for session_id", () => {
      // Arrange
      const input = { session_id: "550e8400-e29b-41d4-a716-446655440000" }

      // Act
      const result = CreateApproachSchema.safeParse(input)

      // Assert
      expect(result.success).toBe(true)
    })

    test("should accept mood at minimum (1)", () => {
      // Arrange
      const input = { mood: 1 }

      // Act
      const result = CreateApproachSchema.safeParse(input)

      // Assert
      expect(result.success).toBe(true)
    })

    test("should accept mood at maximum (5)", () => {
      // Arrange
      const input = { mood: 5 }

      // Act
      const result = CreateApproachSchema.safeParse(input)

      // Assert
      expect(result.success).toBe(true)
    })

    test("should accept latitude at minimum (-90)", () => {
      // Arrange
      const input = { latitude: -90 }

      // Act
      const result = CreateApproachSchema.safeParse(input)

      // Assert
      expect(result.success).toBe(true)
    })

    test("should accept latitude at maximum (90)", () => {
      // Arrange
      const input = { latitude: 90 }

      // Act
      const result = CreateApproachSchema.safeParse(input)

      // Assert
      expect(result.success).toBe(true)
    })

    test("should accept longitude at minimum (-180)", () => {
      // Arrange
      const input = { longitude: -180 }

      // Act
      const result = CreateApproachSchema.safeParse(input)

      // Assert
      expect(result.success).toBe(true)
    })

    test("should accept longitude at maximum (180)", () => {
      // Arrange
      const input = { longitude: 180 }

      // Act
      const result = CreateApproachSchema.safeParse(input)

      // Assert
      expect(result.success).toBe(true)
    })

    test("should accept empty tags array", () => {
      // Arrange
      const input = { tags: [] }

      // Act
      const result = CreateApproachSchema.safeParse(input)

      // Assert
      expect(result.success).toBe(true)
    })

    test("should accept tags array at maximum (10)", () => {
      // Arrange
      const input = { tags: ["a", "b", "c", "d", "e", "f", "g", "h", "i", "j"] }

      // Act
      const result = CreateApproachSchema.safeParse(input)

      // Assert
      expect(result.success).toBe(true)
    })
  })

  describe("invalid inputs", () => {
    test("should reject invalid UUID for session_id", () => {
      // Arrange
      const input = { session_id: "not-a-uuid" }

      // Act
      const result = CreateApproachSchema.safeParse(input)

      // Assert
      expect(result.success).toBe(false)
    })

    test("should reject invalid outcome", () => {
      // Arrange
      const input = { outcome: "amazing" }

      // Act
      const result = CreateApproachSchema.safeParse(input)

      // Assert
      expect(result.success).toBe(false)
    })

    test("should reject invalid set_type", () => {
      // Arrange
      const input = { set_type: "quad" }

      // Act
      const result = CreateApproachSchema.safeParse(input)

      // Assert
      expect(result.success).toBe(false)
    })

    test("should reject mood below minimum (0)", () => {
      // Arrange
      const input = { mood: 0 }

      // Act
      const result = CreateApproachSchema.safeParse(input)

      // Assert
      expect(result.success).toBe(false)
    })

    test("should reject mood above maximum (6)", () => {
      // Arrange
      const input = { mood: 6 }

      // Act
      const result = CreateApproachSchema.safeParse(input)

      // Assert
      expect(result.success).toBe(false)
    })

    test("should reject note exceeding 2000 chars", () => {
      // Arrange
      const input = { note: "a".repeat(2001) }

      // Act
      const result = CreateApproachSchema.safeParse(input)

      // Assert
      expect(result.success).toBe(false)
    })

    test("should reject latitude below minimum (-91)", () => {
      // Arrange
      const input = { latitude: -91 }

      // Act
      const result = CreateApproachSchema.safeParse(input)

      // Assert
      expect(result.success).toBe(false)
    })

    test("should reject latitude above maximum (91)", () => {
      // Arrange
      const input = { latitude: 91 }

      // Act
      const result = CreateApproachSchema.safeParse(input)

      // Assert
      expect(result.success).toBe(false)
    })

    test("should reject longitude below minimum (-181)", () => {
      // Arrange
      const input = { longitude: -181 }

      // Act
      const result = CreateApproachSchema.safeParse(input)

      // Assert
      expect(result.success).toBe(false)
    })

    test("should reject longitude above maximum (181)", () => {
      // Arrange
      const input = { longitude: 181 }

      // Act
      const result = CreateApproachSchema.safeParse(input)

      // Assert
      expect(result.success).toBe(false)
    })

    test("should reject tags array exceeding maximum (11)", () => {
      // Arrange
      const input = { tags: ["a", "b", "c", "d", "e", "f", "g", "h", "i", "j", "k"] }

      // Act
      const result = CreateApproachSchema.safeParse(input)

      // Assert
      expect(result.success).toBe(false)
    })

    test("should reject tag exceeding 50 chars", () => {
      // Arrange
      const input = { tags: ["a".repeat(51)] }

      // Act
      const result = CreateApproachSchema.safeParse(input)

      // Assert
      expect(result.success).toBe(false)
    })

    test("should reject invalid timestamp format", () => {
      // Arrange
      const input = { timestamp: "2024-01-15" }

      // Act
      const result = CreateApproachSchema.safeParse(input)

      // Assert
      expect(result.success).toBe(false)
    })
  })
})

// ============================================================================
// UpdateApproachSchema
// ============================================================================

describe("UpdateApproachSchema", () => {
  test("should accept empty object", () => {
    // Arrange
    const input = {}

    // Act
    const result = UpdateApproachSchema.safeParse(input)

    // Assert
    expect(result.success).toBe(true)
  })

  test("should accept valid outcome update", () => {
    // Arrange
    const input = { outcome: "number" }

    // Act
    const result = UpdateApproachSchema.safeParse(input)

    // Assert
    expect(result.success).toBe(true)
  })

  test("should accept valid set_type update", () => {
    // Arrange
    const input = { set_type: "two_set" }

    // Act
    const result = UpdateApproachSchema.safeParse(input)

    // Assert
    expect(result.success).toBe(true)
  })

  test("should accept valid tags update", () => {
    // Arrange
    const input = { tags: ["updated", "tags"] }

    // Act
    const result = UpdateApproachSchema.safeParse(input)

    // Assert
    expect(result.success).toBe(true)
  })

  test("should accept valid mood update", () => {
    // Arrange
    const input = { mood: 3 }

    // Act
    const result = UpdateApproachSchema.safeParse(input)

    // Assert
    expect(result.success).toBe(true)
  })

  test("should accept valid note update", () => {
    // Arrange
    const input = { note: "Updated note" }

    // Act
    const result = UpdateApproachSchema.safeParse(input)

    // Assert
    expect(result.success).toBe(true)
  })

  test("should reject invalid mood", () => {
    // Arrange
    const input = { mood: 10 }

    // Act
    const result = UpdateApproachSchema.safeParse(input)

    // Assert
    expect(result.success).toBe(false)
  })
})

// ============================================================================
// CreateFieldReportSchema
// ============================================================================

describe("CreateFieldReportSchema", () => {
  describe("valid inputs", () => {
    test("should accept minimal valid input with fields", () => {
      // Arrange
      const input = { fields: {} }

      // Act
      const result = CreateFieldReportSchema.safeParse(input)

      // Assert
      expect(result.success).toBe(true)
    })

    test("should accept full valid input", () => {
      // Arrange
      const input = {
        template_id: "550e8400-e29b-41d4-a716-446655440000",
        session_id: "550e8400-e29b-41d4-a716-446655440001",
        fields: { title: "My Report", content: "Great session" },
        approach_count: 5,
        location: "Copenhagen",
        tags: ["day1", "solo"],
        is_draft: true,
      }

      // Act
      const result = CreateFieldReportSchema.safeParse(input)

      // Assert
      expect(result.success).toBe(true)
    })

    test("should default is_draft to false", () => {
      // Arrange
      const input = { fields: {} }

      // Act
      const result = CreateFieldReportSchema.safeParse(input)

      // Assert
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.is_draft).toBe(false)
      }
    })

    test("should accept approach_count at minimum (0)", () => {
      // Arrange
      const input = { fields: {}, approach_count: 0 }

      // Act
      const result = CreateFieldReportSchema.safeParse(input)

      // Assert
      expect(result.success).toBe(true)
    })

    test("should accept approach_count at maximum (1000)", () => {
      // Arrange
      const input = { fields: {}, approach_count: 1000 }

      // Act
      const result = CreateFieldReportSchema.safeParse(input)

      // Assert
      expect(result.success).toBe(true)
    })

    test("should accept tags array at maximum (20)", () => {
      // Arrange
      const tags = Array.from({ length: 20 }, (_, i) => `tag${i}`)
      const input = { fields: {}, tags }

      // Act
      const result = CreateFieldReportSchema.safeParse(input)

      // Assert
      expect(result.success).toBe(true)
    })
  })

  describe("invalid inputs", () => {
    test("should reject missing fields", () => {
      // Arrange
      const input = {}

      // Act
      const result = CreateFieldReportSchema.safeParse(input)

      // Assert
      expect(result.success).toBe(false)
    })

    test("should reject invalid UUID for template_id", () => {
      // Arrange
      const input = { fields: {}, template_id: "not-uuid" }

      // Act
      const result = CreateFieldReportSchema.safeParse(input)

      // Assert
      expect(result.success).toBe(false)
    })

    test("should reject approach_count below minimum (-1)", () => {
      // Arrange
      const input = { fields: {}, approach_count: -1 }

      // Act
      const result = CreateFieldReportSchema.safeParse(input)

      // Assert
      expect(result.success).toBe(false)
    })

    test("should reject approach_count above maximum (1001)", () => {
      // Arrange
      const input = { fields: {}, approach_count: 1001 }

      // Act
      const result = CreateFieldReportSchema.safeParse(input)

      // Assert
      expect(result.success).toBe(false)
    })

    test("should reject location exceeding 200 chars", () => {
      // Arrange
      const input = { fields: {}, location: "a".repeat(201) }

      // Act
      const result = CreateFieldReportSchema.safeParse(input)

      // Assert
      expect(result.success).toBe(false)
    })

    test("should reject tags array exceeding maximum (21)", () => {
      // Arrange
      const tags = Array.from({ length: 21 }, (_, i) => `tag${i}`)
      const input = { fields: {}, tags }

      // Act
      const result = CreateFieldReportSchema.safeParse(input)

      // Assert
      expect(result.success).toBe(false)
    })

    test("should reject tag exceeding 50 chars", () => {
      // Arrange
      const input = { fields: {}, tags: ["a".repeat(51)] }

      // Act
      const result = CreateFieldReportSchema.safeParse(input)

      // Assert
      expect(result.success).toBe(false)
    })
  })
})

// ============================================================================
// CreateReviewSchema
// ============================================================================

describe("CreateReviewSchema", () => {
  const validInput = {
    review_type: "weekly" as const,
    fields: {},
    period_start: "2024-01-08T00:00:00Z",
    period_end: "2024-01-14T23:59:59Z",
  }

  describe("valid inputs", () => {
    test("should accept minimal valid input", () => {
      // Arrange
      const input = validInput

      // Act
      const result = CreateReviewSchema.safeParse(input)

      // Assert
      expect(result.success).toBe(true)
    })

    test("should accept full valid input", () => {
      // Arrange
      const input = {
        ...validInput,
        template_id: "550e8400-e29b-41d4-a716-446655440000",
        previous_commitment: "Approach 5 women per session",
        commitment_fulfilled: true,
        new_commitment: "Approach 7 women per session",
        is_draft: false,
      }

      // Act
      const result = CreateReviewSchema.safeParse(input)

      // Assert
      expect(result.success).toBe(true)
    })

    test("should accept weekly review type", () => {
      // Arrange
      const input = { ...validInput, review_type: "weekly" as const }

      // Act
      const result = CreateReviewSchema.safeParse(input)

      // Assert
      expect(result.success).toBe(true)
    })

    test("should accept monthly review type", () => {
      // Arrange
      const input = { ...validInput, review_type: "monthly" as const }

      // Act
      const result = CreateReviewSchema.safeParse(input)

      // Assert
      expect(result.success).toBe(true)
    })

    test("should accept quarterly review type", () => {
      // Arrange
      const input = { ...validInput, review_type: "quarterly" as const }

      // Act
      const result = CreateReviewSchema.safeParse(input)

      // Assert
      expect(result.success).toBe(true)
    })

    test("should default is_draft to false", () => {
      // Arrange
      const input = validInput

      // Act
      const result = CreateReviewSchema.safeParse(input)

      // Assert
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.is_draft).toBe(false)
      }
    })
  })

  describe("invalid inputs", () => {
    test("should reject missing review_type", () => {
      // Arrange
      const { review_type: _, ...input } = validInput

      // Act
      const result = CreateReviewSchema.safeParse(input)

      // Assert
      expect(result.success).toBe(false)
    })

    test("should reject missing fields", () => {
      // Arrange
      const { fields: _, ...input } = validInput

      // Act
      const result = CreateReviewSchema.safeParse(input)

      // Assert
      expect(result.success).toBe(false)
    })

    test("should reject missing period_start", () => {
      // Arrange
      const { period_start: _, ...input } = validInput

      // Act
      const result = CreateReviewSchema.safeParse(input)

      // Assert
      expect(result.success).toBe(false)
    })

    test("should reject missing period_end", () => {
      // Arrange
      const { period_end: _, ...input } = validInput

      // Act
      const result = CreateReviewSchema.safeParse(input)

      // Assert
      expect(result.success).toBe(false)
    })

    test("should reject invalid review_type", () => {
      // Arrange
      const input = { ...validInput, review_type: "yearly" }

      // Act
      const result = CreateReviewSchema.safeParse(input)

      // Assert
      expect(result.success).toBe(false)
    })

    test("should reject invalid period_start format", () => {
      // Arrange
      const input = { ...validInput, period_start: "2024-01-08" }

      // Act
      const result = CreateReviewSchema.safeParse(input)

      // Assert
      expect(result.success).toBe(false)
    })

    test("should reject invalid period_end format", () => {
      // Arrange
      const input = { ...validInput, period_end: "January 14, 2024" }

      // Act
      const result = CreateReviewSchema.safeParse(input)

      // Assert
      expect(result.success).toBe(false)
    })

    test("should reject previous_commitment exceeding 1000 chars", () => {
      // Arrange
      const input = { ...validInput, previous_commitment: "a".repeat(1001) }

      // Act
      const result = CreateReviewSchema.safeParse(input)

      // Assert
      expect(result.success).toBe(false)
    })

    test("should reject new_commitment exceeding 1000 chars", () => {
      // Arrange
      const input = { ...validInput, new_commitment: "a".repeat(1001) }

      // Act
      const result = CreateReviewSchema.safeParse(input)

      // Assert
      expect(result.success).toBe(false)
    })

    test("should reject invalid UUID for template_id", () => {
      // Arrange
      const input = { ...validInput, template_id: "not-uuid" }

      // Act
      const result = CreateReviewSchema.safeParse(input)

      // Assert
      expect(result.success).toBe(false)
    })
  })
})
