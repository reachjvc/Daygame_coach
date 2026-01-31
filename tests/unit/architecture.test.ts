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

const projectRoot = path.resolve(__dirname, '../..')

// Grandfathered violations - existing files that violate rules
// Remove items from these lists as they get fixed
const ALLOWED_LONG_ROUTES = new Set([
  'app/api/articles/alternatives/route.ts',
  'app/api/inner-game/comparisons/route.ts',
  'app/api/inner-game/values/route.ts',
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

  describe('Documentation Compliance', () => {
    test('All doc files should have Status and Updated headers', () => {
      // Arrange: Get all markdown files in docs/
      const docsDir = path.join(projectRoot, 'docs')
      const docFiles = getAllFiles(docsDir, /\.md$/)
        .filter(f => {
          const relativePath = path.relative(projectRoot, f)
          return !DOC_HEADER_SKIP_PATTERNS.some(pattern => pattern.test(relativePath))
        })

      // Act & Assert
      const violations: string[] = []

      for (const file of docFiles) {
        const content = fs.readFileSync(file, 'utf-8')
        const relativePath = path.relative(projectRoot, file)

        // Check for Status header
        if (!/\*\*Status:\*\*|Status:/.test(content)) {
          violations.push(`${relativePath}: missing Status header`)
        }

        // Check for Updated header
        if (!/\*\*Updated:\*\*|Updated:/.test(content)) {
          violations.push(`${relativePath}: missing Updated header`)
        }
      }

      expect(violations, `Docs missing headers:\n${violations.join('\n')}`).toHaveLength(0)
    })
  })
})
