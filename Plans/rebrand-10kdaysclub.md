# Rebrand: DayGame Coach becomes 10K Days Club (10kdaysclub.com)

Written 2026-11-18, **rewritten 2026-11-19** after a fresh search of the live site and the owner's answers.

His instruction, 2026-11-18: *"The name of the website must change to 10kdaysclub.com, so all branding should
reflect this broader market now. The landing page should not say AI daygame coaching … make sure to find
everything … I need to be able to chronoshift back in time, and see what I used to have … and make sure I don't
lose any data."*

His instruction, 2026-11-19: *"find ALL the spots where we would need a rebranding … changing the focus away from
dating only, but not eliminating those parts. It is fine to put some parts of the website to the side … a new front
page, new icons where relevant and new naming every appropriate place … so that it can be executed by a lesser
model."*

**Status: plan written. Nothing is built yet except the Phase 0 backup (2026-11-18).** Phases 0–2 need nothing
from the owner beyond pasting the prompt. Phase 2 ends at his pick of a look. Phase 4 stops once more for his logo
pick. Phase 8 needs his Vercel login and the domain he buys.

---

## The owner's answers, 2026-11-19 (his words, condensed only where marked)

- **Front page:** "I like the look of my current frontpage, but it is only related to dating. I suppose i would
  want 'dating' to be one window users can click into, and then theyre sold on the dating activities. Then …
  another part is the broader lifestyle, with the plan, the time tools, the activity tracking (which also is
  symbiotic with dating though), and then there's the quit section, which is part of the broader lifestyle. So
  what i think we need is to decide on a coherent brand that can be an umbrella for all of this. I would not want
  to label it only quit, or quit first just because we're trying to sell something soonish, but would rather aim
  the site towards what i want it to be long-term. Also, users will be directed to the quit tools specifically,
  not the front page anyway. You may need to mock up a few different looks that i can decide on somewhere, but if
  you do so, then ill need to be able to click through and see how each of them look."
- **Activity tab:** "part of activity right now is weekly reviews and so on. These may need a new home, but i also
  somewhat like the look of it currently. However, i can see this being moved under dating, and renamed 'the
  field' i have no problem with that. Though, currently my idea was to make it modular, so that we had one place
  to track … But i dont think i would mind moving it so that it is 'only' the things related to dating, and
  clearly in the dating section."
- **Pricing:** its own pricing page (he picked the recommended option).
- **Audience and look:** "Men primarily, but no reason to entirely exclude women … For dating & Daygame, ive been
  very fond of the current color and design scheme. I think it works quite well. It may also work for the brand
  in general. However, there is the possibility of making the 'quit' pages look differently, or making the
  umbrella brand have its own color coding. It is important however that everything goes together, and that we
  are sure to enforce rules long term that makes our look very coherent across pages, but this could be a good
  opportunity to deepen the look on the site, through having several different facets of what we offer, i.e.
  making it clear what the user is working on, through the color scheme too."

What these answers decide (everything else below is **proposed** by Claude until he says yes):
1. The front page is an **umbrella** with three doors: **Life**, **Quit**, **Dating**. Not quit-first.
2. The current front page's look and dating pitch live on as the **Dating door** (`/dating`).
3. Prices move to **their own page** (`/pricing`).
4. Activity becomes **The Field**, inside Dating.
5. Words speak to men first and never shut women out.
6. The look gets **one colour per part of the site** if he picks that on the looks page, plus **written rules that
   tests enforce** so it stays coherent. He picks among clickable looks before any visual work is built.

---

# PART 1 — in plain words

## What was found (live site and code, checked 2026-11-19)

- **The old name is in 31 places people see.** The biggest: every page's browser tab and Google text say "AI
  Daygame Coach - Practice Social Skills from Home" (40 of 46 pages, including the free quit tools and every
  signed-in page). The phone's home-screen name is "Daygame". The header, the five sign-in pages, the quit tools'
  header and share picture, the notification help, the footer ("© 2025 DayGame Coach - JVC"), the sign-up and
  password emails and their sender name, and the Time Log's "Created with daygame-coach" all carry it.
- **Dating fills screens that are not about dating:**
  - **Activity** (a main tab) is all field tracking.
  - **Home** has 3 dating tiles out of 7, and they are the only locked ones. Its "Field: 0 approaches" card shows
    to everyone.
  - **You** opens with "Answer the dating questions".
  - **All tools** lists Dating before Life.
  - **Your plan's goal list** offers "Get a Girlfriend" as the only goal under Family and Friends. That is a bug.
  - **The audit's examples** read "Email, gym, daygame…".
- **Paying unlocks only the dating tools** (Scenarios, Ask Coach, Inner Game). Every lock leads to "Master Daygame
  From Home". Checkout still cannot grant access: there is no Stripe webhook. That is an old, known gap and not
  part of this plan.
- **Old test images can be opened on the public address**, though no live page uses them: competitor screenshots
  (one named `daygame-com.png`), photos of women, unused icon drafts.
- **There is no link-preview picture**, so a link shared on Instagram or WhatsApp shows no brand at all.
- New users already land on Home, not on the dating questions. Routing is not dating-first.

## What changes

1. **The name** "10K Days Club" (short form "10K Days" where space is tight) goes into every place above.
2. **A new front page:** his campaign line and three doors (Life, Quit, Dating). Each door opens its own page.
   Life's page is new. Quit's page is the existing `/quit`. Dating's page is today's front page, kept in its look,
   with the untrue "Join hundreds of men" removed and its prices moved out.
3. **A pricing page** that says plainly what is free (plan, Time Log, training, audit, Black Box) and what a
   subscription unlocks (the dating tools). Prices and plan names are unchanged; they are his to set.
4. **A new look system:** he picks one of three clickable looks (Phase 2). Under every look sits one rule set, and
   tests enforce it: colours only from the theme file, each part's colour chosen by the address, one logo, one
   name.
5. **A new logo:** three taste questions, then a page with up to six marks. The crosshair (a gun sight, the old
   mark) is replaced on the header, the sign-in pages, the browser tab icon, the iPhone and Android icons, the
   quit share picture and the new link-preview picture.
