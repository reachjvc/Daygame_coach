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
import * as ts from 'typescript'
import { UTILITY_ICONS, SEMANTIC_ICON_ROLES, CUSTOM_ICON_COMPONENTS, CONTEXT_LOCKED_ICONS } from '../../src/shared/iconRoles'

const projectRoot = path.resolve(__dirname, '../..')

/**
 * Grandfathered violations — existing files that violate rules. Remove items
 * from these lists as they get fixed.
 *
 * EVERY LIST HERE SHRINKS, AND TWO SHAPES DO THAT JOB. Some have a separate
 * `test('… only shrinks')` of their own; the rest carry a second `expect` at
 * the foot of the guard test itself, reading "These are fixed or gone — remove
 * them from X". The second shape is deliberate and is the better of the two,
 * because both halves read the same scan and so cannot disagree about which
 * files were looked at. It is also invisible to a grep for `test(`, which has
 * already made one reviewer report these lists as unguarded when they are not.
 * Do not "fix" that by splitting them apart.
 *
 * Either shape catches an entry for a file that no longer exists: a deleted
 * file is never scanned, so it never lands in the still-offending set, so the
 * stale filter flags it. Proven by planting a dead entry in each list and
 * watching all three tests go red.
 */
const ALLOWED_LONG_ROUTES = new Set([
  'app/api/inner-game/comparisons/route.ts',
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

const ALLOWED_DIRECT_GET_USER = new Set([
  // Server pages that redirect themselves; each needs a page-shaped facade
  // (a redirect, not a 401 JSON body) before it can move.
  'app/dashboard/articles/page.tsx',
  'app/dashboard/inner-game/page.tsx',
  'app/dashboard/qa/page.tsx',
  'app/dashboard/settings/page.tsx',
  'app/dashboard/time/page.tsx',
  'app/life-mastery/layout.tsx',
  'app/life-mastery/page.tsx',
  'app/preferences/archetypes/page.tsx',
  'app/preferences/page.tsx',
  'app/test/archive/goals-hub/page.tsx',
  // Renders a signed-out landing page instead of redirecting — wants
  // optionalUserId(), and a browser check, because it is the front page.
  'app/page.tsx',
  // Runs in the browser. A server-side facade cannot serve it; leaving it here
  // is a decision, not debt.
  'app/auth/reset-password/page.tsx',
  // Server components and actions, which return neither a Response nor a
  // redirect in the shape the API facade produces.
  'src/dashboard/components/DashboardPage.tsx',
  'src/scenarios/components/ScenariosPage.tsx',
  'src/profile/actions.ts',
  'src/settings/actions.ts',
  'src/profile/loginDestinationService.ts',
  // Authenticates with getSession() rather than getUser(), which is why the
  // first version of this guard could not see it. Same job as the pages above.
  'app/dashboard/tracking/layout.tsx',
  // Reads the provider's own user table by id via the ADMIN api
  // (`auth.admin.getUserById`) — a third spelling, found by an independent review
  // on 2026-09-26 after two versions of this guard missed it. It breaks outright
  // when the provider changes, so it is part of the port, not an exception to it.
  'src/api_ai/apiAiService.ts',
  // Inside src/db/ already — the facade's own neighbourhood. Note this makes
  // "swapping the provider is a ONE-file change" a TWO-file change.
  'src/db/profilesRepo.ts',
])

const ALLOWED_TYPE_EXPORTS = new Set([
  // --- src/programs, seeded when `programs` joined the scanned slices. Each
  // one is a type that belongs WITH its code rather than in the slice's shared
  // vocabulary; the list may only shrink.
  //
  // A component's own props, read by nothing else.
  'src/programs/components/live/SetRow.tsx',
  // Unions OF the shared types, for narrowing a schedule's days — they describe
  // the customiser's view of types.ts rather than adding to it.
  'src/programs/customize.ts',
  // The outcomes of this hook's own actions: "saved | queued | refused".
  'src/programs/hooks/useLiveWorkout.ts',
  // The ok/not-ok shape every program button answers with.
  'src/programs/programActions.ts',
  // What the text parser returns, including where each problem was.
  'src/programs/programText.ts',
  // One settings record, read back by the screen that writes it.
  'src/programs/trainingSettings.ts',

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
      const stillLong = new Set<string>()

      for (const file of routeFiles) {
        const content = fs.readFileSync(file, 'utf-8')
        const lineCount = countCodeLines(content)
        const relativePath = path.relative(projectRoot, file)

        // 50 lines is generous - the rule says 30, but we allow some buffer
        if (lineCount > 50) {
          if (ALLOWED_LONG_ROUTES.has(relativePath)) stillLong.add(relativePath)
          else violations.push(`${relativePath}: ${lineCount} lines (max 50)`)
        }
      }

      expect(violations, `NEW API routes too long (not in allowlist):\n${violations.join('\n')}`).toHaveLength(0)

      /**
       * AND THE ALLOWLIST ONLY SHRINKS — the half that was missing.
       *
       * An entry whose route was shortened, or deleted, is a free pass sitting
       * there waiting for the violation to come back: the file could grow past
       * 50 lines again and this test would stay green. It had one, for a route
       * deleted in the September 2026 cleanup. Asserted off the SAME scan
       * rather than a second one, so the rule for "too long" cannot drift
       * between the two halves.
       */
      const staleAllowances = [...ALLOWED_LONG_ROUTES].filter((f) => !stillLong.has(f))
      expect(
        staleAllowances,
        `These are fixed or gone — remove them from ALLOWED_LONG_ROUTES:\n${staleAllowances.join('\n')}`,
      ).toHaveLength(0)
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
    /**
     * `programs` was absent, and so the type rule never looked at the gym.
     *
     * `TrainingCardState`, `LiftProgress` and `PlateLoad` all lived in
     * `programsService.ts` for months with nothing noticing — the one slice
     * whose types the Tracking card, the Training page and the live screen all
     * read.
     */
    const slices = ['qa', 'inner-game', 'scenarios', 'tracking', 'profile', 'settings', 'articles', 'programs']

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
      const stillExporting = new Set<string>()

      for (const slice of slices) {
        const sliceDir = path.join(projectRoot, 'src', slice)
        if (!fs.existsSync(sliceDir)) continue

        const files = getAllFiles(sliceDir, /\.tsx?$/)
          .filter(f => !f.endsWith('types.ts'))

        // Act: Check for type exports
        for (const file of files) {
          const content = fs.readFileSync(file, 'utf-8')
          const relativePath = path.relative(projectRoot, file)

          // Look for exported type/interface declarations
          if (/export\s+(type|interface)\s+\w+/.test(content)) {
            // Allow re-exports from types.ts
            if (!/export.*from ['"].*types['"]/.test(content)) {
              if (ALLOWED_TYPE_EXPORTS.has(relativePath)) stillExporting.add(relativePath)
              else violations.push(`${relativePath}: exports types (should be in types.ts)`)
            }
          }
        }
      }

      // Assert
      expect(violations, `NEW type exports outside types.ts (not in allowlist):\n${violations.join('\n')}`).toHaveLength(0)

      // And the allowlist only shrinks. Same scan, so the two halves agree.
      const staleAllowances = [...ALLOWED_TYPE_EXPORTS].filter((f) => !stillExporting.has(f))
      expect(
        staleAllowances,
        `These are fixed or gone — remove them from ALLOWED_TYPE_EXPORTS:\n${staleAllowances.join('\n')}`,
      ).toHaveLength(0)
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
        // COMMENTS BLANKED, like the other guards in this file. `dateUtils.ts`
        // was skipped by name for documenting the pattern; the moment a second
        // file explained the same rule in its own comment, this fired on the
        // explanation rather than on any code.
        const content = fs
          .readFileSync(file, 'utf-8')
          .replace(/\/\*[\s\S]*?\*\//g, '')
          .replace(/\/\/[^\n]*/g, '')
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
              .replace(/\/\*[\s\S]*?\*\//g, '')
              .replace(/\/\/[^\n]*/g, '')
              .includes('toISOString().split("T")[0]')
          })
      )
      const cleaned = [...UTC_DATE_SHIFT_ALLOWED].filter((f) => !stillOffending.has(f))
      expect(
        cleaned,
        `These are fixed — remove them from UTC_DATE_SHIFT_ALLOWED:\n${cleaned.join('\n')}`
      ).toHaveLength(0)
    })

    /**
     * NOBODY TAKES "TODAY" FROM THE SERVER'S OWN CLOCK.
     *
     * In plain terms: the server runs on UTC. Asking it what day it is gives
     * the wrong answer for everybody who does not live there — a Copenhagen
     * lifter's 00:30 Tuesday personal best was filed on Monday, and a Los
     * Angeles one's 18:00 Monday on Tuesday. The day has to come from the
     * account's own timezone (`getUserTimezone`), which means it is passed IN
     * to anything that formats it.
     *
     * `detectPersonalRecords` is why this exists. Its day was an optional
     * argument that fell back to `toDateISO(new Date())`. Every caller happened
     * to pass the account's day, so the fall-back was unreachable and no test
     * could go red for it — it sat there waiting for the next caller to forget.
     * No allowlist: there is no correct use of it.
     */
    /**
     * THREE SPELLINGS, AND IT KNEW ONE. `toDateISO(new Date())` was the only
     * shape checked, so `new Date().toISOString().slice(0, 10)` — the same
     * thing, one call lower down — went unseen. And `sourceFiles()` is `src`
     * only, while the route test two blocks below scans `['src', 'app',
     * 'components']`: the CSV export, which had the bug and already held the
     * account's timezone, sat in `app/` where no date guard has ever looked.
     */
    const TODAY_FROM_A_CLOCK = [
      /toDateISO\(\s*new Date\(\s*\)\s*\)/,
      /new Date\(\s*\)\.toISOString\(\)\.slice\(\s*0,\s*10\s*\)/,
      /new Date\(\s*\)\.toISOString\(\)\.split\("T"\)\[0\]/,
      /new Date\(\s*\)\.toISOString\(\)\.substring\(\s*0,\s*10\s*\)/,
    ]

    /**
     * Sites still taking today from a clock and converting it through UTC.
     * All three are BROWSER clocks, which is the milder half of the fault —
     * `new Date()` there is the person's own time and only `toISOString()`
     * shifts it — and all three belong to other slices. They may SHRINK.
     */
    const CLOCK_DAY_ALLOWED = new Set([
      'src/exercising/exercisingService.ts',
      'src/goals/components/change-your-life/RepLadder.tsx',
      'src/timetrack/components/SettingsView.tsx',
    ])

    /** Every file a date rule applies to: the same three roots as the routes. */
    function datedFiles(): string[] {
      return ['src', 'app', 'components'].flatMap((root) =>
        getAllFiles(path.join(projectRoot, root), /\.tsx?$/).filter((f) => !f.endsWith('.d.ts'))
      )
    }

    /** One scan, so the enforcement and the only-shrinks half cannot disagree. */
    function takingTodayFromAClock(): Set<string> {
      const found = new Set<string>()
      for (const file of datedFiles()) {
        const rel = path.relative(projectRoot, file).replace(/\\/g, '/')
        if (rel === 'src/shared/dateUtils.ts') continue // documents the pattern
        const src = fs
          .readFileSync(file, 'utf-8')
          .replace(/\/\*[\s\S]*?\*\//g, '')
          .replace(/\/\/[^\n]*/g, '')
        if (TODAY_FROM_A_CLOCK.some((shape) => shape.test(src))) found.add(rel)
      }
      return found
    }

    test('no day is taken from the server clock', () => {
      const offenders = [...takingTodayFromAClock()].filter((f) => !CLOCK_DAY_ALLOWED.has(f)).sort()
      expect(
        offenders,
        'Taking today from the running process\'s clock and converting it through\n' +
          'UTC. On the server that clock IS UTC; in a browser toISOString() shifts\n' +
          'the person\'s own evening into tomorrow. Take the account\'s timezone\n' +
          '(getUserTimezone) and use getTodayInTimezone(tz), or take the day as a\n' +
          'parameter:\n' +
          offenders.join('\n'),
      ).toEqual([])
    })

    test('the clock-day allowlist only shrinks', () => {
      const stillOffending = takingTodayFromAClock()
      const cleaned = [...CLOCK_DAY_ALLOWED].filter((f) => !stillOffending.has(f)).sort()
      expect(
        cleaned,
        `These are fixed or gone — remove them from CLOCK_DAY_ALLOWED:\n${cleaned.join('\n')}`,
      ).toEqual([])
    })

    /**
     * HOW A DATE IS SPELLED MUST NOT DEPEND ON WHO IS ASKING.
     *
     * `toLocaleDateString(undefined, …)` and `toLocaleDateString([], …)` ask
     * the RUNTIME for the locale. On the server that is the host's — en-US on
     * Vercel — and in the browser it is the person's. A server-rendered date
     * that disagrees with the client's is a hydration failure, and React
     * throws the whole subtree away.
     *
     * Measured on `/programs` with one finished program, 2026-09-27: en-US
     * clean, en-GB / da-DK / de-DE all HYDRATION FAILED, React naming
     * `<PastPrograms> → <ProgramRow>` and `+ 27 Sept` / `- Sep 27`. The
     * account this app exists for is in Europe/Copenhagen, so the owner's own
     * training page rebuilt itself on every load. `DISPLAY_LOCALE` is the one
     * answer; the zone is a separate question and is already passed in.
     *
     * The allowlist is the slices not yet converted. It may SHRINK.
     */
    const RUNTIME_LOCALE_ALLOWED = new Set([
      // WIDENED 2026-09-27 from 11 to 34, because the regex above was widened
      // to see a BARE `toLocaleDateString()`. These are not new faults; they
      // are the ones the first version of this guard could not see. The
      // training slice is at zero and stays there — everything below is
      // tracking, goals, admin and the /test pages, and the list may only
      // shrink.
      'app/admin/ai-usage/page.tsx',
      'app/dashboard/tracking/history/page.tsx',
      'app/test/articles/page.tsx',
      'app/test/curve-customization/_components/CurveSVG.tsx',
      'app/test/curve-customization/_components/VariantCyberpunk.tsx',
      'app/test/curve-customization/_components/VariantFrost.tsx',
      'app/test/curve-customization/_components/VariantGold.tsx',
      'app/test/curve-customization/_components/VariantNeon.tsx',
      'app/test/curve-customization/_components/VariantZen.tsx',
      'app/test/goals/variant-c/GoalDetailPanel.tsx',
      'app/test/goalsv2/variant-h/MomentumComplete.tsx',
      'src/goals/components/DailyActionView.tsx',
      'src/goals/components/GoalCard.tsx',
      'src/goals/components/HabitRampEditor.tsx',
      'src/goals/components/MilestoneCurveEditor.tsx',
      'src/goals/components/PeriodRollupRow.tsx',
      'src/goals/components/change-your-life/DeepDiveView.tsx',
      'src/goals/components/change-your-life/shared.tsx',
      'src/goals/components/new-goals/GoalsConfigStep.tsx',
      'src/health/components/NutritionTracker.tsx',
      'src/health/components/SleepTracker.tsx',
      'src/health/components/WeightTracker.tsx',
      'src/settings/components/SettingsPage.tsx',
      'src/tracking/components/DailyReviewPage.tsx',
      'src/tracking/components/FieldReportPage.tsx',
      'src/tracking/components/SessionDetailPage.tsx',
      'src/tracking/components/SessionTrackerPage.tsx',
      'src/tracking/components/WeeklyReviewPage.tsx',
      'src/tracking/components/dashboard/AchievementsModal.tsx',
      'src/tracking/components/dashboard/RecentFieldReportsCard.tsx',
      'src/tracking/components/dashboard/RecentMilestonesCard.tsx',
      'src/tracking/components/dashboard/RecentSessionsCard.tsx',
      'src/tracking/components/dashboard/WeeklyReviewsCard.tsx',
      'src/tracking/metricsService.ts',
    ])

    /** One scan, so enforcement and only-shrinks cannot disagree. */
    function spellingADateAtRuntime(): Set<string> {
      const found = new Set<string>()
      for (const file of datedFiles()) {
        const rel = path.relative(projectRoot, file).replace(/\\/g, '/')
        // COMMENTS BLANKED. `dateUtils.ts` and `TrainingCard.tsx` both explain
        // this exact rule in prose, and a guard that fires on its own
        // explanation is a fault this file has had twice already.
        const src = withoutCommentsOrStrings(fs.readFileSync(file, 'utf-8'), rel)
        /**
         * THREE SPELLINGS, AND THE FIRST VERSION KNEW TWO. It required an
         * explicit first argument and a comma, so the BARE call — the same
         * bug with less typing — was invisible to it. Four live sites walked
         * straight past it on the day it was written: two `toLocaleString()`
         * for the volume figure, on the very screens the receipt had just
         * been reconciled with, and two `toLocaleDateString()` in
         * `ProgressionView`. A guard's regex is its enumeration, and an
         * enumeration is the first thing to check, not the last.
         */
        if (/toLocale(Date|Time)?String\(\s*(\)|(undefined|\[\])\s*,)/.test(src)) found.add(rel)
      }
      return found
    }

    test('no date is spelled in whichever locale the runtime happens to have', () => {
      const offenders = [...spellingADateAtRuntime()]
        .filter((f) => !RUNTIME_LOCALE_ALLOWED.has(f))
        .sort()
      expect(
        offenders,
        'Pass DISPLAY_LOCALE. An unpinned locale is spelled one way on the\n' +
          'server and another in the browser, which is a hydration failure for\n' +
          'every person outside the host\'s locale:\n' +
          offenders.join('\n'),
      ).toEqual([])
    })

    test('the runtime-locale allowlist only shrinks', () => {
      const still = spellingADateAtRuntime()
      const cleaned = [...RUNTIME_LOCALE_ALLOWED].filter((f) => !still.has(f)).sort()
      expect(
        cleaned,
        `These are fixed or gone — remove them from RUNTIME_LOCALE_ALLOWED:\n${cleaned.join('\n')}`,
      ).toEqual([])
    })

    test('no NEW hand-rolled week boundary', () => {
      const offenders: string[] = []
      const stillHandRolling = new Set<string>()
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
            if (HAND_ROLLED_WEEK_ALLOWED.has(relativePath)) stillHandRolling.add(relativePath)
            else offenders.push(`${relativePath}:${i + 1}`)
            break
          }
        }
      }

      expect(
        offenders,
        `Hand-rolled week boundary. Use periodStartFor("weekly", zonedDate).\n${offenders.join('\n')}`
      ).toHaveLength(0)

      // And the allowlist only shrinks. Same scan, so the two halves agree.
      const staleAllowances = [...HAND_ROLLED_WEEK_ALLOWED].filter((f) => !stillHandRolling.has(f))
      expect(
        staleAllowances,
        `These are fixed or gone — remove them from HAND_ROLLED_WEEK_ALLOWED:\n${staleAllowances.join('\n')}`,
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

    /**
     * EVERY ROUTE THAT CAN REFUSE A WORKOUT ANSWERS THROUGH ONE HELPER.
     *
     * `src/programs/errors.ts` says why in its own header: "the alternative is
     * each route deciding for itself whether to pass a `code` — and the screen
     * then acts on the workout being gone in the three routes that remembered
     * and not in the two that did not." It happened, and then the guard
     * written to stop it happening had the same fault as the thing it guarded.
     *
     * THE FIRST VERSION SCANNED `app/api/workouts`. Its title said "every
     * workout write route" and its scan said "one directory" — so it could not
     * see `DELETE /api/health/workout` or `DELETE /api/programs/enrollments/
     * [id]/log/[logId]`, which are the OTHER TWO routes that delete a workout
     * and are named as a pair in `src/db/workoutLifecycle.ts`'s own comment.
     * Both did exactly what the guard bans. A reviewer found it by re-running
     * the guard's own scan with the root widened by one level.
     *
     * SO THE SET IS DERIVED, NOT LISTED. Any exported repo function whose body
     * raises a workout refusal is one, and so is anything that calls one —
     * `reviseSessionLog` only delegates to `removeProgramSession`, which is
     * why a one-hop scan still missed its route. A route that names any of
     * them and exports a write verb must answer through `workoutErrorResponse`.
     *
     * There is no allowlist. `POST /api/workouts` looked like it needed one —
     * it hands back the workout already open, which no shared helper can
     * express — but it keeps its `StartRefused` branch and uses the helper for
     * everything else, which is how its `CouldNotTell` stopped being a 500.
     */
    const REFUSAL_REPOS = [
      'src/db/workoutRepo.ts',
      'src/db/healthRepo.ts',
      'src/db/programRepo.ts',
      // Saved weeks start a program, which is the same refusal.
      'src/db/programDraftRepo.ts',
    ]

    /**
     * A refusal or an unanswerable read, however it is spelled.
     *
     * `CouldNotTell(` and `readAllRows(` were missing. Since `readAllRows`
     * started raising `CouldNotTell`, EVERY paged read can produce a 503 —
     * so the set of routes that must answer through the shared helper is
     * much larger than the five workout shapes this listed, and the guard
     * was blind to exactly the routes that turned out to be wrong:
     * `PATCH …/enrollments/[id]/schedule` answered a hard 500 for
     * everything, and `POST …/drafts/[id]/start` a hard 422.
     *
     * A guard's seed list is its enumeration, and an enumeration is the
     * first thing to check. This is the third one in this file to be found
     * too narrow in two days.
     */
    const RAISES_A_REFUSAL = [
      /WorkoutGone\(/,
      /OPEN_WORKOUT_REFUSAL/,
      /refuseWrite\(/,
      /requireLive\(/,
      /liveAfterWriting\(/,
      /CouldNotTell\(/,
      /readAllRows\(/,
    ]

    /** Exported repo functions that can refuse a workout, and their callers. */
    function functionsThatRefuseAWorkout(): Set<string> {
      const bodies = new Map<string, string>()
      for (const rel of REFUSAL_REPOS) {
        const src = fs.readFileSync(path.join(projectRoot, rel), 'utf-8')
        const found: [string, number][] = []
        for (const m of src.matchAll(/export (?:async )?function (\w+)/g)) {
          found.push([m[1], m.index ?? 0])
        }
        found.forEach(([name, at], i) => {
          bodies.set(name, src.slice(at, i + 1 < found.length ? found[i + 1][1] : src.length))
        })
      }
      const refusing = new Set(
        [...bodies].filter(([, body]) => RAISES_A_REFUSAL.some((r) => r.test(body))).map(([n]) => n)
      )
      // Transitively: a function that CALLS one can refuse too. Without this
      // the scan missed `reviseSessionLog`, whose whole body is one delegation.
      for (let pass = 0; pass < 8; pass++) {
        const before = refusing.size
        for (const [name, body] of bodies) {
          if (refusing.has(name)) continue
          if ([...refusing].some((t) => new RegExp(`\\b${t}\\(`).test(body))) refusing.add(name)
        }
        if (refusing.size === before) break
      }
      return refusing
    }

    /** Every API route that writes and can produce a workout refusal. */
    function routesThatCanRefuseAWorkout(): { rel: string; src: string; via: string[] }[] {
      const refusing = [...functionsThatRefuseAWorkout()]
      return getAllFiles(path.join(projectRoot, 'app/api'), /(^|[\\/])route\.ts$/)
        .map((file) => ({
          rel: path.relative(projectRoot, file).replace(/\\/g, '/'),
          src: fs.readFileSync(file, 'utf-8'),
        }))
        .filter(({ src }) => /export async function (POST|PATCH|PUT|DELETE)\b/.test(src))
        .map((r) => ({ ...r, via: refusing.filter((n) => new RegExp(`\\b${n}\\b`).test(r.src)) }))
        .filter(({ via }) => via.length > 0)
    }

    test('the scan finds the routes it is about', () => {
      // An empty scan passes every assertion below it for ever. The three
      // under `app/api/workouts` plus the two outside it that delete a workout.
      const routes = routesThatCanRefuseAWorkout()
      expect(routes.length, 'the scan found nothing — it is broken').toBeGreaterThanOrEqual(5)
      const paths = routes.map((r) => r.rel)
      for (const outsider of [
        'app/api/health/workout/route.ts',
        'app/api/programs/enrollments/[id]/log/[logId]/route.ts',
      ]) {
        expect(paths, `${outsider} deletes a workout and must be in scope`).toContain(outsider)
      }
    })

    test('every route that can refuse a workout answers through one helper', () => {
      const offenders = routesThatCanRefuseAWorkout()
        .filter(({ src }) => !src.includes('workoutErrorResponse'))
        .map(({ rel, via }) => `${rel} (via ${via.join(', ')})`)
        .sort()
      expect(
        offenders,
        'These can throw a workout refusal and answer it themselves.\n' +
          'workoutErrorResponse gives the body AND the status together; asking\n' +
          'statusFor for the number and writing the body by hand is what dropped\n' +
          '`code: "workout_gone"` from /revise and flattened CouldNotTell to 500\n' +
          'on /api/workouts:\n' +
          offenders.join('\n'),
      ).toEqual([])
    })

    test('and none of them also splits the status from the body by hand', () => {
      // `statusFor` alone leaves the body to the route. Comments are blanked:
      // the revise route's docblock NAMES `statusFor` while explaining why it
      // stopped using it, and a guard that reads its own explanation as a
      // violation is the failure this file has had twice.
      const offenders = routesThatCanRefuseAWorkout()
        .filter(({ rel, src }) => withoutCommentsOrStrings(src, rel).includes('statusFor('))
        .map(({ rel }) => rel)
        .sort()
      expect(
        offenders,
        `statusFor alone leaves the body to the route. Use workoutErrorResponse:\n${offenders.join('\n')}`,
      ).toEqual([])
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
    test('the fill-in-afterwards forms do not come back', () => {
      /**
       * TWO FORMS THAT ASKED YOU TO WRITE UP A WORKOUT YOU HAD ALREADY DONE.
       *
       * "I did all of this — save it" wrote every prescribed row at its
       * prescribed weight, which is a record of what the program ASKED for
       * rather than of what happened; "Day (blank = today)" wrote a session
       * with a 45-minute duration nobody had measured. Both were untested, both
       * wrote to `workout_logs` behind the live screen's back, and between them
       * they were the reason History could disagree with the program about the
       * same session.
       *
       * They are deleted. What is left to prove is that a third one does not
       * appear — which is not a thing a test of either file can say, because
       * neither file exists. So this is a test about the app not having a
       * second way to write a workout at all.
       */
      const gone = [
        'src/programs/components/TodaySessionWidget.tsx',
        'src/health/components/WorkoutLogger.tsx',
        'src/programs/components/RestTimer.tsx',
      ].filter((rel) => fs.existsSync(path.join(projectRoot, rel)))
      expect(gone, `These were deleted and are back:\n${gone.join('\n')}`).toEqual([])

      /** Comments blanked: the sentences describing the deleted button are not it. */
      const sourceOf = (rel: string) =>
        fs
          .readFileSync(path.join(projectRoot, rel), 'utf-8')
          .replace(/\/\*[\s\S]*?\*\//g, '')
          .replace(/\/\/[^\n]*/g, '')

      const WORDS = [
        'I did all of this',
        'Did it exactly as shown',
        'Day (blank = today)',
        'duration_min: 45',
      ]
      const posting: string[] = []
      const phrases: string[] = []
      const walk = (dir: string) => {
        for (const entry of fs.readdirSync(path.join(projectRoot, dir), { withFileTypes: true })) {
          const rel = `${dir}/${entry.name}`
          if (entry.isDirectory()) {
            walk(rel)
            continue
          }
          if (!/\.tsx?$/.test(entry.name)) continue
          const src = sourceOf(rel)
          for (const word of WORDS) if (src.includes(word)) phrases.push(`${rel}: "${word}"`)
          /**
           * `/api/health/workout` has exactly one writer, and it is not a
           * component: the live screen's own path. A component POSTing there is
           * a second way to write a workout, which is the thing itself.
           */
          if (/\.tsx$/.test(rel) && /fetch\([^)]*\/api\/health\/workout[\s\S]{0,200}?method:\s*["']POST["']/.test(src)) {
            posting.push(rel)
          }
        }
      }
      for (const dir of ['src', 'app']) walk(dir)

      expect(phrases, `The write-up form's own words are back:\n${phrases.join('\n')}`).toEqual([])
      expect(
        posting,
        `These write a workout behind the live screen's back:\n${posting.join('\n')}`,
      ).toEqual([])
    })

    const COMPONENTS_THAT_FETCH_THEIR_OWN_DATA = new Set([
      // A WRITE, not a load. This rule exists because a screen that loads its
      // own data has to decide what to show when the read fails, and the cheap
      // answer ("nothing yet") is a claim about the person that is not true.
      // `DayAssignment` reads nothing: it PUTs one schedule and renders the
      // server's own refusal when it says no.
      'src/programs/components/DayAssignment.tsx',
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
      'src/inner-game/components/InnerGamePage.tsx',
      'src/profile/components/InteractiveWorldMap.tsx',
      'src/programs/components/HistoryTab.tsx',
      'src/programs/components/PastPrograms.tsx',
      'src/programs/components/ProgramDetail.tsx',
      // ProgressTab came off this list on 2026-09-23: it reads one snapshot
      // from `/api/workouts/progress` through `useLoad`, and the panel inside
      // it takes its rows as props instead of fetching three years of sets on
      // top of the year the tab had already loaded.
      'src/programs/components/ProgressionView.tsx',
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
     *
     * `src/vice` joined the scan on 2026-09-20 with NO entries on the list: the
     * 101 offending spellings it had (84 `text-zinc-600`, 17 at 10px) were
     * fixed rather than grandfathered, because the module was being given a new
     * front door and shipping a fresh screen next to unreadable old ones is how
     * a rule becomes decorative.
     */
    const UNREADABLE_TEXT_ALLOWED = new Set([
      'src/goals/components/north-star/AreaBuilder.tsx',
      'src/goals/components/north-star/AreaDialog.tsx',
      'src/goals/components/north-star/AreaGoals.tsx',
      'src/goals/components/north-star/AreaGoalsDialog.tsx',
      'src/goals/components/north-star/BuildBoard.tsx',
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
      // WorkoutPrograms came off on 2026-09-23: the 628-line second copy of
      // the training feature is a status card with no type under 12 px in it.
      // EditActiveProgram and ProgramEditor came off on 2026-09-23 — see the
      // note on TRAINING_STYLE_DEBT above.
    ])

    function unreadableText(): string[] {
      return getAllFiles(path.join(projectRoot, 'src'), /\.tsx?$/)
        .map((f) => path.relative(projectRoot, f))
        .filter(
          (rel) =>
            rel.startsWith('src/programs') ||
            rel.startsWith('src/goals/components/north-star') ||
            rel.startsWith('src/vice'),
        )
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

    /**
     * ONE PLACE ASKS THE SERVER TO OPEN A WORKOUT.
     *
     * In plain terms: three buttons — the Tracking card, the Training page's
     * today card and "start a workout now" — each wrote out the request
     * themselves. They disagreed about what to say when it failed (one said
     * "nothing was started", which is a guess and the wrong one exactly when
     * the reply gets lost), and not one of them forgot the retry key
     * afterwards. So a workout finished on the laptop left a used-up key on the
     * phone, and every later Start there was refused with the database's own
     * complaint printed on the card.
     *
     * No allowlist. A fourth Start button must use the helper.
     */
    /**
     * A BLANK BOX IS NEVER TURNED INTO A NUMBER.
     *
     * In plain terms: `Number("")` is 0. An empty weight box on a bench press
     * used to save the set as 0 kg — and the server accepts 0, because a
     * pull-up with nothing added really IS zero, so nothing downstream could
     * ever tell "unweighted" from "forgot to type it". The zero then hid inside
     * every volume total and every personal best.
     *
     * `typedNumber` (src/shared/typedNumber.ts) returns null for a blank box,
     * which is the third state every one of these forms was missing. The
     * allowlist below is the two places that still do it and the reason each is
     * safe; it may SHRINK and never grow.
     */
    const BLANK_TO_NUMBER_ALLOWED = new Set<string>([
      // Guarded by an explicit `weight.trim() !== ""` on the same line.
      // HistoryTab came off this list on 2026-09-23: the correction editor
      // moved to the workout's own page and now refuses to save a blank box
      // rather than sending `Number("") || 0` as a 0 kg set.
    ])

    function blankToNumberOffenders(): string[] {
      const dirs = ['src/programs/components', 'src/health/components']
      const hits: string[] = []
      for (const dir of dirs) {
        for (const file of getAllFiles(path.join(projectRoot, dir), /\.tsx?$/)) {
          const rel = path.relative(projectRoot, file).replace(/\\/g, '/')
          // Comments blanked, so a doc comment EXPLAINING the rule does not
          // count as breaking it.
          const src = fs
            .readFileSync(file, 'utf-8')
            .replace(/\/\*[\s\S]*?\*\//g, '')
            .replace(/\/\/[^\n]*/g, '')
          // `(?<![A-Za-z])` so `typedNumber(weight)` — the fix — is not read as
          // the bug it replaces.
          if (/(?<![A-Za-z])Number\((weight|reps|set\.weight|set\.reps)\)/.test(src)) {
            hits.push(rel)
          }
        }
      }
      return hits
    }

    test('no NEW form turns a blank box into a number', () => {
      const offenders = blankToNumberOffenders().filter(
        (rel) => !BLANK_TO_NUMBER_ALLOWED.has(rel)
      )
      expect(
        offenders,
        'Number("") is 0, so an empty weight box saves the set as 0 kg — and 0 is\n' +
          'legitimate (a pull-up with nothing added), so nothing downstream can tell\n' +
          'the two apart. Use typedNumber from src/shared/typedNumber.ts and decide\n' +
          'what null means on this lift:\n' +
          offenders.join('\n'),
      ).toEqual([])
    })

    test('the blank-to-number allowlist only shrinks', () => {
      const stillDoingIt = new Set(blankToNumberOffenders())
      const cleaned = [...BLANK_TO_NUMBER_ALLOWED].filter((f) => !stillDoingIt.has(f))
      expect(
        cleaned,
        `These no longer do it — remove them from BLANK_TO_NUMBER_ALLOWED:\n${cleaned.join('\n')}`,
      ).toHaveLength(0)
    })

    /**
     * WHAT A WORKOUT COUNTS AS IS DECIDED IN ONE PLACE.
     *
     * In plain terms: starting a workout wrote the literal "weights", so every
     * live run was stored as a gym session and the running tiles on the
     * dashboard never moved. The finish had a second write that could have
     * corrected it — except its error was thrown away and no caller ever sent a
     * value, so the whole path was dead code pretending to be a fallback.
     *
     * `sessionTypeFor` in programsService answers it now, including for a
     * workout on no program at all, so there is no case left that needs a
     * literal. No allowlist: a literal here IS the bug.
     */
    test('only sessionTypeFor decides what a workout counts as', () => {
      const offenders: string[] = []
      for (const file of getAllFiles(path.join(projectRoot, 'src/db'), /\.ts$/)) {
        const rel = path.relative(projectRoot, file).replace(/\\/g, '/')
        const src = fs
          .readFileSync(file, 'utf-8')
          .replace(/\/\*[\s\S]*?\*\//g, '')
          .replace(/\/\/[^\n]*/g, '')
        if (/session_type:\s*["'`]/.test(src)) offenders.push(rel)
      }
      expect(
        offenders,
        'A session type written out as a literal is how every live run came to be\n' +
          'stored as a gym session. Call sessionTypeFor(program) from\n' +
          'src/programs/programsService.ts — it answers for a loose workout too:\n' +
          offenders.join('\n'),
      ).toEqual([])
    })

    test('only startWorkoutRequest posts to /api/workouts', () => {
      const HELPER = 'src/programs/hooks/useLiveWorkout.ts'
      const offenders = [
        ...sourceFiles(),
        ...getAllFiles(path.join(projectRoot, 'app'), /\.tsx?$/),
      ]
        .map((f) => path.relative(projectRoot, f))
        .filter((rel) => rel !== HELPER)
        .filter((rel) => {
          const src = fs.readFileSync(path.join(projectRoot, rel), 'utf-8')
          return /fetch\(\s*(?:"\/api\/workouts"|'\/api\/workouts'|`\/api\/workouts`)/.test(src)
        })
      expect(
        offenders,
        'These post to /api/workouts directly. Call startWorkoutRequest from\n' +
          `${HELPER} instead — it is what forgets the retry key once the server\n` +
          'has answered, and what gives every Start button the same sentences:\n' +
          offenders.join('\n'),
      ).toEqual([])
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

      /**
       * A control smaller than 44px on a phone. `sm:` sizes are desktop.
       *
       * THE EXEMPTION HAS TO BE ANCHORED AT THE START OF THE CLASS. With
       * `(?<!sm:)\b`, "sm:min-h-9" was flagged anyway — not through its
       * `min-h-9` branch, which the lookbehind did exclude, but through the
       * bare `h-9` one, whose match starts after the hyphen where nothing
       * says "sm:". So the exemption this comment promises never applied to a
       * single `min-h-*` class, and the rule was quietly stricter than it
       * says. Requiring a class boundary in front makes it mean what it says.
       */
      const small = /(?:^|[\s"'`{])(?:min-h-(?:7|8|9|10)|size-(?:4\.5|5|6|7|8|9|10)|h-(?:7|8|9|10))\b/
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
      /**
       * EMPTY, and it reached empty on 2026-09-23.
       *
       * It was seeded by running the scanner rather than by typing filenames,
       * and every name on it has either been rebuilt on the app's own kit or
       * deleted with the screen it belonged to. It stays as an empty set
       * because the two assertions below are the rule, and "the allowance is
       * zero" is the strongest thing this file can say about it.
       */
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
        'src/programs/components/WorkoutReceipt.tsx', // "new best" on the finish
        'src/goals/components/north-star/WorkoutPrograms.tsx', // "everything you logged is kept"
        // Both added on 2026-09-23, when they stopped typing emerald out and
        // started reading it from `DONE` — which is the point of the constant.
        'src/programs/components/WeekStrip.tsx', // a day you trained
        'src/programs/components/live/LiveWorkoutScreen.tsx', // a set you ticked
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
      'src/db/healthRepo.ts': 6,
      'src/db/lifeAnswerRepo.ts': 1,
      'src/db/lifeChapterRepo.ts': 1,
      'src/db/programDraftRepo.ts': 1,
      'src/db/programRepo.ts': 2,
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

  /**
   * ONE OWNER FOR EVERY WRITE THAT MOVES A PROGRAM.
   *
   * WHAT GOES WRONG WITHOUT THIS, in plain language. Each of these facts — the
   * week your program runs, which program is running, what a program button did
   * — was worked out in two or three places, and the copies disagreed. A second
   * writer of the same fact is not a style problem: it is how "End program" came
   * to report success for a program that was still prescribing, and how the week
   * strip and the session card came to name different days on one screen.
   *
   * Every list here may SHRINK and may never grow.
   */
  describe('One owner for the program writes', () => {
    /** Comments blanked so a sentence about a rule is not read as the rule. */
    function codeOf(rel: string): string {
      return fs
        .readFileSync(path.join(projectRoot, rel), 'utf-8')
        .replace(/\/\*[\s\S]*?\*\//g, '')
        .replace(/\/\/[^\n]*/g, '')
    }

    function filesUnder(...dirs: string[]): string[] {
      return dirs
        .flatMap((d) => getAllFiles(path.join(projectRoot, d), /\.tsx?$/))
        .map((f) => path.relative(projectRoot, f).replace(/\\/g, '/'))
    }

    /**
     * WHICH PROGRAM IS RUNNING IS DECIDED BY THE DATABASE, NOT BY A WRITE.
     *
     * `is_active` is the difference between "this program is telling me what to
     * lift" and "this is a record of what I used to do". It used to be flipped
     * by hand in three places — end, start, restart — each of them a write of
     * its own with nothing joining it to the write beside it, which is how
     * starting a program could switch the old one off and then fail to start
     * the new one. The three database functions own it now, and this test is
     * what stops a fourth place being added.
     *
     * Scoped to `program_enrollments`: other repos write an `is_active` of
     * their own on other tables, and those are not this rule.
     */
    test('is_active is only ever changed by the database functions', () => {
      const src = codeOf('src/db/programRepo.ts')
      const writes = [...src.matchAll(/(\.insert\(|\.update\()([\s\S]{0,600}?)\)/g)]
        .filter(([, , body]) => /\bis_active\s*:/.test(body))
        .map(([whole]) => whole.slice(0, 60).replace(/\s+/g, ' '))

      expect(
        writes,
        'Starting, ending and restarting a program are start_enrollment,\n' +
          'end_enrollment and resume_enrollment. A direct write here cannot be\n' +
          'in the same transaction as the other half of what it is doing:\n' +
          writes.join('\n'),
      ).toEqual([])
    })

    /**
     * The week a program runs is written in ONE place.
     *
     * The week and the record of every week it has had must move together: the
     * schedule is what the program runs now, the replay events are the history.
     * A second writer that saved the schedule without recording it would leave
     * the history claiming the program had always looked the way it looks today,
     * which is exactly the fault that made deleting a session crash.
     */
    test('custom_schedule is written in one place', () => {
      const ALLOWED = ['src/db/programRepo.ts']
      const writers = filesUnder('src', 'app', 'components').filter((rel) =>
        // A write, not a read: the column name inside an insert, an update or an
        // rpc payload rather than in a select list.
        /(\.insert\(|\.update\(|\.rpc\()[\s\S]{0,900}?custom_schedule\s*:/.test(codeOf(rel)),
      )

      const offenders = writers.filter((rel) => !ALLOWED.includes(rel))
      expect(
        offenders,
        'These write the program week. It belongs to src/db/programRepo.ts, which\n' +
          'records the week in the replay history in the same statement — a second\n' +
          'writer loses that record:\n' +
          offenders.join('\n'),
      ).toEqual([])

      const gone = ALLOWED.filter((rel) => !writers.includes(rel))
      expect(gone, 'Fixed — remove from the allowlist:\n' + gone.join('\n')).toEqual([])
    })

    /**
     * A BUTTON THAT CHANGES A PROGRAM HAS TO LOOK AT THE ANSWER.
     *
     * End, Skip, Reset, Restart and Remove were each written as a bare
     * `await fetch(...)` followed by navigating away, so a refusal from the
     * server — "finish the workout you have open first" — looked exactly like
     * success and the screen left a program that was still running.
     *
     * `src/programs/programActions.ts` does the fetch, reads the server's
     * sentence out of the body and hands back ok/not-ok. This test is what
     * stops a screen added later going back to not looking. The allowlist is
     * empty on purpose: there is no second place this may be done.
     */
    test('program actions go through programActions.ts', () => {
      const ALLOWED = ['src/programs/programActions.ts']
      const offenders = filesUnder('src', 'components').filter((rel) => {
        if (ALLOWED.includes(rel)) return false
        const src = codeOf(rel)
        // Each fetch call, with enough of what follows to see the options object.
        return [...src.matchAll(/fetch\(([\s\S]{0,400}?)\)\s*$/gm), ...src.matchAll(/fetch\(([\s\S]{0,400})/g)].some(
          ([, call]) =>
            /\/api\/programs\/enrollments\//.test(call) &&
            (/method:\s*["'`]DELETE["'`]/.test(call) || /\/action`/.test(call) || /\/resume`/.test(call)),
        )
      })

      expect(
        offenders,
        'These end, skip, reset, restart or remove a program with a raw fetch.\n' +
          'Use src/programs/programActions.ts, which reads the server\'s refusal\n' +
          'instead of treating it as success:\n' +
          offenders.join('\n'),
      ).toEqual([])
    })
  })

  /**
   * WHOSE CLOCK DECIDES WHAT DAY IT IS.
   *
   * Three separate bugs in this codebase have come from a calendar fact — what
   * day is today, which week is this, was that workout this week — being read
   * from whichever clock happened to be nearest. On the training screens that
   * clock is the phone's, and the session beside it is decided on the server
   * from the ACCOUNT's timezone. They disagree for anybody travelling, and for
   * anybody whose phone and account simply differ: the strip outlined
   * Wednesday while the card prescribed Tuesday's session.
   *
   * The server hands these facts down now (`weekSoFar`, `todayWeekday`). This
   * counts what is left, per file, so the number can only go down.
   */
  /**
   * LIFE MASTERY REACHES THE GYM THROUGH ONE DOOR.
   *
   * `src/goals` imports from fourteen different modules inside `src/programs`,
   * and every one is a place the two slices can grow into each other without
   * anybody noticing. That coupling is what let the plan keep its own COPY of
   * the program — its day names, its name, how many days a week — and then
   * disagree with the database about all three at once.
   *
   * `src/programs/forLifeMastery.ts` is the door. It exports what Life Mastery
   * legitimately needs (what is running, what it is called, what its week looks
   * like) and deliberately not the things that let it describe a week from its
   * own copy, or edit a program's days.
   *
   * The list below is what existed on 2026-09-19. It may only shrink; a later
   * phase deletes the components that make up most of it and empties the rest.
   */
  /**
   * NO TRAINING SCREEN READS THE BROWSER'S CALENDAR.
   *
   * Every date in this app is filed in the ACCOUNT's timezone, and the screens
   * that show those dates were reading the phone's. So a session logged on
   * Monday in Copenhagen was labelled Tuesday to a phone still set to Tokyo,
   * and the week strip lit a different day from the one the card prescribed.
   *
   * THREE SHAPES, all of them the browser's clock wearing a different hat:
   *   `toLocaleDateString(undefined, …)`  the phone's zone and locale
   *   `isoWeekday(…)`                     the browser-zone converter
   *   `periodStartFor(…, new Date())`     a week boundary from the phone
   *
   * The right versions all take a timezone: `isoWeekdayInTimezone`,
   * `getTodayInTimezone`, `periodStartInTimezone`, `toZonedDate`.
   *
   * The list below is what existed on 2026-09-19, and it may only shrink.
   * `TrainingCard.tsx` is deliberately absent: it was the worst of them and is
   * now the example.
   */
  describe('No training screen reads the browser calendar', () => {
    const TRAINING_BROWSER_CLOCK_ALLOWED: Record<string, number> = {
      // 4 → 3 on 2026-09-23: the month grouping stopped being decided by
      // `toLocaleDateString` in the browser's zone, so a workout logged at
      // 00:30 on the 1st was no longer filed under the previous month.
      // Zero since the list became month pages from the server, dated with
      // `toLocaleDateString(…, { timeZone })` and grouped by the key the server
      // decided (2026-09-23). Kept at 0 rather than deleted: this file prints
      // dates.
      'components/HistoryTab.tsx': 0,
      // Zero since the export became a link to `/api/workouts/export` and the
      // Sparkline's dates are formatted in the account's zone (2026-09-23).
      // Kept at 0 rather than deleted: this file draws dated lines.
      'components/LiftHistory.tsx': 0,
      // Zero since both lists started printing the server's date-only string
      // instead of handing an instant to the browser (2026-09-20). Kept at 0
      // rather than deleted: these two are where "started 3 Feb" is printed.
      'components/PastPrograms.tsx': 0,
      'components/ProgramsApp.tsx': 0,
      // Zero since the weekly chart's month labels came off the date KEY
      // rather than off `new Date(weekStart)` — UTC midnight, which west of
      // UTC is the previous month (2026-09-23). Kept at 0 rather than deleted:
      // this file draws dated bars, so a new `new Date()` here is the thing to
      // catch.
      'components/ProgressTab.tsx': 0,
      // 3 → 0 on 2026-09-27: its two session dates and its chart label were
      // bare `toLocaleDateString()` — no locale AND no zone — which a review
      // found only after the guard's regex was widened to see a bare call.
      // Kept at 0 rather than deleted: this file prints dates.
      'components/ProgressionView.tsx': 0,
      // Zero since the card stopped naming a stale workout's day itself
      // (2026-09-20) — the state carries it, computed where the account's
      // zone is known. Kept at 0: this file prints a weekday.
      'components/TodayCard.tsx': 0,
      // Zero since the long-gap note stopped reading the device's clock
      // (2026-09-19). Kept at 0 rather than deleted: this file is the one that
      // formats times, so a new `new Date()` here is exactly what to catch.
      'components/live/FinishSheet.tsx': 0,
      // The converter itself, and the engine's one caller of it.
      'config.ts': 1,
      // 1 → 0 on 2026-09-27: `lastTimePerLift`'s bare `toLocaleDateString()`.
      // Kept at 0 rather than deleted: this file is the engine and prints
      // plenty of dates.
      'programsService.ts': 0,
    }

    const BROWSER_CLOCK =
      /toLocale(Date|Time)String\(\s*(undefined|\))|\bisoWeekday\(|periodStartFor\([^)]*new Date\(\)/g

    /**
     * A CALL THAT PINS A ZONE IS THE FIX, NOT THE FAULT.
     *
     * The pattern above matches `toLocaleDateString(undefined, …)` whatever
     * follows — including `{ timeZone: tz }`, which is exactly what this
     * guard's own message tells people to write. So the compliant form was
     * flagged, and the only way past was an allowance, which then hid a real
     * one behind the same number.
     *
     * Anything else is still caught: no arguments at all, or options that say
     * nothing about a zone.
     */
    function pinsAZone(code: string, at: number): boolean {
      const open = code.indexOf('(', at)
      if (open === -1) return false
      let depth = 0
      for (let i = open; i < code.length && i < open + 400; i++) {
        if (code[i] === '(') depth++
        else if (code[i] === ')') {
          depth--
          if (depth === 0) return /\btimeZone\s*:/.test(code.slice(open, i))
        }
      }
      return false
    }

    function clockReads(): Record<string, number> {
      const dir = path.join(projectRoot, 'src/programs')
      const found: Record<string, number> = {}
      for (const file of getAllFiles(dir, /\.tsx?$/)) {
        const rel = path.relative(dir, file).replace(/\\/g, '/')
        // Comments blanked, BOTH kinds. A doc comment explaining the rule is
        // not the rule — the first draft of this guard fired on its own prose.
        const code = fs
          .readFileSync(file, 'utf-8')
          .replace(/\/\*[\s\S]*?\*\//g, '')
          .replace(/\/\/[^\n]*/g, '')
        let n = 0
        for (const m of code.matchAll(BROWSER_CLOCK)) {
          if (m[0].startsWith('toLocale') && pinsAZone(code, m.index)) continue
          n++
        }
        if (n) found[rel] = n
      }
      return found
    }

    test('no NEW browser-clock date on a training screen', () => {
      const found = clockReads()
      const offenders = Object.entries(found)
        .filter(([rel, n]) => n > (TRAINING_BROWSER_CLOCK_ALLOWED[rel] ?? 0))
        .map(([rel, n]) => `${rel}: ${n}, allowed ${TRAINING_BROWSER_CLOCK_ALLOWED[rel] ?? 0}`)

      expect(
        offenders,
        "These read the phone's clock for a date the account owns. Use the\n" +
          'timezone-taking versions — isoWeekdayInTimezone, getTodayInTimezone,\n' +
          'periodStartInTimezone, toZonedDate:\n' +
          offenders.join('\n'),
      ).toEqual([])
    })

    test('the browser-clock allowlist only shrinks', () => {
      const found = clockReads()
      const cleaned = Object.entries(TRAINING_BROWSER_CLOCK_ALLOWED)
        .filter(([rel, n]) => (found[rel] ?? 0) < n)
        .map(([rel, n]) => `${rel}: now ${found[rel] ?? 0}, allowance still ${n}`)

      expect(
        cleaned,
        'Fixed — lower these in TRAINING_BROWSER_CLOCK_ALLOWED:\n' + cleaned.join('\n'),
      ).toEqual([])
    })
  })

  describe('Life Mastery reaches the gym through one door', () => {
    const GOALS_TO_PROGRAMS_IMPORTS_ALLOWED = new Set([
      'src/goals/components/new-goals/GoalsConfigStep.tsx @/src/programs/data/catalog',
      'src/goals/components/new-goals/GoalsConfigStep.tsx @/src/programs/types',
      'src/goals/components/new-goals/NewGoalsFlow.tsx @/src/programs/types',
      // WorkoutPrograms.tsx had TEN of these on 2026-09-23 — the editor, the
      // running band, the blue-grey kit, the engine, the customiser — and it
      // has none: the Templates step is a status card drawn from props, and
      // what it needs comes through `forLifeMastery.ts` like everything else.
    ])

    /** Every `src/goals` file paired with each `src/programs` path it imports. */
    function crossings(): string[] {
      const dir = path.join(projectRoot, 'src/goals')
      const found: string[] = []
      for (const file of getAllFiles(dir, /\.tsx?$/)) {
        const rel = path.relative(projectRoot, file).replace(/\\/g, '/')
        const src = fs.readFileSync(file, 'utf-8')
        for (const [, spec] of src.matchAll(/from\s+["'](@\/src\/programs[^"']*)["']/g)) {
          if (spec === '@/src/programs/forLifeMastery') continue
          found.push(`${rel} ${spec}`)
        }
      }
      return [...new Set(found)].sort()
    }

    test('no new direct import from src/goals into src/programs', () => {
      const offenders = crossings().filter((c) => !GOALS_TO_PROGRAMS_IMPORTS_ALLOWED.has(c))
      expect(
        offenders,
        'Life Mastery reaches the gym through src/programs/forLifeMastery.ts.\n' +
          'A direct import is how the plan came to keep its own copy of the\n' +
          'program and then disagree with the database about it:\n' +
          offenders.join('\n'),
      ).toEqual([])
    })

    test('Life Mastery hosts no second copy of the training feature', () => {
      /**
       * NORTH STAR REACHES THE GYM THROUGH THE DOOR AND NOWHERE ELSE.
       *
       * The allowlist above is a list of exceptions that already existed; this
       * says a whole DIRECTORY has none left, which is a different and stronger
       * claim. It is the one the phase actually made true: the Templates step
       * held a catalogue, an editor, a builder and a running band — a second
       * copy of the training feature, reachable only from inside the plan, and
       * therefore the copy nobody maintained. Ten direct imports carried it.
       *
       * The two `new-goals` entries above are deliberately still allowed: that
       * flow reads the catalogue to offer a program as a goal, which is
       * reading, not a second copy. This rule is about the north-star step.
       */
      const offenders = crossings().filter((c) =>
        c.startsWith('src/goals/components/north-star/'),
      )
      expect(
        offenders,
        'The Templates step grew a second copy of the training feature once, and\n' +
          'every direct import was a way for that copy to look plausible. Add what\n' +
          'is needed to src/programs/forLifeMastery.ts instead:\n' +
          offenders.join('\n'),
      ).toEqual([])
    })

    test('the direct-import allowlist only shrinks', () => {
      const live = new Set(crossings())
      const gone = [...GOALS_TO_PROGRAMS_IMPORTS_ALLOWED].filter((c) => !live.has(c))
      expect(
        gone,
        'These imports are gone — remove them from GOALS_TO_PROGRAMS_IMPORTS_ALLOWED:\n' + gone.join('\n'),
      ).toEqual([])
    })
  })

  describe('No calendar fact is read from the browser clock', () => {
    /** Comments blanked: a sentence about `new Date()` is not a call to it. */
    function codeOf(rel: string): string {
      return fs
        .readFileSync(path.join(projectRoot, rel), 'utf-8')
        .replace(/\/\*[\s\S]*?\*\//g, '')
        .replace(/\/\/[^\n]*/g, '')
    }

    /**
     * The three that are left, and why each is allowed.
     *
     * Every one of these is an INSTANT — a moment in time — not a calendar
     * fact. An instant is the same everywhere; which day it falls on is not.
     *
     *   ProgressTab       "this week" for adherence and volume. This one IS a
     *                     calendar fact and IS still wrong; it is held at
     *                     exactly one here until that tab is rebuilt, so it
     *                     cannot spread while it waits.
     *   live/FinishSheet  the default end time of the workout you just did.
     *   LiftHistory       the date in a downloaded file's name.
     */
    const BROWSER_CLOCK_DEBT: Record<string, number> = {
      // Zero since Progress became one server-computed snapshot: "this week"
      // is decided in the account's zone on the server, not from `new Date()`
      // in the browser (2026-09-23). Kept at 0 rather than deleted: this file
      // is where a week is drawn.
      'ProgressTab.tsx': 0,
      'live/FinishSheet.tsx': 1,
      // Zero since the CSV became a link to `/api/workouts/export`, which names
      // the file on the server (2026-09-23). Kept at 0 rather than deleted:
      // this file draws dated lines.
      'LiftHistory.tsx': 0,
    }

    function readsPerFile(): Record<string, number> {
      const dir = path.join(projectRoot, 'src/programs/components')
      const found: Record<string, number> = {}
      for (const file of getAllFiles(dir, /\.tsx?$/)) {
        const rel = path.relative(dir, file).replace(/\\/g, '/')
        const hits = codeOf(path.relative(projectRoot, file).replace(/\\/g, '/')).match(/new Date\(\)/g)
        if (hits) found[rel] = hits.length
      }
      return found
    }

    test('no training component reads the browser clock for a calendar fact', () => {
      const found = readsPerFile()
      const offenders = Object.entries(found)
        .filter(([rel, n]) => n > (BROWSER_CLOCK_DEBT[rel] ?? 0))
        .map(([rel, n]) => `${rel}: ${n}, allowed ${BROWSER_CLOCK_DEBT[rel] ?? 0}`)

      expect(
        offenders,
        'These read the phone\'s clock. What day it is where the PERSON is comes\n' +
          'from the server — `detail.week.todayWeekday` and `trainedWeekdays`,\n' +
          'computed by `weekSoFar` in the account\'s timezone:\n' +
          offenders.join('\n'),
      ).toEqual([])
    })

    test('the browser-clock allowance only shrinks', () => {
      const found = readsPerFile()
      const cleaned = Object.entries(BROWSER_CLOCK_DEBT)
        .filter(([rel, n]) => (found[rel] ?? 0) < n)
        .map(([rel, n]) => `${rel}: now ${found[rel] ?? 0}, allowance still ${n}`)

      expect(
        cleaned,
        'Fixed — lower these in BROWSER_CLOCK_DEBT so they cannot come back:\n' + cleaned.join('\n'),
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

  /**
   * NOTHING RENDERED MAY CHANGE BETWEEN THE SERVER RENDER AND HYDRATION.
   *
   * Found by opening every live route cold and reading the console, 2026-09-24.
   * `/dashboard/settings` threw a hydration failure on 1 of 6 cold loads, and
   * React named the text:
   *
   *     + 5:36:45 AM Central European Summer Time
   *     - 5:36:44 AM Central European Summer Time
   *
   * One second apart. The zone label was built from
   * `new Date().toLocaleString(…, { timeZoneName: "long" }).split(", ").pop()`,
   * and the last comma-separated chunk of that string is the wall clock, not
   * the zone name. The server rendered one second, the browser hydrated in the
   * next, the text did not match, and React discarded that tree and rebuilt it.
   * The person reading it saw a clock that was wrong on arrival and never
   * ticked.
   *
   * WHY THE RULES ABOVE MISSED IT, which is the reason this one exists
   * separately rather than widening theirs. Both browser-clock rules ask "whose
   * calendar is this?" and so exempt any `toLocale*` call that pins a
   * `timeZone`. This call pinned one. Pinning a zone says nothing about whether
   * the text still reads the same a second later — two different properties,
   * and the second had no owner anywhere in this suite.
   *
   * It is also scoped wider than they are: they cover training screens, and
   * this failure was on Settings. Every client component hydrates, so every
   * client component is in scope.
   *
   * NOT IN SCOPE, on purpose: `<button>` nested inside `<button>`, which is the
   * other way this app has produced a hydration failure (the Training tab, four
   * commits ago). The parser auto-closes the outer one, so server and client
   * disagree — but it arrives through a rendered prop, not a literal, and no
   * regex over the source can see it. Only opening the page finds that one.
   */
  describe('Nothing rendered changes between the server render and hydration', () => {
    /**
     * Two shapes, both of which make the server and the browser print
     * different text for the same component:
     *
     *   new Date().toLocaleString / .toLocaleTimeString   a clock, which ticks
     *   Date.now().toLocaleString                          a number, which grows
     *   new Date().toLocaleDateString(undefined | )        the DEVICE's locale,
     *                                                      which the server
     *                                                      cannot know
     */
    const HYDRATION_UNSAFE =
      /new Date\(\s*\)\s*\.toLocale(String|TimeString)\b|Date\.now\(\s*\)\s*\.toLocale|new Date\(\s*\)\s*\.toLocaleDateString\(\s*(undefined|\))/g

    /** Comments blanked: an explanation of the bug is not the bug. */
    function clientComponentCode(): Map<string, string> {
      const out = new Map<string, string>()
      for (const dir of ['src', 'app', 'components']) {
        for (const file of getAllFiles(path.join(projectRoot, dir), /\.tsx$/)) {
          const raw = fs.readFileSync(file, 'utf-8')
          const code = raw
            .replace(/\/\*[\s\S]*?\*\//g, '')
            .replace(/\/\/[^\n]*/g, '')
          // Server components render once and never hydrate, so none of this
          // can bite them.
          if (!/^\s*['"]use client['"]/m.test(code)) continue
          out.set(path.relative(projectRoot, file).replace(/\\/g, '/'), code)
        }
      }
      return out
    }

    /**
     * POSITION, NOT SPELLING — and the reason this is an AST and not a regex.
     *
     * The first version of this rule counted the text. `daygame-coach-0a` then
     * fixed `DailyReviewPage` by moving the call into a mount effect, where the
     * server renders nothing and there is nothing to disagree with — the right
     * fix — and the scan still counted it, because the symbol had not moved.
     * That is worse than a miss: the allowlist entry stayed at 1, describing a
     * hazard that was gone, and the only-shrinks companion could not see the
     * difference either. The free pass would have covered somebody moving the
     * call back into render years later, which is the exact drift both halves
     * exist to stop. A text scan grandfathers the SYMBOL; the hazard is the
     * POSITION, and the two come apart the moment anybody fixes one.
     *
     * So: the regex above stays, as a cheap prefilter over every client
     * component, and only the handful of files it hits get parsed. An effect
     * runs after mount, on the client, alone — nothing it does can disagree
     * with the server. Everything else counts, including event handlers, which
     * are also safe: over-counting costs an allowlist line and a conversation,
     * under-counting costs a hydration failure nobody can see.
     */
    function unsafeInRenderPosition(rel: string, code: string): number {
      const source = ts.createSourceFile(rel, code, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX)
      let count = 0

      const isEffectCall = (node: ts.Node): boolean =>
        ts.isCallExpression(node) &&
        ts.isIdentifier(node.expression) &&
        (node.expression.text === 'useEffect' || node.expression.text === 'useLayoutEffect')

      const insideAnEffect = (node: ts.Node): boolean => {
        for (let p: ts.Node | undefined = node.parent; p; p = p.parent) {
          if (isEffectCall(p)) return true
        }
        return false
      }

      /**
       * ONE COUNT PER OCCURRENCE IN THE TEXT, located in the tree.
       *
       * Counting matching call NODES instead triple-counted
       * `new Date().toLocaleString(…).split(" ").pop()`: `.pop()`, `.split()`
       * and `.toLocaleString()` are three nested calls and all three contain
       * the matching text. The occurrences are what the allowlist numbers have
       * always meant, so they stay the unit; the tree is only asked where each
       * one sits.
       */
      const deepestNodeAt = (position: number): ts.Node => {
        let found: ts.Node = source
        const descend = (node: ts.Node): void => {
          if (position < node.getStart(source) || position >= node.getEnd()) return
          found = node
          ts.forEachChild(node, descend)
        }
        ts.forEachChild(source, descend)
        return found
      }

      for (const match of code.matchAll(HYDRATION_UNSAFE)) {
        if (!insideAnEffect(deepestNodeAt(match.index))) count++
      }
      return count
    }

    /**
     * What is left, and why each entry is here rather than fixed.
     *
     * Both are in another session's files as this is written (`src/goals` and
     * `src/tracking`), and both were reported to their owners rather than
     * edited underneath them. One came back fixed the same night.
     */
    const HYDRATION_DEBT: Record<string, number> = {
      // `toLocaleString("en-US", { timeZone, timeZoneName: "short" })`, then
      // `.split(" ").pop()`. That pops "GMT+2" — the zone alone, no clock — so
      // it is safe TODAY, and safe by accident: the safety is a property of
      // splitting on spaces, and changing the format string to "long" would
      // silently start printing the time. `timeZoneLongName` in
      // `src/shared/dateUtils.ts` is the version that cannot.
      'src/goals/components/GoalTimeSettingsDialog.tsx': 1,
      // `toLocaleDateString(undefined, { weekday, month, day })` — the heading
      // of the daily review. `undefined` is the device's locale and the server
      // has no way to match it: on a UTC server for a Danish browser that is
      // "Thursday, September 24" against "torsdag 24. september".
      //
      // Zero since the call moved into a mount effect (2026-09-24): the server
      // renders nothing, so there is nothing to disagree with. Kept at 0 rather
      // than deleted because the call is still in the file, and this entry is
      // where the next reader finds out that its POSITION is what makes it
      // safe — move it back into render and this goes red.
      //
      // The scan read 1 here until it learned to tell render from an effect. An
      // earlier comment in this slot said the entry had to stay at 1 because a
      // text scan could not see the difference. That was true of the scan, not
      // of the rule, so the scan was changed rather than the number written
      // down: an allowlist that cannot see a fix cannot see a regression past
      // it either. Still the device's day, by a deliberate decision recorded at
      // the call — the account's zone is not available in that client tree.
      'src/tracking/components/DailyReviewPage.tsx': 0,
    }

    /**
     * Scanned once for both tests. Two walks of `src`, `app` and `components`
     * to answer the same question is the kind of waste that pushes a
     * neighbouring test with a five-second budget over it.
     */
    let scanned: Record<string, number> | null = null
    function unsafeReads(): Record<string, number> {
      if (scanned) return scanned
      const found: Record<string, number> = {}
      for (const [rel, code] of clientComponentCode()) {
        // Cheap text prefilter over everything; the AST only for what it hits.
        if (!code.match(HYDRATION_UNSAFE)) continue
        const inRender = unsafeInRenderPosition(rel, code)
        if (inRender > 0) found[rel] = inRender
      }
      scanned = found
      return found
    }

    test('no client component prints a clock, a growing number or the device locale', () => {
      const found = unsafeReads()
      const over = Object.entries(found)
        .filter(([rel, n]) => n > (HYDRATION_DEBT[rel] ?? 0))
        .map(([rel, n]) => `${rel}: ${n} (allowed ${HYDRATION_DEBT[rel] ?? 0})`)

      expect(
        over,
        'This text will differ between the server render and hydration, so React\n' +
          'will throw the tree away and rebuild it — and whatever it printed was\n' +
          'already stale. For a zone label use `timeZoneLongName`; for a date use\n' +
          '`toLocaleDateString(…, { timeZone })` with the ACCOUNT\'s zone and an\n' +
          'explicit locale; for "now" take the instant from the server:\n' +
          over.join('\n'),
      ).toEqual([])
    })

    /**
     * THE INSTRUMENT, MEASURED — because a scan that cannot tell a fix from a
     * regression is worse than no scan, and the only way to know which this one
     * is, is to hand it both and check.
     *
     * The two snippets differ ONLY in where the call sits. Same component, same
     * call, same text: one in render, one in a mount effect. Anything that
     * scores them the same is measuring spelling.
     */
    test('it tells a call in render from the same call in an effect', () => {
      const inRender = `"use client"
        export function Heading() {
          return <h1>{new Date().toLocaleTimeString()}</h1>
        }`
      const inEffect = `"use client"
        export function Heading() {
          const [t, setT] = useState("")
          useEffect(() => {
            setT(new Date().toLocaleTimeString())
          }, [])
          return <h1>{t}</h1>
        }`

      expect(unsafeInRenderPosition('probe.tsx', inRender)).toBe(1)
      expect(unsafeInRenderPosition('probe.tsx', inEffect)).toBe(0)

      // And one occurrence is one, however many calls are chained onto it.
      // Counting matching call NODES scored this 3.
      const chained = `"use client"
        export function Zone({ tz }: { tz: string }) {
          return <p>{new Date().toLocaleString("en-US", { timeZone: tz }).split(" ").pop()}</p>
        }`
      expect(unsafeInRenderPosition('probe.tsx', chained)).toBe(1)
    })

    test('the hydration-debt allowance only shrinks', () => {
      const found = unsafeReads()
      const stale = Object.entries(HYDRATION_DEBT)
        .filter(([rel, allowed]) => (found[rel] ?? 0) < allowed)
        .map(([rel, allowed]) => `${rel}: allowed ${allowed}, actually ${found[rel] ?? 0}`)

      expect(
        stale,
        'These are fixed or gone — lower them in HYDRATION_DEBT. An allowance with\n' +
          'headroom is a free pass waiting for the bug to come back:\n' +
          stale.join('\n'),
      ).toEqual([])
    })
  })

  /**
   * NO CONTROL INSIDE ANOTHER CONTROL.
   *
   * `<Link><Button>…</Button></Link>` puts a `<button>` inside an `<a>`. That is
   * invalid HTML, and a screen reader is handed two nested controls where the
   * page means one. Unlike a button inside a button it does NOT break
   * hydration — measured on 2026-09-24, nine of these on `/dashboard/tracking`
   * with zero hydration errors — so this is a correctness and accessibility
   * rule, not a crash rule, and the fourteen that exist are held where they are
   * rather than changed in one sweep across three slices nobody is testing
   * tonight.
   *
   * The fix is `asChild`, which makes the link BE the button:
   *
   *     <Button asChild><Link href="/x">Label</Link></Button>
   */
  describe('No control is nested inside another control', () => {
    const LINK_WRAPPING_BUTTON = /<Link\b[^>]*>\s*(?:\{[^{}]*\}\s*)?<Button\b/g

    /** Scanned once for both tests, for the same reason as above. */
    let scanned: Record<string, number> | null = null
    function nestedControls(): Record<string, number> {
      if (scanned) return scanned
      const found: Record<string, number> = {}
      for (const dir of ['src', 'app', 'components']) {
        for (const file of getAllFiles(path.join(projectRoot, dir), /\.tsx$/)) {
          const code = fs
            .readFileSync(file, 'utf-8')
            .replace(/\/\*[\s\S]*?\*\//g, '')
            .replace(/\/\/[^\n]*/g, '')
          const hits = code.match(LINK_WRAPPING_BUTTON)
          if (hits) {
            found[path.relative(projectRoot, file).replace(/\\/g, '/')] = hits.length
          }
        }
      }
      scanned = found
      return found
    }

    /**
     * Fourteen when this rule was written, ten now.
     *
     * `src/settings` went first, being where the rule was found. Home and
     * Scenarios followed the same night: nobody had those files open, so the
     * only argument for holding them — not changing what a control IS in files
     * another session is editing — did not apply. The ten that remain are the
     * tracking screens, and `daygame-coach-0a` and I agreed to leave them for
     * the wording-and-UX pass those screens are already due, rather than
     * changing ten DOM nodes across seven files for a fault that does not
     * break hydration.
     */
    const NESTED_CONTROL_DEBT: Record<string, number> = {
      'app/dashboard/tracking/history/page.tsx': 1,
      // Zero since both buttons became `<Button asChild>` (2026-09-24). Kept at
      // 0 rather than deleted: this is the front page, every link on it is a
      // call to action, and `<Link><Button>` is the obvious way to write one.
      'src/home/components/HomePage.tsx': 0,
      // Zero since the three sign-up and pricing buttons became
      // `<Button asChild>` (2026-09-24). `w-full` moved onto the button with
      // them, because that is what renders the anchor now.
      'src/scenarios/components/ScenariosHub.tsx': 0,
      'src/tracking/components/ProgressDashboard.tsx': 1,
      'src/tracking/components/SessionDetailPage.tsx': 2,
      'src/tracking/components/SessionTrackerPage.tsx': 1,
      'src/tracking/components/dashboard/DailyReviewCard.tsx': 1,
      'src/tracking/components/dashboard/RecentSessionsCard.tsx': 3,
      'src/tracking/components/dashboard/WeeklyReviewsCard.tsx': 1,
    }

    test('no NEW button inside an anchor', () => {
      const found = nestedControls()
      const over = Object.entries(found)
        .filter(([rel, n]) => n > (NESTED_CONTROL_DEBT[rel] ?? 0))
        .map(([rel, n]) => `${rel}: ${n} (allowed ${NESTED_CONTROL_DEBT[rel] ?? 0})`)

      expect(
        over,
        'A <button> inside an <a> is invalid HTML and two nested controls to a\n' +
          'screen reader. Use `asChild` so the link IS the button:\n' +
          '  <Button asChild><Link href="/x">Label</Link></Button>\n' +
          over.join('\n'),
      ).toEqual([])
    })

    test('the nested-control allowance only shrinks', () => {
      const found = nestedControls()
      const stale = Object.entries(NESTED_CONTROL_DEBT)
        .filter(([rel, allowed]) => (found[rel] ?? 0) < allowed)
        .map(([rel, allowed]) => `${rel}: allowed ${allowed}, actually ${found[rel] ?? 0}`)

      expect(
        stale,
        'These are fixed or gone — lower them in NESTED_CONTROL_DEBT:\n' +
          stale.join('\n'),
      ).toEqual([])
    })
  })

  /**
   * ONE FILE ASKS "WHO IS THIS", AND THE LEDGER BELOW IS WHAT IS LEFT.
   *
   * `src/db/auth.ts` owns `supabase.auth.getUser()`. Every other caller goes
   * through `requireAuth` / `requirePremium` / `requireAccess` / `optionalUserId`.
   * That is not tidiness: the platform move replaces the identity provider, and
   * a facade with one implementation is a one-file change where 66 scattered
   * calls were a 50-file one. On 2026-09-26 the 48 API-route call sites were
   * routed through it; the 18 below are what remain.
   *
   * The remainder are NOT all the same job, which is why they are still here:
   * `app/page.tsx` renders a signed-out landing page rather than redirecting,
   * `app/life-mastery/layout.tsx` redirects with a `?next=` return address, and
   * `app/auth/reset-password/page.tsx` runs in the browser where a server
   * facade cannot reach. Each needs a decision, not a substitution — so they are
   * recorded rather than rewritten, and this list may only shrink.
   */
  describe('Auth — one file asks who the caller is', () => {
    const directGetUserCallers = (): string[] => {
      const found: string[] = []
      const walk = (dir: string) => {
        for (const entry of fs.readdirSync(path.join(projectRoot, dir), { withFileTypes: true })) {
          const rel = path.join(dir, entry.name)
          if (entry.isDirectory()) {
            if (entry.name === 'node_modules' || entry.name === '.next') continue
            walk(rel)
          } else if (/\.tsx?$/.test(entry.name)) {
            if (rel === path.join('src', 'db', 'auth.ts')) continue
            const src = fs.readFileSync(path.join(projectRoot, rel), 'utf8')
            if (
              src.includes('auth.getUser()') ||
              src.includes('auth.getSession()') ||
              src.includes('auth.admin.')
            ) {
              found.push(rel.split(path.sep).join('/'))
            }
          }
        }
      }
      walk('app')
      walk('src')
      return found.sort()
    }

    test('no NEW caller reaches for auth.getUser() directly', () => {
      const callers = directGetUserCallers()

      const violations = callers.filter((f) => !ALLOWED_DIRECT_GET_USER.has(f))
      expect(
        violations,
        'These ask the identity provider directly — getUser(), getSession() or\n' +
          'the admin api.\n' +
          'Use the facade in\n' +
          'src/db/auth.ts instead — requireAuth() for an API route that must\n' +
          'reject an anonymous caller, requirePremium()/requireAccess() when it\n' +
          'also gates on what was bought, optionalUserId() when signed-out\n' +
          'callers are served on purpose:\n' +
          violations.join('\n'),
      ).toEqual([])

      const stale = [...ALLOWED_DIRECT_GET_USER].filter((f) => !callers.includes(f)).sort()
      expect(
        stale,
        'These are fixed or gone — remove them from ALLOWED_DIRECT_GET_USER:\n' +
          stale.join('\n'),
      ).toEqual([])
    })
  })

  /**
   * The database's own words never reach a person.
   *
   * WHAT THIS IS FOR. On 2026-09-26 the owner, mid-workout, was shown:
   *
   *     That Squat set could not be saved: new row violates row-level security
   *     policy for table "workout_sets"
   *
   * Nothing was wrong with their permissions. A set row has no user of its own,
   * so its policy asks whether the PARENT workout exists and is yours — which
   * makes "policy violation" how Postgres says "there is no such workout". The
   * workout had been discarded on a second device while ticks were in flight.
   * Reproduced on demand: 18 refusals in 40 tries.
   *
   * Every workout route hands a thrown message straight to the browser, so the
   * instant a repo writes `${error.message}` into an Error, Postgres is talking
   * to a person standing at a squat rack. Fixing the one line would have left
   * two hundred more of exactly the same shape.
   *
   * A COUNT PER FILE, WHICH MAY ONLY GO DOWN — the same shape this file already
   * uses for unpaged reads and nested controls. A hard ban would mean rewriting
   * twenty-three repositories in one commit, which nobody would review; a
   * ratchet locks in the slice that has been cleaned and stops the next one
   * getting worse. `workoutRepo.ts` is absent because it is at zero, and its
   * absence is asserted below rather than assumed.
   *
   * Logging the real message is right and is not counted: `console.error` is
   * read by us, not by the person. That is the whole distinction.
   */
  /**
   * COMMENTS AND STRING CONTENTS BLANKED — BY THE TYPESCRIPT PARSER.
   *
   * Both scanners below match brackets by counting, so a `(` or `)` inside a
   * string or a comment throws the count off. The first version stripped
   * comments with two regexes; the second was a hand-written character state
   * machine. Both were wrong, and the second was wrong in a way that is worth
   * writing down:
   *
   *   it had no regex-literal state, so a quote inside `/["']/` opened a
   *   phantom string that ran to the next matching quote — blanking REAL CODE
   *   in 36 of 600 files under src/, including 18 client components the
   *   seeded-state scanner is supposed to read. A leak added to
   *   `healthService.ts` after its `/[",\n]/` was invisible, and the same line
   *   added elsewhere in the file was caught.
   *
   * Found by a review that re-implemented it against `ts.createSourceFile` and
   * diffed. That is the answer: TypeScript is already a dependency of this
   * file, it has the only lexer in the repo that is definitely right about
   * regex literals, JSX text, nested templates and division, and a fifth
   * hand-rolled one was never going to beat it.
   *
   * Lengths are preserved so every match index still lines up with the source.
   * Template SPANS are kept — `${error.message}` is the thing being counted.
   */
  /**
   * ONE PARSE PER FILE PER RUN, BECAUSE THIS IS THE WHOLE FILE'S COST.
   *
   * `ts.createSourceFile` below runs the real TypeScript parser, and the scans
   * that call this walk all 1,060 `.ts`/`.tsx` files under `src`, `app` and
   * `components` — several of them twice, because an enforcement test and its
   * only-shrinks twin each call the same scan function. Measured 2026-09-27:
   * the two runtime-locale tests took **13.4s and 12.3s** against this suite's
   * **20s** per-test ceiling, so under load the shared pre-commit hook started
   * timing out and blocking whichever session happened to be committing.
   *
   * The result is a pure function of (file, source), so it is cached on both.
   * This does NOT raise the ceiling or hide growth: every file is still parsed,
   * still scanned, and a new offender still fails the test. It is only the
   * re-parsing of bytes already parsed in this process that goes away.
   */
  const strippedSources = new Map<string, { source: string; stripped: string }>()

  function withoutCommentsOrStrings(source: string, file: string): string {
    const cached = strippedSources.get(file)
    if (cached && cached.source === source) return cached.stripped

    const out = source.split('')
    const blank = (from: number, to: number) => {
      for (let k = from; k < to && k < out.length; k++) if (out[k] !== '\n') out[k] = ' '
    }
    /**
     * THE SCRIPT KIND MATTERS, and getting it wrong is silent.
     *
     * Parsing every file as TSX made `viceRepo.ts` — which has three real leaks
     * — score ZERO: a `.ts` file may contain `<T>value` casts and generic
     * arrows that TSX reads as JSX, so the parse goes wrong, the node positions
     * go with it, and the blanking lands on the wrong characters. It fails
     * quietly in the direction that hides leaks, which is the worst direction.
     */
    const parsed = ts.createSourceFile(
      file,
      source,
      ts.ScriptTarget.Latest,
      true,
      file.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS
    )

    /**
     * THE OFFSETS ARE PER KIND, because "+1 to end-1" is only right for a
     * literal with one delimiter at each end.
     *
     * A review measured what the blanket version left behind: JSX text has NO
     * delimiters, so its first and last characters survived and 19 .tsx files
     * ended up carrying an unmatched `(` or `)` in the blanked source — which
     * both scanners then count. `<li>Kiss Closes (milestone: 1 → 25)</li>` is a
     * real one. A regex keeps its flags (`/_/g` became `/  g`), and a template
     * head lost the `$` of its own `${`.
     *
     * None of it moved a verdict today. All of it is a miscount waiting for the
     * wrong file.
     */
    const walk = (node: ts.Node): void => {
      const from = node.getStart(parsed)
      const to = node.getEnd()
      if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) {
        blank(from + 1, to - 1)                       // "…"  '…'  `…`
      } else if (ts.isRegularExpressionLiteral(node)) {
        blank(from + 1, to)                           // /…/flags — flags too
      } else if (ts.isJsxText(node)) {
        blank(from, to)                               // no delimiters at all
      } else if (ts.isTemplateHead(node) || ts.isTemplateMiddle(node)) {
        blank(from + 1, to - 2)                       // `…${   or   }…${
      } else if (ts.isTemplateTail(node)) {
        blank(from + 1, to - 1)                       // }…`
      }
      ts.forEachChild(node, walk)
    }
    walk(parsed)

    /**
     * COMMENTS SECOND, AND ONLY NOW IS A REGEX SAFE FOR THEM.
     *
     * Comments are trivia, so the walk above never visits them. Two regexes
     * would have been reckless on the raw source — a `//` inside a string, a
     * quote inside a comment — but every string, template chunk, regex body and
     * piece of JSX text has just been emptied, so the only `//` and the only
     * `/*` left in the text are real comment openers. (An empty regex literal
     * cannot exist: `//` is a comment, which is why blanking a regex's contents
     * cannot manufacture one.)
     */
    const literalsGone = out.join('')
    const keepNewlines = (m: string) => m.replace(/[^\n]/g, ' ')
    const stripped = literalsGone
      .replace(/\/\*[\s\S]*?\*\//g, keepNewlines)
      .replace(/\/\/[^\n]*/g, keepNewlines)
    strippedSources.set(file, { source, stripped })
    return stripped
  }

  /**
   * NO REACT STATE IS SEEDED FROM SOMETHING THE SERVER CANNOT KNOW.
   *
   * The sharpest shape of the hydration bug, and the one that bit this repo
   * twice in one day on one screen:
   *
   *   useState(() => readRest(...))        the rest clock, out of localStorage
   *   useState(() => Date.now())           the elapsed counter
   *
   * A lazy initialiser runs during the FIRST render — on the server too. The
   * server has no `localStorage` and a different instant, so the server's first
   * render and the browser's first render disagree by construction, and React
   * throws the whole tree away and rebuilds it. On `/programs/live` that is the
   * screen somebody is using at a squat rack.
   *
   * WHY THIS RULE AND NOT A WIDER ONE. The guard above it counts
   * `new Date().toLocaleString` anywhere outside an effect, which also catches
   * event handlers — safe, but noisy. Widening that to every `Date.now()` would
   * have flagged 36 calls in 14 files, most of them in handlers, and a debt
   * table that large stops being read. A clock or a storage read INSIDE a
   * `useState` initialiser is almost never anything but this bug: eight in the
   * whole app, and each one below has its reason written next to it.
   *
   * The fix is always the same and costs one frame: start from a value the
   * server can also produce (usually `null`), and read the real one in a mount
   * effect.
   */
  describe('No state is seeded from the browser during the first render', () => {
    /** Things that do not exist, or differ, on the server. */
    const BROWSER_ONLY =
      /Date\.now\(\s*\)|new Date\(\s*\)|localStorage|sessionStorage|window\.|navigator\.|matchMedia|Math\.random\(|crypto\.randomUUID\(|performance\.now\(|document\.cookie/

    /**
     * Every one that is there today, with why it is safe. An entry with no
     * reason is a violation somebody has stopped looking at.
     */
    const SEEDED_STATE_DEBT: Record<string, number> = {
      // The finish sheet's "when did it end" default. Mounted only when the
      // sheet is opened, so it never exists during a server render.
      'src/programs/components/live/FinishSheet.tsx': 1,
      // The rest countdown. This note said "RestBar returns null when there is
      // no clock, so the bar does not exist on the server" — which is wrong
      // about the mechanism: `RestBar` is MOUNTED unconditionally by
      // `LiveWorkoutScreen`, so its initialiser does run during the server
      // render. What makes it safe is narrower and more fragile: `live.rest` is
      // always null on the first render since the clock moved into a mount
      // effect, so the component returns null before anything time-derived is
      // printed. It stops being safe the day a rest clock is server-rendered.
      'src/programs/components/live/RestBar.tsx': 1,
      // The time tracker's running timer, its mobile test, its store, and three
      // tracking forms. Not audited by the change that added this rule — they
      // are recorded so they cannot grow, not blessed.
      'src/timetrack/components/TimerBar.tsx': 1,
      'src/timetrack/hooks/useIsMobile.ts': 1,
      'src/timetrack/hooks/useTimetrack.ts': 1,
      'src/tracking/components/CustomReportBuilder.tsx': 1,
      'src/tracking/components/FieldReportPage.tsx': 1,
      'src/tracking/components/QuickAddModal.tsx': 1,
    }

    /** `useState` initialisers that read the browser, per client file. */
    const seededIn = (file: string): number => {
      const raw = fs.readFileSync(path.join(projectRoot, file), 'utf8')
      // A server component renders once and never hydrates, so none of this
      // can bite it. Checked against the RAW text: the blanking below turns
      // "use client" into a pair of empty quotes.
      if (!/^\s*['"]use client['"]/m.test(raw)) return 0
      const source = withoutCommentsOrStrings(raw, file)

      /**
       * ONE LEVEL DOWN, because the first version of this rule missed one of
       * the two bugs it was written for.
       *
       * `useState(() => readRest(...))` has no `localStorage` in it — the read
       * is inside `readRest`, four functions up the same file. Tested by
       * putting that exact line back and watching the guard stay green, which
       * is the only way anyone finds out. So: any function declared in this
       * file whose own body reads the browser counts as reading the browser.
       */
      const declared = [
        ...source.matchAll(/\bfunction\s+(\w+)\s*\(/g),
        // `const x = (…) => …` and `const x = function …`, which is how most
        // helpers in this codebase are spelled. The first version collected
        // `function` declarations only, so it covered the one spelling the bug
        // happened to use and would have missed the same bug written the other
        // way — which a review pointed out before it cost anything.
        ...source.matchAll(/\b(?:const|let)\s+(\w+)\s*=\s*(?:async\s*)?(?:\([^)]*\)|\w+)\s*=>/g),
        ...source.matchAll(/\b(?:const|let)\s+(\w+)\s*=\s*(?:async\s*)?function\b/g),
      ].map((m) => m[1])
      const indirect = declared.filter((name) => {
        const at = source.search(new RegExp(`\\b(?:function|const|let)\\s+${name}\\b`))
        if (at === -1) return false
        const body = source.slice(at)
        const close = body.indexOf('\n}')
        return BROWSER_ONLY.test(close === -1 ? body : body.slice(0, close + 2))
      })
      const reads = (text: string) =>
        BROWSER_ONLY.test(text) || indirect.some((n) => new RegExp(`\\b${n}\\s*\\(`).test(text))

      let found = 0
      for (const match of source.matchAll(/\b(?:useState|useReducer)\s*[<(]/g)) {
        let depth = 0
        const open = source.indexOf('(', match.index)
        let end = open
        for (; end < source.length; end++) {
          if (source[end] === '(') depth++
          else if (source[end] === ')' && --depth === 0) break
        }
        if (reads(source.slice(open, end))) found += 1
      }
      return found
    }

    const clientFiles = (): string[] =>
      getAllFiles(path.join(projectRoot, 'src'), /\.tsx?$/)
        .map((f) => path.relative(projectRoot, f).replace(/\\/g, '/'))
        .sort()

    const measured = () =>
      clientFiles().map((file) => ({
        file,
        now: seededIn(file),
        allowed: SEEDED_STATE_DEBT[file] ?? 0,
      }))

    test('no NEW state is seeded from the clock or from browser storage', () => {
      const worse = measured().filter(({ now, allowed }) => now > allowed)
      expect(
        worse.map((w) => `${w.file}: ${w.now} (allowed ${w.allowed})`),
        'A `useState` initialiser runs during the server render too, where there\n' +
          'is no localStorage and the clock is a different one — so the first client\n' +
          'render disagrees with the HTML and React rebuilds the tree. Start from a\n' +
          'value the server can produce and read the real one in a mount effect:\n' +
          worse.map((w) => `${w.file}: ${w.now} (allowed ${w.allowed})`).join('\n')
      ).toEqual([])
    })

    test('the seeded-state allowance only shrinks', () => {
      const stale = measured()
        .filter(({ now, allowed }) => now < allowed)
        .map((w) => `${w.file}: ${w.now} now, SEEDED_STATE_DEBT says ${w.allowed}`)
      expect(stale, 'Lower these in SEEDED_STATE_DEBT:\n' + stale.join('\n')).toEqual([])
    })

    test('an entry whose file is gone is removed', () => {
      const onDisk = new Set(clientFiles())
      const orphans = Object.keys(SEEDED_STATE_DEBT).filter((f) => !onDisk.has(f)).sort()
      expect(orphans, 'Gone — remove from SEEDED_STATE_DEBT:\n' + orphans.join('\n')).toEqual([])
    })

    test('the live workout screen is at zero, and stays there', () => {
      // Both of the day's instances were here, and both were found by opening
      // the page rather than by any test.
      expect(seededIn('src/programs/components/live/LiveWorkoutScreen.tsx')).toBe(0)
      expect(seededIn('src/programs/hooks/useLiveWorkout.ts')).toBe(0)
    })
  })

  /**
   * ONE SPELLING OF "STILL OPEN".
   *
   * `workout_logs_lifecycle` allows three shapes, and the one that catches
   * people is the third: a session written up afterwards has no end time and
   * was never open. On 2026-09-26 four functions in two files had three
   * different answers, one of them written that day — and `src/db/workoutLifecycle.ts`
   * was added, with a comment promising "one predicate now, imported by all of
   * them". A review then found a FIFTH hand-written copy in the very file that
   * imports it, and no test that would have said so. Rule 3 asks for the test
   * that fails when the next caller forgets; this is it.
   *
   * The PostgREST spelling in `getLiveWorkout` is exempt and named: a query
   * filter cannot call a TypeScript predicate.
   */
  describe('One spelling of "a workout that is still open"', () => {
    /**
     * Hand-written variants of "has a start and no end".
     *
     * THE FIRST VERSION DID NOT MATCH THE COPY IT WAS WRITTEN FOR. The line
     * this rule exists because of is
     *
     *     if (log.started_at && !log.ended_at) {
     *
     * and the old regex needed an explicit `ended_at === null`, so it matched
     * neither that nor `Boolean(x.started_at) && x.ended_at === null` nor the
     * reversed order. It also excluded any line containing `[<>]=?` — which
     * matches the `>` in `=>`, exempting every arrow function in the codebase —
     * to spare a range check that lives in `src/tracking`, outside the scanned
     * directories, so the exclusion paid for a line the scan cannot reach.
     *
     * Now: the two column names in either order, within one statement, where
     * one is negated or compared to null and the other is not. Statements, not
     * lines, so a predicate wrapped across two lines still counts.
     */
    const START = /(?:started_at|startedAt)/
    const END = /(?:ended_at|endedAt)/
    const NEGATED_END = new RegExp(`!\\s*\\w*\\??\\.?${END.source}\\b|${END.source}\\s*===?\\s*null`)
    const POSITIVE_START = new RegExp(
      `${START.source}\\s*!==?\\s*null|Boolean\\(\\s*\\w*\\??\\.?${START.source}|\\w*\\??\\.?${START.source}\\s*&&`
    )

    test('nothing rewrites the predicate by hand', () => {
      const offenders: string[] = []
      /**
       * The two slices that own a workout's lifecycle. Scoped, because
       * `started_at`/`ended_at` also name a TRACKING session — a different
       * table with a different rule.
       */
      const owners = [path.join(projectRoot, 'src', 'db'), path.join(projectRoot, 'src', 'programs')]
      for (const file of owners.flatMap((dir) => getAllFiles(dir, /\.tsx?$/))) {
        const rel = path.relative(projectRoot, file).replace(/\\/g, '/')
        if (rel === 'src/db/workoutLifecycle.ts') continue
        const source = withoutCommentsOrStrings(fs.readFileSync(file, 'utf8'), rel)
        /**
         * A LINE, AND A LINE PLUS THE NEXT ONE — never a `;`-split "statement".
         *
         * Splitting on `[;{}]` looked more principled and was useless here:
         * this codebase writes no semicolons, so the chunks were whole function
         * bodies, and the PostgREST exclusion below then matched a `.eq(` from
         * an unrelated query twenty lines away and suppressed the whole block.
         * All three real spellings walked past it. Two lines is enough for a
         * predicate that wraps, and keeps the exclusion next to what it excuses.
         */
        const lines = source.split('\n')
        lines.forEach((line, i) => {
          for (const text of [line, `${line} ${lines[i + 1] ?? ''}`]) {
            if (!NEGATED_END.test(text) || !POSITIVE_START.test(text)) continue
            // `.is("ended_at", null)` and friends are the PostgREST spelling,
            // and a query filter cannot call a TypeScript predicate.
            if (/\.(is|not|or|eq)\(/.test(text)) continue
            offenders.push(`${rel}:${i + 1}  ${text.trim().replace(/\s+/g, ' ').slice(0, 90)}`)
            return
          }
        })
      }
      expect(
        offenders,
        'These spell out "still open" by hand. Use `isOpenWorkout` from\n' +
          'src/db/workoutLifecycle.ts — a session written up afterwards has no end\n' +
          'time either, and every hand-written copy so far has got that wrong:\n' +
          offenders.join('\n')
      ).toEqual([])
    })
  })

  describe('No database message reaches a person', () => {
    /**
     * Measured, not remembered. The previous table was written from a LINE scan
     * that could not see a multi-line throw or a direct `new Error(e.message)`,
     * so six of its numbers were wrong and two whole files were missing.
     */
    const RAW_DB_MESSAGES: Record<string, number> = {
      'src/api_ai/apiAiRepo.ts': 7,
      'src/db/betaRepo.ts': 4,
      'src/db/dashboardRepo.ts': 3,
      'src/db/embeddingsRepo.ts': 8,
      'src/db/embeddingsTestRepo.ts': 7,
      'src/db/errorReportRepo.ts': 4,
      'src/db/goalRepo.ts': 33,
      'src/db/healthRepo.ts': 15,
      'src/db/innerGameProgressRepo.ts': 6,
      'src/db/lifeAnswerRepo.ts': 2,
      'src/db/lifeChapterRepo.ts': 3,
      'src/db/lifePlanDayRepo.ts': 7,
      'src/db/lifePlanRepo.ts': 6,
      'src/db/profilesRepo.ts': 2,
      'src/db/programDraftRepo.ts': 5,
      // 7, not 13. `getEnrollmentById` was cleaned because it sits on the hot
      // path of every workout write; `deleteProgramPermanently` because it
      // answered a deliberate refusal with a 500 carrying Postgres's
      // sentence; and four more when `refusalFrom` learned to write its own.
      // This file holds `removeProgramSession`, which is one of the two
      // routes that delete a workout — it should have been on the raw-message
      // PATH pin from the start, and was still grandfathered at 11 while that
      // pin was being written.
      'src/db/programRepo.ts': 7,
      'src/db/scenarioRepo.ts': 1,
      'src/db/settingsRepo.ts': 17,
      'src/db/timetrackBackupRepo.ts': 2,
      'src/db/timetrackRepo.ts': 5,
      'src/db/trackingRepo.ts': 54,
      'src/db/valueComparisonRepo.ts': 6,
      'src/db/valuesRepo.ts': 5,
      'src/db/viceRepo.ts': 3,
      'src/goals/visionPlanService.ts': 1,
      // The one deliberate passthrough in the codebase. SQLSTATE 55000 is how
      // the schema's own functions say no on purpose, and the sentence they
      // carry was written to be read. `databaseRefusal` is where that lives so
      // it is one documented line rather than a shape nobody can tell from a
      // leak. See src/programs/errors.ts.
      'src/programs/errors.ts': 1,
    }

    /**
     * How many of a file's thrown errors carry something's `.message`.
     *
     * A WHOLE-FILE SCAN OVER BALANCED ARGUMENTS, because the first version read
     * the file a line at a time and an adversarial review found four ways past
     * it in one sitting:
     *
     *   1. a multi-line throw — `new Error(` on one line, the template on the
     *      next — was invisible, and hid two in `embeddingsRepo` and two in
     *      `embeddingsTestRepo`;
     *   2. `new Error(error.message)` has no `${}`, so the simplest possible
     *      leak did not match at all. `programDraftRepo` had five and scored 0;
     *   3. the scan read one non-recursive directory, so `src/api_ai/` — seven
     *      more — was outside it entirely, as any future `src/db/<subdir>/`
     *      would have been;
     *   4. a count taken per line moves when a line wraps, so a message growing
     *      past the print width would have dropped the count and made the
     *      only-shrinks half demand the ratchet be pinned lower for a reason
     *      that had nothing to do with the code.
     *
     * Comments are stripped first: this file's own explanation of the bug is
     * not the bug, and the explanations in the repos are not either.
     */
    const rawMessagesIn = (file: string): number => {
      const source = withoutCommentsOrStrings(
        fs.readFileSync(path.join(projectRoot, file), 'utf8'),
        file
      )
      const constructor = /\bnew\s+\w*(Error|Refused|Failed|Gone|Busy)\w*\s*\(/g
      let found = 0
      for (const match of source.matchAll(constructor)) {
        // The balanced argument list of this constructor, so a `.message` in
        // the NEXT statement is not counted as part of this one.
        let depth = 0
        let end = source.indexOf('(', match.index)
        const open = end
        for (; end < source.length; end++) {
          if (source[end] === '(') depth++
          else if (source[end] === ')' && --depth === 0) break
        }
        if (/\.message\b/.test(source.slice(open, end))) found += 1
      }
      return found
    }

    /** Every TypeScript file under src/, at any depth. */
    const sourceFiles = (): string[] =>
      getAllFiles(path.join(projectRoot, 'src'), /\.tsx?$/)
        .map((f) => path.relative(projectRoot, f).replace(/\\/g, '/'))
        .sort()

    const measured = () =>
      sourceFiles().map((file) => ({
        file,
        now: rawMessagesIn(file),
        allowed: RAW_DB_MESSAGES[file] ?? 0,
      }))

    test('no file writes MORE database messages into an error than it already did', () => {
      const worse = measured().filter(({ now, allowed }) => now > allowed)
      expect(
        worse.map((w) => `${w.file}: ${w.now}, was ${w.allowed}`),
        "These put the database's own sentence where a person will read it. A route\n" +
          'returns a thrown message to the browser verbatim, so a Postgres message in\n' +
          'a repo is Postgres talking to the user. Log it with console.error and throw\n' +
          'a sentence they can act on — see `refuseWrite` and `readRefused` in\n' +
          'src/db/workoutRepo.ts. A deliberate 55000 refusal goes through\n' +
          '`databaseRefusal` in src/programs/errors.ts:\n' +
          worse.map((w) => `${w.file}: ${w.now}, was ${w.allowed}`).join('\n')
      ).toEqual([])
    })

    test('a count that has gone down is written down, so it cannot come back', () => {
      const stale = measured()
        .filter(({ now, allowed }) => now < allowed)
        .map((w) => `${w.file}: ${w.now} now, RAW_DB_MESSAGES still says ${w.allowed}`)
      expect(
        stale,
        'Lower these in RAW_DB_MESSAGES. A ratchet that is not tightened is a\n' +
          'ratchet that lets the work be undone silently:\n' +
          stale.join('\n')
      ).toEqual([])
    })

    test('an entry whose file is gone is removed, so it cannot excuse a new one', () => {
      // A key for a renamed or deleted file is a free pass waiting for the
      // violation to come back at that path. Both tests above iterate the FILES,
      // so neither of them can see a key with no file.
      const onDisk = new Set(sourceFiles())
      const orphans = Object.keys(RAW_DB_MESSAGES).filter((f) => !onDisk.has(f)).sort()
      expect(
        orphans,
        'These are in RAW_DB_MESSAGES and no longer exist. Remove them:\n' + orphans.join('\n')
      ).toEqual([])
    })

    test('the whole workout WRITE PATH is at zero, not just its own file', () => {
      /**
       * NAMED AS A PATH, because naming the file was not enough twice over.
       *
       * It read 0 under the first detector while carrying two
       * `new ProgramRefused(error.message)` — the headline claim measured by a
       * metric blind to it. Then it read 0 honestly, and Postgres still
       * reached the correction screen: the `basedOn` guard calls
       * `readAllRows`, and `src/db/paging.ts` was grandfathered at 1. A
       * statement timeout on that read printed
       * `Failed to read that workout's sets: canceling statement …` under a
       * 500, through the guard written to stop exactly that.
       *
       * So the pin covers every file the write path passes through. A raw
       * message anywhere along it is a raw message on somebody's screen,
       * whichever file it is spelled in.
       */
      for (const file of ['src/db/workoutRepo.ts', 'src/db/paging.ts', 'src/db/workoutLifecycle.ts']) {
        expect(rawMessagesIn(file), `${file} is on the workout write path`).toBe(0)
        expect(RAW_DB_MESSAGES[file], `${file} may not be grandfathered`).toBeUndefined()
      }
    })
  })

})
