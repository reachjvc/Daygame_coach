# Quit tools, copied from the best: one phase per tool

Written 2026-11-18 (Opus, planning session). Status: **plan written; not started.**

## Why this plan exists

On 2026-11-18 the owner looked at the wave-1 quit tools (`Plans/quit-tool.md`, built and hidden on main) and said
he could not picture them, and feared they were "really small versions of what the competitors offer, instead of
taking the best of all competitors". That was mostly true: the research listed the best ideas from about 20
competitors, but no tool was built by first copying a competitor's version in full. His instruction, word for word
in substance:

- Each phase is about **one tool**, and must be executable by a lesser model.
- **Fully copy** the competitor's version of that tool. If several competitors have it, **copy all of them**.
- Then **improve** on it, designed in our styling.
- Copies keep the competitor's addiction (an alcohol app's tool is copied for alcohol). The improved version may
  then get a version per addiction.
- Run all phases in one go, then send him **one page** where he sees each tool in each of its variants and marks
  what he likes and doesn't.

This plan replaces the "ship wave 1" step of `Plans/quit-tool.md` Phase 7: which variant ships per tool is decided
by his marks. The wave-1 build stays as the variant **"current"** of each tool, and everything it proved (checked
nicotine content, the validator, privacy and coaching pages, the audit fixes) is reused.

## What "copy" means here (the line we hold)

- **Copied 1:1:** what each screen does, the order of screens, every control, every state, how many taps, what is
  asked, what is shown after, timings, sounds and vibration, what is saved. Ideas, methods and flows are free to
  copy.
