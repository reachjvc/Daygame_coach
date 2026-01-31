import { describe, test, expect } from "vitest"
import {
  getMilestoneInfo,
  getTierColor,
  getTierBg,
  getMilestoneCategories,
  getAllTiers,
  ALL_MILESTONES,
  TIER_INFO,
  type MilestoneTier,
} from "@/src/tracking/data/milestones"

// ============================================================================
// getMilestoneInfo
// ============================================================================

describe("getMilestoneInfo", () => {
  test("should return correct info for known milestone", () => {
    // Arrange
    const milestoneType = "first_approach"

    // Act
    const result = getMilestoneInfo(milestoneType)

    // Assert
    expect(result.label).toBe("First Steps")
    expect(result.emoji).toBe("👣")
    expect(result.tier).toBe("bronze")
    expect(result.category).toBe("Approaches")
    expect(result.description).toBe("Complete your first approach")
  })

  test("should return correct info for high-tier milestone", () => {
    // Arrange
    const milestoneType = "1000_approaches"

    // Act
    const result = getMilestoneInfo(milestoneType)

    // Assert
    expect(result.tier).toBe("diamond")
    expect(result.label).toBe("Legend")
  })

  test("should return fallback for unknown milestone type", () => {
    // Arrange
    const unknownType = "unknown_milestone_xyz"

    // Act
    const result = getMilestoneInfo(unknownType)

    // Assert
    expect(result.label).toBe(unknownType) // Falls back to the type itself
    expect(result.emoji).toBe("🏅")
    expect(result.tier).toBe("bronze")
    expect(result.category).toBe("Other")
    expect(result.description).toBe("Achievement unlocked")
  })

  test("should return fallback for empty string", () => {
    // Arrange
    const emptyType = ""

    // Act
    const result = getMilestoneInfo(emptyType)

    // Assert
    expect(result.label).toBe("")
    expect(result.tier).toBe("bronze")
    expect(result.category).toBe("Other")
  })

  test("should handle special character milestone types gracefully", () => {
    // Arrange
    const specialType = "test-with-dashes_and_underscores"

    // Act
    const result = getMilestoneInfo(specialType)

    // Assert
    expect(result.label).toBe(specialType)
    expect(result.tier).toBe("bronze")
  })
})

// ============================================================================
// getTierColor
// ============================================================================

describe("getTierColor", () => {
  test("should return valid gradient format for all tiers", () => {
    // Arrange
    const tiers: MilestoneTier[] = ["bronze", "silver", "gold", "platinum", "diamond"]

    // Act & Assert
    for (const tier of tiers) {
      const result = getTierColor(tier)
      expect(result).toContain("from-")
      expect(result).toContain("to-")
    }
  })
})

// ============================================================================
// getTierBg
// ============================================================================

describe("getTierBg", () => {
  test("should return valid background format for all tiers", () => {
    // Arrange
    const tiers: MilestoneTier[] = ["bronze", "silver", "gold", "platinum", "diamond"]

    // Act & Assert
    for (const tier of tiers) {
      const result = getTierBg(tier)
      expect(result).toMatch(/^bg-/)
      expect(result).toContain("/10")
    }
  })
})

// ============================================================================
// getMilestoneCategories
// ============================================================================

describe("getMilestoneCategories", () => {
  test("should return an array of strings", () => {
    // Act
    const result = getMilestoneCategories()

    // Assert
    expect(Array.isArray(result)).toBe(true)
    expect(result.every((cat) => typeof cat === "string")).toBe(true)
  })

  test("should contain known categories", () => {
    // Arrange
    const expectedCategories = [
      "Approaches",
      "Numbers",
      "Instadates",
      "Sessions",
      "Streaks",
      "Reports",
      "Special",
      "Mindset",
      "Social",
      "Unique Sets",
    ]

    // Act
    const result = getMilestoneCategories()

    // Assert
    for (const category of expectedCategories) {
      expect(result).toContain(category)
    }
  })

  test("should not contain duplicates", () => {
    // Act
    const result = getMilestoneCategories()
    const uniqueCategories = [...new Set(result)]

    // Assert
    expect(result.length).toBe(uniqueCategories.length)
  })

  test("should have length matching unique categories in ALL_MILESTONES", () => {
    // Arrange
    const categoriesFromData = new Set(Object.values(ALL_MILESTONES).map((m) => m.category))

    // Act
    const result = getMilestoneCategories()

    // Assert
    expect(result.length).toBe(categoriesFromData.size)
  })
})

