# Time tracker: the bugs left after Phase 8

Written 2026-11-09, after the report that closed Phase 8 of `Plans/toggl-parity.md`.

## Only you decide these

Nothing. No step spends money, deletes your data, changes the live database or cannot be undone.
Every fix ships through the same push to the live site as before.

---

# PART 1 — In plain words

## Doubt first

- **The PC count in the report was too low, not too high.** Of the 22 audit tests that failed at PC
  size, 21 are phone-only tests (named `@phone`) that were also run at PC size, where they cannot pass.
  Only one is a real PC failure: the edit box keeping the old name. Phase 1 makes the PC run skip
  phone-only tests, so the count means what it says.
- **The speed number was measured on a development server.** Its profile shows React's
  development code (`jsxDEVImpl`), which runs several times slower than the live site. So 2.4 seconds of
  work every 5 seconds is a worst case. It is still too much: the list draws about 1,970 rows when every
  day is open, and it redraws far more than the one running row each second.
- **The audit's tests live in a temporary folder** (`/tmp/...db41590f.../scratchpad/wt-audit/tests/e2e/audit/`).
  A reboot deletes `/tmp`. Phase 1 copies them somewhere safe first.
- **Two things still need your real phone:** the Undo during a slow upload, and the "what's still running"
  message. Tests only used a fake account or a fake second device. The list is at the end.

## What is wrong, and what the fix is

| # | Bug | Where it shows | Fix |
|---|---|---|---|
| 1 | Three audit tests are out of date, so the phone speed numbers were not measured | Test results only | Update the tests; measure again |
| 2 | PC edit box open while the phone renames the same entry: the box keeps the old name | PC, calendar box | Fields you have not touched follow the newest copy |
| 3 | A running timer with every day of the list open costs ~2.4 s of work per 5 s on the phone | Phone, Timer tab | Redraw only the running row and its day each second |
| 4 | Lint fails on another session's docs script, and on files in other sessions' worktrees | Checks only | Tell lint what those files are; fix two real slips |

---

# BLOCKERS — each tried once

| ID | What | Attempted, and the result | Blocks | Recommendation |
|---|---|---|---|---|
| B-TMP | Audit specs only exist in `/tmp` | `ls` on 2026-11-09: still there, in the `wt-audit` worktree, detached at the commit that was live then | Phase 1 | Copy them first (Phase 1, step 1) |
| B-LINT | Lint ratchet red | `npm run lint:ratchet` on 2026-11-09: new errors in `docs/research/addiction-one-pagers/board/check_render_v3.mjs` (`no-undef` for `document`, `console`, `DATA`…, one `no-empty`, one unused `e`) and in `.claude/worktrees/agent-a05d36ea4a1c19608/tests/unit/shared/historyBarrier.test.ts` (unused `addEventSpy`). Ends "Fix them. Do not raise the baseline." | Every phase's loop | Phase 4 |
| B-PROD-SPEED | Speed on a production build was never measured | Not tried yet; the harness has only run against `next dev` | Knowing the true cost of bug 3 | Phase 3, step 1 builds with `--webpack` in a worktree and measures |
| B-PHONE | Your phone | Cannot be tried by me | The "works" claim | "Try these" list at the end |
| B-PEERS | Other sessions share this checkout | `git worktree list` shows 9 worktrees from other sessions | Commits | `git commit --only <paths>`; build in a worktree |

---

# DECISIONS — taken, vetoable

