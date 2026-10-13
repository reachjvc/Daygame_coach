import { test, expect, SIGNED_OUT } from './fixtures/test'

/**
 * Security E2E Tests: Authentication Enforcement
 *
 * Verifies that all protected API endpoints properly reject unauthenticated requests,
 * from the app under test (playwright.config.ts's baseURL) on the local test backend.
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
  // Auth
  // Tells the login form where to send someone. Signed out it must say 401 and
  // nothing else -- a destination leaks whether an account has finished setup.
  { method: 'GET', path: '/api/auth/destination' },
  // Scenarios
  { method: 'POST', path: '/api/scenarios/openers/encounter' },
  { method: 'POST', path: '/api/scenarios/openers/evaluate' },
  { method: 'POST', path: '/api/scenarios/chat' },
  // Time tracker sync: both directions. Moved here from timetrack-sync.spec.ts,
  // which checked the same two calls in a browser of its own.
  { method: 'GET', path: '/api/timetrack/sync' },
  { method: 'POST', path: '/api/timetrack/sync' },
]

/**
 * Signed out. The `request` fixture takes the test's storage state, so without
 * this it would carry the worker's session and every endpoint would answer 200.
 * Paths only, never a host: the run's baseURL decides which server is asked.
 */
test.use({ storageState: SIGNED_OUT })

test.describe('Security: Authentication Enforcement', () => {
  test('all protected endpoints require authentication', async ({ request }) => {
    // Twenty-three routes, each compiled on first request by `next dev`
    test.setTimeout(180_000)
    const failures: string[] = []
    for (const endpoint of PROTECTED_ENDPOINTS) {
      const response =
        endpoint.method === 'GET'
          ? await request.get(endpoint.path)
          : await request.post(endpoint.path, { data: {} })
      if (response.status() !== 401) failures.push(`${endpoint.method} ${endpoint.path}: got ${response.status()}`)
    }
    expect(failures, 'these endpoints answer a request that carries no session').toEqual([])
  })

  test('a made-up bearer token is not a session', async ({ request }) => {
    for (const authorization of ['Bearer invalid-garbage-token-12345', 'some-token-without-bearer-prefix']) {
      const response = await request.get('/api/tracking/sessions', { headers: { Authorization: authorization } })
      expect(response.status(), authorization).toBe(401)
    }
  })
})