- **Not copied:** their words, art, icons, photos, audio and brand. Our copy says the same things in our words, in
  our styling (the app's dark theme and components). Words, art and recordings are protected; several of their
  terms of service also forbid copying content (census Table 2b).
- **Only public material is used**: store screenshots and listings, product websites, help-centre articles and
  their images, public YouTube walkthroughs (frames), reviews, and the 660 funnel screenshots taken in the earlier
  research. **No sign-ups, no trials, no purchases** (Part 5 of `quit-tool.md`; several ToS ban competitor study from
  an account). Where a screen was never seen, its spec says "inferred" and the review page says so.
- **The repo is public:** no competitor name, screenshot, quote or logo goes into the repo. Variants have neutral ids
  (`a`, `b`, `c` …); the id-to-product map lives only in `~/.cache/daygame-research/quit-copy/variants.json`. The
  owner's review page is private and may show their screenshots next to ours.

## Owner-only items (asked once, in the message that hands over this plan)

1. **The Vercel account that owns the live site.** The login approved on 2026-11-18 (`reachjvc-1930`) sees only an
   old project `v0-ai-daygame-coach`; `daygame-coach.vercel.app` is under another account. Needed to read the live
   crash (see B1) so he can try every variant on his phone.
2. **The privacy contact email** (still open from `quit-tool.md`): needed only when a tool goes public.
3. **Optional:** buying one or two paid apps to screen-record. Not needed; public material covers every tool here.

## BLOCKERS (each tried once on 2026-11-18)

| ID | What | Attempted, and what it returned | Blocks | Recommendation |
|---|---|---|---|---|
| B1 | Live site answers 500 on `/` and every `/quit` page (`/privacy`, `/auth/login` are 200) | `curl` on build 134d39d1: `/`, `/quit`, `/quit/nicotine?preview=1`, `/quit/coaching` → 500. Same as `first-1000.md` B1 (Vercel only; local production builds give 200). `vercel login` done; `vercel inspect daygame-coach.vercel.app` → "Can't find the deployment … under reachjvc-1930s-projects" | "Try it" links on the review page | Owner item 1, then Phase 0 reads the function log and fixes it |
| B2 | Competitor material behind accounts | Census Table 2b: This Naked Mind, Flamy, Reframe, QuitSure, Sunnyside, Relay ban copying or competitor use; Brainbuddy bans scripted capture | Screens never shown publicly | Public material only; mark unseen screens "inferred" |
| B3 | Repo is public | Memory `repo-is-public`; `quit-tool.md` Part 5 | Names, shots, quotes in commits | Neutral variant ids; private map and shots in `~/.cache/daygame-research/quit-copy/` |
| B4 | Next.js 16.4.1 security advisory stops `next build` / `next dev` once | Seen in every build today; a rerun continues | Nothing (rerun) | Owner decides on the upgrade separately; builders rerun, never upgrade |

## OPEN QUESTIONS (decided, with a reason; the owner may veto)

| Question | Decision | Alternative | Cost if wrong |
|---|---|---|---|
| Q1 How many competitors per tool | Up to **5 copies per tool**: the products with the most store reviews **that have enough public screens to copy screen by screen**. Every other product with the tool is listed, and its one best unique piece goes into the improved version | All of them (the SOS button alone is in 18 products) | 18 copies of one button triples the time and the review page; the unique bits still reach him through "improved" |
| Q2 Tools not copied now | Community feed, AI chat coach, app/site blockers | Copy them too | Feed needs moderation; AI coaches are the worst-rated feature (75,000-review study); blockers matter for porn, phone and gambling, not nicotine. Each can get its own phase later |
| Q3 Order | Phases 1–4 first (SOS, progress, health timeline, quit date) so the 20 Dec release can use his picks for those | Census order | The four most-used tools land first |
| Q4 Copies need an account? | No. Every copy keeps its data in the browser (`quit-lab-v1`), even where the original needs an account | Build accounts | Faster; the improved version decides accounts later |
| Q5 Addiction of the improved version | Built from the addiction data files (`src/quit/data/<id>.json`), filled for nicotine; other addictions render where their content exists and say "content coming" where it doesn't | One version per addiction now | Content for weed/porn/alcohol is `quit-tool.md` Phase 10 |
| Q6 Where variants live | `/quit/lab/<tool>/<variant>` (public address, hidden: `?preview=1` like nicotine, `noindex`) so he can open them on his phone | Under `/test` (404 in production) | He couldn't try them |

---

## PHASES

Models (owner, 2026-11-18): Opus plans, writes each phase brief, reviews specs and diffs, and fact-checks numbers;
**Sonnet** researches and builds; **Haiku** runs mechanical checks. Every build runs in a git worktree and is
fast-forwarded to `main` when its checks pass; nothing in the lab is reachable without `?preview=1`.

### Phase 0: setup — Opus brief, Sonnet build

1. **B1 fix** (after owner item 1): read the Vercel function log for `/` and `/quit`; fix the cause; confirm `/`,
   `/quit?preview=1` answer 200 on the live site.
2. **Lab frame:** `app/quit/lab/[tool]/[variant]/page.tsx`, `src/quit/lab/registry.ts` (`{tool: {variant: {component,
   addiction, label}}}` with neutral labels), `src/quit/lab/store.ts` (`quit-lab-v1`, same rules as `quit-v1`), a lab
   index `/quit/lab` listing tools and variants (preview only), `robots` noindex, unit test that every registry entry
   renders and that production without `?preview=1` answers 404.
3. **Research kit** in `~/.cache/daygame-research/quit-copy/`: `variants.json` (private id map), `kit/` scripts:
   store-listing screenshot fetch (reuse `quit-tool/census/scripts/gp.py`, `iap.py`), YouTube frame grabs
   (`yt-dlp` + `ffmpeg`, one frame per scene change, never committed), and the spec template below.
4. **Variant "current":** register each wave-1 tool as variant `current` of its tool.

Acceptance: lab index and one dummy variant open on the live site with `?preview=1`; tests, typecheck ratchet green.

### The tool phase recipe (Phases 1–13 all follow it)

**Step A — research (Sonnet, read-only).** Folder `~/.cache/daygame-research/quit-copy/<tool>/`.
1. List every product that has this tool: start from the census rows named in the phase table
   (`~/.cache/daygame-research/quit-tool/feature-census.md` Table 1 and Table 3 for product codes), then one web search
   for current top apps with it that the census missed.
2. For each, record store review count and what public material exists; pick up to 5 (Q1). Write `candidates.md`.
3. For each picked product, gather every public screen of the tool: store screenshots, website and help-centre
   images, YouTube walkthrough frames, the earlier funnel shots (`~/.cache/daygame-research/one-pagers-v2/research/
   funnel-walk-shots/`, `quit-tool/census/shots/`, `census/store/`). Save under `<tool>/<letter>/shots/`.
4. Write `<tool>/<letter>/spec.md` from the template: product (private), addiction, where the tool is reached from;
   **every screen in order**, each marked `seen` (with the shot file) or `inferred` (with why); per screen: layout top
   to bottom, every element and control, every state (empty, filled, error, done), what each tap does, timings,
   sounds, vibration, animation, what is stored; the text **summarised in plain English** (never copied); numbers
   it shows and whether it gives a source; what users praise and complain about (from
   `quit-tool/loved-features.csv`, filtered on this product and tool).
5. Write `<tool>/overlap.md`: elements all or most copies share; each copy's best unique piece; the other products'
   unique pieces (Q1).

**Step B — spec review (Opus, the planning session).** Check each spec against its shots: a screen claimed `seen`
must have its shot; nothing invented without `inferred`; enough detail that a builder decides nothing. Send back
with exact gaps (at most two rounds).

**Step C — copies (Sonnet, worktree).** One variant per spec at `/quit/lab/<tool>/<letter>`, in
`src/quit/lab/<tool>/<letter>/`: screen for screen, control for control, same order, same states, same taps; the
original's addiction; our tokens and components; our words (each line rewritten from the spec's summary, never
from a screenshot); data in `quit-lab-v1`; numbers it shows: only where our data file has a checked figure for the
same thing, else the copy shows the same element with a visible "number not sourced yet" placeholder (we never
repeat an unsourced competitor number). No competitor name or art anywhere in the repo. Each copy gets one e2e
spec that walks every screen of its spec in order.

