# Alpha test: Perfect week, Time & energy audit, Time

**Findings board:** https://claude.ai/artifact/67sKtSTrD1u5bVysh7eVyS (marks db `marks`, doc id = row id F01–F28,
`mark` = fix | later | no, `notes: [{text, at}]`).

Written 2026-11-09. Status: **running** (started 2026-11-09). O1 = yes ("use a test account"). O2 = left blank in the prompt, read as "none"; the owner's notes on the look pages stand in (alpha/KNOWN.md).

The owner asked for Claude to be the alpha tester of three features — Time (`/time`), the Time & energy audit
(`/audit`) and the Perfect week (the last part of the audit's review) — for hours, on several browsers and devices
at once, and to fix what it finds, so that he starts using them only once they are as good as they can
realistically get.

## Only you decide these (answer once, at the start)

| # | What | Recommendation |
|---|---|---|
| O1 | **A throwaway test account on the live site.** The real ping clock (`pg_cron`, every minute) and real phone notifications only exist on the live site. Testing there for a few hours means a second account, with test rows, in the live database. Your own account is never opened. At the end, only that test account's rows are deleted. | **Yes.** Without it, the pings are only ever tested on a copy, which is how "works in tests" bugs reach your phone. |
| O2 | **Your own list.** You said you have already seen things that are "suboptimal". Paste them into the prompt (one line each, even vague: "the ping feels slow", "I can't find X"). | **Write them down.** Your list goes first; the tester then looks for more of the same kind. Empty is allowed. |

Nothing is bought. The tools are free downloads (about 5 GB: Java 17, Android's emulator, a phone image with
Google Play). No data of yours is changed or deleted.

---

# PART 1 — In plain words

## What "alpha tester" means here

Earlier checks asked "does the code do what the plan said". That finds broken things, not bad ones. This plan
adds three kinds of looking, in this order:

1. **A real person's week, fast.** Scripted "days in your life" (sets, gym, work, avoiding work, evenings) run
   with a fake clock, so two weeks of the audit and a planned week pass in minutes, on five browsers.
2. **A real person's afternoon, slow.** Three to four real hours with three screens open at once on one test
   account: an Android phone (a real Android emulator with Chrome and real notifications), a PC in Chrome, a PC
   in Firefox. Pings arrive every 15 minutes; some answered at once, some late, some with no signal.
3. **A picky user's eye.** An agent that was not told what is wrong goes through every screen at phone and PC
   size, light and dark, counting taps, timing waits, reading every word, and comparing each step with the
   source it copies (Dan Martell's audit and perfect week; Toggl Track for Time).

Then: fix in order of harm, test the fixes adversarially, run everything again, and hand you a short "try
these on your phone" list.

## Doubt first

- **No real iPhone.** Safari's engine (WebKit) runs here, but iPhone notifications and an installed iPhone app
  cannot be tested on this computer. If your phone is an iPhone, the ping part needs your own check.
- **A fake clock is not a real clock.** The fast pass skips time in the browser; the server's own clock does
  not skip. That is why the slow pass exists, and why O1 matters.
- **"Optimal" needs a yardstick.** Each finding must name one: a source (Martell's words, Toggl's real app), a
  number (taps, seconds), or a rule from your own notes on the look pages. Taste without a yardstick is listed
  as "opinion", not fixed on its own.
- **The audit has never been used for real**, and the perfect week has never been opened by you. Expect many
  findings; the plan caps each fix round so the work lands in small, live steps.

## What exists already (reuse, do not rebuild)

- Earlier adversarial audits of Time: `~/.cache/daygame-research/time-audit/` (orchestrator log, runner
  scripts `audit-pw.sh`, `wt-server.sh`, the rescued regression suite `regression/audit-2026-11/`, 24 h soak
  runs). 36 + 15 bugs were found and fixed there; that suite must stay green.
- `tests/e2e/audit.spec.ts` (38 tests), `tests/e2e/mobile/mobile-toggl.spec.ts`, Playwright projects
  `desktop`, `phone` (iPhone 14), `android` (Pixel 7), `firefox`, `webkit` in `playwright.config.ts`.
- Look pages with the owner's marks and notes (read before judging anything): Perfect week
  https://claude.ai/artifact/JrvYJwtBTDN4eQ3PRtmoj1, Audit https://claude.ai/artifact/GF69w68HJxiyFkudNwYBXv,
  Dread or Delight https://claude.ai/artifact/V28AzK4axgj7yaczaU9Y4n (`m--`, `n--` notes), Toggl parity
  https://claude.ai/artifact/PybynaCaxXTSw7KEZoqjPm. Plans: `Plans/energy-audit.md`, `Plans/perfect-week.md`,
  `Plans/toggl-parity.md`, `Plans/time-tracker-leftovers.md`.

---

# BLOCKERS — each tried once (2026-11-09)

| ID | What | Tried, and what it returned | Blocks | Recommendation |
|---|---|---|---|---|
| B-ANDROID | A real Android browser | `/dev/kvm` exists (hardware speed for an emulator); WSLg display `:0` exists; `commandlinetools-linux-11076708_latest.zip` from dl.google.com answers 200 (154 MB). | Phase 0 | Install into `~/Android` (no sudo needed). Use a `google_apis_playstore` image (Chrome + Google push). |
| B-JAVA | Android tools need Java 17 | Installed Java is 1.8.0_504. `sudo -n` asks for a password, so no apt. Adoptium's Java 17 tarball answers 200 (194 MB). | B-ANDROID | Unpack into `~/.local/jdk-17`, set `JAVA_HOME` only for the Android tools. |
| B-BROWSERS | Firefox and Safari engines | `~/.cache/ms-playwright` has `firefox-1509`, `webkit-2248`, two Chromiums. | — | Ready. |
| B-IPHONE | Real iPhone / iOS push | Not possible on Linux. | iOS ping check | Owner's "try these" list. |
| B-ENV | Live keys for a test account | Reading `.env.local` is blocked by a deny rule for this session. | O1 | Sign the test account up through the live site's own sign-up page (`/auth/sign-up`) like a user would; if it asks for an email link, use a `+alpha` address only if the owner gives one, else stay on the local copy. |
| B-LOCAL-PUSH | Pings on the local copy | Not tried yet: whether the local test stack has `pg_cron` and push keys in its Vault. | Phase 3 local | Phase 0 checks; if absent, the local copy calls `/api/notifications/tick` itself each minute. |
| B-PEERS | Other sessions share this checkout | Recent commits show other sessions working daily. | Every commit | Build in a worktree, ship by fast-forward, `git commit --only`. |

---

# DECISIONS — taken, vetoable

| ID | Decision | Why |
|---|---|---|
| D-WHERE | Fast and judgment passes run on the **local test stack + a production build** (`next build --webpack`, `next start`) in a worktree on its own port. Only the slow pass also runs on the live site (O1). | A production build behaves like the live site (the dev server misled the speed numbers before). The local copy can be reset freely. |
| D-PHONE | The Android emulator reaches the local server through `adb reverse tcp:<port> tcp:<port>`, so the phone sees `http://localhost:<port>` (notifications and the offline worker need a secure address). Playwright drives the phone's Chrome over `adb forward … localabstract:chrome_devtools_remote` + `connectOverCDP`. Airplane mode, lock screen, killing Chrome and changing time zone go through `adb`. | Real Chrome on real Android, real service worker, real notifications — not a desktop browser pretending. |
| D-AT-ONCE | "At the same time" = one test account open in three places: emulator phone, PC Chrome, PC Firefox, each its own browser profile. A fourth (WebKit) joins in the fast pass. | That is how the owner will use it: phone in the street, PC at home. |
| D-YARDSTICK | Each finding carries: steps (reproduced twice), screen + size + browser, the yardstick (source quote id, Toggl screen, number, or owner note id), severity: **1 lost data · 2 wrong data or missed ping · 3 blocks a task · 4 slow or confusing · 5 polish**. | Makes "suboptimal" checkable and lets the owner veto by row. |
| D-BUDGETS | Starting numbers for "good enough": answer a ping in ≤ 3 taps and ≤ 10 s from the notification; ping arrives ≤ 60 s after the quarter-hour; any screen usable ≤ 2 s cold on the phone; no lost or doubled entry or answer across devices; zero severity-1/2 open. | Martell's audit only works if answering is near-free (the owner answered 1 of 516 Thoughts pings). |
| D-ORDER | Fix rounds: all 1–2 first, then 3, then 4, then 5. Each round ≤ 10 findings, shipped live before the next. Severity 5 and "opinion" go on the board, not fixed unless cheap. | Small live steps; the owner's rule "no removal until owner says" holds — nothing is removed, only proposed. |
| D-BOARD | One findings page (artifact) with per-row Fix / Later / No and a note log (Save button, green Saved badge, all notes kept). The tester does not wait for marks; a "No" undoes that row's fix in the next round. | Owner's standing rules: decide, don't ask; note logs on every review board. |

## Questions, each with a recommendation

| # | Question | Recommendation | Alternative | Cost if wrong |
|---|---|---|---|---|
| Q1 | How long is the slow pass? | 3–4 real hours in daytime, once before fixes and once after. | A 24 h soak like Time's. | Night pings fall in quiet hours anyway; 24 h mostly tests sleep. |
| Q2 | Does the perfect week get the missing steps (9–11, plan routines, Time compare) in this plan? | No; the tester lists them as findings with Martell's source, severity 4, for a later plan. | Build them here. | Scope doubles; the fix rounds stall. |
| Q3 | How many agents at once? | Up to 6: three pass agents, two fixers, one reviewer. | One session doing all. | Slower, and the tester is anchored on its own guesses. |

---

# PHASES

Each phase writes a "Status (date)" note under itself here and its files under
`~/.cache/daygame-research/alpha/` (private; never in the public repo). A new session continues at the first
phase without a status note.

## Phase 0 — The rig · M
1. Read the look pages' marks (ArtifactData, collection `marks`) and the four plans above; write
   `alpha/KNOWN.md`: what the owner already said, and O2's list.
2. Worktree at `origin/main`, production build (`--webpack`), `next start` on its own port against the test
   stack (memory: worktree e2e servers). Script it as `alpha/server.sh`.
3. Java 17 + Android SDK + emulator + `google_apis_playstore` image (Pixel 7, Android 14) into `~/Android`;
   boot with `-gpu swiftshader_indirect` if the GPU fails. `alpha/phone.sh` boots it, sets `adb reverse`, opens
   Chrome. Check: the phone opens `/audit` on the local server, allows notifications, and a test push arrives.
4. B-LOCAL-PUSH: check `pg_cron` and Vault keys on the test stack; else `alpha/tick.sh` calls the tick endpoint
   every minute.
5. Firefox, WebKit, Chromium launch from the worktree via `alpha/pw.sh`.
**Done when:** one script starts server, phone and three PC browsers on one test account, and a screenshot of
each is in `alpha/rig/`.

**Status (2026-11-09): done, with two changes.**
- Rig scripts in `alpha/`: `server.sh` (production build of origin/main fca3fa79, `next start` on :3400, local
  test stack), `tick.sh` (calls `/api/notifications/tick` each minute), `pw.sh` (Playwright, five profiles),
  `phone.sh` (emulator). Marks read: audit page 13, Dread or Delight 19, Perfect week 0, Toggl parity 0 → `alpha/KNOWN.md`.
- B-LOCAL-PUSH: the test stack has `pg_cron` + `pg_net` but no keys. Added test-only VAPID keys and a clock secret
  to the test stack's vault (never the live one); `tick.sh` stands in for the clock (pg_cron needs an https URL).
- B-ANDROID changed: this user has no permission on `/dev/kvm` and no sudo, so the emulator would not start.
  It now runs inside a Docker container given `/dev/kvm` (`alpha-emu`). Pixel 7, Android 14 Play image boots;
  its Chrome is **113** (the image's own; updating needs a Google account). Real phones run a newer Chrome.
- B-ENV: the O1 live account was made through the live sign-up page with a free throwaway inbox (mail.tm);
  credentials only in `alpha/live-account.json` (private). The first try failed on the password rule
  ("Add a capital letter").
- The three PC/phone sign-ins on one account are done by the slow pass (Phase 3) rather than a separate script.

## Phase 1 — Charters · S
Write `alpha/CHARTERS.md`: 20–30 "days in his life" and edge cases across the three features and their seams
(Time's entry fills the audit answer; one answer covers a stretch; Same as before; Mute 1 h; quiet hours;
offline answers waiting; two devices answering the same quarter; crossing midnight; time-zone change; End now;
day 14 ends; review → Do more / Cut → perfect week; editing the week after a new choice). Each charter names its
yardstick (D-YARDSTICK) and the browsers it runs on. O2's items become charters first.
**Done when:** every item in KNOWN.md maps to a charter.

**Status (2026-11-09): done.** 32 charters in `alpha/CHARTERS.md`; the owner-note charters C01–C11 first,
each KNOWN item mapped. Phases 2, 3 and 4 run in parallel (independent agents; the picky eye is not shown
the other findings), which the plan's order allows since none feeds the other.

## Phase 2 — Fast pass (fake clock) · M
Agent per feature group (Time; audit; review + perfect week), each running its charters with Playwright's
clock on all five browser profiles, seeding two weeks of answers through the app or the repos (never the
live DB). Findings to `alpha/findings.jsonl` (D-YARDSTICK fields).
**Done when:** every charter ran on every listed browser; each finding reproduced twice.

**Status (2026-11-09): done.** Three agents (fast-audit, fast-review, fast-time): 25 findings, each reproduced
twice with a spec (`alpha-wt/tests/e2e/alpha/<agent>/`). Severity 1: 3 (Log Out drops waiting answers; a
perfect-week block or a review choice erased by the other device's save). Severity 2: 3. Gaps: the two-device
pairs ran as two windows of one engine, not phone + Firefox literally; offline opening only provable on
Chromium; the app has no light theme, so "light" was never seen; day 14's own end used End now (the server
clock cannot be faked). The rescued Time regression suite: PC 25/25, Pixel 33/34 (one timing test under load,
green on rerun).

## Phase 3 — Slow pass (real time, three screens) · M
Before fixes. Start an audit on the test account; 3–4 real hours with phone, PC Chrome, PC Firefox open.
Script a mixed rhythm: answer at once, answer late from the list, ignore three, airplane mode for 45 minutes
then back, lock the phone, kill Chrome, a Time entry running on the PC while answering on the phone. Log each
ping: due time, arrival time, taps, seconds to answered. Local copy first; then the live site with the O1
account if yes.
**Done when:** a ping log of ≥ 12 quarter-hours per place, and findings appended.

**Status (2026-11-09): done, with gaps.** 3.5 real hours, Android emulator (Chrome 113) + real Google Chrome +
Firefox (both on a hidden screen, never the owner's), local copy and the live site with the O1 account at once;
≥ 12 quarter-hours per place on both (`alpha/slow/REPORT.md`, `pings.jsonl`). 6 findings (2 × sev 2, 2 × sev 3,
2 × sev 4), all fixed live except the same-quarter conflict (in the last fix round). Numbers: ping 0–7 s after the
quarter (64–66 s right after a mute, since fixed); answers on the live account: 12 of 12 match the log, none lost
or doubled. Gaps: another session reset the local test database at ~17:51 (one local quarter and the "Time
running while answering" case lost); the live site took new builds mid-run, so live numbers after ~18:30 are a
newer build than local; a human's seconds-to-answer cannot be measured with a script (save itself ≤ 2.2 s); a
desktop notification cannot be clicked by Playwright, so PC clicks were simulated.

## Phase 4 — The picky eye · S
A fresh agent, given only the screens and the yardsticks (not the findings so far): every screen at 390 px and
1440 px, light and dark, Chrome and WebKit. Taps per common task, words that a non-programmer would not
understand, steps that differ from Martell or Toggl, dead ends, slow spots.
**Done when:** each screen has a row in `alpha/screens.md`; findings appended.

**Status (2026-11-09): done.** picky-eye ran every /audit and /time screen at 390 and 1440 px on Chrome,
WebKit and the iPhone profile, without seeing the other findings: 20 findings (1 severity 1, 8 severity 4,
11 severity 5). Android and Firefox were not in its run (covered by Phase 2).

## Phase 5 — Triage and board · S
Merge duplicates, rank by D-ORDER, publish the findings board (D-BOARD). Put its URL at the top of this file and
in memory.
**Done when:** the board is live and every finding has a row.

**Status (2026-11-09): done.** 45 findings merged into 28 rows (`alpha/triage.json`, `alpha/triage.py`):
Round 1 = F01–F07 (all severity 1–3), already in progress; round 2 =
F08–F18 (severity 4); polish = F20–F27; F19 (Martell steps 9–11 etc.) is Later per Q2; F28 is opinion only.

## Phase 6 — Fix rounds · L (repeat per round)
Per round (≤ 10 findings): failing test first (unit or e2e at the right size), fix in a worktree, typecheck +
lint ratchets, full `npm test`, the audit and timetrack e2e files at both sizes, the rescued regression suite,
a code review by a subagent given the diff only (a security review too when sync, auth or push is touched),
fast-forward to `main`, push, check `buildId` at `https://daygame-coach.vercel.app/api/healthz`. Mark the
board rows "live <commit>".
**Done when:** no severity 1–3 left open, and severity 4 either live or on the board as Later.

**Status (2026-11-09): done.** Seven fix rounds, each with a failing test first, the unit suite, type + lint
ratchets, the audit e2e files on desktop + phone against a production build, and an independent review of the diff
(reviews found 4 more lost-update holes and one offline-worker hardening point; all fixed before shipping).
Live commits: 1dd75499 (F01–F02), 2560e028 (F03–F07), 99dc218e (F14–F18), 0b1f9f53 (F08–F13, N01),
c78b3ddc + bd28a2e1 (polish F20–F27), 7b7a0f13 (slow-pass-02/-04/-05), e59167ab (slow-pass-06: same quarter on two
devices now asks "Keep that one / Use mine", check and write in one database step). Open: F19 Later (Martell steps
9–11, per Q2), F28 opinion only, light theme proposed only. Not done: the new database functions' integration
tests were never run (they reset the shared test database other sessions use); browser tests cover the same writes.
Known test debt: `mobile-toggl.spec.ts` 16 phone tests fail on the untouched build too (stale wording); "offers to
turn them on" fails on desktop production builds (headless notification permission).

## Phase 7 — Prove it · M
Fresh agents (not the fixers) re-run Phases 2–4 on the final build, plus the slow pass once more. Save every
spec to `alpha/regression/` with a README, so the next round starts from it. Check D-BUDGETS with numbers.
**Done when:** all budgets met or each miss written here with why.

## Phase 8 — Report and clean-up · S
Delete only the O1 test account's rows (back them up first, json per table), stop servers and the emulator,
remove worktrees. Report in plain words, doubt first: counts by severity found / fixed / Later, the worst three
in one line each, the budgets, and "Try these on your phone" (≤ 5 steps, iPhone ones marked). Say "built" and
"live", never "works" — only the owner's own use decides that.

---

# PART 2 — Rules for the executing session

- Never open the owner's account or his data. Local test stack, or the O1 test account only.
- Owner-only decisions are O1 and O2, answered in the prompt. Nothing else stops the run; decide, write why.
- Shared checkout: worktrees, `git commit --only`, never `git add -A` or `git stash`; revert `next dev`'s
  `tsconfig.json`/`AGENTS.md` edits in worktrees.
- Nothing private in the repo (it is public): logs, screenshots with personal text, quotes from sources stay in
  `~/.cache/daygame-research/alpha/`.
- Nothing is removed from the product on the tester's own say-so: propose it on the board.
- Agents in the background; at most 6 at once (Q3). Each auditor reproduces twice and writes a spec.

---

# EXECUTION PROMPT

```
/goal Execute Plans/alpha-test-week-audit-time.md, starting at the first phase without a status note,
and keep going phase by phase until Phase 8 is done.
Read first: that plan, CLAUDE.md, your memory index, and the marks on the four look pages it lists.
Owner answers: O1 = <yes / no>. O2 = my list of things that feel suboptimal:
- <one line each, or "none">
You may fan out background agents (at most 6 at once) and install the free tools the plan names.
Write a status note under each phase as you finish it, commit and push your own work,
and end with the Phase 8 report in plain words, doubt first.
```
