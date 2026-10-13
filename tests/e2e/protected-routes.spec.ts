import { test } from '@playwright/test'

const AUTH_TIMEOUT = 15000

/**
 * A stranger asking for a signed-in page is sent to log in.
 *
 * One table-driven test. `proxy.ts` guards every /dashboard route with the same
 * rule, so four copies of one assertion were one test four times; the list
 * keeps a route that has its own server-side check besides (`/dashboard/qa`,
 * which also gates on the subscription).
 *
 * What happens after logging OUT is `auth.spec.ts`'s, which logs out for real
 * rather than clearing cookies by hand.
 */
test.use({ storageState: { cookies: [], origins: [] } })

test('every signed-in page sends a stranger to log in', async ({ page }) => {
  for (const route of ['/dashboard', '/dashboard/tracking', '/dashboard/settings', '/dashboard/qa']) {
    await page.goto(route, { timeout: AUTH_TIMEOUT })
    await page.waitForURL(/\/auth\/login/, { timeout: AUTH_TIMEOUT })
  }
})
