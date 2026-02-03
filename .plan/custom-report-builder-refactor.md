# Custom Report Builder Refactor Plan

**Status:** Completed
**Updated:** 03-02-2026

## Overview

Refactor the custom report builder at `app/test/custom-report-builder/page.tsx` to follow proper slice architecture and add database persistence.

## Problem Statement

Currently ALL logic is self-contained in the page component:
- Types (`FieldDefinition`, `FieldCategory`) - violates "types in types.ts" rule
- Config (`FIELD_LIBRARY`, `CATEGORY_INFO`, `SUGGESTED_FIELD_IDS`) - violates "config in config.ts" rule
- No database persistence - users can't save their custom reports

## Architecture Overview

### Current State
```
app/test/custom-report-builder/page.tsx (1350 lines)
├── FieldDefinition interface (line 53)
├── FieldCategory type (line 59)
├── CATEGORY_INFO constant (line 68)
├── FIELD_LIBRARY constant (line 114-659)
├── SUGGESTED_FIELD_IDS constant (line 662)
└── CustomReportBuilderPage component (line 675)
```

### Target State
```
src/tracking/
├── types.ts              + FieldDefinition, FieldCategory, CustomReportConfig
├── config.ts             + FIELD_LIBRARY, CATEGORY_INFO, SUGGESTED_FIELD_IDS
├── trackingService.ts    + saveCustomReportTemplate, getUserCustomReportTemplates, etc.

src/db/
├── trackingTypes.ts      (existing FieldReportTemplateInsert works)
├── trackingRepo.ts       + createCustomReportTemplate, getUserCustomReportTemplates, etc.

app/api/tracking/templates/custom/
├── route.ts              GET (list), POST (create)
├── [id]/route.ts         GET (single), PUT (update), DELETE

app/test/custom-report-builder/
├── page.tsx              Refactored to use slice imports + API calls
```

## Implementation Tasks

### Phase 1: Extract Types (Non-breaking)

**Task 1.1: Add types to `src/tracking/types.ts`**
- Add `FieldCategory` type
- Add `FieldDefinition` interface (extends `TemplateField` from trackingTypes)
- Add `CustomReportConfig` interface for saved configurations
- Add `CategoryInfo` interface for CATEGORY_INFO structure

**Task 1.2: Write unit tests for type compatibility**
- Verify FieldDefinition is compatible with TemplateField
- Verify CustomReportConfig can serialize to/from database format

### Phase 2: Extract Config (Non-breaking)

**Task 2.1: Add config to `src/tracking/config.ts`**
- Move `CATEGORY_INFO` (without JSX - icons will be in a separate component file)
- Move `FIELD_LIBRARY`
- Move `SUGGESTED_FIELD_IDS`
- Add `CATEGORY_ICONS` mapping (string keys → icon component names)

**Task 2.2: Create `src/tracking/components/categoryIcons.tsx`**
- Component that maps category keys to Lucide icons
- This keeps JSX out of config.ts per existing pattern

**Task 2.3: Write unit tests for config**
- Verify FIELD_LIBRARY has all required fields
- Verify all category keys have CATEGORY_INFO entries
- Verify SUGGESTED_FIELD_IDS are all valid field IDs

### Phase 3: Database Layer (Backend)

**Task 3.1: Add functions to `src/db/trackingRepo.ts`**
```typescript
// Custom Report Templates (user-specific, non-system)
export async function createCustomReportTemplate(
  template: FieldReportTemplateInsert
): Promise<FieldReportTemplateRow>

export async function updateCustomReportTemplate(
  templateId: string,
  userId: string,
  updates: FieldReportTemplateUpdate
): Promise<FieldReportTemplateRow>

export async function deleteCustomReportTemplate(
  templateId: string,
  userId: string
): Promise<void>

export async function getUserCustomReportTemplates(
  userId: string
): Promise<FieldReportTemplateRow[]>

export async function getCustomReportTemplate(
  templateId: string,
  userId: string
): Promise<FieldReportTemplateRow | null>
```

**Task 3.2: Write integration tests for trackingRepo**
- Test createCustomReportTemplate inserts with is_system=false
- Test updateCustomReportTemplate only allows owner to update
- Test deleteCustomReportTemplate only allows owner to delete
- Test getUserCustomReportTemplates returns only user's custom templates
- Test templates have proper JSONB fields (static_fields, dynamic_fields)

### Phase 4: Service Layer

**Task 4.1: Add functions to `src/tracking/trackingService.ts`**
```typescript
// Re-export from repo with proper naming
export async function saveCustomReportTemplate(
  userId: string,
  config: CustomReportConfig
): Promise<FieldReportTemplateRow>

export async function updateCustomReportTemplate(
  userId: string,
  templateId: string,
  config: Partial<CustomReportConfig>
): Promise<FieldReportTemplateRow>

export async function deleteCustomReportTemplate(
  userId: string,
  templateId: string
): Promise<void>

export async function getUserCustomReportTemplates(
  userId: string
): Promise<FieldReportTemplateRow[]>

export async function getCustomReportTemplate(
  userId: string,
  templateId: string
): Promise<FieldReportTemplateRow | null>
```

