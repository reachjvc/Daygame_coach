# Handoff: Prevent Test/Code Drift for Template Names

**Status:** Completed
**Updated:** 04-02-2026

## Changelog
- 04-02-2026: System templates now served directly from code (no DB seeding needed)

## Problem Statement

We just implemented a "single source of truth" pattern for milestones (see `src/tracking/data/milestones.ts`). This prevents code drift by deriving types from data.

However, code review revealed a similar drift problem exists elsewhere:

**E2E tests reference the `standard` template, but it was renamed to `session-review`.**

This means:
1. Tests may pass/fail silently with wrong assumptions
2. Template renames break tests without TypeScript catching it
3. There's no single source of truth for template names

## Solution Implemented

Created `src/tracking/data/templates.ts` following the milestone pattern:

### Single Source of Truth
- `SYSTEM_TEMPLATES` with `as const satisfies` pattern
- `UI_TEMPLATE_SLUGS` for display-only slugs
- Derived types: `SystemTemplateSlug`, `UITemplateSlug`, `TemplateSlug`

### Files Changed
- **NEW**: `src/tracking/data/templates.ts` - single source of truth (includes full field definitions)
- **UPDATED**: `src/tracking/data/index.ts` - exports template types and helpers
- **UPDATED**: `src/tracking/config.ts` - removed duplicate TEMPLATE_COLORS/TAGLINES
- **UPDATED**: `src/tracking/components/templateIcons.tsx` - typed against TemplateSlug
- **UPDATED**: `src/tracking/components/FieldReportPage.tsx` - imports from templates.ts
- **UPDATED**: `src/tracking/components/CustomReportBuilder.tsx` - imports from templates.ts
- **UPDATED**: `src/db/trackingRepo.ts` - serves system templates from code, user templates from DB
- **DEPRECATED**: `scripts/seed_field_report_templates.ts` - moved to scripts/deprecated/
- **UPDATED**: `tests/e2e/field-report.spec.ts` - uses SLUGS constant
- **UPDATED**: `tests/unit/architecture.test.ts` - allowlist for templates.ts

### Architecture Change (04-02-2026)
System templates are now served directly from code instead of being seeded to the database:
- `getFieldReportTemplates()` returns code-defined system templates + DB user templates
- No manual seeding required - template changes deploy with the code
- User-created templates still stored in DB

### Type Safety Benefits
- Typos in template slugs caught at compile time
- Missing icon for new template caught at compile time
- No sync issues between code and database

## Acceptance Criteria

1. [x] E2E tests use correct template names (immediate)
2. [x] Template IDs defined in single source of truth
3. [x] TypeScript type derived from that source
4. [x] Tests import template IDs instead of hardcoding strings
5. [x] `npm test` passes
6. [ ] `npm run test:e2e` passes (if possible to run) - E2E tests not run (requires dev server)

## Context

This is part of a broader effort to prevent "drift" where:
- Code changes in one place
- Tests/types/config don't update
- Failures are silent or confusing

The milestone single-source-of-truth pattern worked well. Applied same pattern here.