6. **Inside the app, dating moves back but stays whole:**
   - The bottom bar becomes **Home · Plan · You**.
   - Activity becomes **The Field**, under Dating.
   - Home gets one **Dating** tile that opens the dating tools; the Field card shows only once a field session has
     been logged.
   - All tools lists **Life, Quit, Dating** in that order. The Black Box moves under Quit.
   - The dating questions and preferences on You move into a **Dating** section lower down.
   - **Daily reflection** (generic questions) gets its own row under Life. The weekly field review stays in The
     Field, because it counts approaches.
   - The Family and Friends goal bug is fixed.
   - The audit's examples become neutral.

## What goes to the side (hidden from menus; page, address and data stay; one line brings each back)

- "Cold Approach – coming soon" in All tools.
- Articles (an empty "Content coming soon" page with a "Daygame Tactics" section).
- "Your Progress / Levels & XP – coming soon" on You.
- The unused test-image folders: moved out of the public folder into `assets-aside/` in the repo. Nothing is
  deleted.

## What stays exactly as it is

- The dating tools and every word inside them: Scenarios, Ask Coach, Inner Game, The Field's sessions, reports and
  achievements, the dating questions.
- Your plan's areas (his own pick of 2026-11-18) and his data. Internal names, browser storage, the database.
- Prices and plan names.
- Page addresses (The Field stays at `/tracking`; visitors rarely see addresses, and renaming them risks the
  session tracker and the offline list).
- The old address `daygame-coach.vercel.app` keeps working until every device has moved (Phase 8).

## Can he go back in time, and will he lose data?

- **Code and words: yes.** Every saved version since 2026-01-20 can be reopened. Phase 0 adds the bookmark
  `before-10kdays-rebrand` and takes before-screenshots of every page, so the old site can be *seen* without
  anyone starting it.
- **Data:** a full backup was taken on 2026-11-18 (`~/dg-backups/full-2026-11-18/`, 99 tables plus logins, counts
  checked, encrypted copy on OneDrive). Phases 1–7 write nothing to his data. The only outside settings they touch
  (email sender name and email text) were saved before.
- **The risk is the new address, not the name.** A browser keeps some things per address: the quit tools'
  answers, the old vice module's data, and sets, audit answers or timer stops waiting to be sent. So Phase 8 builds
  a small **move page**. He opens it on each device and it carries that data across. The old address forwards only
  after he confirms every device. The old address is never deleted.

---

## Before anything: what only the owner decides

| # | Decision | Recommendation | Costs money? | When |
|---|---|---|---|---|
| O1 | Go: pasting the prompt at the end of this plan is the go for Phases 0–7 | — | No | Now |
| O2 | Let Claude into the Vercel account that owns the live site (`jonas879-8953s-projects`): approve one device-login link | Approve the link | No | Before Phase 8 |
| O3 | Buy **10kdaysclub.com**, auto-renew on, in that same Vercel account (Domains → Buy). Still free on 2026-11-19 (RDAP 404) | Buy it there | **Yes**, about USD 10–20 a year; his click | Before Phase 8 step 4 |
| O4 | Claim the free handles: Instagram @10kdaysclub, YouTube @10kdaysclub | Same day as the domain | No | Any time |
| O5 | Rename the GitHub repo `Daygame_coach` → `10kdaysclub` and make it private | Yes, both | No | Phase 9 |
| O6 | List every device and browser he uses the site on, and whether it is installed on the home screen | — | No | Before Phase 8 step 5 |
| O7 | **Pick a look** on the looks page (Phase 2), and mark the proposed look rules | — | No | End of Phase 2 |
| O8 | **Answer three logo questions, then pick a mark** (Phase 4) | — | No | Phase 4 |

## Which model runs what

| Work | Model | How |
|---|---|---|
| This plan and its words | Opus | the planning session (done) |
| The three looks (design) and the six logo marks (design) | Opus | a subagent, `model: "opus"`, given the brief in this plan |
| Everything else: code, pages, settings, screenshots, checks | Sonnet | the build session, `/model sonnet` |
| Grep gates, screenshot-vs-checklist comparisons | Haiku | subagents, `model: "haiku"` |
| Final hunt for any old brand left | Opus | one review subagent in Phase 7 |

---

## BLOCKERS (each attempted on 2026-11-18 or 2026-11-19)

