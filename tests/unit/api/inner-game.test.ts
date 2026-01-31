import { describe, test, expect, vi, beforeEach } from "vitest"
import { NextRequest } from "next/server"

// Mock dependencies before importing route handlers
vi.mock("@/src/db/server", () => ({
  createServerSupabaseClient: vi.fn(),
  hasPurchased: vi.fn(),
  requirePremium: vi.fn(),
}))

vi.mock("@/src/inner-game", () => ({
  getInnerGameValues: vi.fn(),
  saveInnerGameValueSelection: vi.fn(),
}))

vi.mock("@/src/db/valueComparisonRepo", () => ({
  saveComparison: vi.fn(),
  getComparisons: vi.fn(),
  deleteAllComparisons: vi.fn(),
}))

vi.mock("@/src/db/valuesRepo", () => ({
  getUserValueIds: vi.fn(),
}))

vi.mock("@/src/inner-game/modules/progress", () => ({
  getUserProgress: vi.fn(),
  updateUserProgress: vi.fn(),
}))

vi.mock("@/src/inner-game/modules/valueInference", () => ({
  inferValues: vi.fn(),
  ValueInferenceError: class ValueInferenceError extends Error {
    code: string
    constructor(message: string, code: string) {
      super(message)
      this.code = code
    }
  },
}))

// Import mocked modules
import { createServerSupabaseClient, hasPurchased, requirePremium } from "@/src/db/server"
import { getInnerGameValues, saveInnerGameValueSelection } from "@/src/inner-game"
import { saveComparison, getComparisons, deleteAllComparisons } from "@/src/db/valueComparisonRepo"
import { getUserValueIds } from "@/src/db/valuesRepo"
import { getUserProgress, updateUserProgress } from "@/src/inner-game/modules/progress"
import { inferValues, ValueInferenceError } from "@/src/inner-game/modules/valueInference"

// Import route handlers
import { GET as valuesGET, POST as valuesPOST } from "@/app/api/inner-game/values/route"
import {
  GET as comparisonsGET,
  POST as comparisonsPOST,
  DELETE as comparisonsDELETE,
} from "@/app/api/inner-game/comparisons/route"
import { GET as progressGET, POST as progressPOST } from "@/app/api/inner-game/progress/route"
import { POST as inferValuesPOST } from "@/app/api/inner-game/infer-values/route"

// Test data
const TEST_USER_ID = "test-user-123"

// Helper to create mock Supabase client
function createMockSupabaseClient(user: { id: string } | null) {
  return {
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user },
        error: user ? null : { message: "Not authenticated" },
      }),
    },
  }
}

// Helper to create mock auth result
function createAuthSuccess(userId: string) {
  return {
    success: true as const,
    userId,
    supabase: {} as never,
  }
}

function createAuthFailure(status: 401 | 403) {
  const { NextResponse } = require("next/server")
  const error = status === 401 ? "Authentication required" : "Premium subscription required"
  return {
    success: false as const,
    response: NextResponse.json({ error }, { status }),
  }
}

// Helper to create NextRequest with various options
function createRequest(
  url: string,
  options: { method: string; body?: Record<string, unknown> }
): NextRequest {
  const init: RequestInit = {
    method: options.method,
  }
  if (options.body) {
    init.body = JSON.stringify(options.body)
    init.headers = { "Content-Type": "application/json" }
  }
  return new NextRequest(url, init)
}

// Helper to parse response
async function parseResponse(response: Response) {
  const text = await response.text()
  try {
    return JSON.parse(text)
  } catch {
    return text
  }
}

// ============================================================================
// Values Route - GET
// ============================================================================

