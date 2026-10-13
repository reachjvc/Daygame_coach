/**
 * E2E TEST ISOLATION: EVERY SPEC ON AN ACCOUNT NOBODY ELSE IS USING.
 *
 * Until Phase 8 of Plans/tests-worth-their-keep.md the browser suite signed in
 * as three shared accounts, and this file enforced the workarounds: serial mode
 * for any spec that logged in or stubbed a route, allowlists for the ones that
 * did not yet comply. Each worker now gets a fresh account of its own from
 * tests/e2e/fixtures/test.ts, so the rule that matters is the one that makes
 * that true — every spec takes `test` from the fixture — and the workarounds
 * are gone.
 */

import { describe, test, expect } from 'vitest'
import * as fs from 'fs'
import * as path from 'path'
import { isRedirectShim, productRoutes } from '@/tests/support/appRoutes'

const projectRoot = path.resolve(__dirname, '../..')
const e2eDir = path.join(projectRoot, 'tests/e2e')

/**
 * Every spec file, at any depth.
 *
 * This used to read only the top level of tests/e2e, so the 13 specs under
 * mobile/, cross-browser/ and integration/ were invisible to every rule in this
 * file. Nothing said so -- the guard passed, having looked at two thirds of the
 * suite. Recursing is the whole fix; the ratchet at the bottom is what stops it
 * silently narrowing again.
 */
function getAllE2EFiles(): string[] {
  const files: string[] = []

  if (!fs.existsSync(e2eDir)) return files

  const walk = (dir: string) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name)
      if (entry.isDirectory()) {
        if (entry.name === 'node_modules') continue
        walk(full)
      } else if (entry.isFile() && entry.name.endsWith('.spec.ts')) {
        files.push(full)
      }
    }
  }

  walk(e2eDir)
  return files.sort()
}

/**
 * Does this spec actually click the start-session button?
 *
 * Handles both shapes in the suite: the direct chain, and the far more common
 * `const startBtn = page.getByTestId(SELECTORS.session.startButton)` followed
 * later by `startBtn.click(...)`. A file that only asserts the button is
 * visible starts no session and needs no cleanup.
 */
