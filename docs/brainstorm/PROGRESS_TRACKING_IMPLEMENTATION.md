# Progress Tracking - Implementation Plan
**Status:** 🟢 ACTIVE
**Updated:** 2026-01-28 (session bug fixed, retroactive logging needed)

## Current State
MVP of Session Tracker completed with core counter, quick logging, goals, and basic stats. Field report template selection UI exists but form is placeholder. Progress dashboard with stats cards, milestones, and session history is functional.

**2026-01-28 Bug Fix:** Session creation was silently failing (errors swallowed). Fixed by making `startSession()` return boolean and displaying errors in dialog. See `docs/codex_tests` for details.

**Phase 1 Gap:** No way to log approaches retroactively (e.g., "I did 5 approaches yesterday"). Need Quick Add feature.

---

## Completed Work

### Database & Backend (2026-01-28)
- ✅ Full database schema: `supabase/migrations/20250128_progress_tracking.sql`
  - Tables: sessions, approaches, field_reports, field_report_templates, reviews, review_templates, user_tracking_stats, milestones, sticking_points
  - Pre-seeded 4 field report templates + 5 review templates
  - RLS policies, indexes, triggers
- ✅ TypeScript types: `src/db/trackingTypes.ts`
- ✅ Repository functions: `src/db/trackingRepo.ts` (full CRUD, stats, milestones)
- ✅ API routes: 13 endpoints under `/api/tracking/*`

### Live Session Tracker (2026-01-28)
- ✅ **Phase 1A: Core Counter** - Large tap button, session timer, time-since-last-approach, haptic feedback, end session flow
- ✅ **Phase 1B: Quick Logging** - Bottom sheet with outcomes, mood selection, quick tags
- ✅ **Phase 1C: Live Stats** (partial) - Approaches/hour, outcome breakdown, collapsible panel
- ✅ **Phase 1D: Session Goals** - Pre-session goal setter, progress bar, goal-met celebration
- ⏳ **Phase 1E: Location Intelligence** - DB schema ready, UI not implemented
- ✅ **Phase 1F: End of Session** (partial) - Summary dialog, link to field report

### Progress Dashboard (2026-01-28)
- ✅ Stats cards (total approaches, numbers, streak, sessions)
- ✅ Quick actions (start session, write report, weekly review links)
- ✅ Recent milestones display
- ✅ Recent sessions with outcome badges
- ✅ Weekly review unlock progress

### Dashboard Integration (2026-01-28)
- ✅ "Progress Tracking" card added to main dashboard

---

## Decisions Log

| Date | Decision | Rationale |
|------|----------|-----------|
| 2026-01-28 | Used JSONB for template fields | Flexibility for static/dynamic field customization |
| 2026-01-28 | Pre-seeded system templates in migration | Ensures templates exist on first use |
| 2026-01-28 | Milestone auto-awarding in repo | Keeps business logic in one place |
| 2026-01-28 | Phase 2: Full customization from 3 templates | User preference |
| 2026-01-28 | Voice button with "Coming Soon" badge | Add from start, enable later |

---

## Remaining Implementation

### Phase 1G: Retroactive Logging (NEXT - Required to complete Phase 1)
1. [ ] Add "Quick Add" button to Progress Dashboard
2. [ ] Create Quick Add modal with:
   - Date/time picker
   - Number of approaches
   - Outcomes (numbers, instadates)
   - Optional: location, tags
3. [ ] Ensure stats update correctly for past dates (streak calculation)

### Phase 2: Field Report Templates

#### Phase 2A: Template System Architecture
1. [ ] Build FieldRenderer component that renders any field type (text, textarea, number, select, scale, datetime, list, tags)
2. [ ] Create template preview showing which questions are included
3. [ ] Implement template selection → form flow
4. [ ] Store user's last-used template as default
5. [ ] Add "favorite" template option

#### Phase 2B: Static + Dynamic Field System
1. [ ] Build field customization modal for dynamic fields
2. [ ] Create "Add Question" flow with question library
3. [ ] Implement "Write Your Own" custom question creator
4. [ ] Add drag-and-drop reordering for dynamic fields
5. [ ] Build "Remove Question" with confirmation
6. [ ] Store user's customizations per template in database
7. [ ] Create "Reset to Default" option

#### Phase 2C-F: Individual Templates
- [ ] Quick Log form implementation
- [ ] Standard Report form implementation
- [ ] Deep Dive form implementation
- [ ] Blow-Out Analysis form implementation