// ============================================================================
// getAllTiers
// ============================================================================

describe("getAllTiers", () => {
  test("should return a Set", () => {
    // Act
    const result = getAllTiers()

    // Assert
    expect(result).toBeInstanceOf(Set)
  })

  test("should contain exactly 5 tiers", () => {
    // Act
    const result = getAllTiers()

    // Assert
    expect(result.size).toBe(5)
  })

  test("should contain all expected tier values", () => {
    // Arrange
    const expectedTiers: MilestoneTier[] = ["bronze", "silver", "gold", "platinum", "diamond"]

    // Act
    const result = getAllTiers()

    // Assert
    for (const tier of expectedTiers) {
      expect(result.has(tier)).toBe(true)
    }
  })

  test("should match TIER_INFO names", () => {
    // Arrange
    const tierInfoNames = TIER_INFO.map((t) => t.name)

    // Act
    const result = getAllTiers()

    // Assert
    expect(result.size).toBe(tierInfoNames.length)
    for (const name of tierInfoNames) {
      expect(result.has(name)).toBe(true)
    }
  })
})

// ============================================================================
// Data Integrity Tests
// ============================================================================

describe("ALL_MILESTONES data integrity", () => {
  test("should have all required fields for every milestone", () => {
    // Act & Assert
    for (const [key, milestone] of Object.entries(ALL_MILESTONES)) {
      expect(milestone.label, `${key} missing label`).toBeDefined()
      expect(milestone.emoji, `${key} missing emoji`).toBeDefined()
      expect(milestone.tier, `${key} missing tier`).toBeDefined()
      expect(milestone.category, `${key} missing category`).toBeDefined()
      expect(milestone.description, `${key} missing description`).toBeDefined()
    }
  })

  test("should have valid tier values for all milestones", () => {
    // Arrange
    const validTiers = getAllTiers()

    // Act & Assert
    for (const [key, milestone] of Object.entries(ALL_MILESTONES)) {
      expect(validTiers.has(milestone.tier), `${key} has invalid tier: ${milestone.tier}`).toBe(
        true
      )
    }
  })

  test("should have non-empty strings for labels and descriptions", () => {
    // Act & Assert
    for (const [key, milestone] of Object.entries(ALL_MILESTONES)) {
      expect(milestone.label.length, `${key} has empty label`).toBeGreaterThan(0)
      expect(milestone.description.length, `${key} has empty description`).toBeGreaterThan(0)
    }
  })

  test("should have emoji that is not empty", () => {
    // Act & Assert
    for (const [key, milestone] of Object.entries(ALL_MILESTONES)) {
      expect(milestone.emoji.length, `${key} has empty emoji`).toBeGreaterThan(0)
    }
  })
})

// ============================================================================
// TIER_INFO data integrity
// ============================================================================

describe("TIER_INFO data integrity", () => {
  test("should have 5 tiers defined", () => {
    // Assert
    expect(TIER_INFO.length).toBe(5)
  })

  test("should have required fields for each tier", () => {
    // Act & Assert
    for (const tier of TIER_INFO) {
      expect(tier.name).toBeDefined()
      expect(tier.label).toBeDefined()
      expect(tier.icon).toBeDefined()
    }
  })

  test("should have tiers in correct order (bronze to diamond)", () => {
    // Arrange
    const expectedOrder: MilestoneTier[] = ["bronze", "silver", "gold", "platinum", "diamond"]

    // Act
    const actualOrder = TIER_INFO.map((t) => t.name)

    // Assert
    expect(actualOrder).toEqual(expectedOrder)
  })
})
