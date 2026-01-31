import { describe, test, expect, vi, beforeEach } from "vitest"
import { NextRequest } from "next/server"

// Mock dependencies before importing route handlers
vi.mock("@/src/db/server", () => ({
  requirePremium: vi.fn(),
}))

vi.mock("@/src/qa", () => ({
  handleQARequest: vi.fn(),
}))

// Import mocked modules
import { requirePremium } from "@/src/db/server"
import { handleQARequest } from "@/src/qa"

// Import route handler
import { POST } from "@/app/api/qa/route"

// Test data
const TEST_USER_ID = "test-user-123"

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

// Helper to create NextRequest
function createRequest(body?: Record<string, unknown>): NextRequest {
  const init: RequestInit = {
    method: "POST",
  }
  if (body) {
    init.body = JSON.stringify(body)
    init.headers = { "Content-Type": "application/json" }
  }
  return new NextRequest("http://localhost/api/qa", init)
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
// Q&A Route - POST
// ============================================================================

describe("POST /api/qa", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe("authentication", () => {
    test("should return 401 when user is not authenticated", async () => {
      // Arrange
      vi.mocked(requirePremium).mockResolvedValue(createAuthFailure(401))
      const request = createRequest({ question: "What is daygame?" })

      // Act
      const response = await POST(request)
      const data = await parseResponse(response)

      // Assert
      expect(response.status).toBe(401)
      expect(data.error).toBe("Authentication required")
    })

    test("should return 403 when user does not have premium subscription", async () => {
      // Arrange
      vi.mocked(requirePremium).mockResolvedValue(createAuthFailure(403))
      const request = createRequest({ question: "What is daygame?" })

      // Act
      const response = await POST(request)
      const data = await parseResponse(response)

      // Assert
      expect(response.status).toBe(403)
      expect(data.error).toBe("Premium subscription required")
    })
  })

  describe("validation", () => {
    test("should return 400 when question is missing", async () => {
      // Arrange
      vi.mocked(requirePremium).mockResolvedValue(createAuthSuccess(TEST_USER_ID))
      const request = createRequest({})

      // Act
      const response = await POST(request)
      const data = await parseResponse(response)

      // Assert
      expect(response.status).toBe(400)
      expect(data.error).toBe("Invalid request")
      expect(data.details).toBeDefined()
    })

    test("should return 400 when question is empty string", async () => {
      // Arrange
      vi.mocked(requirePremium).mockResolvedValue(createAuthSuccess(TEST_USER_ID))
      const request = createRequest({ question: "" })

      // Act
      const response = await POST(request)
      const data = await parseResponse(response)

      // Assert
      expect(response.status).toBe(400)
      expect(data.error).toBe("Invalid request")
    })

    test("should return 400 when question exceeds max length", async () => {
      // Arrange
      vi.mocked(requirePremium).mockResolvedValue(createAuthSuccess(TEST_USER_ID))
      const longQuestion = "a".repeat(10001) // Exceeds typical limit
      const request = createRequest({ question: longQuestion })

      // Act
      const response = await POST(request)
      const data = await parseResponse(response)

      // Assert
      expect(response.status).toBe(400)
      expect(data.error).toBe("Invalid request")
    })

    test("should return 400 when retrieval.topK is invalid", async () => {
      // Arrange
      vi.mocked(requirePremium).mockResolvedValue(createAuthSuccess(TEST_USER_ID))
      const request = createRequest({
        question: "Valid question",
        retrieval: { topK: -1 },
      })

      // Act
      const response = await POST(request)
      const data = await parseResponse(response)

      // Assert
      expect(response.status).toBe(400)
      expect(data.error).toBe("Invalid request")
    })

    test("should return 400 when retrieval.minScore is out of range", async () => {
      // Arrange
      vi.mocked(requirePremium).mockResolvedValue(createAuthSuccess(TEST_USER_ID))
      const request = createRequest({
        question: "Valid question",
        retrieval: { minScore: 2.0 }, // Should be 0-1
      })

      // Act
      const response = await POST(request)
      const data = await parseResponse(response)

      // Assert
      expect(response.status).toBe(400)
      expect(data.error).toBe("Invalid request")
    })

    test("should return 400 when generation.provider is invalid", async () => {
      // Arrange
      vi.mocked(requirePremium).mockResolvedValue(createAuthSuccess(TEST_USER_ID))
      const request = createRequest({
        question: "Valid question",
        generation: { provider: "invalid-provider" },
      })

      // Act
      const response = await POST(request)
      const data = await parseResponse(response)

      // Assert
      expect(response.status).toBe(400)
      expect(data.error).toBe("Invalid request")
    })

    test("should return 400 when generation.temperature is out of range", async () => {
      // Arrange
      vi.mocked(requirePremium).mockResolvedValue(createAuthSuccess(TEST_USER_ID))
      const request = createRequest({
        question: "Valid question",
        generation: { temperature: 1.5 }, // Should be 0-1
      })

      // Act
      const response = await POST(request)
      const data = await parseResponse(response)

      // Assert
      expect(response.status).toBe(400)
      expect(data.error).toBe("Invalid request")
    })
  })

  describe("happy path", () => {
    test("should call handleQARequest with valid question and return response", async () => {
      // Arrange
      vi.mocked(requirePremium).mockResolvedValue(createAuthSuccess(TEST_USER_ID))
      const mockResponse = {
        answer: "Daygame is approaching women during the day.",
        confidence: 0.95,
        sources: [],
      }
      vi.mocked(handleQARequest).mockResolvedValue(mockResponse)
      const request = createRequest({ question: "What is daygame?" })

      // Act
      const response = await POST(request)
      const data = await parseResponse(response)

      // Assert
      expect(response.status).toBe(200)
      expect(data).toEqual(mockResponse)
      expect(handleQARequest).toHaveBeenCalledWith(
        { question: "What is daygame?" },
        TEST_USER_ID
      )
    })

    test("should pass retrieval options to handleQARequest", async () => {
      // Arrange
      vi.mocked(requirePremium).mockResolvedValue(createAuthSuccess(TEST_USER_ID))
      vi.mocked(handleQARequest).mockResolvedValue({ answer: "Response", sources: [] })
      const request = createRequest({
        question: "What is daygame?",
        retrieval: { topK: 5, minScore: 0.7 },
      })

      // Act
      await POST(request)

      // Assert
      expect(handleQARequest).toHaveBeenCalledWith(
        {
          question: "What is daygame?",
          retrieval: { topK: 5, minScore: 0.7 },
        },
        TEST_USER_ID
      )
    })

    test("should pass generation options to handleQARequest", async () => {
      // Arrange
      vi.mocked(requirePremium).mockResolvedValue(createAuthSuccess(TEST_USER_ID))
      vi.mocked(handleQARequest).mockResolvedValue({ answer: "Response", sources: [] })
      const request = createRequest({
        question: "What is daygame?",
        generation: { provider: "claude", temperature: 0.7 },
      })

      // Act
      await POST(request)

      // Assert
      expect(handleQARequest).toHaveBeenCalledWith(
        {
          question: "What is daygame?",
          generation: { provider: "claude", temperature: 0.7 },
        },
        TEST_USER_ID
      )
    })

    test("should handle question with special characters", async () => {
      // Arrange
      vi.mocked(requirePremium).mockResolvedValue(createAuthSuccess(TEST_USER_ID))
      vi.mocked(handleQARequest).mockResolvedValue({ answer: "Response", sources: [] })
      const request = createRequest({
        question: "How do I handle rejection? What's the best approach?",
      })

      // Act
      const response = await POST(request)

      // Assert
      expect(response.status).toBe(200)
    })
  })

  describe("error handling", () => {
    test("should return 500 when handleQARequest throws Error", async () => {
      // Arrange
      vi.mocked(requirePremium).mockResolvedValue(createAuthSuccess(TEST_USER_ID))
      vi.mocked(handleQARequest).mockRejectedValue(new Error("Service unavailable"))
      const request = createRequest({ question: "What is daygame?" })

      // Act
      const response = await POST(request)
      const data = await parseResponse(response)

      // Assert
      expect(response.status).toBe(500)
      expect(data.error).toBe("Service unavailable")
    })

    test("should return 500 with generic message when non-Error is thrown", async () => {
      // Arrange
      vi.mocked(requirePremium).mockResolvedValue(createAuthSuccess(TEST_USER_ID))
      vi.mocked(handleQARequest).mockRejectedValue("Unknown error")
      const request = createRequest({ question: "What is daygame?" })

      // Act
      const response = await POST(request)
      const data = await parseResponse(response)

      // Assert
      expect(response.status).toBe(500)
      expect(data.error).toBe("Unexpected error")
    })
  })
})
