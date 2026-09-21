# Where this product is going — the owner's vision

**The owner's own description, condensed by Claude on 2026-09-19 and left in the
owner's voice.** `docs/product/map.md` describes what exists. This describes what
it is for. Read both before proposing work.

Rules for this file:

- The owner adds and corrects items. Claude condenses only when asked, and never
  invents an item or quietly drops one.
- Never renumber. Plans and replies refer to items by number.
- This is a roadmap, not a description. Where it says what exists today, that was
  checked against the code on the date in the last section — check again.

## The destination

1. **A fully fledged tracking app.** Life Mastery is where you decide what you
   want; Tracking is where you live it. They are one system, not two screens.
2. **Everything links to everything.** Journaling, dates, history, goals,
   systems, field sessions, weekly reviews and achievements all read each other
   and converge. Today they only partly do.
3. **Achievements come from the user's own goals and systems** defined in Life
   Mastery, derived automatically, then selectable and customisable, and shown
   somewhere that makes sense.
4. **The pages are the user's own.** Tracking should be genuinely modular — users
   arrange their own page to look the way they want.
5. **Progress should look good.** More graphing, so a person can look at their
   own progress and be pleased with it.
6. **Two tiers.** The basic tier is everything above: free, or about $1.99 a
   month. The premium tier is Scenarios and the pipeline behind them.
7. **Scenarios are the real product.** ~2,000 YouTube videos are downloaded and
   transcribed to build conversations that are actually realistic. This will take
   a long time, because AI cannot make it realistic on its own, and that is
   exactly why it is worth money.
8. **Much later:** a forum, and the owner's own articles.

## What "finished" means

9. Nothing can go wrong. Not "the happy path works".
10. It is 100% secure: nobody can read or take another user's data, and the work
    that is expensive to reproduce — the pipeline, the corpus, the scenario data
    — is not handed to the browser for free.
11. Nobody can spend more AI than they have paid for. (The owner's own example of
    the class — see item 42.)
12. It works on a phone and in a browser. Not enough has been built for phone.
13. Tests are worth their keep: the useless ones removed, the missing ones
    written.
14. It ships through a pipeline, not by hand: staging and production, migrate
    then deploy, every branch checked. Part of the 2026-09-17 decision (item 36).
15. It is not rebuilt later. If the shape is wrong, that is said before it is
    built, not after.

## Area by area

**Life Mastery** (`/life-mastery`)
16. Not operational: the plan lives mostly in the browser and must be saved to
    the database. All of it must become operational and development-ready.
17. Wording and UX need a pass throughout.
18. Affirmations: not built at all.
19. Value prioritisation: not built at all.
20. More customisation of goals and systems, and each must get the correct shape.
21. More goal templates, and some reworked.
22. Role models: to be finished — this one can wait until after launch.

**Tracking** (`/dashboard/tracking`)
23. Achievements are not really functional and are tied to the old system; they
    must be derived from Life Mastery goals and systems (item 3).
24. The page must become modular and user-arranged (item 4).
25. Graphing, so progress looks good (item 5).
26. Field reports, session tracking and weekly reporting must converge with
    goals, journaling and history instead of sitting beside them.
27. The field-report session tracker itself likely needs improvement.

**Workouts** (`/programs`, Training)
28. Being rebuilt now.
29. The path from a Life Mastery plan into the Tracking page must work
    seamlessly.
30. More workout templates may be needed.

**Scenarios and the pipeline** (premium)
31. The scenarios must actually be built out of the transcribed corpus. Long job,
    core value driver.
32. Preferences onboarding moves out of its own page and into daygame /
    Scenarios where it belongs.
33. That onboarding must be improved — the world map will not work on a phone.

**Time tracking** (`/dashboard/time`)
34. Probably mostly done, but needs another look.
35. May need to be integrated further with the rest of the app.

**Infrastructure**
36. Leaving Vercel and Supabase for a managed platform with Postgres on a private
    network and the app's own auth — decided 2026-09-17 on a programmer friend's
    advice. Sequence, what survives and what is rewritten are in the memory note
    `leave-vercel-supabase-decision`. Do not re-litigate it.
37. The friend also asked for CI/CD. The CI half exists (item 43). The CD half —
    migrate then deploy, staging and production — comes with the move.

**Everything else the user sees**
38. Dashboard, front page, settings and every other page need another pass until
    they are actually done — even on a plain "what does this look like" basis.

## How work is chosen

39. Long-term outcome beats speed, every time. An extra day, or the owner having
    to learn something new, is cheaper than a rebuild.
40. Half solutions are not wanted. Neither is the simpler technical road chosen
    because the owner is not a programmer — the owner takes the programmer's
    road.
41. If the owner's own direction is not future-proof, Claude says so before code
    is written.

## Checked against the code on 2026-09-19

Items where Claude read the code rather than taking a description on trust.
Re-check before relying on them.

42. **The AI spend cap is real in one place only.** `checkUserBudget`
    (`src/api_ai/apiAiService.ts`) is called from exactly one file,
    `src/scenarios/keepitgoing/chat.ts`. Ask Coach (`src/qa/providers/claude.ts`),
    `src/scenarios/providers/structuredModel.ts` and `src/shared/claudeHeadless.ts`
    call the model without checking it. The limit is also one hard-coded constant
    for every user — `USER_BUDGET_CENTS` = 20 cents in `src/api_ai/config.ts` —
    not a function of what anyone bought. Item 11 is unmet today — but there are
    no users and no payments, so this is prototype leftover, not a live hole. It
    is a launch blocker, not a today blocker. (Claude got this wrong once, on
    2026-09-19, and raised it as urgent.)
43. **CI exists; CD does not.** `.github/workflows/ci.yml` runs on every branch:
    lint ratchet, type ratchet, unit tests, and database tests against a real
    Postgres. `.github/workflows/e2e.yml` runs Playwright. `.husky/pre-commit`
    and `pre-push` run tests and the ratchets locally. Not covered: `npm audit`,
    secret scanning, and any deploy step — Vercel still deploys on push, which is
    the piece item 37 replaces.
45. **Items 32 and 33 are already done** (checked 2026-09-21, after Claude
    recommended them as the next work off this file alone — read the code).
    *32, onboarding moved into Scenarios:* `ScenariosPage.tsx` renders
    `DatingPreferencesGate` inline under "Before your first scenario", whose own
    copy says these answers are used nowhere else. `/preferences` survives as an
    edit surface reachable from Settings. *33, the map on a phone:* someone
    audited it — 184 shapes under 10px, Poland at 8.9 × 8.4px, no zoom, Next
    disabled until you pick, so "a phone user was simply stuck" — and added a
    tappable list of every region at 52px targets, same data and same handler as
    the map, deliberately not a mobile-only branch so it also serves keyboard and
    screen readers. The gate passes `regionList="list"`, so it is on where it
    matters. What is left is smaller and nobody has asked for it: the map itself
    still has six hover states and zero touch handlers, so on a phone it is
    decoration above the list that does the work.

44. **Achievements: two systems, neither derived from Life Mastery.**
    `src/tracking/achievementsService.ts` computes badges from approach and
    session rows against a fixed rule table (`src/tracking/data/milestoneRules.ts`).
    `src/goals/goalAchievementsService.ts` is a separate per-goal badge system
    reaching the screen through `GoalBadges` → `GoalCard`. Nothing turns a user's
    Life Mastery goals or systems into achievements. Item 3 is a build, not a fix.
