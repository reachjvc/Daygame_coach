# Cleanup, and the structure rules that stop it coming back — plan

**Status:** in progress 2026-10-01 — Phase 1b and 1c are done and committed; the
rest is not started. Supersedes nothing.

Every number here was measured on `training-rebuild` and the command is in the
appendix. **Re-measure before acting on any count.** Three other sessions commit
into this working tree: `HEAD` advanced twice while this was being written, the
count of files importing `@/components/` fell from 278 to 271, the worktree list
went from 1 to 4 and back to 1, and `docs/plans/` went from 18 files to 20. A
number here is evidence that something is true, never an input to a script.

---

# Part 1 — For you (plain language)

## What you asked, and the one place the premise was wrong

You asked for four things: rules that make me tidy up branches and worktrees when
a plan is done; the actual cleanup of unused variables, files, parameters and
folders; the stray files put into their slices; and the structure written down
once instead of in several places.

Three of those are right and the plan does them. **One premise is wrong, and it
changes the shape of the work**, so it goes first rather than buried:

> **There are almost no unused files in this repo. There are 355 unreachable
> ones.**

I resolved every import across all 1,622 tracked code files and walked the graph
from the 155 live entry points. Of the 629 files in `src/`, `components/` and
`lib/`:

| | files |
|---|---|
| reachable from a live route | 544 |
| reachable **only** from an `app/test/*` lab page | 77 |
| reachable only from the test suite | 6 |
| reached by nothing at all | **2** |

Two. `components/ui/GoalIcon.tsx` and `src/qa/providers/claude.ts`. A tool that
hunts unused files reports those two and tells you the repo is clean.

The weight is elsewhere. **`app/test/` is 280 files and 104,535 lines — 63
`page.tsx` routes under 43 top-level entries — and no live route reaches any of
it.** 220 of those files (95,643 lines) have no commit in six months, and they
hold 77 `src/` files alive behind them. Every one of those files *is* imported —
by another dead file.

So this plan deletes by **reachability**, not by whether a symbol is referenced.

Where the premise *was* right, and I understated it: **618 exported names are not
used by any other file** — **142 used nowhere at all**, **476 used only inside
their own file** (drop the `export` keyword), and **96 in lab-only files** that
die with their page.

## The second thing: your first ask was budget-blocked, and is now done

You asked me to improve `CLAUDE.md`. I could not add a sentence without removing
one — you built that gate yourself. `tests/unit/docs/instructionBudget.test.ts`
caps the instruction files, and every one was at its ceiling: `CLAUDE.md`
389/391, `.claude/rules/` 2,710/2,710, `docs/known-failures.md` 948/950,
`MEMORY.md` 416/430.

**This is done — the one part of the plan already executed**, because housekeeping
to rule files is a standing never-ask and you asked for it directly:

- **`.claude/rules/product-map.md`** lost its closing paragraph (the three facts
  about `/test/*` 404ing, `health/`+`exercising/` having no live page, `goals/`
  being 100k lines). I checked each against `docs/product/map.md` first — all
  three are there at lines 107, 159, 233, 238–239, and line 10 of the rule
  already sends you to that file. **A true duplicate.**
- **`.claude/rules/finished-work.md`** gained `# When a plan is done`. It
  triggers on `docs/plans/**`, which is exactly when a plan finishes.
- **`CLAUDE.md`** gained `**A finished plan leaves no branches:**` pointing at
  that rule, paid for by shortening the architecture and commands lines.
  **387 of 391 — four words better than it started.** Rules: 2,709 of 2,710.

It is in `CLAUDE.md` as well because a branch is deleted at the end of a turn,
when no `docs/plans/` path may have been touched and the path-triggered rule will
not have loaded.

**There is no `AGENTS.md`.** You mentioned "agents.md / claude.md"; `CLAUDE.md`
is the only one and I have not invented the other.

### And the first version of that rule was wrong — I shipped it, then caught it

I wrote it keyed on `git branch --merged main`, which is the obvious thing and is
useless here. **`main` is 0 commits ahead and 421 behind `training-rebuild`, and
`git branch --merged training-rebuild` lists `main`.** `main` is not the trunk;
it is wholly contained in the branch you are working on. A rule keyed on
`--merged main` can never match anything, forever.

The rule now reads `git branch --merged HEAD`, minus `main` and your own branch,
so it works whichever branch is the integration branch and needs no hardcoded
name — which is this plan's Rule 2 applied to the rule itself. Run today it
returns **zero branches**, which is the honest answer: there are three branches
and two hold unmerged work.

## The third thing: the structure rule exists and checks 44% of the code

You said the smells suggest the architecture is not written down well enough. It
is written down. The problem is sharper and worse.

`tests/unit/architecture.test.ts` has a `Slice Structure` block enforcing "each
slice has a `types.ts`", "each slice has a service file", and "type exports only
in `types.ts`". It applies them to a **hand-typed list of eight slices** at line
295:

```js
const slices = ['qa', 'inner-game', 'scenarios', 'tracking',
                'profile', 'settings', 'articles', 'programs']
```

`src/` has **eighteen** directories. The ten omitted are `goals` (198 files),
`db` (47), `timetrack` (36), `vice` (31), `shared` (22), `health`, `home`,
`exercising`, `dashboard`, `api_ai`. Extend the rule to the directory listing and
**138 type-export violations appear at once** — 77 in `goals`, 27 in `db`, 13 in
`timetrack`, 12 in `vice`. `src/home` and `src/shared` have no `types.ts` at all.

The test already knows this can happen. Its own comment:

> *"`programs` was absent, and so the type rule never looked at the gym.
> `TrainingCardState`, `LiftProgress` and `PlateLoad` all lived in
> `programsService.ts` for months with nothing noticing."*

Somebody found this exact bug once, fixed it by typing `programs` into the array,
and left the mechanism intact. **That is why the biggest slice has a 2,558-line
`types.ts` and 232 exports nothing else names.** Not a missing rule — a rule whose
scope silently excluded the code that needed it.

**And it is not one instance. It is four.**

1. The `slices` array above — 8 of 18.
2. `tests/unit/architecture/sharedComponentsTested.test.ts` reads as a repo-wide
   shared-component guard and is scoped at line 35 to `src/programs/components`
   only.
3. `orientation.test.ts` has **no reverse check**: it fails when a new slice is
   missing from `docs/product/map.md` and stays green when a slice is *deleted*
   and the map goes on describing it. Phase 3 deletes things, so this closes
   first.