**Step D — improved (Opus brief, Sonnet build).** Variant `best` at `/quit/lab/<tool>/best`: everything most copies
share, the best unique piece of each, plus our rules (`quit-tool.md` Part 5 and the RULEBOOK: every number with its
basis and source, no forum shares as measures, no streak that resets to zero, no screening, no cheering, no
founder "I", phone first). Built from `src/quit/data/<addiction>.json` with an addiction switcher (Q5). New content
is written by Sonnet and every new number or claim is fact-checked by an Opus subagent before merge.

**Step E — checks (Haiku).** Screenshot every screen of every variant at 390×844, dark, into
`~/.cache/daygame-research/quit-copy/<tool>/shots-ours/<letter>/`; tick each spec screen as present or missing;
check no horizontal scroll; grep the diff for any product name in `variants.json`. Missing screens go back to Step C.

**Step F — merge.** Opus reads the diff and the checks; vitest, typecheck ratchet, e2e for the tool on phone and
desktop; fast-forward `main`, push, update this file's status line.

### Phases 1–13

| Phase | Tool | Census rows (Table 1) | Our current variant | Notes for the brief |
|---|---|---|---|---|
| 1 | **Craving SOS** | 12 SOS button, 14 breathing, 15 distraction games, 19 help matched to state | `sos` | Each copy keeps its own breathing/game; no copy promises how long a craving lasts unless the original does (then our copy shows "not sourced") |
| 2 | **Progress home** (clean time, money saved, units not used, time regained, badges, total days + best streak) | 1, 2, 4, 5, 6, 79 | none (wave 3 `record`) | Our improved version keeps "never resets" (total clear days + best run) |
| 3 | **Health and withdrawal timeline** | 86 health-recovery timeline, 8 calendar of days | `symptoms` | Improved version uses `symptomCourse` (study timing) and the curve mock v2 ideas; his notes on that mock feed this phase |
| 4 | **Quit date and plan** | 50 quit date and method, finite goal, goal type | none (`curve` held) | Near date first (evidence); his "days or weeks" wording stays |
| 5 | **Belief test** | 45 belief/fear quiz | `beliefs` | Public material: Allen Carr's public quiz and funnel shots, Reframe funnel shots, QuitSure store shots |
| 6 | **Daily check-in** (pledge, difficulty, mood, journal) | 32 daily check-in, journal, mood tracker | none (wave 3 `checkin`) | |
| 7 | **Craving and slip diary + trigger chart** | 10 craving/slip log, 26 trigger chart | `slip` | |
| 8 | **Daily lesson program** | 39 daily lesson program, 53 real-life missions, quote/tip of the day | none (wave 3 `lesson`) | Copy the program's shell and delivery with 3 sample lessons each; lesson content later, clean-room (owner note) |
| 9 | **Cost calculator and savings goal** | 2 money saved (input side), 3 savings goal | `cost` | |
| 10 | **Past attempts** | the census "rare" list item 1 (Relay, QuitSure, Quitzilla, EasyQuit, Flamy) | `past` | |
| 11 | **If-then and relapse-prevention plan** | the "paid-only small tools" (if-then, three circles, letter to self) | none (wave 2 `ifthen`) | |
| 12 | **Accountability partner and stake** | 65 accountability partner, deposit contracts | none (wave 2 `tell`, `stake`) | The site never holds money (unchanged) |
| 13 | **Library and what helps** | 41 article/video library | `how` (+ wave 2 `besides`) | |

