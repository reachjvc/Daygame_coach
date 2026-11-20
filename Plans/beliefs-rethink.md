# Beliefs tool, rethought: walk the real products, copy them to learn, then build our own

Written 2026-11-20 (Opus, planning session). Status: **proposed**. Nothing here is decided until the owner says so.
Phase 0 and Phase 1 started 2026-11-20 on his word "you can begin your work by using the throwaways".

## In plain words

You found the current belief tools hollow. The earlier copies were built from store screenshots and other people's
screen shots, so they copied the look but not what it feels like to go through the thing. This time:

1. One agent per product goes through the **real** product from start to end, like a new user, on a phone-size
   screen. It uses a throwaway email inbox where the product wants an email, and keeps going for the days the
   product keeps sending things. It records **every** screen, every button, every answer path, every error, and
   every email.
2. From that record, an agent builds a **study copy** that works the same way. Study copies are only for learning.
   They never go on the site. You can open each one on a private page next to the real screens.
3. You look at the copies, mark what works on you and what doesn't (👍 and notes that save as you type).
4. Then we build **one original belief tool** for the site. It starts from the copy you liked best and
   takes over the best part of each of the others. Each change from that copy is put to you as one plain
   question: keep or change.

All five walks run at the same time; so do the five copies.

## The five products (proposed set, codes only: the repo is public)

Names, links and probe results are in the private file
`~/.cache/daygame-research/quit-copy/beliefs/rethink/products.md`.

| Code | What it is | How the walk reaches it (tried 2026-11-20) |
|---|---|---|
| r1 | Free web quiz from a stop-smoking seminar company: 9 beliefs rated 1–5, 6 fact questions, a rebuttal of each answer by email, then a 6-part email video series | Web, headless browser. Walked once on 2026-11-14 with a throwaway inbox; this walk fills the gaps (the details step, the conditional questions, error states, the full email series over 7 days, the alcohol version) |
| r2 | Free web tool for challenging negative thoughts: a 7-column thought record for addiction | **Site gone** (blocker B1). Proposed stand-in: a free web belief-disputing tool from a peer-support recovery group (in the private file) |
| r3 | A named teacher's 4-question method for questioning one stressful belief, with "turnarounds"; free worksheets, plus a guided phone app ($0.99 one-time on Android, no in-app purchases) | Web pages and the free worksheets now; the app only if you buy it (Q1) |
| r4 | Thought diary apps: one open-source (GPL, has a web version), one large paid-tier iPhone app | Open-source one: walked in the browser and read in its code for every state. iPhone one: store screens, reviews and public videos only (no Android version exists) |
| r5 | A 7-day phone course that "puts each belief on trial" (belief inventory, belief vs reality journal; you keep smoking until day 7) | Its web quiz in the browser; the app on the Android emulator (install route: B3). First 3 modules are free; paid modules only if you say so (Q4) |

Also found, not walked this round: four bigger apps where beliefs are one part of a course. Two of them were copied
in the earlier round (`Plans/quit-copy.md` Phase 5, copies `a` and `c`).

## How others do this now (researched 2026-11-20)

Checked in sources today:
- Teardowns record **one journey from entry to first real value, screen by screen**, with each screen tagged by the
  actions it demands (tap, type, scroll, wait) and timed, so effort can be counted and compared
  (LogRocket and UserGuiding teardown guides, a design-bootcamp "benchmarking user journey" post).
- AI agents drive a real browser through MCP tools (navigate, click, snapshot) and decide the next step from
  the page state. Playwright now ships a planner agent that crawls pages and maps flows (vendor blogs, not
  independent).
- AI cloning workflows split the work into **screenshotter → extractor (spec) → builder → QA reviewer**, with a
  screenshot-diff loop capped at about 5 rounds (Claude Code skills "Pixel-Perfect Website Cloner", "ui-cloner";
  plugins ui-loop and design-loop). Their "pixel-perfect" claims are marketing; nobody showed a benchmark.

From memory (not checked today): flow libraries such as Mobbin store whole flows, not single screens;
good teardowns also capture empty, error and permission states, not just the happy path.

