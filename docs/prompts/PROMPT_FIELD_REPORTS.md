# Handoff Prompt: Field Report Templates Implementation

## Context
You are continuing work on a daygame coaching platform. The progress tracking feature has been partially implemented - the Session Tracker MVP is complete, but Field Reports need the actual form implementation.

## Required Reading (Do This First)
1. **Read `docs/CLAUDE.md`** - Contains critical rules about architecture, documentation, and quality standards
2. **Read `docs/brainstorm/PROGRESS_TRACKING_IMPLEMENTATION.md`** - Current state and remaining tasks
3. **Read `docs/brainstorm/PROGRESS_TRACKING_IDEAS.md`** - Design philosophy and template specifications

## Current State
- ✅ Database schema complete with `field_report_templates` and `field_reports` tables
- ✅ 4 system templates pre-seeded: "The Speedrun", "The Debrief", "The Forensics", "The Phoenix"
- ✅ Template selection UI exists at `/dashboard/tracking/report`
- ✅ API route exists: `/api/tracking/templates/field-report`
- ❌ **The actual form that renders template fields is a placeholder**

## Your Task
Implement the Field Report form system. Before coding, discuss with me:

### Design Decisions Needed

**1. Static + Dynamic Fields Philosophy**
The templates have `static_fields` (required, can't remove) and `dynamic_fields` (optional, customizable). Each user should be able to:
- See which dynamic fields are currently active
- Add/remove dynamic fields
- Eventually write custom questions

**Options to discuss:**
- A) Start simple: Just render all static + active dynamic fields as a form, add customization later
- B) Full customization from day 1: Include the customization UI in first implementation
- C) Hybrid: Form first, then add "Edit Template" button that opens customization modal

**2. Field Type Rendering**
Templates use these field types: `text`, `textarea`, `number`, `select`, `multiselect`, `scale`, `datetime`, `list`, `tags`

**Questions:**
- Should we build a single `FieldRenderer` component that handles all types?
- How should `list` type work (e.g., "3 wins this week" - 3 separate inputs or dynamic add/remove)?
- Should `scale` be a slider, button group, or emoji picker?

**3. Form UX**
- Should the form auto-save drafts?
- Should there be a progress indicator showing completion?
- On submit, redirect where? (back to dashboard, to the session, stay on page with success message)

**4. Voice Input**
The Browser Web Speech API is free. Should we:
- A) Skip for now, add later
- B) Add a microphone button to textarea fields from the start (progressive enhancement - hide if unsupported)

## Files to Reference
```
src/tracking/components/FieldReportPage.tsx  -- Current placeholder, needs rewrite
src/db/trackingTypes.ts                       -- TemplateField, FieldReportTemplateRow types
src/db/trackingRepo.ts                        -- createFieldReport, getFieldReportTemplates
supabase/migrations/20250128_progress_tracking.sql -- See INSERT statements for template structure
```

## Template Structure Example
```typescript
// From the database
{
  name: "The Speedrun",
  slug: "quick-log",
  static_fields: [
    { id: "datetime", type: "datetime", label: "When", required: true },
    { id: "location", type: "text", label: "Where", required: true },
    { id: "approach_count", type: "number", label: "Approaches", required: true },
    { id: "energy", type: "scale", label: "Energy Level", min: 1, max: 5, required: true }
  ],
  dynamic_fields: [
    { id: "best_moment", type: "textarea", label: "Best moment", placeholder: "What was the highlight?" },
    { id: "improvement", type: "textarea", label: "One thing to improve", ... },
    // ... more
  ],
  active_dynamic_fields: ["best_moment"]  // User's current selection
}
```

## Quality Bar
- Must follow CLAUDE.md architecture (vertical slices, thin route handlers)
- Must handle form validation with clear error messages
- Must be mobile-first (this will often be used on phones after a session)
- Must support draft saving (users might get interrupted)

## Start By
Asking me which approach I prefer for each of the design decisions above, then create a plan before coding.
