/**
 * Architecture Compliance Tests
 *
 * These tests enforce the rules defined in CLAUDE.md:
 * - API routes should be thin wrappers (max 30 lines, no business logic)
 * - No direct Supabase calls outside src/db/
 * - Business logic only in *Service.ts files
 * - Types only in types.ts files per slice
 *
 * NOTE: Uses allowlists for existing violations (grandfathered).
 * New violations will fail the tests.
 */

import { describe, test, expect } from 'vitest'
import * as fs from 'fs'
import * as path from 'path'
import { UTILITY_ICONS, SEMANTIC_ICON_ROLES, CUSTOM_ICON_COMPONENTS } from '../../src/shared/iconRoles'

const projectRoot = path.resolve(__dirname, '../..')

// Grandfathered violations - existing files that violate rules
// Remove items from these lists as they get fixed
const ALLOWED_LONG_ROUTES = new Set([
  'app/api/articles/alternatives/route.ts',
  'app/api/inner-game/comparisons/route.ts',
  'app/api/inner-game/values/route.ts',
  'app/api/test/analyze-comments/route.ts',
  'app/api/test/articles/route.ts',
  'app/api/test/generate-draft/route.ts',
  'app/api/test/save-feedback/route.ts',
  'app/api/tracking/approach/route.ts',
  'app/api/tracking/field-report/route.ts',
  'app/api/tracking/review/route.ts',
  'app/api/tracking/session/[id]/route.ts',
  'app/api/tracking/session/route.ts',
])

const ALLOWED_TYPE_EXPORTS = new Set([
  'src/articles/schemas.ts',
  'src/qa/providers/index.ts',
  'src/qa/schemas.ts',
  'src/inner-game/data/roleModels.ts',
  'src/inner-game/hooks/useValueInference.ts',
  'src/inner-game/schemas.ts',
  'src/scenarios/career/data/careers.ts',
  'src/scenarios/career/generator.ts',
  'src/scenarios/openers/data/base-texts.ts',
  'src/scenarios/openers/generator.ts',
  'src/scenarios/scenariosService.ts',
  'src/tracking/config.ts',
  'src/tracking/data/milestones.ts',
  'src/tracking/data/templates.ts',
  'src/tracking/schemas.ts',
  'src/profile/data/experience-levels.ts',
  'src/profile/data/map-audit.ts',
  'src/profile/data/primary-goals.ts',
  'src/profile/profileService.ts',
  'src/settings/settingsService.ts',
])

// Folders/files to skip for doc header checks
const DOC_HEADER_SKIP_PATTERNS = [
  /\/articles\//,   // Article content files
  /\/archive\//,    // Archived docs
  /noter_til/,      // Notes files
  /cleanup_gap/,    // Cleanup notes
  /images\.md/,     // Image reference docs
  /PIPELINE_STATUS/, // Status tracking (different format)
  /PLAN_.*_BACKLOG/, // Backlog files
]

function getAllFiles(dir: string, pattern: RegExp): string[] {
  const files: string[] = []

  if (!fs.existsSync(dir)) return files

  const entries = fs.readdirSync(dir, { withFileTypes: true })
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name)
    if (entry.isDirectory() && !entry.name.includes('node_modules')) {
      files.push(...getAllFiles(fullPath, pattern))
    } else if (entry.isFile() && pattern.test(entry.name)) {
      files.push(fullPath)
    }
  }
  return files
}

function countCodeLines(content: string): number {
  // Count non-empty, non-comment lines
  return content
    .split('\n')
    .filter(line => {
      const trimmed = line.trim()
      return trimmed.length > 0 &&
             !trimmed.startsWith('//') &&
             !trimmed.startsWith('/*') &&
             !trimmed.startsWith('*')
    })
    .length
}

