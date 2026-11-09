# Site navigation: where everything lives once the site is more than dating

**Written 2026-11-09** for the owner and for the session that builds the comparison page.
**Status 2026-11-09: steps 1–5 done; waiting for the owner's marks (step 6).**
**Scope of this plan: a comparison page, then one decision. No app code changes.** Building the
chosen navigation gets its own plan after the owner picks.

## Owner-only items

None. The page is a private artifact; nothing costs money, deletes data or cannot be undone.

## The problem, in plain words

The site started as a dating coach and grew a life half. Today the phone bar is
**Dashboard · Training · Tracking · Your plan · Scenarios**, plus a More sheet with
**Time · Time & energy audit · Ask Coach · Articles · Settings** (`components/navTabs.ts`).
That mix has no rule: two dating things and three life things in the bar, the rest in a drawer.
Every new feature (forum, sleep, weight, perfect week, achievements, notifications) has nowhere
obvious to go, and the bar is already full: **six slots is the hard limit**, since a seventh
ran off-screen on every phone up to 390px wide (measured 2026-10-15).

What sorts the features:

| Kind | Features today | Coming (vision) |
|---|---|---|
| **Dating only** | Scenarios, preferences, Inner Game (only a Dashboard card reaches it), Ask Coach, field sessions (cold approach), levels/XP, articles | more scenarios (the premium tier, vision 6–7), forum, the owner's own articles |
| **Both** | Tracking (approaches + body stats), Your plan (dating is one life area), reviews, journal, achievements | modular tracking page (vision 4), more graphs (vision 5) |
| **Life only** | Training (gym), Time, Time & energy audit, Black Box (quit a vice; only reachable from inside Your plan) | sleep, weight, food trackers, perfect week |

Checked 2026-11-09 against the code: today's Dashboard is dating only (practice, coach, articles, level), not a mixed page; Settings sits in More.

Two facts push the design: the **premium tier is the dating part** (vision 6), so dating
needs one place that can be locked or sold as a unit; and **plan and tracking are one system**
(vision 1), so the shared things must not be split into a dating copy and a life copy.

## The five ways to compare

Each one copies how a named real app does it (rule: copy a named system, never an invented one).
The building session checks each app's real navigation from current screenshots before drawing it,
and corrects the description below where the app differs.