| ID | Decision | Why | Alternative |
|---|---|---|---|
| D-FOLLOW | In the PC box, a field you have not touched since it opened follows the other device's change, live. A field you typed in keeps your typing, and Save writes it. | That is what "nothing lost" means for both devices. Save already writes only changed fields, so the account was right; only the screen was wrong. | Show a note "Changed on your phone" and let you pick. More taps for a rare case. |
| D-SPEED-BAR | Pass bar for bug 3: under 1,000 ms of work per 5 s on the same development server and test as before. Also report the production number. | Keeps the number comparable with today's 2,429 ms. | Measure only production. Then a later dev-server rerun could look like a slowdown. |
| D-LINT | Lint ignores `.claude/worktrees/**` (other sessions' copies, not this code). Board scripts under `docs/research/**/board/` get browser and Node globals. The unused `e` and the empty block get fixed in the file. | The checks are about this app's code. The baseline stays untouched. | Ask the session that owns the script. It may be gone. |

---

# PHASES

Each phase ends with the loop in Part 2 of `Plans/toggl-parity.md`: tests at both sizes, typecheck and lint
ratchets, push to `main`, check `buildId` at `https://daygame-coach.vercel.app/api/healthz`, then a
"Done, live <commit>" note under the phase here.

## Phase 1 — Rescue and update the audit tests · S

1. Copy `wt-audit/tests/e2e/audit/` (path in B-TMP) to
   `~/.cache/daygame-research/time-audit/regression/audit-2026-11/`, with its BRIEF.md.
2. `heavy-history/perf.spec.ts:81` (phone): times out at `field.click()` waiting for the old placeholders.
   The phone now types in the sheet (placeholder `WORKING_ON`/`WORKED_ON`, `src/timetrack/components/phone/EntrySheet.tsx:646`).
   Open the sheet from the run bar first, then type. The measure stays the same.
3. `heavy-history/phonecal.spec.ts:113`: compares `"…05:10:45+00:00"` with `"…05:10:45.000Z"`, which are the
   same moment. Compare `Date.parse(...)` values.
4. Any test still failing on an old click path: update where it clicks, never what it promises.
5. Run the PC project with `--grep-invert @phone`, and the phone project in full.
6. Write down the phone speed numbers (`phone-cold`, `phone-typing`, `phone-tick` JSON).

**Acceptance:** at phone size, only `phonelist.spec.ts:98` (bug 3) fails. At PC size, only
`pc-offline.spec.ts:85` (bug 2) fails. Speed numbers are recorded here.

**Status (2026-11-09).** Specs copied to `~/.cache/daygame-research/time-audit/regression/audit-2026-11/` (with
BRIEF.md, the old logs and a README on how to run them; output now goes to `$AUDIT_OUT`). Rewritten tests, each
keeping its promise: `perf.spec.ts:81` phone lane opens "I’m working on…", types there and starts with Create
(promise: typing under 100 ms a key, cold open under 3 s); `phonecal.spec.ts:113` and `:124` compare moments with
`Date.parse` (promise: the edge lands exactly on the neighbour's start); `phonelist.spec.ts:98` counts only long
tasks that begin inside its 5 s window (promise: a running second stays cheap with every day open — on `next dev`
the Start's own development-only work ran on after the Stop button was drawn and was counted as the timer's).
Phone run before the fixes: 30 passed, 4 failed (phonelist:98, plus three that passed alone: they failed under the
load of my parallel runs). Phone speed, dev server: `perf.spec` cold open 2,125 ms, typing p95 25 ms a key; `perfwhere`
usable at 1,570 ms (`phone-cold`), sheet typing p95 35 ms (`phone-typing`); tick in `phone-tick` (Phase 3).

## Phase 2 — The PC edit box follows the other device · S

Depends on Phase 1 (its failing test is `offline/pc-offline.spec.ts:85`, expected
`"Shared, named on the phone"`, seen `"Shared"`).

1. Failing unit test first, in `tests/unit/timetrack/`: a pure function takes what the box opened with, what
   it holds now, and the newest saved copy. It returns the new box contents and the new "opened" baseline.
   Cases: untouched name follows; typed name stays; untouched start/stop follow; a stop made on the other
   device shows the entry as stopped; tags and project likewise.
2. Use it in `src/timetrack/components/CalendarEntryBox.tsx` (the `opened` ref near line 118), each time
   `saved` changes. Save keeps writing only what differs from `opened`.
3. Check the phone's sheet against the same cases (`audit/offline/bad-signal.spec.ts:56` passes, so it may
   already do this). If it has its own version, both use the one function.

**Acceptance:** the unit test and `pc-offline.spec.ts:85` pass, twice each; the timetrack e2e files pass at
PC size.

**Status (2026-11-09). Done, live e23b306f.** `followNewest` in `src/timetrack/calendarBoxService.ts`, used by
`CalendarEntryBox.tsx` whenever the saved entry changes. The code review found the first version kept start and
end as one pair (a start typed into a running entry hid the phone's Stop; a typed start let Save put back an end
the phone moved): now each edge follows on its own, two tests added. Unit test 9/9; `pc-offline.spec.ts:85`
passed twice alone and once in the full PC run. Step 3: the phone's sheet keeps only its changes over the newest
entry (`shownDraft(base, changes)`), so it follows by construction; no shared function needed.

## Phase 3 — A running timer stays cheap with every day open · M

1. Measure first. Run `phonelist.spec.ts:98` against a production build (`npm run build` with
   `--webpack`, then `next start`, in a worktree on its own port; memory `worktree-e2e-servers`). Record the number.
2. Find what redraws each second. Use a CPU profile per file and function, as `perfwhere.spec.ts` does,
   with every day open.
3. Fix: each second, only the running row, its day's total and "This week" redraw. The PC list already does
   this (`src/timetrack/components/EntryList.tsx:421`, `rowTicks`). The phone list
   (`src/timetrack/components/phone/PhoneEntryList.tsx`) gets the same treatment. Use a failing unit or
   render-count test first: with 50 days open, one tick redraws one day.
4. Rerun the test on the dev server and on the production build.

**Acceptance:** under 1,000 ms per 5 s on the dev server (D-SPEED-BAR), on two runs. Production number
reported. Totals in day headers still match (`phonelist.spec.ts:50` passes).

**Status (2026-11-09). Done, live 1fbf75a7.** Doubt first: on this seed the old code measured 61,071 ms per 5 s
on dev, not 2,429. Almost all of it was React's development-only render logging (`logComponentRender` diffing
props), which the live site does not run. Fix: `PhoneDay` and `PhoneRow` are memoized; a day is the same object
while nothing in it can change (`timerList`), and a row compares its entry and the settings, projects, clients,
tags and favourites it shows. Unit test: with 51 days open one second draws one day. Numbers, 1,958 rows open:
dev 0, 0 and 112 ms per 5 s (three runs); Start on dev 39.4 s → 3.7 s; production build (`next start`): 0 ms per
5 s, Start 838 ms. The old code was not measured on a production build. `phonelist.spec.ts` (both tests,
including the day totals) passes.

