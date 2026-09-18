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
import { UTILITY_ICONS, SEMANTIC_ICON_ROLES, CUSTOM_ICON_COMPONENTS, CONTEXT_LOCKED_ICONS } from '../../src/shared/iconRoles'

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
     * 2026-09-02. The hub is at `/test/archive/goals-hub`;
     * `/dashboard/goals/plan` is the goal surface the product keeps.
     *
     * The Lair finished that journey on 2026-09-09: the whole slice, its repo,
     * its API route and `/test/archive/lair` are gone, Mission Control with
     * them. `/lair` is still checked below because a link to a deleted route is
     * exactly as broken now as it was when the route was merely archived.
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

          // `/lair` went the same way. `/api/lair` was deleted with the slice,
          // so there is no longer a live API path this could collide with.
          for (const match of content.matchAll(/["'`](\/lair(?!\w)[^"'`]*)["'`]/g)) {
            offenders.push(`${relativePath}: links to ${match[1]}`)
          }

          // Production linking into the archive. Archive pages may link to each
          // other, so only non-archive files are checked.
          if (relativePath.startsWith('app/test/')) continue

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

  /**
   * Loading data is one job, and it should be done in one place.
   */
  describe('Screens and the data they show', () => {
    function sourceFiles(): string[] {
      return getAllFiles(path.join(projectRoot, 'src'), /\.tsx?$/).filter((f) => !f.endsWith('.d.ts'))
    }
    /**
     * SCREENS DO NOT FETCH THEIR OWN DATA — the allowlist only shrinks.
     *
     * WHY THIS RULE EXISTS. There was no shared way to load data, so 69
     * components each wrote their own, and each made the same decision
     * separately about what to do when the request failed. Most made it the
     * same wrong way:
     *
     *     } catch {
     *       setSessions([])        // the screen now says "no sessions yet"
     *     }
     *
     * A sweep on 2026-09-08 found 59 places where a failed computation is shown
     * to a person as a plausible value — "0 of 3 sessions" to somebody who
     * trained three times, "you have no programs" to somebody three weeks into
     * one. Thirty-nine of the 59 were this one idiom. That is not 39 bugs, it is
     * one missing primitive, and the reason it keeps happening is that leaving a
     * state variable at `[]` costs nothing to type while telling the truth costs
     * a design decision every time.
     *
     * So the fix is not vigilance. It is removing the ability to write one by
     * hand: a new screen must go through the shared loader, which has a third
     * state for "could not find out". Everything below is what existed when the
     * rule was written. Migrating one means deleting its line.
     *
     * `docs/plans/silent-failures.md` listed all 59 and was deleted in the
     * documentation cleanup of 2026-09-09; `docs/plans/honest-values.md` carries
     * the plan for the rest of the app, and `docs/plans/training-rebuild.md`
     * Phase 2 covers the training screens, which are done.
     */
    const COMPONENTS_THAT_FETCH_THEIR_OWN_DATA = new Set([
      'src/exercising/components/ExercisingPage.tsx',
      'src/goals/components/GoalBadges.tsx',
      'src/goals/components/GoalCatalogPicker.tsx',
      'src/goals/components/GoalFormModal.tsx',
      'src/goals/components/GoalTimeSettingsDialog.tsx',
      'src/goals/components/GoalTriage.tsx',
      'src/goals/components/GoalsHubContent.tsx',
      'src/goals/components/HeatmapCalendar.tsx',
      'src/goals/components/WeeklyReviewDialog.tsx',
      'src/goals/components/new-goals/LabGoalEditor.tsx',
      'src/goals/components/new-goals/NewGoalsFlow.tsx',
      'src/goals/components/north-star/OneThingBox.tsx',
      'src/goals/components/north-star/SeasonBand.tsx',
      'src/goals/components/north-star/TodayTab.tsx',
      'src/goals/components/north-star/TrackTab.tsx',
      'src/goals/components/north-star/WorkoutPrograms.tsx',
      'src/goals/components/north-star/useOneThing.ts',
      'src/goals/components/setup/GoalSetupWizard.tsx',
      'src/goals/components/tree-of-life/TreeOfLifeView.tsx',
      'src/goals/components/vision-plan/GoalListReview.tsx',
      'src/goals/components/vision-plan/VisionPlanLab.tsx',
      'src/health/components/CorrelationPanel.tsx',
      'src/health/components/NutritionTracker.tsx',
      'src/health/components/SleepTracker.tsx',
      'src/health/components/WeightTracker.tsx',
      'src/health/components/WorkoutLogger.tsx',
      'src/inner-game/components/InnerGamePage.tsx',
      'src/profile/components/InteractiveWorldMap.tsx',
      'src/programs/components/CustomProgramBuilder.tsx',
      'src/programs/components/EditActiveProgram.tsx',
      'src/programs/components/HistoryTab.tsx',
      'src/programs/components/PastPrograms.tsx',
      'src/programs/components/ProgramDetail.tsx',
      'src/programs/components/ProgramsApp.tsx',
      'src/programs/components/ProgressTab.tsx',
      'src/programs/components/ProgressionView.tsx',
      'src/programs/components/RunningPrograms.tsx',
      'src/programs/components/SavedWeeks.tsx',
      'src/programs/components/StartLooseWorkout.tsx',
      'src/programs/components/TodayCard.tsx',
      'src/programs/components/TodaySessionWidget.tsx',
      'src/programs/components/TrainingCard.tsx',
      'src/programs/components/WeekStrip.tsx',
      'src/qa/components/QAPage.tsx',
      'src/scenarios/components/ChatWindow.tsx',
      'src/scenarios/components/ScenarioLab.tsx',
      'src/timetrack/components/SettingsView.tsx',
      'src/tracking/components/CustomReportBuilder.tsx',
      'src/tracking/components/DailyReviewPage.tsx',
      'src/tracking/components/FieldReportPage.tsx',
      'src/tracking/components/GoalsSummarySection.tsx',
      'src/tracking/components/QuickAddModal.tsx',
      'src/tracking/components/SessionDetailPage.tsx',
      'src/tracking/components/SessionTrackerPage.tsx',
      'src/tracking/components/WeeklyReviewPage.tsx',
      'src/tracking/components/dashboard/DailyReviewCard.tsx',
    ])


    /**
     * TEXT NOBODY CAN READ — the allowlist only shrinks.
     *
     * Two habits, both of which make a sentence technically present and
     * practically invisible: a 10px or 10.5px font, and `text-zinc-600` on a
     * dark card, which is under the contrast floor. Between them they carry
     * real information — which day is done, whether a number is ours or the
     * program author's, what a failed save actually said.
     *
     * 11px is the floor here and `text-zinc-500` the darkest grey, because
     * those are what the training screens now use. Everything listed below
     * predates the rule; fixing a file means deleting its line.
     */
    const UNREADABLE_TEXT_ALLOWED = new Set([
      'src/goals/components/north-star/AreaBuilder.tsx',
      'src/goals/components/north-star/AreaDialog.tsx',
      'src/goals/components/north-star/AreaGoals.tsx',
      'src/goals/components/north-star/AreaGoalsDialog.tsx',
      'src/goals/components/north-star/BuildBoard.tsx',
      'src/goals/components/north-star/BuildYourOwn.tsx',
      'src/goals/components/north-star/Experiences.tsx',
      'src/goals/components/north-star/FocusTab.tsx',
      'src/goals/components/north-star/GoalCard.tsx',
      'src/goals/components/north-star/GoalLibrary.tsx',
      'src/goals/components/north-star/GoalOverview.tsx',
      'src/goals/components/north-star/GuidedBuild.tsx',
      'src/goals/components/north-star/IdealDay.tsx',
      'src/goals/components/north-star/JournalTab.tsx',
      'src/goals/components/north-star/MilestonesTab.tsx',
      'src/goals/components/north-star/NorthStarFlow.tsx',
      'src/goals/components/north-star/NowTab.tsx',
      'src/goals/components/north-star/OneThingBox.tsx',
      'src/goals/components/north-star/OneThingEcho.tsx',
      'src/goals/components/north-star/OneThingTab.tsx',
      'src/goals/components/north-star/PathPicker.tsx',
      'src/goals/components/north-star/RecapTab.tsx',
      'src/goals/components/north-star/ReviewTab.tsx',
      'src/goals/components/north-star/RoutineCard.tsx',
      'src/goals/components/north-star/ScoreRow.tsx',
      'src/goals/components/north-star/SentenceBox.tsx',
      'src/goals/components/north-star/StarTab.tsx',
      'src/goals/components/north-star/StartRamps.tsx',
      'src/goals/components/north-star/TodayTab.tsx',
      'src/goals/components/north-star/TrackSchedule.tsx',
      'src/goals/components/north-star/TrackTab.tsx',
      'src/goals/components/north-star/ValueBrowser.tsx',
      'src/goals/components/north-star/ValuesSoFar.tsx',
      'src/goals/components/north-star/ValuesWork.tsx',
      'src/goals/components/north-star/WeekGrid.tsx',
      'src/goals/components/north-star/WorkoutPrograms.tsx',
      'src/programs/components/CustomProgramBuilder.tsx',
      'src/programs/components/EditActiveProgram.tsx',
      'src/programs/components/ProgramEditor.tsx',
      'src/programs/components/RunningPrograms.tsx',
      'src/programs/components/WeekStrip.tsx',
      'src/programs/components/ui.tsx',
    ])

    function unreadableText(): string[] {
      return getAllFiles(path.join(projectRoot, 'src'), /\.tsx?$/)
        .map((f) => path.relative(projectRoot, f))
        .filter((rel) => rel.startsWith('src/programs') || rel.startsWith('src/goals/components/north-star'))
        .filter((rel) => /text-\[10(\.5)?px\]|text-zinc-600/.test(fs.readFileSync(path.join(projectRoot, rel), 'utf-8')))
    }

    test('no NEW text too small or too faint to read', () => {
      const offenders = unreadableText().filter((rel) => !UNREADABLE_TEXT_ALLOWED.has(rel))
      expect(
        offenders,
        'These use a 10px font or text-zinc-600, which on a dark card is below\n' +
          'the contrast floor. Use 11px or larger and text-zinc-500 or lighter:\n' +
          offenders.join('\n'),
      ).toEqual([])
    })

    test('the unreadable-text allowlist only shrinks', () => {
      const still = new Set(unreadableText())
      const cleaned = [...UNREADABLE_TEXT_ALLOWED].filter((f) => !still.has(f))
      expect(
        cleaned,
        `These are fixed — remove them from UNREADABLE_TEXT_ALLOWED:\n${cleaned.join('\n')}`,
      ).toHaveLength(0)
    })

    test('no NEW screen fetches its own data', () => {
      const offenders = sourceFiles()
        .map((f) => path.relative(projectRoot, f))
        .filter((rel) => rel.includes('/components/'))
        .filter((rel) => fs.readFileSync(path.join(projectRoot, rel), 'utf-8').includes('fetch('))
        .filter((rel) => !COMPONENTS_THAT_FETCH_THEIR_OWN_DATA.has(rel))

      expect(
        offenders,
        'These screens load their own data, so each one decides for itself what to\n' +
          'show when the request fails — and the cheap answer ("nothing yet") is a\n' +
          'claim about the person that is not true. Use the shared loader.\n' +
          'If it genuinely has to fetch, add it to\n' +
          'COMPONENTS_THAT_FETCH_THEIR_OWN_DATA and say why:\n' +
          offenders.join('\n'),
      ).toEqual([])
    })

    test('the fetching-screens allowlist only shrinks', () => {
      const stillFetching = new Set(
        sourceFiles()
          .map((f) => path.relative(projectRoot, f))
          .filter((rel) => fs.readFileSync(path.join(projectRoot, rel), 'utf-8').includes('fetch('))
      )
      const cleaned = [...COMPONENTS_THAT_FETCH_THEIR_OWN_DATA].filter((f) => !stillFetching.has(f))
      expect(
        cleaned,
        `These no longer fetch — remove them from COMPONENTS_THAT_FETCH_THEIR_OWN_DATA:\n${cleaned.join('\n')}`,
      ).toHaveLength(0)
    })
  })

  describe('One visual language on the training screens', () => {
    /**
     * THE TRAINING SCREENS WERE A DIFFERENT APP.
     *
     * Not a metaphor: /programs shipped its own component kit painted in
     * blue-grey (zinc panels, sky-blue selections, white-on-black text) while
     * every other page in the product was slate cards, off-white text and one
     * safety-orange accent. On top of that, sixteen files had each typed out
     * their own green for "done", three files disagreed about how wide the
     * column was, controls sat at 26px, 28px and 36px where a thumb needs 44px,
     * and number boxes at 12.5px, which is under the 16px below which Safari
     * zooms the entire page when you tap one.
     *
     * None of that was one careless commit. It is what happens when every file
     * makes the same decision separately, months apart. So the rule is not
     * "use nice colours" — it is that these decisions are made in exactly one
     * place (src/programs/components/trainingStyles.ts and the app's own kit),
     * and a file that makes them again fails here.
     *
     * TRAINING_STYLE_DEBT below is every file that broke the rule on the day it
     * landed. It may SHRINK and never grow: a file that is cleaned up or
     * deleted has to come off the list, or the last test in this block fails.
     * The list is long today on purpose — the later phases of the rebuild empty
     * it — and it was produced by RUNNING this scanner, never by typing names.
     */

    /** Every file the one-language rule applies to. */
    function trainingFiles(): string[] {
      const files = getAllFiles(path.join(projectRoot, 'src/programs'), /\.tsx$/).map((f) =>
        path.relative(projectRoot, f),
      )
      return [
        ...files,
        // The Life Mastery plan's program block: a training screen that happens
        // to live in the goals slice.
        'src/goals/components/north-star/WorkoutPrograms.tsx',
        // The two shared parts built for training in this phase. They are not
        // under src/programs, and they are exactly the files a second colour
        // scheme would come back through.
        'components/BottomSheet.tsx',
        'components/ui/stepper.tsx',
      ].filter((rel) => fs.existsSync(path.join(projectRoot, rel)))
    }

    /**
     * A file's source with its comments removed.
     *
     * Every comment in these files explains the rule it is keeping, quoting the
     * very classes the rule forbids. Linting the prose would report the
     * explanation as the offence.
     */
    function code(rel: string): string {
      return fs
        .readFileSync(path.join(projectRoot, rel), 'utf-8')
        .replace(/\/\*[\s\S]*?\*\//g, '')
        .replace(/^[^\n'"`]*\/\/.*$/gm, '')
    }

    /**
     * Every opening tag of a CONTROL — the things a finger has to hit.
     *
     * A line-based scan would find almost nothing: in this codebase a
     * `className` is essentially never on the same line as its `<button`. So
     * this walks from the tag name to the `>` that closes it, ignoring `>`
     * inside `{...}` (an arrow function in an onClick) and inside quotes.
     */
    function controlTags(source: string, start: RegExp): string[] {
      const tags: string[] = []
      const finder = new RegExp(start.source, 'g')
      let match: RegExpExecArray | null
      while ((match = finder.exec(source)) !== null) {
        let depth = 0
        let quote: string | null = null
        let i = match.index
        for (; i < source.length; i++) {
          const c = source[i]
          if (quote) {
            if (c === quote) quote = null
            continue
          }
          if (c === '"' || c === "'" || c === '`') quote = c
          else if (c === '{') depth++
          else if (c === '}') depth--
          else if (c === '>' && depth === 0) break
        }
        tags.push(source.slice(match.index, i + 1))
        finder.lastIndex = i + 1
      }
      return tags
    }

    /**
     * The classes a control actually ends up with, tag or no tag.
     *
     * A well-written component almost never spells its classes out in the tag:
     * it writes `const rowClass = cn("flex min-h-14 …")` at the top and then
     * `className={rowClass}` on the element. Reading only the tag would see an
     * empty class list and pass — and the two parts this phase built,
     * ProgramRow and the sheet's rows, are both written exactly that way, as is
     * every row the later phases will copy from them. So the names used inside
     * `className={…}` are looked up as constants in the same file and their
     * values read as well.
     *
     * The lookup stops at the end of the constant's own value (brace-, bracket-
     * and quote-aware), never running on into the next line of code, so a small
     * height somewhere else in the file cannot be blamed on this control.
     */
    function initializerOf(source: string, ident: string): string {
      const found = new RegExp(`\\bconst\\s+${ident}\\s*=\\s*`).exec(source)
      if (!found) return ''
      let depth = 0
      let quote: string | null = null
      let i = found.index + found[0].length
      const start = i
      for (; i < source.length; i++) {
        const c = source[i]
        if (quote) {
          if (c === quote) quote = null
          continue
        }
        if (c === '"' || c === "'" || c === '`') quote = c
        else if (c === '(' || c === '[' || c === '{') depth++
        else if (c === ')' || c === ']' || c === '}') {
          depth--
          if (depth < 0) break
        } else if (c === '\n' && depth === 0) break
      }
      return source.slice(start, i)
    }

    function classesOf(source: string, tag: string): string {
      const expression = /className=\{([\s\S]*?)\}\s*(?:\n|\/?>|[\w-]+=)/.exec(tag)?.[1] ?? ''
      let resolved = tag
      for (const name of new Set(expression.match(/\b[A-Za-z_$][\w$]*\b/g) ?? [])) {
        resolved += ' ' + initializerOf(source, name)
      }
      return resolved
    }

    const ANY_CONTROL = /<(?:button|Button|Link|input|Input|select|textarea|Textarea)\b|<a\s/
    const TYPED_BOX = /<(?:input|Input|select|textarea|Textarea)\b/

    /** What a file may not say, anywhere in it. */
    function secondLanguage(rel: string): string[] {
      const source = code(rel)
      const found: string[] = []
      const flag = (what: string, re: RegExp) => {
        const hits = source.match(new RegExp(re.source, 'g'))
        if (hits) found.push(`${what}: ${[...new Set(hits)].slice(0, 4).join(', ')}`)
      }

      // The blue-grey kit, and the hand-typed reds and greens.
      flag(
        'a raw palette colour instead of a token',
        /\b(?:bg|text|border|divide|ring|placeholder|hover:bg|hover:text|focus:border|focus:ring)-(?:zinc|sky|slate|neutral|gray|rose|red|green|violet|white|black)\b/,
      )
      // `--accent` in this app is the sunset red, so this is a hand-rolled
      // button flashing red on hover. Use <Button>.
      flag('a hand-rolled button that flashes red on hover', /hover:(?:bg-accent|text-accent-foreground)\b/)
      // Text nobody can read. The one exception in all of training is the set
      // grid's column captions, which live in trainingStyles.ts.
      flag('text under 14px set by hand', /text-\[(?:9|9\.5|10|10\.5|11|11\.5|12|12\.5|13)px\]/)
      // Green means done, and done lives in one file.
      flag('green typed out instead of taken from DONE', /emerald-/)
      // A `tone` prop is a component carrying a second skin around with it.
      flag('a tone prop — a second skin per component', /\btone\s*(?:=|===)/)
      // The column width comes from TRAINING_COLUMN. `max-w-full` and
      // `max-w-[...]` are not column widths and are fine.
      flag('a column width of its own', /\bmax-w-(?:xs|sm|md|lg|xl|\dxl)\b/)

      // A control smaller than 44px on a phone. `sm:` sizes are desktop.
      const small = /(?<!sm:)\b(?:min-h-(?:7|8|9|10)|size-(?:4\.5|5|6|7|8|9|10)|h-(?:7|8|9|10))\b/
      const tooSmall = controlTags(source, ANY_CONTROL).filter((t) =>
        small.test(classesOf(source, t)),
      )
      if (tooSmall.length) {
        found.push(`${tooSmall.length} control(s) under 44px on a phone`)
      }

      return found
    }

    /** A typed box under 16px makes an iPhone zoom the whole page on focus. */
    function zoomingBoxes(rel: string): number {
      const source = code(rel)
      const small = /(?<!sm:)(?<!md:)\btext-(?:xs|sm|\[1[0-5](?:\.5)?px\])\b/
      return controlTags(source, TYPED_BOX).filter((t) => small.test(classesOf(source, t))).length
    }

    /**
     * SEEDED BY RUNNING THE SCANNER, NOT BY TYPING FILENAMES.
     *
     * Every one of these speaks the old language somewhere. Phases 5 to 8 of
     * the rebuild replace these screens and take their lines off this list;
     * the last step of the rebuild deletes the list itself.
     */
    const TRAINING_STYLE_DEBT = new Set<string>([
      'src/goals/components/north-star/WorkoutPrograms.tsx',
      'src/programs/components/CustomProgramBuilder.tsx',
      'src/programs/components/EditActiveProgram.tsx',
      'src/programs/components/HistoryTab.tsx',
      'src/programs/components/LiftHistory.tsx',
      'src/programs/components/PastPrograms.tsx',
      'src/programs/components/ProgramEditor.tsx',
      'src/programs/components/ProgramPicker.tsx',
      'src/programs/components/ProgramsApp.tsx',
      'src/programs/components/ProgressTab.tsx',
      'src/programs/components/ProgressionView.tsx',
      'src/programs/components/RestTimer.tsx',
      'src/programs/components/RunningPrograms.tsx',
      'src/programs/components/SavedWeeks.tsx',
      'src/programs/components/SessionNotices.tsx',
      'src/programs/components/TodayCard.tsx',
      'src/programs/components/TodaySessionWidget.tsx',
      'src/programs/components/TrainingScreen.tsx',
      'src/programs/components/WeekStrip.tsx',
      'src/programs/components/live/AddLift.tsx',
      'src/programs/components/live/FinishSheet.tsx',
      'src/programs/components/live/LiveWorkoutScreen.tsx',
      'src/programs/components/live/RestBar.tsx',
      'src/programs/components/live/SetRow.tsx',
      'src/programs/components/ui.tsx',
    ])

    test('no NEW training file speaks a second visual language', () => {
      const offenders = trainingFiles()
        .filter((rel) => !TRAINING_STYLE_DEBT.has(rel))
        .map((rel) => ({ rel, problems: secondLanguage(rel) }))
        .filter(({ problems }) => problems.length > 0)
        .map(({ rel, problems }) => `${rel}\n    ${problems.join('\n    ')}`)

      expect(
        offenders,
        'These training files speak a second visual language. Widths, card\n' +
          'padding, chips, the failed line and the colour of "done" come from\n' +
          'src/programs/components/trainingStyles.ts; buttons, inputs and tabs\n' +
          'come from components/ui. Nothing here invents its own:\n' +
          offenders.join('\n'),
      ).toEqual([])
    })

    test('no training input under 16 px on a phone', () => {
      const offenders = trainingFiles()
        .filter((rel) => !TRAINING_STYLE_DEBT.has(rel))
        .map((rel) => ({ rel, n: zoomingBoxes(rel) }))
        .filter(({ n }) => n > 0)
        .map(({ rel, n }) => `${rel}: ${n} box(es)`)

      expect(
        offenders,
        'Tapping a text box smaller than 16px makes iOS Safari zoom the whole\n' +
          'page, and it does not zoom back. Use the default size on phones and\n' +
          'shrink with sm: if you must:\n' +
          offenders.join('\n'),
      ).toEqual([])
    })

    test('the training-style debt list only shrinks', () => {
      const cleaned = [...TRAINING_STYLE_DEBT].filter(
        (rel) =>
          !fs.existsSync(path.join(projectRoot, rel)) ||
          (secondLanguage(rel).length === 0 && zoomingBoxes(rel) === 0),
      )

      expect(
        cleaned,
        'These are fixed or gone — remove them from TRAINING_STYLE_DEBT:\n' + cleaned.join('\n'),
      ).toEqual([])
    })

    test('green is only ever done', () => {
      /**
       * Orange is "do this", amber is "that did not work", green is "finished".
       * A screen that borrows green for "went up" or "good" takes the meaning
       * away from the ticks that need it — so green is not only in one file,
       * it is READ by a named few.
       */
      const MAY_SAY_DONE = new Set([
        'src/programs/components/live/SetRow.tsx', // a set you ticked
        'src/programs/components/live/RestBar.tsx', // rest is over
        'src/programs/components/SessionNotices.tsx', // the program is complete
        'src/programs/components/WeekStrip.tsx', // a day you trained
        'src/programs/components/ProgressTab.tsx', // the trained-day dot
        'src/programs/components/WorkoutReceipt.tsx', // "new best" on the finish
        'src/goals/components/north-star/WorkoutPrograms.tsx', // "everything you logged is kept"
      ])

      const offenders = trainingFiles()
        .filter((rel) => !MAY_SAY_DONE.has(rel))
        .filter((rel) => /\bDONE\./.test(code(rel)))

      expect(
        offenders,
        'These use the "done" green for something that is not done:\n' + offenders.join('\n'),
      ).toEqual([])
    })
  })

  describe('Reads that outgrow one page', () => {
    /**
     * NO NEW UNPAGED READ — the numbers only go down.
     *
     * WHAT GOES WRONG. The database will not return more than 1,000 rows in one
     * response, and it does not say so. No error, no flag, just fewer rows than
     * exist — and every list, total and chart built on them is confidently
     * wrong. It has now bitten twice on real data: a timetrack table holding
     * 32,126 rows returned 1,000, and a training account holding 2,444 sets
     * returned 1,000. The second one was worse than a wrong number: the missing
     * rows were the later sets of every workout, and the correction screen saves
     * back the list it was shown, so opening an old workout and pressing Save
     * would have deleted them for real.
     *
     * WHAT COUNTS AS BOUNDED. `.range()` (which is what `readAllRows` in
     * `src/db/paging.ts` uses), or a deliberate `.limit()`, or a read of one row
     * — `.single()`, `.maybeSingle()` — or a count with `head: true`, which
     * returns no rows at all.
     *
     * THE NUMBERS BELOW ARE A DEBT, NOT A PERMISSION. Each is how many unpaged
     * reads that file had when the rule was written. A file may only ever go
     * down, so adding one to a file already on the list still fails — which is
     * the point, because a per-file allowlist would have made every future read
     * in `healthRepo.ts` invisible. Fix one, lower the number by one.
     */
    const UNPAGED_READS_ALLOWED: Record<string, number> = {
      'src/db/dashboardRepo.ts': 1,
      'src/db/embeddingsRepo.ts': 1,
      'src/db/goalRepo.ts': 14,
      'src/db/healthRepo.ts': 9,
      'src/db/lifeAnswerRepo.ts': 1,
      'src/db/lifeChapterRepo.ts': 1,
      'src/db/programDraftRepo.ts': 1,
      'src/db/programRepo.ts': 5,
      'src/db/scenarioRepo.ts': 1,
      'src/db/trackingRepo.ts': 12,
      'src/db/valueComparisonRepo.ts': 2,
      'src/db/valuesRepo.ts': 3,
    }

    /** Comments and string bodies blanked, newlines kept so lines still line up. */
    function stripNonCode(src: string): string {
      let out = ''
      let i = 0
      const blank = (t: string) => t.replace(/[^\n]/g, ' ')
      while (i < src.length) {
        const c = src[i]
        const n = src[i + 1]
        if (c === '/' && n === '/') {
          const j = src.indexOf('\n', i)
          const end = j === -1 ? src.length : j
          out += blank(src.slice(i, end))
          i = end
          continue
        }
        if (c === '/' && n === '*') {
          const j = src.indexOf('*/', i + 2)
          const end = j === -1 ? src.length : j + 2
          out += blank(src.slice(i, end))
          i = end
          continue
        }
        if (c === '"' || c === "'" || c === '`') {
          let j = i + 1
          while (j < src.length && src[j] !== c) j += src[j] === '\\' ? 2 : 1
          const end = Math.min(j + 1, src.length)
          out += src.slice(i, end)
          i = end
          continue
        }
        out += c
        i++
      }
      return out
    }

    /**
     * The whole chained expression starting at a `.from(`.
     *
     * Bracket-aware, because `.select('*, workout_sets(*)')` and a `{ count }`
     * argument both contain the characters a naive scan would stop at. It ends
     * at a `;`, or at a newline whose next line does not continue the chain.
     */
    function chainAt(src: string, start: number): string {
      let depth = 0
      let i = start
      for (; i < src.length; i++) {
        const c = src[i]
        if ('([{'.includes(c)) depth++
        else if (')]}'.includes(c)) {
          if (depth === 0) break
          depth--
        } else if (depth === 0 && c === ';') break
        else if (depth === 0 && c === '\n') {
          const next = src.slice(i + 1).match(/^\s*(\S)/)
          if (!next || !['.', ')', ',', ']'].includes(next[1])) break
        }
      }
      return src.slice(start, i)
    }

    const BOUNDED = [
      /\.limit\(/,
      /\.range\(/,
      /\.single\(/,
      /\.maybeSingle\(/,
      /head:\s*true/,
      /\.insert\(/,
      /\.update\(/,
      /\.upsert\(/,
      /\.delete\(/,
    ]

    function unpagedReads(): Record<string, number> {
      const counts: Record<string, number> = {}
      for (const file of getAllFiles(path.join(projectRoot, 'src/db'), /\.ts$/)) {
        const rel = path.relative(projectRoot, file)
        const src = stripNonCode(fs.readFileSync(file, 'utf-8'))
        let idx = -1
        while ((idx = src.indexOf('.from(', idx + 1)) !== -1) {
          const chain = chainAt(src, idx)
          if (!/\.select\(/.test(chain)) continue
          if (BOUNDED.some((r) => r.test(chain))) continue
          counts[rel] = (counts[rel] ?? 0) + 1
        }
      }
      return counts
    }

    test('no NEW read that asks for more rows than the database will return', () => {
      const counts = unpagedReads()
      const offenders = Object.entries(counts)
        .filter(([rel, n]) => n > (UNPAGED_READS_ALLOWED[rel] ?? 0))
        .map(([rel, n]) => `${rel}: ${n}, allowed ${UNPAGED_READS_ALLOWED[rel] ?? 0}`)

      expect(
        offenders,
        'These read a table with no upper bound. Past 1,000 rows the database\n' +
          'silently returns 1,000 and the answer is quietly wrong — a shortened\n' +
          'history, a total that stops growing, a streak that resets.\n' +
          'Use readAllRows from src/db/paging.ts, or say why one page is enough\n' +
          'with an explicit .limit():\n' +
          offenders.join('\n'),
      ).toEqual([])
    })

    test('the unpaged-read allowance only shrinks', () => {
      const counts = unpagedReads()
      const overstated = Object.entries(UNPAGED_READS_ALLOWED)
        .filter(([rel, allowed]) => (counts[rel] ?? 0) < allowed)
        .map(([rel, allowed]) => `${rel}: now ${counts[rel] ?? 0}, allowance still ${allowed}`)

      expect(
        overstated,
        `Some of these are fixed. Lower the numbers in UNPAGED_READS_ALLOWED:\n${overstated.join('\n')}`,
      ).toEqual([])
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

    test('context-locked icons are only imported where their role lives', () => {
      /**
       * A ROLE IS A PLACE, NOT JUST A NAME.
       *
       * The test above only asks whether an icon used in two files is written
       * down in the registry. It never asks whether the second file is doing
       * the job the icon was registered for — so the stopwatch, registered for
       * the Time-tracker tab, was picked up by the live workout's rest bar and
       * nothing said a word. The rules require a yes before an icon is reused
       * in a new context; this is what actually asks for one.
       */
      const dirsToScan = ['src', 'components', 'app']
      const importPattern = /import\s*\{([^}]+)\}\s*from\s*['"]lucide-react['"]/g

      const violations: string[] = []

      for (const [iconName, allowed] of Object.entries(CONTEXT_LOCKED_ICONS)) {
        const named = new RegExp(`\\b${iconName}\\b`)

        for (const dir of dirsToScan) {
          const files = getAllFiles(path.join(projectRoot, dir), /\.tsx?$/)
            .filter((f) => !f.includes('/test/') && !f.includes('/tests/'))

          for (const file of files) {
            const content = fs.readFileSync(file, 'utf-8')
            const relativePath = path.relative(projectRoot, file)

            let imports = false
            importPattern.lastIndex = 0
            let match
            while ((match = importPattern.exec(content)) !== null) {
              if (named.test(match[1])) imports = true
            }
            if (!imports) continue

            if (!allowed.some((p) => p.test(relativePath))) {
              violations.push(
                `${iconName} imported in ${relativePath}, which is not one of its roles.\n` +
                  `  Allowed: ${allowed.map((p) => p.source).join(', ')}`,
              )
            }
          }
        }
      }

      expect(
        violations,
        'A registered icon has been reused somewhere its role does not cover.\n' +
          'Reusing an icon in a new context needs the owner\'s yes first — ask,\n' +
          'then add the file to CONTEXT_LOCKED_ICONS in src/shared/iconRoles.ts:\n' +
          violations.join('\n\n'),
      ).toHaveLength(0)
    })

    test('the context-locked icon lists only shrink', () => {
      // A pattern that matches nothing is a file that has been deleted or has
      // stopped using the icon — the list has to come down with it, or it slowly
      // becomes a list of permissions nobody is using and nobody can audit.
      const importPattern = /import\s*\{([^}]+)\}\s*from\s*['"]lucide-react['"]/g
      const allFiles = ['src', 'components', 'app'].flatMap((dir) =>
        getAllFiles(path.join(projectRoot, dir), /\.tsx?$/)
          .filter((f) => !f.includes('/test/') && !f.includes('/tests/'))
          .map((f) => path.relative(projectRoot, f)),
      )

      const stale: string[] = []
      for (const [iconName, allowed] of Object.entries(CONTEXT_LOCKED_ICONS)) {
        const named = new RegExp(`\\b${iconName}\\b`)
        const importers = allFiles.filter((rel) => {
          const content = fs.readFileSync(path.join(projectRoot, rel), 'utf-8')
          importPattern.lastIndex = 0
          let match
          while ((match = importPattern.exec(content)) !== null) {
            if (named.test(match[1])) return true
          }
          return false
        })

        for (const pattern of allowed) {
          if (!importers.some((rel) => pattern.test(rel))) {
            stale.push(`${iconName}: ${pattern.source} matches no file that imports it`)
          }
        }
      }

      expect(
        stale,
        `These entries are spent — remove them from CONTEXT_LOCKED_ICONS:\n${stale.join('\n')}`,
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
