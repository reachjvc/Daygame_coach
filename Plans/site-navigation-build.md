# Site navigation build: option E (Home + tool grid)

**Written 2026-11-09** after the owner said of the before/after page: "I quite like this."
**Status: not started.** Follows `Plans/site-navigation.md` (the choice). This plan builds it.

## Owner-only items (answer once, before Phase 0)

| ID | What, in plain words | Recommendation |
|---|---|---|
| O1 | Pinning a tool to Home (the ☆) has to be remembered on your phone *and* your laptop, so it needs one new empty column in your live database. Adding it deletes nothing and can be taken out again. | **Yes**, but only in Phase 6, after you have used the new Home for a few days. If no: Home shows a fixed set of tiles and the ☆ is left out. |
| O2 | Some things will no longer appear in two places, for example the plan and training cards on Tracking once they are on Home, and the "coming soon" cards on the Dashboard. Under your rule nothing is removed unless you say so. | Nothing is removed during the build. Each one is listed on the sign-off page as **"proposed to remove"**, and you mark it there. |

Nothing in this plan costs money.

## What gets built (from the before/after page, https://claude.ai/artifact/3BV7cJWjt5YS5RPZtvFtej)

- **Phone bar: Home · Plan · Activity · You** (four slots; the limit is six).
- **Home** replaces the Dashboard. At the top is a grid of tool tiles with an **All tools** tile. Below it are cards for today's plan, training, field sessions and time.
- **All tools** replaces the More sheet. It lists every tool in two groups, Dating and Life, and each tool has a ☆ (the ☆ comes in Phase 6).
- **Activity** is today's Tracking page under a new name.
- **You** holds Settings, plus your level and a link to your dating answers.
- **Ask Coach becomes a tile**, not a tab. Inner Game and the Black Box get tiles too. Today, Inner Game can only be reached from a Dashboard card, and the Black Box only from inside the plan.
- **Laptop: a left sidebar** with the same items. Time keeps its own sidebar, and the site sidebar folds down to icons there.

## What could go wrong, and what this plan does about each

Each item below was checked in the code on 2026-11-09. Paths are given so the building session can check again.

### Things that would hurt the owner directly

1. **Every push goes live, and the owner is the only user.** A half-finished bar is what he would open in the street.
   *Do:* build in a git worktree. Ship each phase as one fast-forward to `main`, and only when that phase works on its own. After each push, check the live `healthz` buildId (memory: vercel-late-deploy-rollback).
2. **Content disappears.** The new Home replaces the Dashboard (`src/dashboard/components/DashboardContent.tsx`). That page holds the Scenarios, Cold Approach (coming soon), Inner Game, Ask Coach, Progress and Articles cards, the "Ready to start" block, the dating preferences and the world map. Moving cards from Tracking to Home would also take them off Tracking. The memory rule no-removal-until-owner-says forbids both.
   *Do:* every block keeps a home, on Home, on All tools or where it already is. Duplicates stay duplicated. They are listed for O2 on the sign-off page.
3. **A tool becomes unreachable.** Inner Game is linked only from the Dashboard. If Home drops that card, Inner Game is gone.
   *Do:* run `tests/unit/navigation/routeReachability.test.ts` after every phase, and the Phase 4 audit opens every tool from Home in a real browser.
4. **Non-payers bounce silently.** `app/(app)/coach/page.tsx` redirects anyone without a purchase to `/dashboard` with no message, and Scenarios has its own paywall (`src/scenarios/components/ScenariosPage.tsx`). A Coach tile on Home would send a non-payer back to the same Home with nothing said.
   *Do:* one function decides a tile's access, `tileAccess(tile, profile)`. Today it reads `has_purchased`. A locked tile shows a lock and opens the paywall, never a silent bounce. The payment model may change to a cheap tier or scenario packs, and then only that one function changes.
5. **The plan's own buttons collide with the bar.** `/plan` hides the whole site frame today (`HIDDEN_ROUTE_PREFIXES` in `components/navTabs.ts`) because its pages draw fixed bottom bars (`src/goals/components/setup/BottomBar.tsx`, `LifeMasteryFlow.tsx`, `NorthStarFlow.tsx`, `NewGoalsFlow.tsx`, `VisionPlanLab.tsx`). The before/after page shows the bar kept on the plan.
   *Do:* split the rule. The plan's daily screens (Today, Track, Journal, Review) keep the site bar, and their "← Track · Journal →" controls move to the top. Setup and wizard steps keep hiding the bar, as now.
   *Watch:* `Plans/life-plan-after-setup.md` is a live plan on these same pages. The memory rule life-plan-rebuild-needs-visual-signoff applies to them, so the owner signs off these screens on the sign-off page too.
