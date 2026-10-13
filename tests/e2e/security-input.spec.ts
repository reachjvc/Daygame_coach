import { test, expect } from '@playwright/test'

/**
 * The session endpoint refuses a body of the wrong shape.
 *
 * Two tests, kept until they move to a unit test of `CreateSessionSchema` plus
 * the route's 400 (Phase 3's demotion list; they need no browser). Eighteen
 * others lived here and could not fail: they accepted `[200, 201, 400]` — any
 * answer at all — and sent a `location` field the endpoint does not read
 * (`primary_location` is the column), so every "XSS" and "SQL injection" payload
 * was dropped before it reached anything. Each one that was accepted also left
 * a session running on the shared test account.
 */
test.describe('Security: Input Validation', () => {
  test('rejects string where number expected', async ({ page }) => {
    const response = await page.request.post('/api/tracking/session', {
      data: { goal: 'five', location: 'Test' },
    })
    expect([400, 422]).toContain(response.status())
  })

  test('handles null values appropriately', async ({ page }) => {
    const response = await page.request.post('/api/tracking/session', {
      data: { goal: null, location: null },
    })
    expect([400, 422]).toContain(response.status())
  })
})
