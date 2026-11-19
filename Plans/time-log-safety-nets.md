# Time Log safety nets

Written 2026-11-19. Status: **proposed**. Nothing here is decided until the
owner says so (his rule, 2026-11-18). Questions Q1–Q3 are his.

## In plain words

The Time Log works about 90% on the PC. Changes made for the phone broke things
there, and one bug still comes back now and then: **he opens the Time Log on
his phone after a timer ran on the phone or on the PC, and sometimes it is
wrong.** The goal is not more features. It is that the Time Log stops getting
worse without him knowing.

This plan does only the cheap, high-value parts:

1. Find and fix the "sometimes wrong when I reopen it on the phone" bug, with a
   robot test that fails before the fix and passes after it.
2. Write down the 10 things he does every day in the Time Log, in plain words,
   and give each one a robot test at phone size and at PC size.
3. Take an approved photo of every main Time Log screen at phone size and at
   PC size. Any later change to a screen stops and shows him before and after.
4. Test the clock traps (midnight, summer/winter time, very long timers) with a
   fake clock, so they fail on any day instead of twice a year.
5. If he says yes: lock those tests so no Claude session can quietly change
   them (Q2), and hold the live site back when they fail (Q3).
6. An independent attack on the result, then a report: what should now never
   break silently, and what he still has to change.

Left out on purpose, because it costs much more: mutation testing, a paid
real-device service, a crash service like Sentry, tests for the rest of the
site, and any new Time Log features. The known open bugs (below) stay open
unless they turn out to be the reopen bug.

The rebuild he is coding himself (`~/projects/10kdaysclub`) is not touched. The
10 stories from Phase 0 are written so he can reuse them there as the first
tests of his own version.

## Research (his rule: say what is checked and what is from memory)

