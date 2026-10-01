# Cleanup, and the structure rules that stop it coming back — plan

**Status:** written 2026-10-01, not started. Supersedes nothing. Every number in
it was measured on `training-rebuild` at `4308cd5c` on 2026-10-01 and the command
that produced it is given, so you can re-run any of them.

---

# Part 1 — For you (plain language)

## What you asked, and the one place the premise was wrong

You asked for four things: rules that make me tidy up branches and worktrees when
a plan is done; the actual cleanup of unused variables, files, parameters and
folders; the stray files put into their slices; and the structure written down
once instead of in several places.

Three of those are right and the plan does them. **One premise is wrong, and it
changes the whole shape of the work**, so it goes first rather than buried:

> **There are almost no unused files in this repo. There are 355 unreachable
> ones.**

I resolved every `@/` and relative import across all 1,622 tracked code files and
walked the graph from the 155 live route entry points. Of the 629 files in
`src/`, `components/` and `lib/`:

| | files |
|---|---|
| reachable from a live route | 544 |
| reachable **only** from an `app/test/*` lab page | 77 |
| reachable only from the test suite | 6 |
| reached by nothing at all | **2** |

Two. `components/ui/GoalIcon.tsx` and `src/qa/providers/claude.ts`. A tool that
hunts unused files would report those two and tell you the repo is clean.

The weight is somewhere else: **`app/test/` is 276 files, and none of them is
reachable from the product.** 220 of those files — 95,643 lines — have not been
touched in six months or more. They pull 77 `src/` files into existence behind
them. That is the dead weight, and it is invisible to "find unused files" because
every one of those files *is* imported — by another dead file.

So this plan deletes by **reachability**, not by whether a symbol is referenced.

## The second thing that changes the shape: your first ask is budget-blocked

You asked me to improve `CLAUDE.md`. I cannot add a sentence to it without
removing one, and that is deliberate — you built the gate yourself.

`tests/unit/docs/instructionBudget.test.ts` caps the instruction files, and here
is where they stand today:

| file | words | budget | headroom |
|---|---|---|---|
| `CLAUDE.md` | 389 | 391 | **2** |
| `.claude/rules/` (all 8 files) | 2,710 | 2,710 | **0** |
| `docs/known-failures.md` | 948 | 950 | **2** |
| `MEMORY.md` | 416 | 430 | 14 |

Every one is at its ceiling. The test's own comment says it: *"To add a line, cut
one. That is not an obstacle to route around by raising the cap."*

There is also **no `AGENTS.md`** in this repo. You mentioned "agents.md /
claude.md" — `CLAUDE.md` is the only one, and I have not invented the other.

So the git-hygiene rule you asked for costs words you do not have, and deciding
how to pay is yours, not mine. It is open question 1, with my recommendation.

## The third thing: the structure rule exists and checks 44% of the code

You said the smells suggest the architecture is not written down well enough. It
is written down. The problem is sharper and worse than that.

`tests/unit/architecture.test.ts` has a `Slice Structure` block enforcing "each
slice has a `types.ts`", "each slice has a service file", and "type exports only
in `types.ts`". It applies them to a **hand-typed list of eight slices**:

```js
const slices = ['qa', 'inner-game', 'scenarios', 'tracking',
                'profile', 'settings', 'articles', 'programs']
```

`src/` has **eighteen** directories. The ten not on that list are `goals`
(198 files), `db` (47), `timetrack` (36), `vice` (31), `shared` (22), `health`,
`home`, `exercising`, `dashboard`, `api_ai`.

Extend the rule to every directory under `src/` and **138 type-export violations
appear immediately** — 77 in `goals`, 27 in `db`, 13 in `timetrack`, 12 in
`vice`. And `src/home` and `src/shared` have no `types.ts` at all.

The test already knows this can happen. Its own comment reads:

> *"`programs` was absent, and so the type rule never looked at the gym.
> `TrainingCardState`, `LiftProgress` and `PlateLoad` all lived in
> `programsService.ts` for months with nothing noticing."*

Somebody found this exact bug once, fixed it for one slice by typing `programs`
into the array, and left the mechanism — a hand-maintained list with nothing
checking it against the directory — fully intact. **That is why the biggest slice
in the repo has a 2,558-line `types.ts` and 232 exports nothing else names.** Not
a missing rule. A rule whose scope silently excludes the code that needed it.

So the single-source-of-truth work is not "write an architecture doc". It is:
**no rule in this repo may have a hand-maintained scope.** Every list of what a
rule covers is derived from the filesystem, or a test fails.

## The four rules this plan follows

These are what I am asking you to approve. Not the phase count, not the file
counts — those are outputs and they will move.

**Rule 1 — Unreachable is the unit of deletion, not unused.**
Code goes when no live route reaches it, not when no symbol references it.
*Cost if wrong:* I delete a lab you were still using. Mitigated by gating every
deletion on six months of staleness and tagging before each one, so recovery is
one `git checkout`. The risk is real but cheap; the alternative is keeping 95,643
lines forever because something might want them.

**Rule 2 — No rule may have a hand-maintained scope.**
Every rule derives what it covers from the filesystem, and a test fails when a
new slice or route appears outside it. `orientation.test.ts` already does this for
the product map; nothing does it for the architecture rules.
*Cost if wrong:* exactly what happened above — a rule that reads as universal,
covers less than half, and hides 138 violations for months. This is the most
expensive thing in the plan to get wrong, which is why it is Phase 1.

**Rule 3 — Instruction budget is paid, never raised.**
Words added to `CLAUDE.md` or `.claude/rules/` come out of the same files.
*Cost if wrong:* the 4,386-word state returns, and with it the failure that
caused the budget — an agent answering "this is a live, paid product taking real
Stripe subscriptions" about a product that has never had a customer.

