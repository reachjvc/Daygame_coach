# Deprecated Scripts

Scripts in this folder are no longer needed.

## seed_field_report_templates.ts

**Deprecated:** 2026-02-04

**Reason:** System templates are now served directly from code (`src/tracking/data/templates.ts`) instead of being seeded to the database. This eliminates sync issues between code and database.

**What changed:**
- System templates (Quick Log, Standard, Deep Dive, Phoenix, CBT Thought Diary) are defined in `src/tracking/data/templates.ts`
- `getFieldReportTemplates()` now returns system templates from code + user templates from DB
- No manual seeding required - changes to templates are deployed with the code

**User-created templates:** Still stored in the database, unaffected by this change.
