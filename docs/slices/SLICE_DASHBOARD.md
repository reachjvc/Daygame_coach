# Vertical Slice: Dashboard
**Status:** Reference
**Updated:** 29-01-2026 07:46 (Danish time)

## Slice Purpose

The main dashboard page that logged-in users see after authentication. It serves as:
1. **Navigation hub** - Links to training modules (Scenarios, Q&A, Inner Game)
2. **Progress display** - Shows user level, XP, and scenarios completed
3. **Quick preferences** - Embedded UserPreferences component for quick edits
4. **Paywall gate** - Shows preview mode for unpaid users with subscribe CTA
5. **Onboarding gate** - Redirects users who haven't completed onboarding

---

## UI Page

**Route:** `/dashboard`

**App File:** `app/dashboard/page.tsx` (thin server component wrapper)

**Main Component:** `src/dashboard/components/DashboardPage.tsx`

---

## Page Flow

```
User visits /dashboard
    │
    ├─ Not logged in? → Render dashboard in Preview Mode (CTA to log in)
    │
    ├─ Not purchased? → Render dashboard in Preview Mode (CTA to subscribe)
    │
    ├─ Onboarding not completed? → Redirect to /preferences
    │
    └─ All checks pass → Render full dashboard
```

---

## Data Requirements

### Profile Data Needed

The dashboard fetches these fields from the `profiles` table:

| Field | Purpose |
|-------|---------|
| `has_purchased` | Paywall check |
| `onboarding_completed` | Onboarding gate |
| `level` | Display in progress bar |
| `xp` | Display in progress bar |
| `scenarios_completed` | Display in progress bar |
| `age_range_start` | UserPreferences component |
| `age_range_end` | UserPreferences component |
| `archetype` | UserPreferences component |
| `secondary_archetype` | UserPreferences component |
| `tertiary_archetype` | UserPreferences component |
| `dating_foreigners` | UserPreferences component |
| `user_is_foreign` | UserPreferences component |
| `preferred_region` | UserPreferences component |
| `secondary_region` | UserPreferences component |
| `experience_level` | UserPreferences + progress bar |
| `primary_goal` | UserPreferences component |

### Feature Toggles

No feature flag toggles are currently read in the dashboard implementation.

---

## Components

### Main Components

| Component | Location | Purpose |
|-----------|----------|---------|
| `DashboardPage` | `src/dashboard/components/DashboardPage.tsx` | Server component with auth/paywall checks |
| `DashboardContent` | `src/dashboard/components/DashboardContent.tsx` | Client component with main UI |

### Embedded Components (from Profile slice)

| Component | Purpose |
|-----------|---------|
| `UserPreferences` | Quick preference edits |
| `LevelProgressBar` | XP/level display |

---

## Layout Structure

```
┌─────────────────────────────────────────────────────────────┐
│ HEADER                                                      │
│ [Logo] DayGame Coach            [Settings] [Sign Out]       │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│   Welcome Back!                                             │
│   Choose a training module to continue improving            │
│                                                             │
│   ┌─────────────────────────────────────────────────────┐   │
│   │ Level Progress Bar (XP, Level, Scenarios)           │   │
│   └─────────────────────────────────────────────────────┘   │
│                                                             │
│   ┌───────────────┐ ┌───────────────┐ ┌───────────────┐     │
│   │               │ │               │ │               │     │
│   │   SCENARIOS   │ │ COLD APPROACH │ │  INNER GAME   │     │
│   │               │ │  (Coming Soon)│ │               │     │
│   │ [Start]       │ │ [Coming Soon] │ │ [Start]       │     │
│   └───────────────┘ └───────────────┘ └───────────────┘     │
│                                                             │
│   ┌─────────────────────────────────────────────────────┐   │
│   │ User Preferences Card                               │   │
│   │ (Archetype images, Region map, Age slider, etc.)    │   │
│   └─────────────────────────────────────────────────────┘   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## Training Module Cards

| Module | Link | Status |
|--------|------|--------|
| Scenarios | `/dashboard/scenarios` | Active |
| Cold Approach | N/A | Coming Soon (disabled) |
| Inner Game | `/dashboard/inner-game` | Active |
| Q&A Coach | `/dashboard/qa` | Active |

---

## Files in This Slice

```
src/dashboard/
├── types.ts                        # Dashboard-specific types
└── components/
    ├── DashboardPage.tsx           # Server component (auth checks)
    └── DashboardContent.tsx        # Client component (main UI)

app/dashboard/
├── page.tsx                        # Thin wrapper -> DashboardPage
├── qa/
│   └── page.tsx                    # Q&A page (existing)
├── scenarios/
│   └── page.tsx                    # Scenarios page
└── inner-game/
    └── page.tsx                    # Inner game page
```

---

## Security Requirements

### Authentication
- Render Preview Mode if not authenticated

### Subscription Gate
- If `profile.has_purchased === false`:
  - Render Preview Mode with Subscribe CTA

### Onboarding Gate
- If `profile.onboarding_completed === false`:
  - Redirect to `/preferences`

---

## Server Component Structure

**`src/dashboard/components/DashboardPage.tsx`:**

```typescript
export default async function DashboardPage() {
  // 1. Get auth user
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return <DashboardContent profileData={null} isPreviewMode />
  }

  // 2. Get profile
  const { data: profile } = await supabase
    .from("profiles")
    .select("has_purchased, onboarding_completed, level, xp, ...")
    .eq("id", user.id)
    .single()

  // 3. Paywall check
  if (!profile?.has_purchased) {
    return <DashboardContent profileData={null} isPreviewMode />
  }

  // 4. Onboarding check
  if (!profile?.onboarding_completed) {
    redirect("/preferences")
  }

  // 5. Render dashboard
  return <DashboardContent profileData={profile} isPreviewMode={false} />
}
```

---

## Dependencies

### From Profile Slice
- `UserPreferences` component
- `LevelProgressBar` component

### From Auth Slice
- `signOut` action

### Shared UI Components
- `Button`
- `Card`
- From lucide-react: `Target`, `MessageCircle`, `Brain`, `LogOut`, `Settings`

---

## Migration Checklist

### Phase 1: Types
- [ ] Create `src/dashboard/types.ts`

### Phase 2: Components
- [ ] Create `src/dashboard/components/DashboardPage.tsx`
- [ ] Create `src/dashboard/components/DashboardContent.tsx`
- [ ] Update imports to use profile slice components

### Phase 3: App Route
- [ ] Create/update `app/dashboard/page.tsx`

### Phase 4: Feature Toggles
- [ ] (No feature toggles currently used in dashboard)

### Phase 5: Dependencies
- [ ] Ensure Profile slice is complete (UserPreferences, LevelProgressBar)
- [ ] Ensure Auth slice has signOut action

### Phase 6: Testing
- [ ] Verify unauthenticated preview mode works
- [ ] Verify non-subscribed preview mode works
- [ ] Verify onboarding redirect works
- [ ] Verify training module links work
- [ ] Verify preferences component embedded correctly