| ID | What | Attempted, and what came back | Blocks | Recommendation |
|---|---|---|---|---|
| B1 | Vercel account that owns the live site | `vercel whoami` → `reachjvc-1930`, which sees only `v0-ai-daygame-coach`. The live site is under team `jonas879-8953s-projects` | Phase 8 (names, domain, env, forward) | O2 |
| B2 | The domain | 2026-11-19: `rdap.verisign.com/com/v1/domain/10kdaysclub.com` → 404 (free); `10kdaysclub.vercel.app` → 404 (free) | Phase 8 step 4 | O3 |
| B3 | Live front page crash (was 500 on 2026-11-18) | 2026-11-19: `curl https://daygame-coach.vercel.app/` → **200**, healthz buildId `706c5e2d` | Nothing | Solved by another session; drop |
| B4 | Supabase settings outside the repo | Read 2026-11-18 (fields only): `site_url` and `uri_allow_list` name only the old host; sender "DayGame Coach" through his Gmail; confirmation and reset templates say "DayGame Coach" twice each; Vault `notifications_clock_url` → old host. Old values saved in `~/dg-backups/full-2026-11-18/settings-before-auth.json` and `settings-before-vault.json` | Nothing | Phase 1 changes the sender and text; Phase 8 the addresses |
| B5 | Stripe product names (shown on Stripe's checkout page) | Not in the repo: no code sends a product name; the names live in the Stripe dashboard behind price ids `price_1SjG…` in `src/home/products.ts` | Only the checkout page's wording | Phase 7 checks what Stripe's checkout shows. If it shows the old name, write it under "Questions from the build": renaming is his click in Stripe |
| B6 | The repo is public | — | Nothing may name a competitor, quote a forum or hold private data in commits | The looks page and logo board are private artifacts. The repo gets neutral ids only |

## OPEN QUESTIONS (each has a recommendation; the build follows it unless he vetoes)

| # | Question | Recommendation | Alternative | Cost if wrong |
|---|---|---|---|---|
| Q1 | Bottom bar once Activity leaves | **Home · Plan · You**, with a Dating tile on Home | Home · Plan · Training · You | Small: one list in `navTabs.ts` |
| Q2 | Where the weekly review and daily reflection live | Weekly field review stays in The Field (it counts approaches). Daily reflection becomes a Life row in All tools and stays in The Field's quick actions too | Fold daily reflection into Your plan's Journal | Small |
| Q3 | His modular "one place to track anything" idea | Kept for later. The Field keeps its "Edit tiles". A general tracker is new work, not rebrand | Build it now | None now |
| Q4 | You page tab names "Sandbox" and "Game" (both are dating settings) | Rename to "Scenarios" and "Dating" | Leave as is | Small |
| Q5 | Rename internal names (code, database, browser keys, `SEED_CREATED_WITH`, `package.json`, the PC folder) | **No.** Browser keys hold his data, and nobody sees the rest | Rename them | High: data loss for no visible gain |
| Q6 | Old documents and plans that say "daygame" | Leave them: they are the record | Rewrite history | None |
| Q7 | Page addresses (`/tracking` for The Field, `/dashboard` for Home) | Keep | Rename with redirects | Medium: service-worker list, push links, specs |
| Q8 | Repo private (also `Plans/platform.md` A4) | Yes | Keep public | Medium: history stays public |

---

## PHASES

Order: **0 → 1 → 2 → (his look pick, O7) → 3 → 4 questions → 5 and 6 → (his logo pick, O8) → 4 build → 7.**
Phases 8 and 9 follow when O2, O3, O5 and O6 arrive.

Every phase: work in a worktree, ship by fast-forward (memory `shared-checkout-tool-quirks`); commit with
`git commit --only <paths>`; run `node scripts/typecheck-ratchet.mjs` before pushing; after the push, wait until
`https://daygame-coach.vercel.app/api/healthz` names the commit. Then mark the phase done here with its commit sha.

### Phase 0 — Safety net (Sonnet; nothing visible changes)

Steps 2 and 3 of the old plan were done on 2026-11-18:
- Backup in `~/dg-backups/full-2026-11-18/` (schema, roles, data, JSON per table, README with restore steps; all 99
  tables plus login accounts, counts checked).
- Encrypted copy at OneDrive `daygame-backups/full-2026-11-18.tar.gz.gpg`.
- `settings-before-auth.json` and `settings-before-vault.json` saved in the same folder.

Left to do:
1. `git tag before-10kdays-rebrand <main sha at start>`, then `git push origin before-10kdays-rebrand`.
2. Before-screenshots, phone width (390×844) and desktop (1440×900), saved to
   `~/.cache/daygame-research/rebrand/before/`:
   - **Signed out, live site:** `/`, `/auth/login`, `/auth/sign-up`, `/auth/forgot-password`, `/privacy`, `/quit`,
     `/quit/coaching`.
   - **Signed in, local test stack** (never the live database): `/dashboard`, `/tools`, `/tracking`, `/settings`,
     `/plan`, `/scenarios`, `/inner-game`, `/training`, `/time`, `/audit`, `/plan/quit-vice`.
   - **How the signed-in run worked on 2026-11-19:**
     - Detached worktree with `node_modules` symlinked.
     - `next dev --webpack -p <free port>` with `NEXT_DIST_DIR=.next-rebrand`.
     - Supabase variables from `node scripts/db/test-stack.mjs env`.
     - A user made with the admin API: `POST http://127.0.0.1:55321/auth/v1/admin/users`, `email_confirm: true`.
     - Headless Playwright.
     - Memory `worktree-e2e-servers` has the traps.

**Done when:** the tag is on GitHub and both screenshot sets exist.

### Phase 1 — The name, everywhere it does not depend on the look (Sonnet)

Every text is decided in Part 3; the builder writes no words of its own.

1. **New file `src/shared/brand.ts`:**
   `export const BRAND = { name: "10K Days Club", short: "10K Days", domain: "10kdaysclub.com" } as const`.
   Every change below reads from it.
2. **`app/layout.tsx`:**
   - `title: { default: BRAND.name, template: "%s · " + BRAND.name }`.
   - `description` = W1 (Part 3).
   - `appleWebApp.title: BRAND.short`.
3. **`app/manifest.ts`:**
   - `name: BRAND.name`, `short_name: BRAND.short`, `description` = W2.
   - Do **not** touch `id`, `start_url`, `scope`, `shortcuts` or `icons`.
4. **One name and one mark component:**
   - Make `components/BrandMark.tsx`: the crosshair SVG exactly as it is in `components/AppLogo.tsx` today, with a
     `size` prop.
   - `AppLogo.tsx` renders `<BrandMark/>` plus `BRAND.name`.
   - The five auth pages draw their own copy of the crosshair and the text "DayGame Coach". Replace each with
     `<BrandMark/>` + `BRAND.name`:
     - `app/auth/login/LoginPageClient.tsx:119`
     - `app/auth/sign-up/page.tsx:105`
     - `app/auth/forgot-password/page.tsx:64`
     - `app/auth/reset-password/page.tsx:86`
     - `app/auth/sign-up-success/SignUpSuccessClient.tsx:75`
   - From then on the logo is swapped in one file (Phase 4).
5. **Quit tools:** `src/quit/data/frame.json` `siteName` → `"10K Days Club"`. The header in `app/quit/layout.tsx`
   and the share image in `app/quit/[addiction]/card/route.tsx` follow.
   - Another session is working in `src/quit/**` (`Plans/quit-copy.md`). Pull first, and touch only this one field.
6. **Notification help, `src/notifications/components/PushDeviceCard.tsx`:**
   - `:68` → "Find 10K Days and switch Allow Notifications on."
   - `:127` → "Open **10K Days** from its icon and come back here" (keep the existing bold markup).
7. **Time Log:**
   - `src/timetrack/config.ts:105` `CREATED_WITH` → `"10kdaysclub"`.
   - **Leave `SEED_CREATED_WITH` (line 111) unchanged**: demo detection matches saved rows against it.
8. **`public/icon.svg:2` comment** → `<!-- Brand mark - 10K Days Club -->`.
9. **Audit examples:**
   - `src/audit/components/ActivityField.tsx:49` → W3.
   - `src/audit/components/PerfectWeek.tsx:175` → W4.
10. **Stopgap on today's front page** (`src/home/components/HomePage.tsx`; the page itself is replaced in Phase 5):
    - `:187` "Join hundreds of men…" → "Practise at home, then take it to the street." It is not true: he is the
      only user.
    - `:203` footer → "© 2026 10K Days Club".
11. **Emails, through the Supabase management API** (PATCH the fields named here, nothing else):
    - `smtp_sender_name` → "10K Days Club".
    - In the confirmation and recovery templates, replace "DayGame Coach" with "10K Days Club" (4 places) and
      change nothing else.
    - Old values are already in the backup folder. After the PATCH, read the fields back and compare.
12. **Put the test images aside:** `git mv` these five folders from `public/` into a new top-level
    `assets-aside/`: `competitors`, `african women`, `new archetypes`, `goal pictures`, `icon-candidates`.
    - No live or lab page uses them (checked 2026-11-19).
    - Add `assets-aside/README.md`: "Moved out of public/ on <date> by the rebrand plan so the live site stops
      serving them. Nothing deleted."
    - `public/marcus-test/` stays: `app/test/marcus-loop` uses it.
13. **Tests:**
    - Add `tests/unit/shared/brandName.test.ts`: `app/layout.tsx`, `app/manifest.ts`, `components/AppLogo.tsx`,
      the five auth files and `src/quit/data/frame.json` contain no `daygame` (case-insensitive).
    - Update any spec or unit test that asserts the old name: grep `tests/` for `DayGame Coach|Daygame Coach|AI
      Daygame`.
    - Run vitest and the type-check ratchet.

**Done when:**
- The grep gate in Phase 7 step 1 passes for these files.
- The live `/`, `/auth/login` and `/quit` show "10K Days Club" in the tab and the header.
- Pushed, and healthz names the commit.

### Phase 2 — The looks page: three clickable looks (Opus designs, Sonnet publishes; ends at O7)

**Goal:** he clicks through the same screens in three looks and picks one.

1. **Check the three named systems first.** Each look copies how a real product with several parts handles one
   umbrella brand (memory `copy-named-system-first`). The three below are **from memory, not checked**. The
   designer subagent looks at each one's real app or site screenshots (App Store or Play listings, the product's
   own site) before copying. If one does not hold up, it is replaced by a checked one, and the page says so.
   - **Look A, "One colour":** like Strava. One brand colour everywhere (today's orange `#ff6b35` on charcoal
     `#121212`). Parts are told apart by icon and name only. This is the nearest to today.
   - **Look B, "A colour per part":** like Apple Health's categories. The umbrella is neutral (charcoal, white, an
     orange logo). Life, Quit and Dating each have their own colour, used on their tiles, page headers and
     buttons. **Dating keeps today's orange.**
   - **Look C, "A family of sub-brands":** like the Nike Run Club / Nike Training Club pair, or Duolingo's subject
     courses. Each part is a named sub-brand ("10K Days · Life", "10K Days · Quit", "10K Days · Dating") with its
     own colour and a small badge of its own, under one shared logo. **Dating keeps today's orange.**
   - Rules for the new colours (B and C):
     - Clear contrast on `#121212` (WCAG AA for text on its own background).
     - Not to be confused with the red used for delete (`#e63946`) or the green used for success (`#34d399`).
     - The designer proposes two choices per part on the page; he picks.
