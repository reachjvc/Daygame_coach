import { describe, test, expect, vi, beforeEach } from "vitest"
import { NextRequest } from "next/server"

// Mock dependencies before importing route handlers
vi.mock("@/src/db/server", () => ({
  createServerSupabaseClient: vi.fn(),
}))

vi.mock("@/src/tracking/trackingService", () => ({
  createSession: vi.fn(),
  getUserSessions: vi.fn(),
  createApproach: vi.fn(),
  getUserApproaches: vi.fn(),
  updateApproach: vi.fn(),
}))

vi.mock("@/src/db/trackingRepo", () => ({
  getApproachOwner: vi.fn(),
}))

// Import mocked modules
import { createServerSupabaseClient } from "@/src/db/server"
import {
  createSession,
  getUserSessions,
  createApproach,
  getUserApproaches,
  updateApproach,
} from "@/src/tracking/trackingService"
import { getApproachOwner } from "@/src/db/trackingRepo"

// Import route handlers
import { POST as sessionPOST, GET as sessionGET } from "@/app/api/tracking/session/route"
import { POST as approachPOST, GET as approachGET } from "@/app/api/tracking/approach/route"
import { PATCH as approachPATCH } from "@/app/api/tracking/approach/[id]/route"

// Test data
const TEST_USER_ID = "test-user-123"
const TEST_SESSION_ID = "session-456"
const TEST_APPROACH_ID = "approach-789"

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

// Helper to create NextRequest
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
// Session Route - POST
// ============================================================================