describe("GET /api/inner-game/values", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe("authentication", () => {
    test("should return 401 when user is not authenticated", async () => {
      // Arrange
      const mockSupabase = createMockSupabaseClient(null)
      vi.mocked(createServerSupabaseClient).mockResolvedValue(mockSupabase as never)
      const request = createRequest("http://localhost/api/inner-game/values", { method: "GET" })

      // Act
      const response = await valuesGET(request)
      const data = await parseResponse(response)

      // Assert
      expect(response.status).toBe(401)
      expect(data.error).toBe("Authentication required")
    })

    test("should return 403 when user does not have premium subscription", async () => {
      // Arrange
      const mockSupabase = createMockSupabaseClient({ id: TEST_USER_ID })
      vi.mocked(createServerSupabaseClient).mockResolvedValue(mockSupabase as never)
      vi.mocked(hasPurchased).mockResolvedValue(false)
      const request = createRequest("http://localhost/api/inner-game/values", { method: "GET" })

      // Act
      const response = await valuesGET(request)
      const data = await parseResponse(response)

      // Assert
      expect(response.status).toBe(403)
      expect(data.error).toBe("Premium subscription required")
    })
  })

  describe("happy path", () => {
    test("should return all values when no category filter", async () => {
      // Arrange
      const mockSupabase = createMockSupabaseClient({ id: TEST_USER_ID })
      vi.mocked(createServerSupabaseClient).mockResolvedValue(mockSupabase as never)
      vi.mocked(hasPurchased).mockResolvedValue(true)
      const mockValues = [
        { id: "v1", name: "Authenticity", category: "Core" },
        { id: "v2", name: "Adventure", category: "Growth" },
      ]
      vi.mocked(getInnerGameValues).mockResolvedValue(mockValues)
      const request = createRequest("http://localhost/api/inner-game/values", { method: "GET" })

      // Act
      const response = await valuesGET(request)
      const data = await parseResponse(response)

      // Assert
      expect(response.status).toBe(200)
      expect(data).toEqual(mockValues)
    })

    test("should filter values by category when provided", async () => {
      // Arrange
      const mockSupabase = createMockSupabaseClient({ id: TEST_USER_ID })
      vi.mocked(createServerSupabaseClient).mockResolvedValue(mockSupabase as never)
      vi.mocked(hasPurchased).mockResolvedValue(true)
      const mockValues = [
        { id: "v1", name: "Authenticity", category: "Core" },
        { id: "v2", name: "Adventure", category: "Growth" },
      ]
      vi.mocked(getInnerGameValues).mockResolvedValue(mockValues)
      const request = createRequest("http://localhost/api/inner-game/values?category=core", {
        method: "GET",
      })

      // Act
      const response = await valuesGET(request)
      const data = await parseResponse(response)

      // Assert
      expect(response.status).toBe(200)
      expect(data).toEqual([{ id: "v1", name: "Authenticity", category: "Core" }])
    })

    test("should return empty array when category has no matches", async () => {
      // Arrange
      const mockSupabase = createMockSupabaseClient({ id: TEST_USER_ID })
      vi.mocked(createServerSupabaseClient).mockResolvedValue(mockSupabase as never)
      vi.mocked(hasPurchased).mockResolvedValue(true)
      vi.mocked(getInnerGameValues).mockResolvedValue([])
      const request = createRequest("http://localhost/api/inner-game/values?category=nonexistent", {
        method: "GET",
      })

      // Act
      const response = await valuesGET(request)
      const data = await parseResponse(response)

      // Assert
      expect(response.status).toBe(200)
      expect(data).toEqual([])
    })
  })

  describe("error handling", () => {
    test("should return 500 when getInnerGameValues throws", async () => {
      // Arrange
      const mockSupabase = createMockSupabaseClient({ id: TEST_USER_ID })
      vi.mocked(createServerSupabaseClient).mockResolvedValue(mockSupabase as never)
      vi.mocked(hasPurchased).mockResolvedValue(true)
      vi.mocked(getInnerGameValues).mockRejectedValue(new Error("Database error"))
      const request = createRequest("http://localhost/api/inner-game/values", { method: "GET" })

      // Act
      const response = await valuesGET(request)
      const data = await parseResponse(response)

      // Assert
      expect(response.status).toBe(500)
      expect(data.error).toBe("Database error")
    })
  })
})

// ============================================================================
// Values Route - POST
// ============================================================================