What we take over: one journey per product, every screen tagged with actions and time, a separate spec step,
a capped screenshot-compare loop, and a separate reviewer whose only job is "is this the same as the real thing".
What we add (from our own past mistakes, memory `clone-from-the-real-product`): the reviewer also checks
whether a first-time user can find each feature, and the copy must **work** (scores, emails turned into on-page
results, timers), not just look right.

## OWNER ITEMS (only he decides)

| # | Item | Status |
|---|---|---|
| O1 | Throwaway email inboxes for walks | **Yes**, 2026-11-20 ("you can begin your work by using the throwaways") |
| O2 | Buy r3's app ($0.99 one-time) | **No**, 2026-11-20 ("I would prefer to not have to pay for any apps") |
| O3 | Pay for r5's paid modules | **No**, 2026-11-20 (same words) |
| O4 | He walks apps or submits forms himself | **No**, 2026-11-20 ("i prefer" that Claude gets "very close to the real apps. From pictures, youtube walkthroughs, creating throwaway emails or whatever"; he judges the copies, not the real apps) |

## BLOCKERS (each tried once on 2026-11-20)

| ID | What | Attempted, and what it returned | Blocks | Recommendation |
|---|---|---|---|---|
| B1 | r2's site is gone | Its address does not exist any more (DNS "no such name" from two resolvers, fetch fails, no web-archive copy). The parent site is up but lists no recovery tools | Walking r2 | Retry once in Phase 0; if still gone, walk the stand-in named in the private file (Q2) |
| B2 | r1's quiz is hidden on phones | The 2026-11-14 walk found a script error hides the quiz form on a phone screen; it unhid it with one style change. Today: plain download refused (bot wall), headless browser loads the page | Nothing (walk as before) | Record the broken state as a screen (it is what real phone users see), then unhide and continue |
| B3 | Installing phone-only apps on the emulator (r5's app; also the free Android apps of r2's stand-in and r4's large diary app) | Tried 2026-11-20: five download mirrors (bot check failed on one, two answer "not found", one a 403, one does not list it); a throwaway Google account on the emulator reached Google's form, then **Google demanded a phone number** (stopped, no account made) | Every in-app screen of those three apps | Q7 |
| B4 | r4's iPhone app and r3's app cannot run here | No Android version of the iPhone app on Play; the emulator is Android | Walking those apps | Store screens, reviews, public walkthrough videos; marked "inferred" where unseen (r3: Q1) |
| B5 | Terms of use | The earlier census found several of these companies forbid copying or competitor study from an account | Nothing technical | Owner said yes to throwaways (O1). Copies stay private and are never shipped; our own tool uses our words and drawings |
| B6 | Main is red (not this plan) | Unit tests fail since 4c5431e1 (plan-versions work, 2026-11-20 08:02) | Only commits of code; this plan changes no code until Phase 6 | That session fixes it; Phase 6 checks main is green first |

## OPEN QUESTIONS (each with a recommendation; all proposed)

| Question | Recommendation | Alternative | Cost if wrong |
|---|---|---|---|
| Q1 Buy r3's app ($0.99, one-time)? | **Answered no** (O2). Was: **Yes**: you buy it on your phone and screen-record one full session (about 10 min). The free worksheets hold the method, but the app is the only guided, one-screen-at-a-time version, which is what our tool would be | No: worksheets + store screens only, app screens marked "inferred" | Without it the copy guesses the guided flow, the part that matters most |
| Q2 r2 is gone: use the stand-in? | **Yes**: the peer-support group's free belief-disputing tool is addiction-specific and public | Drop r2, walk 4 | One fewer way of arguing with a belief to learn from |
| Q3 r4's iPhone app from store screens only? | **Yes**, the open-source one is walked fully and does the same job | Borrow an iPhone | Its paid-tier screens stay "inferred" |
| Q4 r5's paid modules | **Answered no** (O3). Was: Walk the free 3 modules first, then report the price; you decide then | Buy now | Days 2–7 copied from the site, blog and store screens only |
| Q5 Where study copies live | **Private pages only** (one page per product: working copy beside the real screens). Never on the live site | Hidden lab pages on the site (`/quit/lab`, as in the earlier round) | Lab pages are public addresses on the live site; you said copies are not shipped |
| Q7 Three free Android apps cannot be installed here (B3) | **Answered no** (O4): Claude finds another route (Phase 1b). Was: **You install the three free apps on your phone** and screen-record the free part of each (r5's Day 1, about 40 min; the two others about 5–10 min each), then drop the videos where Claude can read them. No payment: stop at any price screen | You sign your own Google account into the emulator yourself (Claude never sees the password) | Without either, those apps are copied from store screens and the site only, the same "hollow" problem as before |
| Q8 (**answered no**, O4: Claude retries itself, Phase 1b) r1's "I'm not a robot" box now gives a picture puzzle (2026-11-20; it passed with one click on 2026-11-14), so the walk could not submit and the email series was not received | **You submit the quiz once on your phone** (about 3 min) with the throwaway address Claude gives you; Claude then collects the result email and the series for 7 days | Use the 2026-11-14 walk's saved email text only (text, no layout; episodes 2–6 timing unknown) | The copy's result screen and email series stay partly guessed |
| Q6 The current belief tool and the earlier copies | **Keep untouched** until you say otherwise | Remove | None; nothing is removed without your word |

## PHASES

Model per phase (memory `big-plans-small-builds`): walks, builds and checks on Sonnet; specs, comparisons, the
original tool's design and review gates on Opus; mechanical checks on Haiku. Before every phase with several agents,
run `~/.cache/daygame-research/tools/load.sh`: ok → all 5 in parallel; busy → 4; game → 1.

Work folder (private): `~/.cache/daygame-research/quit-copy/beliefs/rethink/<code>/`.

### Phase 0: set-up and blockers (Opus, this session) — done 2026-11-20
- Throwaway mail.tm inboxes in `<code>/inbox.json` for r1, r3, r5 (the products that ask an email; mail.tm
  refused more with "too many requests"). Persona "Alex" (private file).
- `rethink/poll.py [code]` saves every new email as `.eml`; run it daily for 7 days after each walk.
- B1 retried: still "no such name". r2 walks the stand-in (Q2 recommendation; reversible).
- B3's install route is tried by r5's walker at the start of its walk.

### Phase 1: walk every product (5 × Sonnet in parallel) — depends on Phase 0 — walked 2026-11-20

Result 2026-11-20 (details in each private `<code>/walk.md`):
- r1: 30 screens / 93 shots, smoking and alcohol forms, every branch and error; **not submitted** (picture puzzle, Q8).
- r2: stand-in walked; it has no web form, only read-only pages and fill-in worksheets (12 downloaded, 4 filled).
  Its free phone app is the only interactive version (B3, Q7).
- r3: 42 screens (site, every modal, 10 worksheets, method step by step); app only from 5 store screens (Q1).
- r4: 56 screens; the open-source diary walked fully and checked against its code; the large diary app from
  10 store screens; it does have an Android app after all (B3, Q7).
- r5: site and its 5-question quiz walked (23 answer variations); the app could not be installed (B3, Q7).

Each walker owns one code and writes only in its own folder:
- `shots/NN-<slug>.png`: every screen at 390×844 (phone first), plus 1280×800 where the layout changes.
- `flow.json`: one entry per screen `{ id, url, title, text (all visible words), controls: [{ label, kind, required,
  options }], actions: ["tap"|"type"|"scroll"|"wait"], seconds, next: { "<choice>": "<screen id>" }, seen: true|false }`.
- Every branch: each answer that changes what comes next, Back, empty submit (error text), and the "none apply"
  answer. Every email, saved as `.eml` with arrival time, and every link in it followed once.
- Walks that send emails over days (r1, r5) check the inbox each day for 7 days (a scheduled check).
- `walk.md`: the journey in order, timings, what felt good or bad as a first-time user, and a "not seen" list.
- r4's open-source app: also read the code (`git clone` into its own folder, never run its scripts) for states the
  walk cannot reach; mark those `seen: "code"`.
- r5 on the emulator: `~/.cache/daygame-research/alpha/phone.sh boot`, screenshots via `adb exec-out screencap -p`,
  **`phone.sh stop` when done**.
- Done when: a Haiku checker confirms every `flow.json` screen has a shot, every `next` points at a real screen,
  and every control has its options. Gaps go in "not seen", never filled by guessing.

### Phase 1b: close the gaps without the owner (Sonnet; Opus checks) — after his 2026-11-20 answer (O2–O4)
No purchases, nothing for him to do. Proposed routes, each tried once and written in the private `<code>/walk.md`:
- **Free Android apps (r5 Day 1, r2's stand-in app, r4's large diary app):** install the open-source Aurora Store
  (from F-Droid) on the emulator and use its anonymous sign-in, which downloads free Play apps without a Google
  account; or a mirror reached from a headed browser on the hidden screen. Walk each free part fully; stop at any
  price screen.
- **r1's picture puzzle:** one retry from a headed browser on the hidden screen with a throwaway inbox. No
  puzzle-solving services. If it still asks for a puzzle, use the 2026-11-14 saved emails.
- **r3's paid app and r4's iPhone app:** never bought or pirated. Rebuilt from store screens, every public
  review that describes a screen, and any public screen-recording video (YouTube, TikTok, Reddit), frames taken
  per screen change. Unseen screens marked "inferred" with what they are inferred from.
- Then Phases 2–3 for each product that gained screens, and the copies go on the Phase 4 page.

### Phase 2: spec each copy (Opus, one per product, in parallel) — depends on Phase 1 for that product
- `<code>/spec.md`: screen by screen, what the copy shows and does, in our words (their words, drawings and brand
  are redrawn, not lifted); every rule (scores, which rebuttal shows for which answer, timers, day gating);
  emails turned into the on-page or timed equivalent; acceptance list per screen.
- Detailed enough that the builder decides nothing.

### Phase 3: build the study copies (Sonnet builder + Sonnet parity reviewer per product, in parallel)
- Each copy: one self-contained page (`<code>/copy/index.html`), phone first, saves in the browser only, works
  fully (every path from `flow.json`).
- Loop, at most 5 rounds: builder screenshots its copy at each screen → compares with the real shot → fixes.
- Then a separate reviewer, who did not build it, walks copy and real shots side by side and answers two
  things per screen: same behaviour? can a first-time user find each feature? Findings go back to the builder.
- Done when: the reviewer's list is empty or each remaining item is named on the owner page.

Status 2026-11-20: specs (Opus) and copies (Sonnet builder + separate Sonnet reviewer, one fix round each) done for
r1, r2 and r4 (part A). r3 and r5 wait for Q1 and Q7; r1's guessed replies wait for Q8.

### Phase 4: your look (Opus builds the page; you decide) — page published 2026-11-20 (private; address in the private folder)
- One private page: per product, the working copy (opens on your phone), the real screens beside it, a short
  "what it does best / what feels hollow" from the walk, a 👍 and a notes box that saves as you type.
- Done when you say so. Your notes decide which copy is the starting point of the original tool.

### Phase 5: design the original tool (Opus) — depends on your marks
- Start from the copy you liked best, unchanged. List each proposed change as one plain question:
  "r1 does X. Change it to Y?" (Keep / Change / Not sure), each with where Y comes from (which product, or "ours").
- Uses the checked nicotine beliefs already in the app's data; any new claim needs a source.
- Plan section "Phase 6 brief" written here: files, data shape, acceptance checks.

### Phase 6: build the original tool (Sonnet, worktree) — depends on your answers to Phase 5
- In the app, phone first, then desktop; replaces nothing until you say so (Q6).
- Main must be green before the first commit. Type check before push.
- Audit before "done": 5 agents (bugs, phone walk on the emulator, parity with your Phase 5 answers, first-time
  findability, sources), then fixes, then you say "done".

## Ground rules for every agent
- Never the owner's name, email, phone or account; persona and inboxes from the private file.
- No purchases, no trials that ask for a card. Stop and report at any payment screen.
- Nothing about these products enters the repo: no names, shots, quotes or links. Private folder only.
- Screens not seen are written down as "not seen", never invented.
- Downloaded files go in their own folder and are never run.
- Stop the emulator when done.
