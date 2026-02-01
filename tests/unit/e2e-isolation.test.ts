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

function getAllE2EFiles(): string[] {
  const files: string[] = []

  if (!fs.existsSync(e2eDir)) return files

  const entries = fs.readdirSync(e2eDir, { withFileTypes: true })
  for (const entry of entries) {
    if (entry.isFile() && entry.name.endsWith('.spec.ts')) {
      files.push(path.join(e2eDir, entry.name))
    }
  }
  return files
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

      // Check if file creates sessions via API or UI
      const createsSessionViaAPI = /createTestSessionViaAPI\(/.test(content)
      const startsSessionViaUI = /SELECTORS\.session\.startButton/.test(content) && /\.click\(/.test(content)

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
})