describe("POST /api/inner-game/values", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe("authentication", () => {
    test("should return 401 when user is not authenticated", async () => {
      // Arrange
      const mockSupabase = createMockSupabaseClient(null)
      vi.mocked(createServerSupabaseClient).mockResolvedValue(mockSupabase as never)
      const request = createRequest("http://localhost/api/inner-game/values", {
        method: "POST",
        body: { valueIds: ["v1"] },
      })

      // Act
      const response = await valuesPOST(request)
      const data = await parseResponse(response)

      // Assert
      expect(response.status).toBe(401)
      expect(data.error).toBe("Authentication required")
    })

    test("should return 403 when user does not have premium subscription", async () => {
      // Arrange
      const mockSupabase = createMockSupabaseClient({ id: TEST_USER_ID })
      vi.mocked(createServerSupabaseClient).mockResolvedValue(mockSupabase as never)
      vi.mocked(hasPurchased).mockResolvedValue(false)
      const request = createRequest("http://localhost/api/inner-game/values", {
        method: "POST",
        body: { valueIds: ["v1"] },
      })

      // Act
      const response = await valuesPOST(request)
      const data = await parseResponse(response)

      // Assert
      expect(response.status).toBe(403)
      expect(data.error).toBe("Premium subscription required")
    })
  })

  describe("validation", () => {
    test("should return 400 when valueIds contains empty string", async () => {
      // Arrange
      const mockSupabase = createMockSupabaseClient({ id: TEST_USER_ID })
      vi.mocked(createServerSupabaseClient).mockResolvedValue(mockSupabase as never)
      vi.mocked(hasPurchased).mockResolvedValue(true)
      const request = createRequest("http://localhost/api/inner-game/values", {
        method: "POST",
        body: { valueIds: ["v1", ""] },
      })

      // Act
      const response = await valuesPOST(request)
      const data = await parseResponse(response)

      // Assert
      expect(response.status).toBe(400)
      expect(data.error).toBe("Invalid request")
    })
  })

  describe("happy path", () => {
    test("should save value selection and return ok", async () => {
      // Arrange
      const mockSupabase = createMockSupabaseClient({ id: TEST_USER_ID })
      vi.mocked(createServerSupabaseClient).mockResolvedValue(mockSupabase as never)
      vi.mocked(hasPurchased).mockResolvedValue(true)
      vi.mocked(saveInnerGameValueSelection).mockResolvedValue(undefined)
      const request = createRequest("http://localhost/api/inner-game/values", {
        method: "POST",
        body: { valueIds: ["v1", "v2", "v3"] },
      })

      // Act
      const response = await valuesPOST(request)
      const data = await parseResponse(response)

      // Assert
      expect(response.status).toBe(200)
      expect(data).toEqual({ ok: true })
      expect(saveInnerGameValueSelection).toHaveBeenCalledWith(TEST_USER_ID, ["v1", "v2", "v3"])
    })

    test("should accept empty valueIds array", async () => {
      // Arrange
      const mockSupabase = createMockSupabaseClient({ id: TEST_USER_ID })
      vi.mocked(createServerSupabaseClient).mockResolvedValue(mockSupabase as never)
      vi.mocked(hasPurchased).mockResolvedValue(true)
      vi.mocked(saveInnerGameValueSelection).mockResolvedValue(undefined)
      const request = createRequest("http://localhost/api/inner-game/values", {
        method: "POST",
        body: { valueIds: [] },
      })

      // Act
      const response = await valuesPOST(request)
      const data = await parseResponse(response)

      // Assert
      expect(response.status).toBe(200)
      expect(data).toEqual({ ok: true })
    })

    test("should default valueIds to empty array when not provided", async () => {
      // Arrange
      const mockSupabase = createMockSupabaseClient({ id: TEST_USER_ID })
      vi.mocked(createServerSupabaseClient).mockResolvedValue(mockSupabase as never)
      vi.mocked(hasPurchased).mockResolvedValue(true)
      vi.mocked(saveInnerGameValueSelection).mockResolvedValue(undefined)
      const request = createRequest("http://localhost/api/inner-game/values", {
        method: "POST",
        body: {},
      })

      // Act
      const response = await valuesPOST(request)
      const data = await parseResponse(response)

      // Assert
      expect(response.status).toBe(200)
      expect(saveInnerGameValueSelection).toHaveBeenCalledWith(TEST_USER_ID, [])
    })
  })

  describe("error handling", () => {
    test("should return 500 when saveInnerGameValueSelection throws", async () => {
      // Arrange
      const mockSupabase = createMockSupabaseClient({ id: TEST_USER_ID })
      vi.mocked(createServerSupabaseClient).mockResolvedValue(mockSupabase as never)
      vi.mocked(hasPurchased).mockResolvedValue(true)
      vi.mocked(saveInnerGameValueSelection).mockRejectedValue(new Error("Database error"))
      const request = createRequest("http://localhost/api/inner-game/values", {
        method: "POST",
        body: { valueIds: ["v1"] },
      })

      // Act
      const response = await valuesPOST(request)
      const data = await parseResponse(response)

      // Assert
      expect(response.status).toBe(500)
      expect(data.error).toBe("Database error")
    })
  })
})

// ============================================================================
// Comparisons Route - GET
// ============================================================================

describe("GET /api/inner-game/comparisons", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe("authentication", () => {
    test("should return 401 when user is not authenticated", async () => {
      // Arrange
      const mockSupabase = createMockSupabaseClient(null)
      vi.mocked(createServerSupabaseClient).mockResolvedValue(mockSupabase as never)

      // Act
      const response = await comparisonsGET()
      const data = await parseResponse(response)

      // Assert
      expect(response.status).toBe(401)
      expect(data.error).toBe("Authentication required")
    })

    test("should return 403 when user does not have premium", async () => {
      // Arrange
      const mockSupabase = createMockSupabaseClient({ id: TEST_USER_ID })
      vi.mocked(createServerSupabaseClient).mockResolvedValue(mockSupabase as never)
      vi.mocked(hasPurchased).mockResolvedValue(false)

      // Act
      const response = await comparisonsGET()
      const data = await parseResponse(response)

      // Assert
      expect(response.status).toBe(403)
      expect(data.error).toBe("Premium subscription required")
    })
  })

  describe("happy path", () => {
    test("should return user comparisons", async () => {
      // Arrange
      const mockSupabase = createMockSupabaseClient({ id: TEST_USER_ID })
      vi.mocked(createServerSupabaseClient).mockResolvedValue(mockSupabase as never)
      vi.mocked(hasPurchased).mockResolvedValue(true)
      const mockComparisons = [
        { id: "c1", value_a_id: "v1", value_b_id: "v2", chosen_value_id: "v1" },
      ]
      vi.mocked(getComparisons).mockResolvedValue(mockComparisons)

      // Act
      const response = await comparisonsGET()
      const data = await parseResponse(response)

      // Assert
      expect(response.status).toBe(200)
      expect(data).toEqual({ comparisons: mockComparisons })
      expect(getComparisons).toHaveBeenCalledWith(TEST_USER_ID)
    })
  })

  describe("error handling", () => {
    test("should return 500 when getComparisons throws", async () => {
      // Arrange
      const mockSupabase = createMockSupabaseClient({ id: TEST_USER_ID })
      vi.mocked(createServerSupabaseClient).mockResolvedValue(mockSupabase as never)
      vi.mocked(hasPurchased).mockResolvedValue(true)
      vi.mocked(getComparisons).mockRejectedValue(new Error("Database error"))

      // Act
      const response = await comparisonsGET()
      const data = await parseResponse(response)

      // Assert
      expect(response.status).toBe(500)
      expect(data.error).toBe("Database error")
    })
  })
})