describe("POST /api/tracking/session", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe("authentication", () => {
    test("should return 401 when user is not authenticated", async () => {
      // Arrange
      const mockSupabase = createMockSupabaseClient(null)
      vi.mocked(createServerSupabaseClient).mockResolvedValue(mockSupabase as never)
      const request = createRequest("http://localhost/api/tracking/session", {
        method: "POST",
        body: {},
      })

      // Act
      const response = await sessionPOST(request)
      const data = await parseResponse(response)

      // Assert
      expect(response.status).toBe(401)
      expect(data.error).toBe("Unauthorized")
    })

    test("should return 401 when auth error occurs", async () => {
      // Arrange
      const mockSupabase = {
        auth: {
          getUser: vi.fn().mockResolvedValue({
            data: { user: null },
            error: { message: "Auth error" },
          }),
        },
      }
      vi.mocked(createServerSupabaseClient).mockResolvedValue(mockSupabase as never)
      const request = createRequest("http://localhost/api/tracking/session", {
        method: "POST",
        body: {},
      })

      // Act
      const response = await sessionPOST(request)

      // Assert
      expect(response.status).toBe(401)
    })
  })

  describe("validation", () => {
    test("should return 400 for invalid goal type", async () => {
      // Arrange
      const mockSupabase = createMockSupabaseClient({ id: TEST_USER_ID })
      vi.mocked(createServerSupabaseClient).mockResolvedValue(mockSupabase as never)
      const request = createRequest("http://localhost/api/tracking/session", {
        method: "POST",
        body: { goal: "not a number" }, // Invalid: goal should be number 1-100
      })

      // Act
      const response = await sessionPOST(request)
      const data = await parseResponse(response)

      // Assert
      expect(response.status).toBe(400)
      expect(data.error).toBe("Invalid request body")
      expect(data.details).toBeDefined()
    })

    test("should return 400 for goal above maximum", async () => {
      // Arrange
      const mockSupabase = createMockSupabaseClient({ id: TEST_USER_ID })
      vi.mocked(createServerSupabaseClient).mockResolvedValue(mockSupabase as never)
      const request = createRequest("http://localhost/api/tracking/session", {
        method: "POST",
        body: { goal: 101 }, // Invalid: max is 100
      })

      // Act
      const response = await sessionPOST(request)
      const data = await parseResponse(response)

      // Assert
      expect(response.status).toBe(400)
      expect(data.error).toBe("Invalid request body")
    })

    test("should return 400 for invalid pre_session_mood", async () => {
      // Arrange
      const mockSupabase = createMockSupabaseClient({ id: TEST_USER_ID })
      vi.mocked(createServerSupabaseClient).mockResolvedValue(mockSupabase as never)
      const request = createRequest("http://localhost/api/tracking/session", {
        method: "POST",
        body: { pre_session_mood: 6 }, // Invalid: max is 5
      })

      // Act
      const response = await sessionPOST(request)
      const data = await parseResponse(response)

      // Assert
      expect(response.status).toBe(400)
      expect(data.error).toBe("Invalid request body")
    })

    test("should return 400 for pre_session_mood below minimum", async () => {
      // Arrange
      const mockSupabase = createMockSupabaseClient({ id: TEST_USER_ID })
      vi.mocked(createServerSupabaseClient).mockResolvedValue(mockSupabase as never)
      const request = createRequest("http://localhost/api/tracking/session", {
        method: "POST",
        body: { pre_session_mood: 0 }, // Invalid: min is 1
      })

      // Act
      const response = await sessionPOST(request)
      const data = await parseResponse(response)

      // Assert
      expect(response.status).toBe(400)
      expect(data.error).toBe("Invalid request body")
    })
  })

  describe("happy path", () => {
    test("should create session with minimal data", async () => {
      // Arrange
      const mockSupabase = createMockSupabaseClient({ id: TEST_USER_ID })
      vi.mocked(createServerSupabaseClient).mockResolvedValue(mockSupabase as never)
      const mockSession = {
        id: TEST_SESSION_ID,
        user_id: TEST_USER_ID,
        created_at: "2026-01-31T12:00:00Z",
      }
      vi.mocked(createSession).mockResolvedValue(mockSession as never)
      const request = createRequest("http://localhost/api/tracking/session", {
        method: "POST",
        body: {},
      })

      // Act
      const response = await sessionPOST(request)
      const data = await parseResponse(response)

      // Assert
      expect(response.status).toBe(200)
      expect(data.id).toBe(TEST_SESSION_ID)
      expect(createSession).toHaveBeenCalledWith(
        expect.objectContaining({ user_id: TEST_USER_ID })
      )
    })

    test("should create session with all optional fields", async () => {
      // Arrange
      const mockSupabase = createMockSupabaseClient({ id: TEST_USER_ID })
      vi.mocked(createServerSupabaseClient).mockResolvedValue(mockSupabase as never)
      const mockSession = {
        id: TEST_SESSION_ID,
        user_id: TEST_USER_ID,
        goal: 5,
        primary_location: "Mall",
        session_focus: "opening",
        technique_focus: "eye_contact",
        if_then_plan: "If I see a woman, I approach within 3 seconds",
        custom_intention: "Stay relaxed",
        pre_session_mood: 4,
      }
      vi.mocked(createSession).mockResolvedValue(mockSession as never)
      const request = createRequest("http://localhost/api/tracking/session", {
        method: "POST",
        body: {
          goal: 5,
          primary_location: "Mall",
          session_focus: "opening",
          technique_focus: "eye_contact",
          if_then_plan: "If I see a woman, I approach within 3 seconds",
          custom_intention: "Stay relaxed",
          pre_session_mood: 4,
        },
      })

      // Act
      const response = await sessionPOST(request)
      const data = await parseResponse(response)

      // Assert
      expect(response.status).toBe(200)
      expect(data.goal).toBe(5)
      expect(createSession).toHaveBeenCalledWith(
        expect.objectContaining({
          user_id: TEST_USER_ID,
          goal: 5,
          primary_location: "Mall",
          pre_session_mood: 4,
        })
      )
    })

    test("should create session with undefined optional fields", async () => {
      // Arrange
      const mockSupabase = createMockSupabaseClient({ id: TEST_USER_ID })
      vi.mocked(createServerSupabaseClient).mockResolvedValue(mockSupabase as never)
      const mockSession = { id: TEST_SESSION_ID, user_id: TEST_USER_ID }
      vi.mocked(createSession).mockResolvedValue(mockSession as never)
      const request = createRequest("http://localhost/api/tracking/session", {
        method: "POST",
        body: {
          goal: 10,
          // All other fields intentionally omitted
        },
      })

      // Act
      const response = await sessionPOST(request)

      // Assert
      expect(response.status).toBe(200)
      expect(createSession).toHaveBeenCalledWith(
        expect.objectContaining({ user_id: TEST_USER_ID })
      )
    })
  })

  describe("error handling", () => {
    test("should return 500 when service throws", async () => {
      // Arrange
      const mockSupabase = createMockSupabaseClient({ id: TEST_USER_ID })
      vi.mocked(createServerSupabaseClient).mockResolvedValue(mockSupabase as never)
      vi.mocked(createSession).mockRejectedValue(new Error("Database error"))
      const request = createRequest("http://localhost/api/tracking/session", {
        method: "POST",
        body: {},
      })

      // Act
      const response = await sessionPOST(request)
      const data = await parseResponse(response)

      // Assert
      expect(response.status).toBe(500)
      expect(data.error).toBe("Failed to create session")
    })
  })
})