**Task 4.2: Add business logic**
- Validate template name is not empty
- Validate at least one field is selected
- Calculate estimated_minutes from field types
- Generate unique slug from name

### Phase 5: API Routes

**Task 5.1: Create `app/api/tracking/templates/custom/route.ts`**
- GET: List user's custom templates
- POST: Create new custom template

**Task 5.2: Create `app/api/tracking/templates/custom/[id]/route.ts`**
- GET: Get single template (verify ownership)
- PUT: Update template (verify ownership)
- DELETE: Delete template (verify ownership)

**Task 5.3: API route tests via E2E**
- Test unauthorized access returns 401
- Test create with valid data returns 201
- Test update with valid data returns 200
- Test delete returns 204
- Test accessing another user's template returns 403/404

### Phase 6: Refactor Page Component

**Task 6.1: Update imports in `page.tsx`**
```typescript
import { FIELD_LIBRARY, CATEGORY_INFO, SUGGESTED_FIELD_IDS } from "@/src/tracking/config"
import type { FieldDefinition, FieldCategory, CustomReportConfig } from "@/src/tracking/types"
import { CategoryIcon } from "@/src/tracking/components/categoryIcons"
```

**Task 6.2: Add save/load functionality**
- Add `useSavedTemplates` hook or state
- Wire up "Save & Lock" button to POST API
- Add template list/selector UI
- Add loading/error states

**Task 6.3: Remove inline types and config**
- Delete inline FieldDefinition, FieldCategory, etc.
- Delete inline FIELD_LIBRARY, CATEGORY_INFO, SUGGESTED_FIELD_IDS

### Phase 7: Testing

**Task 7.1: Unit tests (tests/unit/tracking/)**
- `customReportConfig.test.ts` - Config validation
- `trackingService.customTemplates.test.ts` - Service layer logic

**Task 7.2: Integration tests (tests/integration/db/)**
- Add to `trackingRepo.integration.test.ts`:
  - Custom template CRUD operations
  - Ownership verification
  - JSONB field handling

**Task 7.3: E2E tests (tests/e2e/)**
- `custom-report-builder.spec.ts`:
  - Create template flow
  - Edit template flow
  - Delete template flow
  - Load saved template flow

## Database Schema

The existing `field_report_templates` table supports this:
```sql
CREATE TABLE field_report_templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,  -- NULL for system
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  description TEXT,
  icon TEXT,
  estimated_minutes INTEGER,
  is_system BOOLEAN DEFAULT FALSE,  -- FALSE for user custom
  base_template_id UUID REFERENCES field_report_templates(id),
  static_fields JSONB NOT NULL DEFAULT '[]',
  dynamic_fields JSONB NOT NULL DEFAULT '[]',
  active_dynamic_fields TEXT[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

For custom reports:
- `is_system = false`
- `user_id = current user's ID`
- `static_fields` = selected FieldDefinition array (as JSON)
- `dynamic_fields` = [] (not used for custom)
- `active_dynamic_fields` = [] (not used for custom)

## Files to Modify

1. `src/tracking/types.ts` - Add new types
2. `src/tracking/config.ts` - Add field library and category config
3. `src/tracking/components/categoryIcons.tsx` - New file for icons
4. `src/db/trackingRepo.ts` - Add CRUD functions
5. `src/tracking/trackingService.ts` - Add service functions
6. `app/api/tracking/templates/custom/route.ts` - New API route
7. `app/api/tracking/templates/custom/[id]/route.ts` - New API route
8. `app/test/custom-report-builder/page.tsx` - Refactor to use slice

## Testing Strategy

Per `docs/testing_behavior.md`:
1. **TDD**: Write tests first for repo/service functions
2. **No mocking**: Use testcontainers for database tests
3. **AAA pattern**: Arrange-Act-Assert in all tests
4. **No false passes**: Tests must fail explicitly on errors

## Risk Mitigation

1. **Breaking changes**: Phase 1-2 are additive only (non-breaking)
2. **Data loss**: No existing user data to migrate (feature is new)
3. **Type compatibility**: FieldDefinition extends TemplateField

## Acceptance Criteria

- [ ] Page component imports types from `src/tracking/types.ts`
- [ ] Page component imports config from `src/tracking/config.ts`
- [ ] User can save a custom report template (persists to database)
- [ ] User can load previously saved templates
- [ ] User can update a saved template
- [ ] User can delete a saved template
- [ ] All unit tests pass
- [ ] All integration tests pass
- [ ] Architecture tests pass (no violations)
- [ ] `npm test` passes after every change