// ============================================================================
// Comparisons Route - POST
// ============================================================================

describe("POST /api/inner-game/comparisons", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  const validComparisonBody = {
    valueAId: "v1",
    valueBId: "v2",
    chosenValueId: "v1",
    comparisonType: "pairwise" as const,
    roundNumber: 1,
  }

  describe("authentication", () => {
    test("should return 401 when user is not authenticated", async () => {
      // Arrange
      const mockSupabase = createMockSupabaseClient(null)
      vi.mocked(createServerSupabaseClient).mockResolvedValue(mockSupabase as never)
      const request = createRequest("http://localhost/api/inner-game/comparisons", {
        method: "POST",
        body: validComparisonBody,
      })

      // Act
      const response = await comparisonsPOST(request)
      const data = await parseResponse(response)

      // Assert
      expect(response.status).toBe(401)
      expect(data.error).toBe("Authentication required")
    })

    test("should return 403 when user does not have premium", async () => {
      // Arrange
      const mockSupabase = createMockSupabaseClient({ id: TEST_USER_ID })
      vi.mocked(createServerSupabaseClient).mockResolvedValue(mockSupabase as never)
      vi.mocked(hasPurchased).mockResolvedValue(false)
      const request = createRequest("http://localhost/api/inner-game/comparisons", {
        method: "POST",
        body: validComparisonBody,
      })

      // Act
      const response = await comparisonsPOST(request)
      const data = await parseResponse(response)

      // Assert
      expect(response.status).toBe(403)
      expect(data.error).toBe("Premium subscription required")
    })
  })

  describe("validation", () => {
    test("should return 400 when valueAId is missing", async () => {
      // Arrange
      const mockSupabase = createMockSupabaseClient({ id: TEST_USER_ID })
      vi.mocked(createServerSupabaseClient).mockResolvedValue(mockSupabase as never)
      vi.mocked(hasPurchased).mockResolvedValue(true)
      const request = createRequest("http://localhost/api/inner-game/comparisons", {
        method: "POST",
        body: { ...validComparisonBody, valueAId: undefined },
      })

      // Act
      const response = await comparisonsPOST(request)
      const data = await parseResponse(response)

      // Assert
      expect(response.status).toBe(400)
      expect(data.error).toBe("Invalid request")
    })

    test("should return 400 when comparisonType is invalid", async () => {
      // Arrange
      const mockSupabase = createMockSupabaseClient({ id: TEST_USER_ID })
      vi.mocked(createServerSupabaseClient).mockResolvedValue(mockSupabase as never)
      vi.mocked(hasPurchased).mockResolvedValue(true)
      const request = createRequest("http://localhost/api/inner-game/comparisons", {
        method: "POST",
        body: { ...validComparisonBody, comparisonType: "invalid" },
      })

      // Act
      const response = await comparisonsPOST(request)
      const data = await parseResponse(response)

      // Assert
      expect(response.status).toBe(400)
      expect(data.error).toBe("Invalid request")
    })

    test("should return 400 when roundNumber is less than 1", async () => {
      // Arrange
      const mockSupabase = createMockSupabaseClient({ id: TEST_USER_ID })
      vi.mocked(createServerSupabaseClient).mockResolvedValue(mockSupabase as never)
      vi.mocked(hasPurchased).mockResolvedValue(true)
      const request = createRequest("http://localhost/api/inner-game/comparisons", {
        method: "POST",
        body: { ...validComparisonBody, roundNumber: 0 },
      })

      // Act
      const response = await comparisonsPOST(request)
      const data = await parseResponse(response)

      // Assert
      expect(response.status).toBe(400)
      expect(data.error).toBe("Invalid request")
    })

    test("should return 400 when chosenValueId is not one of compared values", async () => {
      // Arrange
      const mockSupabase = createMockSupabaseClient({ id: TEST_USER_ID })
      vi.mocked(createServerSupabaseClient).mockResolvedValue(mockSupabase as never)
      vi.mocked(hasPurchased).mockResolvedValue(true)
      const request = createRequest("http://localhost/api/inner-game/comparisons", {
        method: "POST",
        body: { ...validComparisonBody, chosenValueId: "v3" },
      })

      // Act
      const response = await comparisonsPOST(request)
      const data = await parseResponse(response)

      // Assert
      expect(response.status).toBe(400)
      expect(data.error).toBe("Chosen value must be one of the compared values")
    })
  })

  describe("happy path", () => {
    test("should save comparison and return it", async () => {
      // Arrange
      const mockSupabase = createMockSupabaseClient({ id: TEST_USER_ID })
      vi.mocked(createServerSupabaseClient).mockResolvedValue(mockSupabase as never)
      vi.mocked(hasPurchased).mockResolvedValue(true)
      const mockComparison = { id: "c1", ...validComparisonBody }
      vi.mocked(saveComparison).mockResolvedValue(mockComparison)
      const request = createRequest("http://localhost/api/inner-game/comparisons", {
        method: "POST",
        body: validComparisonBody,
      })

      // Act
      const response = await comparisonsPOST(request)
      const data = await parseResponse(response)

      // Assert
      expect(response.status).toBe(200)
      expect(data).toEqual({ comparison: mockComparison })
      expect(saveComparison).toHaveBeenCalledWith({
        user_id: TEST_USER_ID,
        value_a_id: "v1",
        value_b_id: "v2",
        chosen_value_id: "v1",
        comparison_type: "pairwise",
        round_number: 1,
      })
    })

    test("should accept aspirational_vs_current comparison type", async () => {
      // Arrange
      const mockSupabase = createMockSupabaseClient({ id: TEST_USER_ID })
      vi.mocked(createServerSupabaseClient).mockResolvedValue(mockSupabase as never)
      vi.mocked(hasPurchased).mockResolvedValue(true)
      const mockComparison = { id: "c1" }
      vi.mocked(saveComparison).mockResolvedValue(mockComparison)
      const request = createRequest("http://localhost/api/inner-game/comparisons", {
        method: "POST",
        body: { ...validComparisonBody, comparisonType: "aspirational_vs_current" },
      })

      // Act
      const response = await comparisonsPOST(request)

      // Assert
      expect(response.status).toBe(200)
    })

    test("should default roundNumber to 1 when not provided", async () => {
      // Arrange
      const mockSupabase = createMockSupabaseClient({ id: TEST_USER_ID })
      vi.mocked(createServerSupabaseClient).mockResolvedValue(mockSupabase as never)
      vi.mocked(hasPurchased).mockResolvedValue(true)
      vi.mocked(saveComparison).mockResolvedValue({ id: "c1" })
      const { roundNumber, ...bodyWithoutRound } = validComparisonBody
      const request = createRequest("http://localhost/api/inner-game/comparisons", {
        method: "POST",
        body: bodyWithoutRound,
      })

      // Act
      await comparisonsPOST(request)

      // Assert
      expect(saveComparison).toHaveBeenCalledWith(
        expect.objectContaining({ round_number: 1 })
      )
    })
  })

  describe("error handling", () => {
    test("should return 500 when saveComparison throws", async () => {
      // Arrange
      const mockSupabase = createMockSupabaseClient({ id: TEST_USER_ID })
      vi.mocked(createServerSupabaseClient).mockResolvedValue(mockSupabase as never)
      vi.mocked(hasPurchased).mockResolvedValue(true)
      vi.mocked(saveComparison).mockRejectedValue(new Error("Database error"))
      const request = createRequest("http://localhost/api/inner-game/comparisons", {
        method: "POST",
        body: validComparisonBody,
      })

      // Act
      const response = await comparisonsPOST(request)
      const data = await parseResponse(response)

      // Assert
      expect(response.status).toBe(500)
      expect(data.error).toBe("Database error")
    })
  })
})

