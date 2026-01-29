# Vertical Slice: Settings
**Status:** Reference
**Updated:** 29-01-2026 07:46 (Danish time)

## Slice Purpose

Allows logged-in users to:
- View their profile information and progress
- Configure sandbox settings for scenario generation
- Adjust game difficulty level
- Manage their Stripe subscription (view, cancel, reactivate)

This slice provides user customization and subscription management.

---

## UI Page

**Path:** `app/dashboard/settings/page.tsx`

The UI renders 4 tabs:
1. **Profile** - Account info, progress stats, user preferences summary
2. **Sandbox** - Toggle settings for scenario generation (weather, energy, movement, display, environments)
3. **Game** - Difficulty level selection
4. **Billing** - Subscription status, cancellation, reactivation, billing portal access

---

## Server Actions

Settings uses server actions instead of API routes for mutations.

**Actions File:** `src/settings/actions.ts`

### Available Actions

| Action | Parameters | Description |
|--------|------------|-------------|
| `updateSandboxSettings` | `Partial<SandboxSettings>` | Update sandbox toggle settings |
| `resetSandboxSettings` | none | Reset all sandbox settings to defaults |
| `updateDifficulty` | `string` | Set difficulty level |
| `cancelSubscription` | none | Cancel subscription at period end |
| `reactivateSubscription` | none | Reactivate a canceled subscription |
| `openBillingPortal` | none | Get Stripe billing portal URL |

---

## Types

### SandboxSettings

```typescript
interface SandboxSettings {
  weather: {
    enableBadWeather: boolean
    enableHotWeather: boolean
    showWeatherDescriptions: boolean
  }
  energy: {
    enableNegativeEnergies: boolean
    enableNeutralEnergies: boolean
    enableShyEnergies: boolean
    showEnergyDescriptions: boolean
  }
  movement: {
    enableFastMovement: boolean
    enableHeadphones: boolean
  }
  display: {
    showOutfitDescriptions: boolean
    showOpenerHooks: boolean
    showCrowdDescriptions: boolean
  }
  environments: {
    enableGymScenarios: boolean
    enableTransitScenarios: boolean
    enableCampusScenarios: boolean
    enableHighCrowdScenarios: boolean
  }
}
```

### SubscriptionInfo

```typescript
interface SubscriptionInfo {
  id: string
  status: string
  currentPeriodEnd: Date
  currentPeriodStart: Date
  cancelAtPeriodEnd: boolean
  cancelAt: Date | null
  productId: string
  createdAt: Date
}
```

### DifficultyLevel

```typescript
type DifficultyLevel = "beginner" | "intermediate" | "advanced" | "expert" | "master"
```

---

## Service Layer Contract

**File:** `src/settings/settingsService.ts`

### Functions

| Function | Parameters | Returns | Description |
|----------|------------|---------|-------------|
| `handleUpdateSandboxSettings` | `userId, settings` | `SandboxSettings` | Merge and save sandbox settings |
| `handleResetSandboxSettings` | `userId` | `SandboxSettings` | Reset to defaults |
| `handleUpdateDifficulty` | `userId, difficulty` | `void` | Validate and update difficulty |
| `getSubscriptionDetails` | `userId` | `SubscriptionInfo \| null` | Fetch subscription from Stripe |
| `handleCancelSubscription` | `userId` | `void` | Cancel at period end |
| `handleReactivateSubscription` | `userId` | `void` | Reactivate canceled subscription |
| `createBillingPortalSession` | `userId` | `{ url: string }` | Create Stripe portal session |
| `getSettingsPageData` | `userId, email, createdAt` | `{ profile, subscription, stats }` | Get all settings page data |

---

## Repository Layer Contract

**File:** `src/settings/settingsRepository.ts`

All database operations for settings go through this repository.

### Functions

| Function | Description |
|----------|-------------|
| `getSandboxSettings` | Get user's sandbox settings (merged with defaults) |
| `updateSandboxSettings` | Update and merge sandbox settings |
| `resetSandboxSettings` | Reset to DEFAULT_SANDBOX_SETTINGS |
| `updateDifficulty` | Update difficulty in profiles table |
| `getActiveSubscriptionPurchase` | Get user's active subscription purchase record |
| `updateSubscriptionStatus` | Update subscription_status in purchases table |
| `updateSubscriptionCancelledAt` | Update cancellation timestamp in profiles |
| `getScenarioStats` | Get scenario count and average score |
| `getSettingsProfile` | Get full profile for settings page |

---

## Security Requirements

### Authentication
- All settings operations require authenticated user
- User can only modify their own settings

### Subscription Operations
- Stripe operations require valid subscription in purchases table
- Cancel/reactivate operations update both Stripe and local database

### Input Validation
- Difficulty must be one of: beginner, intermediate, advanced, expert, master
- Sandbox settings are merged with defaults (partial updates allowed)

---

## Database Schema

### profiles table additions

| Column | Type | Description |
|--------|------|-------------|
| `sandbox_settings` | JSONB | User's sandbox configuration |
| `difficulty` | VARCHAR | Current difficulty level |
| `subscription_cancelled_at` | TIMESTAMP | When subscription was canceled |
| `scenarios_completed` | INT | Total completed scenarios |

### purchases table additions

| Column | Type | Description |
|--------|------|-------------|
| `stripe_subscription_id` | VARCHAR | Stripe subscription ID |
| `product_id` | VARCHAR | Product ID from products array |
| `subscription_status` | VARCHAR | Local subscription status tracking |

---

## Files in This Slice

```
src/settings/
├── index.ts                    # Public exports
├── types.ts                    # TypeScript interfaces
├── config.ts                   # Configuration
├── settingsService.ts          # Business logic
├── settingsRepository.ts       # Database operations
├── stripe.ts                   # Stripe client utility
├── actions.ts                  # Server actions
└── components/
    └── SettingsPage.tsx        # UI component

app/dashboard/settings/
└── page.tsx                    # Page wrapper
```

---

## Dependencies

- `stripe` - Stripe API client for subscription management
- `@radix-ui/react-switch` - Switch component for toggles
- `@radix-ui/react-tabs` - Tabs component for settings sections
- `lucide-react` - Icons

---

## Integration Points

### Scenario Generation
- Sandbox settings are used by scenario generator to filter scenarios
- File: `src/scenarios/openers/generator.ts`

### Dashboard
- Settings button in dashboard header links to `/dashboard/settings`
- File: `src/dashboard/components/DashboardPage.tsx`

### Products
- Billing tab displays product information from `src/home/products.ts`