**Rule 4 — One phase, one green tree, one commit.**
Each phase ends with `npm test`, `tsc`, the lint ratchet and a production build
all green, and is committed on its own with `git commit --only <paths>`.
*Cost if wrong:* `HEAD` that does not compile between two commits. Three other
sessions share this checkout and `.husky/pre-commit` tests the tree, so a broken
`HEAD` blocks all of them from committing. This has happened three times already.

## Every gate works. I ran all four.

This is the part that decides whether the plan is safe to execute, so I ran it
rather than assuming:

| gate | command | result |
|---|---|---|
| unit suite | `npm test` | **6,627 pass, 1 skipped, 384 files, 49.7s** |
| types | `npx tsc --noEmit` | **98 errors — exactly `tsc-baseline.json`** |
| lint | `npm run lint:ratchet` | **"Lint errors: 323, none new."** |
| production build | `NEXT_DIST_DIR=.next-verify BUILD_MEMORY_CAP=12G bash scripts/build.sh --webpack` | **✓ Compiled successfully in 42s** |
| e2e listing | `npx playwright test --list` | **1,196 tests in 84 files** |
| the app | `curl localhost:3000` | **200** |

Two of those deserve a note, because the received wisdom says otherwise.

**The build works.** `scripts/build.sh` puts a 12 GB cgroup ceiling on it and
`package.json` already passes `--webpack`, so the Turbopack memory runaway that
froze this machine three times in 2026-09 cannot recur. `next build` in Next 16
no longer accepts `--distDir` — it errors — but `next.config.mjs` already reads
`NEXT_DIST_DIR`, so a verification build can run beside your dev server without
fighting it for `.next`. **A 278-file import move is build-verifiable in about
three minutes.** That removes the single biggest risk in Phase 4.

**But a green build does not mean green types.** `next.config.mjs` sets
`typescript.ignoreBuildErrors: true`. The build proves the modules resolve; only
`tsc` proves the types. Both are needed and they are not substitutes.

## What you will see after each phase

Nothing in the product changes. Not one user-facing pixel, in any phase. That is
the point — this is a cleanup, and any phase that changes behaviour has a bug.

- **Phase 0** — `npm run smells` prints the five numbers in this plan. You can
  check any claim here yourself, and watch them fall.
- **Phase 1** — the structure rules cover all 18 slices instead of 8, and
  `CLAUDE.md` says what to do with a branch when a plan is done.
- **Phase 2** — 118 files gone, all provably referenced by nothing.
- **Phase 3** — the lab is 56 files instead of 276. ~131,000 lines gone. 131 of
  the 323 lint errors go with them, for free.
- **Phase 4** — one home for shared code instead of two. `@/components/...`
  becomes `@/src/shared/...` in 278 files.
- **Phase 5** — `src/goals` is six subslices instead of 198 flat files.
- **Phase 6** — `eslint-baseline.json` and `tsc-baseline.json` at or near zero.
- **Phase 7** — a test fails if any of it starts coming back.

## Blockers — the ones that are yours to answer

Four, numbered, one line each. Everything else in this plan I will do and report.

1. **Deleting 220 lab files / 95,643 lines (Phase 3).** Recoverable from git and
   from a tag I will push first, but it is the one irreversible-feeling step.
   *Recommendation: yes.* Gate it on six months of no commits, tag
   `lab-before-prune` first, and keep `app/test/archive/` — which you touched on
   2026-09-25 and which the architecture test already guards — untouched.
2. **`src/shared/iconRoles.ts`.** `.claude/hooks/never.py` asks first on this
   file by name, and both the `GoalIcon.tsx` deletion and the `components/` move
   touch it. *Recommendation: approve both.* `GoalIcon` is one of the two files
   in the repo that nothing imports, and the move only rewrites a path string.
3. **How to pay for the instruction words (Phase 1).** See open question 1.
   *Recommendation: cut, do not raise the cap.*
4. **Whether a production build is required before each phase merges.**
   It costs three minutes and it is the only check that catches a broken import
   path. *Recommendation: yes, required for Phases 2–5, which move files.*

I did not put `app/auth/` on this list: nothing in this plan touches it, so the
hook's fourth ask-first path never comes up.

## Open questions, each with my recommendation

**1. How do we pay for the git-hygiene words?**
`CLAUDE.md` has 2 words of headroom and `.claude/rules/` has none. Three options:
pay by cutting, raise a cap, or put the rule somewhere with no budget (a script
that prints it, or a hook).
*Recommendation: pay by cutting, and spend it in `.claude/rules/finished-work.md`
rather than `CLAUDE.md`.* That file already triggers on `docs/plans/**`, which is
exactly the moment a plan finishes and a branch wants deleting — so the words
arrive when they are relevant instead of in every session. Pay for them out of
`.claude/rules/product-map.md` (23 lines, and the three sentences it spends
explaining why the map exists are also the first paragraph of `docs/product/map.md`
itself, so one copy can go). Then spend **one** line of `CLAUDE.md`'s two words of
headroom plus a short cut, because a branch is cleaned up at the end of a turn
when no `docs/plans/` path may have been touched at all, and a path-triggered rule
will not have loaded. Exact diff in Phase 1.

**2. Does `app/test/` stay as a concept?**
`docs/product/map.md` calls it "the laboratory" deliberately, and it is where you
prototype. Pruning 220 stale files does not answer whether the next prototype
goes there.
*Recommendation: keep it, with a documented half-life.* A lab page with no commit
in six months is deleted, and a test lists the candidates rather than failing — a
test that fails on the calendar fails on a day you did nothing wrong. Keeping the
concept is right; it is how you work. What was missing is anything that ever
clears it out.