#### Phase 2G: Voice Input Integration
1. [ ] Add microphone button to textarea fields
2. [ ] Implement Web Speech API with start/stop toggle
3. [ ] Show real-time transcription
4. [ ] Handle browser compatibility (hide if unsupported)

#### Phase 2H: Report Enhancements
1. [ ] Tag autocomplete from previous tags
2. [ ] Draft auto-save with recovery
3. [ ] Report history view with filters

---

### Phase 3: Weekly Review System

#### Phase 3A: Review Template Cards
1. [ ] Design 3-card selection UI with template previews
2. [ ] Implement template selection flow
3. [ ] Store user's preferred template

#### Phase 3B-E: Template Implementations
- [ ] "The Quick Win" (5 min)
- [ ] "The Operator" (10 min)
- [ ] "The Deep Thinker" (15-20 min)

#### Phase 3F: Review Scheduling
1. [ ] "Review Due" indicator on dashboard
2. [ ] Streak tracking for consecutive reviews

---

### Phase 4: Progress Visualization (Enhanced)

#### Phase 4A-B: Core Stats
- [ ] Period selector (7d, 30d, 90d, all time)
- [ ] Comparison indicators (↑12% vs last period)
- [ ] Conversion funnel visualization

#### Phase 4C-E: Advanced Visualizations
- [ ] GitHub-style activity heatmap
- [ ] Timeline view with filters
- [ ] Progress graphs with trends

---

### Phase 5: Monthly/Quarterly Reviews (Unlockable)
- [ ] Unlock progress tracking (already shows on dashboard)
- [ ] Monthly review template and form
- [ ] Quarterly review template and form
- [ ] Unlock celebration animations

---

### Phase 6: Community Stats (Future)
- [ ] Anonymous aggregation
- [ ] Percentile benchmarks
- [ ] "Users who do X see Y" insights

---

### Phase 7: Voice-to-Text (Future)
- [ ] Web Speech API integration (free tier)
- [ ] Whisper integration (premium)

---

## Voice-to-Text Technical Reference

**Browser Web Speech API (FREE):**
```javascript
const recognition = new webkitSpeechRecognition();
recognition.continuous = true;
recognition.interimResults = true;
recognition.onresult = (event) => {
  const transcript = event.results[0][0].transcript;
};
recognition.start();
```

- Chrome → Google servers (free)
- Safari → Apple servers (free)
- Firefox → limited support
- Requires internet, quality varies

**Recommendation:** Web Speech API for MVP, Whisper as premium upgrade later.

---

## Database Schema (Implemented)

```sql
sessions           -- id, user_id, started_at, ended_at, goal, goal_met, total_approaches, etc.
approaches         -- id, session_id, timestamp, outcome, tags[], mood, latitude, longitude
field_report_templates -- id, name, slug, static_fields (JSONB), dynamic_fields (JSONB)
field_reports      -- id, user_id, session_id, template_id, fields (JSONB), is_draft
review_templates   -- id, name, review_type, static_fields (JSONB), dynamic_fields (JSONB)
reviews            -- id, user_id, review_type, template_id, fields (JSONB), period_start/end
user_tracking_stats -- user_id, total_approaches, streaks, unlock status (cached)
milestones         -- id, user_id, milestone_type, achieved_at
sticking_points    -- id, user_id, name, status, occurrence_count
```

---

## Files Created

```
supabase/migrations/20250128_progress_tracking.sql
src/db/trackingTypes.ts
src/db/trackingRepo.ts
src/tracking/index.ts
src/tracking/types.ts
src/tracking/hooks/index.ts
src/tracking/hooks/useSession.ts
src/tracking/hooks/useTrackingStats.ts
src/tracking/components/index.ts
src/tracking/components/SessionTrackerPage.tsx
src/tracking/components/FieldReportPage.tsx (placeholder form)
src/tracking/components/ProgressDashboard.tsx
app/api/tracking/session/route.ts
app/api/tracking/session/active/route.ts
app/api/tracking/session/[id]/route.ts
app/api/tracking/session/[id]/end/route.ts
app/api/tracking/sessions/route.ts
app/api/tracking/approach/route.ts
app/api/tracking/approach/[id]/route.ts
app/api/tracking/stats/route.ts
app/api/tracking/stats/daily/route.ts
app/api/tracking/milestones/route.ts
app/api/tracking/templates/field-report/route.ts
app/dashboard/tracking/page.tsx
app/dashboard/tracking/session/page.tsx
app/dashboard/tracking/report/page.tsx
```