4. `docs/product/map.md:169` says **"The Black Box reads none of the corpus."**
   It does. Traced: `app/life-mastery/quit-vice/page.tsx` → `BlackBoxPage`
   (imports 65–66, renders 776 and 788) → `ThoughtDoor`/`UrgeNow` → `OneVoice`
   from `../Voices` → `TESTIMONIALS` and `TECHNIQUES` from `src/vice/data/`. The
   live Black Box reads all 381 testimonials and 196 techniques.

`.claude/rules/product-map.md` already records this exact failure happening to the
`health/` line on 2026-09-19, and says why: nothing tests whether the sentences
are true, only that each slice is *named*. It has now happened again, to a line
about the newest feature.

**So the single-source-of-truth work is not "write an architecture doc". It is:
no rule and no document may have a hand-maintained scope.** Everything a rule
covers is derived from the filesystem, checked in both directions, or it rots.

### Where the knowledge actually lives: nine places, not one

`CLAUDE.md:44` says "Architecture: run `tests/unit/architecture.test.ts`, don't
memorise it." That one file is 3,621 lines, **65 tests in 23 describes, and 20
allowlists** (3 at module scope, 17 declared inside describe blocks). It has
**nine sibling files in `tests/unit/architecture/` carrying 45 more tests — 10
files and 111 tests in total — and `CLAUDE.md` names none of the nine.**

The other eight homes: `.claude/rules/` (8 path-triggered files),
`docs/product/map.md`, `docs/testing_behavior.md`, `docs/known-failures.md`,
`tests/unit/docs/instructionBudget.test.ts` (the word caps that block any new
prose), `tests/unit/docs/instructionInvariants.test.ts` (the clause-survival
list), `tests/unit/architecture/*` (above), and `src/db/paging.ts`'s own header,
which duplicates `.claude/rules/database.md:40-50` figure for figure.

## The four rules this plan follows

These are what I am asking you to approve. Not the phase count or the file
counts — those are outputs and they will move.

**Rule 1 — Unreachable is the unit of deletion, not unused.** Code goes when no
live route reaches it, not when no symbol references it.
*Cost if wrong:* I delete a lab you were using. Mitigated by gating on six months
of staleness and tagging first. **This rule nearly bit me — see "What I got
wrong" — because a folder can be mostly lab and partly live.**

**Rule 2 — No rule and no document may have a hand-maintained scope.** Derive it
from the filesystem and check both directions.
*Cost if wrong:* four instances above, hiding 138 violations and one false
sentence about the newest feature. The most expensive thing to get wrong.

**Rule 3 — Instruction budget is paid, never raised.**
*Cost if wrong:* the 4,386-word state returns, and with it an agent answering
"this is a live, paid product taking real Stripe subscriptions" about a product
that has never had a customer.

**Rule 4 — One phase, one green tree, one commit.**
*Cost if wrong:* a `HEAD` that does not compile between two commits. Three other
sessions share this checkout and `.husky/pre-commit` tests the tree, so a broken
`HEAD` blocks all of them. This has happened three times already.

## The gates: which can go green, and which never can

**Two can never pass, by design. Writing "typecheck clean" as an acceptance
criterion would make this plan unachievable.**

| gate | command | result |
|---|---|---|
| unit suite | `npm test` | **6,634 pass, 1 skipped, 385 files, 48s** |
| types | `node scripts/typecheck-ratchet.mjs` | **"Type errors: 98, none new."** |
| | `npx tsc --noEmit` | **exits 1 forever — 98 *is* the baseline** |
| lint | `npm run lint:ratchet` | **"Lint errors: 323, none new."** |
| | `npm run lint` | **red by design — 323 baselined errors** |
| build | `NEXT_DIST_DIR=.next-verify bash scripts/build.sh --webpack` | **✓ Compiled successfully in 42s** |
| e2e listing | `npx playwright test --list` | **1,196 tests, 84 files, 44 projects** |
| integration | `npm run test:integration` | **369s, 1 failure beside a peer session** |
| the app | `curl localhost:3000` | **200** |

**The build works, and it is what makes this plan possible.** `scripts/build.sh`
puts a 12 GB cgroup ceiling on it and refuses to start if it cannot, so the
Turbopack runaway that froze this machine three times in 2026-09 cannot recur;
`package.json` already passes `--webpack`. Next 16 rejects `--distDir` outright,
but `next.config.mjs` reads `NEXT_DIST_DIR`, so a verification build runs beside
your dev server. **75 seconds wall clock.**

**And it catches a bad import path even though types are ignored** — proven, not
assumed: a probe importing `@/src/shared/definitelyNotARealModule` failed in 65s
with `Module not found`. `typescript.ignoreBuildErrors: true` suppresses *type*
errors, not webpack resolution.

**The integration suite cannot be a per-phase gate.** 369s, and it fails beside
another session — `vitest.integration.config.ts` already sets
`fileParallelism: false`, so the contention is between *sessions*.

**Your dev server is three days old.** PID 928644, 1.6 GB resident. A three-day
HMR graph can keep serving a module a codemod has deleted — this repo's named
repeating failure, checking a stand-in instead of the thing. **It must be
restarted after every file-moving phase**, and not by me: it serves you and two
peer sessions and there is no deployed site.

**A fresh worktree has no `node_modules`,** so `vitest` cannot start and these
gates cannot run in one. `ln -sfn <repo>/node_modules <worktree>/node_modules`
first, or the transaction stalls at the verification step.

**Capture vitest output to a file, never the terminal tail:**
`npx vitest run tests/unit --reporter=json --outputFile=/tmp/run.json`. A probe
run reported "9 failed" while naming only 3, because the tail truncated it.

## Two security notes, unasked

**1. `app/api/test/` is eleven endpoints, ten of them unauthenticated.** Six
write files under `process.cwd()` from an unauthenticated POST body, and one
joins a URL segment into a file path. They are held off the internet by a single
early return in `proxy.ts` plus one matcher line, and
`testRoutesSealed.test.ts`'s own comment says reordering that guard leaves
everything compiling while the endpoints start answering.

Priced for this stage: nothing is deployed, nobody has paid, so this is not an
incident and I am not calling it one. It becomes one the day something ships.
Their only consumers are three lab benches last touched 2026-02-06, 2026-03-04
and 2026-03-11 — so retiring the surface is cheaper than guarding it forever.

