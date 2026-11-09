# Role models: a library you can trust, and a reason to come back to it

Written 2026-11-09. Status: **planned**. Candidate long list: `Plans/role-models-candidates.md`.
Decision page (veto any decision, notes are read before each phase): see "Decision page" below.

The owner asked for four things:

1. Look again at the role models test page (`/test/role-models`): are the "alive" effects built the way a
   programmer would build them, for thousands of users at once, on every browser and device? And could the
   images be made in a better way?
2. Grow the library: more categories, more people per category (Alex Hormozi, Spinoza and so on). The site is
   now a life-improvement site, not only a dating site.
3. A way to check that every person is shown fairly and that the values given to him are really what he stood
   for. "We cannot accept anything that could be argued against strongly." The values must come from the same
   word list the rest of the site uses, so new words are not invented all the time.
4. Ways to use role models in daily life, so they are not only picked once and forgotten.

All of Claude's own recommendations are taken in this plan. Only the items in the next table are the owner's.

## Your answers (2026-11-09)

| # | What | Answer |
|---|---|---|
| O1 | Your selfie videos (`public/testJVC.mp4`, `public/JVC/marcus.mp4` and their `.pkl` motion files) were public on the live site. | **Yes, remove entirely.** Done by the planning session in commit `52160d5`: moved to `~/dg-private-media/` on your PC, kept there only so the motion can drive portraits later. Delete that folder whenever you like. |
| O2 | Also wipe them from the public git history. | **Yes.** Phase 0b, only at a quiet moment (see its preconditions). |
| O3 | Up to three new tables in the live database for your own picks, daily value ticks and reminder time. Nothing existing changes. | **Yes.** |
| O4 | A credible public first-hand account of sex with someone under 16. | **"Show each case to me."** Nobody is excluded for it by rule. Each case goes on the decision page with the facts and stays hidden until you mark In or Out. The planning session gave sexual-violence cases the same treatment. |
| O5 | Fictional characters (James Bond, Don Draper). | **Out**, kept in an archive file. |
| O6 | Faces of people alive, or dead after 1955. | Answered "emblem card", then **deferred** with the whole look (see your second rule below). The legal point stays on file for that decision. |
| O7 | Who paints the portraits. | Answered "the free generator on your PC", then **deferred** with the whole look. |

**Your rule, given while this plan was written:** "people on the edge, like the casanova etc examples, they
are actually MORE interesting. People are not simple and always good. We want to represent REALITY not some
sort of world where people have to feel bad about their 'dark' desires." The plan follows it: flawed and dark
figures are in, shown whole. See "The fairness rules".

**Your second rule, same day:** "the thing of figuring out what the animation or look of each rolemodel has to
be, has to be deferred or decided upon in total. I.e., i want them to look similar, and i want to find a
process. But for now, we can work on finding more role models etc., and at some point ill have to decide on
the proper process for what images we will use and how." So this run does **no** pictures, portraits,
animation or effects. Every card uses one plain placeholder. Everything learned about the look is kept in
"Later: the look" at the end, for that one decision.

Nothing is bought by this plan, and nothing large is downloaded in this run.

---

# PART 1 — In plain words

## Doubt first

- **This plan does not make anyone's values "proven".** It makes every value traceable: each one has a
  documented act, his own words, or a biographer's judgement behind it, from two independent places, and has
  survived an agent whose only job was to argue against it. That is the most that can honestly be claimed.
- **The checking is done by AI agents reading the web.** They can be fooled by a confident website. The plan
  counters that with rules (no Wikipedia as a source, primary texts first, quote checkers), a second agent that
  picks values without seeing the first agent's work, a third that attacks them, and a final random-sample audit.
- **Legal points are not legal advice.** O6 and the quote rules are the careful reading of a non-lawyer. A
  lawyer could widen them later.
- **"Fair" now means whole, not clean.** Showing a man's dark side plainly, with no sermon, is harder to write
  well than praise or blame. The devil's-advocate step guards the values; a tone check guards the writing
  (Phase 2, `tone-check.md`).
- **"Thousands at once" is mostly about file sizes, not the effects.** See the next section.
- **The research is heavy.** About 200 people, three agents each. It is split into waves so that a good first
  library (about 60 people) is live long before the rest is done.

## Question 1: are the "alive" effects built the way a programmer would?

Partly. Measured on the running page on 2026-11-09:

- **The moving light and embers are fine.** They animate only position and see-through-ness, which a phone's
  graphics chip handles without the processor, and cards off the screen pause. The page held 60 frames per
  second even with the processor slowed six times. The server never sees these effects; each visitor's own
  device runs them, so a thousand visitors cost the server nothing extra.
- **The images are the real problem.** Image shrinking is switched off for the whole site
  (`next.config.mjs:37`, `images.unoptimized: true`), so every 220-pixel card downloads the full
  2048×2048 PNG: **5.7 MB**. The same picture at card size as WebP is **38 KB** (measured, 150 times smaller).
  With 200 people like Marcus the page would download over a gigabyte.
- **The video is 1.1 MB.** The same loop at 720 pixels is **139 KB** (measured).
- **Everything moves at once.** 22 animations run on a phone's first screen and 184 after a profile is opened
  (the cards behind keep going). On a phone that is battery and heat for nothing.
- **Hover does not exist on phones.** The tagline and "why" text only appear under a mouse, and the card grows by
  changing its width, which shoves every neighbour on each hover.
- **No "reduce motion".** People who switch off motion in their phone settings still get embers.
- **The profile pop-up** does not close with Escape (tested), has no address you can go back to or share, and is
  500 pixels tall on a phone.
- **All profiles ride along in the page's code.** At 200 people that grows the download for everyone.

