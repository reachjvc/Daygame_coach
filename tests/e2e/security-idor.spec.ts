import { test, expect } from '@playwright/test'
import {
  ensureNoActiveSessionViaAPI,
  createTestSessionViaAPI,
  createTestApproachViaAPI,
} from './helpers/auth.helper'
import { validateSecondUserConfig } from './fixtures/test-user'

const USER_A_STATE = 'tests/e2e/.auth/user.json'
const USER_B_STATE = 'tests/e2e/.auth/user-b.json'

/**
 * Security E2E Tests: IDOR (Insecure Direct Object Reference) Protection
 *
 * Verifies that users cannot access or modify resources by guessing IDs.
 * Tests run against real Supabase to verify RLS policies work correctly.
 *
 * IMPORTANT: These tests require two separate test users configured:
 * - TEST_USER_EMAIL / TEST_USER_PASSWORD (User A)
 * - TEST_USER_B_EMAIL / TEST_USER_B_PASSWORD (User B)
 */

const AUTH_TIMEOUT = 15000

test.describe('Security: IDOR Protection', () => {
  // Run tests serially to avoid session conflicts
  test.describe.configure({ mode: 'serial' })

  // Check if second user is configured
  const hasSecondUser = (): boolean => {
    try {
      validateSecondUserConfig()
      return true
    } catch {
      return false
    }
  }

  test('User B cannot GET User A session by ID', async ({ browser }) => {
    test.skip(!hasSecondUser(), 'TEST_USER_B credentials not configured')

    // Arrange: Create two separate browser contexts with saved auth state
    const contextA = await browser.newContext({ storageState: USER_A_STATE })
    const contextB = await browser.newContext({ storageState: USER_B_STATE })
    const pageA = await contextA.newPage()
    const pageB = await contextB.newPage()

    try {
      // Arrange: User A creates a session
      const sessionId = await createTestSessionViaAPI(pageA, 'IDOR Test Location')

      // Act: User B tries to access User A's session by ID
      const idor_response = await pageB.request.get(`/api/tracking/session/${sessionId}`)

      // Assert: User B should NOT be able to see User A's session
      // Should get 404 (RLS hides it) or 403 (forbidden)
      expect([403, 404]).toContain(idor_response.status())
    } finally {
      // Cleanup: End User A's session
      await ensureNoActiveSessionViaAPI(pageA)
      await contextA.close()
      await contextB.close()
    }
  })

  test('User B cannot DELETE User A approach by ID', async ({ browser }) => {
    test.skip(!hasSecondUser(), 'TEST_USER_B credentials not configured')

    // Arrange: Create two separate browser contexts with saved auth state
    const contextA = await browser.newContext({ storageState: USER_A_STATE })
    const contextB = await browser.newContext({ storageState: USER_B_STATE })
    const pageA = await contextA.newPage()
    const pageB = await contextB.newPage()

    try {
      // Arrange: User A creates a session with an approach
      const sessionId = await createTestSessionViaAPI(pageA, 'IDOR Approach Test')
      const approachId = await createTestApproachViaAPI(pageA, sessionId, 'short')

      // Act: User B tries to delete User A's approach
      const deleteResponse = await pageB.request.delete(`/api/tracking/approach/${approachId}`)

      // Assert: User B should NOT be able to delete User A's approach
      expect([403, 404, 405]).toContain(deleteResponse.status())

      // Verify: User A's approach still exists
      const verifyResponse = await pageA.request.get(`/api/tracking/session/${sessionId}`)
      if (verifyResponse.ok()) {
        const sessionData = await verifyResponse.json()
        if (sessionData.approaches) {
          const approachStillExists = sessionData.approaches.some(
            (a: { id: string }) => a.id === approachId
          )
          expect(approachStillExists).toBe(true)
        }
      }
    } finally {
      // Cleanup: End User A's session
      await ensureNoActiveSessionViaAPI(pageA)
      await contextA.close()
      await contextB.close()
    }
  })

  test('User B cannot PUT/UPDATE User A session by ID', async ({ browser }) => {
    test.skip(!hasSecondUser(), 'TEST_USER_B credentials not configured')

    // Arrange: Create two separate browser contexts with saved auth state
    const contextA = await browser.newContext({ storageState: USER_A_STATE })
    const contextB = await browser.newContext({ storageState: USER_B_STATE })
    const pageA = await contextA.newPage()
    const pageB = await contextB.newPage()

    const originalLocation = 'IDOR Update Test'

    try {
      // Arrange: User A creates a session
      const sessionId = await createTestSessionViaAPI(pageA, originalLocation)

      // Act: User B tries to update User A's session
      const updateResponse = await pageB.request.put(`/api/tracking/session/${sessionId}`, {
        data: { location: 'HACKED BY USER B' },
      })

      // Assert: User B should NOT be able to update User A's session
      expect([403, 404, 405]).toContain(updateResponse.status())

      // Verify: User A's session was NOT modified
      const verifyResponse = await pageA.request.get(`/api/tracking/session/${sessionId}`)
      if (verifyResponse.ok()) {
        const sessionData = await verifyResponse.json()
        expect(sessionData.location).not.toBe('HACKED BY USER B')
      }
    } finally {
      // Cleanup: End User A's session
      await ensureNoActiveSessionViaAPI(pageA)
      await contextA.close()
      await contextB.close()
    }
  })

  test('User B cannot end User A session by ID', async ({ browser }) => {
    test.skip(!hasSecondUser(), 'TEST_USER_B credentials not configured')

    // Arrange: Create two separate browser contexts with saved auth state
    const contextA = await browser.newContext({ storageState: USER_A_STATE })
    const contextB = await browser.newContext({ storageState: USER_B_STATE })
    const pageA = await contextA.newPage()
    const pageB = await contextB.newPage()

    try {
      // Arrange: User A creates a session
      const sessionId = await createTestSessionViaAPI(pageA, 'IDOR End Test')

      // Act: User B tries to end User A's session
      const endResponse = await pageB.request.post(`/api/tracking/session/${sessionId}/end`, {
        data: {},
      })

      // Assert: User B should NOT be able to end User A's session
      // 404 = RLS hides it, 403 = forbidden, 500 = server error on forbidden access
      expect([403, 404, 500]).toContain(endResponse.status())

      // Verify: User A's session is still active
      const stillActiveResponse = await pageA.request.get('/api/tracking/session/active')
      expect(stillActiveResponse.ok()).toBe(true)
    } finally {
      // Cleanup: End User A's session
      await ensureNoActiveSessionViaAPI(pageA)
      await contextA.close()
      await contextB.close()
    }
  })

  test('User B cannot access User A resources with random UUID', async ({ browser }) => {
    test.skip(!hasSecondUser(), 'TEST_USER_B credentials not configured')

    // Arrange: Create browser context for User B with saved auth state
    const contextB = await browser.newContext({ storageState: USER_B_STATE })
    const pageB = await contextB.newPage()

    try {

      // Act: Try to access resources with random UUIDs
      const randomUuid = '00000000-0000-0000-0000-000000000001'

      const sessionResponse = await pageB.request.get(`/api/tracking/session/${randomUuid}`)
      const approachResponse = await pageB.request.get(`/api/tracking/approach/${randomUuid}`)

      // Assert: Should get 404 for non-existent resources
      expect([404]).toContain(sessionResponse.status())
      expect([404, 405]).toContain(approachResponse.status()) // 405 if GET not implemented
    } finally {
      await contextB.close()
    }
  })

  test('User B cannot access User A progress by manipulating user_id', async ({ browser }) => {
    test.skip(!hasSecondUser(), 'TEST_USER_B credentials not configured')

    // Arrange: Create two separate browser contexts with saved auth state
    const contextA = await browser.newContext({ storageState: USER_A_STATE })
    const contextB = await browser.newContext({ storageState: USER_B_STATE })
    const pageA = await contextA.newPage()
    const pageB = await contextB.newPage()

    try {
      // Arrange: User A gets their progress
      const userAProgressResponse = await pageA.request.get('/api/inner-game/progress')

      // Get User A's user_id - if no progress exists, use a fake UUID to test IDOR anyway
      let userAId: string
      if (userAProgressResponse.ok()) {
        const userAProgress = await userAProgressResponse.json()
        userAId = userAProgress?.user_id || '00000000-0000-0000-0000-000000000001'
      } else {
        // Even without progress, we can test that User B can't access arbitrary user_ids
        userAId = '00000000-0000-0000-0000-000000000001'
      }

      // Act: User B tries to access User A's progress by ID

      // Try to get progress with User A's ID in query params
      const idorResponse = await pageB.request.get(`/api/inner-game/progress?user_id=${userAId}`)

      // Assert: User B should get their OWN progress, not User A's
      // The API should ignore the user_id param and return User B's data based on auth
      if (idorResponse.ok()) {
        const responseData = await idorResponse.json()
        // If data is returned with a user_id, it should NOT be User A's data
        if (responseData?.user_id) {
          expect(responseData.user_id).not.toBe(userAId)
        }
      }
      // 404 or error is also acceptable - means the param was ignored or rejected
    } finally {
      await contextA.close()
      await contextB.close()
    }
  })
})