**2. The ask-first guardrail cannot fire in an unattended session.**
`.claude/hooks/never.py` is correct — I fed it the payloads and it returns `ask`
for `src/shared/iconRoles.ts`; selftest 27/27. But `ask` needs a human. In a
non-interactive session there is none, and an agent of mine edited
`src/shared/iconRoles.ts` with no prompt at all (it reverted; the tree is clean).
The five `deny` classes still hold, because `deny` needs nobody. **The seven
`ask` paths — migrations, `profilesRepo.ts` (who gets paid access), `stripe.ts`,
`products.ts`, `CheckoutButton.ts`, `app/auth/`, `iconRoles.ts` — are unguarded
in any background run.** Separately the hook only inspects `Write`/`Edit`/
`NotebookEdit` file paths and Bash command text, so
`git mv src/db/profilesRepo.ts ...` is never asked about. It needs a
`deny`-plus-allowlist shape rather than an `ask`, and that is a decision rather
than a patch.

## What you will see after each phase

Nothing in the product changes. Not one user-facing pixel. Any phase that changes
behaviour has a bug.

- **Phase 0** — `npm run smells` prints these numbers, so you can check any claim
  and watch them fall.
- **Phase 1** — partly done. Rules cover all 18 slices in both directions; the
  map's false line is fixed.
- **Phase 2** — 118 files gone, all provably referenced by nothing.
- **Phase 3** — the lab is 60 folders' worth of files instead of 280 files, and
  131 of the 323 lint errors go with it for free.
- **Phase 4** — the shared-code rule written down and enforced instead of being
  one sentence in a product doc.
- **Phase 5** — `src/goals`'s existing folder structure promoted to real
  subslices and enforced.
- **Phase 6** — the baselines at or near zero.
- **Phase 7** — a test fails if any of it starts coming back.

## Blockers — the ones that are yours

1. **Deleting 220 lab files / 95,643 lines (Phase 3).** The one
   irreversible-feeling step, though git keeps it and I will tag first.
   *Recommendation: yes*, gated on six months of no commits, keeping
   `app/test/archive/` (touched 2026-09-25, guarded by the architecture test and
   an e2e spec).
2. **`src/shared/iconRoles.ts`.** Ask-first by name; the `GoalIcon.tsx` deletion
   touches it. *Recommendation: approve.* Note the hook will not actually stop an
   unattended agent here.
3. **An exclusive window for Phases 3 and 5.** A multi-hundred-file codemod in a
   tree three sessions commit into cannot be made safe by care alone; `git stash`
   is banned, so a mid-codemod conflict has no cheap exit. *Recommendation: yes,
   and restart the dev server afterwards.*
4. **Whether `app/api/test/` and its three benches go** (security note 1).
   *Recommendation: delete all three and `app/api/test` with them.* If you want
   one bench, keep only the endpoints it needs and leave the proxy guard and
   `testRoutesSealed.test.ts` exactly as they are.
5. **`beta`, and the two stashes.** `beta` is 1 commit ahead and 480 behind; its
   content is a strip of `src/articles`, which still exists on `training-rebuild`,
   so the trunk already rejected it. *Recommendation: delete `beta` local and
   remote without cherry-picking, and record why in the message.* **The two
   stashes: leave both alone forever.** `never.py` forbids every stash write,
   memory says one holds irreplaceable work, and which one is **unverified** —
   a third state, not a pass. `git stash show -p stash@{1}` is permitted and is
   yours to read, not an agent's to act on.

Nothing in this plan touches `app/auth/`.

## Open questions, each with my recommendation

**1. Where does shared UI live — and is one home even right?**
I started from "two homes is a smell, collapse them". That was wrong, and
checking it reversed my answer twice over. `docs/product/map.md:146` states a
*rule*: `OfflineShell` moved to `src/shared/components/` **"because two pages
mount it."** And the move is more expensive than the first draft of this plan
said: `architecture.test.ts:1300` filters candidates with
`rel.includes('/components/')`, which root `components/ClockSync.tsx` never
matches (no leading slash) but `src/shared/components/ClockSync.tsx` does — and
`ClockSync.tsx:77,85` call `fetch()`, so it would trip "no NEW screen fetches its
own data". A trial run of the move **failed nine test files**, not zero.
*Recommendation: keep both homes and write the rule down where it is enforced.*
The problem was never two folders — it is that the rule governing them lives in
one passing sentence of a product document, is in none of the architecture rules,
and nothing checks it. **This reverses a whole phase of the first draft, and the
reversal is the most useful thing checking produced.**

**2. Does `app/test/` stay as a concept?**
It is the laboratory on purpose, and 15 of the 43 entries are active.
*Recommendation: keep it, and add the marker that makes this question
unrepeatable* — `app/test/LABS.md`, one line of status per route, plus a test
that fails when a `page.tsx` appears with no entry. The folder was never the
problem; "lab" and "abandoned" were stored in it with nothing telling them apart.

**3. Delete the nine superseded goals generations, or archive them first?**
203 files, 89,175 lines, 7.4% of the tracked repo, 38% of its lint debt.
*Recommendation: delete, build no archive.* Git is the archive —
`git log --diff-filter=D -- <path>` already finds the 482 docs deleted on
2026-09-09 and `CLAUDE.md` teaches that move, so a second archive adds a place to
look without adding anything to find. Trial-run: **zero new type errors, 124
fewer lint errors, 9 fewer type errors, zero `src/` files touched, two guard
files to update.**

**4. The 41 imports where `src/db` reaches up into feature slices.**
`db` imports from `programs` (24, including a re-export at
`src/db/workoutRepo.ts:1844`), `tracking` (6), `health` (5), `goals` (3),
`scenarios` (2), `vice` (1). `db` is not a bottom layer; it is entangled with
`programs` both ways.
*Recommendation: bless it with a shrinking allowlist, do not fix it here.* Most
are `import type` for a row shape. Untangling the rest means moving types between
slices; pretending a cleanup plan can also invert the data layer is not honest.

**5. Generalise "one door between slices" to all slice pairs?**
Generalising starts at **100 import statements across 23 edges** (59 without
`db`). *Recommendation: not yet — adopt per pair, highest first:* `db → programs`
(24), `programs → health` (8), `goals → programs` (8, already has a door at
`src/programs/forLifeMastery.ts`). A rule that starts at 100 needs a 100-entry
allowlist and nobody reads one.

**6. What happens to a plan file when its plan is done?**
20 files on disk now (two were written during this session).
*Recommendation: a required `**Status:**` line with fixed lifecycle vocabulary —
`DRAFT`, `APPROVED`, `EXECUTING`, `DONE`, `SUPERSEDED` — in place, and nothing
moves.* Lifecycle only, not built-state: the banner points at `map.md` for what
is built, so there is one owner per fact. Do not archive or delete — you cite old
plans for their reasoning (`training-rebuild.md` cites `training-overhaul.md`),
and the 482 deleted docs are the standing argument. If you want a tidier folder,
the five done-looking plans with **zero inbound references** can move for free:
`training-three-doors`, `training-overhaul`, `one-hub`, `life-mastery-simple`,
`life-mastery-off-the-bench`. `life-mastery-everything-saves` (7 refs) and
`vice-finished` (6) must not move.