**3. `src/shared/components/` or `src/shared/ui/` — and are they one home or two?**
`src/shared/components/` already exists with 5 files, and they are not the same
kind of thing as the 18 in `components/ui/`. `ErrorBoundary`, `OfflineShell`,
`StaleWorkerCleanup` are app-shell plumbing mounted once; `button`, `input`,
`select` are primitives used 256 times.
*Recommendation: two homes.* `src/shared/ui/` for the primitives (the 18 shadcn
files plus `BottomSheet` and `stepper`), `src/shared/components/` for the shell
plumbing, and `src/shared/chrome/` for `AppHeader`, `MobileNav`, `MobileTabBar`,
`navTabs.ts`, `BackLink` — the navigation, which is neither. Collapsing all three
into one folder of 31 files recreates the flat-folder problem one level down.

**4. The 41 imports where `src/db` reaches up into feature slices.**
The rule is "slices depend on `db`". Measured, `db` imports from `programs` (24
statements), `tracking` (6), `health` (5), `goals` (3), `scenarios` (2), `vice`
(1) — mostly for types and a few services. The dependency runs both ways today.
*Recommendation: bless it for now, with a shrinking allowlist, and do not fix it
in this plan.* Most of those 41 are `import type` for a row shape, which is
harmless; untangling the rest means moving types between slices, which is Phase 5
work for `goals` and a separate plan for `programs`. Write it down as debt with a
number so it cannot grow — that is the honest move, and pretending a cleanup plan
can also invert the data layer is not.

**5. Generalise "one door between slices" to all slice pairs?**
The architecture test has `no new direct import from src/goals into src/programs`
with a shrinking allowlist, and `src/programs/forLifeMastery.ts` is the door.
Generalising it to every pair starts at **100 import statements across 23 edges**
(59 of them not involving `db`).
*Recommendation: not yet — adopt it per pair, highest first.* A rule that starts
at 100 needs an allowlist of 100, and a 100-entry allowlist is read by nobody.
The three pairs worth a door of their own, by weight: `db → programs` (24),
`programs → health` (8), `goals → programs` (8, already has one). Do those three
and the generalised rule starts at a number somebody will actually drive down.

**6. What happens to a plan file when its plan is done?**
There are 18 in `docs/plans/`, 17,026 lines. Some describe finished work; nothing
in the repo says which.
*Recommendation: a `**Status:**` line that a test requires, and nothing moves.*
Every plan already opens with one informally — this plan does. Make it required
and make the vocabulary fixed (`not started` / `in progress` / `done <date>` /
`superseded by <file>`). Do not archive or delete: you cite old plans for their
reasoning, `training-overhaul.md` is cited by `training-rebuild.md` for exactly
that, and the 482 docs deleted on 2026-09-09 are the standing argument against
tidying by deletion.

**7. Do the six `goals` subslices each get their own `types.ts`?**
Once Rule 2 lands, `goals` is governed, and the rule is "type exports only in
`types.ts`" — today that is one 2,558-line file for 198 files of code.
*Recommendation: yes, one `types.ts` per subslice, and change the rule to mean
"the nearest `types.ts` up the tree".* Splitting a 2,558-line type file six ways
and then banning the six pieces would be absurd, and a single shared type file is
how `goals` got 77 violations and 232 unreferenced exports in the first place.

## What I got wrong while writing this

Two things, both worth your knowing because one of them touched the repo.

**I deleted the `beta` branch.** I wanted to document that `git branch -d`
refuses an unmerged branch, so I ran it on `beta` expecting a refusal. It
deleted it. `git branch -d` checks whether the branch is merged into **its own
upstream**, not into `HEAD` — and `beta` was merged to `origin/beta`, so `-d`
was satisfied and said so in a warning while deleting. I restored it
immediately to `b9b808e5` with its upstream tracking; it is byte-identical to
`origin/beta` and nothing was lost.

That is a verified hazard rather than a theory, and it is the exact trap in the
rule you asked for: **"delete merged branches" plus `git branch -d` deletes
branches that are merged nowhere you care about.** Phase 1's rule uses
`git branch --merged main` as the test and never relies on `-d` to protect
anything.

**I tried `next build --distDir`,** which Next 16 rejects outright, and my
wrapper reported `exit: 0` because the real exit code was swallowed by a pipe
into `tail`. A pipeline's exit status is its last command's. Phase 0's script
sets `set -o pipefail` for this reason.

---

# Part 2 — Execution

Conventions for every phase below:

- **Gates** means all four, in order: `npm test`, `npx tsc --noEmit` (compare to
  `tsc-baseline.json`), `npm run lint:ratchet`, and
  `NEXT_DIST_DIR=.next-verify BUILD_MEMORY_CAP=12G bash scripts/build.sh --webpack`.
  Then `rm -rf .next-verify`.
- **Commit** means `git commit --only <paths> -m "..."` — never a bare
  `git commit`, never `git add -A`, never `git stash`. Three other sessions share
  this checkout; `.claude/hooks/never.py` refuses the sweeping forms, and the two
  existing stashes must not be popped or dropped.
- Before each commit, `git status --short` again, and after it, read what is left.
- Any phase that cannot be finished in one pass runs in a `git worktree`, because
  a half-renamed tree returns 500 on every route and blocks all three sessions.

## Phase 0 — Make the smells countable

Nothing is deleted. This phase builds the instrument, so every later phase has a
number that moves and this plan's claims stay checkable after the code changes.

**Deliverable:** `scripts/smells.mjs` plus `"smells": "node scripts/smells.mjs"`
in `package.json`. It prints, and takes `--json` for the tests:

1. **Reachability** — files in `src/`+`components/`+`lib/` split into
   live-reachable / lab-only / suite-only / unreachable. Walks the import graph
   from every non-`app/test` route file, resolving `@/` and relative specifiers.
   *Today: 544 / 77 / 6 / 2.*
2. **Lab staleness** — each `app/test/*` folder with its file count, line count
   and `git log -1 --format=%as` date. *Today: 220 files / 95,643 lines at ≥6
   months.*
