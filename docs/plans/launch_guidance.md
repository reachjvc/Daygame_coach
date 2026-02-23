# Launch Guidance

## 1. Feature Gating — Hide Unshipped Features

App already gates features behind `has_purchased`. For MVP, add **env var feature flags**.

Create `src/shared/featureFlags.ts` reading `NEXT_PUBLIC_FF_*` vars. In Vercel, set production flags to enable only Tracking + Goals + one Scenario. Everything else doesn't appear in navigation. No dedicated service needed — env vars in Vercel's dashboard (different per environment) are sufficient for a solo dev.

`AppHeader.tsx` already conditionally renders links — add `&& isEnabled('FEATURE_X')` conditions alongside existing `hasPurchased` checks.

```typescript
// src/shared/featureFlags.ts
const flags = {
  FEATURE_SCENARIOS: process.env.NEXT_PUBLIC_FF_SCENARIOS === 'true',
  FEATURE_ARTICLES: process.env.NEXT_PUBLIC_FF_ARTICLES === 'true',
  FEATURE_GOALS: process.env.NEXT_PUBLIC_FF_GOALS === 'true',
  FEATURE_TRACKING: process.env.NEXT_PUBLIC_FF_TRACKING === 'true',
  FEATURE_INNER_GAME: process.env.NEXT_PUBLIC_FF_INNER_GAME === 'true',
} as const;

export function isEnabled(flag: keyof typeof flags): boolean {
  return flags[flag];
}
```

## 2. Data Artifacts — Architectural Gap to Fix Before Launch

Most fragile area. Key issues:

- **No validation on most fields.** API route only validates `goal_type` on POST. `display_category`, `linked_metric`, `goal_nature`, `tracking_type` — all unvalidated. Batch create has zero validation.
- **Removing an enum/check value** leaves old rows with stale values. PostgreSQL won't break on SELECT, but UI assumes values are valid.
- **Linked metrics are highest risk.** `syncLinkedGoals()` returns 0 for unknown metrics — goals silently stop tracking.

### Rules

- **Additive-only migrations.** Never remove an enum value; only add.
- **Two-phase deprecation** if removal is needed: (1) stop writing the value in code, (2) backfill existing rows to new values, (3) only then drop the constraint.
- **Defensive rendering.** Unknown enum values should show a fallback, not crash.

## 3. Developing While Live

### Branch Strategy — Simplified GitHub Flow

- `main` = production (auto-deploys to Vercel)
- Feature branches off main, merged via PR
- Every PR gets a Vercel preview URL — free staging

### Database Environments

| Environment | Supabase Instance | Purpose |
|-------------|-------------------|---------|
| Local dev | `supabase start` (Docker) | Daily dev, migration testing |
| Preview/Staging | Separate free-tier Supabase project | PR previews, pre-production |
| Production | Main Supabase project | Live users |

### Migration Rules

- Always test locally with `supabase db reset` first
- Never run untested migrations against production
- Migrations must be additive: add columns with defaults, add tables, add indexes
- Never rename or drop columns with live data without two-phase deprecation

## 4. Mobile — Pragmatic Retrofit

Current state: ~40-50% ready. Tailwind, shadcn/ui, and `MobileNav` exist, but almost zero responsive breakpoints across page components. Full retrofit = 130-210 hours — too much pre-launch.

### Page Triage

| Tier | Pages | Treatment |
|------|-------|-----------|
| Must work on mobile | Field report entry, goal check-in, dashboard | Full responsive retrofit |
| Should be usable | Goal detail, scenario player | Basic readability, no horizontal overflow |
| Desktop-only is fine | Setup wizards, Kanban, Tree view, admin | Skip or add "best on desktop" note |

The app is for guys in the field — "record what just happened" and "check my goals" are the mobile-critical paths. Complex views can stay desktop-only.

### Technical Approach

1. Add responsive breakpoints to Tier 1 pages (`sm:`, `md:`, `lg:` Tailwind prefixes)
2. Switch multi-column layouts to single-column on mobile
3. Touch targets minimum 44x44px
4. Hide complex views (Kanban, Tree) from mobile navigation
5. Test with Chrome DevTools device mode, not just browser resizing

## 5. Launch Playbook

1. **Soft launch to 5-15 hand-picked beta users.** Not a public launch.
2. **Add Sentry free tier** for error monitoring before day one.
3. **Add a "Send Feedback" mailto link** — at <50 users, genuinely enough.
4. **Iterate 2-4 weeks** on beta feedback, then go broader.
5. **Never show "coming soon" dead ends.** Either the feature works or it's invisible.
