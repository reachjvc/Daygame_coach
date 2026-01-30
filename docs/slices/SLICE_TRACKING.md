# Vertical Slice: Progress Tracking
**Status:** Active
**Updated:** 30-01-2026 (Danish time)

## Changelog
- 30-01-2026 - Performance optimization: Fixed N+1 query, removed unused fetch, architecture cleanup
- 29-01-2026 15:50 - Initial documentation created

---

## Slice Purpose

Track daygame sessions, approaches, field reports, and weekly reviews. Provides:
- Real-time session tracking with live stats
- Approach logging with outcomes, moods, and tags
- Post-session field reports for reflection
- Weekly reviews with commitment tracking
- Milestone achievements and streak tracking

---

## Data Model

```
Session (1) ──────< Approach (many)
    │
    └─────────────< FieldReport (optional)

User (1) ─────────< Review (many: weekly, monthly, quarterly)
    │
    └─────────────< Milestone (many)
    │
    └─────────────< UserTrackingStats (1)
```

### Core Entities

| Entity | Description |
|--------|-------------|
| **Session** | A tracking session with start/end time, goal, location |
| **Approach** | Single approach within a session with outcome, mood, tags |
| **FieldReport** | Post-session reflection using templates |
| **Review** | Weekly/monthly/quarterly review with commitments |
| **Milestone** | Achievement unlocked (e.g., "100 approaches") |
| **UserTrackingStats** | Aggregated stats per user |

---

## File Structure

```
src/tracking/
├── types.ts              # Types only (interfaces, type re-exports)
├── config.ts             # Pure constants (no JSX) - SESSION_CONFIG, OUTCOME_OPTIONS, etc.
├── schemas.ts            # Zod validation schemas for API routes
├── index.ts              # Barrel exports
├── hooks/
│   ├── index.ts          # Hook exports
│   ├── useSession.ts     # Active session management
│   └── useTrackingStats.ts # Stats fetching (3 parallel API calls)
├── data/
│   ├── index.ts          # Data exports
│   ├── milestones.ts     # ALL_MILESTONES, TIER_INFO, helper functions
│   ├── keyStats.tsx      # Research-backed stats data
│   └── principles.tsx    # 25 reflection principles
└── components/
    ├── index.ts               # Component exports
    ├── SessionTrackerPage.tsx # Main tracking UI
    ├── ProgressDashboard.tsx  # Stats overview (~587 lines)
    ├── FieldReportPage.tsx    # Field report form
    ├── WeeklyReviewPage.tsx   # Weekly review form
    ├── QuickAddModal.tsx      # Quick approach logging
    ├── FieldRenderer.tsx      # Dynamic form field renderer
    ├── KeyStatsSection.tsx    # Research stats display
    ├── PrinciplesSection.tsx  # Principles display
    ├── ResearchDomainsSection.tsx # Research domains
    └── templateIcons.tsx      # Template icons (JSX)
```

---

## API Endpoints

### Sessions

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/tracking/session` | Start new session |
| GET | `/api/tracking/session/active` | Get active session with approaches |
| GET | `/api/tracking/session/[id]` | Get session by ID |
| PATCH | `/api/tracking/session/[id]` | Update session (goal, location) |
| POST | `/api/tracking/session/[id]/end` | End active session |
| DELETE | `/api/tracking/session/[id]` | Delete session |
| GET | `/api/tracking/sessions` | List user's sessions |

### Approaches

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/tracking/approach` | Log new approach |
| GET | `/api/tracking/approach` | List approaches |
| PATCH | `/api/tracking/approach/[id]` | Update approach |

### Field Reports & Reviews

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/tracking/field-report` | Create field report |
| GET | `/api/tracking/field-report` | List reports (supports `?drafts=true`) |
| POST | `/api/tracking/review` | Create review |
| GET | `/api/tracking/review` | List reviews (supports `?type=weekly`) |
| GET | `/api/tracking/review/commitment` | Get latest commitment |

### Stats & Milestones

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/tracking/stats` | Get user tracking stats |
| GET | `/api/tracking/stats/daily` | Get daily stats (supports `?days=30`) |
| GET | `/api/tracking/milestones` | Get user milestones |