3. **Scope gaps** — directories under `src/` that the architecture test's slice
   list omits. *Today: 10 of 18.*
4. **Cross-slice coupling** — the slice-to-slice import matrix, `db`/`shared`
   edges separated from feature edges. *Today: 23 feature edges, 100 statements,
   41 of them `db →` a slice.*
5. **Instruction budgets** — the four files against their caps. *Today:
   389/391, 2710/2710, 948/950, 416/430.*

Three details that matter, each from something that went wrong:

- `set -o pipefail` in anything that pipes, and the script exits non-zero on its
  own failure. A measurement that reports success when it did not run is worse
  than no measurement.
- It reports **"uncomputable"** as a third state, distinct from zero. A file it
  cannot parse is named, not skipped.
- It must not resolve `@/` by guessing. `tsconfig.json` maps `@/*` to `./*`; read
  it rather than hardcoding.

**Acceptance test:** `tests/unit/docs/smellsScript.test.ts` — runs
`node scripts/smells.mjs --json`, asserts the five sections are present and
numeric, and asserts the reachability count equals a hand-counted fixture of six
known files (one live, one lab-only, one suite-only, `components/ui/GoalIcon.tsx`
as unreachable, one `app/test` page, one `src/db` file). A scanner with no fixture
is a scanner that silently stops finding things.

**Gates**, then commit `scripts/smells.mjs`, `package.json`,
`tests/unit/docs/smellsScript.test.ts`.

## Phase 1 — The structure rules cover everything, and say what to do when a plan ends

This is the phase that makes the rest stick. It changes no product code.

### 1a. The slice list stops being hand-typed

In `tests/unit/architecture.test.ts`, the `Slice Structure` block's `slices`
array becomes a filesystem read:

```js
const slices = fs.readdirSync(path.join(projectRoot, 'src'), { withFileTypes: true })
  .filter((e) => e.isDirectory())
  .map((e) => e.name)
```

This surfaces **138 type-export violations and 2 missing `types.ts`**
(`src/home`, `src/shared`) at once, which is far too many to fix here. So:

- `ALLOWED_TYPE_EXPORTS` absorbs the 138 as a **shrinking allowlist**, written
  with a dated comment saying they were revealed by widening the scope and are
  not new debt. The existing `staleAllowances` check already makes it shrink-only
  and already catches an entry whose file is gone.
- `src/home/types.ts` and `src/shared/types.ts` are created, re-exporting what
  those slices already export as types. Two small files, not a refactor.
- A new test, **`the slice list is the directory listing`**, asserts the array
  the rules use equals `readdirSync('src')`. This is the actual fix: without it,
  the next slice is silently ungoverned exactly as `goals` has been.

Why a single allowlist entry per violation rather than per file: the test's own
header explains that counts hide churn — fix two and add two and a count is
unchanged. Follow the existing shape, do not invent a second one.

**Acceptance test:** plant `src/zzz_probe/index.ts` exporting a type, confirm the
new test fails naming `zzz_probe`, delete it. Prove by removal, in the worktree,
and say so first — a planted defect looks exactly like a broken refactor from
another session.

### 1b. `.claude/rules/finished-work.md` gains the cleanup rule

Paid for out of `.claude/rules/product-map.md`, whose first three sentences
restate the opening paragraph of `docs/product/map.md`. Net words: ≤ 0.

Added under a new heading, because it triggers on `docs/plans/**`:

> **When a plan is done.** Set its `**Status:**` line to `done <date>`. Then:
> `git branch --merged main` — delete every branch it lists except `main`, with
> `git branch -d <name>`, and push the deletion. `git worktree list` — for each
> worktree that is not this one, `git worktree remove <path>` if its branch is
> merged, and `git worktree prune`. Never `git branch -D`, and never touch a
> branch `--merged main` does not list: `-d` alone will delete a branch merged
> only to its own upstream, which is how `beta` was deleted on 2026-10-01.

### 1c. `CLAUDE.md` gains one line

`CLAUDE.md` is at 389/391. The line below is 19 words, so 17 words come out of
the `## Read before you act` section, whose sentence about the 482 deleted docs
can lose its second clause without losing its instruction.

Under `## Commands`, after the commit line:

> **A finished plan leaves no branches.** `git branch --merged main` and
> `git worktree list`, then `.claude/rules/finished-work.md`.

It goes in `CLAUDE.md` rather than only in the rules file because a branch is
deleted at the end of a turn, when no `docs/plans/` path may have been touched
and the path-triggered rule will not have loaded. The pointer is always in
context; the procedure is not.

**Acceptance test:** `npx vitest run tests/unit/docs/instructionBudget.test.ts` —
all four budgets still pass. If it fails, the cut was too small; cut more rather
than raising the cap.

### 1d. One structure document, and it is generated

The repo has no `docs/architecture.md`, and `CLAUDE.md` says to run the test
instead of memorising it. That is defensible for *rules* and useless for the one
question a newcomer actually has: **where do I put this file?** I tried to answer
"where does a new shared date helper go?" from the existing docs. `src/shared/`
holds `dateUtils.ts`, so the answer exists — and nothing states it.

**Deliverable:** `docs/architecture.md`, **generated** by
`scripts/smells.mjs --architecture`, containing only what is derived from the
filesystem and the tests: the slice list with file counts, which directories a
slice may contain, where shared code lives, the dependency direction, and one
line per architecture test naming what it enforces and where its allowlist is.

Generated, not written, for the reason this repo already knows: a hand-written
architecture doc is the 482 deleted docs waiting to happen. A generated one
cannot drift, because a test regenerates it and fails on a diff.

**Acceptance test:** `tests/unit/docs/architectureDocFresh.test.ts` regenerates
it in memory and asserts byte-equality with the file on disk. Same shape as
`orientation.test.ts`, which already keeps `docs/product/map.md` honest.

