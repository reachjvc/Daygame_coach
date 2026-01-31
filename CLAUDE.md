# CLAUDE.md

## Changelog
- 30-01-2026 20:07 - Added rule to read testing_behavior.md before writing tests
- 30-01-2026 19:57 - Added mandatory test-driven workflow
- 29-01-2026 20:45 - Restored compliance checklist
- 29-01-2026 20:40 - Simplified: removed verbose examples, merged sections
- 29-01-2026 20:33 - Added proactive cleanup section with pipeline data flow

## Critical Rules

1. **Test-driven workflow (mandatory)**
   - **Always read `docs/testing_behavior.md` before writing any new tests**
   - Run `npm test` between every implementation step
   - All tests must pass before proceeding to next step
   - If a test fails: fix the error, then add a regression test that would have caught it
   - Never skip tests or proceed with failing tests
2. **Changelog required** - Add entry to top of any doc you modify. Danish time: `TZ='Europe/Copenhagen' date '+%d-%m-%Y %H:%M'`. Keep 5 entries of updates.
3. **Quality over speed** - 20 extra hours for better architecture is worth it
4. **No fallback mechanisms** - Do not allow a pipeline/script to run with a fallback. Fix the issue or prompt the user.

Testing
i expect no action to be beyong 2 second. i would rather fail fast and get error code, therefore include thorough code which you also review yourself, if the logging show an error iterate by fixing the error and include a test that would have spotted that error. 


## Architecture (Non-Negotiable)

### Slice Structure
```
src/{slice}/
├── types.ts          # All types
├── config.ts         # Constants
├── {slice}Service.ts # Business logic (function exports, not classes)
├── components/       # Slice UI
└── data/            # Data files
```

### Rules
- **Business logic** → `*Service.ts` only (not in API routes or components)
- **Database** → `src/db/*Repo.ts` only
- **API routes** → Thin wrappers: auth + validate + call service (max 30 lines)
- **Types** → One `types.ts` per slice, not scattered
- **Shared UI** → `components/ui/` (shadcn only)

### Slices
`src/qa/` · `src/inner-game/` · `src/scenarios/` · `src/tracking/` · `src/profile/` · `src/settings/` · `src/db/`

Specs in `docs/slices/SLICE_*.md`

### Compliance Checklist (Before PR)
- [ ] No business logic in `app/api/` routes (only auth + validate + call service)
- [ ] No direct Supabase calls outside `src/db/`
- [ ] All slice types in `types.ts`, not scattered
- [ ] Slice UI in `src/{slice}/components/`, not `components/`
- [ ] Data files in `data/` subfolder, not slice root

## Proactive Cleanup (Required)

**After major tasks**, report unused items:
- Unused scripts (not in pipeline flow)
- Orphan data folders
- Test artifacts (`*-test/`, `*.backup*`, `test-*.py`)
- Old logs (>7 days)

## Documentation

- **Living docs** - Update existing files, don't create new
- **One source** - Specs in `docs/slices/SLICE_*.md`
- **Max 500 lines** - Split if longer
- **Status headers** - Every doc needs `Status:` and `Updated:`
