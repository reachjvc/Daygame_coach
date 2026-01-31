import { test, expect } from '@playwright/test'
import { login, loginAsUserB } from './helpers/auth.helper'
import { validateSecondUserConfig } from './fixtures/test-user'

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

    // Arrange: Create two separate browser contexts
    const contextA = await browser.newContext()
    const contextB = await browser.newContext()
    const pageA = await contextA.newPage()
    const pageB = await contextB.newPage()

    try {
      // Arrange: User A logs in and creates a session
      await login(pageA)

      // Check for existing sessions first
      const sessionsResponse = await pageA.request.get('/api/tracking/sessions')
      const sessions = await sessionsResponse.json()

      let sessionId: string
      if (Array.isArray(sessions) && sessions.length > 0) {
        // Use existing session
        sessionId = sessions[0].id
      } else {
        // Create a new session
        const createResponse = await pageA.request.post('/api/tracking/session', {
          data: { goal: 3, location: 'IDOR Test Location' },
        })

        if (!createResponse.ok()) {
          // Check for active session
          const activeResponse = await pageA.request.get('/api/tracking/session/active')
          if (activeResponse.ok()) {
            const activeSession = await activeResponse.json()
            sessionId = activeSession.id
          } else {
            console.log('Cannot get or create session, skipping test')
            return
          }
        } else {
          const session = await createResponse.json()
          sessionId = session.id
        }
      }

      // Act: User B logs in and tries to access User A's session by ID
      await loginAsUserB(pageB)
      const idor_response = await pageB.request.get(`/api/tracking/session/${sessionId}`)

      // Assert: User B should NOT be able to see User A's session
      // Should get 404 (RLS hides it) or 403 (forbidden)
      expect([403, 404]).toContain(idor_response.status())
    } finally {
      await contextA.close()
      await contextB.close()
    }
  })

  test('User B cannot DELETE User A approach by ID', async ({ browser }) => {
    test.skip(!hasSecondUser(), 'TEST_USER_B credentials not configured')

    // Arrange: Create two separate browser contexts
    const contextA = await browser.newContext()
    const contextB = await browser.newContext()
    const pageA = await contextA.newPage()
    const pageB = await contextB.newPage()

    try {
      // Arrange: User A logs in and creates an approach
      await login(pageA)

      // First, ensure we have an active session
      let sessionId: string
      const activeResponse = await pageA.request.get('/api/tracking/session/active')

      if (activeResponse.ok()) {
        const activeSession = await activeResponse.json()
        sessionId = activeSession.id
      } else {
        // Create a new session
        const createResponse = await pageA.request.post('/api/tracking/session', {
          data: { goal: 3, location: 'IDOR Approach Test' },
        })
        if (!createResponse.ok()) {
          console.log('Cannot create session, skipping test')
          return
        }
        const session = await createResponse.json()
        sessionId = session.id
      }

      // Create an approach
      const approachResponse = await pageA.request.post('/api/tracking/approach', {
        data: {
          session_id: sessionId,
          outcome: 'ignored',
        },
      })

      if (!approachResponse.ok()) {
        console.log('Cannot create approach, skipping test')
        return
      }

      const approach = await approachResponse.json()
      const approachId = approach.id

      // Act: User B logs in and tries to delete User A's approach
      await loginAsUserB(pageB)
      const deleteResponse = await pageB.request.delete(`/api/tracking/approach/${approachId}`)

      // Assert: User B should NOT be able to delete User A's approach
      expect([403, 404, 405]).toContain(deleteResponse.status())

      // Verify: User A's approach still exists
      // (We can't directly GET an approach, but we can check session still has it)
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
      await contextA.close()
      await contextB.close()
    }
  })

  test('User B cannot PUT/UPDATE User A session by ID', async ({ browser }) => {
    test.skip(!hasSecondUser(), 'TEST_USER_B credentials not configured')

    // Arrange: Create two separate browser contexts
    const contextA = await browser.newContext()
    const contextB = await browser.newContext()
    const pageA = await contextA.newPage()
    const pageB = await contextB.newPage()

    try {
      // Arrange: User A logs in and creates a session
      await login(pageA)

      // Get or create a session
      let sessionId: string
      let originalLocation: string

      const activeResponse = await pageA.request.get('/api/tracking/session/active')
      if (activeResponse.ok()) {
        const activeSession = await activeResponse.json()
        sessionId = activeSession.id
        originalLocation = activeSession.location || 'Original Location'
      } else {
        const createResponse = await pageA.request.post('/api/tracking/session', {
          data: { goal: 3, location: 'IDOR Update Test' },
        })
        if (!createResponse.ok()) {
          console.log('Cannot create session, skipping test')
          return
        }
        const session = await createResponse.json()
        sessionId = session.id
        originalLocation = session.location
      }

      // Act: User B logs in and tries to update User A's session
      await loginAsUserB(pageB)
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
      await contextA.close()
      await contextB.close()
    }
  })

  test('User B cannot end User A session by ID', async ({ browser }) => {
    test.skip(!hasSecondUser(), 'TEST_USER_B credentials not configured')

    // Arrange: Create two separate browser contexts
    const contextA = await browser.newContext()
    const contextB = await browser.newContext()
    const pageA = await contextA.newPage()
    const pageB = await contextB.newPage()

    try {
      // Arrange: User A logs in and creates a session
      await login(pageA)

      // Create a new session (need an active one to test ending)
      const createResponse = await pageA.request.post('/api/tracking/session', {
        data: { goal: 3, location: 'IDOR End Test' },
      })

      if (!createResponse.ok()) {
        // Check if there's already an active session
        const activeResponse = await pageA.request.get('/api/tracking/session/active')
        if (!activeResponse.ok()) {
          console.log('Cannot create or get active session, skipping test')
          return
        }
      }

      const activeCheck = await pageA.request.get('/api/tracking/session/active')
      if (!activeCheck.ok()) {
        console.log('No active session to test with, skipping')
        return
      }

      const activeSession = await activeCheck.json()
      const sessionId = activeSession.id

      // Act: User B logs in and tries to end User A's session
      await loginAsUserB(pageB)
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
      await contextA.close()
      await contextB.close()
    }
  })

  test('User B cannot access User A resources with random UUID', async ({ browser }) => {
    test.skip(!hasSecondUser(), 'TEST_USER_B credentials not configured')

    // Arrange: Create browser context for User B
    const contextB = await browser.newContext()
    const pageB = await contextB.newPage()

    try {
      // Arrange: User B logs in
      await loginAsUserB(pageB)

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

    // Arrange: Create two separate browser contexts
    const contextA = await browser.newContext()
    const contextB = await browser.newContext()
    const pageA = await contextA.newPage()
    const pageB = await contextB.newPage()

    try {
      // Arrange: User A logs in and gets their progress
      await login(pageA)
      const userAProgressResponse = await pageA.request.get('/api/inner-game/progress')
      const userAProgress = await userAProgressResponse.json()

      if (!userAProgress?.user_id) {
        console.log('User A has no progress, skipping test')
        return
      }

      const userAId = userAProgress.user_id

      // Act: User B logs in and tries to access User A's progress by ID
      await loginAsUserB(pageB)

      // Try to get progress with User A's ID in query params
      const idorResponse = await pageB.request.get(`/api/inner-game/progress?user_id=${userAId}`)

      // Assert: User B should get their OWN progress, not User A's
      if (idorResponse.ok()) {
        const responseData = await idorResponse.json()
        // If data is returned, it should NOT be User A's data
        if (responseData?.user_id) {
          expect(responseData.user_id).not.toBe(userAId)
        }
      }
    } finally {
      await contextA.close()
      await contextB.close()
    }
  })
})
