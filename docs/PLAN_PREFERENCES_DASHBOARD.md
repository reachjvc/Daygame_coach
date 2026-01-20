# Implementation Plan: Preferences & Dashboard Slices

## Overview

This plan migrates the **Preferences** and **Dashboard** pages from the old project (`v0-ai-daygame-coach`) to the new project (`daygame-coach`) using vertical slice architecture.

**Goal:** Rebuild the exact same functionality and UI, but with clean architecture.

---

## Source Files Reference

### Old Project: `/home/jonaswsl/projects/v0-ai-daygame-coach/`

| Category | Old Location |
|----------|--------------|
| **Preferences Page** | `app/preferences/page.tsx` |
| **Archetypes Page** | `app/preferences/archetypes/page.tsx` |
| **Secondary Region Page** | `app/preferences/secondary-region/page.tsx` |
| **Dashboard Page** | `app/dashboard/page.tsx` |
| **Preference Actions** | `app/actions/preferences.ts` |
| **Onboarding Action** | `app/actions/onboarding-v2.ts` |
| **UserPreferences Component** | `components/user-preferences.tsx` |
| **OnboardingFlow Component** | `components/onboarding-flow-v2.tsx` |
| **ArchetypeSelector Component** | `components/archetype-selector.tsx` |
| **SecondaryRegionSelector Component** | `components/secondary-region-selector.tsx` |
| **InteractiveWorldMap Component** | `components/interactive-world-map.tsx` |
| **LevelProgressBar Component** | `components/level-progress-bar.tsx` |
| **DashboardClientWrapper Component** | `components/dashboard-client-wrapper.tsx` |
| **Archetypes Data** | `lib/archetypes.ts` |
| **Country Mappings** | `lib/country-mappings.ts` |
| **Map Audit Utils** | `lib/map-audit.ts` |
| **World Map SVG** | `public/world-map.svg` |
| **Archetype Images** | `public/archetypes/` |

---

## New Project Structure

### Target: `/home/jonaswsl/projects/daygame-coach/`

```
src/
├── profile/                           # PREFERENCES SLICE
│   ├── actions.ts                     # Server actions
│   ├── profileService.ts              # Service layer
│   ├── types.ts                       # Types
│   ├── data/
│   │   ├── archetypes.ts              # Archetype definitions
│   │   ├── regions.ts                 # Region/country mappings
│   │   ├── map-audit.ts               # Map path utilities
│   │   ├── experience-levels.ts       # Experience options
│   │   └── primary-goals.ts           # Goal options
│   └── components/
│       ├── OnboardingFlow.tsx         # 5-step onboarding
│       ├── UserPreferences.tsx        # Dashboard embed
│       ├── ArchetypeSelector.tsx      # Archetype picker
│       ├── SecondaryRegionSelector.tsx# Region picker
│       ├── InteractiveWorldMap.tsx    # World map
│       └── LevelProgressBar.tsx       # XP/level bar
│
├── dashboard/                         # DASHBOARD SLICE
│   ├── types.ts                       # Types
│   └── components/
│       ├── DashboardPage.tsx          # Server component
│       └── DashboardContent.tsx       # Client component

app/
├── preferences/
│   ├── page.tsx                       # -> OnboardingFlow
│   ├── archetypes/
│   │   └── page.tsx                   # -> ArchetypeSelector
│   └── secondary-region/
│       └── page.tsx                   # -> SecondaryRegionSelector
│
├── dashboard/
│   └── page.tsx                       # -> DashboardPage

components/ui/
└── slider.tsx                         # NEW: Slider component

public/
├── world-map.svg                      # COPY from old project
└── archetypes/                        # COPY from old project
    ├── 25/
    └── 30/

toggles.json                           # Feature toggles
```

---

## Implementation Steps

### Step 1: UI Component - Slider

The new project needs a Slider component that doesn't exist yet.

**Create:** `components/ui/slider.tsx`

Copy from shadcn/ui or old project's implementation.

---

### Step 2: Profile Data Files

**Create:** `src/profile/data/archetypes.ts`
- Copy from `lib/archetypes.ts`
- Keep `getArchetypes()` function and `AVAILABLE_IMAGES` set

**Create:** `src/profile/data/regions.ts`
- Copy from `lib/country-mappings.ts`
- Keep: `REGIONS`, `ARCTIC_TERRITORIES`, `LOCKED_TERRITORIES`, `COUNTRY_TO_REGION`
- Keep: `getCountryRegion()`, `isArctic()`, `isLocked()`, `HOVER_LABEL_SUPPRESS`