**7. Do the `goals` subslices each get their own `types.ts`, and does `goals`
join the `slices` array now?**
*Recommendation: own `types.ts` per subslice — yes. Adding `goals` to the array
now — no.* I measured it: **77 files in `src/goals` violate the type-export rule
today.** Writing a 77-entry allowlist triples the existing 27 and makes the
ratchet mostly grandfather, the opposite of that file's own "EVERY LIST HERE
SHRINKS". And each subslice's own `types.ts` is **automatically exempt** — the
filter is `!f.endsWith('types.ts')` over a recursive walk, proven by
`src/scenarios/{keepitgoing,openers}/types.ts` being absent from the allowlist.
So the 77 shrinks on its own as Phase 5 lands. Add `goals` when it is under 20.
**Good news:** `orientation.test.ts`'s `readdirSync` is non-recursive, so
**subslices need no `docs/product/map.md` edit.**

**8. A dead-export ratchet, or install knip?**
Nothing is installed — no knip, ts-prune, depcheck, madge or unimported, verified
against `node_modules` and `package-lock.json`.
*Recommendation: write the ratchet.* knip reports per-run totals, and
`scripts/lint-ratchet.mjs`'s own header argues that totals are the wrong unit:
*"fix two unused variables in a file and add two others and a count would be
unchanged, so a brand-new error would pass."* A ratchet inherits
`scripts/lib/ratchet.mjs` and the `--update`/`--accept-new` convention you know.

**9. The research content in `src/goals/data` that only a lab page renders.**
A mechanical reading says lab-only, therefore delete.
*Recommendation: keep all ten, delete none — and this nearly went wrong.*
`tests/unit/goals/visionPlanService.test.ts` imports `WORKOUT_SPLITS`,
`MANIFESTO_PROGRAM_CREDO`, `INCANTATION_DECK`, `MONEY_JARS`, `PRINCIPLES` and
`buildExamplePlan` from them, and **`visionPlanService` is live**;
`lifeMasteryCopyLint.test.ts` prose-lints 16 of their exports. And four of them
(`lifeMasteryBeliefs`, `lifeMasteryContent`, `lifeMasteryExemplar`,
`lifeMasterySingle`) each say *"every quote here is verbatim from
lifeMasteryCorpus.ts"* — so `lifeMasteryCorpus.ts` (8,868 lines) is the evidence
behind live content and deleting it makes those claims uncheckable. Its only two
importers are unit tests, so **move it to `tests/fixtures/`** rather than delete
it. The question underneath is yours: does this content have a shipping home
coming, or is the lab page its final form? If it is the final form, the honest
follow-up is to delete the lab page and the copy-lint together — prose-linting
text nobody can read is work with no reader.

**10. Is `main` or `training-rebuild` the integration branch?**
`main` is 0 ahead, 421 behind, and wholly contained in `training-rebuild`.
*Recommendation: say in one line that `training-rebuild` is the de facto trunk,
and key every check on `--merged HEAD` rather than a branch name.* Merging
`training-rebuild` into `main` is a release, not a cleanup, and must not be
bundled into this plan.

**11. Should `never.py` ask or deny on branch and worktree deletion?**
*Recommendation: ask, never deny.* The accident worth preventing is the
unconsidered one — my own `git branch -d beta` — and a prompt stops it for one
keystroke, which is the bargain `ASK_FIRST` already strikes. Deny would mean
`CLAUDE.md` tells agents to do something the hook forbids. Note security note 2:
an `ask` is worth nothing unattended, so this is a guard for interactive work
only.

## What I got wrong, and what checking changed

Four things. Two touched the repo and one would have broken the live product.

**I deleted the `beta` branch.** I ran `git branch -d beta` expecting a refusal,
to document that `-d` protects unmerged work. It deleted it. **`-d` checks the
branch against its own upstream, not against `HEAD`** — `beta` was merged to
`origin/beta`, so `-d` was satisfied and warned while deleting. Restored to
`b9b808e5` with its tracking, byte-identical to `origin/beta`, nothing lost. An
agent of mine independently repeated the same experiment with the same result.
Every branch here tracks an origin counterpart, so **`-d` is as destructive as
`-D` for all three.**

**I shipped the cleanup rule keyed on `--merged main`, which can never match.**
Caught after committing, fixed to `--merged HEAD`. See above.

**I listed `src/goals/components/views` and `setup` as lab-only and slated them
for deletion. Both contain live code, and deleting the folders would have broken
the live Life Mastery page.** The chain: `app/life-mastery/page.tsx` →
`NorthStarFlow` → `TrackTab:39` → `GoalsHubContent:18-21` →
`views/TreeView`, `views/OrreryView`, `views/ViewSwitcher` and all seven of
`tree-of-life/`. The live Life Mastery screen mounts the *old goals hub*.

The cause is exactly the stand-in failure this repo keeps recording: my
per-folder table labelled each folder by the origins of its *external* importers,
and `GoalsHubContent` is internal to `goals`, so the live path was invisible to
the label while being plainly visible in the files. **I read a summary of my own
scan instead of the scan.** The corrected numbers are below, computed per file.

**My reachability scan was blind to side-effect imports.** It matched
`from "…"`, `import("…")` and `require("…")` but not a bare `import "./x.css"`,
so `src/goals/components/setup/goalsStepTour.css` (436 lines) looked like it had
no importer at all. Phase 0's scanner must match the bare form, and no deletion
may rest on a scan that does not.

**I also tried `next build --distDir`,** which Next 16 rejects, and my wrapper
reported `exit: 0` because the status was swallowed by a pipe into `tail`. A
pipeline's exit status is its last command's. Phase 0's script sets
`set -o pipefail`.

---

# Part 2 — Execution

Conventions for every phase:

- **Gates** means, in order: `npm test`; `node scripts/typecheck-ratchet.mjs`;
  `npm run lint:ratchet`;
  `NEXT_DIST_DIR=.next-verify BUILD_MEMORY_CAP=12G bash scripts/build.sh --webpack`;
  then `rm -rf .next-verify`. **Never `npx tsc --noEmit` or `npm run lint` as a
  pass/fail gate — both are red by design.** The integration suite is not a gate.
- **Commit** means `git commit --only <paths> -m "..."` — never a bare
  `git commit`, never `git add -A`, never `git stash`.
- `git status --short` immediately before each commit, and read what is left
  after. Record `git rev-parse HEAD` at phase start and re-check before
  committing.
