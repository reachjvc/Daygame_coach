import { describe, test, expect } from "vitest"
import {
  sanitizeArchetypes,
  validateAgeRange,
  validateRegion,
  ProfileServiceError,
} from "@/src/profile/profileService"

// ============================================================================
// sanitizeArchetypes
// ============================================================================

describe("sanitizeArchetypes", () => {
  describe("valid archetype combinations", () => {
    test("should keep all archetypes when all are different", () => {
      // Arrange
      const data = {
        archetype: "charmer",
        secondaryArchetype: "adventurer",
        tertiaryArchetype: "intellectual",
      }

      // Act
      const result = sanitizeArchetypes(data)

      // Assert
      expect(result).toEqual({
        archetype: "charmer",
        secondaryArchetype: "adventurer",
        tertiaryArchetype: "intellectual",
      })
    })

    test("should keep primary only when no secondary or tertiary", () => {
      // Arrange
      const data = {
        archetype: "charmer",
        secondaryArchetype: null,
        tertiaryArchetype: null,
      }

      // Act
      const result = sanitizeArchetypes(data)

      // Assert
      expect(result).toEqual({
        archetype: "charmer",
        secondaryArchetype: null,
        tertiaryArchetype: null,
      })
    })

    test("should keep primary and secondary when only tertiary is null", () => {
      // Arrange
      const data = {
        archetype: "charmer",
        secondaryArchetype: "adventurer",
        tertiaryArchetype: null,
      }

      // Act
      const result = sanitizeArchetypes(data)

      // Assert
      expect(result).toEqual({
        archetype: "charmer",
        secondaryArchetype: "adventurer",
        tertiaryArchetype: null,
      })
    })
  })

  describe("duplicate detection", () => {
    test("should nullify secondary when it matches primary", () => {
      // Arrange
      const data = {
        archetype: "charmer",
        secondaryArchetype: "charmer",
        tertiaryArchetype: "intellectual",
      }

      // Act
      const result = sanitizeArchetypes(data)

      // Assert
      expect(result).toEqual({
        archetype: "charmer",
        secondaryArchetype: null,
        tertiaryArchetype: "intellectual",
      })
    })

    test("should nullify tertiary when it matches primary", () => {
      // Arrange
      const data = {
        archetype: "charmer",
        secondaryArchetype: "adventurer",
        tertiaryArchetype: "charmer",
      }

      // Act
      const result = sanitizeArchetypes(data)

      // Assert
      expect(result).toEqual({
        archetype: "charmer",
        secondaryArchetype: "adventurer",
        tertiaryArchetype: null,
      })
    })

    test("should nullify tertiary when it matches secondary", () => {
      // Arrange
      const data = {
        archetype: "charmer",
        secondaryArchetype: "adventurer",
        tertiaryArchetype: "adventurer",
      }

      // Act
      const result = sanitizeArchetypes(data)

      // Assert
      expect(result).toEqual({
        archetype: "charmer",
        secondaryArchetype: "adventurer",
        tertiaryArchetype: null,
      })
    })

    test("should nullify both secondary and tertiary when all match primary", () => {
      // Arrange
      const data = {
        archetype: "charmer",
        secondaryArchetype: "charmer",
        tertiaryArchetype: "charmer",
      }

      // Act
      const result = sanitizeArchetypes(data)

      // Assert
      expect(result).toEqual({
        archetype: "charmer",
        secondaryArchetype: null,
        tertiaryArchetype: null,
      })
    })

    test("should nullify tertiary when secondary is nullified due to primary match", () => {
      // Arrange
      const data = {
        archetype: "charmer",
        secondaryArchetype: "charmer",
        tertiaryArchetype: "charmer",
      }

      // Act
      const result = sanitizeArchetypes(data)

      // Assert
      // Secondary becomes null (matches primary), tertiary also becomes null (matches primary)
      expect(result.secondaryArchetype).toBeNull()
      expect(result.tertiaryArchetype).toBeNull()
    })
  })

  describe("edge cases", () => {
    test("should treat empty string secondary as falsy and return null", () => {
      // Arrange
      const data = {
        archetype: "charmer",
        secondaryArchetype: "",
        tertiaryArchetype: "intellectual",
      }

      // Act
      const result = sanitizeArchetypes(data)

      // Assert
      expect(result.secondaryArchetype).toBeNull()
    })

    test("should treat empty string tertiary as falsy and return null", () => {
      // Arrange
      const data = {
        archetype: "charmer",
        secondaryArchetype: "adventurer",
        tertiaryArchetype: "",
      }

      // Act
      const result = sanitizeArchetypes(data)

      // Assert
      expect(result.tertiaryArchetype).toBeNull()
    })
  })
})

// ============================================================================
// validateAgeRange
// ============================================================================