**Create:** `src/profile/data/map-audit.ts`
- Copy from `lib/map-audit.ts`
- Keep: `normalizeCountryId()`, `getDisplayName()`, `isNoiseId()`

**Create:** `src/profile/data/experience-levels.ts`
```typescript
export const EXPERIENCE_LEVELS = [
  { id: "complete-beginner", name: "Complete Beginner", description: "..." },
  { id: "newbie", name: "Newbie", description: "..." },
  // ...
]

export const EXPERIENCE_LABELS: Record<string, string> = {
  "complete-beginner": "Complete Beginner",
  // ...
}
```

**Create:** `src/profile/data/primary-goals.ts`
```typescript
export const PRIMARY_GOALS = [
  { id: "get-numbers", name: "Get Numbers", description: "..." },
  // ...
]
```

---

### Step 3: Profile Types

**Create:** `src/profile/types.ts`

```typescript
export interface UserProfile {
  id: string
  age_range_start: number
  age_range_end: number
  archetype: string
  secondary_archetype?: string | null
  tertiary_archetype?: string | null
  dating_foreigners: boolean
  user_is_foreign?: boolean
  preferred_region?: string
  secondary_region?: string
  experience_level?: string
  primary_goal?: string
  onboarding_completed: boolean
  has_purchased: boolean
  level: number
  xp: number
  scenarios_completed: number
}

export interface ProfileUpdates {
  age_range_start?: number
  age_range_end?: number
  archetype?: string
  secondary_archetype?: string | null
  tertiary_archetype?: string | null
  dating_foreigners?: boolean
  user_is_foreign?: boolean
  preferred_region?: string
  secondary_region?: string | null
  experience_level?: string
  primary_goal?: string
  onboarding_completed?: boolean
  level?: number
}
```

---

### Step 4: Profile Service

**Create:** `src/profile/profileService.ts`

Simple service for profile operations (optional - actions can directly use Supabase).

---

### Step 5: Profile Actions

**Create:** `src/profile/actions.ts`

Copy and adapt from:
- `app/actions/preferences.ts`
- `app/actions/onboarding-v2.ts`

Key actions:
- `completeOnboarding(formData)`
- `updateAgeRange(start, end)`
- `updatePreferredRegion(regionId)`
- `updateSecondaryRegionDirect(regionId)`
- `updateArchetypes(formData)`
- `updateProfilePreference(formData)`

**Important:** Update import paths from `@/lib/supabase/server` to `@/src/db/server`

---

### Step 6: Profile Components

**Create:** `src/profile/components/InteractiveWorldMap.tsx`
- Copy from `components/interactive-world-map.tsx`
- Update import: `@/lib/country-mappings` → `@/src/profile/data/regions`
- Update import: `@/lib/map-audit` → `@/src/profile/data/map-audit`

**Create:** `src/profile/components/LevelProgressBar.tsx`
- Copy from `components/level-progress-bar.tsx`
- No import changes needed

**Create:** `src/profile/components/UserPreferences.tsx`
- Copy from `components/user-preferences.tsx`
- Update imports:
  - `@/app/actions/preferences` → `@/src/profile/actions`
  - `@/lib/archetypes` → `@/src/profile/data/archetypes`
  - `@/components/interactive-world-map` → `./InteractiveWorldMap`

**Create:** `src/profile/components/ArchetypeSelector.tsx`
- Copy from `components/archetype-selector.tsx`
- Update imports:
  - `@/lib/archetypes` → `@/src/profile/data/archetypes`
  - `@/app/actions/preferences` → `@/src/profile/actions`

**Create:** `src/profile/components/SecondaryRegionSelector.tsx`
- Copy from `components/secondary-region-selector.tsx`
- Update imports:
  - `@/lib/country-mappings` → `@/src/profile/data/regions`
  - `@/app/actions/preferences` → `@/src/profile/actions`
  - `@/components/interactive-world-map` → `./InteractiveWorldMap`

**Create:** `src/profile/components/OnboardingFlow.tsx`
- Copy from `components/onboarding-flow-v2.tsx`
- Update imports:
  - `@/app/actions/onboarding-v2` → `@/src/profile/actions`
  - `@/lib/archetypes` → `@/src/profile/data/archetypes`
  - `@/lib/country-mappings` → `@/src/profile/data/regions`
  - `@/components/interactive-world-map` → `./InteractiveWorldMap`

---

### Step 7: Preference App Routes