- Any phase that cannot finish in one pass runs in a `git worktree` — with
  `node_modules` symlinked, or the gates cannot run there.
- **Re-measure every count before acting on it.**

## Phase 0 — Make the smells countable

Nothing is deleted. This builds the instrument, so every later phase has a number
that moves and this plan's claims stay checkable after the code changes.

**Deliverable:** `scripts/smells.mjs` plus `"smells": "node scripts/smells.mjs"`.
Prints, and takes `--json`:

1. **Reachability, per FILE, never per folder.** `src/`+`components/`+`lib/`
   split live / lab-only / suite-only / unreachable. **It must match bare
   `import "./x"` side-effect specifiers** — the omission that hid a 436-line
   file — and it must print a folder's live *and* lab counts side by side so a
   mixed folder cannot read as a deletable one. *Today, repo-wide: 544 / 77 / 6 / 2.*
2. **Lab staleness** — each `app/test/*` folder with files, lines and
   `git log -1 --format=%as`. *Today: 220 files / 95,643 lines at ≥6 months.*
3. **Scope gaps, both directions** — `src/` directories the architecture slice
   list omits, *and* names in the list or in `map.md` with no directory.
   *Today: 10 of 18 omitted; 0 stale.*
4. **Cross-slice coupling** — the slice matrix, `db`/`shared` edges separated
   from feature edges. *Today: 23 feature edges, 100 statements, 41 `db →` slice.*
5. **Dead exports** — used-nowhere / used-only-in-own-file / in-a-lab-only-file.
   *Today: 142 / 476 / 96 of 618.*
6. **Instruction budgets.** *Today: 387/391, 2709/2710, 948/950, 416/430.*

Three details, each from something that went wrong:

- `set -o pipefail` in anything that pipes; exit non-zero on its own failure.
- Report **"uncomputable"** as a third state, distinct from zero, and name the
  file it could not parse.
- Read `@/*` from `tsconfig.json` rather than hardcoding `./*`.

**Acceptance test:** `tests/unit/docs/smellsScript.test.ts` runs it with `--json`
and checks reachability against a hand-counted fixture of seven known files —
including `goalsStepTour.css` as lab-only (it proves the side-effect-import fix)
and one file in a mixed folder. A scanner with no fixture silently stops finding
things; this one already did.

**Gates**, commit.

## Phase 1 — Rules cover everything, in both directions

Changes no product code. **1b and 1c are done** (see Part 1).

### 1a. The slice list stops being hand-typed

In `tests/unit/architecture.test.ts:295`, `slices` becomes a `readdirSync` of
`src/`. **Split by rule, because the three rules cost very different amounts:**

- **`types.ts` exists** and **a service file exists** — adopt for all 18 now.
  Cost: create `src/home/types.ts` and `src/shared/types.ts`, re-exporting what
  those slices already export as types. Two small files.
- **Type exports only in `types.ts`** — adopt for all 18 *except* `goals`, whose
  77 violations would triple the allowlist (open question 7). Absorb the other
  61 into `ALLOWED_TYPE_EXPORTS` with a dated comment saying they were revealed
  by widening the scope. Add `goals` in Phase 5, when its own subslice
  `types.ts` files have shrunk the number below 20.
- **New test `the slice list is the directory listing`** — the array equals
  `readdirSync('src')`. This is the actual fix; adopt now, for all three rules,
  with the per-rule exception recorded in the test itself rather than in prose.

Also fix the third and fourth instances of the same bug:
`sharedComponentsTested.test.ts:35` is scoped to `src/programs/components` while
reading as repo-wide — either widen it or rename it to say what it checks.

**Acceptance test:** plant `src/zzz_probe/index.ts` exporting a type, confirm the
new test fails naming `zzz_probe`, delete it. **Prove by removal in a worktree,
and say so first** — a planted defect looks exactly like a broken refactor to
another session.

### 1b. `.claude/rules/finished-work.md` — **DONE**
### 1c. `CLAUDE.md` — **DONE** (387/391)

### 1d. `orientation.test.ts` gains its reverse check

Every backticked `<name>/` in the map's slice section has a matching directory,
and every `/<group>` a matching route group. **Phase 3 deletes things, so this
closes first.**

**Acceptance test:** `git mv src/exercising /tmp/x`, confirm it fails naming
`exercising/`, move it back.

### 1e. The false and stale lines in the map

- Fix `docs/product/map.md:169` — the live Black Box reads the corpus.
- `docs/product/map.md:203` describes `src/shared/` as five things for 22 files,
  omitting `HistoryBarrierContext`, `claudeHeadless`, `passwordRules`,
  `returnTo`, `safeRedirect`, `streakRuns`, `trainingRoutes`, `typedNumber`,
  `useBackableState`, `useLoad`, `useSteppedFlow` and the whole `components/`
  subfolder.
- `docs/product/map.md:107-111` says the live part of `goals` is "northStarService
  plus the north-star/ components". The live closure from
  `app/life-mastery/page.tsx` is **125 `src/goals` files** and reaches
  `visionPlanService`, `intakeService`, `horizonService`, `lifeMasteryService`,
  `goalsService`, `badgeEngineService`, `milestoneService` and
  `treeGenerationService` — all of whose *screens* are lab-only.
- `app/test/archive/quit-vice/routes.ts` says the archive's components are "still
  in `src/vice/components/`". They are at
  `app/test/archive/quit-vice/_module/components/`, and all 31 `src/vice` files
  are live-reachable.

**Acceptance test: none possible** — a test cannot tell whether a sentence is
true, which is the whole point, and is why the rest of this plan derives rather
than describes. The only durable mitigation is the existing instruction in
`.claude/rules/product-map.md` to check the line for the slice you are in.

**Gates**, one commit per sub-phase.

## Phase 2 — Delete what is provably referenced by nothing

118 files. Every one has evidence; no judgement calls.

### 2a. `new_new_clean_attempt/` — 115 tracked files

- `git log -- new_new_clean_attempt` → **one commit**, `80b9f571`, 2026-03-11,
  message `"ny ny"`. Never touched since.
- `grep -rl` across `*.ts,*.tsx,*.json,*.md,*.mjs` excluding itself →
  **nothing**. Not in `docs/`, `.claude/` or `CLAUDE.md`.
- Its folders are `02.EXT.transcribe`, `06.LLM.video-type`, `06b.LLM.verify`,
  `06d.DET.sanitized`, `06e.LLM.quality-check`, `06f.DET.damage-map`,
  `06g.LLM.damage-adjudicator`, `06h.DET.confidence-propagation`,
  `07.LLM.content`, `07b.LLM.enrichment-verify` — **the exact stage names now in
  `scripts/training-data/`.** It is the prototype of the shipped pipeline.