6. **Time ends up with two bars.** On a phone, Time hides the site bar and draws its own (`PHONE_BAR_HIDDEN_PREFIXES`). On a laptop it has its own sidebar beside the header.
   *Do:* on the phone, keep Time exactly as it is. On a laptop, fold the site sidebar to icons on `/time`. Time is a copy of Toggl made on purpose, so its own layout does not change.
7. **The laptop sidebar squeezes every page.** A sidebar about 220px wide takes width from pages that were laid out for the full screen.
   *Do:* this is its own phase (3), and it ships only after before/after screenshots of every page at 1280px and 1024px. If a page breaks, the sidebar folds to icons on that page.
8. **The installed app and old links.** The manifest's `start_url` is `/dashboard` (`app/manifest.ts`). Push notifications, bookmarks and the time tracker's copied links carry old addresses.
   *Do:* addresses stay the same until Phase 5. Phase 5 renames them through the existing redirect table (`LEGACY_ROUTES`, `src/shared/routes.ts`; guarded by `legacyRoutes.test.ts`), so every old address still arrives. The service worker list (`public/sw.js` `SHELL_PATHS`: /time, /plan/quit-vice, /training/live, /audit) contains none of the renamed pages. Keep it unchanged.
9. **The landing page gets slow.** Home would run the Dashboard's queries plus Tracking's (layout, life plan, day rows, workouts, season), and it is the first thing that loads.
   *Do:* reuse the existing loaders in parallel and stream the cards with Suspense, so the tiles draw at once. Measure Home's load time on the test stack against today's Dashboard. Phase 1 is not done if Home is more than 300 ms slower.

### Things that would cost time or break other work

10. **Other sessions share this checkout.** Right now `Plans/conversation-map-social-stoic.md` is staged and `AGENTS.md` is untracked, both by someone else. `Plans/alpha-test-week-audit-time.md` (not started) records tap paths through the current bar, so this change invalidates them.
    *Do:* use a worktree, and commit with `git commit --only <paths>`; never `git add -A` or `git stash`. Before Phase 2, add a line to the alpha-test plan: "nav changes on <date>; re-count paths."
11. **Guard tests encode today's bar.** The unit tests are `tests/unit/navigation/` (appFrame, tabBarDestinations, tabBarCurrent, backNavigation, routeList, routeReachability, legacyRoutes, sweepCoverage and others). The e2e specs are `tests/e2e/site-frame.spec.ts` plus about 37 specs that use the routes. Many test ids are tied to the old header (`header-dashboard-link`, `header-settings-link`, `header-life-mastery-link`).
    *Do:* change these tests on purpose, keeping each one's reason. Never delete a guard to get a green run. Keep the old test ids on the new items where the meaning is the same.
12. **The pre-commit hook runs only vitest.** It does not type-check.
    *Do:* run the typecheck ratchet before every push (memory: typecheck-before-push), and run the e2e suite from the worktree (memory: worktree-e2e-servers).
13. **Names clash in the code.** "Dashboard" means two things today: `src/dashboard` is the dating page, and `src/tracking/dashboardService.ts` is Tracking's widget layout. Adding "Home" and "Activity" makes four names for two pages.
    *Do:* name the new slice `src/home`. Leave the internals of `src/tracking` alone in this plan. Only labels and, in Phase 5, addresses change.
14. **The plan has two names.** The bar says "Your plan" and the page says "Life Mastery" (`ROUTE_LABELS_LIFE_MASTERY`). The new bar says "Plan".
    *Do:* keep the one constant and change its value. The page's own title is a separate decision, so list it on the sign-off page.
15. **The codebase may be rebuilt.** Jacob advised rebuilding from scratch, and the owner is undecided (memory: project-rewrite-with-jacob). If the rebuild happens, this work is thrown away.
    *Do:* Phases 1–2 alone give the owner the new bar and Home, about a third of the work. Stop and ask before Phase 3 if a rebuild has been decided by then.

### Things that are easy to get subtly wrong

16. **Back links and `?from`.** `components/BackLink.tsx` and `ROUTE_LABELS` name the page you came from. A screen opened from Home must say "← Home", not "← Dashboard". There are hard-coded "Dashboard" labels in `TimetrackScreen.tsx`, `time/loading.tsx`, `admin/ai-usage/page.tsx` and InnerGame's `WelcomeCard` and `SummaryPage`.
17. **Where people land after login.** `src/profile/loginDestinationService.ts` and `src/profile/actions.ts` redirect to `ROUTES.dashboard`, and the preferences onboarding passes `next={ROUTES.dashboard}`. All of them land on Home, because Home *is* that route until Phase 5.
18. **Revalidation.** `src/settings/actions.ts` and `src/profile/actions.ts` call `revalidatePath(ROUTES.dashboard)`. Once settings and level show on You and on Home, those paths must be revalidated too, or You shows the old level.
19. **The installed app has no browser back** (`display: standalone`). Every new screen (All tools, You) needs its own way back or a bar.
20. **Tap counts.** E's 11 taps were counted on a drawing. Count the six tasks again on the real build. If any task takes more taps than the drawing promised, say so.
21. **The copied system.** Grab's Home is service tiles plus a "More" tile and cards, and its profile sits in a corner. This build moves profile into a "You" tab because there are no messages, which is a deliberate change from Grab. Do not invent other changes. Copy Grab's tile behaviour, such as whether tiles can be reordered, from current screenshots, not from memory.