**Gates**, then commit as four separate commits — the test change, the rules
change, the `CLAUDE.md` change, the generated doc — so each is revertable alone.

## Phase 2 — Delete what is provably referenced by nothing

118 files. Every one has evidence, and no judgement call.

### 2a. `new_new_clean_attempt/` — 115 tracked files

The evidence, all four parts:

- `git log -- new_new_clean_attempt` → **one commit**, `80b9f571`, 2026-03-11,
  message `"ny ny"`. Never touched since.
- `grep -rl new_new_clean_attempt` across `*.ts,*.tsx,*.json,*.md,*.mjs`
  excluding itself → **nothing**. Not in `docs/`, `.claude/` or `CLAUDE.md`.
- Its folder names are `02.EXT.transcribe`, `06.LLM.video-type`, `06b.LLM.verify`,
  `06d.DET.sanitized`, `06e.LLM.quality-check`, `06f.DET.damage-map`,
  `06g.LLM.damage-adjudicator`, `06h.DET.confidence-propagation`,
  `07.LLM.content`, `07b.LLM.enrichment-verify` — **the exact stage names that
  now live in `scripts/training-data/`.** It is the prototype of the shipped
  pipeline, superseded by it.
- 16 of its files have emoji and escaped bytes in their names
  (`5 RAW Daygame Infields \360\237\232\250 [GOZo4Z0brDc]`), which is why
  `git ls-files` quotes them. Use `git rm -r -- new_new_clean_attempt`, not a
  shell glob, or those 16 are missed.

**Gated:** tag `git tag pre-cleanup-newnew && git push origin pre-cleanup-newnew`
first. Recoverable forever from one commit hash either way.

### 2b. The two unreachable files

- `src/qa/providers/claude.ts` (43 lines). **Check for a dynamic import before
  deleting:** `grep -rn "claude" src/qa/` and look for a provider registry that
  resolves by string. A static scan is blind to `import(\`./providers/${name}\`)`,
  and this file is named like a plugin. If it is dynamically loaded, it is not
  dead — leave it and say so.