| # | Name | Copies (checked 2026-11-09) | Phone bar | Where dating goes |
|---|---|---|---|---|
| A | **Two worlds** | **Airbnb** (was Uber, wrong: Uber has no mode switch, Rides/Eats/Hotels are tiles). "Switch to hosting" at the bottom of Profile swaps the whole bar; Messages is in both bars | Life: Today · Plan · Body · Progress · Menu. Dating: Practice · Field · Learn · Progress · Profile. Switch at the bottom of Menu/Profile | its own world; locks as one unit |
| B | **Today + Browse** | Apple Health (Summary · Sharing · Browse; profile is a picture in Summary's corner) | Summary · Sharing · Browse; Sharing holds the forum when it comes | one category among Body, Time, Mind, Plan, Progress |
| C | **By what you do** | Strava (Home · Maps · Record · Groups · You; stats live in You, there is no Progress tab) | Today · Explore · ⊕ Record · Community · You; Record opens "field session / workout / timer / audit slot" | spread by verb: Explore, Record, Community |
| D | **By life area** | **Calm** (was Headspace, wrong: its areas are now tiles inside Explore). Calm's Sleep is its own tab with top tabs | Today · Dating · Life · Progress · Me; Dating and Life are hubs with top tabs | its own tab; shared things in Today and Progress |
| E | **Home + tool grid** | **Grab** (was Revolut/WeChat: Revolut's home is accounts, WeChat's grid is a pull-down). Grab: Home of service tiles + More + cards; bar Home · Payment · Activity · Messages; profile top corner | Home · Plan · Activity · Coach; profile top corner | dating tiles in the grid, a Dating group under More |

**My lean: D**, with C's ⊕ button as an add-on to try. Reasons: dating gets one tab, which
matches the premium tier; shared things (Today, Progress) stay single; a new feature joins a hub
as a row, so the bar never grows. Weak spot: "Life" may become a junk drawer of its own, which the
page must show honestly with all future features placed in it. The page shows the lean, and the
owner overrules it freely.

## What the comparison page shows

One artifact, phone first (375px frame, works at 320px).

1. **A tappable phone for each option.** Real feature names and icons, every current feature
   placed, the More sheet or hubs openable. No lorem ipsum.
2. **"Where does it go?" list per option:** every row from the table above, current and coming,
   with its place in that option. Nothing left out.
3. **Six everyday tasks, tap count per option:** start a field session, log a gym set, start a
   timer, open today's plan, ask the coach, fill an audit slot. Counted, not guessed.
4. **Two growth tests per option:** add a sleep tracker; add the forum. Show where each lands.
5. **Tier test:** how the dating part is locked for a non-paying user in that option.
6. **Pages that draw their own bar** (Your plan, live workout, Time on a phone, weekly review):
   one line per option on whether that still works.
7. **Marks Yes / Maybe / No per option and per idea**, plus the note log on every block:
   "+ Note", Save button, green "Saved" badge, all earlier notes listed, notes append
   (rule from 2026-11-08; reference: the Dread or Delight page, version 6). Marks live in the
   page's database so the next session can read them.
8. **A "mix" section:** single ideas he can mark on their own (⊕ button, top switch, pinned home
   widgets, a hub with top tabs), since the final answer may combine options.

## Result (2026-11-09)

**Comparison page:** https://claude.ai/artifact/MGAzdo5nRWDS9vFKWkWF6K ("Five Ways Around", private).
Marks live in its database, collection `marks`: `opt--<A..E>` (mark yes/maybe/no), `idea--<fab|switch|topswitch|hub|browse|tiles|corner>`
(mark), and every block's note log as `n--<section>--<hash>` or on the mark docs (`notes: [{text, at}]`, `note` = latest).

Tap counts, from the screen the app opens on, counted by walking each phone mock's screens (shortest path) and confirmed by
clicking every tappable item on every screen of every mock in a browser test (1,223 taps on the published file, all landed):

| Task | Now | A | B | C | D | E |
|---|---|---|---|---|---|---|
| Start a field session | 2 | 3 | 2 | 2 | 3 | 2 |
| Log a gym set | 3 | 4 | 3 | 3 | 3 | 3 |
| Start a timer | 3 | 2 | 4 | 2 | 2 | 2 |
| Open today's plan | 2 | 1 | 4 | 1 | 1 | 1 |
| Ask the coach | 1 | 4 | 3 | 2 | 3 | 1 |
| Fill an audit slot | 3 | 2 | 4 | 2 | 4 | 2 |
| **Total** | **14** | **16** | **20** | **12** | **16** | **11** |

Against the lean: D ties A at 16; E (11) and C (12) are fastest. The page says so.
Unconfirmed: Airbnb's guest tab names Explore and Wishlists, and Calm's full bar order (Sleep and Discover confirmed).

## Steps

1. **Read** `docs/product/map.md`, `docs/product/vision.md`, `components/navTabs.ts`,
   `src/shared/routes.ts`. Confirm the feature table above against the live routes in
   `app/(app)/`; fix the table if it is wrong.
2. **Check the five named apps** from current screenshots (store listings, official help pages
   with images). Record what each bar really holds; correct the table.
3. **Build the page** (Artifact quickstart, then the design and capabilities skills).
4. **Test it before publishing**: 320px and 375px, light and dark, a fake store for marks and
   notes including one failed save, every tap in every phone mock.
5. **Publish, then record** the URL in this file and in a memory note
   (`site-navigation-board`), and add it to `MEMORY.md`.
6. **Stop.** The owner marks. The next session reads the marks and writes the build plan.

**Done when:** the page is published, every current and coming feature is placed in all five
options, the tap counts are filled, and notes save and reload in the test.

## Blockers

| ID | What | Attempted, result | Recommendation |
|---|---|---|---|
| B1 | The page needs a database for marks and notes | Not attempted here; the boards of 2026-11-06 to 11-08 used the same capability and worked | Use it; if refused, fall back to notes the owner copies into chat |
| B2 | Real screenshots of the named apps | Not attempted here (step 2) | If an app's bar cannot be confirmed, say so on the page and keep the option labeled as unconfirmed |

## Open questions (each already decided; the owner can overrule)

| Question | Decision | Alternative | Cost if wrong |
|---|---|---|---|
| Is "Dashboard" kept? | Renamed "Today" in A–D; it becomes the mixed daily page | keep the name | one rename later |
| Where do Settings and levels go? | "Me" tab in all options | More sheet | small |
| Does Time keep its own phone bar? | Yes in every option | fold into the frame | Time's layout was copied from Toggl on purpose; changing it breaks that |
| Laptop layout? | Sidebar with the same groups, shown once at the end, not per option | a mock per option | low; phone decides the structure |

---

## Prompt for the next session

```
Read Plans/site-navigation.md and do steps 1–5. Build ONE private comparison page
(artifact) showing five ways to navigate the site, phone first. Do not change app code.

Before writing the page: run the Artifact quickstart, load artifact-design, and load
artifact-capabilities for the marks database. Follow the note-log rule in my memory
(review-boards-note-log): every block gets "+ Note", Save, a green Saved badge and
the full note history.

Every option copies a real app's navigation. Check each app from current screenshots
first; if one is described wrong in the plan, fix the plan and the page. Place every
feature in the plan's table, current and coming, in all five options. Count the taps
for the six tasks; do not guess them. Show my lean (option D) but let the owner
overrule it.

Test before publishing: 320px and 375px wide, light and dark, a fake store with one
failed save, every tap in every phone mock. Then publish, put the URL in the plan and
in a memory note called site-navigation-board, commit the plan with
git commit --only Plans/site-navigation.md, push, and give me the link with a short
plain-words summary. Then stop: I mark the page, and the next session reads my marks.
```