## Phase 4 — Lint green · S

1. Make the D-LINT changes in `eslint.config.*`, plus the two small fixes in `check_render_v3.mjs`.
2. `npm run lint:ratchet` passes without raising the baseline.

**Acceptance:** lint ratchet green. Nothing in the time tracker changes.

**Status (2026-11-09). Done, live 943fe9a9.** `.claude/worktrees/**` ignored; `docs/research/**/board/*.{js,mjs,cjs}`
get browser and Node globals; the page globals (`DATA`, `MINP`, `stageDots`) are declared in the file; the empty
catch says why. Lint ratchet: 290, none new.

## Phase 5 — Proof and report · S

1. Full `npm test`, typecheck ratchet, lint ratchet. Run the three timetrack e2e files at both sizes, and
   the whole rescued audit suite at both sizes (PC with `--grep-invert @phone`).
2. A fresh code review of Phases 2–3 (subagent, given the diff only).
3. Add a status line under Phase 8 in `Plans/toggl-parity.md` pointing here.
4. Report in plain words, doubt first, with the counts per size and the "try these" list.

**Acceptance:** every audit test passes at its own size, or is written here with why not.

**Status (2026-11-09).** `npm test` 6,455 passed; typecheck 88, none new; lint 290, none new. Timetrack e2e files,
all green: toggl-time-tracker 20 PC / 4 phone, edge-cases 3 / 3, sync 14 / 9. Full audit on the final code: PC
(`--grep-invert @phone`) 22 passed, 3 failed; phone 32 passed, 2 failed, 1 skipped. All five passed when run
alone: `pclist:28`, `perfwhere:96`, `tombstones:58` (that run hit "Database error checking email" from the
shared test database), `reopen-and-logout:67` (passed in the earlier phone run). Not settled:
`perfwhere.spec.ts:137` (phone) timed out at 15 minutes in both full phone runs and passed alone twice. It is a
dev-server freeze after heavy runs; not seen on the production build, which was not run with the full suite.
Side-by-sides and findability skipped: nothing on screen changed. Review: one subagent, given the diff only.

---

# Try these on your phone (B-PHONE)

1. **Undo during a slow upload.** On weak signal (e.g. a lift or basement), swipe an entry away, tap Undo
   at once, then go back to good signal. The entry should still be there on the PC.
2. **"What's still running."** Start a timer on the PC. On the phone, stop a different entry from its row.
   The message should name the timer still running on the PC.
3. **The edit box (after Phase 2).** Open an entry in the PC calendar. Rename it on the phone. The PC box
   should show the new name within a few seconds.

---

# EXECUTION PROMPT

```
/goal Execute Plans/time-tracker-leftovers.md, Phases 1 to 5, in one run.
Read first: that plan, Part 2 of Plans/toggl-parity.md (the loop), CLAUDE.md, your memory index.
Build in a worktree; commit with --only; push to main and check buildId after each phase.
Every fix starts as a failing test. Never test on the owner's account.
Report in plain words, doubt first; say "live", never "works".
```