- 16 of its files carry emoji and escaped bytes in their names, which is why
  `git ls-files` quotes them. **Use `git rm -r -- new_new_clean_attempt`, not a
  shell glob**, or those 16 are missed.

**Gated:** `git tag pre-cleanup-newnew && git push origin pre-cleanup-newnew`
first.

### 2b. The two unreachable files

- `src/qa/providers/claude.ts` (43 lines). **Check for a dynamic import first:**
  `grep -rn "claude" src/qa/` for a registry resolving by string. A static scan
  is blind to `import(\`./providers/${name}\`)` and this file is named like a
  plugin. If it is dynamically loaded it is not dead — leave it and say so.
- `components/ui/GoalIcon.tsx` (32 lines). **Blocker 2.** Named as a string in
  `src/shared/iconRoles.ts:210-211` and filtered by name in
  `tests/unit/architecture.test.ts:2524`. "No importer" and "safe to delete" are
  different claims, and this is the difference.

### 2c. Thin directories, stale ignores, stale excludes

- `src/vice/hooks/` and `src/vice/components/steps/` are empty **on disk only** —
  git tracks no directory and no file under either, so `rmdir` yields no diff.
- `.gitignore` names ten paths that no longer exist. Delete six —
  `whisper.cpp`, `LivePortrait`, `SadTalker`, `training-data` (and the
  `!training-data/sources.txt` exception depending on it), `deprecated`,
  `www.youtube.com_cookies.txt`. **Keep** `coverage`, `out`, `build`, `dist`:
  build outputs that will exist again. (`time-open.png` has already left disk on
  its own; it was ignored by the blanket `*.png` at line 98, never by a rule.)
- `tsconfig.json` excludes four non-existent paths: `deprecated`,
  `scripts/training-data/old`, `scripts/deprecated`, `LivePortrait`. `.venv`
  stays.

**Do not touch — `proxy.ts`.** Next 16 renamed `middleware.ts` to `proxy.ts`, the
file documents this, and the build output confirms it with `ƒ Proxy (Middleware)`.
It is the most plausible-looking wrong move in this plan.

**Do not touch — `data/`, and not for the reason you would guess.** It is **107 GB
and 44,595 files, of which 9 are tracked.** Two directories under it are read at
**request time** via `process.cwd()`: `data/woman-responses/prompts` at
`src/scenarios/keepitgoing/chat.ts:79`, and
`data/woman-responses/diagnostics` at `app/api/test/calibration/{get,list}/route.ts:5`.
**Only the first has a `.gitignore` exception; `diagnostics` has zero tracked
files.** And `grep` over `tests/` finds **zero coverage of either path** — the
green 75-second build proves nothing about them. So before `data/` is touched:
write `tests/unit/scenarios/promptDirExists.test.ts` asserting both directories
exist with their expected contents, and prove it bites by `git mv`-ing one away
and back. Until that test exists, `data/` is off limits.

**Acceptance test:** `npm run smells` reports unreachable `0` (or `1` if
`src/qa/providers/claude.ts` is dynamically loaded), and the Phase 0 fixture is
updated in the same commit. **Gates**, commit.

## Phase 3 — Prune the lab

The biggest single win and the only phase with real judgement in it. **Blocker 1.**

### 3a. The 22 stale `app/test` folders

220 files, 95,643 lines, by `git log -1 --format=%as -- <folder>` on 2026-10-01:

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

**Kept, all of it** — everything touched since July: `archive/` (36 files,
2026-09-25, guarded by the architecture test and an e2e spec), `goal-scorecard`,
`health`, `goal-model`, `font-check`, `crash`, `goal-review`, `achievements`,
`change-your-life`, `life-mastery-v1`, `toggl`, `life-direction`, `vision-plan`,
`scenario-lab`, `programs`, `test-chatbot`, `new-goals`, `pricing`, `exercising`.

### 3b. The `src/` code behind them — per file, never per folder

**This is where the first draft of this plan was dangerously wrong.** Recomputed
per file: of 198 `src/goals` files, **125 are live-reachable (60,780 lines), 71
are lab-only (46,474 lines), 2 are suite-only, and none is reached by nothing.**

**Folders that are 100% lab-only — safe to delete whole. 35 files, 23,408 lines:**

| folder | files | lines |
|---|---|---|
| `src/goals/components/vision-plan` | 2 | 12,248 |
| `src/goals/components/new-goals` | 12 | 4,558 |
| `src/goals/components/change-your-life` | 7 | 2,684 |
| `src/goals/components/life-direction` | 9 | 2,460 |
| `src/goals/components/life-mastery` | 4 | 1,309 |
| `src/goals/components/guide` | 1 | 149 |

**Folders that are MIXED — file-level selection only, never a folder delete:**

| folder | live | lab-only |
|---|---|---|
| `src/goals/components/north-star` | 43 | 0 |
| `src/goals` (slice root services) | 26 | 5 |
| `src/goals/components` (flat) | 26 | 4 |
| `src/goals/data` | 17 | **10 — keep all, see Q9** |
| `src/goals/components/tree-of-life` | 7 | 0 |
| `src/goals/components/views` | **3** | 7 |
| `src/goals/components/setup` | **2** | 9 |
| `src/goals/hooks` | 1 | 1 |

`src/goals/components/views/VisionPlanLab.tsx` — 11,682 lines, the largest file
in the repo, lab-only, **one external import to fix.** `git mv` it; **do not
split it.** Splitting an 11.7k-line screen is a rewrite dressed as cleanup, and
it should wait until you say whether that screen is becoming product or being
retired.

**Three hard constraints:**

1. **A folder with any live file is never deleted as a folder.** `views` and
   `setup` each hold live files reached through `GoalsHubContent`, which the live
   Life Mastery page mounts.
2. **`src/goals/data/` is not in the delete set, whatever the scan says** — ten
   files of corpus-derived research imported by tests of live code. Move
   `lifeMasteryCorpus.ts` (8,868 lines) to `tests/fixtures/`; keep the rest.
3. **Re-derive the list from `npm run smells` after 3a, in this phase.** Deleting
   pages changes the graph; the tables above are evidence, not input.

**Why this is worth more than the line count:** 131 of 323 baselined lint errors
and 88 of 218 unused variables live in `app/test`. Pruning removes **41% of the
lint debt** without editing live code. That is why Phase 6 comes after.

**Procedure, per folder, one commit each:**

