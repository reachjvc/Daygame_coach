# Vertical Slice: Preferences (Profile Settings)

## Slice Purpose

Allow logged-in users to view and modify their profile preferences:
- Age range for target matches
- Preferred region (world map selection)
- Secondary region
- Archetypes (primary, secondary, tertiary)
- Experience level
- Primary goal
- Foreign status flags

This slice also includes the **onboarding flow** which collects these preferences for new users.

---

## UI Pages

### Main Pages

| Route | Page Purpose | Component Location |
|-------|--------------|-------------------|
| `/preferences` | Full onboarding flow (5 steps) | `src/profile/components/OnboardingFlow.tsx` |
| `/preferences/archetypes` | Archetype selection page | `src/profile/components/ArchetypeSelector.tsx` |
| `/preferences/secondary-region` | Secondary region selection | `src/profile/components/SecondaryRegionSelector.tsx` |

### Dashboard Integration

The **UserPreferences** component is embedded in the dashboard page, allowing quick preference edits without navigating away.

| Location | Component |
|----------|-----------|
| Dashboard page | `src/profile/components/UserPreferences.tsx` |

---

## Server Actions (API)

All preference updates use Next.js Server Actions (not API routes).

**File:** `src/profile/actions.ts`

### Actions

| Action | Purpose |
|--------|---------|
| `completeOnboarding(formData)` | Complete 5-step onboarding, set `onboarding_completed = true` |
| `updateAgeRange(start, end)` | Update `age_range_start` and `age_range_end` |
| `updatePreferredRegion(regionId)` | Update `preferred_region`, clear secondary if conflict |
| `updateSecondaryRegion(formData)` | Update `secondary_region` |
| `updateSecondaryRegionDirect(regionId)` | Update secondary region (direct call, not form) |
| `updateArchetypes(formData)` | Update archetype, secondary_archetype, tertiary_archetype |
| `updateProfilePreference(formData)` | Generic preference update (experience_level, primary_goal, booleans) |

### Validation Rules

| Field | Validation |
|-------|------------|
| `age_range_start/end` | Integer 18-45, start <= end |
| `region` | Must be in REGIONS list |
| `archetype` | Required if onboarding |
| `experience_level` | One of: complete-beginner, newbie, intermediate, advanced, expert |
| `primary_goal` | One of: get-numbers, have-conversations, build-confidence, find-dates |
| `user_is_foreign` | Boolean |
| `dating_foreigners` | Boolean |

---

## Database Schema

All preferences are stored in the `profiles` table.

| Column | Type | Description |
|--------|------|-------------|
| `id` | uuid | User ID (FK to auth.users) |
| `age_range_start` | int | Min age preference (18-45) |
| `age_range_end` | int | Max age preference (18-45) |
| `archetype` | text | Primary archetype name |
| `secondary_archetype` | text | Secondary archetype name (nullable) |
| `tertiary_archetype` | text | Tertiary archetype name (nullable) |
| `dating_foreigners` | boolean | Whether dating foreigners |
| `user_is_foreign` | boolean | Whether user is foreigner in current location |
| `preferred_region` | text | Primary region ID |
| `secondary_region` | text | Secondary region ID (nullable) |
| `experience_level` | text | Experience level ID |
| `primary_goal` | text | Primary goal ID |
| `onboarding_completed` | boolean | Whether onboarding is done |
| `level` | int | Gamification level |
| `xp` | int | Experience points |
| `scenarios_completed` | int | Count of completed scenarios |

---

## Service Layer

**File:** `src/profile/profileService.ts`

```typescript
// Get user profile with all preferences
export async function getUserProfile(userId: string): Promise<UserProfile | null>

// Check if user has completed onboarding
export async function hasCompletedOnboarding(userId: string): Promise<boolean>

// Update profile preferences (validates input)
export async function updateProfile(
  userId: string,
  updates: Partial<ProfileUpdates>
): Promise<void>
```

---

## Data Files

These are **pure data files** with no business logic:

| File | Purpose |
|------|---------|
| `src/profile/data/archetypes.ts` | Archetype definitions with images |
| `src/profile/data/regions.ts` | Region list and country mappings |
| `src/profile/data/map-audit.ts` | Map path normalization utilities |
| `src/profile/data/experience-levels.ts` | Experience level options |
| `src/profile/data/primary-goals.ts` | Primary goal options |

---

## Components

### Main Components

