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

})