**Create:** `app/preferences/page.tsx`
```typescript
import { redirect } from "next/navigation"
import { createClient } from "@/src/db/server"
import { OnboardingFlow } from "@/src/profile/components/OnboardingFlow"

export default async function PreferencesPage({ searchParams }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect("/auth/login")
  }

  const stepParam = searchParams?.step
  const initialStep = stepParam ? Math.min(Math.max(Number(stepParam), 1), 5) : undefined

  return <OnboardingFlow initialStep={initialStep} />
}
```

**Create:** `app/preferences/archetypes/page.tsx`
```typescript
import { redirect } from "next/navigation"
import { createClient } from "@/src/db/server"
import { ArchetypeSelector } from "@/src/profile/components/ArchetypeSelector"

export default async function ArchetypesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect("/auth/login")
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("age_range_start, age_range_end, archetype, secondary_archetype, tertiary_archetype")
    .eq("id", user.id)
    .single()

  if (!profile) {
    redirect("/preferences")
  }

  return (
    <ArchetypeSelector
      ageRangeStart={profile.age_range_start ?? 22}
      ageRangeEnd={profile.age_range_end ?? 25}
      initialArchetype={profile.archetype}
      initialSecondaryArchetype={profile.secondary_archetype}
      initialTertiaryArchetype={profile.tertiary_archetype}
    />
  )
}
```

**Create:** `app/preferences/secondary-region/page.tsx`
```typescript
import { redirect } from "next/navigation"
import { createClient } from "@/src/db/server"
import { SecondaryRegionSelector } from "@/src/profile/components/SecondaryRegionSelector"

export default async function SecondaryRegionPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect("/auth/login")
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("preferred_region, secondary_region")
    .eq("id", user.id)
    .single()

  if (!profile?.preferred_region) {
    redirect("/preferences")
  }

  return (
    <SecondaryRegionSelector
      primaryRegion={profile.preferred_region}
      initialSecondaryRegion={profile.secondary_region}
    />
  )
}
```

---

### Step 8: Dashboard Types

**Create:** `src/dashboard/types.ts`
```typescript
export interface DashboardProfileData {
  has_purchased: boolean
  onboarding_completed: boolean
  level: number
  xp: number
  scenarios_completed: number
  age_range_start: number
  age_range_end: number
  archetype: string
  secondary_archetype?: string | null
  tertiary_archetype?: string | null
  dating_foreigners: boolean
  user_is_foreign?: boolean
  preferred_region?: string
  secondary_region?: string
  experience_level?: string
  primary_goal?: string
}

export interface FeatureToggles {
  enablePaywall: boolean
}
```

---

### Step 9: Dashboard Components

**Create:** `src/dashboard/components/DashboardContent.tsx`
- Copy from `components/dashboard-client-wrapper.tsx`
- Update imports:
  - `./user-preferences` → `@/src/profile/components/UserPreferences`
  - `@/components/level-progress-bar` → `@/src/profile/components/LevelProgressBar`

**Create:** `src/dashboard/components/DashboardPage.tsx`
- Server component that handles:
  - Toggle reading
  - Auth check
  - Paywall check
  - Onboarding check
  - Renders `DashboardContent` with profile data

---

### Step 10: Dashboard App Route

**Update:** `app/dashboard/page.tsx`
```typescript
import { DashboardPage } from "@/src/dashboard/components/DashboardPage"

export default DashboardPage
```

---

### Step 11: Static Assets

**Copy:** `public/world-map.svg` from old project
**Copy:** `public/archetypes/` folder from old project

---

### Step 12: Feature Toggles

**Create:** `toggles.json` in project root
```json
{
  "enablePaywall": false
}
```

---

## Verification Checklist

After implementation:

- [ ] `/preferences` loads onboarding flow
- [ ] Onboarding steps 1-5 work correctly
- [ ] Age slider works
- [ ] World map is interactive
- [ ] Region selection works
- [ ] Archetype selection works (up to 3)
- [ ] Experience level selection works
- [ ] Primary goal selection works
- [ ] Onboarding completion redirects to dashboard
- [ ] `/preferences/archetypes` works
- [ ] `/preferences/secondary-region` works
- [ ] `/dashboard` shows training modules
- [ ] Dashboard shows level progress bar
- [ ] Dashboard shows UserPreferences card
- [ ] Preference updates from dashboard work
- [ ] Sign out works
- [ ] Build passes with `npm run build`

---

## Notes

1. **No architectural shortcuts** - All components go in their slice folders
2. **Exact same UI** - Copy components, don't redesign
3. **Update imports** - The main work is updating import paths
4. **Test incrementally** - Verify each piece works before moving on