2. **One HTML artifact, phone-first** (a 390 px phone frame, centred on a desktop).
   - A look switcher A / B / C at the top.
   - Inside the frame, every screen below is clickable to the next, as the real site would be:
     1. Front page `/` (Part 3, W10–W14).
     2. Life door `/life` (W20–W25).
     3. Quit door `/quit` (today's page, re-skinned only).
     4. Dating door `/dating` (W30–W35, today's look).
     5. Pricing `/pricing` (W40–W43).
     6. Sign up.
     7. Signed-in Home: 6 tiles, the Plan card, the Field card.
     8. All tools (Life / Quit / Dating).
     9. The Dating tools page.
     10. The Field (today's Activity, renamed).
     11. Your plan (Today step, one screen).
     12. Black Box (one screen).
     13. You.
   - Use the real words from Part 3 and today's real screens: start from the Phase 0 screenshots and redraw them.
     No lorem ipsum.
   - The logo spot shows the words "10K Days Club" in the site font, labelled "logo comes in step 4", in every
     look. That keeps the looks comparable.
3. **On the page, visible without a click** (memory `review-boards-note-log`):
   - For each look: a 👍 and a note box that saves by itself while he types, with a green "✓ Saved" badge and his
     earlier notes listed.
   - The same for each screen within each look.
   - A section **"Rules that keep it coherent (proposed)"** listing the rules R1–R5 of Phase 3, each with 👍 and
     a note box.
   - Load the `artifact-design` and `artifact-capabilities` skills before writing it. Store data in the page's
     db: `likes/<key>` `{liked, at}` and `notes/<key>` `{notes:[{text,at}], note}`.
   - Test the page with a fake `window.claude` store, including a failed save, before publishing.
4. Publish it and post the link in chat (never `open`). Write the URL into this plan. Stop.

**Done when:** the page is published, the link is posted, and the plan names the URL. **The build stops here for
O7.** Phase 3 starts only after his pick, read from the page's db and from his chat words.

### Phase 3 — The look system and its rules (Sonnet, after O7)

1. **Tokens:** in `app/globals.css`, add `--facet-life`, `--facet-quit`, `--facet-dating` (plus `-foreground`)
   with the picked colours. In Look A all three equal `--primary`.
2. **One map from address to part:** new `src/shared/facets.ts`.
   - `export type Facet = "brand" | "life" | "quit" | "dating"` and `facetFor(pathname): Facet`.
   - **life:** `/life`, `/plan` (except `/plan/quit-vice`), `/training`, `/time`, `/audit`, `/tracking/daily`.
   - **quit:** `/plan/quit-vice`, `/quit`.
   - **dating:** `/dating`, `/scenarios`, `/coach`, `/inner-game`, `/articles`, `/tracking` (except
     `/tracking/daily`), `/tools/dating`.
   - **brand:** everything else (`/`, `/dashboard`, `/tools`, `/settings`, `/auth`, `/pricing`, `/privacy`).
   - Use `ROUTES` and `isUnder` from `src/shared/routes.ts`. Never type an address.
3. **Apply it:**
   - Set `data-facet` on the element that wraps **every** page, including pages that hide the frame (`/plan`,
     `/time`, `/training/live`). That is the wrapper in `app/(app)/layout.tsx`, plus `app/quit/layout.tsx` and the
     public layouts.
   - In CSS, `[data-facet="quit"] { --primary: var(--facet-quit); --ring: var(--facet-quit); }` and the same for
     the other parts. Every component that already uses `primary` follows by itself.
   - Look C also shows the part's badge beside the logo.
4. **The coherence rules,** as he asked ("enforce rules long term"). Write them in a new `docs/product/look.md`,
   each with the test that holds it. Show them on the looks page as proposed first (Phase 2).
   - **R1. Every colour comes from the theme file.** New `tests/unit/shared/colourRatchet.test.ts`, built like
     `tests/unit/lintRatchet.test.ts`:
     - Count, per live `.tsx` file (not `app/test/**`, not `**/lab/**`), Tailwind palette classes
       (`(text|bg|border|ring|fill|stroke|from|via|to)-(red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose|zinc|slate|gray|neutral|stone)-\d{2,3}`)
       plus raw `#rrggbb`.
     - Compare against `colour-baseline.json`. A file's count may only fall, and a new file starts at 0.
     - On 2026-11-19 there were 1,724 palette uses in 220 files and 284 raw hex values in 60 files. The baseline
       records today's counts. It forbids new ones; it does not demand a rewrite.
   - **R2. A part's colour is chosen by the address, never by the page.** `tests/unit/shared/facets.test.ts`:
     every address in `ROUTES` maps to a part, and the map holds the lists in step 2.
   - **R3. One name, one logo.** Extend `brandName.test.ts`:
     - The literal `10K Days Club` appears only in `src/shared/brand.ts` and the JSON data files.
     - No live file outside `components/BrandMark.tsx` draws the brand mark.
   - **R4. Every page title reads "<Page> · 10K Days Club".** A test that every live `page.tsx` either sets
     `metadata.title` (itself or through its layout) or is on a short list of pages that keep the default.
   - **R5. The same building blocks everywhere:** buttons, cards, inputs and tabs come from `components/ui/`. This
     is a review check in `look.md`, not a test.
   - Replace the stale line in `.claude/rules/ui.md` ("Fresh users land on `/preferences`") with "Fresh users
     land on `/dashboard`" and a pointer to `docs/product/look.md`.
5. **Convert on the screens of the looks page only:** hard-coded orange (`text-orange-*`, `bg-orange-*`, `#ff6b35`,
   `#f97316`) on those screens becomes `primary`, so each part's colour shows there. Lower the baseline in the same
   commit.

**Done when:**
- The tests pass and the baseline is committed.
- Phone screenshots of the looks-page screens on the local stack match the picked look. A Haiku subagent compares
  the pairs and lists every difference; fix each difference or write it down.
- Pushed.

### Phase 4 — The logo and icons (questions after O7; Opus draws; Sonnet builds after O8)

1. **Ask him, with AskUserQuestion, word for word:**
   - "Should the new mark be letters (like '10K'), a symbol, or both together?" Options: Letters / A symbol /
     Both.
   - "Which feeling should it give first?" Options: Steady and serious / Bold and energetic / Warm and friendly.
   - "What colour should the logo itself be?" Options: Today's orange / White, so each part's colour sits beside
     it / The colour of the part you are in.
2. **Opus subagent draws six marks** as SVG on a 32×32 grid that also reads at 16 px.
   - Original work: no copy of an existing logo, nothing that resembles a target or a gun sight.
   - A board artifact shows each mark at 16 px (tab), 32 px, 180 px (iPhone icon, rounded mask), 512 px (Android,
     circle mask), and in the header beside "10K Days Club", on `#121212`.
   - 👍 and a self-saving note box per mark, as in Phase 2.
   - Publish it, post the link, write the URL here. **The build stops for O8**; Phases 5 and 6 go on meanwhile.
3. **After his pick:**
   - Swap the SVG inside `components/BrandMark.tsx`.
   - Regenerate `public/icon.svg`, `apple-icon.svg`, `icon-dark-32x32.svg/.png`, `icon-light-32x32.svg/.png`,
     `icon-192.png`, `icon-512.png`, `icon-maskable-192.png`, `icon-maskable-512.png`, `apple-icon.png` and
     `app/favicon.ico`. Maskable files keep the mark inside the 80 % safe zone.
   - The quit share image (`app/quit/[addiction]/card/route.tsx`) draws the new mark.
   - Add `app/opengraph-image.tsx` (1200×630): mark, "10K Days Club" and W1. Add `metadataBase` in
     `app/layout.tsx` from `process.env.NEXT_PUBLIC_APP_URL`, falling back to `https://daygame-coach.vercel.app`
     until Phase 8.
   - If Look C was picked: one small badge per part, in the same style.

**Done when:**
- The live tab icon, the header and the five sign-in pages show the new mark.
- `/manifest.webmanifest` icons open and show it.
- A link to the site pasted into a link-preview checker shows the new picture.

### Phase 5 — The public pages (Sonnet, after Phase 3; logo swap lands later by itself)

1. **Routes:**
   - In `src/shared/routes.ts`, add `life: "/life"`, `dating: "/dating"`, `pricing: "/pricing"`,
     `datingTools: "/tools/dating"`.
   - `isPublicPage` adds `/life`, `/dating` and `/pricing`.
   - `tests/unit/navigation/routeList.test.ts` must still pass.
2. **Front page `/`:** replace the body of `src/home/components/HomePage.tsx` with W10–W14.
   - Keep the `#pricing` behaviour as a redirect: `/#pricing` scrolls nowhere now, so the hash effect sends the
     visitor to `/pricing`.
   - Signed in, the page still wears `AppFrame`, as today.
3. **Life door `/life`:** a new page with W20–W25, in the life part's colour.
4. **Dating door `/dating`:** today's front page, moved, not redrawn.
   - Move the current hero, the three cards and the closing call into `src/home/components/DatingPage.tsx`, with
     the words W30–W35.
   - The pricing section is **not** on this page any more: its button "See prices" goes to `/pricing`.
5. **Pricing `/pricing`:** the existing pricing cards (`PRODUCTS`, `CheckoutButton`) on their own page, with
   W40–W43.
   - `src/home/products.ts`: names, descriptions and prices untouched. Feature lines become W43.
6. **Every lock and "See plans" link goes to `/pricing`:**
   - `src/hometab/tileAccess.ts:8` `PAYWALL_HREF` → `ROUTES.pricing`.
   - `app/(app)/coach/page.tsx:27` follows it.
   - The You page's Billing "View Plans".
   - The Scenarios preview call that tells a signed-in user to "Sign up… Get Started Free" (`ScenariosPage` /
     `ScenariosHub`): say W45 with a "See prices" button to `/pricing`.
   - Grep `#pricing` across `src/` and `app/` and change every hit.
7. **Titles:**
   - `/` keeps the default "10K Days Club".
   - `/life` → "Life", `/dating` → "Dating", `/pricing` → "Prices".
   - Sign in → "Log in", sign up → "Sign up", `/quit` → "Quit something".
   - A `"use client"` page gets its title from a sibling `layout.tsx`.
8. **Tests:**
   - e2e or unit tests for: the three doors link right; `/pricing` lists three plans; a locked tile leads to
     `/pricing`; `/life`, `/dating` and `/pricing` open signed out.
   - Update specs that click "View Pricing", "Get Instant Access" on `/`, or expect `#pricing`.

**Done when:** live phone screenshots of the five public pages match the looks page, there is no sideways scroll
at 390 px, and the tests pass.

### Phase 6 — Inside the app: dating moves back, stays whole (Sonnet, after Phase 3)

1. **The bar (`components/navTabs.ts`, `TABS`):** Home · Plan · You.
   - Remove the Activity entry.
   - Keep the `testId`s of the remaining tabs.
   - Fix every spec that used `tab-tracking`.
2. **The Field:**
   - Tool `{ id: "field", label: "The Field", short: "The Field", icon: Footprints, href: ROUTES.tracking,
     group: "dating", access: "open", tile: false }`. It replaces the "Field session" row, which pointed at
     `/tracking/session`; the session tracker stays reachable from The Field's own "Start Session".
   - `src/tracking/components/ProgressDashboard.tsx` heading "Activity" → "The Field". The subtitle stays.
   - `ROUTE_LABELS` gives `/tracking` the label "The Field".
   - Page title "The Field" (through `app/(app)/tracking/layout.tsx`).
3. **Groups:**
   - `Tool.group` becomes `"life" | "quit" | "dating"`. The Black Box moves to `"quit"`.
   - `src/hometab/components/ToolsPage.tsx` shows the groups in the order Life, Quit, Dating, with headings W50.
   - `ToolsPage` takes an optional group. A new page `app/(app)/tools/dating/page.tsx` shows only Dating, with
     heading and intro W51.
   - Add the route to `TAB_ROUTES`.
4. **Home tiles (`TOOLS` order and `tile` flags):** Training, Time Log, Audit, Black Box, **Dating** (a new tile:
   icon `Heart`, href `ROUTES.datingTools`, label "Dating"), All tools.
   - Scenarios, Ask Coach and Inner Game get `tile: false`. They stay in All tools and on the Dating page with
     their locks.
   - `Heart` is registered in `src/shared/iconRoles.ts` as "dating life area", so this reuse matches its meaning.
     Write the reuse into that registry's entry (`.claude/rules/ui.md` asks for it).
5. **Home Field card** (`src/hometab/components/HomeCards.tsx`, `FieldCard`):
   - Title "The Field". Link text "See your stats" → "Open The Field".
   - Render it only when the user has **ever** logged a field session. Use the existing sessions repo with a count;
     no new table. He has sessions, so he keeps the card.
6. **Daily reflection:** new Life tool `{ id: "daily", label: "Daily reflection", short: "Reflect", icon:
   NotebookPen, href: ROUTES.trackingDaily, group: "life", access: "open", tile: false }`.
   - `NotebookPen` is not in `src/shared/iconRoles.ts` (checked 2026-11-19); register it there as "daily
     reflection".
   - The Field's quick actions keep their Daily Reflection button.
7. **Put aside, each as a one-line change with a comment "put aside by the rebrand, <date>":**
   - `COMING_TOOLS` emptied ("Cold Approach").
   - The `articles` entry removed from `TOOLS`. `/articles` still opens by its address.
   - On You, the "Your Progress" block (Levels & XP "coming soon", Total Scenarios, Avg Score) is not rendered.
8. **You page (`src/settings/components/SettingsPage.tsx`):**
   - The "Answer the dating questions" block (`DatingAnswers`, now first on the page) and the "Your Preferences"
     card (age range, region, archetypes, experience) move to the end of the Profile tab, under a heading
     "Dating".
   - Tabs "Sandbox" → "Scenarios" and "Game" → "Dating" (Q4). Keep their `value`s and `data-testid`s.
   - Billing line W46.
9. **Plan goal bug:** in `src/goals/components/north-star/GoalLibrary.tsx`, the Family (`lm_family`) and Friends
   (`lm_friends`) areas must not show the relations pillar's dating objectives ("Get a Girlfriend", "Date
   Abundantly", "Build Inner Game").
   - Show the same note `src/goals/data/northStarBuild.ts` already gives those areas ("The goal catalogue has
     nothing for family…" and its Friends counterpart).
   - Add a unit test for both areas.
10. **Page titles** (through layouts where the page is a client component):
    - Home, All tools, Dating, The Field.
    - Your plan, Black Box, Training, Scenarios, Ask Coach, Inner Game, You.
    - `/time` and `/audit` already set theirs.
11. **Tests:**
    - `tests/unit/navigation/*` and `tests/unit/hometab/*`.
    - e2e specs that open Activity, `tab-tracking`, the More sheet or the Field card.
    - New unit tests:
      - the bar has three tabs;
      - every tool has a group, and the Black Box is `quit`;
      - the Field card is hidden for a user with no sessions;
      - `/tools/dating` lists exactly Scenarios, Ask Coach, Inner Game, The Field and Your dating answers.

**Done when:**
- Local phone screenshots of Home, All tools, Dating, The Field and You match the looks page, and so do the live
  ones after the push.
- Tests pass and the push is live.

### Phase 7 — Prove it (Haiku runs, Opus judges)

1. **Grep gate:** `git grep -n -i -E "daygame|day game|AI coach"` over `app/layout.tsx`, `app/manifest.ts`,
   `app/auth`, `components/AppLogo.tsx`, `components/BrandMark.tsx`, `src/home`, `src/hometab`,
   `src/quit/data/frame.json` and `src/notifications/components` → empty.
2. **Live HTML:** the `<title>` and the meta description of `/`, `/life`, `/dating`, `/pricing`, every `/auth/*`
   page, `/quit`, `/quit/coaching` and `/privacy` contain no "daygame". `/manifest.webmanifest` says "10K Days
   Club". (`/dating`'s body may say daygame: that is the Dating door.)
3. **One before/after page for him:**
   - The Phase 0 screenshots beside phone screenshots of the same pages now, plus the new pages.
   - 👍 and a self-saving note box per pair.
   - Signed-in pages come from the local test stack. Publish it and post the link.
4. **Emails:** with the service key, `auth.admin.generateLink` for a test address (types `signup` and `recovery`).
   The template text says "10K Days Club". No real email is sent.
5. **Stripe:** open one checkout session from `/pricing` in headless Chromium, read the product name it shows,
   then close it. Pay nothing. If it shows the old name, write it under "Questions from the build" (B5).
6. **An Opus review subagent,** given only the live URLs and the local stack, hunts for any old brand or
   dating-first framing outside the Dating part. Fix what it finds, or write it down here.

### Phase 8 — The new address (Sonnet; needs O2, then O3, then O6)

Unchanged from the 2026-11-18 version. In order:

1. **Supabase accepts both addresses** (additive only): `uri_allow_list` adds `https://10kdaysclub.vercel.app/**`
   and `https://10kdaysclub.com/**`, keeping every old entry.
2. **The move page `app/move/page.tsx`** (public, same code on both addresses):
   - **Step 1, "Send what's waiting":** runs the existing syncs: time tracker, workout queue, audit queue, Black
     Box, Life plan. It asks the service worker to flush IndexedDB `timer-stops`, and shows each as "sent" /
     "nothing waiting" / "could not send: sign in and retry".
   - **Step 2, "Carry the rest":** packs `quit-v1`, `quit-vice-v1`, `custom-program-v1` and `plan-due-hidden:*`
     into `https://<new address>/move#carry=<base64url JSON>`.
     - The `#` part never reaches a server.
     - On arrival, each key is written only if it is empty there. Otherwise both are kept (`quit-v1` →
       `quit-v1-from-old`), and the page says so.
     - A "Download as file" / "Load from file" fallback covers data over 1.5 MB.
   - **Step 3, "Done":** counts per key.
   - Unit tests for pack and unpack and for "never overwrite". An e2e test on two local ports.
3. **A switch in `proxy.ts`:** when env `OLD_HOST_REDIRECT=on` and the host is `daygame-coach.vercel.app`, answer
   308 to the same path on the new host, except `/move`, `/sw.js` and `/api/*`. Off by default. Unit test.
4. **Vercel (after O2):**
   - Rename the project to `10kdaysclub` and add `10kdaysclub.vercel.app`. Keep the old address attached for good.
   - Read the deployment-retention setting and write it here.
5. **The domain (after O3):**
   - Add `10kdaysclub.com`, with `www` forwarding to the bare domain.
   - Set the env `NEXT_PUBLIC_APP_URL` = `https://10kdaysclub.com` and redeploy.
   - Supabase `site_url` → the new address.
   - Vault `notifications_clock_url` → `https://10kdaysclub.com/api/notifications/tick`: the one database write in
     this plan; the old value is in the backup. Then check that `cron.job_run_details` shows the next runs
     succeeding.
   - `src/notifications/pushService.ts:116` fallback → `https://10kdaysclub.com`.
6. **Devices (after O6), one at a time, with him:**
   1. Open the old address's `/move` (inside the installed app if installed). Wait for "all sent", then carry the
      data across.
   2. Sign in on the new address and check Time Log, the plan and the Black Box.
   3. Install the app from the new address and turn notifications on.
   4. Remove the old device row under You → Notifications, and the old icon.
   - Afterwards, Claude checks that `push_devices` holds only new-address rows.
7. **After he says every device has moved:** `OLD_HOST_REDIRECT=on`, then redeploy.
   - `curl -I https://daygame-coach.vercel.app/plan` → 308 to the new address.
   - `/move` still answers 200.

### Phase 9 — Housekeeping names (Sonnet; needs O5)

1. Rename the repo and make it private:
   - `gh repo rename 10kdaysclub`, then `git remote set-url origin git@github.com:reachjvc/10kdaysclub.git`.
   - `gh repo edit --visibility private --accept-visibility-change-consequences`.
   - After each, push one commit and confirm that healthz shows it deployed. If Vercel stops deploying, he
     reconnects the repo in Vercel → Settings → Git.
2. Living docs only:
   - The `CLAUDE.md` opening line.
   - `docs/product/map.md`: title, the bar (Home · Plan · You), The Field, the three parts.
   - Memory notes that name the old address in healthz checks.

---

# PART 2 — rules for the build session

- Never rename a browser key, database table or column, `SEED_CREATED_WITH`, the backup format string
  `daygame-timetrack-backup`, or the sessionStorage key `daygame_ended_session`.
- Never delete the old address, old push rows (he removes them in Phase 8), any data, or any file. Things put aside
  are hidden or moved, never deleted.
- Every outside setting change: confirm that the old value is in the backup folder first, then read the new value
  back.
- **Words not in Part 3 are not written by the builder.** A missing text goes under "Questions from the build"
  below, and the session moves on.
- Push every finished phase (the owner wants live deploys without asking). Batch commits: Vercel limits deploys
  per day (memory `vercel-late-deploy-rollback`).
- Other sessions share this tree: `Plans/quit-copy.md` works in `src/quit/**` and `app/quit/**`;
  `Plans/plan-in-steps.md` works in `/plan/new`. Pull before each phase and touch only the lines named here.
- **Main was red on 2026-11-19 for reasons outside this plan.** `tests/unit/infra/e2eSleepsAreTimed.test.ts` fails
  on a fixed sleep in two specs: `tests/e2e/plan-new-extras.spec.ts` (plan-in-steps session) and
  `tests/e2e/quit/lab-accountability.spec.ts` (quit-lab session). If it is still red when this build starts, say
  so in chat and do not "fix" it inside a rebrand commit.
- Anything for the owner to look at goes on an artifact page. Post the link and never call `open`. Every page has
  👍 and self-saving notes.
- Report to him in plain words, opening with done / live / not yet.

---

# PART 3 — the words (decided by Claude, **proposed** until he says yes; the builder copies them exactly)

Voice: plain, sure of itself, no hype, nothing untrue. "You", never "guys" or "bro". The umbrella pages speak to
men first without shutting women out. The Dating door speaks to men.

**Names:** brand "10K Days Club"; short "10K Days"; parts "Life", "Quit", "Dating"; "The Field" (was Activity);
bar "Home · Plan · You".

**Site-wide**
- W1 (meta description, link-preview line): "Plan the life you want, build the habits, quit what holds you back and
  get better at dating. One day at a time."
- W2 (phone install text): "Plan your life, track your days, quit what holds you back."
- W3 (audit activity example): "Email, gym, reading…"
- W4 (perfect week example): "Write the book, Gym, Date night…"

**Front page `/`**
- W10 small line above the headline: "10,000 days is about 27 years."
- W11 headline: "Ten years from now, you might be able to say… I DID IT."
- W12 under it: "Plan the life you want, build the habits that get you there, quit what holds you back, and get
  better at dating. One day at a time." Buttons: "Start free" (→ sign up) and "Log in".
- W13 the three doors, heading "Where do you want to start?":
  - **Life:** "Decide what you want in each part of your life, then live it: your plan, your days, your training,
    your time." Button "See the life tools" → `/life`.
  - **Quit:** "Free tools for the hard moments of quitting, and a private record of every try." Button "Quit
    something" → `/quit`.
  - **Dating:** "Practise conversations with an AI that answers like a real person, then go out and log what
    happens." Button "See the dating tools" → `/dating`.
- W14 closing: "Day one is today." / "Every day you count is one of the 10,000." Button "Start free". Footer:
  "© 2026 10K Days Club" · "Prices" · "Privacy".

**Life door `/life`**
- W20 headline: "Decide what you want. Then live it, one day at a time."
- W21 "Your plan": "A north star, the parts of your life under it, the goals and routines that get you there, and a
  Today page that shows what to do now."
- W22 "Time Log": "See where your hours really go, on your phone or your PC, with reports by project."
- W23 "Training": "Gym programs that step up the weight for you, set by set at the rack."
- W24 "Time & energy audit": "Two weeks of quarter-hour check-ins show what drains you and what builds your life."
- W25 closing: "Free with an account." Button "Start free".

**Dating door `/dating`** (today's front page, kept in its look)
- W30 badge "AI practice"; headline kept: "Master Daygame From Home"; line kept as today.
- W31 the three cards kept as today ("Realistic Conversations", "Scenario-Based Training", "Instant Feedback").
- W32 a fourth card, "The Field": "Log every approach when you are out, write field reports, and watch your numbers
  move."
- W33 a fifth card, "Inner Game": "Find the values you live by, so you go out as someone who knows where he is
  going."
- W34 closing kept: "Ready to Build Your Confidence?" / "Practise at home, then take it to the street."
- W35 buttons: "Start free" (→ sign up) and "See prices" (→ `/pricing`).

**Pricing `/pricing`**
- W40 headline: "Prices"
- W41 line: "Your plan, Time Log, Training, the audit and the Black Box are free with an account. A subscription
  unlocks the dating tools."
- W42 plan names, descriptions and prices: unchanged.
- W43 feature lines on every plan: "Scenarios: practise conversations with AI" · "Ask Coach" · "Inner Game" ·
  "Everything that is free stays free" · "Cancel anytime". The 2-month and yearly plans keep their "Save …% vs
  monthly" line.
- W44 (dropped: there is no contact address yet; the privacy email is still open in `Plans/quit-tool.md`).
- W45 Scenarios preview, signed in, not paying: "Subscribe to unlock every scenario." Button "See prices".
- W46 You → Billing: "Subscribe to unlock Scenarios, Ask Coach and Inner Game." Button "See prices".

**Inside the app**
- W50 All tools group headings: "Life", "Quit", "Dating". Page line kept: "Everything in the app. A lock means it
  opens once you subscribe."
- W51 Dating tools page: heading "Dating"; line "Practise at home, go out, look back."

---

## Questions from the build

(none yet)

## Execution prompt

See the end of the planning session's last message (2026-11-19); the same text is below.

```
/model sonnet
Read Plans/rebrand-10kdaysclub.md in full, then CLAUDE.md. Execute Phase 0, Phase 1 and Phase 2 in order,
following Part 2. Phase 2's designs come from one subagent with model "opus" given the Phase 2 brief and Part 3;
you publish its page and post the link in chat. Stop after Phase 2 and tell me in plain words what is live and
what I need to do (pick a look on the page). When I have picked, continue with Phase 3, ask me the Phase 4
questions, then build Phases 5 and 6 while the logo board waits for my pick, then Phase 4's build and Phase 7.
Do Phases 8 and 9 only when the plan's O2, O3, O5 and O6 are done. After each phase, mark it done in the plan
with its commit sha, push, and check healthz.
```