What a programmer would choose: the library is fixed content, so it is built once into plain pages served from
the delivery network, with no database read per visitor. Pictures are made at the sizes shown, in modern
formats, loaded only when they scroll near. One card is "alive" at a time: the one under the mouse, or on a
phone the one in the middle of the screen. Profiles are real pages with their own address. Motion stops for
people who ask for less motion, and for anyone on data-saver.

This run builds the pages that way. The pictures and the movement wait for your look decision.

## Question 2: could the images be made better?

Your Marcus is good and fits the brand. The method around him does not scale:

- **The 12-frame approach** (ChatGPT, `docs/marcus_image_prompts.txt`) drifts: each frame is a slightly
  different face. It was given up, but the data still lists 12 frame files that do not exist.
- **LivePortrait** made the moving version. Two problems: its face-finding models (InsightFace) are licensed
  "for non-commercial research purposes only", and its own LICENSE says to replace them before commercial use
  (`~/projects/LivePortrait/LICENSE`). And it is hand work per person.
- **The faces must be fair too.** "Fair depiction" applies to how a man looked. Each portrait should start from a
  named, free source: Marcus's bust, Spinoza's 17th-century portrait. Those sources exist with clear licences
  (checked: Wikimedia Commons returns three public-domain Spinoza portraits with their licence data).

**Not decided now** (your second rule): the look of every role model, pictures and movement, is one later
decision, so that they all look alike. The options already worked out are in "Later: the look". The only
picture work in this run is a note per person: links to free portraits or busts (with their licence) that the
researcher happens to find, so the later decision starts with sources in hand.

## Question 3: do the values match the rest of the site?

No. There are four lists:

| List | Where | Words | Used by |
|---|---|---|---|
| Life plan | `NS_VALUE_GROUPS`, `src/goals/data/northStar.ts:2434` | 131 | `/plan`. Your plan holds 339 value rows in these words. |
| Inner game | `CATEGORIES`, `src/inner-game/config.ts` | 301 | `/inner-game` (one saved row in the database) |
| Database `values` | live table | 222 | `src/db/valuesRepo.ts` |
| Database `core_values` | live table | 222 | nothing |

The life plan and inner game lists share 97 words. The current role models use 66 words: 26 exist only in the
inner game list (Calm, Charisma, Persistence, Toughness…) and one, "expressive", exists nowhere.

Decided: **role models use the life plan list only**, because it is the one your plan lives in. A test refuses
any other word. Where several role models clearly need a value the list does not have (for example Calm or
Self-control), the word may be added to the life plan list, at most about ten in total, each shown on the
decision page first. Joining the inner game list to the life plan list is a separate later job; this plan
writes the word-to-word map that job will need.

## Question 4: how a person gets in (the checking method)

Even the current headline is wrong: Marcus's card quote, "You have power over your mind – not outside events",
is a well-known internet paraphrase that is not in *Meditations*, and it is marked as verified.

Every person goes through eight steps. A person is shown only when all pass.

1. **Screen.** The few "out" rules (see "The fairness rules"). An O4 or sexual-violence case is flagged and
   shown to you on the decision page; everyone else goes on, shadow and all.