// ============================================================================
// Session Route - GET
// ============================================================================

describe("GET /api/tracking/session", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe("authentication", () => {
    test("should return 401 when user is not authenticated", async () => {
      // Arrange
      const mockSupabase = createMockSupabaseClient(null)
      vi.mocked(createServerSupabaseClient).mockResolvedValue(mockSupabase as never)
      const request = createRequest("http://localhost/api/tracking/session", {
        method: "GET",
      })

      // Act
      const response = await sessionGET(request)
      const data = await parseResponse(response)

      // Assert
      expect(response.status).toBe(401)
      expect(data.error).toBe("Unauthorized")
    })
  })

  describe("query parameters", () => {
    test("should use default limit and offset", async () => {
      // Arrange
      const mockSupabase = createMockSupabaseClient({ id: TEST_USER_ID })
      vi.mocked(createServerSupabaseClient).mockResolvedValue(mockSupabase as never)
      vi.mocked(getUserSessions).mockResolvedValue([])
      const request = createRequest("http://localhost/api/tracking/session", {
        method: "GET",
      })

      // Act
      await sessionGET(request)

      // Assert
      expect(getUserSessions).toHaveBeenCalledWith(TEST_USER_ID, 10, 0)
    })

    test("should parse custom limit and offset", async () => {
      // Arrange
      const mockSupabase = createMockSupabaseClient({ id: TEST_USER_ID })
      vi.mocked(createServerSupabaseClient).mockResolvedValue(mockSupabase as never)
      vi.mocked(getUserSessions).mockResolvedValue([])
      const request = createRequest(
        "http://localhost/api/tracking/session?limit=25&offset=50",
        { method: "GET" }
      )

      // Act
      await sessionGET(request)

      // Assert
      expect(getUserSessions).toHaveBeenCalledWith(TEST_USER_ID, 25, 50)
    })
  })

  describe("happy path", () => {
    test("should return empty array when no sessions", async () => {
      // Arrange
      const mockSupabase = createMockSupabaseClient({ id: TEST_USER_ID })
      vi.mocked(createServerSupabaseClient).mockResolvedValue(mockSupabase as never)
      vi.mocked(getUserSessions).mockResolvedValue([])
      const request = createRequest("http://localhost/api/tracking/session", {
        method: "GET",
      })

      // Act
      const response = await sessionGET(request)
      const data = await parseResponse(response)

      // Assert
      expect(response.status).toBe(200)
      expect(data).toEqual([])
    })

    test("should return sessions array", async () => {
      // Arrange
      const mockSupabase = createMockSupabaseClient({ id: TEST_USER_ID })
      vi.mocked(createServerSupabaseClient).mockResolvedValue(mockSupabase as never)
      const mockSessions = [
        { id: "session-1", user_id: TEST_USER_ID },
        { id: "session-2", user_id: TEST_USER_ID },
      ]
      vi.mocked(getUserSessions).mockResolvedValue(mockSessions as never)
      const request = createRequest("http://localhost/api/tracking/session", {
        method: "GET",
      })

      // Act
      const response = await sessionGET(request)
      const data = await parseResponse(response)

      // Assert
      expect(response.status).toBe(200)
      expect(data).toHaveLength(2)
      expect(data[0].id).toBe("session-1")
    })
  })

  describe("error handling", () => {
    test("should return 500 when service throws", async () => {
      // Arrange
      const mockSupabase = createMockSupabaseClient({ id: TEST_USER_ID })
      vi.mocked(createServerSupabaseClient).mockResolvedValue(mockSupabase as never)
      vi.mocked(getUserSessions).mockRejectedValue(new Error("Database error"))
      const request = createRequest("http://localhost/api/tracking/session", {
        method: "GET",
      })

      // Act
      const response = await sessionGET(request)
      const data = await parseResponse(response)

      // Assert
      expect(response.status).toBe(500)
      expect(data.error).toBe("Failed to get sessions")
    })
  })
})

