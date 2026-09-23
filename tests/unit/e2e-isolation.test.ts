/**
 * E2E Test Isolation Compliance Tests
 *
 * These tests enforce isolation rules for E2E tests:
 * - Stateful tests (login, route interception) must use serial mode
 * - Tests with route interceptions should have cleanup
 *
 * Prevents test isolation issues where tests pass individually
 * but fail when run together (parallel execution conflicts).
 *
 * NOTE: Uses allowlists for tests that are safe to run in parallel.
 */

import { describe, test, expect } from 'vitest'
import * as fs from 'fs'
import * as path from 'path'

const projectRoot = path.resolve(__dirname, '../..')
const e2eDir = path.join(projectRoot, 'tests/e2e')

// Pre-existing tests that were grandfathered in before isolation rules were enforced.
// These tests existed before the isolation rules were implemented.
// TODO: Gradually migrate these to use serial mode and remove from allowlist.
const GRANDFATHERED_PARALLEL_TESTS = new Set([
  'tests/e2e/articles.spec.ts',
  'tests/e2e/auth.spec.ts',
  'tests/e2e/dashboard-navigation.spec.ts',
  'tests/e2e/field-report.spec.ts',
  'tests/e2e/inner-game-flow.spec.ts',
  'tests/e2e/onboarding.spec.ts',
  'tests/e2e/preferences.spec.ts',
  'tests/e2e/qa-chat.spec.ts',
  'tests/e2e/scenarios-hub.spec.ts',
  'tests/e2e/security-input.spec.ts',
  'tests/e2e/settings.spec.ts',
  'tests/e2e/tracking-dashboard.spec.ts',
  'tests/e2e/weekly-review.spec.ts',
])

// Tests that are explicitly designed to run in parallel (stateless)
// Add tests here ONLY if they don't:
// - Call login()
// - Use page.route()
// - Create/modify database state
const ALLOWED_PARALLEL_TESTS = new Set([
  // Auth tests that don't log in (testing login/signup forms themselves)
  // These are stateless - they just fill forms and check responses
])

// Tests that use route interception but are safe because:
// - They use serial mode, OR
// - They properly cleanup with page.unrouteAll()
const ROUTE_TESTS_WITH_CLEANUP = new Set<string>([
  // Will be populated as we fix the tests
])

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
        // .auth holds saved login state, not tests.
        if (entry.name === '.auth' || entry.name === 'node_modules') continue
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