### Phase 14: the review page — Opus

One private artifact, linked in chat, never opened on his screen. Per tool, in phase order: the improved version
first, then each copy, then "current". Per variant: a strip of our phone screens; beside each copy, the
competitor's public screens it was copied from (private page only) and "seen / inferred"; a "Try it on your phone"
link (`/quit/lab/<tool>/<variant>?preview=1`, live site); and, always visible, 👍, 👎 and a note box with Save,
a green Saved badge and his earlier notes (memory `review-boards-note-log`). Top of the page: three lines on what
was copied and what wasn't (the line above). Untouched variants count as "no opinion", not as a yes, because here he
is choosing between variants. db collections `likes`, `dislikes`, `notes`, keyed `<tool>/<variant>`.

Acceptance: every variant of every tool on the page, every "try it" link answers 200 on the live site, one read of
each db collection works.

### After his marks (not part of this run)

Per tool, the planning session writes a one-line decision from his marks (which variant ships, what to merge in)
and `Plans/quit-tool.md` takes over again for content, accounts and the public release.

---

## Part 5: ground rules for the build sessions

Everything in `Plans/quit-tool.md` Part 5 applies, plus:

- Copy flows, never words or art; never sign up, start a trial or buy anything; public material only.
- No competitor name, quote, screenshot or logo in any committed file, commit message or test name.
- Unseen screens are `inferred`, never guessed silently.
- A competitor's number is never shown as ours: show our checked figure or a "not sourced yet" placeholder.
- One heavy command at a time; stop dev servers before the typecheck; never `pkill -f`; never `test-stack.mjs up`
  (use `~/.cache/daygame-research/quit-tool/stack-env.json`). Memory: `worktree-e2e-servers`,
  `shared-checkout-tool-quirks`.
- A `next build` that stops with the Next.js security notice is simply run again; never upgrade.
- Questions a builder can't settle go in its report, never into this file; the planning session answers them.

## The one prompt to run it all

Start in the project folder with `claude --model opus` and paste:

> /goal Execute Plans/quit-copy.md, Phases 0 to 14, in one run. You are the planner and reviewer only: write each
> phase's brief into the plan before it starts, then hand ALL research and building to subagents with model "sonnet"
> (building with isolation "worktree"), all fact-checking of numbers and claims to subagents with model "opus", and
> mechanical checks (screenshots against the spec, tests, typecheck ratchet, name greps) to subagents with model
> "haiku". Do not write app code yourself. Follow the tool phase recipe (Steps A–F) exactly for Phases 1–13; run at
> most three agents at once and check `free -g` before starting a build. After each phase: read the specs, the diff
> and the check results, send work back with exact fixes if anything fails, then fast-forward main, push, and update
> the status line at the top of the plan. If Phase 0's live-site fix is blocked on the owner's Vercel account, do
> the rest of Phase 0 and continue; the review page then says which "try it" links wait for that fix. Stop only for
> an acceptance check still failing after two fix rounds. End with Phase 14: post the review page link in chat and a
> short plain-words report (done / not yet, what he needs to do).