Checked on 2026-11-19:
- An instruction like "never edit tests" in CLAUDE.md only gets weighed by the
  model; nothing enforces it. Practitioners pair a Claude Code `PreToolUse`
  hook (exit code 2 refuses the call) with a CI check, because a hook runs on a
  machine the agent can reach. One study found frontier agents often route
  around read-only files instead of stopping.
  [developertoolkit.ai](https://developertoolkit.ai/en/workflows/test/protect-the-oracle/),
  [dev.to](https://dev.to/penloom_studio_829b7817d3/your-ai-agent-will-pass-any-test-its-allowed-to-edit-51fo),
  [LessWrong](https://lesswrong.com/posts/GHrqBKr8GLpbce6mN/door-s-locked-try-the-window),
  [Claude Code hooks guide](https://code.claude.com/docs/en/hooks-guide).
  Tried here (B4): the hook refused the edit and the agent stopped.
- Vercel Deployment Checks hold a production deployment until chosen GitHub
  checks pass. Jobs are matched by name, and the docs warn about clashes with
  GitHub branch protection. "Force Promote" is the way around it.
  [Vercel docs](https://vercel.com/docs/deployment-checks), updated 2026-08-11.
- Screenshot tests: create and compare the photos in one pinned Linux Docker
  image that matches the installed `@playwright/test`, never on a laptop.
  Turn off animations, hide changing content, and set a small pixel tolerance.
  [Argos](https://argos-ci.com/blog/playwright-visual-regression-testing-ci),
  [Argos on flaky shots](https://argos-ci.com/blog/fix-flaky-visual-tests).

From memory, not re-checked: the test pyramid; "every bug gets a test first";
Playwright `page.clock` and `--repeat-each`; freezing a Chromium page through
CDP `Page.setWebLifecycleState`.

## What exists today (checked 2026-11-19)

- 182 unit test files in `tests/unit/timetrack/`. Many already cover two
  devices (`deviceHarness.tsx`, e.g. `aSleepingPhoneCannotRestartAStoppedTimer`,
  `leavingAndComingBackForgetsNothing`, `aChangeMadeWithNoSignalSurvivesAReopen`).
  They run in jsdom, not in a real browser.
- Browser tests: `tests/e2e/mobile/mobile-toggl.spec.ts` (sizes, tap targets,
  sheets), `timetrack-sync.spec.ts`, `timetrack-edge-cases.spec.ts`,
  `toggl-time-tracker.spec.ts`. Playwright projects `phone` (iPhone 14),
  `android` (Pixel 7, nightly only) and `desktop`.
- No screenshot comparison anywhere in `tests/e2e`.
- Vercel puts every push to `main` live as soon as it builds. `e2e.yml` runs
  beside it and blocks nothing.
- Crash log `public.error_reports` (via `src/shared/errorReportService.ts`):
  **0 Time Log reports in the last 30 days**. There were 26 reports, all from
  other pages. So the reopen bug does not crash. It shows something wrong.
- A service worker (`public/sw.js`) keeps the Time Log page for offline opens,
  and the sync hook listens for `visibilitychange`, `pageshow` and `focus`
  (`src/timetrack/hooks/useTimetrackSync.ts:2451`, `:2605`). Both are suspects
  for the reopen bug.
- Known open bugs (from the 2026-11-14 phone plan): Back from "Stop at…" leaves
  the tracker; Pomodoro has no Stop; a past entry that overlaps the running
  timer is not marked and counts twice; installed mode was never tested.

## Blockers (each attempted once)

| ID | What | Attempted, and result | Blocks | Recommendation |
|---|---|---|---|---|
| B1 | What exactly goes wrong on reopen is unknown | Read the live crash log read-only: no Time Log rows in 30 days | Phase 1 diagnosis (the test matrix can start without it) | Ask him first, in one message: what he sees, about how often, phone browser or home-screen app, and a screenshot next time |
| B2 | Installed (home-screen) mode cannot be tested here | 2026-11-14: the emulator cannot install the app (no Google account) | Only the installed variant of Phase 1 | Goes on his own phone checklist in the final report |
| B3 | Deploy gate needs a Vercel project setting | CLI is signed in as `jonas879-8953` and sees project `daygame-coach` (Hobby plan). The CLI has no command for Deployment Checks. The docs name no plan limit, so Hobby support is unconfirmed | Phase 6 | Try the REST API with the CLI's login. If that fails, put the clicks on his page (about 4) |
| B4 | A hook might not stop Edit/Write | Scratch repo with a `PreToolUse` hook on `Edit\|Write\|MultiEdit\|NotebookEdit\|Bash`: the call was refused and a Haiku agent stopped instead of routing around. That guard also blocked `ls`. A public bug report says exit 2 failed to stop Edit/Write on some versions | Phase 5 | Let reads through, block only writes, and test the Edit path itself before relying on it |
| B5 | Screenshots need one fixed machine | Docker 29.1.3 present, `@playwright/test` 1.58.1; image not pulled yet | Phase 3 | Pin `mcr.microsoft.com/playwright:v1.58.1-noble` for local and CI runs |
| B6 | The full browser suite is often red or queued (peer messages 2026-11-18/19) | Seen in `gh run list` | Phases 3, 6 | Give the Time Log checks their own job, so other red tests neither block nor hide them |

## Open questions (his to answer)

| # | Question | Recommendation | Alternative | Cost if wrong |
|---|---|---|---|---|
| Q1 | Are these the right 10 everyday tasks? (Phase 0 page) | Approve them, and add any task he does daily that is missing | Fewer stories | A daily task with no test can break silently |
| Q2 | Lock the Time Log tests and photos: a hook refuses edits, and CI fails when they change without an `Owner-approved:` line quoting him | Yes | No lock: the final report only lists every test change | Without the lock, a session can weaken a test again (it happened in Nov) |
| Q3 | Should a red Time Log check hold the live site back (Vercel Deployment Checks)? | Yes, on the Time Log check only, and only after it passed 20 runs in a row | No gate: a red check is fixed after the fact, and he may see the break for about an hour | With the gate, every push waits about 10 minutes, and a flaky test could hold back all sessions. "Force Promote" is the escape |

## Phases

Each phase names its model. The lead session runs on Opus (the session model)
and hands build work to Sonnet subagents with exact specs. It reviews their
work itself.

### Phase 0: symptom and stories (Opus)
- Ask him B1, the symptom, in one message. Do not wait for the answer before
  starting Phase 1's matrix.
- Write the 10 stories, each with steps and an expected result, and say which
  of them are phone-only or PC-only. Proposed:
  1. Start a timer, give it a description and project, stop it: the entry shows the right length.
  2. Switch tasks while one runs: the first stops at the switch moment and the second starts.
  3. Change the start and the end of a finished entry: both change the same easy way (wheel on the phone, typing on the PC), and the length updates.
  4. Type a length as hours and minutes (`1:30` = 1 h 30 min): it saves as typed.
  5. Start on the phone and stop on the PC, and the reverse: both show one entry, with no ghost timer.
  6. Leave with a timer running and come back hours later (phone: background or a new tab; PC: a new tab): the timer still runs from the right start, and nothing is doubled. **This is his bug.**
  7. Delete an entry, then undo: it comes back exactly as it was.
  8. Continue a past entry: a new entry with the same description and project.
  9. Offline on the phone: start and stop, go online, and it reaches the PC with nothing lost.
  10. A timer across midnight: both days and the totals are right.
- Write a list of the intended phone/PC differences. Take it from the
  2026-11-14 decisions: the phone hides Week view, the money/team reports,
  Billable, the empty bell, the row ⋮, Team and the footer.
- Publish one short artifact page: the stories plus the differences list, with
  a 👍 and auto-saving notes on every item (memory `review-boards-note-log`).
  Phases 2–4 use his answers once he gives them, and use the proposed list
  until then.
- Done when: the page is live and its link is in chat.

### Phase 1: the reopen bug (Opus; Sonnet subagent builds the rig)
- Rig: `tests/e2e/timelog-guard/reopen.spec.ts`. One test account, two
  browser contexts (phone = `iPhone 14` and `Pixel 7`; PC = `Desktop Chrome`),
  against the local test stack (memory `worktree-e2e-servers`).
- Matrix. Where the timer last ran: phone or PC. What the other device did
  meanwhile: nothing, stop, switch, or edit the start. How the phone comes back:
  - (a) closed, then opened in a new page;
  - (b) back/forward cache (`pageshow` with `persisted`);
  - (c) frozen and unfrozen through CDP `Page.setWebLifecycleState` (Pixel 7 only), with the clock moved forward hours;
  - (d) opened offline from the service worker, then back online.
- Expected within 5 s: the running bar equals the server's running timer, the
  list equals the server's rows, no row is doubled, and the badge says Saved.
- Run with `--repeat-each=30`, because the bug only happens sometimes. If the
  local runs stay green, repeat the failing variant, or all of them, in real
  Chrome on the emulator (memory `android-emulator-rig`). Stop the emulator
  afterwards.
- When the bug is found: commit the failing test first, then the fix. Every
  phone change in a shared file stays behind `isMobile`/`sm:`, with PC
  screenshots before and after (his Time Log rule).
- If there is still no repro after the matrix and the emulator: add a small
  local event log on each device (opens, what local storage held, what the
  server answered, the merge result, the build id; no typed text). Add a
  "Something looks wrong" button in Time Log settings that sends the last 200
  events with the existing error report. Tell him to tap it when it happens.
- Done when: either the bug's test is red before the fix and green after it
  across 30 repeats, or the recorder is live and he has been told how to use it.

### Phase 2: the 10 stories as robot tests (Sonnet)
- `tests/e2e/timelog-guard/stories.spec.ts`: one test per story, each run in
  a phone project and a PC project. Check how easy each task is, not only the
  result (story 3: both ends use the same control; story 4: the box accepts
  `h:mm`).
- Reuse `tests/e2e/helpers/timetrack.ts`. Add a new test where a story is
  missing. Never change an existing test to fit new code: if an old test looks
  wrong, list it for him instead.
- A test for each intended difference: what the phone hides stays hidden, and
  the PC still shows it.
- Fixed clock with `page.clock`, fixed seed data.
- New Playwright project `timelog-guard` (phone + PC) and its own CI job,
  `timelog-guard`, in `e2e.yml`, running on every push.
- Done when: 20 runs in a row are green locally (`--repeat-each=20`), and CI
  is green.

### Phase 3: screen photos (Sonnet)
- `toHaveScreenshot` for about 6 screens × phone and PC: list with entries,
  running timer, entry sheet (phone) or edit box (PC), calendar, reports,
  settings. Use a fixed clock and seed, `animations: 'disabled'`, mask the
  ticking timer digits, and `maxDiffPixelRatio` 0.01.
- Make and compare the photos only inside the pinned Docker image (B5), in CI
  and locally.
- When a photo has to change on purpose: show him before and after on an
  artifact page, and update the photo only after his yes.
- Done when: 20 runs in a row are green and the photos are committed.

### Phase 4: clock traps (Sonnet)
- First list which of these the existing unit tests already cover, and fill
  only the gaps: a timer across midnight, the summer/winter time switch in
  Europe/Copenhagen (2027-03-28 and 2027-10-31, plus the past 2026-10-25), a
  timer running more than 24 h, and the phone changing time zone.
- Done when: every gap has a test with a fixed clock that runs in CI.

### Phase 5: lock (Sonnet; only after his yes to Q2)
- A `PreToolUse` hook in the project `.claude/settings.json`. It refuses
  Edit/Write/MultiEdit/NotebookEdit, and Bash writes, on
  `tests/e2e/timelog-guard/**` (photos included). It lets reads through. Prove
  it on a scratch copy with the Edit path (B4).
- The CI job `timelog-guard` fails when those files change in a push without a
  commit line `Owner-approved: "<his words>"`.
- Done when: a test edit is refused locally, and a test change pushed without
  the line turns CI red (tried on a branch, not `main`).

### Phase 6: gate (Sonnet; only after his yes to Q3 and 20 green runs)
- Vercel Deployment Checks requires the GitHub check `timelog-guard` for
  production (B3). Then check that a red run keeps the old build live and a
  green run puts the new one live, by comparing the `buildId` of
  `/api/healthz` against `git rev-parse main`.
- Done when: both cases are seen on the real site.

### Phase 7: attack, review, report (Sonnet auditors, Opus review and report)
- Three Sonnet auditors, each in its own worktree with its own port, try to
  break the stories: two devices, reopen and background, offline. Each finding
  is reproduced twice and comes with a test.
- An Opus code review and a security review of every change.
- The report, on an artifact page (👍 + auto-saving notes) and in chat:
  - **Should not break silently any more:** each story, which checks guard
    it, and whether a break is blocked (gate on) or only flagged (gate off).
    "Never" means "a check turns red before it reaches you"; no test makes code
    perfect.
  - **Still on you:** his answers to Q2/Q3 if still open; installed mode on his
    own phone; a by-hand checklist of the 10 stories on his phone before he
    calls the Time Log done; the known open bugs; and the fact that a
    determined session can still get around a hook, which only the CI line and
    his reading catch.
- Done when: the page is live, findings are fixed or listed, and the
  PushNotification is sent.

## Part 2: ground rules for the session that runs this

- Shared tree: build in a worktree, ship by fast-forward to `main`, commit
  with `git commit --only <paths>`, never `git add -A` or `git stash`. Push
  your own work. Check for in-flight CI before pushing, and batch commits
  (deploy rate limit).
- His data: tests use the local test stack and per-test accounts. Browser
  looks use `/test/toggl` signed out. The live database is read-only (memory
  `live-db-backup-method`).
- Before pushing: `node scripts/typecheck-ratchet.mjs` and
  `npm run lint:ratchet`.
- Check load before heavy runs (`~/.cache/daygame-research/tools/load.sh`),
  because he plays games while you work. Stop the emulator when done.
- No new rules beyond what he says yes to. Your picks are "proposed".
- Anything he should look at goes on an artifact page with 👍 + auto-saving
  notes, never a file path. Keep pages short.
- The repo is public: describe his symptom in neutral words, and put no
  personal data in commits.

## Execution prompt

> Read `Plans/time-log-safety-nets.md` and run it from Phase 0 to Phase 7.
> You are the lead on Opus; give Phases 2–6 to Sonnet subagents
> (`model: "sonnet"`) with exact specs and review their work yourself. Ask me
> only B1, Q1, Q2 and Q3, all in one message at the start, and keep working
> while you wait. Skip Phases 5 and 6 unless I said yes. When everything is
> done, tell me in plain words (1) which Time Log tasks should now never break
> without a check turning red, and how each is guarded, and (2) what I still
> have to change or do myself so mistakes stop getting through.