describe("validateAgeRange", () => {
  describe("valid ranges within bounds", () => {
    test("should return unchanged values when within valid range", () => {
      // Arrange
      const start = 20
      const end = 30

      // Act
      const result = validateAgeRange(start, end)

      // Assert
      expect(result).toEqual({ start: 20, end: 30 })
    })

    test("should return unchanged values at minimum boundary", () => {
      // Arrange
      const start = 18
      const end = 25

      // Act
      const result = validateAgeRange(start, end)

      // Assert
      expect(result).toEqual({ start: 18, end: 25 })
    })

    test("should return unchanged values at maximum boundary", () => {
      // Arrange
      const start = 40
      const end = 45

      // Act
      const result = validateAgeRange(start, end)

      // Assert
      expect(result).toEqual({ start: 40, end: 45 })
    })

    test("should return unchanged values for full range", () => {
      // Arrange
      const start = 18
      const end = 45

      // Act
      const result = validateAgeRange(start, end)

      // Assert
      expect(result).toEqual({ start: 18, end: 45 })
    })
  })

  describe("clamping behavior", () => {
    test("should clamp start below minimum to 18", () => {
      // Arrange
      const start = 15
      const end = 30

      // Act
      const result = validateAgeRange(start, end)

      // Assert
      expect(result.start).toBe(18)
    })

    test("should clamp end above maximum to 45", () => {
      // Arrange
      const start = 20
      const end = 50

      // Act
      const result = validateAgeRange(start, end)

      // Assert
      expect(result.end).toBe(45)
    })

    test("should clamp both values when both out of range", () => {
      // Arrange
      const start = 10
      const end = 60

      // Act
      const result = validateAgeRange(start, end)

      // Assert
      expect(result).toEqual({ start: 18, end: 45 })
    })
  })

  describe("swap behavior when reversed", () => {
    test("should swap values when start is greater than end", () => {
      // Arrange
      const start = 35
      const end = 25

      // Act
      const result = validateAgeRange(start, end)

      // Assert
      expect(result).toEqual({ start: 25, end: 35 })
    })

    test("should handle same values without error", () => {
      // Arrange
      const start = 30
      const end = 30

      // Act
      const result = validateAgeRange(start, end)

      // Assert
      expect(result).toEqual({ start: 30, end: 30 })
    })

    test("should clamp and swap when both out of range and reversed", () => {
      // Arrange
      const start = 60
      const end = 10

      // Act
      const result = validateAgeRange(start, end)

      // Assert
      // 60 clamps to 45, 10 clamps to 18, then swap: start=18, end=45
      expect(result).toEqual({ start: 18, end: 45 })
    })
  })

  describe("error cases", () => {
    test("should throw ProfileServiceError when start is NaN", () => {
      // Arrange
      const start = NaN
      const end = 30

      // Act & Assert
      expect(() => validateAgeRange(start, end)).toThrow(ProfileServiceError)
      expect(() => validateAgeRange(start, end)).toThrow("Invalid age range")
    })

    test("should throw ProfileServiceError when end is NaN", () => {
      // Arrange
      const start = 20
      const end = NaN

      // Act & Assert
      expect(() => validateAgeRange(start, end)).toThrow(ProfileServiceError)
    })

    test("should throw ProfileServiceError when both are NaN", () => {
      // Arrange
      const start = NaN
      const end = NaN

      // Act & Assert
      expect(() => validateAgeRange(start, end)).toThrow(ProfileServiceError)
    })

    test("should have error code INVALID_AGE_RANGE", () => {
      // Arrange
      const start = NaN
      const end = 30

      // Act & Assert
      try {
        validateAgeRange(start, end)
        expect.fail("Should have thrown")
      } catch (error) {
        expect(error).toBeInstanceOf(ProfileServiceError)
        expect((error as ProfileServiceError).code).toBe("INVALID_AGE_RANGE")
      }
    })
  })
})

// ============================================================================
// validateRegion
// ============================================================================

describe("validateRegion", () => {
  describe("valid regions", () => {
    const validRegions = [
      "north-america",
      "latin-america",
      "western-europe",
      "slavic-europe",
      "eastern-europe",
      "scandinavia",
      "southern-europe",
      "africa",
      "middle-east",
      "south-asia",
      "southeast-asia",
      "east-asia",
      "australia",
    ]

    test.each(validRegions)('should not throw for valid region "%s"', (regionId) => {
      // Arrange & Act & Assert
      expect(() => validateRegion(regionId)).not.toThrow()
    })
  })

  describe("invalid regions", () => {
    test("should throw ProfileServiceError for unknown region", () => {
      // Arrange
      const regionId = "unknown-region"

      // Act & Assert
      expect(() => validateRegion(regionId)).toThrow(ProfileServiceError)
      expect(() => validateRegion(regionId)).toThrow("Invalid region")
    })

    test("should throw ProfileServiceError for empty string", () => {
      // Arrange
      const regionId = ""

      // Act & Assert
      expect(() => validateRegion(regionId)).toThrow(ProfileServiceError)
    })

    test("should throw ProfileServiceError for case mismatch", () => {
      // Arrange
      const regionId = "North-America"

      // Act & Assert
      expect(() => validateRegion(regionId)).toThrow(ProfileServiceError)
    })

    test("should throw ProfileServiceError for partial match", () => {
      // Arrange
      const regionId = "north"

      // Act & Assert
      expect(() => validateRegion(regionId)).toThrow(ProfileServiceError)
    })

    test("should have error code INVALID_REGION", () => {
      // Arrange
      const regionId = "invalid"

      // Act & Assert
      try {
        validateRegion(regionId)
        expect.fail("Should have thrown")
      } catch (error) {
        expect(error).toBeInstanceOf(ProfileServiceError)
        expect((error as ProfileServiceError).code).toBe("INVALID_REGION")
      }
    })
  })
})

// ============================================================================
// ProfileServiceError
// ============================================================================

describe("ProfileServiceError", () => {
  test("should be an instance of Error", () => {
    // Arrange & Act
    const error = new ProfileServiceError("Test message", "TEST_CODE")

    // Assert
    expect(error).toBeInstanceOf(Error)
  })

  test("should have correct name property", () => {
    // Arrange & Act
    const error = new ProfileServiceError("Test message", "TEST_CODE")

    // Assert
    expect(error.name).toBe("ProfileServiceError")
  })

  test("should have correct message property", () => {
    // Arrange & Act
    const error = new ProfileServiceError("Test message", "TEST_CODE")

    // Assert
    expect(error.message).toBe("Test message")
  })

  test("should have correct code property", () => {
    // Arrange & Act
    const error = new ProfileServiceError("Test message", "TEST_CODE")

    // Assert
    expect(error.code).toBe("TEST_CODE")
  })
})