### Templates

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/tracking/templates/field-report` | Get field report templates |
| GET | `/api/tracking/templates/review` | Get review templates |

---

## Request/Response Contracts

### POST /api/tracking/session

**Request:**
```json
{
  "goal": 10,
  "primary_location": "City Center"
}
```

**Response:**
```json
{
  "id": "uuid",
  "user_id": "uuid",
  "started_at": "2026-01-29T14:00:00Z",
  "ended_at": null,
  "goal": 10,
  "goal_met": false,
  "total_approaches": 0,
  "duration_minutes": null,
  "primary_location": "City Center",
  "is_active": true
}
```

### POST /api/tracking/approach

**Request:**
```json
{
  "session_id": "uuid",
  "outcome": "number",
  "set_type": "solo",
  "tags": ["day", "street"],
  "mood": 4,
  "note": "Great conversation",
  "latitude": 55.6761,
  "longitude": 12.5683
}
```

**Response:**
```json
{
  "id": "uuid",
  "user_id": "uuid",
  "session_id": "uuid",
  "timestamp": "2026-01-29T14:15:00Z",
  "outcome": "number",
  "set_type": "solo",
  "tags": ["day", "street"],
  "mood": 4,
  "note": "Great conversation"
}
```

### POST /api/tracking/field-report

**Request:**
```json
{
  "template_id": "uuid",
  "session_id": "uuid",
  "fields": {
    "energy_level": 4,
    "biggest_win": "Got a solid number close",
    "sticking_points": ["Opening too indirect"]
  },
  "approach_count": 8,
  "location": "City Center",
  "tags": ["productive"],
  "is_draft": false
}
```

### POST /api/tracking/review

**Request:**
```json
{
  "review_type": "weekly",
  "template_id": "uuid",
  "fields": {
    "sessions_completed": 3,
    "total_approaches": 25,
    "biggest_lesson": "Consistency beats intensity"
  },
  "period_start": "2026-01-20T00:00:00Z",
  "period_end": "2026-01-26T23:59:59Z",
  "previous_commitment": "Do 3 sessions this week",
  "commitment_fulfilled": true,
  "new_commitment": "Focus on instant dates",
  "is_draft": false
}
```

---

## Validation Schemas

All POST/PATCH routes use Zod schemas defined in `src/tracking/schemas.ts`:

| Schema | Used By |
|--------|---------|
| `CreateSessionSchema` | POST /api/tracking/session |
| `UpdateSessionSchema` | PATCH /api/tracking/session/[id] |
| `CreateApproachSchema` | POST /api/tracking/approach |
| `UpdateApproachSchema` | PATCH /api/tracking/approach/[id] |
| `CreateFieldReportSchema` | POST /api/tracking/field-report |
| `CreateReviewSchema` | POST /api/tracking/review |

---

## Hooks

### useSession

```typescript
const {
  state,          // { session, approaches, isActive, isLoading, error }
  liveStats,      // { totalApproaches, sessionDuration, approachesPerHour, ... }
  startSession,   // (goal?, location?) => Promise<boolean>
  endSession,     // () => Promise<void>
  addApproach,    // (data?) => Promise<void>
  updateLastApproach, // (data) => Promise<void>
  setGoal,        // (goal) => Promise<void>
} = useSession({ userId, onApproachAdded, onSessionEnded })
```

**Features:**
- Optimistic updates for instant UI feedback
- Live timer updates every second during active session
- Haptic feedback on approach add (mobile)

### useTrackingStats

```typescript
const {
  state,         // { stats, recentSessions, milestones, isLoading, error }
  refresh,       // () => Promise<void>
  deleteSession, // (sessionId) => Promise<boolean>
} = useTrackingStats()
```

**Performance notes:**
- Fetches 3 endpoints in parallel (stats, sessions, milestones)
- Sessions endpoint uses optimized single JOIN query (not N+1)
- dailyStats removed (was unused)

---

## Enums and Constants

### ApproachOutcome
`'blowout' | 'short' | 'good' | 'number' | 'instadate'`

### SetType
`'solo' | 'two_set' | 'three_plus' | 'mixed_group' | 'mom_daughter' | 'sisters' | 'tourist' | 'moving' | 'seated' | 'working' | 'gym' | 'foreign_language' | 'celebrity_vibes' | 'double_set' | 'triple_set'`

### ReviewType
`'weekly' | 'monthly' | 'quarterly'`

---

## Business Rules

1. **One active session per user** - Starting a new session requires ending the current one
2. **Session duration** - Calculated from `started_at` to `ended_at` (or current time if active)
3. **Approaches per hour** - Only calculated after 3+ minutes to avoid division issues
4. **Goal met** - Set when `total_approaches >= goal` at session end
5. **Streak calculation** - A week is "active" if 2+ sessions OR 5+ approaches
6. **Review unlocks** - Monthly reviews unlock after 4 weekly reviews, quarterly after 12

---

## Components

| Component | Path | Purpose |
|-----------|------|---------|
| `SessionTrackerPage` | `/dashboard/tracking/session` | Active session UI with counter, timer, approach list |
| `ProgressDashboard` | `/dashboard/tracking` | Stats overview, recent sessions, milestones |
| `FieldReportPage` | `/dashboard/tracking/report` | Post-session field report form |
| `WeeklyReviewPage` | `/dashboard/tracking/review` | Weekly review form with commitment tracking |

---

## Database Tables

Tables are defined in Supabase. Types are in `src/db/trackingTypes.ts`:

- `sessions` - Session records
- `approaches` - Approach records
- `field_reports` - Field report records
- `field_report_templates` - System and user templates
- `reviews` - Review records
- `review_templates` - System and user templates
- `user_tracking_stats` - Aggregated user stats
- `milestones` - Unlocked achievements