describe('Architecture Compliance', () => {

  describe('API Routes - Thin Wrappers', () => {
    test('API routes should be under 50 lines of code', () => {
      // Arrange: Get all API route files
      const apiDir = path.join(projectRoot, 'app/api')
      const routeFiles = getAllFiles(apiDir, /route\.ts$/)

      // Act & Assert: Check each route file
      const violations: string[] = []

      for (const file of routeFiles) {
        const content = fs.readFileSync(file, 'utf-8')
        const lineCount = countCodeLines(content)
        const relativePath = path.relative(projectRoot, file)

        // 50 lines is generous - the rule says 30, but we allow some buffer
        if (lineCount > 50 && !ALLOWED_LONG_ROUTES.has(relativePath)) {
          violations.push(`${relativePath}: ${lineCount} lines (max 50)`)
        }
      }

      expect(violations, `NEW API routes too long (not in allowlist):\n${violations.join('\n')}`).toHaveLength(0)
    })

    test('API routes should not import business logic directly (only services)', () => {
      // Arrange: Get all API route files
      const apiDir = path.join(projectRoot, 'app/api')
      const routeFiles = getAllFiles(apiDir, /route\.ts$/)

      // These patterns indicate business logic leaking into routes
      const forbiddenPatterns = [
        /import.*from ['"].*\/utils\//,  // No direct utility imports
        /import.*from ['"].*\/helpers\// // No direct helper imports
      ]

      // Act & Assert
      const violations: string[] = []

      for (const file of routeFiles) {
        const content = fs.readFileSync(file, 'utf-8')
        const relativePath = path.relative(projectRoot, file)

        for (const pattern of forbiddenPatterns) {
          if (pattern.test(content)) {
            violations.push(`${relativePath}: imports forbidden pattern ${pattern}`)
          }
        }
      }

      expect(violations, `Business logic in API routes:\n${violations.join('\n')}`).toHaveLength(0)
    })
  })

  describe('Database Access - Only via src/db/', () => {
    test('No direct Supabase imports outside src/db/', () => {
      // Arrange: Get all TypeScript files outside src/db/
      const srcDir = path.join(projectRoot, 'src')
      const appDir = path.join(projectRoot, 'app')

      const srcFiles = getAllFiles(srcDir, /\.tsx?$/)
        .filter(f => !f.includes('/db/'))
      const appFiles = getAllFiles(appDir, /\.tsx?$/)

      const allFiles = [...srcFiles, ...appFiles]

      // Act & Assert
      const violations: string[] = []

      for (const file of allFiles) {
        const content = fs.readFileSync(file, 'utf-8')
        const relativePath = path.relative(projectRoot, file)

        // Check for direct Supabase imports
        if (/import.*from ['"]@supabase\//.test(content)) {
          violations.push(`${relativePath}: direct Supabase import (should use src/db/)`)
        }

        // Check for createClient calls (unless it's re-exporting)
        if (/createClient\(/.test(content) && !file.includes('supabase')) {
          violations.push(`${relativePath}: direct createClient call (should use src/db/)`)
        }
      }

      expect(violations, `Direct Supabase access outside db:\n${violations.join('\n')}`).toHaveLength(0)
    })
  })

  describe('Slice Structure', () => {
    const slices = ['qa', 'inner-game', 'scenarios', 'tracking', 'profile', 'settings', 'articles']

    test('Each slice should have a types.ts file', () => {
      // Arrange & Act
      const missingTypes: string[] = []

      for (const slice of slices) {
        const typesPath = path.join(projectRoot, 'src', slice, 'types.ts')
        if (!fs.existsSync(typesPath)) {
          missingTypes.push(`src/${slice}/types.ts`)
        }
      }

      // Assert
      expect(missingTypes, `Missing types.ts files:\n${missingTypes.join('\n')}`).toHaveLength(0)
    })

    test('Each slice should have a service file', () => {
      // Arrange & Act
      const missingServices: string[] = []

      for (const slice of slices) {
        const sliceDir = path.join(projectRoot, 'src', slice)
        if (!fs.existsSync(sliceDir)) continue

        const files = fs.readdirSync(sliceDir)
        const hasService = files.some(f => f.endsWith('Service.ts'))

        if (!hasService) {
          missingServices.push(`src/${slice}/ (no *Service.ts)`)
        }
      }

      // Assert
      expect(missingServices, `Missing service files:\n${missingServices.join('\n')}`).toHaveLength(0)
    })

    test('Type exports should only be in types.ts files', () => {
      // Arrange: Get all non-types.ts files in slices
      const violations: string[] = []

      for (const slice of slices) {
        const sliceDir = path.join(projectRoot, 'src', slice)
        if (!fs.existsSync(sliceDir)) continue

        const files = getAllFiles(sliceDir, /\.tsx?$/)
          .filter(f => !f.endsWith('types.ts'))

        // Act: Check for type exports
        for (const file of files) {
          const content = fs.readFileSync(file, 'utf-8')
          const relativePath = path.relative(projectRoot, file)

          // Skip if in allowlist
          if (ALLOWED_TYPE_EXPORTS.has(relativePath)) continue

          // Look for exported type/interface declarations
          if (/export\s+(type|interface)\s+\w+/.test(content)) {
            // Allow re-exports from types.ts
            if (!/export.*from ['"].*types['"]/.test(content)) {
              violations.push(`${relativePath}: exports types (should be in types.ts)`)
            }
          }
        }
      }

      // Assert
      expect(violations, `NEW type exports outside types.ts (not in allowlist):\n${violations.join('\n')}`).toHaveLength(0)
    })
  })

  describe('Dates and periods', () => {
    /**
     * A DATE IS A DATE IN SOMEBODY'S CALENDAR.
     *
     * Two spellings caused every timezone bug this codebase has had, and both
     * are still findable by their shape:
     *
     *   - hand-rolled week arithmetic (`getDay()` then `setDate()`), which was
     *     copied six times and drifted. Two of the copies disagreed about the
     *     same week and `getConsecutiveTrainingWeeks` could only ever return 0.
     *   - `toISOString().split("T")[0]`, which converts to UTC before taking the
     *     date, so a Monday 00:30 in Copenhagen comes back as Sunday.
     *
     * `periodStartFor` and `toDateISO` exist for these. The allowlists below are
     * the sites that have not been converted yet; they may SHRINK and never
     * grow, so the debt is a number rather than a vague intention.
     */

    /** Sites still deriving a date via UTC. See docs/plans/date_database.md. */
    const UTC_DATE_SHIFT_ALLOWED = new Set([
      // Date-range loops and cursors — not period boundaries, but still UTC.
      'src/db/goalRepo.ts',
      'src/db/trackingRepo.ts',
      // Client components computing "this week" from the browser clock. These
      // need the timezone provider in date_database.md Phase 3.
      'src/goals/components/DailyActionView.tsx',
      'src/goals/components/WeeklyReviewDialog.tsx',
      'src/goals/hooks/usePeriodStats.ts',
      'src/health/components/CorrelationPanel.tsx',
      // Projections and "today" defaults.
      'src/health/healthService.ts',
      'src/exercising/exercisingService.ts',
    ])

    /** Files still building a Monday by hand. */
    const HAND_ROLLED_WEEK_ALLOWED = new Set([
      'src/goals/components/DailyActionView.tsx',
      'src/goals/components/HeatmapCalendar.tsx',
      'src/goals/components/WeeklyReviewDialog.tsx',
      'src/tracking/components/WeeklyReviewPage.tsx',
      'src/timetrack/calendarService.ts',
    ])

    function sourceFiles(): string[] {
      return getAllFiles(path.join(projectRoot, 'src'), /\.tsx?$/)
        .filter((f) => !f.endsWith('.d.ts'))
    }

    test('no NEW date derived by converting to UTC first', () => {
      const offenders: string[] = []
      for (const file of sourceFiles()) {
        const relativePath = path.relative(projectRoot, file)
        if (relativePath === 'src/shared/dateUtils.ts') continue // documents the pattern
        const content = fs.readFileSync(file, 'utf-8')
        if (!content.includes('toISOString().split("T")[0]')) continue
        if (!UTC_DATE_SHIFT_ALLOWED.has(relativePath)) offenders.push(relativePath)
      }

      expect(
        offenders,
        `toISOString().split("T")[0] converts to UTC before taking the date. Use toDateISO(zonedDate).\n${offenders.join('\n')}`
      ).toHaveLength(0)
    })

    test('the UTC-date allowlist only shrinks', () => {
      const stillOffending = new Set(
        sourceFiles()
          .map((f) => path.relative(projectRoot, f))
          .filter((rel) => {
            if (rel === 'src/shared/dateUtils.ts') return false
            return fs
              .readFileSync(path.join(projectRoot, rel), 'utf-8')
              .includes('toISOString().split("T")[0]')
          })
      )
      const cleaned = [...UTC_DATE_SHIFT_ALLOWED].filter((f) => !stillOffending.has(f))
      expect(
        cleaned,
        `These are fixed — remove them from UTC_DATE_SHIFT_ALLOWED:\n${cleaned.join('\n')}`
      ).toHaveLength(0)
    })

    test('no NEW hand-rolled week boundary', () => {
      const offenders: string[] = []
      for (const file of sourceFiles()) {
        const relativePath = path.relative(projectRoot, file)
        if (relativePath === 'src/shared/dateUtils.ts') continue
        const lines = fs.readFileSync(file, 'utf-8').split('\n')

        // The fingerprint is `getDay()` and `setDate(` within four lines of each
        // other: reading a day-of-week is fine, stepping backwards by it to find
        // a Monday is the copy.
        let lastGetDay = -10
        for (let i = 0; i < lines.length; i++) {
          if (lines[i].includes('getDay()')) lastGetDay = i
          if (lines[i].includes('setDate(') && i - lastGetDay <= 4) {
            if (!HAND_ROLLED_WEEK_ALLOWED.has(relativePath)) {
              offenders.push(`${relativePath}:${i + 1}`)
            }
            break
          }
        }
      }

      expect(
        offenders,
        `Hand-rolled week boundary. Use periodStartFor("weekly", zonedDate).\n${offenders.join('\n')}`
      ).toHaveLength(0)
    })
  })

  describe('Routes', () => {
    /**
     * THE GOALS HUB IS ARCHIVED, AND PRODUCTION MUST NOT LINK AT IT.
     *
     * `/dashboard/goals`, `/dashboard/goals/setup` and `/lair` were deleted on
     * 2026-09-02. The hub is at `/test/archive/goals-hub` and the Lair at
     * `/test/archive/lair`, both to be inspected and then deleted outright;
     * `/dashboard/goals/plan` is the goal surface the product keeps.
     *
     * Two things this catches. A link left pointing at a route that now 404s —
     * there were six, in the header, the tab bar, Mission Control, the inner-game
     * tab, the Track step and settings. And a NEW link from production into the
     * archive, which would only have to be removed again when the archive goes.
     */
    test('nothing links to the archived surfaces', () => {
      const offenders: string[] = []
      const roots = ['src', 'app', 'components']

      for (const root of roots) {
        for (const file of getAllFiles(path.join(projectRoot, root), /\.tsx?$/)) {
          const relativePath = path.relative(projectRoot, file)
          const content = fs.readFileSync(file, 'utf-8')

          // `/dashboard/goals` NOT followed by `/plan` is the dead route.
          for (const match of content.matchAll(/["'`](\/dashboard\/goals(?!\/plan)[^"'`]*)["'`]/g)) {
            offenders.push(`${relativePath}: links to ${match[1]}`)
          }

          // `/lair` went the same way — the board is at /test/archive/lair. The
          // API it saves through, `/api/lair`, is still live and is not this.
          for (const match of content.matchAll(/["'`](\/lair(?!\w)[^"'`]*)["'`]/g)) {
            offenders.push(`${relativePath}: links to ${match[1]}`)
          }

          // Production linking into the archive. Archive pages may link to each
          // other, so only non-archive files are checked.
          if (relativePath.startsWith('app/test/')) continue

          // Mission Control links to the archived hub. It is not production
          // linking into the archive: the Lair it lives in is archived too, so
          // this is one archived surface pointing at another. The file is still
          // under src/, which is the only reason the path check does not already
          // exempt it — and it is listed here so that deleting the archive
          // leaves an obvious, failing breadcrumb.
          if (relativePath === 'src/lair/components/widgets/MissionControlWidget.tsx') continue
          for (const match of content.matchAll(/["'`](\/test\/archive\/[^"'`]*)["'`]/g)) {
            offenders.push(`${relativePath}: production links into the archive (${match[1]})`)
          }
        }
      }

      expect(
        offenders,
        `Dead or archive-bound links:\n${offenders.join('\n')}`
      ).toHaveLength(0)
    })
  })

  describe('Counters', () => {
    /**
     * EVERY PERIOD-SCOPED COUNTER DECLARES THE PERIOD IT BELONGS TO.
     *
     * A count with no period attached is not data. `user_tracking_stats` held
     * five weekly counters and three streaks whose only key was an ISO-week
     * label derived from the server clock, and the Week Streak tile showed a
     * February number in August as a result.
     *
     * This is a floor, not a proof: it catches a NEW `current_week_*` or
     * `last_*` column added to trackingTypes.ts without a key beside it. A
     * counter living in another slice is not covered.
     */
    test('period-scoped columns on user_tracking_stats have a period key', () => {
      const source = fs.readFileSync(
        path.join(projectRoot, 'src/db/trackingTypes.ts'),
        'utf-8'
      )
      const row = source.slice(
        source.indexOf('export interface UserTrackingStatsRow'),
        source.indexOf('export interface UserTrackingStatsUpdate')
      )

      const columns = [...row.matchAll(/^\s{2}(\w+)\??:/gm)].map((m) => m[1])

      // The key each family of counters is read against. A counter whose family
      // is not here has no period, which is the bug.
      const PERIOD_KEYS: Record<string, string> = {
        current_week: 'week_start_date',
        current_streak: 'last_approach_date',
        current_weekly: 'last_review_week_start',
        current_week_streak: 'last_active_week_start',
      }

      // Not a vacuous pass: if the regex stops matching, this fires first.
      expect(columns).toContain('current_week_sessions')
      expect(columns).toContain('week_start_date')
      expect(columns.length).toBeGreaterThan(20)

      const violations: string[] = []
      for (const column of columns) {
        if (!column.startsWith('current_')) continue
        const family = Object.keys(PERIOD_KEYS)
          .sort((a, b) => b.length - a.length)
          .find((prefix) => column.startsWith(prefix))
        if (!family) {
          violations.push(`${column}: no period key declared in PERIOD_KEYS`)
          continue
        }
        if (!columns.includes(PERIOD_KEYS[family])) {
          violations.push(`${column}: key ${PERIOD_KEYS[family]} is not on the row`)
        }
      }

      expect(
        violations,
        `Counters without a period:\n${violations.join('\n')}`
      ).toHaveLength(0)
    })
  })

  describe('Achievements - derived, never counted', () => {
    /**
     * THE BUG THIS FORBIDS.
     *
     * Badges used to be awarded at the instant a `+1` counter passed a
     * threshold, from five different functions. Miss the instant and the badge
     * was gone forever: one live account has "First Steps" and "Double Digits"
     * but went seven months without "Getting Started", and 51 of the 101 badges
     * on screen had no awarding code at all.
     *
     * Everything now derives from the user's own rows in one place. These two
     * tests fail the build if either half of that is undone.
     */
    test('only the achievements service writes badges or counters', () => {
      const ALLOWED = new Set([
        // The one writer.
        'src/tracking/achievementsSyncService.ts',
        // The repo functions it calls, plus the weekly roll on the read path.
        'src/db/trackingRepo.ts',
        // Rolls the weekly counters to the current week before a read. It no
        // longer recounts them: the projection does that on every write, and
        // two writers with different definitions is what made a tile show a
        // different number on every page load.
        'src/db/metricsRepo.ts',
      ])

      const files = [
        ...getAllFiles(path.join(projectRoot, 'src'), /\.tsx?$/),
        ...getAllFiles(path.join(projectRoot, 'app'), /\.tsx?$/),
      ]

      const violations: string[] = []
      for (const file of files) {
        const relativePath = path.relative(projectRoot, file)
        if (ALLOWED.has(relativePath)) continue

        const content = fs.readFileSync(file, 'utf-8')

        // Awarding a badge anywhere else is the thing being forbidden.
        if (/from\s*\(\s*['"]milestones['"]\s*\)\s*\n?\s*\.(insert|upsert)/.test(content)) {
          violations.push(`${relativePath}: writes to the milestones table directly`)
        }
        // So is incrementing a counter instead of deriving it.
        if (/total_(approaches|sessions|numbers|instadates|field_reports)\s*[:+]\s*\w+\s*\+\s*1/.test(content)) {
          violations.push(`${relativePath}: increments a total instead of deriving it`)
        }
      }

      expect(
        violations,
        `Counters are derived from rows — see docs/plans/achievement_counters.md\n${violations.join('\n')}`
      ).toHaveLength(0)
    })

    test('every badge in the catalogue has a rule behind it', () => {
      // The types already say so, but `next.config.mjs` sets
      // `ignoreBuildErrors: true`, so nothing runs the type checker on a deploy.
      // This is that guarantee in a form that actually runs.
      const types = fs.readFileSync(path.join(projectRoot, 'src/db/trackingEnums.ts'), 'utf-8')
      const rules = fs.readFileSync(path.join(projectRoot, 'src/tracking/data/milestoneRules.ts'), 'utf-8')
      const catalog = fs.readFileSync(path.join(projectRoot, 'src/tracking/data/milestones.ts'), 'utf-8')

      const declared = [...types.slice(
        types.indexOf('export const MILESTONE_TYPES'),
        types.indexOf('] as const', types.indexOf('export const MILESTONE_TYPES'))
      ).matchAll(/"([a-z0-9_]+)"/g)].map((m) => m[1])

      const ruleBlock = rules.slice(rules.indexOf('export const MILESTONE_RULES'))
      const catalogBlock = catalog.slice(
        catalog.indexOf('export const ALL_MILESTONES'),
        catalog.indexOf('} as const satisfies')
      )

      expect(declared.length).toBeGreaterThan(100)

      const missingRule = declared.filter(
        (t) => !new RegExp(`(^|\\s)"?${t}"?:`, 'm').test(ruleBlock)
      )
      const missingInfo = declared.filter(
        (t) => !new RegExp(`(^|\\s)"?${t}"?:`, 'm').test(catalogBlock)
      )

      expect(missingRule, `Badges with no rule: ${missingRule.join(', ')}`).toHaveLength(0)
      expect(missingInfo, `Badges with no label: ${missingInfo.join(', ')}`).toHaveLength(0)
    })
  })

  describe('Icon Usage - Registry Compliance', () => {
    test('Icons used in multiple files must be registered in iconRoles.ts', () => {
      // Scan src/, components/, app/ for lucide-react imports
      const dirsToScan = [
        path.join(projectRoot, 'src'),
        path.join(projectRoot, 'components'),
        path.join(projectRoot, 'app'),
      ]

      // Collect all icon imports: icon name → set of files
      const iconUsage = new Map<string, Set<string>>()
      const importPattern = /import\s*\{([^}]+)\}\s*from\s*['"]lucide-react['"]/g
      const iconNamePattern = /\b([A-Z][a-zA-Z0-9]+)\b/g

      for (const dir of dirsToScan) {
        const files = getAllFiles(dir, /\.tsx?$/)
          .filter(f => !f.includes('/test/') && !f.includes('/tests/'))

        for (const file of files) {
          const content = fs.readFileSync(file, 'utf-8')
          const relativePath = path.relative(projectRoot, file)

          let match
          importPattern.lastIndex = 0
          while ((match = importPattern.exec(content)) !== null) {
            const importBlock = match[1]
            let iconMatch
            iconNamePattern.lastIndex = 0
            while ((iconMatch = iconNamePattern.exec(importBlock)) !== null) {
              const iconName = iconMatch[1]
              if (!iconUsage.has(iconName)) {
                iconUsage.set(iconName, new Set())
              }
              iconUsage.get(iconName)!.add(relativePath)
            }
          }
        }
      }

      // Check: any icon in 2+ files must be in UTILITY_ICONS or SEMANTIC_ICON_ROLES
      const violations: string[] = []

      for (const [iconName, files] of iconUsage.entries()) {
        if (files.size < 2) continue
        if (UTILITY_ICONS.has(iconName)) continue
        if (iconName in SEMANTIC_ICON_ROLES) continue

        violations.push(
          `${iconName} used in ${files.size} files but not registered in iconRoles.ts:\n` +
          `  ${[...files].join('\n  ')}`
        )
      }

      expect(
        violations,
        `Unregistered icons used in multiple files (add to src/shared/iconRoles.ts):\n${violations.join('\n\n')}`
      ).toHaveLength(0)
    })

    test('Custom icon components must only be used in allowed contexts', () => {
      const dirsToScan = [
        path.join(projectRoot, 'src'),
        path.join(projectRoot, 'components'),
        path.join(projectRoot, 'app'),
      ]

      const violations: string[] = []

      for (const [iconName, config] of Object.entries(CUSTOM_ICON_COMPONENTS)) {
        const importRegex = new RegExp(`import.*\\b${config.importPattern}\\b`)

        for (const dir of dirsToScan) {
          const files = getAllFiles(dir, /\.tsx?$/)
            .filter(f => !f.includes('iconRoles.ts') && !f.endsWith('GoalIcon.tsx'))

          for (const file of files) {
            const content = fs.readFileSync(file, 'utf-8')
            const relativePath = path.relative(projectRoot, file)

            if (!importRegex.test(content)) continue

            const isAllowed = config.allowedPathPatterns.some(p => p.test(relativePath))
            if (!isAllowed) {
              violations.push(
                `${iconName} imported in ${relativePath} but not in allowed paths.\n` +
                `  Allowed: ${config.allowedPathPatterns.map(p => p.source).join(', ')}`
              )
            }
          }
        }
      }

      expect(
        violations,
        `Custom icon components used outside allowed contexts (update CUSTOM_ICON_COMPONENTS in iconRoles.ts):\n${violations.join('\n\n')}`
      ).toHaveLength(0)
    })
  })

  describe('Tour data-tour Attribute Consistency', () => {
    test('all data-tour selectors in GoalsStepTour.tsx exist in GoalsStep.tsx or GoalSetupWizard tree', () => {
      const tourFile = path.join(projectRoot, 'src/goals/components/setup/GoalsStepTour.tsx')
      const stepFile = path.join(projectRoot, 'src/goals/components/setup/GoalsStep.tsx')

      const tourContent = fs.readFileSync(tourFile, 'utf-8')
      const stepContent = fs.readFileSync(stepFile, 'utf-8')

      // Extract all data-tour="xxx" values referenced in GoalsStepTour.tsx
      // Matches both: [data-tour="xxx"] selectors and data-tour="xxx" attributes
      const selectorPattern = /data-tour="([^"]+)"/g
      const tourSelectors = new Set<string>()
      let match
      while ((match = selectorPattern.exec(tourContent)) !== null) {
        tourSelectors.add(match[1])
      }

      // Extract all data-tour values defined in GoalsStep.tsx
      // Strategy: find lines with data-tour, extract all quoted strings from those lines
      const definedSelectors = new Set<string>()
      const definedRoles = new Set<string>()
      for (const line of stepContent.split('\n')) {
        if (line.includes('data-tour=') || line.includes('data-tour-role=')) {
          const strings = [...line.matchAll(/"([^"]+)"/g)].map(m => m[1])
          if (line.includes('data-tour-role')) {
            for (const s of strings) {
              if (!s.includes('/') && !s.includes(' ') && s !== 'true' && s !== 'false' && s !== 'undefined') {
                definedRoles.add(s)
              }
            }
          }
          if (line.includes('data-tour=') && !line.includes('data-tour-role') && !line.includes('data-tour-expanded')) {
            for (const s of strings) {
              if (!s.includes('/') && !s.includes(' ') && s !== 'true' && s !== 'false' && s !== 'undefined') {
                definedSelectors.add(s)
              }
            }
          }
        }
      }

      // Extract data-tour-role selectors used in tour
      const rolePattern = /data-tour-role="([^"]+)"/g
      const tourRoles = new Set<string>()
      while ((match = rolePattern.exec(tourContent)) !== null) {
        tourRoles.add(match[1])
      }

      const missingSelectors: string[] = []
      for (const sel of tourSelectors) {
        if (!definedSelectors.has(sel)) {
          missingSelectors.push(`data-tour="${sel}" used in GoalsStepTour.tsx but not defined in GoalsStep.tsx`)
        }
      }
      for (const role of tourRoles) {
        if (!definedRoles.has(role)) {
          missingSelectors.push(`data-tour-role="${role}" used in GoalsStepTour.tsx but not defined in GoalsStep.tsx`)
        }
      }

      expect(
        missingSelectors,
        `Tour references missing data-tour attributes:\n${missingSelectors.join('\n')}`
      ).toHaveLength(0)
    })
  })

})