## Phases

Each phase ships on its own. Before a phase can ship: unit tests green, typecheck ratchet passing, the e2e suite for touched routes green from the worktree, screenshots at 320, 375 and 1280px in light and dark, and the live buildId checked after the push.

| # | Phase | Ships | Done when |
|---|---|---|---|
| 0 | **Read and baseline.** Read this plan, the before/after page's `marks` db (doc `ba--E` and row notes) and the Five Ways page's marks. Make a worktree on the test stack. Take baseline screenshots of every page, run the full test suite, and time Home's load. | nothing | Baseline saved in the scratchpad. Marks read and quoted in the report. Any owner note that changes this plan is applied to it first. |
| 1 | **Home and All tools**, built at `/dashboard`. Tiles include Coach, Inner Game and the Black Box, with locks through `tileAccess`. The cards reuse existing loaders. The old Dashboard blocks stay, folded below the cards or on All tools. Nothing else changes. | yes | Every tool can be opened from Home. A non-payer test account sees locks, not bounces. Load time is within 300 ms of baseline. |
| 2 | **Phone bar: Home · Plan · Activity · You.** The More sheet is replaced by the All tools tile. "You" is `/settings` plus level and a link to your dating answers. The plan's daily screens keep the bar; its setup steps still hide it. Time is unchanged. Labels and back links are updated. | yes | The six tasks are re-counted on the real phone build. Reachability test green. Alpha-test plan noted. |
| 3 | **Laptop sidebar.** The same items as the phone. Folds to icons on `/time`, and on any page the screenshots show breaking. | yes | Before/after screenshots of every page at 1024 and 1280px. No page has horizontal scroll. |
| 4 | **Adversarial audit and owner sign-off.** At least 3 independent reviewers try to break it: dead links, locked tiles, standalone mode, the plan wizard, Time, dark mode, a signed-out visitor. Fix what they find. Then publish one sign-off page: real screenshots now vs after, every "proposed to remove" item (O2), the plan's daily screens, and the "Life Mastery" vs "Plan" name. Each gets Yes/No and the note log (memory: review-boards-note-log). | the page | Audit findings fixed or listed. Page published. Report says "built and live", never "done", until the owner marks it. |
| 5 | **Addresses** (only after the owner marks Phase 4): `/dashboard`→`/home`, `/tracking`→`/activity`, `/settings`→`/you`, through `LEGACY_ROUTES`. Also update the manifest `start_url`, revalidate paths and `docs/product/map.md`. Apply the marked removals. | yes | `legacyRoutes.test.ts` green. Every old address redirects on the live site. |
| 6 | **☆ pins** (only if O1 is yes): one additive column on `profiles`, read and written in `src/db/profilesRepo.ts`. Back up first and apply with the owner's yes (memory: live-db-backup-method). | yes | A pin set on the phone shows on the laptop. Taking the column out again is written down. |

## Blockers

| ID | What | Attempted, result | Recommendation |
|---|---|---|---|
| B1 | The owner has not marked `ba--E` in the db; he said "I quite like this" in chat | Read the marks on 2026-11-09: none | Treat the chat line as yes to E as drawn. Still read the marks in Phase 0, and a later note wins. |
| B2 | Grab's tile behaviour (reorder, "All" tile) is not confirmed from screenshots | Not attempted | Check once in Phase 1 from the store listing or help pages. If it cannot be confirmed, keep the drawing and say so. |

## Questions already decided (the owner can overrule)

| Question | Decision | Why |
|---|---|---|
| Rename the addresses? | Yes, but last (Phase 5) | The site's rule is that a tab's page is named what its tab says (`Plans/site-structure.md`). Last, because redirects are the riskiest part to roll back. |
| Coach as a tab? | No, a tile | A locked tab in the bar is a dead slot for non-payers. |
| Remove duplicated cards from Tracking? | Not without O2 marks | Rule: no removal until the owner says. |
| Fix the other findings (step numbers out of order, two "North Star"s, Settings icon-only tabs, empty Articles)? | Not in this plan | They are separate pages' bugs. List them on the sign-off page as follow-ups. |