function clicksTheStartButton(content: string): boolean {
  const SELECTOR = /getByTestId\(\s*SELECTORS\.session\.startButton\s*\)/

  // Direct: page.getByTestId(SELECTORS.session.startButton).click()
  if (new RegExp(SELECTOR.source + /\s*\.click\(/.source).test(content)) return true

  // Via a variable: capture every name bound to that locator, then look for a
  // click on it. Covers `.or(...)` chains, which bind but never click.
  const bindings = [
    ...content.matchAll(
      new RegExp(/(?:const|let|var)\s+(\w+)\s*=\s*[^\n]*?/.source + SELECTOR.source, "g"),
    ),
  ].map((m) => m[1])

  return bindings.some((name) => new RegExp(`\\b${name}\\s*\\.click\\(`).test(content))
}

/** Imports `test` from the per-worker account fixture, wherever the spec sits under tests/e2e. */
function usesWorkerAccount(content: string): boolean {
  return /from\s+['"](?:\.\.?\/)+fixtures\/test['"]/.test(content)
}

describe('E2E Test Isolation Compliance', () => {
  test('every spec signs in through the per-worker account fixture', () => {
    /**
     * A spec that takes `test` from '@playwright/test' gets no account: it
     * either runs signed out by accident or brings a signed-in state of its
     * own, and that state is shared with whoever else loads it. Type-only
     * imports (`import type { Page }`) are fine.
     */
    const violations: string[] = []
    for (const file of getAllE2EFiles()) {
      const content = fs.readFileSync(file, 'utf-8')
      const rel = path.relative(projectRoot, file).replace(/\\/g, '/')
      if (!usesWorkerAccount(content)) violations.push(`${rel}: does not import test from fixtures/test`)
      if (/import\s*\{[^}]*\btest\b[^}]*\}\s*from\s*['"]@playwright\/test['"]/.test(content)) {
        violations.push(`${rel}: takes test from @playwright/test`)
      }
      if (/storageState:\s*['"`]/.test(content)) violations.push(`${rel}: loads a saved signed-in state by path`)
    }
    expect(violations, `Specs not on an account of their own:\n${violations.join('\n')}`).toEqual([])
  })

  test('no spec keeps one page across its tests', () => {
    /**
     * The one way a stubbed route, a signed-in session or a half-finished
     * screen can leak from one test into the next: a `page` opened in
     * `beforeAll` and shared. The fixture's `page` is the test's own and dies
     * with it.
     */
    const shared = getAllE2EFiles()
      .filter((file) => /let\s+page\s*:\s*Page/.test(fs.readFileSync(file, 'utf-8')))
      .map((file) => path.relative(projectRoot, file))
    expect(shared, 'These hold a page across tests; use the test\'s own `page`').toEqual([])
  })

  test('tests that create sessions should have cleanup', () => {
    const e2eFiles = getAllE2EFiles()
    const violations: string[] = []

    for (const file of e2eFiles) {
      const content = fs.readFileSync(file, 'utf-8')
      const relativePath = path.relative(projectRoot, file)

      // Check if file creates sessions via API or UI.
      //
      // "Starts a session" means the start button is CLICKED. The rule used to
      // be `mentions startButton` AND `contains .click(` anywhere in the file --
      // two unrelated facts about a file, read as one behaviour. It flagged
      // mobile-tracking.spec.ts and tracking-cross.spec.ts, which only assert
      // the button is VISIBLE and whose clicks are on history filters. Checking
      // that two strings co-occur is not checking that a session was started.
      const createsSessionViaAPI = /createTestSessionViaAPI\(/.test(content)
      const startsSessionViaUI = clicksTheStartButton(content)

      if (!createsSessionViaAPI && !startsSessionViaUI) continue

      // Check for session cleanup
      const hasSessionCleanup = /ensureNoActiveSessionViaAPI\(/.test(content) || /ensureCleanSession\(/.test(content)
      const hasAfterEach = /test\.afterEach\(/.test(content)

      // Sessions tests should have cleanup mechanism
      if (!hasSessionCleanup && !hasAfterEach) {
        violations.push(`${relativePath}: creates sessions but has no cleanup (add ensureNoActiveSessionViaAPI in afterEach)`)
      }
    }

    expect(
      violations,
      `Session-creating tests without cleanup:\n${violations.join('\n')}`
    ).toHaveLength(0)
  })

  /**
   * THE RATCHET. Every rule above is worth only what `getAllE2EFiles()` returns.
   * It used to read one directory level, so 13 specs under mobile/,
   * cross-browser/ and integration/ were invisible and the guard passed having
   * seen two thirds of the suite. Nothing said so.
   *
   * Floor set below today's real number. Raise it as the suite grows; never
   * lower it to make a change pass.
   */
  /**
   * Fixed sleeps — in the training specs and everywhere else — are
   * tests/unit/infra/e2eSleepsAreTimed.test.ts's rule since 2026-10-13. The
   * per-file ceiling that lived here covered three training files; that check
   * covers the whole suite, by test, and is the one owner.
   */
  /**
   * Every training spec: each one that drives the training helper, and each
   * named for the programs or training screens.
   */
  function trainingSpecs(): string[] {
    return getAllE2EFiles()
      .filter(
        (file) =>
          /helpers\/training\.helper['"]/.test(fs.readFileSync(file, 'utf-8')) ||
          /(?:programs-|training)[^/]*\.spec\.ts$/.test(file),
      )
      .map((file) => path.relative(projectRoot, file).replace(/\\/g, '/'))
  }

  test('no training spec builds a calendar fact from the machine clock', () => {
    /**
     * The account's clock is the only thing that decides which day a workout
     * was on, and a spec that asks the RUNNER what day it is disagrees with the
     * app the moment CI runs in a different zone from the laptop. The account's
     * answer comes from `/api/settings/time-preferences`, or from the control's
     * own `max` attribute, which is what the past-workout dialog reads.
     *
     * NARROWED TO A BARE `new Date()`, which is the fault itself. An OFFSET —
     * "twenty days ago", `new Date(Date.now() - n * 86_400_000)` — cannot be
     * this fault: the seeds use it to land a workout somewhere inside an
     * eight-week window, and being a day out either way is not a thing any
     * assertion depends on. A first draft of this banned the idioms outright
     * and named five uses, four of them harmless, which is how a rule gets
     * turned off rather than obeyed.
     */
    const BANNED = /\bnew Date\(\)\s*\.\s*(?:toISOString\(\)\s*\.\s*(?:split|slice)|getDay|getDate|getMonth|toLocaleDateString)/
    const offenders: string[] = []
    for (const rel of trainingSpecs()) {
      const full = path.join(projectRoot, rel)
      if (!fs.existsSync(full)) continue
      const code = fs
        .readFileSync(full, 'utf-8')
        .replace(/\/\*[\s\S]*?\*\//g, '')
        .replace(/\/\/[^\n]*/g, '')
      if (BANNED.test(code)) offenders.push(`${rel}: a calendar fact from new Date()`)
    }
    expect(
      offenders,
      "These read the runner's clock for a calendar fact the account owns:\n" +
        offenders.join('\n'),
    ).toEqual([])
  })

  test('no spec drives a redirect shim', () => {
    /**
     * A PAGE WHOSE WHOLE JOB IS `redirect(...)` HAS NOTHING TO TEST.
     *
     * A spec that opens one is measuring the page it lands on while claiming to
     * be about the address it typed — so the day the shim's destination
     * changes, the test goes on passing about somewhere else entirely, and the
     * day the shim is deleted the test fails somewhere that looks unrelated.
     *
     * `isRedirectShim` has one owner in `tests/support/appRoutes.ts`. It used
     * to have two, in the two navigation guards that use it for opposite
     * purposes — one to excuse a route from needing a Back control, the other
     * to excuse it from needing to be reachable.
     */
    const shims = productRoutes()
      .filter((r) => r.file && isRedirectShim(r.file))
      .map((r) => r.route)
    // Without a shim to look for, this passes while checking nothing.
    expect(shims.length, 'no redirect shims found — the detector is broken').toBeGreaterThan(0)

    const offenders: string[] = []
    for (const file of getAllE2EFiles()) {
      const rel = path.relative(projectRoot, file).replace(/\\/g, '/')
      const src = fs
        .readFileSync(file, 'utf-8')
        .replace(/\/\*[\s\S]*?\*\//g, '')
        .replace(/\/\/[^\n]*/g, '')
      for (const shim of shims) {
        // `goto("<shim>")` exactly — a longer path that merely starts with it is
        // a different page.
        if (new RegExp(`goto\\(\\s*["'\`]${shim}(?:[?#]|["'\`])`).test(src)) {
          offenders.push(`${rel} opens ${shim}`)
        }
      }
    }
    expect(
      offenders,
      'These drive a page whose only job is to redirect. Open its destination:\n' +
        offenders.join('\n'),
    ).toEqual([])
  })

  test('sees the whole e2e suite, including subdirectories', () => {
    const seen = getAllE2EFiles().map((f) => path.relative(projectRoot, f))

    /**
     * Floors lowered on 2026-10-13, and only because the suite was cut on
     * purpose: Phase 3 of Plans/tests-worth-their-keep.md deleted 23 spec
     * files (18 under mobile/, cross-browser/ and integration/ became 8) and
     * merged three more. Still set below the real counts, which were 8 and 55.
     */
    const inSubdirs = seen.filter((f) => f.split('/').length > 3)
    expect(
      inSubdirs.length,
      `Only top-level specs are visible. Subdirectories (mobile/, cross-browser/, ` +
        `sweep/) hold real tests, and a guard that cannot see them passes ` +
        `without checking them.`,
    ).toBeGreaterThanOrEqual(6)

    expect(
      seen.length,
      `Found ${seen.length} spec files; expected at least 50. A guard that ` +
        `narrows its own input goes quiet without going red.`,
    ).toBeGreaterThanOrEqual(50)
  })
})