// ============================================================================
// Approach Route - POST
// ============================================================================

describe("POST /api/tracking/approach", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe("authentication", () => {
    test("should return 401 when user is not authenticated", async () => {
      // Arrange
      const mockSupabase = createMockSupabaseClient(null)
      vi.mocked(createServerSupabaseClient).mockResolvedValue(mockSupabase as never)
      const request = createRequest("http://localhost/api/tracking/approach", {
        method: "POST",
        body: {},
      })

      // Act
      const response = await approachPOST(request)
      const data = await parseResponse(response)

      // Assert
      expect(response.status).toBe(401)
      expect(data.error).toBe("Unauthorized")
    })
  })

  describe("validation", () => {
    test("should return 400 for invalid outcome value", async () => {
      // Arrange
      const mockSupabase = createMockSupabaseClient({ id: TEST_USER_ID })
      vi.mocked(createServerSupabaseClient).mockResolvedValue(mockSupabase as never)
      const request = createRequest("http://localhost/api/tracking/approach", {
        method: "POST",
        body: { outcome: "invalid_outcome" },
      })

      // Act
      const response = await approachPOST(request)
      const data = await parseResponse(response)

      // Assert
      expect(response.status).toBe(400)
      expect(data.error).toBe("Invalid request body")
    })

    test("should return 400 for invalid set_type value", async () => {
      // Arrange
      const mockSupabase = createMockSupabaseClient({ id: TEST_USER_ID })
      vi.mocked(createServerSupabaseClient).mockResolvedValue(mockSupabase as never)
      const request = createRequest("http://localhost/api/tracking/approach", {
        method: "POST",
        body: { set_type: "invalid_type" },
      })

      // Act
      const response = await approachPOST(request)
      const data = await parseResponse(response)

      // Assert
      expect(response.status).toBe(400)
      expect(data.error).toBe("Invalid request body")
    })

    test("should return 400 for invalid mood value", async () => {
      // Arrange
      const mockSupabase = createMockSupabaseClient({ id: TEST_USER_ID })
      vi.mocked(createServerSupabaseClient).mockResolvedValue(mockSupabase as never)
      const request = createRequest("http://localhost/api/tracking/approach", {
        method: "POST",
        body: { mood: 6 }, // Invalid: max is 5
      })

      // Act
      const response = await approachPOST(request)
      const data = await parseResponse(response)

      // Assert
      expect(response.status).toBe(400)
      expect(data.error).toBe("Invalid request body")
    })

    test("should return 400 for invalid session_id format", async () => {
      // Arrange
      const mockSupabase = createMockSupabaseClient({ id: TEST_USER_ID })
      vi.mocked(createServerSupabaseClient).mockResolvedValue(mockSupabase as never)
      const request = createRequest("http://localhost/api/tracking/approach", {
        method: "POST",
        body: { session_id: "not-a-uuid" },
      })

      // Act
      const response = await approachPOST(request)
      const data = await parseResponse(response)

      // Assert
      expect(response.status).toBe(400)
      expect(data.error).toBe("Invalid request body")
    })
  })

  describe("happy path", () => {
    test("should create approach with minimal data", async () => {
      // Arrange
      const mockSupabase = createMockSupabaseClient({ id: TEST_USER_ID })
      vi.mocked(createServerSupabaseClient).mockResolvedValue(mockSupabase as never)
      const mockApproach = {
        id: TEST_APPROACH_ID,
        user_id: TEST_USER_ID,
        created_at: "2026-01-31T12:00:00Z",
      }
      vi.mocked(createApproach).mockResolvedValue(mockApproach as never)
      const request = createRequest("http://localhost/api/tracking/approach", {
        method: "POST",
        body: {},
      })

      // Act
      const response = await approachPOST(request)
      const data = await parseResponse(response)

      // Assert
      expect(response.status).toBe(200)
      expect(data.id).toBe(TEST_APPROACH_ID)
      expect(createApproach).toHaveBeenCalledWith(
        expect.objectContaining({ user_id: TEST_USER_ID })
      )
    })

    test("should create approach with all optional fields", async () => {
      // Arrange
      const mockSupabase = createMockSupabaseClient({ id: TEST_USER_ID })
      vi.mocked(createServerSupabaseClient).mockResolvedValue(mockSupabase as never)
      const validUuid = "123e4567-e89b-12d3-a456-426614174000"
      const mockApproach = {
        id: TEST_APPROACH_ID,
        user_id: TEST_USER_ID,
        session_id: validUuid,
        outcome: "number",
        set_type: "solo",
        tags: ["day", "street"],
        mood: 4,
        note: "Great interaction",
        latitude: 55.6761,
        longitude: 12.5683,
      }
      vi.mocked(createApproach).mockResolvedValue(mockApproach as never)
      const request = createRequest("http://localhost/api/tracking/approach", {
        method: "POST",
        body: {
          session_id: validUuid,
          outcome: "number",
          set_type: "solo",
          tags: ["day", "street"],
          mood: 4,
          note: "Great interaction",
          latitude: 55.6761,
          longitude: 12.5683,
        },
      })

      // Act
      const response = await approachPOST(request)
      const data = await parseResponse(response)

      // Assert
      expect(response.status).toBe(200)
      expect(data.outcome).toBe("number")
      expect(createApproach).toHaveBeenCalledWith(
        expect.objectContaining({
          user_id: TEST_USER_ID,
          session_id: validUuid,
          outcome: "number",
          set_type: "solo",
        })
      )
    })

    test("should accept valid outcome values", async () => {
      // Arrange
      const mockSupabase = createMockSupabaseClient({ id: TEST_USER_ID })
      vi.mocked(createServerSupabaseClient).mockResolvedValue(mockSupabase as never)
      const mockApproach = { id: TEST_APPROACH_ID, user_id: TEST_USER_ID, outcome: "instadate" }
      vi.mocked(createApproach).mockResolvedValue(mockApproach as never)
      const request = createRequest("http://localhost/api/tracking/approach", {
        method: "POST",
        body: { outcome: "instadate" },
      })

      // Act
      const response = await approachPOST(request)

      // Assert
      expect(response.status).toBe(200)
    })
  })

  describe("error handling", () => {
    test("should return 500 when service throws", async () => {
      // Arrange
      const mockSupabase = createMockSupabaseClient({ id: TEST_USER_ID })
      vi.mocked(createServerSupabaseClient).mockResolvedValue(mockSupabase as never)
      vi.mocked(createApproach).mockRejectedValue(new Error("Database error"))
      const request = createRequest("http://localhost/api/tracking/approach", {
        method: "POST",
        body: {},
      })

      // Act
      const response = await approachPOST(request)
      const data = await parseResponse(response)

      // Assert
      expect(response.status).toBe(500)
      expect(data.error).toBe("Failed to create approach")
    })
  })
})