describe('E2E Test Isolation Compliance', () => {
  test('stateful E2E tests must use serial mode', () => {
    const e2eFiles = getAllE2EFiles()
    const violations: string[] = []

    for (const file of e2eFiles) {
      const content = fs.readFileSync(file, 'utf-8')
      const relativePath = path.relative(projectRoot, file)

      // Skip if in allowlist (grandfathered or explicitly parallel-safe)
      if (GRANDFATHERED_PARALLEL_TESTS.has(relativePath)) continue
      if (ALLOWED_PARALLEL_TESTS.has(relativePath)) continue

      // Check if file is stateful (uses login or route interception)
      const usesLogin = /login\(page\)/.test(content) || /loginAsUserB\(page\)/.test(content)
      const usesRouteInterception = /page\.route\(/.test(content)
      const isStateful = usesLogin || usesRouteInterception

      if (!isStateful) continue

      // Check if serial mode is configured
      const hasSerialMode = /test\.describe\.configure\(\s*\{\s*mode:\s*['"]serial['"]\s*\}\s*\)/.test(content)

      if (!hasSerialMode) {
        const reasons: string[] = []
        if (usesLogin) reasons.push('uses login()')
        if (usesRouteInterception) reasons.push('uses page.route()')
        violations.push(`${relativePath}: missing serial mode (${reasons.join(', ')})`)
      }
    }

    expect(
      violations,
      `Stateful E2E tests without serial mode (add test.describe.configure({ mode: 'serial' })):\n${violations.join('\n')}`
    ).toHaveLength(0)
  })

  test('tests with route interceptions should have cleanup or serial mode', () => {
    const e2eFiles = getAllE2EFiles()
    const violations: string[] = []

    for (const file of e2eFiles) {
      const content = fs.readFileSync(file, 'utf-8')
      const relativePath = path.relative(projectRoot, file)

      // Skip if in cleanup allowlist
      if (ROUTE_TESTS_WITH_CLEANUP.has(relativePath)) continue

      // Check if file uses route interception
      const routeMatches = content.match(/page\.route\(/g)
      if (!routeMatches || routeMatches.length === 0) continue

      // Check for cleanup mechanisms
      const hasSerialMode = /test\.describe\.configure\(\s*\{\s*mode:\s*['"]serial['"]\s*\}\s*\)/.test(content)
      const hasUnrouteAll = /page\.unrouteAll\(/.test(content)
      const hasUnroute = /page\.unroute\(/.test(content)

      // Serial mode OR cleanup is required
      if (!hasSerialMode && !hasUnrouteAll && !hasUnroute) {
        violations.push(`${relativePath}: has ${routeMatches.length} route interception(s) without cleanup (add afterEach with page.unrouteAll() or use serial mode)`)
      }
    }

    expect(
      violations,
      `Route interceptions without cleanup:\n${violations.join('\n')}`
    ).toHaveLength(0)
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
   * FIXED SLEEPS IN THE TRAINING SPECS ONLY GO DOWN.
   *
   * `waitForTimeout` is not banned, because one of them IS the thing under
   * test: `programs-live-workout.spec.ts` backgrounds a tab for ten real
   * seconds to prove the rest clock survives it. The rest are a guess about how
   * long a screen takes, and a guess is either too short — in which case the
   * test is flaky and the failure looks like a defect — or too long on every
   * run for ever. So they are counted, per file, and the count may fall.
   *
   * SEEDED BY COUNTING, not by copying the plan's numbers, which said
   * live-workout 5, history-progress 4 and dashboard-training-card 1. The real
   * counts on 2026-09-23 were 4, 5 and 0.
   */
  const SLEEP_CEILING: Record<string, number> = {
    'tests/e2e/programs-live-workout.spec.ts': 4,
    'tests/e2e/programs-history-progress.spec.ts': 5,
    // One, and it is waiting for a CSS hover transition to land before reading
    // the computed colour — there is no event for "the transition finished".
    'tests/e2e/programs-one-language.spec.ts': 1,
  }

  /** Every spec the `training` project runs, read off the config. */
  function trainingSpecs(): string[] {
    const config = fs.readFileSync(path.join(projectRoot, 'playwright.config.ts'), 'utf-8')
    const block = config.match(/name: 'training',[\s\S]*?testMatch: \[([\s\S]*?)\]/)
    if (!block) throw new Error("could not find the training project's testMatch")
    return [...block[1].matchAll(/\/([a-zA-Z0-9/-]+)\\\.spec\\\.ts\//g)].map(
      (m) => `tests/e2e/${m[1]}.spec.ts`
    )
  }

  test('fixed sleeps in the training specs only go down', () => {
    const over: string[] = []
    for (const rel of trainingSpecs()) {
      const full = path.join(projectRoot, rel)
      if (!fs.existsSync(full)) continue
      const n = (fs.readFileSync(full, 'utf-8').match(/waitForTimeout\(/g) ?? []).length
      const ceiling = SLEEP_CEILING[rel] ?? 0
      if (n !== ceiling) over.push(`${rel}: ${n} sleeps, ceiling ${ceiling}`)
    }
    expect(
      over,
      'A fixed sleep is a guess about how long a screen takes. Wait for the\n' +
        'thing itself, and lower the ceiling here in the same sitting — an\n' +
        'allowance with headroom protects nothing:\n' +
        over.join('\n'),
    ).toEqual([])
  })

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

  test('sees the whole e2e suite, including subdirectories', () => {
    const seen = getAllE2EFiles().map((f) => path.relative(projectRoot, f))

    const inSubdirs = seen.filter((f) => f.split('/').length > 3)
    expect(
      inSubdirs.length,
      `Only top-level specs are visible. Subdirectories (mobile/, cross-browser/, ` +
        `integration/) hold real tests, and a guard that cannot see them passes ` +
        `without checking them.`,
    ).toBeGreaterThan(10)

    expect(
      seen.length,
      `Found ${seen.length} spec files; expected at least 55. A guard that ` +
        `narrows its own input goes quiet without going red.`,
    ).toBeGreaterThanOrEqual(55)
  })
})
