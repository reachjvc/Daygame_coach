import { test, expect, APIRequestContext } from '@playwright/test'

/**
 * Security E2E Tests: Authentication Enforcement
 *
 * Verifies that all protected API endpoints properly reject unauthenticated requests.
 * These tests run against real Supabase to verify production security.
 */

// API endpoints that require authentication
const PROTECTED_ENDPOINTS = [
  // Tracking
  { method: 'GET', path: '/api/tracking/sessions' },
  { method: 'GET', path: '/api/tracking/session/active' },
  { method: 'POST', path: '/api/tracking/session' },
  { method: 'POST', path: '/api/tracking/approach' },
  { method: 'GET', path: '/api/tracking/stats' },
  { method: 'GET', path: '/api/tracking/stats/daily' },
  { method: 'GET', path: '/api/tracking/milestones' },
  { method: 'POST', path: '/api/tracking/field-report' },
  { method: 'POST', path: '/api/tracking/review' },
  { method: 'GET', path: '/api/tracking/templates/field-report' },
  { method: 'GET', path: '/api/tracking/templates/review' },
  // Inner game
  { method: 'GET', path: '/api/inner-game/progress' },
  { method: 'POST', path: '/api/inner-game/progress' },
  { method: 'POST', path: '/api/inner-game/values' },
  { method: 'POST', path: '/api/inner-game/comparisons' },
  { method: 'POST', path: '/api/inner-game/infer-values' },
  // Q&A
  { method: 'POST', path: '/api/qa' },
  // Scenarios
  { method: 'POST', path: '/api/scenarios/openers/encounter' },
  { method: 'POST', path: '/api/scenarios/openers/evaluate' },
  { method: 'POST', path: '/api/scenarios/chat' },
]

test.describe('Security: Authentication Enforcement', () => {
  let request: APIRequestContext

  test.beforeAll(async ({ playwright }) => {
    // Arrange: Create a standalone request context without browser auth
    request = await playwright.request.newContext({
      baseURL: 'http://localhost:3000',
    })
  })

  test.afterAll(async () => {
    await request.dispose()
  })

  test('API rejects unauthenticated GET request to /api/tracking/sessions', async () => {
    // Act: Call API without authentication
    const response = await request.get('/api/tracking/sessions')

    // Assert: Should return 401 Unauthorized
    expect(response.status()).toBe(401)
    const body = await response.json()
    expect(body.error).toBeDefined()
  })

  test('API rejects unauthenticated POST request to /api/tracking/session', async () => {
    // Act: Call API without authentication
    const response = await request.post('/api/tracking/session', {
      data: { goal: 5, location: 'test' },
    })

    // Assert: Should return 401 Unauthorized
    expect(response.status()).toBe(401)
  })

  test('API rejects request with invalid authorization header', async () => {
    // Arrange: Create request with garbage token
    const invalidTokenRequest = await request.fetch('/api/tracking/sessions', {
      headers: {
        Authorization: 'Bearer invalid-garbage-token-12345',
      },
    })

    // Assert: Should return 401 Unauthorized
    expect(invalidTokenRequest.status()).toBe(401)
  })

  test('API rejects request with malformed authorization header', async () => {
    // Arrange: Create request with malformed header (no Bearer prefix)
    const response = await request.fetch('/api/tracking/sessions', {
      headers: {
        Authorization: 'some-token-without-bearer-prefix',
      },
    })

    // Assert: Should return 401 Unauthorized
    expect(response.status()).toBe(401)
  })

  test('all protected endpoints require authentication', async () => {
    // Act & Assert: Loop through all protected endpoints
    const results: { endpoint: string; status: number; passed: boolean }[] = []

    for (const endpoint of PROTECTED_ENDPOINTS) {
      const response =
        endpoint.method === 'GET'
          ? await request.get(endpoint.path)
          : await request.post(endpoint.path, { data: {} })

      const passed = response.status() === 401
      results.push({
        endpoint: `${endpoint.method} ${endpoint.path}`,
        status: response.status(),
        passed,
      })
    }

    // Report all failures
    const failures = results.filter((r) => !r.passed)
    if (failures.length > 0) {
      console.log('Endpoints missing auth enforcement:')
      failures.forEach((f) => console.log(`  ${f.endpoint}: got ${f.status}, expected 401`))
    }

    // Assert: All endpoints should return 401
    expect(failures).toHaveLength(0)
  })

  test('API returns proper error message on 401', async () => {
    // Act: Call API without authentication
    const response = await request.get('/api/tracking/sessions')

    // Assert: Should return proper error structure
    expect(response.status()).toBe(401)
    const body = await response.json()
    expect(body.error).toBe('Unauthorized')
  })
})