// ============================================================================
// Comparisons Route - DELETE
// ============================================================================

describe("DELETE /api/inner-game/comparisons", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe("authentication", () => {
    test("should return 401 when user is not authenticated", async () => {
      // Arrange
      const mockSupabase = createMockSupabaseClient(null)
      vi.mocked(createServerSupabaseClient).mockResolvedValue(mockSupabase as never)

      // Act
      const response = await comparisonsDELETE()
      const data = await parseResponse(response)

      // Assert
      expect(response.status).toBe(401)
      expect(data.error).toBe("Authentication required")
    })

    test("should return 403 when user does not have premium", async () => {
      // Arrange
      const mockSupabase = createMockSupabaseClient({ id: TEST_USER_ID })
      vi.mocked(createServerSupabaseClient).mockResolvedValue(mockSupabase as never)
      vi.mocked(hasPurchased).mockResolvedValue(false)

      // Act
      const response = await comparisonsDELETE()
      const data = await parseResponse(response)

      // Assert
      expect(response.status).toBe(403)
      expect(data.error).toBe("Premium subscription required")
    })
  })

  describe("happy path", () => {
    test("should delete all comparisons and return ok", async () => {
      // Arrange
      const mockSupabase = createMockSupabaseClient({ id: TEST_USER_ID })
      vi.mocked(createServerSupabaseClient).mockResolvedValue(mockSupabase as never)
      vi.mocked(hasPurchased).mockResolvedValue(true)
      vi.mocked(deleteAllComparisons).mockResolvedValue(undefined)

      // Act
      const response = await comparisonsDELETE()
      const data = await parseResponse(response)

      // Assert
      expect(response.status).toBe(200)
      expect(data).toEqual({ ok: true })
      expect(deleteAllComparisons).toHaveBeenCalledWith(TEST_USER_ID)
    })
  })

  describe("error handling", () => {
    test("should return 500 when deleteAllComparisons throws", async () => {
      // Arrange
      const mockSupabase = createMockSupabaseClient({ id: TEST_USER_ID })
      vi.mocked(createServerSupabaseClient).mockResolvedValue(mockSupabase as never)
      vi.mocked(hasPurchased).mockResolvedValue(true)
      vi.mocked(deleteAllComparisons).mockRejectedValue(new Error("Database error"))

      // Act
      const response = await comparisonsDELETE()
      const data = await parseResponse(response)

      // Assert
      expect(response.status).toBe(500)
      expect(data.error).toBe("Database error")
    })
  })
})