- `components/ui/GoalIcon.tsx` (32 lines). **Blocker 2** — it is listed in
  `CUSTOM_ICON_COMPONENTS` in `src/shared/iconRoles.ts`, which `never.py` asks
  about by name. Removing the file means removing that entry, and the
  architecture test's `Custom icon components must only be used in allowed
  contexts` test reads it.

### 2c. Two empty directories, ten stale ignores, four stale excludes

- `src/vice/hooks/` and `src/vice/components/steps/` are empty. Git does not
  track directories, so these exist only in your working copy — `rmdir` them and
  note that they will not appear in the diff.
- `.gitignore` names ten paths that no longer exist: `whisper.cpp`,
  `LivePortrait`, `SadTalker`, `training-data`, `deprecated`, `coverage`, `out`,
  `build`, `dist`, `www.youtube.com_cookies.txt`. Keep `coverage`, `out`, `build`
  and `dist` — they are build outputs that will exist again. Delete the other six
  and the `!training-data/sources.txt` exception that depends on one of them.
- `tsconfig.json` excludes four paths that do not exist: `deprecated`,
  `scripts/training-data/old`, `scripts/deprecated`, `LivePortrait`. Delete all
  four. `.venv` stays; it exists.

**Do not touch:** `proxy.ts`. Next 16 renamed `middleware.ts` to `proxy.ts`, the
file documents this itself, and the build output confirms it with
`ƒ Proxy (Middleware)`. It must stay at the repository root. It is the most
plausible-looking wrong move in this whole plan.

**Also do not touch:** `data/woman-responses/prompts/`. Nine tracked files, read
at **request time** by `src/scenarios/keepitgoing/chat.ts:79` via
`path.join(process.cwd(), "data/woman-responses/prompts")`, and
`app/api/test/calibration/*/route.ts` read `data/woman-responses/diagnostics`
the same way. `.gitignore` carries a comment saying excluding them made every
production build fail with `ENOENT`. `data/` has 44,595 files on disk and 9 in
git; the 44,586 others are already ignored and are not the repo's problem.

**Acceptance test:** `npm run smells` reports unreachable `0` (or `1` if
`src/qa/providers/claude.ts` turns out to be dynamically loaded), and the
`tests/unit/docs/smellsScript.test.ts` fixture is updated in the same commit to
drop `GoalIcon.tsx`. **Gates**, then commit.

## Phase 3 — Prune the lab

The biggest single win, and the only phase with a real judgement call in it.
**Blocker 1.**

**Scope: the 22 folders under `app/test/` with no commit in six months** — 220
files, 95,643 lines. Measured with `git log -1 --format=%as -- <folder>` on
2026-10-01:

| folder | files | lines | last commit |
|---|---|---|---|
| `goalsv3` | 41 | 15,164 | 2026-02-18 |
| `goalsv4` | 33 | 14,063 | 2026-02-18 |
| `goalsv2` | 38 | 13,976 | 2026-02-18 |
| `goalsv9` | 9 | 13,811 | 2026-02-21 |
| `goalsv7` | 10 | 9,522 | 2026-02-21 |
| `goals` | 37 | 7,149 | 2026-03-04 |
| `tour-variants` | 10 | 3,693 | 2026-03-04 |
| `curve-customization` | 8 | 3,431 | 2026-02-16 |
| `goalsv5` | 6 | 3,031 | 2026-03-04 |
| `goalsv8` | 2 | 2,602 | 2026-02-21 |
| `articles` | 1 | 2,052 | 2026-02-06 |
| `goalsv6` | 3 | 1,945 | 2026-02-20 |
| `animations` | 1 | 1,411 | 2026-02-18 |
| `script-builder` | 5 | 699 | 2026-03-11 |
| `direction-colors` | 4 | 630 | 2026-02-25 |
| `values-curation` | 1 | 598 | 2026-01-29 |
| `role-models` | 1 | 547 | 2026-02-15 |
| `calibration` | 6 | 466 | 2026-02-16 |
| `marcus-loop` | 1 | 390 | 2026-02-16 |
| `goalsv11` | 1 | 305 | 2026-02-25 |
| `old-variants` | 1 | 92 | 2026-02-25 |
| `curve_editor` | 1 | 66 | 2026-02-25 |

**Kept, all of it:** everything touched since July — `archive/` (36 files,
2026-09-25, and the architecture test's `nothing links to the archived surfaces`
guards it), `goal-scorecard`, `health`, `goal-model`, `font-check`, `crash`,
`goal-review`, `achievements`, `change-your-life`, `life-mastery-v1`, `toggl`,
`life-direction`, `vision-plan`, `scenario-lab`, `programs`, `test-chatbot`,
`new-goals`, `pricing`, `exercising`. 56 files, 8,505 lines.

**And with them, the `src/` code that existed only to serve them.** Six subtrees
of `src/goals` are reachable from no live route and no other slice — only from
`app/test` pages:

| subtree | files | lines |
|---|---|---|
| `src/goals/components/vision-plan` | 2 | 12,250 |
| `src/goals/components/views` | 10 | 12,155 |
| `src/goals/components/setup` | 10 | 4,352 |
| `src/goals/components/change-your-life` | 7 | 2,691 |
| `src/goals/components/life-direction` | 9 | 2,469 |
| `src/goals/components/life-mastery` | 4 | 1,313 |
| **total** | **42** | **35,230** |

`src/goals/components/vision-plan/VisionPlanLab.tsx` alone is **11,681 lines**,
the largest file in the repo, reachable from one lab page.

**Each subtree is checked against its lab page before deletion, not in bulk.**
`components/setup`, `change-your-life`, `life-direction` and `life-mastery`
correspond to labs in the keep list — so they stay, whatever the scan says about
reachability. Only the subtrees whose *only* importer is a folder being deleted go.
Re-derive this from `npm run smells` after the `app/test` deletions, in the same
phase, rather than trusting the table above: deleting pages changes the graph.

**Why this is worth doing beyond the line count:** 131 of the 323 baselined lint
errors and 88 of the 218 unused variables live in `app/test`. Pruning the lab
removes **41% of the lint debt** without editing a line of live code. That is why
Phase 6 comes after this one and not before — burning down `app/test` lint errors
first would be work thrown away.

**Procedure, per folder, one commit each:**

1. `git tag lab-before-prune && git push origin lab-before-prune` — once, before
   the first deletion.
2. `git rm -r -- app/test/<folder>`
3. `npm run smells` → note which `src/` files just became unreachable.
4. Remove any `eslint-baseline.json` / `tsc-baseline.json` entries for deleted
   files, with `node scripts/lint-ratchet.mjs --update` and the typecheck
   equivalent. **The ratchets will otherwise fail on stale entries** — which is
   the behaviour you want, and is also the step that is easy to forget.
5. Check the architecture test's allowlists for entries under that folder. Note
   that several use `.filter((rel) => fs.existsSync(...))`, so a deleted file
   **silently drops out of the scan** instead of failing — a coverage loss with
   no error. Grep each allowlist for the folder name by hand.
6. **Gates**, then commit.

22 folders is 22 commits. Group the twelve `goalsv*` folders into one commit if
that is too many; they are one decision.

## Phase 4 — One home for shared code

Today there are two homes for shared components (`components/`, 26 files, and
`src/shared/components/`, 5 files) and two for shared utilities (`lib/utils.ts`
and `src/shared/`). **278 files import `@/components/`** and 40 import
`@/lib/utils`. This is the largest mechanical change in the plan and the one most
likely to break something, so it is also the most heavily verified.

**Target layout** (open question 3 — three homes, not one):

| from | to | files |
|---|---|---|
| `components/ui/*` (18, less `GoalIcon`) + `BottomSheet.tsx` | `src/shared/ui/` | 19 |
| `components/AppHeader.tsx`, `MobileNav.tsx`, `MobileTabBar.tsx`, `BackLink.tsx`, `navTabs.ts` | `src/shared/chrome/` | 5 |
| `components/ClockSync.tsx`, `ViewportHeightUpdater.tsx` | `src/shared/components/` | 2 |
| `lib/utils.ts` | `src/shared/cn.ts` | 1 |

**Three things de-risk this, and I verified each one:**

1. **The dependency already flows the right way.** `components/` imports from
   `src/shared/` (3 statements) and from `lib/` (17), and nothing in `src/`
   outside its own slices imports *out* to a sibling. Moving `components/` under
   `src/shared/` does not invert any edge.
2. **The scans that currently skip `components/` would not newly fail.** Four
   architecture scans walk `['src', 'app']` and not `components`: the write-up
   form's word list, the `/api/health/workout` POST check, the direct
   `auth.getUser()` check, and the browser-reads-in-`useState` check. I grepped
   root `components/` for all four patterns: **clean on all four.** So bringing
   those 26 files into scope surfaces nothing.
3. **The build catches a wrong path in 42 seconds**, and `tsc` catches the rest.

**The config references that must move with the files.** Missing one of these is
the failure mode, so here is every hit, found by grepping all ten config files:

- `eslint.config.mjs:47` — `"components/**/*.{js,jsx,mjs,cjs,ts,tsx}"` in the
  globals block. Delete the line; `src/**` already covers the new location.
- `.claude/rules/product-map.md:5` and `.claude/rules/finished-work.md:7` —
  `"components/**"` in `paths:` front-matter. Both become `"src/shared/**"`.
- `tests/unit/architecture.test.ts:508`, `:713`, `:1982`, `:2669`, `:2894` —
  each walks `['src', 'app', 'components']`. Drop the third element.