// ============================================================================
// Approach Route - GET
// ============================================================================

describe("GET /api/tracking/approach", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe("authentication", () => {
    test("should return 401 when user is not authenticated", async () => {
      // Arrange
      const mockSupabase = createMockSupabaseClient(null)
      vi.mocked(createServerSupabaseClient).mockResolvedValue(mockSupabase as never)
      const request = createRequest("http://localhost/api/tracking/approach", {
        method: "GET",
      })

      // Act
      const response = await approachGET(request)
      const data = await parseResponse(response)

      // Assert
      expect(response.status).toBe(401)
      expect(data.error).toBe("Unauthorized")
    })
  })

  describe("query parameters", () => {
    test("should use default limit and offset", async () => {
      // Arrange
      const mockSupabase = createMockSupabaseClient({ id: TEST_USER_ID })
      vi.mocked(createServerSupabaseClient).mockResolvedValue(mockSupabase as never)
      vi.mocked(getUserApproaches).mockResolvedValue([])
      const request = createRequest("http://localhost/api/tracking/approach", {
        method: "GET",
      })

      // Act
      await approachGET(request)

      // Assert
      expect(getUserApproaches).toHaveBeenCalledWith(TEST_USER_ID, 50, 0)
    })

    test("should parse custom limit and offset", async () => {
      // Arrange
      const mockSupabase = createMockSupabaseClient({ id: TEST_USER_ID })
      vi.mocked(createServerSupabaseClient).mockResolvedValue(mockSupabase as never)
      vi.mocked(getUserApproaches).mockResolvedValue([])
      const request = createRequest(
        "http://localhost/api/tracking/approach?limit=100&offset=25",
        { method: "GET" }
      )

      // Act
      await approachGET(request)

      // Assert
      expect(getUserApproaches).toHaveBeenCalledWith(TEST_USER_ID, 100, 25)
    })
  })

  describe("happy path", () => {
    test("should return empty array when no approaches", async () => {
      // Arrange
      const mockSupabase = createMockSupabaseClient({ id: TEST_USER_ID })
      vi.mocked(createServerSupabaseClient).mockResolvedValue(mockSupabase as never)
      vi.mocked(getUserApproaches).mockResolvedValue([])
      const request = createRequest("http://localhost/api/tracking/approach", {
        method: "GET",
      })

      // Act
      const response = await approachGET(request)
      const data = await parseResponse(response)

      // Assert
      expect(response.status).toBe(200)
      expect(data).toEqual([])
    })

    test("should return approaches array", async () => {
      // Arrange
      const mockSupabase = createMockSupabaseClient({ id: TEST_USER_ID })
      vi.mocked(createServerSupabaseClient).mockResolvedValue(mockSupabase as never)
      const mockApproaches = [
        { id: "approach-1", user_id: TEST_USER_ID, outcome: "number" },
        { id: "approach-2", user_id: TEST_USER_ID, outcome: "blowout" },
      ]
      vi.mocked(getUserApproaches).mockResolvedValue(mockApproaches as never)
      const request = createRequest("http://localhost/api/tracking/approach", {
        method: "GET",
      })

      // Act
      const response = await approachGET(request)
      const data = await parseResponse(response)

      // Assert
      expect(response.status).toBe(200)
      expect(data).toHaveLength(2)
      expect(data[0].outcome).toBe("number")
    })
  })

  describe("error handling", () => {
    test("should return 500 when service throws", async () => {
      // Arrange
      const mockSupabase = createMockSupabaseClient({ id: TEST_USER_ID })
      vi.mocked(createServerSupabaseClient).mockResolvedValue(mockSupabase as never)
      vi.mocked(getUserApproaches).mockRejectedValue(new Error("Database error"))
      const request = createRequest("http://localhost/api/tracking/approach", {
        method: "GET",
      })

      // Act
      const response = await approachGET(request)
      const data = await parseResponse(response)

      // Assert
      expect(response.status).toBe(500)
      expect(data.error).toBe("Failed to get approaches")
    })
  })
})

