import type { Browser, Page } from '@playwright/test'
import { test, expect, type SignedInAccount } from './fixtures/test'
import { ensureNoActiveSessionViaAPI, createTestSessionViaAPI, createTestApproachViaAPI } from './helpers/auth.helper'

/**
 * One account cannot read or change another's tracking data by its id.
 *
 * API only, two signed-in accounts. Merged from security-idor and security-rls,
 * which between them had eleven tests and eleven `test.skip` calls for "user B
 * is not configured" — a skip that turned a missing account into a green run.
 * A is the worker's own account and B its `secondUser`, both fresh in the
 * test backend; if either cannot be made or signed in, the fixture fails,
 * loudly, before a test starts.
 *
 * Each refusal must be a refusal: 403 or 404. A 500 used to be accepted as
 * "server error on forbidden access", which is also what a crash looks like.
 * Two tests sent methods the routes do not have (PUT on a session, DELETE on an
 * approach) and accepted the 405 — they now use the PATCH the routes do serve.
 *
 * Gone in the merge: a random UUID returning 404 (nobody owns it, so it shows
 * nothing about isolation), "both accounts get stats" and "both get
 * milestones" (status checks only), a `?user_id=` test against an endpoint
 * that reads no query string, and a second copy of "cannot end A's session".
 */

/** A is the test's own `page`; B gets a browser of its own, signed in as `secondUser`. */
async function twoAccounts(
  page: Page,
  browser: Browser,
  secondUser: SignedInAccount,
): Promise<{ a: Page; b: Page; close: () => Promise<void> }> {
  const contextB = await browser.newContext({ storageState: secondUser.storageState })
  const b = await contextB.newPage()
  return {
    a: page,
    b,
    close: async () => {
      // The worker's next test starts on this account; leave it no session.
      await ensureNoActiveSessionViaAPI(page)
      await contextB.close()
    },
  }
}

test.describe('Security: one account cannot reach another account by id', () => {
  test('B cannot read A’s session', async ({ page, browser, secondUser }) => {
    const { a, b, close } = await twoAccounts(page, browser, secondUser)
    try {
      const sessionId = await createTestSessionViaAPI(a, 'IDOR read')
      const response = await b.request.get(`/api/tracking/session/${sessionId}`)
      expect([403, 404]).toContain(response.status())
    } finally {
      await close()
    }
  })

  test('B’s session list does not include A’s session', async ({ page, browser, secondUser }) => {
    const { a, b, close } = await twoAccounts(page, browser, secondUser)
    try {
      const sessionId = await createTestSessionViaAPI(a, 'IDOR list')
      const response = await b.request.get('/api/tracking/sessions')
      expect(response.status()).toBe(200)
      const listed = (await response.json()) as { id: string }[]
      expect(Array.isArray(listed), 'the session list is not a list').toBe(true)
      expect(listed.map((s) => s.id)).not.toContain(sessionId)
    } finally {
      await close()
    }
  })

  test('B cannot change A’s session, and it is left as it was', async ({ page, browser, secondUser }) => {
    const { a, b, close } = await twoAccounts(page, browser, secondUser)
    try {
      const sessionId = await createTestSessionViaAPI(a, 'IDOR update')
      const before = await (await a.request.get(`/api/tracking/session/${sessionId}`)).json()

      const response = await b.request.patch(`/api/tracking/session/${sessionId}`, {
        data: { primary_location: 'HACKED BY USER B' },
      })
      expect([403, 404]).toContain(response.status())

      const after = await a.request.get(`/api/tracking/session/${sessionId}`)
      expect(after.status()).toBe(200)
      expect((await after.json()).primary_location).toBe(before.primary_location)
    } finally {
      await close()
    }
  })

  test('B cannot end A’s session, and it is still running', async ({ page, browser, secondUser }) => {
    const { a, b, close } = await twoAccounts(page, browser, secondUser)
    try {
      const sessionId = await createTestSessionViaAPI(a, 'IDOR end')
      const response = await b.request.post(`/api/tracking/session/${sessionId}/end`, { data: {} })
      expect([403, 404]).toContain(response.status())

      const active = await a.request.get('/api/tracking/session/active')
      expect(active.status()).toBe(200)
      expect((await active.json()).session?.id, 'A’s session was ended by B').toBe(sessionId)
    } finally {
      await close()
    }
  })

  test('B cannot change A’s approach, and it is left as it was', async ({ page, browser, secondUser }) => {
    const { a, b, close } = await twoAccounts(page, browser, secondUser)
    try {
      const sessionId = await createTestSessionViaAPI(a, 'IDOR approach')
      const approachId = await createTestApproachViaAPI(a, sessionId, 'short')

      const response = await b.request.patch(`/api/tracking/approach/${approachId}`, {
        data: { outcome: 'number', note: 'HACKED BY USER B' },
      })
      expect([403, 404]).toContain(response.status())

      const session = await a.request.get(`/api/tracking/session/${sessionId}`)
      expect(session.status()).toBe(200)
      const approaches = (await session.json()).approaches as { id: string; outcome: string; note: string | null }[]
      const approach = approaches.find((x) => x.id === approachId)
      expect(approach, 'A’s approach is gone').toBeDefined()
      expect(approach!.outcome).toBe('short')
      expect(approach!.note).not.toBe('HACKED BY USER B')
    } finally {
      await close()
    }
  })
})