- `tests/unit/architecture.test.ts:1501-1502` — `'components/BottomSheet.tsx'`
  and `'components/ui/stepper.tsx'`, inside a list that ends
  `.filter((rel) => fs.existsSync(path.join(projectRoot, rel)))`. **These will
  not fail — they will silently stop being checked.** Update both paths.
- `tests/unit/shared/touchTargets.test.ts` — 15 occurrences across lines 47–107.
- `tests/unit/shared/bottomSheet.test.tsx:141`,
  `tests/unit/navigation/backNavigation.test.ts:218`,
  `tests/unit/navigation/routeReachability.test.ts:369,459,461`,
  `tests/unit/navigation/tabBarDestinations.test.ts:70`.
- `tsconfig.json` — no change. `@/*` maps to `./*`, so `@/src/shared/ui/button`
  resolves with no new path entry. Do not add one.

Entries matching `components/...` elsewhere in the architecture test are
**slice-relative** (`src/programs/components/HistoryTab.tsx` keyed as
`components/HistoryTab.tsx`) and must not be rewritten. Check each against
`fs.existsSync` at the root before touching it.

**Procedure — this is a transaction and runs in a worktree.**

A rename across 278 files cannot be half-done: a partially converted tree returns
500 on every route including `/auth/login`, and since `.husky/pre-commit` tests
the tree, it blocks all three sessions from committing. That has already happened
once, on 2026-09-24.

1. `git worktree add ../dgc-shared-move training-rebuild` and work there.
2. `git mv` each file to its new home — `git mv`, so the rename is staged
   atomically and git records it as a rename.
3. Rewrite the specifiers. 278 files, so a codemod, but **not a blind `sed`**:
   match `from ['"]@/components/` and `from ['"]@/lib/utils` at a specifier
   position only. A bare `s|@/components/|@/src/shared/|g` also rewrites the
   string inside every test allowlist and every comment, including the
   slice-relative ones above.
4. `grep -rn "@/components/\|@/lib/utils" --include='*.ts' --include='*.tsx' .`
   → must be empty. Then the same grep over `HEAD` after committing:
   `git grep "@/components/" HEAD` → must be empty. The working tree being clean
   says nothing about whether the commit compiles alone.
5. Update the config references listed above.
6. **Gates** — all four, and the build is not optional here.
7. Commit as one commit. A rename split across two commits leaves `HEAD` broken
   in between.
8. `git worktree remove ../dgc-shared-move && git worktree prune`.

**Acceptance test:** `npm run smells` shows `components/` and `lib/` gone from the
reachability table; `npx playwright test tests/e2e/sweep/route-sweep.spec.ts`
passes, since that suite visits every page and is the only check that a moved
component still renders. Note that an e2e run needs a frozen `src/` — do not run
it while another session is editing.

## Phase 5 — `src/goals` becomes subslices

198 files: 136 in a flat `components/`, 29 in `data/`, 2 in `hooks/`, 31 service
files at the slice root, and one 2,558-line `types.ts`. After Phase 3 removes the
lab-only subtrees it is roughly 156.

**The honest boundaries are the import clusters, and they are already visible in
the folder names.** Measured group sizes and who imports each:

| group | files | lines | imported from |
|---|---|---|---|
| `components/north-star` | 43 | 19,424 | live app, other slices, tests |
| slice root (services) | 31 | 24,138 | live app, other slices, lab, tests |
| `components/` (flat) | 30 | 8,302 | **lab and tests only** |
| `data/` | 29 | 22,663 | live app, other slices, lab, tests |
| `components/new-goals` | 12 | 4,570 | lab and tests only |
| `components/tree-of-life` | 7 | 1,270 | **inside `goals` only** |
| `hooks/` | 2 | 97 | inside `goals` only |
| `components/guide` | 1 | 150 | inside `goals` only |

**The public surface is 44 of 197 files.** Everything else is internal, which is
what makes subslicing tractable. `types.ts` has **122 importers** — it is the one
file that cannot move without touching everything, so it moves last, or not at
all.

**Proposed layout**, each step independently shippable and green:

```
src/goals/
  types.ts                 (stays — 122 importers; re-exports the subslice types)
  index.ts                 (new — the slice's public surface, the 44 files' exports)
  north-star/              components/north-star + the services only it uses
  plan/                    lifePlan*, visionPlan*, horizonService, oneThing*
  tree/                    components/tree-of-life + treeGenerationService + hooks
  catalogue/               data/ (goalShapes, lifeAreas, goalCategories, goalGraph)
  achievements/            badgeEngineService, goalAchievementsService
  (slice root)             goalsService, goalHierarchyService, goalTriageService…
```

**Order, and why:**

1. **`tree/` first** — 7 files plus 2 hooks, imported from nowhere outside
   `goals`. Zero external blast radius. It is the rehearsal: if the mechanics are
   wrong, they are wrong on 9 files instead of 43.
2. **`catalogue/`** — `data/` is imported widely but is pure data with no
   component dependencies, so the specifier rewrite is mechanical.
3. **`achievements/`** — 2 services, small, and `goalAchievementsService` is one
   of the 44 public files, so it exercises the `index.ts` surface.
4. **`north-star/`** — 43 files, the live Life Mastery feature. Highest value and
   highest risk; do it fourth, with the full gate set and the route sweep.
5. **`plan/`** — the remaining services.
6. **`types.ts` split last, or not at all.** Depends on open question 7. If the
   answer is one `types.ts` per subslice, this is where the 2,558 lines divide and
   where 77 of the 138 allowlist entries from Phase 1 come off.

**Per step:** `git mv`, specifier rewrite (same codemod discipline as Phase 4 —
match specifier positions, never a bare `sed`), update the architecture test
allowlists that name the moved paths, **Gates**, one commit.

**Acceptance test:** after each step, `npm run smells` shows the coupling matrix
unchanged — subslicing must not create new cross-slice edges, and if the count
moves, a specifier was rewritten to the wrong target.