| Component | Location | Purpose |
|-----------|----------|---------|
| `OnboardingFlow` | `src/profile/components/OnboardingFlow.tsx` | 5-step onboarding wizard |
| `UserPreferences` | `src/profile/components/UserPreferences.tsx` | Dashboard preferences card |
| `ArchetypeSelector` | `src/profile/components/ArchetypeSelector.tsx` | Full-page archetype picker |
| `SecondaryRegionSelector` | `src/profile/components/SecondaryRegionSelector.tsx` | Full-page secondary region picker |
| `InteractiveWorldMap` | `src/profile/components/InteractiveWorldMap.tsx` | Interactive SVG world map |
| `LevelProgressBar` | `src/profile/components/LevelProgressBar.tsx` | XP/Level progress display |

### Shared UI Components Needed

These must exist in `components/ui/`:
- `Button`
- `Card`
- `Badge`
- `Slider`
- `Dialog`

---

## Files in This Slice

```
src/profile/
├── actions.ts                      # Server actions for preference updates
├── profileService.ts               # Profile service layer
├── types.ts                        # TypeScript types
├── data/
│   ├── archetypes.ts               # Archetype definitions
│   ├── regions.ts                  # Region/country mappings
│   ├── map-audit.ts                # Map path utilities
│   ├── experience-levels.ts        # Experience level options
│   └── primary-goals.ts            # Primary goal options
└── components/
    ├── OnboardingFlow.tsx          # 5-step onboarding
    ├── UserPreferences.tsx         # Dashboard preferences card
    ├── ArchetypeSelector.tsx       # Archetype picker page
    ├── SecondaryRegionSelector.tsx # Secondary region picker page
    ├── InteractiveWorldMap.tsx     # SVG world map
    └── LevelProgressBar.tsx        # XP/level progress bar

app/preferences/
├── page.tsx                        # Thin wrapper -> OnboardingFlow
├── archetypes/
│   └── page.tsx                    # Thin wrapper -> ArchetypeSelector
└── secondary-region/
    └── page.tsx                    # Thin wrapper -> SecondaryRegionSelector

public/
├── world-map.svg                   # World map SVG file
└── archetypes/                     # Archetype images
    ├── 25/
    │   ├── corporate-powerhouse.jpg
    │   ├── ethereal-creative.jpg
    │   └── ...
    └── 30/
        └── ...
```

---

## Security Requirements

### Authentication
- All preference pages require login
- Redirect to `/auth/login` if not authenticated

### Authorization
- Users can only modify their own profile
- Server actions must verify `user.id` matches profile being updated

### Input Validation
- All server actions validate input before database updates
- Region IDs checked against REGIONS list
- Experience/goal values checked against allowed sets
- Age range clamped to 18-45

---

## Migration Checklist

### Phase 1: Data Files
- [ ] Create `src/profile/data/archetypes.ts` (from `lib/archetypes.ts`)
- [ ] Create `src/profile/data/regions.ts` (from `lib/country-mappings.ts`)
- [ ] Create `src/profile/data/map-audit.ts` (from `lib/map-audit.ts`)
- [ ] Create `src/profile/data/experience-levels.ts` (extract from onboarding)
- [ ] Create `src/profile/data/primary-goals.ts` (extract from onboarding)

### Phase 2: Types
- [ ] Create `src/profile/types.ts` with all preference types

### Phase 3: Service Layer
- [ ] Create `src/profile/profileService.ts`

### Phase 4: Server Actions
- [ ] Create `src/profile/actions.ts` (from `app/actions/preferences.ts` + `onboarding-v2.ts`)

### Phase 5: Components
- [ ] Copy `InteractiveWorldMap.tsx` to `src/profile/components/`
- [ ] Copy `LevelProgressBar.tsx` to `src/profile/components/`
- [ ] Copy `UserPreferences.tsx` to `src/profile/components/`
- [ ] Copy `ArchetypeSelector.tsx` to `src/profile/components/`
- [ ] Copy `SecondaryRegionSelector.tsx` to `src/profile/components/`
- [ ] Copy `OnboardingFlowV2.tsx` to `src/profile/components/OnboardingFlow.tsx`
- [ ] Update all imports to use new paths

### Phase 6: UI Components
- [ ] Add `Slider` component to `components/ui/`

### Phase 7: App Routes
- [ ] Create `app/preferences/page.tsx`
- [ ] Create `app/preferences/archetypes/page.tsx`
- [ ] Create `app/preferences/secondary-region/page.tsx`

### Phase 8: Static Assets
- [ ] Copy `public/world-map.svg`
- [ ] Copy `public/archetypes/` folder

### Phase 9: Testing
- [ ] Verify onboarding flow works
- [ ] Verify preference updates work
- [ ] Verify map interaction works
- [ ] Verify archetype selection works
