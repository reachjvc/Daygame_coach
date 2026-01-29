# CLAUDE.md

## Changelog
- 29-01-2026 20:45 - Restored compliance checklist
- 29-01-2026 20:40 - Simplified: removed verbose examples, merged sections
- 29-01-2026 20:33 - Added proactive cleanup section with pipeline data flow
- 29-01-2026 10:30 - Added service export pattern standard
- 29-01-2026 08:10 - Added changelog format, auto-approve note
- 29-01-2026 08:05 - Tightened architecture section

## Critical Rules

1. **Verify implementations** - Test after every change. Never assume code works.
2. **Changelog required** - Add entry to top of any doc you modify. Danish time: `TZ='Europe/Copenhagen' date '+%d-%m-%Y %H:%M'`
3. **Quality over speed** - 20 extra hours for better architecture is worth it
4. **Delete over patch** - Prefer clean rewrites. Git has history.

---

## Risk Levels

| Risk | Actions | Requires |
|------|---------|----------|
| LOW | Creating files, docs, types | Just do it |
| MEDIUM | Config, API routes, auth, DB | Explain + confirm |
| HIGH | Production data, secrets, schema, deletes | Explicit approval |

---

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

---

## Proactive Cleanup (Required)

**After major tasks**, report unused items:
- Unused scripts (not in pipeline flow)
- Orphan data folders
- Test artifacts (`*-test/`, `*.backup*`, `test-*.py`)
- Old logs (>7 days)

**Pipeline flow:**
```
01.download → 02.transcribe → 03.audio-features → 04.content → 05.tonality → 06.speakers → 07.LLM-conversations → 08.interactions → 09.enrich → 10.ingest
```

Ask before deleting, but always identify candidates.

---

## Documentation

- **Living docs** - Update existing files, don't create new
- **One source** - Specs in `docs/slices/SLICE_*.md`
- **Max 500 lines** - Split if longer
- **Status headers** - Every doc needs `Status:` and `Updated:`