// ============================================================================
// Approach [id] Route - PATCH
// ============================================================================

describe("PATCH /api/tracking/approach/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe("authentication", () => {
    test("should return 401 when user is not authenticated", async () => {
      // Arrange
      const mockSupabase = createMockSupabaseClient(null)
      vi.mocked(createServerSupabaseClient).mockResolvedValue(mockSupabase as never)
      const request = createRequest(
        `http://localhost/api/tracking/approach/${TEST_APPROACH_ID}`,
        { method: "PATCH", body: {} }
      )

      // Act
      const response = await approachPATCH(request, {
        params: Promise.resolve({ id: TEST_APPROACH_ID }),
      })
      const data = await parseResponse(response)

      // Assert
      expect(response.status).toBe(401)
      expect(data.error).toBe("Unauthorized")
    })
  })

  describe("authorization", () => {
    test("should return 404 when approach does not exist", async () => {
      // Arrange
      const mockSupabase = createMockSupabaseClient({ id: TEST_USER_ID })
      vi.mocked(createServerSupabaseClient).mockResolvedValue(mockSupabase as never)
      vi.mocked(getApproachOwner).mockResolvedValue(null)
      const request = createRequest(
        `http://localhost/api/tracking/approach/${TEST_APPROACH_ID}`,
        { method: "PATCH", body: { outcome: "number" } }
      )

      // Act
      const response = await approachPATCH(request, {
        params: Promise.resolve({ id: TEST_APPROACH_ID }),
      })
      const data = await parseResponse(response)

      // Assert
      expect(response.status).toBe(404)
      expect(data.error).toBe("Approach not found")
    })

    test("should return 403 when user does not own approach", async () => {
      // Arrange
      const mockSupabase = createMockSupabaseClient({ id: TEST_USER_ID })
      vi.mocked(createServerSupabaseClient).mockResolvedValue(mockSupabase as never)
      vi.mocked(getApproachOwner).mockResolvedValue("other-user-id")
      const request = createRequest(
        `http://localhost/api/tracking/approach/${TEST_APPROACH_ID}`,
        { method: "PATCH", body: { outcome: "number" } }
      )

      // Act
      const response = await approachPATCH(request, {
        params: Promise.resolve({ id: TEST_APPROACH_ID }),
      })
      const data = await parseResponse(response)

      // Assert
      expect(response.status).toBe(403)
      expect(data.error).toBe("Forbidden")
    })
  })

  describe("validation", () => {
    test("should return 400 for invalid outcome value", async () => {
      // Arrange
      const mockSupabase = createMockSupabaseClient({ id: TEST_USER_ID })
      vi.mocked(createServerSupabaseClient).mockResolvedValue(mockSupabase as never)
      vi.mocked(getApproachOwner).mockResolvedValue(TEST_USER_ID)
      const request = createRequest(
        `http://localhost/api/tracking/approach/${TEST_APPROACH_ID}`,
        { method: "PATCH", body: { outcome: "invalid_outcome" } }
      )

      // Act
      const response = await approachPATCH(request, {
        params: Promise.resolve({ id: TEST_APPROACH_ID }),
      })
      const data = await parseResponse(response)

      // Assert
      expect(response.status).toBe(400)
      expect(data.error).toBe("Invalid request body")
    })

    test("should return 400 for invalid mood value", async () => {
      // Arrange
      const mockSupabase = createMockSupabaseClient({ id: TEST_USER_ID })
      vi.mocked(createServerSupabaseClient).mockResolvedValue(mockSupabase as never)
      vi.mocked(getApproachOwner).mockResolvedValue(TEST_USER_ID)
      const request = createRequest(
        `http://localhost/api/tracking/approach/${TEST_APPROACH_ID}`,
        { method: "PATCH", body: { mood: 0 } } // Invalid: min is 1
      )

      // Act
      const response = await approachPATCH(request, {
        params: Promise.resolve({ id: TEST_APPROACH_ID }),
      })
      const data = await parseResponse(response)

      // Assert
      expect(response.status).toBe(400)
      expect(data.error).toBe("Invalid request body")
    })
  })

  describe("happy path", () => {
    test("should update approach with single field", async () => {
      // Arrange
      const mockSupabase = createMockSupabaseClient({ id: TEST_USER_ID })
      vi.mocked(createServerSupabaseClient).mockResolvedValue(mockSupabase as never)
      vi.mocked(getApproachOwner).mockResolvedValue(TEST_USER_ID)
      const mockUpdated = {
        id: TEST_APPROACH_ID,
        user_id: TEST_USER_ID,
        outcome: "good",
      }
      vi.mocked(updateApproach).mockResolvedValue(mockUpdated as never)
      const request = createRequest(
        `http://localhost/api/tracking/approach/${TEST_APPROACH_ID}`,
        { method: "PATCH", body: { outcome: "good" } }
      )

      // Act
      const response = await approachPATCH(request, {
        params: Promise.resolve({ id: TEST_APPROACH_ID }),
      })
      const data = await parseResponse(response)

      // Assert
      expect(response.status).toBe(200)
      expect(data.outcome).toBe("good")
      expect(updateApproach).toHaveBeenCalledWith(
        TEST_APPROACH_ID,
        expect.objectContaining({ outcome: "good" })
      )
    })

    test("should update approach with multiple fields", async () => {
      // Arrange
      const mockSupabase = createMockSupabaseClient({ id: TEST_USER_ID })
      vi.mocked(createServerSupabaseClient).mockResolvedValue(mockSupabase as never)
      vi.mocked(getApproachOwner).mockResolvedValue(TEST_USER_ID)
      const mockUpdated = {
        id: TEST_APPROACH_ID,
        user_id: TEST_USER_ID,
        outcome: "number",
        mood: 4,
        note: "Updated note",
        tags: ["coffee", "day"],
      }
      vi.mocked(updateApproach).mockResolvedValue(mockUpdated as never)
      const request = createRequest(
        `http://localhost/api/tracking/approach/${TEST_APPROACH_ID}`,
        {
          method: "PATCH",
          body: {
            outcome: "number",
            mood: 4,
            note: "Updated note",
            tags: ["coffee", "day"],
          },
        }
      )

      // Act
      const response = await approachPATCH(request, {
        params: Promise.resolve({ id: TEST_APPROACH_ID }),
      })
      const data = await parseResponse(response)

      // Assert
      expect(response.status).toBe(200)
      expect(data.mood).toBe(4)
      expect(data.note).toBe("Updated note")
    })

    test("should update approach with only note field", async () => {
      // Arrange
      const mockSupabase = createMockSupabaseClient({ id: TEST_USER_ID })
      vi.mocked(createServerSupabaseClient).mockResolvedValue(mockSupabase as never)
      vi.mocked(getApproachOwner).mockResolvedValue(TEST_USER_ID)
      const mockUpdated = { id: TEST_APPROACH_ID, user_id: TEST_USER_ID, note: "Some note" }
      vi.mocked(updateApproach).mockResolvedValue(mockUpdated as never)
      const request = createRequest(
        `http://localhost/api/tracking/approach/${TEST_APPROACH_ID}`,
        { method: "PATCH", body: { note: "Some note" } }
      )

      // Act
      const response = await approachPATCH(request, {
        params: Promise.resolve({ id: TEST_APPROACH_ID }),
      })

      // Assert
      expect(response.status).toBe(200)
    })

    test("should accept all valid set_type values", async () => {
      // Arrange
      const mockSupabase = createMockSupabaseClient({ id: TEST_USER_ID })
      vi.mocked(createServerSupabaseClient).mockResolvedValue(mockSupabase as never)
      vi.mocked(getApproachOwner).mockResolvedValue(TEST_USER_ID)
      const mockUpdated = { id: TEST_APPROACH_ID, set_type: "two_set" }
      vi.mocked(updateApproach).mockResolvedValue(mockUpdated as never)
      const request = createRequest(
        `http://localhost/api/tracking/approach/${TEST_APPROACH_ID}`,
        { method: "PATCH", body: { set_type: "two_set" } }
      )

      // Act
      const response = await approachPATCH(request, {
        params: Promise.resolve({ id: TEST_APPROACH_ID }),
      })

      // Assert
      expect(response.status).toBe(200)
    })
  })

  describe("error handling", () => {
    test("should return 500 when service throws", async () => {
      // Arrange
      const mockSupabase = createMockSupabaseClient({ id: TEST_USER_ID })
      vi.mocked(createServerSupabaseClient).mockResolvedValue(mockSupabase as never)
      vi.mocked(getApproachOwner).mockResolvedValue(TEST_USER_ID)
      vi.mocked(updateApproach).mockRejectedValue(new Error("Database error"))
      const request = createRequest(
        `http://localhost/api/tracking/approach/${TEST_APPROACH_ID}`,
        { method: "PATCH", body: { outcome: "number" } }
      )

      // Act
      const response = await approachPATCH(request, {
        params: Promise.resolve({ id: TEST_APPROACH_ID }),
      })
      const data = await parseResponse(response)

      // Assert
      expect(response.status).toBe(500)
      expect(data.error).toBe("Failed to update approach")
    })
  })
})