// ============================================================================
// Progress Route - GET
// ============================================================================

describe("GET /api/inner-game/progress", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe("authentication", () => {
    test("should return 401 when user is not authenticated", async () => {
      // Arrange
      vi.mocked(requirePremium).mockResolvedValue(createAuthFailure(401))

      // Act
      const response = await progressGET()
      const data = await parseResponse(response)

      // Assert
      expect(response.status).toBe(401)
      expect(data.error).toBe("Authentication required")
    })

    test("should return 403 when user does not have premium", async () => {
      // Arrange
      vi.mocked(requirePremium).mockResolvedValue(createAuthFailure(403))

      // Act
      const response = await progressGET()
      const data = await parseResponse(response)

      // Assert
      expect(response.status).toBe(403)
      expect(data.error).toBe("Premium subscription required")
    })
  })

  describe("happy path", () => {
    test("should return progress and selected values", async () => {
      // Arrange
      vi.mocked(requirePremium).mockResolvedValue(createAuthSuccess(TEST_USER_ID))
      const mockProgress = { currentStep: "values", currentSubstep: 3, welcomeDismissed: true }
      const mockSelectedValues = ["v1", "v2", "v3"]
      vi.mocked(getUserProgress).mockResolvedValue(mockProgress as never)
      vi.mocked(getUserValueIds).mockResolvedValue(mockSelectedValues)

      // Act
      const response = await progressGET()
      const data = await parseResponse(response)

      // Assert
      expect(response.status).toBe(200)
      expect(data).toEqual({
        progress: mockProgress,
        selectedValues: mockSelectedValues,
        totalCategories: 10,
        completedCategories: 3,
      })
    })
  })

  describe("error handling", () => {
    test("should return 500 when getUserProgress throws", async () => {
      // Arrange
      vi.mocked(requirePremium).mockResolvedValue(createAuthSuccess(TEST_USER_ID))
      vi.mocked(getUserProgress).mockRejectedValue(new Error("Database error"))

      // Act
      const response = await progressGET()
      const data = await parseResponse(response)

      // Assert
      expect(response.status).toBe(500)
      expect(data.error).toBe("Database error")
    })
  })
})

// ============================================================================
// Progress Route - POST
// ============================================================================

describe("POST /api/inner-game/progress", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe("authentication", () => {
    test("should return 401 when user is not authenticated", async () => {
      // Arrange
      vi.mocked(requirePremium).mockResolvedValue(createAuthFailure(401))
      const request = createRequest("http://localhost/api/inner-game/progress", {
        method: "POST",
        body: { currentSubstep: 1 },
      })

      // Act
      const response = await progressPOST(request)
      const data = await parseResponse(response)

      // Assert
      expect(response.status).toBe(401)
      expect(data.error).toBe("Authentication required")
    })

    test("should return 403 when user does not have premium", async () => {
      // Arrange
      vi.mocked(requirePremium).mockResolvedValue(createAuthFailure(403))
      const request = createRequest("http://localhost/api/inner-game/progress", {
        method: "POST",
        body: { currentSubstep: 1 },
      })

      // Act
      const response = await progressPOST(request)
      const data = await parseResponse(response)

      // Assert
      expect(response.status).toBe(403)
      expect(data.error).toBe("Premium subscription required")
    })
  })

  describe("validation", () => {
    test("should return 400 when currentSubstep is out of range", async () => {
      // Arrange
      vi.mocked(requirePremium).mockResolvedValue(createAuthSuccess(TEST_USER_ID))
      const request = createRequest("http://localhost/api/inner-game/progress", {
        method: "POST",
        body: { currentSubstep: 15 },
      })

      // Act
      const response = await progressPOST(request)
      const data = await parseResponse(response)

      // Assert
      expect(response.status).toBe(400)
      expect(data.error).toBe("Invalid request")
    })

    test("should return 400 when currentSubstep is negative", async () => {
      // Arrange
      vi.mocked(requirePremium).mockResolvedValue(createAuthSuccess(TEST_USER_ID))
      const request = createRequest("http://localhost/api/inner-game/progress", {
        method: "POST",
        body: { currentSubstep: -1 },
      })

      // Act
      const response = await progressPOST(request)
      const data = await parseResponse(response)

      // Assert
      expect(response.status).toBe(400)
      expect(data.error).toBe("Invalid request")
    })
  })

  describe("happy path", () => {
    test("should update progress and return updated progress", async () => {
      // Arrange
      vi.mocked(requirePremium).mockResolvedValue(createAuthSuccess(TEST_USER_ID))
      const mockUpdatedProgress = { currentStep: "values", currentSubstep: 5 }
      vi.mocked(updateUserProgress).mockResolvedValue(mockUpdatedProgress as never)
      const request = createRequest("http://localhost/api/inner-game/progress", {
        method: "POST",
        body: { currentSubstep: 5 },
      })

      // Act
      const response = await progressPOST(request)
      const data = await parseResponse(response)

      // Assert
      expect(response.status).toBe(200)
      expect(data).toEqual({ progress: mockUpdatedProgress })
      expect(updateUserProgress).toHaveBeenCalledWith(TEST_USER_ID, { currentSubstep: 5 })
    })

    test("should accept multiple fields in update", async () => {
      // Arrange
      vi.mocked(requirePremium).mockResolvedValue(createAuthSuccess(TEST_USER_ID))
      vi.mocked(updateUserProgress).mockResolvedValue({ currentSubstep: 3, welcomeDismissed: true } as never)
      const request = createRequest("http://localhost/api/inner-game/progress", {
        method: "POST",
        body: { currentSubstep: 3, welcomeDismissed: true },
      })

      // Act
      const response = await progressPOST(request)

      // Assert
      expect(response.status).toBe(200)
      expect(updateUserProgress).toHaveBeenCalledWith(TEST_USER_ID, {
        currentSubstep: 3,
        welcomeDismissed: true,
      })
    })
  })

  describe("error handling", () => {
    test("should return 500 when updateUserProgress throws", async () => {
      // Arrange
      vi.mocked(requirePremium).mockResolvedValue(createAuthSuccess(TEST_USER_ID))
      vi.mocked(updateUserProgress).mockRejectedValue(new Error("Database error"))
      const request = createRequest("http://localhost/api/inner-game/progress", {
        method: "POST",
        body: { currentSubstep: 1 },
      })

      // Act
      const response = await progressPOST(request)
      const data = await parseResponse(response)

      // Assert
      expect(response.status).toBe(500)
      expect(data.error).toBe("Database error")
    })
  })
})