1. `git tag lab-before-prune && git push origin lab-before-prune` — once.
2. `git rm -r -- app/test/<folder>`
3. `npm run smells` → which `src/` files just became unreachable.
4. Drop baseline entries for deleted files via
   `node scripts/lint-ratchet.mjs --update` and the typecheck equivalent. **The
   ratchets fail on stale entries** — the behaviour you want, and the step
   easiest to forget.
5. Grep the **20** architecture allowlists for the folder name **by hand**.
   Several filter with `.filter((rel) => fs.existsSync(...))`, so a deleted file
   **silently drops out of the scan** rather than failing — a coverage loss with
   no error.
6. **Gates**, commit.

Group the twelve `goalsv*` folders into one commit if 22 is too many; they are one
decision.

## Phase 4 — Write down the shared-code rule instead of moving the code

**Much smaller than the first draft said** — open question 1 explains why.

**The rule, stated once where it is enforced:**

- Root `components/` — primitives generated by shadcn, owned by no slice.
- `src/shared/components/` — a component one slice owns that **two or more pages
  mount** (`docs/product/map.md:146`'s existing reason for `OfflineShell`).
- `src/shared/` (flat) — helpers two or more slices import.
- A slice's own `components/` — everything else.

**Enforced by `tests/unit/architecture/sharedBoundary.test.ts`:** a file in
`src/shared/` imported by exactly one slice is named; a file in
`src/shared/components/` mounted by exactly one page is named; shrinking
allowlists; `src/db/` exempt, since every slice imports it by design.

**Known findings it will catch, so the start is no surprise:**
`components/ui/markdown.tsx` is lab-only (reached only from `app/test/articles`,
which Phase 3 deletes), and `components/ui/draft-input.tsx` and `stepper.tsx` are
reachable only from the test suite. **Resolve those after Phase 3**, which
changes the answer.

Also: the `"components/**"` globs in `.claude/rules/product-map.md:5` and
`.claude/rules/finished-work.md:7` should be **deleted, not retargeted** — both
files already list `src/**`, so a second glob is itself a stray.

### 4b. One structure document, and it is generated

The repo has no `docs/architecture.md`, and `CLAUDE.md` says to run the test
rather than memorise it. That is right for *rules* and useless for the one
question a newcomer has: **where do I put this file?** I tried answering "where
does a new shared date helper go?" from the existing docs. `src/shared/` holds
`dateUtils.ts`, so the answer exists — and nothing states it. It is also
circular: the file `CLAUDE.md` names is one of ten, and it names none of the
other nine.

**Deliverable:** `docs/architecture.md`, **generated** by
`scripts/smells.mjs --architecture`: the slice list with counts, what a slice may
contain, the four homes above, the dependency direction, and one line per
architecture test across all ten files, naming what it enforces and where its
allowlist lives.

Generated, not written, for the reason this repo knows twice over — the 482
deleted docs, and `map.md:169`.

**Acceptance test:** `tests/unit/docs/architectureDocFresh.test.ts` regenerates it
in memory and asserts byte-equality with disk.

**Gates**, commit per deliverable.

## Phase 5 — Promote `src/goals`'s existing structure to real subslices

**The boundaries already exist.** Of the 136 files in `src/goals/components/`,
only **30 sit directly in it; the other 106 are already grouped in 11
subdirectories** — `north-star` (43), `new-goals` (12), `setup` (11), `views`
(10), `life-direction` (9), `tree-of-life` (7), `change-your-life` (7),
`life-mastery` (4), `vision-plan` (2), `guide` (1). **The job is to promote and
enforce a convention that is ~78% present, not to invent one.** After Phase 3 the
slice is roughly 160 files.

**Subslices need no `docs/product/map.md` edit** — `orientation.test.ts`'s
`readdirSync` is non-recursive. Verified.

```
src/goals/
  types.ts                 (stays — 122 importers; re-exports subslice types)
  index.ts                 (new — the public surface, 44 of 197 files today)
  north-star/              components/north-star + the services only it uses
  hub/                     GoalsHubContent + views/ + tree-of-life/ (LIVE)
  plan/                    lifePlan*, visionPlan*, horizonService, oneThing*
  catalogue/               data/ (goalShapes, lifeAreas, goalCategories, goalGraph)
  achievements/            badgeEngineService, goalAchievementsService
  (slice root)             goalsService, goalHierarchyService, goalTriageService…
```

Note `hub/`: the live Life Mastery screen mounts the old goals hub, so
`GoalsHubContent`, three of `views/` and all of `tree-of-life/` are live code and
belong in a named live subslice rather than looking like lab leftovers. That
mislabelling is what nearly got them deleted.

**Order, and why:**

1. **`tree-of-life/`** — 7 files, imported from nowhere outside `goals`. Zero
   external blast radius. The rehearsal: if the mechanics are wrong they are
   wrong on 7 files, not 43.
2. **`catalogue/`** — widely imported but pure data with no component
   dependencies, so the rewrite is mechanical. **Carries the research files from
   open question 9 — move, never delete.**
3. **`achievements/`** — 2 services; `goalAchievementsService` is public, so it
   exercises the `index.ts` surface.
4. **`hub/`** — the live hub, including the file-level split of `views/`.
5. **`north-star/`** — 43 files, the live Life Mastery feature. Highest value and
   risk; full gates plus the route sweep.
6. **`plan/`**, then **`types.ts`** last or not at all (open question 7). Each
   subslice's own `types.ts` is automatically exempt from the type-export rule, so
   this is where the 77 violations shrink and `goals` can finally join the
   `slices` array.

**Per step:** `git mv`; rewrite specifiers by **matching specifier positions,
never a bare `sed`** (a blind `s|@/goals/|…|g` also rewrites every allowlist
string and comment, and the hit list is wider than it looks — it includes a regex
literal at `src/shared/iconRoles.ts:192`); update the architecture allowlists
naming moved paths; **Gates**; one commit.

**Do not move the 96 files in `tests/unit/goals/`.** Nothing enforces test-file
location — no test maps a test path to a slice path, and `.claude/rules/testing.md`
says nothing about it. They are found by name, and moving them doubles the diff on
every phase and loses `git log --follow` on the files that record why each rule
exists. If you want the mirror, do it as a single final step of 96 pure renames.

**Acceptance test:** after each step `npm run smells` shows the coupling matrix
unchanged. Subslicing must create no new cross-slice edge; if the count moves, a
specifier went to the wrong target.

**Which other slices need this:** `programs` (66), `tracking` (58) and `db` (47)
are large enough to argue about and small enough to leave. `goals` is 198. **Do
`goals` only**, then re-measure.

## Phase 6 — Burn the baselines down

Only now, because Phase 3 deleted 41% of it for free.

`eslint-baseline.json`, 323 errors:

| | all | of which unused-vars |
|---|---|---|
| `app/test/` | 131 | 88 |
| live code | 120 | 78 |
| `tests/` | 46 | 40 |
| `scripts/` | 25 | 12 |

**Order, each group one reviewable commit:**

1. **7 `react-hooks/rules-of-hooks` first, ahead of everything.** A conditional
   hook is the crash this repo has shipped twice — "Rendered more hooks than
   during the previous render", which reaches a person as "This page could not
   load." Live defects, not cleanup. **Open each page to confirm.**
2. **117 unused imports across 79 files.** Pure deletions; `tsc` and the build
   prove it. The cheapest win in the plan. `eslint --fix` handles most — **review
   the diff**, because a side-effect import (`import './polyfill'`) is not an
   unused import and deleting it changes behaviour silently. That is the same
   blind spot that hid `goalsStepTour.css`.
3. **80 dead locals.** Read each: a dead local is sometimes the *symptom* — a
   computed value nobody uses because the line that should use it was dropped.
4. **57 `no-unused-expressions`.** Not noise: an expression statement with no
   effect is usually a dropped assignment or a missing call. Expect a real bug.
5. **27 `no-explicit-any`**, then the 12 singletons.

**Unused function parameters:** `typescript-eslint`'s recommended config uses
`args: 'after-used'`, so a trailing unused parameter is already inside the 218 —
there is no separate hidden pool. A *leading* unused parameter is not reported, by
design, because removing it changes the signature. Leave those.

**The 618 dead exports**, after the Phase 7 ratchet exists and not before —
otherwise you pay 476 edits and buy no guarantee, and the count regrows:

- **142 used nowhere** — delete.
- **476 used only in their own file** — drop the `export` keyword. ~150 files,
  one commit per slice. **`src/db` first** (65 findings, no JSX, the slice the
  architecture test guards hardest), **`src/goals` last** (232, heavily
  overlapping the lab cascade, so Phase 3 does some for free).
- **96 in lab-only files** — skip; Phase 3 deletes them.

Risk is low: **there are no `export *` barrels in `src/`, `components/` or
`lib/`**, so `tsc` catches any name the scan misjudged, by name.

`tsc-baseline.json`, 98 errors: 31 live, 30 `scripts/`, 27 `tests/`, 10
`app/test/`. **12 are `TS1378`** (top-level `await`) — one `tsconfig` decision,
not 12 fixes, but changing `module`/`target` affects every file, so it is its own
commit with full gates.

**Acceptance test:** both ratchets after each commit; the baseline total strictly
falls.

## Phase 7 — The tests that stop it coming back

One per smell class, each with a starting number written into it.

1. **`the slice list is the directory listing`** — Phase 1a. *0 gaps (today 10 of 18).*
2. **`the map names nothing that does not exist`** — Phase 1d. *Starts at 0.*
3. **`no new top-level directory`** — a shrinking allowlist of what may sit at the
   repo root, so the next `new_new_clean_attempt/` fails on arrival instead of
   being found seven months later.
4. **`sharedBoundary`** — Phase 4.
5. **`app/test/LABS.md` covers every lab route** — open question 2. *0 after Phase 3.*
6. **`the lab has a half-life`** — lists folders with no commit in six months.
   **Reports, does not fail.** A test that fails on the calendar fails on a day
   you did nothing wrong, and a gate that goes red by itself is the
   492-lint-error story again.
7. **`no file is reachable only from the lab`** — shrinking allowlist, **per file
   and matching side-effect imports.**
8. **The dead-export ratchet** — open question 8. *Starts at 618, or what Phase 6
   leaves.*
9. **`every plan has a Status line`** — open question 6's vocabulary across all
   20 files. **Whoever lands it must know it will immediately flag the two plans
   written during this session**, which is the test working.
10. **`the architecture doc is freshly generated`** — Phase 4.
11. **`the request-time data directories exist`** — Phase 2c, written *before*
    `data/` is touched, covering both `prompts` and `diagnostics`.
12. **`cleanup:check`** — `git branch --merged HEAD` minus `main` and current,
    `git worktree list`, `git stash list` read-only. Wired into the **Stop hook
    with `|| true`**, not into `npm run ci` and not into the end-of-turn
    checklist: it is never.py's own argument, that a sentence read at session
    start is ancient history by the time the moment arrives. Coordinate with
    whoever currently owns `tests/unit/hooks/hookCommandPaths.test.ts`.

**What none of these can do**, said plainly because the budget test says the same
about itself: they check the shape, never the judgement. A test can tell you
`src/shared/x.ts` has one importer. It cannot tell you whether the second is
arriving next week. And `map.md:169` is the standing proof that a true-sounding
sentence survives 6,634 passing tests.

---

## Appendix — every measurement, and how to re-run it

| claim | command |
|---|---|
| reachability 544/77/6/2 | `node scripts/smells.mjs` (Phase 0) |
| `src/goals` 125 live / 71 lab-only | the per-file walk, matching side-effect imports |
| `app/test` 280 files, 104,535 lines, 63 routes, 43 entries | `git ls-files app/test \| wc -l`; `git ls-files 'app/test/**/page.tsx' \| wc -l` |
| 220 files / 95,643 lines ≥6mo | `for d in app/test/*/; do git log -1 --format=%as -- "$d"; done` |
| 323 lint errors, 218 unused-vars | `npm run lint:ratchet`; group `eslint-baseline.json` by rule |
| 117 unused imports / 79 files | match each baselined name against an `^import` line in its file |
| 618 dead exports, 142/476/96 | `node scripts/smells.mjs` dead-export section |
| 98 type errors | `node scripts/typecheck-ratchet.mjs` (**not** `tsc`, which never exits 0) |
| 138 hidden type-export violations (77 in `goals`) | run `Slice Structure` with `slices = readdirSync('src')` |
| 23 feature edges, 100 statements, 41 `db →` | the slice matrix in `scripts/smells.mjs` |
| 65 tests + 20 allowlists in one file; 10 files / 111 tests total | `grep -c "^\s*test(" tests/unit/architecture.test.ts`; `npx vitest run tests/unit/architecture*` |
| budgets 387/2709/948/416 | `npx vitest run tests/unit/docs/instructionBudget.test.ts` |
| the build catches a bad import | write a probe importing a nonexistent module, build, delete it |
| `main` is 421 behind the trunk | `git rev-list --left-right --count main...training-rebuild` |
| `git branch -d` is unsafe here | it checks the branch's upstream, not `HEAD` |
