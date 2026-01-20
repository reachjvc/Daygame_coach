# Vertical Slice: Dashboard

## Slice Purpose

The main dashboard page that logged-in users see after authentication. It serves as:
1. **Navigation hub** - Links to training modules (Scenarios, Q&A, Inner Game)
2. **Progress display** - Shows user level, XP, and scenarios completed
3. **Quick preferences** - Embedded UserPreferences component for quick edits
4. **Paywall gate** - Redirects unpaid users to pricing page (when enabled)
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
    ├─ Not logged in? → Redirect to /auth/login
    │
    ├─ Paywall enabled AND not purchased? → Show subscription required message
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

The dashboard reads `toggles.json` for feature flags:

| Toggle | Purpose |
|--------|---------|
| `enablePaywall` | Whether to enforce payment check |

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
│   └── page.tsx                    # Scenarios page (future)
└── inner-game/
    └── page.tsx                    # Inner game page (future)

toggles.json                        # Feature toggles file (root)
```

---

## Security Requirements

### Authentication
- Redirect to `/auth/login` if not authenticated

### Subscription Gate
- If `toggles.enablePaywall === true` AND `profile.has_purchased === false`:
  - Show "Subscription Required" message
  - Link to pricing page

### Onboarding Gate
- If `profile.onboarding_completed === false`:
  - Redirect to `/preferences`

---

## Server Component Structure

**`src/dashboard/components/DashboardPage.tsx`:**

```typescript
export default async function DashboardPage() {
  // 1. Read toggles
  const toggles = await getToggles()

  // 2. Get auth user
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect("/auth/login")
  }

  // 3. Get profile
  const { data: profile } = await supabase
    .from("profiles")
    .select("has_purchased, onboarding_completed, level, xp, ...")
    .eq("id", user.id)
    .single()

  // 4. Paywall check
  if (toggles.enablePaywall && !profile?.has_purchased) {
    return <SubscriptionRequired />
  }

  // 5. Onboarding check
  if (!profile?.onboarding_completed) {
    redirect("/preferences")
  }

  // 6. Render dashboard
  return <DashboardContent profileData={profile} />
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
- [ ] Create `toggles.json` in project root

### Phase 5: Dependencies
- [ ] Ensure Profile slice is complete (UserPreferences, LevelProgressBar)
- [ ] Ensure Auth slice has signOut action

### Phase 6: Testing
- [ ] Verify auth redirect works
- [ ] Verify paywall check works
- [ ] Verify onboarding redirect works
- [ ] Verify training module links work
- [ ] Verify preferences component embedded correctly
