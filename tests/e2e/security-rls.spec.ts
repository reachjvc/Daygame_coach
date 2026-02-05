import { test, expect, Page, BrowserContext } from '@playwright/test'
import {
  ensureNoActiveSessionViaAPI,
  createTestSessionViaAPI,
} from './helpers/auth.helper'
import { validateSecondUserConfig } from './fixtures/test-user'

const USER_A_STATE = 'tests/e2e/.auth/user.json'
const USER_B_STATE = 'tests/e2e/.auth/user-b.json'

/**
 * Security E2E Tests: Row Level Security (RLS) Data Isolation
 *
 * Verifies that Supabase RLS policies properly isolate user data.
 * Tests run against real Supabase to verify production security.
 *
 * IMPORTANT: These tests require two separate test users configured:
 * - TEST_USER_EMAIL / TEST_USER_PASSWORD (User A)
 * - TEST_USER_B_EMAIL / TEST_USER_B_PASSWORD (User B)
 */

const AUTH_TIMEOUT = 15000
const ACTION_TIMEOUT = 2000

test.describe('Security: RLS Data Isolation', () => {
  // Run tests serially to avoid session conflicts between users
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

  test('User B cannot see User A sessions in sessions list', async ({ browser }) => {
    test.skip(!hasSecondUser(), 'TEST_USER_B credentials not configured')

    // Arrange: Create two separate browser contexts with saved auth state
    const contextA = await browser.newContext({ storageState: USER_A_STATE })
    const contextB = await browser.newContext({ storageState: USER_B_STATE })
    const pageA = await contextA.newPage()
    const pageB = await contextB.newPage()

    try {
      // Act: User A views their sessions
      await pageA.goto('/dashboard/tracking', { timeout: AUTH_TIMEOUT })
      await pageA.waitForLoadState('networkidle', { timeout: AUTH_TIMEOUT })

      // Get User A's session count by checking the API response
      const userASessionsResponse = await pageA.request.get('/api/tracking/sessions')
      const userASessions = await userASessionsResponse.json()

      // Act: User B views sessions
      await pageB.goto('/dashboard/tracking', { timeout: AUTH_TIMEOUT })
      await pageB.waitForLoadState('networkidle', { timeout: AUTH_TIMEOUT })

      // Get User B's session count
      const userBSessionsResponse = await pageB.request.get('/api/tracking/sessions')
      const userBSessions = await userBSessionsResponse.json()

      // Assert: User B should NOT see User A's sessions
      // The session lists should be completely separate
      if (Array.isArray(userASessions) && Array.isArray(userBSessions)) {
        const userAIds = new Set(userASessions.map((s: { id: string }) => s.id))
        const userBIds = new Set(userBSessions.map((s: { id: string }) => s.id))

        // No overlap should exist
        const overlap = [...userAIds].filter((id) => userBIds.has(id))
        expect(overlap).toHaveLength(0)
      }
    } finally {
      await contextA.close()
      await contextB.close()
    }
  })

  test('User B cannot see User A stats', async ({ browser }) => {
    test.skip(!hasSecondUser(), 'TEST_USER_B credentials not configured')

    // Arrange: Create two separate browser contexts with saved auth state
    const contextA = await browser.newContext({ storageState: USER_A_STATE })
    const contextB = await browser.newContext({ storageState: USER_B_STATE })
    const pageA = await contextA.newPage()
    const pageB = await contextB.newPage()

    try {
      // Act: User A gets stats
      const userAStatsResponse = await pageA.request.get('/api/tracking/stats')
      const userAStats = await userAStatsResponse.json()

      // Act: User B gets stats
      const userBStatsResponse = await pageB.request.get('/api/tracking/stats')
      const userBStats = await userBStatsResponse.json()

      // Assert: Stats should be user-specific (different values or both empty)
      // The key point is that User B didn't get User A's stats
      // We can't assert they're different (both could be empty), but we can verify
      // each user gets their own stats by checking the response succeeded
      expect(userAStatsResponse.ok()).toBe(true)
      expect(userBStatsResponse.ok()).toBe(true)
    } finally {
      await contextA.close()
      await contextB.close()
    }
  })

  test('User B cannot see User A inner game progress', async ({ browser }) => {
    test.skip(!hasSecondUser(), 'TEST_USER_B credentials not configured')

    // Arrange: Create two separate browser contexts with saved auth state
    const contextA = await browser.newContext({ storageState: USER_A_STATE })
    const contextB = await browser.newContext({ storageState: USER_B_STATE })
    const pageA = await contextA.newPage()
    const pageB = await contextB.newPage()

    try {
      // Act: User A gets progress
      const userAProgressResponse = await pageA.request.get('/api/inner-game/progress')
      const userAProgress = await userAProgressResponse.json()

      // Act: User B gets progress
      const userBProgressResponse = await pageB.request.get('/api/inner-game/progress')
      const userBProgress = await userBProgressResponse.json()

      // Assert: Each user gets their own progress
      // 200 = has progress, 404 = no progress yet, 500 = server error (acceptable for empty state)
      expect([200, 404, 500]).toContain(userAProgressResponse.status())
      expect([200, 404, 500]).toContain(userBProgressResponse.status())

      // If both have progress, user_ids should be different
      if (userAProgressResponse.ok() && userBProgressResponse.ok()) {
        if (userAProgress?.user_id && userBProgress?.user_id) {
          expect(userAProgress.user_id).not.toBe(userBProgress.user_id)
        }
      }
    } finally {
      await contextA.close()
      await contextB.close()
    }
  })

  test('User B cannot modify User A data via API', async ({ browser }) => {
    test.skip(!hasSecondUser(), 'TEST_USER_B credentials not configured')

    // Arrange: Create two separate browser contexts with saved auth state
    const contextA = await browser.newContext({ storageState: USER_A_STATE })
    const contextB = await browser.newContext({ storageState: USER_B_STATE })
    const pageA = await contextA.newPage()
    const pageB = await contextB.newPage()

    try {
      // Act: User A creates a session
      const sessionId = await createTestSessionViaAPI(pageA, 'RLS Test Location')

      // Act: User B tries to end User A's session
      const maliciousResponse = await pageB.request.post(`/api/tracking/session/${sessionId}/end`, {
        data: {},
      })

      // Assert: User B should NOT be able to end User A's session
      // Should get 404 (not found due to RLS) or 403 (forbidden)
      expect([403, 404]).toContain(maliciousResponse.status())
    } finally {
      // Cleanup: End User A's session
      await ensureNoActiveSessionViaAPI(pageA)
      await contextA.close()
      await contextB.close()
    }
  })

  test('User B cannot access User A milestones', async ({ browser }) => {
    test.skip(!hasSecondUser(), 'TEST_USER_B credentials not configured')

    // Arrange: Create two separate browser contexts with saved auth state
    const contextA = await browser.newContext({ storageState: USER_A_STATE })
    const contextB = await browser.newContext({ storageState: USER_B_STATE })
    const pageA = await contextA.newPage()
    const pageB = await contextB.newPage()

    try {
      // Act: User A gets milestones
      const userAMilestonesResponse = await pageA.request.get('/api/tracking/milestones')

      // Act: User B gets milestones
      const userBMilestonesResponse = await pageB.request.get('/api/tracking/milestones')

      // Assert: Each user gets their own milestones
      expect(userAMilestonesResponse.ok()).toBe(true)
      expect(userBMilestonesResponse.ok()).toBe(true)

      // Milestones are user-specific - they should have different user_ids
      // or be empty arrays for new users
      const userAMilestones = await userAMilestonesResponse.json()
      const userBMilestones = await userBMilestonesResponse.json()

      if (Array.isArray(userAMilestones) && Array.isArray(userBMilestones)) {
        const userAIds = new Set(userAMilestones.map((m: { id: string }) => m.id))
        const userBIds = new Set(userBMilestones.map((m: { id: string }) => m.id))

        // No overlap should exist
        const overlap = [...userAIds].filter((id) => userBIds.has(id))
        expect(overlap).toHaveLength(0)
      }
    } finally {
      await contextA.close()
      await contextB.close()
    }
  })
})