// ============================================================================
// Infer Values Route - POST
// ============================================================================

describe("POST /api/inner-game/infer-values", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe("authentication", () => {
    test("should return 401 when user is not authenticated", async () => {
      // Arrange
      vi.mocked(requirePremium).mockResolvedValue(createAuthFailure(401))
      const request = createRequest("http://localhost/api/inner-game/infer-values", {
        method: "POST",
        body: { context: "shadow", response: "My detailed response here" },
      })

      // Act
      const response = await inferValuesPOST(request)
      const data = await parseResponse(response)

      // Assert
      expect(response.status).toBe(401)
      expect(data.error).toBe("Authentication required")
    })

    test("should return 403 when user does not have premium", async () => {
      // Arrange
      vi.mocked(requirePremium).mockResolvedValue(createAuthFailure(403))
      const request = createRequest("http://localhost/api/inner-game/infer-values", {
        method: "POST",
        body: { context: "shadow", response: "My detailed response here" },
      })

      // Act
      const response = await inferValuesPOST(request)
      const data = await parseResponse(response)

      // Assert
      expect(response.status).toBe(403)
      expect(data.error).toBe("Premium subscription required")
    })
  })

  describe("validation", () => {
    test("should return 400 when context is invalid", async () => {
      // Arrange
      vi.mocked(requirePremium).mockResolvedValue(createAuthSuccess(TEST_USER_ID))
      const request = createRequest("http://localhost/api/inner-game/infer-values", {
        method: "POST",
        body: { context: "invalid", response: "My detailed response here" },
      })

      // Act
      const response = await inferValuesPOST(request)
      const data = await parseResponse(response)

      // Assert
      expect(response.status).toBe(400)
      expect(data.error).toBe("Invalid request")
    })

    test("should return 400 when response is too short", async () => {
      // Arrange
      vi.mocked(requirePremium).mockResolvedValue(createAuthSuccess(TEST_USER_ID))
      const request = createRequest("http://localhost/api/inner-game/infer-values", {
        method: "POST",
        body: { context: "shadow", response: "short" },
      })

      // Act
      const response = await inferValuesPOST(request)
      const data = await parseResponse(response)

      // Assert
      expect(response.status).toBe(400)
      expect(data.error).toBe("Invalid request")
    })

    test("should return 400 when response is missing", async () => {
      // Arrange
      vi.mocked(requirePremium).mockResolvedValue(createAuthSuccess(TEST_USER_ID))
      const request = createRequest("http://localhost/api/inner-game/infer-values", {
        method: "POST",
        body: { context: "shadow" },
      })

      // Act
      const response = await inferValuesPOST(request)
      const data = await parseResponse(response)

      // Assert
      expect(response.status).toBe(400)
      expect(data.error).toBe("Invalid request")
    })
  })

  describe("happy path", () => {
    test("should infer values from shadow context", async () => {
      // Arrange
      vi.mocked(requirePremium).mockResolvedValue(createAuthSuccess(TEST_USER_ID))
      vi.mocked(getUserValueIds).mockResolvedValue(["v1", "v2"])
      const mockInferredValues = [
        { id: "v1", reason: "Shows authenticity" },
        { id: "v3", reason: "Indicates courage" },
      ]
      vi.mocked(inferValues).mockResolvedValue(mockInferredValues)
      const request = createRequest("http://localhost/api/inner-game/infer-values", {
        method: "POST",
        body: { context: "shadow", response: "My detailed shadow response text" },
      })

      // Act
      const response = await inferValuesPOST(request)
      const data = await parseResponse(response)

      // Assert
      expect(response.status).toBe(200)
      expect(data).toEqual({ values: mockInferredValues })
      expect(inferValues).toHaveBeenCalledWith("shadow", "My detailed shadow response text", ["v1", "v2"])
    })

    test("should accept peak_experience context", async () => {
      // Arrange
      vi.mocked(requirePremium).mockResolvedValue(createAuthSuccess(TEST_USER_ID))
      vi.mocked(getUserValueIds).mockResolvedValue([])
      vi.mocked(inferValues).mockResolvedValue([])
      const request = createRequest("http://localhost/api/inner-game/infer-values", {
        method: "POST",
        body: { context: "peak_experience", response: "My peak experience story" },
      })

      // Act
      const response = await inferValuesPOST(request)

      // Assert
      expect(response.status).toBe(200)
      expect(inferValues).toHaveBeenCalledWith("peak_experience", "My peak experience story", [])
    })

    test("should accept hurdles context", async () => {
      // Arrange
      vi.mocked(requirePremium).mockResolvedValue(createAuthSuccess(TEST_USER_ID))
      vi.mocked(getUserValueIds).mockResolvedValue([])
      vi.mocked(inferValues).mockResolvedValue([])
      const request = createRequest("http://localhost/api/inner-game/infer-values", {
        method: "POST",
        body: { context: "hurdles", response: "My hurdles and challenges" },
      })

      // Act
      const response = await inferValuesPOST(request)

      // Assert
      expect(response.status).toBe(200)
    })
  })

  describe("error handling", () => {
    test("should return 503 when MODEL_NOT_FOUND error", async () => {
      // Arrange
      vi.mocked(requirePremium).mockResolvedValue(createAuthSuccess(TEST_USER_ID))
      vi.mocked(getUserValueIds).mockResolvedValue([])
      const error = new ValueInferenceError("Model not available", "MODEL_NOT_FOUND")
      vi.mocked(inferValues).mockRejectedValue(error)
      const request = createRequest("http://localhost/api/inner-game/infer-values", {
        method: "POST",
        body: { context: "shadow", response: "My detailed response" },
      })

      // Act
      const response = await inferValuesPOST(request)
      const data = await parseResponse(response)

      // Assert
      expect(response.status).toBe(503)
      expect(data.error).toBe("Model not available")
      expect(data.code).toBe("MODEL_NOT_FOUND")
    })

    test("should return 400 when EMPTY_RESPONSE error", async () => {
      // Arrange
      vi.mocked(requirePremium).mockResolvedValue(createAuthSuccess(TEST_USER_ID))
      vi.mocked(getUserValueIds).mockResolvedValue([])
      const error = new ValueInferenceError("Empty response from model", "EMPTY_RESPONSE")
      vi.mocked(inferValues).mockRejectedValue(error)
      const request = createRequest("http://localhost/api/inner-game/infer-values", {
        method: "POST",
        body: { context: "shadow", response: "My detailed response" },
      })

      // Act
      const response = await inferValuesPOST(request)
      const data = await parseResponse(response)

      // Assert
      expect(response.status).toBe(400)
      expect(data.error).toBe("Empty response from model")
      expect(data.code).toBe("EMPTY_RESPONSE")
    })

    test("should return 500 for other ValueInferenceError codes", async () => {
      // Arrange
      vi.mocked(requirePremium).mockResolvedValue(createAuthSuccess(TEST_USER_ID))
      vi.mocked(getUserValueIds).mockResolvedValue([])
      const error = new ValueInferenceError("Processing error", "PROCESSING_ERROR")
      vi.mocked(inferValues).mockRejectedValue(error)
      const request = createRequest("http://localhost/api/inner-game/infer-values", {
        method: "POST",
        body: { context: "shadow", response: "My detailed response" },
      })

      // Act
      const response = await inferValuesPOST(request)
      const data = await parseResponse(response)

      // Assert
      expect(response.status).toBe(500)
      expect(data.error).toBe("Processing error")
    })

    test("should return 500 when generic error thrown", async () => {
      // Arrange
      vi.mocked(requirePremium).mockResolvedValue(createAuthSuccess(TEST_USER_ID))
      vi.mocked(getUserValueIds).mockResolvedValue([])
      vi.mocked(inferValues).mockRejectedValue(new Error("Unexpected error"))
      const request = createRequest("http://localhost/api/inner-game/infer-values", {
        method: "POST",
        body: { context: "shadow", response: "My detailed response" },
      })

      // Act
      const response = await inferValuesPOST(request)
      const data = await parseResponse(response)

      // Assert
      expect(response.status).toBe(500)
      expect(data.error).toBe("Unexpected error")
    })
  })
})