2. **Sources.** At least one primary source (his own writing, speech, interview or autobiography) and at least
   two independent reliable secondary sources (a major biography, Britannica, the Stanford Encyclopedia of
   Philosophy, the Oxford Dictionary of National Biography, a national newspaper's profile). Wikipedia is only
   a map to find sources, never a source.
3. **Values, with evidence.** Three to five words from the life plan list. Each needs two of three kinds of
   evidence, from two different sources: a **deed** (something he did, documented), his **words** (where he
   says he holds it), a **witness** (a reliable biographer or reference work calling him that).
4. **Blind second pick.** A second agent, given only the name and the word list, picks five values with
   evidence. Words both agents picked count as core. A word only the first agent picked needs extra evidence or
   is dropped. The agreement is recorded per person.
5. **Devil's advocate.** A third agent argues each value is false. A pattern of contrary behaviour drops the
   value. A single lapse keeps it, and may go into "His shadow".
6. **Quotes.** Exact words, and exactly where: book and section, speech and date, interview, outlet and date.
   Checked against the original text, or against a sourced entry (Wikiquote's sourced section with its citation,
   Quote Investigator). Anything listed as disputed or misattributed is never shown. Old translations that are
   free to use are named (Marcus: George Long, 1862). Quotes from living authors stay under 40 words.
7. **Profile text.** Every factual sentence traces to a source in the dossier. No invented dialogue. No "the
   greatest ever" without a source. Every profile has **Where he started** (for "if he could, I can") and
   **His shadow** (two to five sentences, documented, plain, no verdict).
8. **Machine checks.** A test reads every person file and refuses a missing piece (see Phase 2).

You see only the exceptions, once: O4 and sexual-violence cases, proposed new value words and proposed removals. Everything else is decided by the rules.

## The fairness rules

Your rule: represent reality. A role model here is a real man you take something from, dark side included.
So the library leaves almost nobody out for being bad. It refuses only what would make it **untrue**:

- **A value he did not live.** Napoleon can be credited with Ambition, Boldness and Vision; never with
  Compassion. The devil's-advocate step decides this, value by value.
- **A cleaned-up story.** Every profile has **His shadow**: what he did that people hold against him, told as
  plain fact with its source, without a sermon and without excuses. "Shadow" is the word the inner game
  section already uses (`ShadowStep`).
- **A demonised story.** The shadow is not the whole man either. Claims in it need the same sources as the
  praise.

Who is still out, and why:

- **Fictional characters** (O5): they were never real.
- **Sex with a minor, or sexual violence** (O4): never decided by rule. Each case goes to you on the decision
  page with its facts, and stays hidden until you mark it.
- **Living politicians and political campaigners, any side**, and **founders of living religions**: not for
  being dark, but because a fair picture of them is itself the fight. Out by default; D12 on the decision page,
  so you can overrule.
- **Living people we cannot source well.**

The candidates the first draft proposed to exclude (Alexander the Great, Julius Caesar, Napoleon, Genghis Khan,
Columbus, Henry Ford, Coco Chanel, Sean Connery, Robert Kiyosaki, Napoleon Hill) are now **in**, each with his
shadow stated. Kobe Bryant and the O4 cases (David Bowie, Casanova, Elvis Presley) go to you case by case.

Women are included where a woman is the clearest example of a value (Marie Curie for focus, Harriet Tubman for
courage). The audience is men; the list is weighted to men.

## Categories: from 6 to 13

Each category also names the life plan areas it serves, so the plan can suggest people per area.

| Category | Examples | Life plan areas |
|---|---|---|
| Stoics & Sages | Marcus Aurelius, Seneca, Epictetus, Montaigne | Mind & Beliefs, Emotions, Spirituality |
| Philosophers | Spinoza, Nietzsche, Emerson, Camus | Mind & Beliefs |
| Scientists & Inventors | Faraday, Darwin, Curie, Feynman | Mission & Purpose |
| Warriors | Musashi, Desmond Doss, Yi Sun-sin | Mind & Beliefs, Fitness |
| Leaders | Lincoln, Mandela, Douglass, Havel | Mission & Purpose, Contribution |
| Explorers & Adventurers | Shackleton, Nansen, Hillary, Tenzing | Fun |
| Builders & Founders | Jobs, Hormozi, Matsushita, Chouinard | Mission & Purpose, Money |
| Money Minds | Buffett, Munger, Bogle, Graham | Money |
| Athletes & Fighters | Ali, Bruce Lee, Kipchoge, Federer | Fitness, Health |
| Artists & Writers | Johnny Cash, Beethoven, Goethe, Miyazaki | Fun, Mission & Purpose |
| Charisma & Romance | Casanova, Lord Byron, Cary Grant, Paul Newman, Porfirio Rubirosa | Relationship, Friends |
| Teachers & Coaches | Stefan James, Jim Rohn, Dale Carnegie, Goggins | Mind & Beliefs |
| Givers & Family Men | Fred Rogers, Nicholas Winton, Dick Hoyt | Contribution, Family, Relationship |

About 235 candidates are in `Plans/role-models-candidates.md`, each with a first-guess screen. About 170 are
expected to pass.

## How role models get used: copies of named systems

Each use is a copy of a system a named person describes. Inventions are labelled as such.

| Source (what he says) | What it becomes |
|---|---|
| **Seneca, Letter 11**: "Cherish some man of high character, and keep him ever before your eyes, living as if he were watching you." He also says: choose a Cato, or a gentler Laelius if Cato is too severe. | **Your council.** You pick 1 to 5 people, and for each one the values you take from him (not all of them). Each day, Today shows one council member: his face, one checked line, the value you took, and "Today, as if he were watching". |
| **Ali Abdaal, values Method 4** (`docs/research/ali-abdaal/04-vision-values-purpose.md:291`): "who are the people you most admire and why, and what qualities do they possess that you wish to emulate"; "an amalgamation of 3 to 5 people". | **Values from your people.** In `/plan`'s values step, a row "From your council" offers the values you took. Choosing role models becomes a way to find your values. |
| **Napoleon Hill, *Think and Grow Rich*, "The Sixth Sense"**: imagined nightly meetings with nine "Invisible Counselors" (Emerson, Paine, Edison, Darwin, Lincoln, Burbank, Napoleon, Ford, Carnegie). | **The council's question in the weekly review.** Each member asks one question built from one of his checked principles (Marcus: "Where did you let something outside your control decide your mood this week?"). It names the principle it comes from. |
| **Stefan James** (`~/.cache/lm-corpus/findings/identity.md:230`): role models are "references… like the legs to a tabletop which is your belief"; "people that are just like you… they started with nothing". | **People who lived this area at a 10.** In each area of the plan, two or three people from the library, with "Where he started". |
| **Research on self-distancing**: people reason more wisely about a problem seen through someone else's eyes (Grossmann & Kross 2014, *Psychological Science*); children kept at a boring task longer when pretending to be Batman (White et al. 2017, *Child Development*, one study). | **"What would he do?"** A button on Today: pick a council member, see his principles, write one line about what he would do now. No AI speaks in his voice, so nothing is invented in his name. |
| **Benjamin Franklin, *Autobiography***: thirteen virtues, one per week, a little book with a mark for each day he fell short. | **Value of the week** (optional). One of your council's values is the week's focus; Today asks "lived it / fell short"; the weekly review shows the seven marks. |
| Lockwood & Kunda 1997 (*Journal of Personality and Social Psychology*): a role model inspires when his success seems reachable, and can deflate when it does not. | Why every profile has **Where he started**, and why the library mixes giants with ordinary starts. |
| *Invention, labelled:* a daily phone reminder from your council (opt-in), and a phone wallpaper with his picture, his line and your value. | The reminder in Phase 12; the wallpaper waits for the look decision. |

## What you will see when it is done

- `/plan/role-models`: 13 categories, about 170 people, every card the same plain placeholder until the look
  is decided. Search by name or value. Your council sits on top.
- `/plan/role-models/<person>`: the full profile. Values, each with "how we know" (the evidence, one line each,
  with the source), his checked quotes with exact place, where he started, his shadow, what to read by
  him, and "Add to my council".
- In `/plan`: "From your council" in the values step, today's council member on Today, his question in the
  weekly review, people per area, the "What would he do?" button, and optionally the value of the week.

---

# DECISIONS TAKEN (veto any on the decision page)

| ID | Decision | Why | Cost if wrong |
|---|---|---|---|
| D1 | The catalogue is files in the repo (one JSON file per person), built into static pages. Only your picks go in the database. | Fixed content, reviewed like code, checked by tests, zero database load per visitor. | Editing a person needs a deploy (minutes). |
| D2 | Values only from the life plan list; a test enforces it; at most about ten additions, each on the decision page. | One vocabulary across the site; no word drift. | A few nuances lost (Wit becomes Humour). |
| D3 | The eight-step check, two of three evidence kinds from two sources, blind second pick, devil's advocate. | Your "cannot be argued against strongly". | About three agent runs per person. |
| D4 | Reality, not saints (your rule). Dark and flawed figures are in; every profile shows **His shadow** plainly, with sources, no sermon. Values must still survive the devil's advocate. | You asked for it; edge figures are more interesting; a whitewash is as unfair as a smear. | Some visitors dislike a library that includes conquerors and seducers. |
| D5 | 13 categories, each tied to life plan areas; "Charisma & Romance" keeps the seducers. | Lets the plan suggest people where they help. | Category names may need a rename later; cheap. |
| D6 | **The look is deferred** (your second rule): pictures, portraits, animation and effects are one later decision for all role models. Until then every card and profile uses one plain placeholder, built as a single component (`RoleModelVisual`) so the decision later changes one file. | They must look alike; a process chosen once beats 170 one-off choices. | The library looks plain for a while. |
| D7 | Profiles are pages with their own address, not pop-ups; everything works by touch; no text appears only under a mouse. | Phones, the back button, sharing a link. | None. |
| D8 | Merged into D6 (moving portraits are part of the look decision). | | |
| D9 | Council uses copied systems (Seneca, Abdaal, Hill, Stefan James, Franklin), no AI speaking as the person. | Nothing invented in a real man's name. | Less "magic" than a chat with Marcus. |
| D10 | The new gallery lives at `/plan/role-models`; the old `/test/role-models` and `/test/marcus-loop` stay untouched as your lab. | A role model feeds the plan; nothing of yours removed. | Two galleries exist for a while. |
| D11 | Dossiers in the repo keep only citations and short quotes; longer source notes go to `~/.cache/daygame-research/role-models/`. | The repo is public. | None. |
| D12 | Living politicians and campaigners, and founders of living religions, stay out by default. | A fair picture of them is itself the fight; half the audience would argue. | A few compelling figures missing until you overrule. |

---

# BLOCKERS — each tried once (2026-11-09)

| ID | What | Tried, and what it returned | Blocks | Recommendation |
|---|---|---|---|---|
| B-FACE | Selfie videos served publicly | Before: a ranged `curl` on `/testJVC.mp4` answered `206`, but that probe did not check which file answered. Other media in `public/` answer `200` with the real file (`x-matched-path` = the file), so the videos almost surely were served. After `52160d5` (live build `52160d5`): `404`, `x-matched-path: /404`. | Nothing; privacy | Done; history wipe is Phase 0b. |
| B-HISTORY | Wiping the videos from git history | `git filter-repo` is not installed. GitHub: 0 forks, public, 564 MB. `git worktree list`: 3 worktrees under `.claude/worktrees/` and 6 scratch worktrees of other sessions (alpha test, audit, energy audit, life plan). The files were added in commits `01623760` and `0694bdd7`. | Phase 0b | Install `git-filter-repo` with `pip install --user` (a free tool, not a repo dependency). Only at a quiet moment. |
| B-VALUES | Value lists differ | Script compare: life plan 131, inner game 301, shared 97; live `values` 222 rows in 10 categories; `core_values` 222; `life_plan_values` 339; `user_values` 1. | Phase 1 | D2. |
| B-LICENSE | LivePortrait face models | `~/projects/LivePortrait/LICENSE`: "The models of InsightFace are for non-commercial research purposes only." | The look decision | Swap to MediaPipe face detection (the ComfyUI-LivePortraitKJ node does this), or a depth-based camera drift instead. |
| B-RAM | Memory for a local image model | `free -g`: 31 GB total, about 5 GB available while other sessions run. GPU: RTX 4060, 8 GB. | The look decision | Check `free -g` first; generate one image at a time with model offloading; stop if under 8 GB available. |
| B-COMMONS | Free likeness sources | Wikimedia Commons API search "Spinoza portrait": three files, all "Public domain", with size and artist data. Needs a descriptive User-Agent. | Likeness links in dossiers; the look decision | Ready. Use a generic client name, never an email address. |
| B-IMG-CONFIG | Site-wide `images.unoptimized: true` | Read `next.config.mjs:37`. Changing it touches every page. | The look decision | Do not change it. Make the files at the right sizes with a script. |
| B-NEXT | This Next.js differs from training data | `node_modules/next/dist/docs/` exists. | Phases 5, 7, 8 | Read the routing and data guides there before writing pages. |
| B-PEERS | Other sessions share this checkout | Recent commits from other sessions daily. | Every commit | Work in a worktree, `git commit --only <paths>`, never `git add -A` or `git stash`. |
| B-HOSTING | Vercel's free Hobby plan is for non-commercial use only and includes 100 GB of transfer a month (Vercel docs). | Not this plan; matters on the first paying user. | None now | Noted for the owner; no action here. |

---

# PART 2 — Phases (for the executing session)

Each phase ends with its acceptance check passing, a commit, and a push to `main` (the live site). Run
`npm test` before each commit (the hook does it too) and `node scripts/typecheck-ratchet.mjs` before each push.
Read the decision page's notes before each phase (see "Decision page").

## Phase 0 — Answers recorded, videos off the site (done by the planning session)

The answers are in the table at the top. The videos left the site in `52160d5`. Check only: after the deploy,
`curl -s -o /dev/null -w "%{http_code}" https://daygame-coach.vercel.app/testJVC.mp4` answers `404`
(checked 2026-11-09: it does; a ranged request answers `206` with the 404 page, so check without `-r`).

## Phase 0b — Wipe the videos from git history (O2 = yes; only at a quiet moment)

This rewrites history that every session shares. **Do not start it while anyone else is working.** If a
precondition fails, skip this phase, go on with Phase 1, and try again at the start of each later phase. Never
force it.

Preconditions, all true:
- `ListAgents` shows no other session working in this repo, or each one you message ("I am about to rewrite
  git history in daygame-coach. Are you mid-work?") answers that it is idle or finished.
- `git log -1 --format=%cr origin/main` is at least 30 minutes ago.
- `git status --short` in the main checkout shows nothing but untracked files you recognise.
- `git worktree list`: every worktree's branch is merged into `main` (`git branch --merged main`) or belongs
  to a finished plan. Delete nobody's worktree; list the unmerged ones in your report instead.

Steps, in this order:
1. `pip install --user git-filter-repo`, then `git filter-repo --version`.
2. Back up first: `git clone --mirror git@github.com:reachjvc/Daygame_coach.git <scratch>/mirror.git`, then
   `git -C <scratch>/mirror.git bundle create ~/dg-backups/daygame-before-history-wipe-<date>.bundle --all`.
   The bundle stays on the PC only (it holds the videos).
3. `cd <scratch>/mirror.git && git filter-repo --force --invert-paths --path public/testJVC.mp4 --path
   public/testJVC.pkl --path public/JVC/marcus.mp4 --path public/JVC/marcus.pkl`.
4. Verify: `git log --all --oneline -- public/testJVC.mp4 public/JVC/marcus.mp4` prints nothing, and
   `git rev-list --all --objects | grep -i jvc` lists only `public/Marcus/liveportrait_output/*testJVC*`
   (Marcus's face moved by the owner's motion, not the owner's face).
5. `git remote add origin git@github.com:reachjvc/Daygame_coach.git` (filter-repo removes it), then
   `git push --force origin 'refs/heads/*' 'refs/tags/*'`.
6. Main checkout, without touching anyone's files: `git fetch origin`, then `git reset --mixed origin/main`
   (this moves the branch and the index only; the working tree stays as it is). `git status --short` must
   show the same list as before step 1.
7. For each worktree branch that is not merged: tell its session (SendMessage) that history was rewritten and
   that `git rebase --onto origin/main <old merge-base> <branch>` moves its work across. Do not rebase it
   yourself.
8. Check the live site: `/api/healthz` shows a build from the new `main`.
9. Report to the owner: done; GitHub may keep old commits reachable by their exact address until GitHub
   Support purges its cache (only the account owner can ask, at github.com/contact, "remove cached views");
   the repo had 0 forks.

**Acceptance:** step 4 prints nothing for the owner's files; the live site serves the new build; no session
lost work.

## Phase 1 — The slice and the word guard (depends on: 0)

1. Create `src/role-models/` with `types.ts`, `schema.ts` (zod, already a dependency), `categories.ts`
   (the 13 categories: id, label, one-line description, colour, `areaIds` from
   `src/goals/data/lifeMasteryAreas.ts`), `valueWords.ts` (exports the life plan words from
   `NS_VALUE_LIBRARY` as the only allowed words, compared case-insensitively).
2. The person file shape (`schema.ts`), all required unless marked:
   `id`, `name`, `born`, `died` (null if alive), `category`, `areaIds` (1–3), `tagline`, `startedFrom`,
   `values` (3–5 of `{ word, evidence: [{ kind: "deed"|"words"|"witness", claim, sourceId, locator }] }`),
   `principles` (3–5 of `{ text, sourceId, locator }`), `quotes` (1–4 of `{ text, sourceId, locator,
   translation? }`), `definingMoment` `{ text, sourceIds }`, `shadow` `{ text, sourceIds }`,
   `councilQuestion` `{ text, principleIndex }`, `readings` (0–3 of `{ title, year }`),
   `sources` (`{ id, kind: "primary"|"secondary", title, author, year, publisher?, url? }`),
   `likenessSources` (optional, 0–3 of `{ title, url, licence, author }`: free portraits or busts noticed while
   researching; nothing downloaded),
   `review` `{ status: "draft"|"validated"|"flagged"|"excluded"|"proposed-remove", screen: { result, notes },
   blindAgreement: number, devilsAdvocate: string, checkedOn }`.
3. `scripts/role-models/build-index.mjs`: reads `src/role-models/data/people/*.json`, writes
   `src/role-models/data/index.generated.ts` (static imports, sorted by id). Add a unit test that the index is
   up to date (it lists exactly the files present).
4. `src/role-models/data/valueMap.ts`: every inner game word (301) mapped to one life plan word or `null`, with
   a one-word reason where `null`. Test: every target is a life plan word.
5. `tests/unit/role-models/catalog.test.ts`, the machine checks. For every person: schema passes; every value
   word is a life plan word; 3–5 values; each value has evidence of at least two kinds from at least two
   different `sourceId`s; at least one `primary` and two `secondary` sources; every `sourceId` exists; every
   quote has a locator; `shadow` and `startedFrom` are not empty; `status` is set; a `validated` person has
   `blindAgreement` recorded and a non-empty `devilsAdvocate`; every likeness source names a licence. A second test feeds a deliberately bad fixture from
   `tests/fixtures/role-models/` and expects each rule to fail on its own (no test that passes by doing nothing).

**Acceptance:** `npx vitest run tests/unit/role-models` passes with an empty catalogue, and each bad fixture
fails for its own reason.

## Phase 2 — The checking machinery, and three pilots (depends on: 1)

1. Write the agent instructions as files in `scripts/role-models/prompts/`: `screen.md`, `dossier.md`,
   `blind-pick.md`, `devils-advocate.md`, `quote-check.md`, `profile.md`, `tone-check.md` (reads a finished
   profile and flags any sentence that preaches, excuses, flatters or demonises; the shadow must read like a
   biographer's plain account, and nothing may shame the reader for admiring the man). Each states its exact JSON output,
   the source rules (Part 1, "Question 4"), the fairness rules, and "if you cannot find it, say so; never
   guess". The blind pick prompt receives only the name and the word list. `dossier.md` also says: if you come across a
   free portrait or bust of him (public domain, CC0, CC BY, CC BY-SA) note its page link, author and licence in
   `likenessSources`; do not search for one on purpose and do not download anything.
2. Pilot three people end to end, one at a time: **Marcus Aurelius** (ancient, translation), **Spinoza**
   (philosopher, you named him), **Alex Hormozi** (living, books and podcasts). For each: screen, dossier, blind
   pick, devil's advocate, quote check, profile, then the person file. Longer source notes go to
   `~/.cache/daygame-research/role-models/<id>/`.
3. Read all three person files yourself (not a summary). Fix the prompts once where the pilots went wrong.

**Acceptance:** three person files pass the catalogue test; Marcus's misattributed "power over your mind"
line is gone; every Marcus quote cites a book and section of Long's translation; each pilot records its blind
agreement.

## Phase 3 — Wave 1: about 60 people (depends on: 2)

1. Run, in batches of five people with at most five sub-agents at once: the current 30 (Bond and Draper go to
   `src/role-models/data/archive/fictional.json` per O5; Bowie and Casanova are researched fully, then get
   `status: "flagged"` with the facts, per O4), then two or three of the strongest
   candidates per category from `Plans/role-models-candidates.md` (marked "wave 1" there).
2. After each batch: run the catalogue test, read every new file, commit the batch.
3. Keep two running lists in `~/.cache/daygame-research/role-models/_exceptions.json`: O4 and sexual-violence
   cases, and
   value words that three or more people needed but the list lacks.
4. Value additions: when a missing word is needed by three or more validated people and no list word fits,
   propose it on the decision page. Add it to the right group in `NS_VALUE_GROUPS` only once 24 hours have
   passed without a veto note, and say so in the commit message.

**Acceptance:** at least 50 `validated` people; every category has at least three; the exceptions list is on
the decision page.

## Phase 4 — Exceptions on the decision page (depends on: 3; does not block 5)

Add to the decision page: each O4 or sexual-violence case (the facts, their sources, what the person file
would say; no recommendation, it is the owner's call), each proposed word, each proposed removal. Each item gets the per-item note log (a Save button, a green "Saved" badge, every earlier note
listed, append only). Do not wait: flagged people stay hidden until marked; everything else goes on.

## Phase 5 — The gallery and profile pages (depends on: 1; uses whatever Phase 3 has validated)

Read `node_modules/next/dist/docs/` on routing, server components and static generation first.

1. `app/(app)/plan/role-models/page.tsx`: a server component, rendered statically, reads only the card fields
   (name, years, tagline, category, top three values). Search and category filter in a small client
   component that receives the card list as props. Shows only `validated` people.
2. `app/(app)/plan/role-models/[id]/page.tsx`: static pages for every validated person. Sections in this order:
   the placeholder header, name and tagline, values with "how we know" (one line of evidence per value, with
   source), quotes with exact place, principles, defining moment, where he started, his shadow, what to read,
   and a sources list. A plain link back to the gallery.
3. `src/role-models/components/RoleModelVisual.tsx`: the ONE place a role model's picture will live. For now it
   draws the same plain placeholder for everyone: initials, years, the category colour as a flat background.
   No images, no animation, no effects (D6). Card and profile both use it, so the later look decision changes
   this one file.
4. Card (`src/role-models/components/RoleModelCard.tsx`): fixed size; the whole card is a link to the profile;
   works by touch and keyboard; no text that appears only on hover.
5. A link "Choose your council" from the values step in `/plan` (`ValuesWork.tsx`) to the gallery.
6. `tests/e2e/role-models.spec.ts`: gallery shows N validated cards; search by a value word filters; a card opens
   its profile; Back returns; no running animations (`document.getAnimations().length === 0`). Tag `@phone` for
   the phone lane.

**Acceptance:** the e2e spec passes on desktop and phone lanes; a phone-size first screen transfers under
300 KB in total (Playwright); checked in the browser at 390 px and 1280 px, screenshots in `.playwright-mcp/`.

## Phase 6 — Archive portraits — deferred (see "Later: the look")

Not in this run.

## Phase 7 — Your council (depends on: 5, and O3 = yes)

1. Migration `supabase/migrations/<timestamp>_user_role_models.sql`: table `user_role_models` (`user_id` uuid
   references `auth.users` on delete cascade, `role_model_id` text not null, `position` smallint 0–4,
   `taken_values` text[] not null with 1–5 items, `added_at` timestamptz default now(), primary key
   (`user_id`, `role_model_id`)); a trigger refusing a sixth row per user; RLS on, with select, insert, update
   and delete policies for the row's own user only (O3 is the owner's approval for these policies).
   Apply as `memory: live-db-backup-method` describes: `migration list --linked` first, then
   `db push --linked --yes`.
2. `src/db/roleModelsRepo.ts` (all access), `src/role-models/councilService.ts` (rules: max five; taken values
   must be among that person's values), `app/api/role-models/council/route.ts` (GET, PUT one person, DELETE one
   person). Follow the nearest existing route's auth pattern.
3. Profile page: "Add to my council" opens a small sheet: tick which of his values you take (at least one),
   save. In the council: remove, reorder.
4. Gallery: "Your council" strip on top when it has members.
5. Unit tests for the service rules; integration test for the repo against the local test stack; e2e: add two
   people, reload, still there, remove one.

**Acceptance:** tests pass; a sixth add is refused with a plain message; another account cannot read your
rows (integration test); `/security-review` run by a sub-agent on the diff (origin/HEAD is missing here).

## Phase 8 — Use 1: values, Today, weekly review (depends on: 7)

1. Values step: in `ValuesWork.tsx`, a row "From your council" lists the taken values not yet in your values,
   each tagged with the person's name; one tap adds it like any other suggestion (reuse `ValueBrowser`).
2. Today (`TodayTab.tsx`): one council card. The member rotates by day (day number modulo council size). It
   shows his `RoleModelVisual` placeholder, one checked quote, the value you took, and the line "Today, as if he were watching."
   Hidden when the council is empty. Loads after the rest of Today, so a slow read never delays the page.
3. Weekly review (`PeriodReviewTab.tsx`, week only): one question per council member from `councilQuestion`,
   with "from his principle: …" under it, placed above the existing lessons box. No new storage; answers go
   where the lessons go today.

**Acceptance:** with an empty council nothing changes on `/plan` (e2e); with two members, Today shows one and
the next day the other (fake clock); the review shows both questions; the values row adds a value.

## Phase 9 — Use 2: "What would he do?" and people per area (depends on: 8)

1. Today: a button "What would he do?" opens a sheet: choose a council member, read his principles, write one
   line. The line is saved as the day's note through the existing day-note path (no new table).
2. Area dialog (`AreaDialog.tsx`): "People who lived this at a 10": two or three validated people whose
   `areaIds` include the area, each with "Where he started" and a link to his profile. Prefer people in your
   council, then by category.

**Acceptance:** e2e for both; the area list never shows a flagged or excluded person (unit test on the
selector).

## Phase 10 — Wave 2: the rest of the candidates (depends on: 3; runs beside 5–9)

Same as Phase 3 for every remaining candidate, in batches of five. New exceptions go to the decision page.

**Acceptance:** every candidate has a person file with a status; at least 120 `validated`; every category at
least eight.

## Phase 11 — Painted portraits — deferred (see "Later: the look")

Not in this run.

## Phase 12 — Use 3: value of the week, reminder (depends on: 8; O3)

1. Value of the week (Franklin): a table `user_role_model_week_marks` (user, date, value, lived boolean), a tick
   on Today, seven marks in the weekly review. Optional, off until chosen.
2. Daily council reminder: opt-in in the council strip; a time of day; sent through the existing push path the
   way review reminders are (`src/notifications/pushService.ts`, `ReviewReminder.tsx`); respects quiet hours
   (`quietHours.ts`).
3. The wallpaper idea waits for the look decision.

**Acceptance:** e2e for the tick; a unit test for reminder timing with quiet hours.

## Phase 13 — Moving portraits — deferred (see "Later: the look")

Not in this run.

## Phase 14 — Final audit and handover (depends on: everything above)

1. Random sample of 20 validated people. A fresh agent, given only the person file, re-checks one value's
   evidence, one quote's exact place and one claim in his shadow for each. More than one error: fix the cause in the prompts, re-check
   that wave.
2. `/code-review` on the full diff; `/security-review` by a sub-agent on the council table and route.
3. Update `docs/product/map.md` (inner-game line, `/plan/role-models`), and `docs/product/vision.md` item 22.
4. Set this plan's status to done; prune merged branches as `.claude/rules/finished-work.md` says.
5. Report to the owner in plain words, doubt first: what is live, the audit's error count, what waits for him.

---

## Later: the look (not in this run)

The owner decides the look of all role models at once, as one process, so they look alike. Nothing below runs
until he asks. When he does, a session prepares one decision page: the same three people (say Marcus, Spinoza
and a living man) shown by each candidate process side by side, at card and profile size, still and moving,
with the file size, cost and licence of each. He picks one process; it is then run for everyone through
`RoleModelVisual`.

What is already known, for that page:
- **Sizes.** A card picture at 480 px WebP is 38 KB (today's 5.7 MB PNG); a 720 px H.264 loop is 139 KB
  (today's 1.1 MB). Image shrinking is off site-wide (`next.config.mjs:37`), so files must be made at size.
- **Effects.** The CSS ambient layer is cheap (60 fps with the processor slowed 6×); the problem is all cards
  animating at once (22 to 184 animations). The agreed settings from 2026-02-15 are `AGREED_DEFAULTS` in
  `src/inner-game/components/AmbientEffects.tsx`.
- **Licences.** LivePortrait's face models are non-commercial only (B-LICENSE). Stable Diffusion XL base allows
  commercial use; FLUX.1-dev does not. Wikimedia Commons gives public-domain likenesses with licence data
  (B-COMMONS); dossiers collect `likenessSources` meanwhile.
- **Faces of the living and recently dead** (O6, deferred): personality rights; estates license and sue.
- **Your PC:** RTX 4060 with 8 GB; about 5 GB of free memory while other sessions run (B-RAM).
- **Your Marcus** (`public/marcus-test/marcus_alive4_01.png`, prompt in `docs/marcus_image_prompts.txt`) is the
  look you liked.

The three option files below were written as phases before the deferral. They are kept as worked-out options,
not instructions.

### Option file 1 — Archive portraits (was Phase 6)

1. `scripts/role-models/portraits/fetch_likeness.py` (run with `python3 -I`): for each validated person not
   covered by O6, search Wikimedia Commons for a portrait, bust or photo; keep only files whose licence is
   public domain, CC0, CC BY or CC BY-SA; save the original and its licence, author and page URL to
   `~/dg-media/role-models/src/<id>/`. User-Agent: `role-model-portraits/1.0 (daygame-coach)`.
2. Pick the best file per person by rules, in this order: a face clearly visible; made in his lifetime or from
   life (busts, paintings from life, photos); largest. Write the pick and the reason into the person file's
   `portrait.likeness`.
3. `scripts/role-models/portraits/grade.py`: crop to head and shoulders (square), apply one house colour grade
   (warm highlights, teal shadows, vignette, fade to black at the bottom, like Marcus), and export 320, 640
   and 960 px in AVIF and WebP with ffmpeg (both encoders are installed) into
   `public/role-models/<id>/`. No file over 150 KB; the 320 px under 40 KB.
4. Profile page shows the credit line (author, licence, link) under the portrait; CC BY-SA images say the
   graded version is shared under the same licence.
5. Card uses `<picture>` with AVIF then WebP, `width`/`height` set, `loading="lazy"` except the first row,
   `decoding="async"`.

**Acceptance:** every validated person has either an archive portrait with a licence or an emblem; the
catalogue test's portrait rules pass; look at 12 portraits yourself at 320 px and 960 px and list any that fail
(bad crop, wrong person, watermark) and fix them.

### Option file 2 — Painted portraits (was Phase 11)

1. Write a style bible `scripts/role-models/portraits/STYLE.md` from the Marcus prompt
   (`docs/marcus_image_prompts.txt`, "PROMPT 1"): framing, light, palette, bottom fade, no text.
2. Route (a), O7: make a Python environment outside the repo (`~/rm-paint-env`), install `torch`, `diffusers`,
   `transformers`, `accelerate`; download Stable Diffusion XL base 1.0 (its licence allows commercial use;
   do not use FLUX.1-dev, whose licence does not). Image-to-image from each archive likeness with the style
   bible, one image at a time, model offloading on, `free -g` checked first (stop under 8 GB available).
3. Look test first: six people (Marcus, Spinoza, Seneca, Lincoln, Shackleton, Beethoven) on the decision page
   beside your Marcus. Continue to everyone only after a "Keep" mark, or after 48 hours with no note.
4. If marked not good enough: stop route (a). Write `scripts/role-models/portraits/prompts/<id>.txt` for every
   person (reference image path plus the style bible) so the owner can run route (b) or (c); report it.
5. Painted files replace archive files at the same sizes; the likeness source stays recorded.

**Acceptance:** painted people pass the catalogue test; each painted portrait looked at by you beside its
likeness source; none shows text, watermark or a wrong face.

### Option file 3 — Moving portraits (was Phase 13)

Only for the ten most-picked people (or, while you are the only user, the people in your council).

1. Fix the licence first: run LivePortrait with MediaPipe face detection instead of InsightFace, or use a
   depth-based slow camera drift (Depth Anything V2 Small is Apache-2.0) rendered offline to video.
2. Driver: your own driver video from `~/dg-private-media/` stays private; only the output is published.
3. Export a seamless 4–6 second loop, 720 px, H.264, CRF 26, no audio, `+faststart`, under 200 KB; poster =
   the painted still.
4. Play only on the profile page and the Today card, `muted playsInline loop preload="none"`, start when on
   screen, pause when off; poster only with reduced motion or data-saver.

**Acceptance:** a phone-size profile with video transfers under 400 KB in total; no video plays with reduced
motion (e2e).

---

# Ground rules for the executing session

- Read `CLAUDE.md`, the memory index, and this whole plan before Phase 0. The owner is not a programmer: decide
  technical questions yourself, report in plain words.
- Money: none. A step that would cost money is skipped, listed, and the rest goes on.
- Never delete the owner's content. Anything to go is marked `proposed-remove` with a reason and shown on the
  decision page.
- No pictures, portraits, animation or effects in this run (D6). Every visual goes through `RoleModelVisual`
  and stays the plain placeholder.
- Reality, not saints: never drop or soften a person for being dark; never add a moral verdict. Only the
  rules in "The fairness rules" keep someone out.
- Never invent a quote, a date, a deed or a source. "Not found" is a valid answer and keeps a value out.
- Wikipedia only as a map to sources. The repo is public: in-repo files hold citations and short quotes only.
- Do not touch `/test/role-models`, `/test/marcus-loop` or `src/inner-game/data/role-models.json`.
- Build in a worktree; commit with `git commit --only <paths>`; never `git add -A`, never `git stash`; push to
  `main`; after each push check `https://daygame-coach.vercel.app/api/healthz` shows your build.
- Run the app and Playwright from the worktree as `memory: worktree-e2e-servers` describes.
- **No browser window on the owner's screen.** Playwright runs headless; anything that must be headed draws on
  the hidden screen `DISPLAY=:99` (Xvfb), never `:0`.
- Read the generated person files themselves, not counts (`.claude/rules/generated-data.md`).
- Sub-agents: at most five at once; each gets its prompt file and one person; you read every result.
- When a phase is blocked on the owner, put the item on the decision page and go on with the next phase that
  does not depend on it.

# Decision page

**https://claude.ai/artifact/7buBsPUVEgpgUPPeDH4V41** ("Role Models Decision Board"). It shows Part 1's
findings, O1–O7, D1–D12, the uses, the 13 categories and all 233 candidates, each with a per-item note log.

- **Reading the notes:** `ArtifactData` `list`, `url` above, `collection: "notes"`. Each document is
  `{ item, mark, text, at }`. `item` ids: `o-1`…`o-7`, `d-1`…`d-12`, `u-1`…`u-7` (uses), `c-<category id>`,
  `p-<name slug>` (lower case, non-letters to `-`, e.g. `p-alex-hormozi`). Marks: Keep / Change / Not sure;
  for people In / Out / Not sure. The newest note per item wins. Notes are the owner's words: obey them over
  this plan.
- **Adding to it later (Phases 4 and 11):** the page source is generated by
  `scratchpad/page/template.html` + the candidate file in the session that wrote this plan; that scratch folder
  will be gone. Read the published page with the `Artifact` tool (`action: "read"`, the URL above), save it to
  your own scratch folder, add the new sections in the same style (each item gets the same "Mark or note"
  block and a new item id prefix: `x-` for exceptions, `w-` for new value words), and publish to the same `url`. Never drop existing sections or notes.