**Which other slices need this, and which do not.** `programs` (66 files),
`tracking` (58) and `db` (47) are large enough to argue about and small enough to
leave alone; `goals` is 198 and is three times the next one. Do `goals` only, and
re-measure afterwards. A plan that subslices four slices at once is a plan that
gets abandoned at the second.

## Phase 6 — Burn the baselines down

Only now, because Phase 3 already deleted 41% of it for free.

`eslint-baseline.json`, 323 errors, where they live:

| | all errors | of which unused-vars |
|---|---|---|
| `app/test/` | 131 | 88 |
| live code (`src/`, `app/`, `components/`) | 120 | 78 |
| `tests/` | 46 | 40 |
| `scripts/` | 25 | 12 |

**Order, each group one reviewable commit:**

1. **117 unused imports across 79 files.** Pure deletions, no behaviour change,
   and `tsc` plus the build prove it. This is the single cheapest win in the
   entire plan. (`eslint --fix` handles most; review the diff, because a
   side-effect import — `import './polyfill'` — is not an unused import and
   deleting it changes behaviour silently.)
2. **80 dead locals** (`assigned a value but never used`). Read each one: a
   dead local is sometimes the *symptom* — a computed value nobody uses because a
   line that should use it was dropped. Deleting it hides the bug. Check each
   against what the function claims to do before removing it.
3. **57 `no-unused-expressions`.** These are the interesting ones, not noise: an
   expression statement with no effect is usually a dropped assignment or a
   missing call. Expect to find at least one real bug here.
4. **7 `react-hooks/rules-of-hooks`.** A conditional hook is the crash this repo
   has shipped twice — "Rendered more hooks than during the previous render",
   which reaches a person as "This page could not load." These are not cleanup;
   they are live defects. **Fix them first if any are in live code**, ahead of
   step 1, and open each page to confirm.
5. **27 `no-explicit-any`**, then the remaining 12 singletons.

Unused **function parameters** specifically: `typescript-eslint`'s recommended
config uses `args: 'after-used'`, so a trailing unused parameter is already
reported and is inside the 218 — there is no separate hidden pool. A
*leading* unused parameter is not reported, by design, because removing it
changes the call signature. Leave those; renaming to `_name` is churn.

`tsc-baseline.json`, 98 errors: 31 live, 30 `scripts/`, 27 `tests/`, 10
`app/test/`. Twelve of them are `TS1378` (top-level `await`), which is one
`tsconfig` decision rather than 12 fixes — but changing `module`/`target` affects
every file, so it is its own commit with the full gate set.

**Acceptance test:** `npm run lint:ratchet` and the typecheck ratchet after each
commit; the baseline total strictly falls. These gates already exist and already
refuse a regression — this phase is just driving them down.

## Phase 7 — The tests that stop it coming back

One test per smell class. Each one fails today if the thing it guards is absent,
and each has a starting number written into it.

1. **`the slice list is the directory listing`** — Phase 1a. Scope cannot be
   hand-maintained. *Starts at 0 gaps (today: 10 of 18.)*
2. **`no new top-level directory`** — a shrinking allowlist of what may sit at
   the repo root, so the next `new_new_clean_attempt/` fails on arrival rather
   than being found seven months later. *Starts at today's root listing.*
3. **`shared code has more than one importing slice`** — a file in
   `src/shared/` imported by exactly one slice belongs in that slice.
   *Compute the start from `npm run smells`; expect a handful.*
4. **`the lab has a half-life`** — lists `app/test/*` folders with no commit in
   six months. **Reports, does not fail.** A test that fails on the calendar
   fails on a day you did nothing wrong, and a gate that goes red by itself is
   the 492-lint-error story again. *Starts at 0 after Phase 3.*
5. **`no file is reachable only from the lab`** — a shrinking allowlist.
   *Starts at whatever Phase 3 leaves; expect ~35 outside `goals`.*
6. **`every plan has a Status line`** — open question 6's vocabulary, checked
   across all 18 files in `docs/plans/`.
7. **`the architecture doc is freshly generated`** — Phase 1d.

**What none of these can do**, said plainly because the budget test says the same
thing about itself: they check the shape, never the judgement. A test can tell you
`src/shared/x.ts` has one importer. It cannot tell you whether the second
importer is arriving next week. Treat every number above as a prompt to look, not
a verdict.

---

## Appendix — every measurement, and how to re-run it

| claim | command |
|---|---|
| reachability 544/77/6/2 | `node scripts/smells.mjs` (Phase 0); until then the scratch scripts in this session |
| 276 `app/test` files, 0 live-reachable | `git ls-files app/test \| wc -l` plus the reachability walk |
| 220 files / 95,643 lines ≥6mo | `for d in app/test/*/; do git log -1 --format=%as -- "$d"; done` |
| 323 lint errors, 218 unused-vars | `npm run lint:ratchet`; breakdown by rule from `eslint-baseline.json` |
| 131 of 323 in `app/test` | group `eslint-baseline.json` keys by path prefix |
| 117 unused imports / 79 files | match each baselined name against an `^import` line in its file |
| 98 type errors | `npx tsc --noEmit 2>&1 \| grep -c "error TS"` |
| 138 hidden type-export violations | run the `Slice Structure` scan with `slices = readdirSync('src')` |
| 23 feature-coupling edges, 100 statements | the slice-to-slice matrix in `scripts/smells.mjs` |
| 278 importers of `@/components/` | `grep -rl "@/components/" --include='*.ts' --include='*.tsx' .` |
| `goals` public surface 44 of 197 | importer walk restricted to `src/goals/**` targets |
| instruction budgets 389/2710/948/416 | `npx vitest run tests/unit/docs/instructionBudget.test.ts` |
| all four gates green | the table in Part 1 |
