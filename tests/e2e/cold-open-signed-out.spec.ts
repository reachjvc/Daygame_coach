/**
 * THE PAGES A STRANGER SEES, OPENED COLD.
 *
 * `cold-open.spec.ts` covers the app signed in, and could not cover these: a
 * project with a session never renders the sales page or the sign-up form, so
 * the one surface an actual visitor arrives on was the one surface the sweep
 * did not watch. This file runs in `no-auth`, which has no `storageState`.
 *
 * It matters more here than anywhere else in the app. `/` is the only page a
 * person can reach without an account, so a hydration failure on it is the only
 * one a stranger can be shown — and a control nested inside another control is
 * a call-to-action that a screen reader announces twice.
 *
 * Read-only: these pages are opened, never submitted. Signing up is
 * `signup-flow.spec.ts`, which owns the writes.
 */

import { test } from "@playwright/test"
import {
  openCold,
  expectPageExists,
  expectNoHydrationFailure,
  expectNoNestedControls,
} from "./helpers/coldOpen"

/**
 * Everything reachable without an account, from `docs/product/map.md`: the
 * sales page and the whole auth flow. `/auth/reset-password` is included
 * deliberately — it is opened from an emailed link, usually without the token
 * this sweep has, and the version a stranger lands on is exactly the version
 * nobody looks at.
 */
const PUBLIC_ROUTES = [
  "/",
  "/auth/login",
  "/auth/sign-up",
  "/auth/sign-up-success",
  "/auth/forgot-password",
  "/auth/reset-password",
]

for (const route of PUBLIC_ROUTES) {
  test(`opens clean for a stranger: ${route}`, async ({ page }) => {
    const result = await openCold(page, route)

    expectPageExists(route, result)
    expectNoHydrationFailure(route, result)

    /**
     * No allowance at all on the public pages, unlike the signed-in sweep,
     * which grandfathers two tracking routes. There is nothing to grandfather
     * here: every one of these is clean as of 2026-09-24, and the front page's
     * "Preview Dashboard" was the last `<Link>` wrapping a `<Button>` on it.
     * A new one is a new fault, not inherited debt.
     */
    expectNoNestedControls(route, result)
  })
}
