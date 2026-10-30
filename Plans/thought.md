# Thought Frequencies: catch the thoughts that keep coming back, then reframe them

**Status:** written 2026-10-30 by session daygame-coach-7d. The owner said "go execute" the same day; being built.

**Written for** the owner first (Part 1), then for the AI session that builds it (design rules, blockers,
questions, the pieces, phases, Part 2, and the `/goal` prompts at the end). The executing AI should treat
this plan as the "what" and "why"; the "how" in code is its own job, inside the rules written here.

**Where it sits.** A new feature in the life half of the app. It also builds the app's first real
notifications, which `docs/product/vision.md` item 48 records as "0% built" and item 46 asks for
("notifications that arrive when the app is closed"). The notification parts are built as a shared
foundation, not as something private to this feature, so the time tracker and the gym's rest timer can use
them later.

**Who owns what.** New: the `src/thoughts/` slice, a shared `src/notifications/` slice, the `/thoughts`
page, its API routes and their tests. Shared files this plan must touch, each named in the step that
touches it: `public/sw.js` (the service worker, whose offline list another session has owned; ask before
editing), `components/navTabs.ts` (the More sheet), `app/manifest.ts` (install shortcuts),
`src/shared/routes.ts` (every address), the two Log Out buttons, and `docs/product/map.md` / `vision.md`.

---

# PART 1 — In plain words

## What you asked for

A new feature, on the website and on the installed phone app, called **Thought Frequencies**:

1. **Every X minutes (15 by default) your phone asks you what you were just thinking.**
2. **You answer fast.** A thought you have had before is **one tap**: your most common thoughts are shown
   as buttons, sorted by how often they come, and tapping one says "it happened again". Only a new
   thought needs typing.
3. **After a few days, you reframe a thought**: you write a more accurate, more useful version of it.
4. You, and later other users, can open it in the phone app or in a browser.
5. It must work without friction and look good.

## What you are agreeing to

- **Money: none.** Nothing in this plan buys, rents or subscribes to anything. The notification services
  (Google's, Apple's, Mozilla's) are free, the code library used to talk to them (`web-push`) is free, and
  the clock that sends reminders runs inside the database you already have, which already runs one
  nightly clock job of the same kind.
- **Your data, on the live database.** New tables are added for thoughts, reframes, reminder settings,
  and the devices that receive reminders. Nothing existing is changed or deleted. Each change comes with
  a written way back. One switch is turned on in the database (`pg_net`, which lets the database's clock
  call the website), and one secret is stored in the database's locked vault so that only the clock can
  trigger reminders.
- ~~Three values you paste into Vercel's settings~~ **Nothing to paste (changed 2026-10-30, Phase 2).**
  The two notification keys and the clock's secret were put in the database's locked vault instead,
  where the website reads them. B-ENV is gone.
- **Your phone.** If you use an iPhone, reminders only work after you add the app to your Home Screen
  and open it from there. Apple allows nothing else (Q20).
- **What becomes public: nothing.** The page is private to each signed-in person. Nobody else can read
  your thoughts, and no thought is ever sent to an AI (Q12).
- **What cannot be undone: nothing.** You can turn reminders off with one switch, and every database
  change has a way back.

## The short answer

Yes, it can be built, and most of it is ordinary work: a page, a few tables, a reframing screen, charts.
**One part is genuinely hard: reminders that reach you when the app is closed.** A web page cannot wake
your phone by itself. So the server has to send a "push" notification every 15 minutes, which needs three
things the app does not have today: a list of the devices that should receive reminders, a clock that
ticks every minute, and code in the app's background worker that shows the reminder. This plan builds all
three, in a shape that also works for the time tracker and the gym later.

**Doubt first, honestly:**

- **On an iPhone, reminders only work in the Home Screen app**, never in a Safari tab. On Android and on
  a laptop they work in the browser too, but more reliably when installed.
- **Phones do not promise exact timing.** Battery saver, Focus and Do Not Disturb can delay or hide a
  reminder. Expect "about every 15 minutes while your phone lets it through", not a metronome.
- **Every 15 minutes is a lot**: about 64 reminders across a 16-hour day. Research on this kind of
  "what are you thinking right now" sampling usually asks 5 to 10 times a day, because people start
  ignoring frequent prompts. Fifteen minutes stays the default because you chose it; the plan adds quiet
  hours, a pause button and a one-tap "nothing notable" answer so it stays bearable, and shows you how
  many reminders you actually answered, so you can judge it with your own numbers.
- **A future native phone app would do this better.** The plan to move off Vercel
  (`docs/plans/own-platform-and-app.md`, milestone M7) wraps the site in a real app later; a real app
  can schedule reminders on the phone itself, even with no signal. This plan stores your reminder
  settings so that app can read them unchanged. Nothing built here is thrown away.

**Size:** eleven phases. Several days of AI work. The first useful version (log and tap thoughts by hand,
no reminders yet) arrives at Phase 3; reminders arrive at Phase 6.

## Words used here

| Word | Meaning |
|---|---|
| Thought | One wording of something you think, e.g. "I am bad". Stored once. |
| Log | One "it happened" for a thought, with the time. Tapping a thought adds a log. |
| Frequency | How many logs a thought has in a period. The name of the feature. |
| Reframe | A rewritten, more accurate version of a thought that you write after a few days. A thought can have several over time; the newest is the current one. |
| Prompt | One reminder notification asking "what's on your mind?". |
| Push | A notification the server sends to your device while the app is closed. |
| Device | One browser or installed app that has agreed to receive prompts: your phone, your laptop. |
| Service worker | A small script the browser keeps running in the background for the site. It is what receives a push and shows it. The app has one already, `public/sw.js`, used today only for opening two pages offline. |
| Quiet hours | The hours in which no prompt is sent (night, by default). |
| The clock | Something that runs every minute and sends the prompts that are due. |

## What exists today (checked 2026-10-30)

- **The live site** is on Vercel (`daygame-coach.vercel.app/api/healthz` answered `ok` for commit
  `d5f3bf24`), with the Supabase database `supabase-daygame` (ref `vcjzbmtcgmjrvvklzqaq`).
- **No notifications that arrive with the app closed exist anywhere.** Two places pop a message
  (`src/timetrack/hooks/useTimetrack.ts`, `src/programs/components/live/RestBar.tsx`) and both only work
  while the page is open. There is no push code, no stored devices, no `web-push` library.
- **The service worker** (`public/sw.js`) is registered only by pages that mount `OfflineShell`
  (the time tracker and the Black Box), only in production builds, and is deliberately removed on the
  development server (`src/shared/components/StaleWorkerCleanup.tsx`). Push has to live in this same
  worker: a site can have only one per address range.
- **The app is installable** (`app/manifest.ts`, opens on `/dashboard`, named "Daygame Coach").
- **The database** already runs `pg_cron` 1.6.4, with one nightly job (`prune_error_reports`, 03:20 UTC).
  `pg_net` 0.19.5 is available but not switched on. The vault is installed. No table with "thought",
  "push", "notif" or "subscri" in its name exists. All 64 migrations in the repo are applied; none pending.
- **Nothing like this feature exists.** The closest relatives: the Black Box (`/plan/quit-vice`) answers
  a "maybe I could moderate" thought with your own record, and Life Mastery has a journal. Neither
  records recurring thoughts. Linking them is a later idea (Q19), not part of this plan.
- **Navigation:** bottom bar Dashboard · Training · Tracking · Your plan · Scenarios; the "More" sheet
  holds Time · Ask Coach · Articles · Settings (`components/navTabs.ts`).
- **Look:** dark charcoal background, slate cards, safety-orange primary, defined as colour tokens in
  `app/globals.css`, with shared building blocks in `components/ui/` and a phone sheet in
  `components/BottomSheet.tsx`.
- **Your timezone** is already a setting (`src/settings/types.ts`), which quiet hours will use.

## How the finished feature works: one day with it

**Morning, first time.** You open **Thoughts** from the More sheet (or long-press the app icon on Android
and pick "Log a thought"). The page explains itself in two lines and asks for your first thought. You type
"I am bad" and press enter. It appears as a button with a count of 1.

**Turning on reminders.** At the top, a card: "Remind me every 15 minutes, 08:00–22:00". You tap
**Turn on for this phone**. The phone asks for permission, you allow it, and a test reminder arrives
seconds later so you know it works. On an iPhone that is not yet installed, the card instead shows three
pictures of how to add the app to your Home Screen, because Apple allows reminders nowhere else.

**During the day.** Every 15 minutes the phone buzzes: *"What's on your mind?"*. The lock screen never
shows your thoughts, unless you switch that on (Q6). You tap the reminder; the app opens straight onto a
sheet with your thoughts as buttons, most frequent first, a box to type a new one, and **Nothing notable**.
You tap "I am bad". It flashes, the count goes up, the sheet closes. About three seconds, start to finish.
Tapped the wrong one? **Undo** sits under it for a few seconds.

**Typing a thought you already have.** You start typing "im bad" and the box suggests *"I am bad" (14
today)*. One tap uses the existing thought instead of creating a near-copy. If copies happen anyway, you
can merge two thoughts later; their history is combined.

**No signal.** You tap a thought on the train. It counts on screen at once and is marked "saved on this
phone"; it is sent when the signal returns, and can never be counted twice.

**You logged something yourself.** The next reminder counts from that moment, so you are not asked
again two minutes after answering.

**Evening.** At 22:00 the reminders stop until 08:00. A **Pause** button stops them for an hour or for
the rest of the day at any time.

**After a few days: reframing.** At the top of the page, "Ready to reframe (2)". You open "I am bad". It
shows how often it came (43 times in 3 days, mostly in the evening) and walks you through a short
reframe: how true it feels right now (a slider), optionally what speaks against it and what you would say
to a friend who thought it, then the new sentence, for example *"I made mistakes today. That makes me
someone who is learning, not someone who is bad."* Only the new sentence is required.

**The payoff.** The next time you tap "I am bad", the app shows your reframe under the count for a few
seconds. Every recurrence becomes a moment of practising the new thought, which is how reframing
actually works. On the **Frequencies** tab you see your top thoughts this week, when in the day they come,
and for each reframed thought a line of how often it came before and after you reframed it.

## The screens

1. **Thoughts (the main page).** Reminder status line, "Ready to reframe" strip, the type box, the thought
   buttons, "Show all".
2. **Quick log** (the sheet a reminder opens). Thought buttons, type box, Nothing notable. Nothing else.
3. **A thought's own sheet.** Count, small trend, its reframes, and actions: reframe, edit wording, pin
   to top, merge into another, archive, delete.
4. **Reframe.** The short guided flow above.
5. **Frequencies.** The charts.
6. **Reminder settings.** On for this device, how often, quiet hours, days, pause, show thoughts on the
   lock screen, reframe-ready after N days, test reminder, which devices receive reminders.
7. **iPhone install guide.** Shown only to an iPhone that is not running the installed app.

**See them, and mark them:** https://claude.ai/artifact/KyF2G35P6txWVvu5e8D2Nc. Eight phone screens (the
first one is clickable), and your seven decisions from the questions table below. Your marks are saved on
that page; the building AI reads them before it builds any screen (Phase 1).

## What makes it work, and what would break it

This is the part to get right. Each line names the failure and what the plan does about it.

### Reminders reaching you

| What would break it | What the plan does |
|---|---|
| iPhone, not installed to the Home Screen: no reminder can ever arrive. | Detect it and show the install guide instead of the on switch. |
| Asking for permission when the page loads: browsers silently refuse, and a refused permission cannot be asked again by the site. | Ask only from your tap on "Turn on", after one sentence on what will happen. If permission was refused, show how to undo that in the phone's settings, per phone type. |
| The background worker is not registered on this page (today only two pages register it). | The Thoughts page registers it too, before asking for permission. |
| The development server removes the worker on purpose. | Reminders are tested on a production build run locally, then on the live site. Written into Part 2. |
| The notification address of a device quietly expires or changes. | The server deletes addresses the notification service reports as gone; the worker re-registers when the browser changes the address; the app re-registers whenever the page is opened. |
| Chrome can withdraw the permission from a website that sends many notifications that are rarely opened. | Recommend installing the app on Android too; the page notices a lost permission and says so plainly with a "turn back on" button. |
| 30 unanswered reminders pile up in the notification shade. | Every reminder replaces the previous one; only one is ever showing. |
| A reminder arrives an hour late after the phone was offline. | Each reminder expires after about 10 minutes if it could not be delivered. |
| The clock stops (database or website down). | Nothing breaks: reminders pause and resume. No burst of missed reminders afterwards. A status line on the page shows "last reminder delivered at 14:15". |
| Two clock ticks overlap and you get two reminders. | Each due reminder is claimed by exactly one tick before it is sent. Tested. |
| Reminders at 3 am because quiet hours were computed in the wrong timezone, or around a clock change (Europe changed on 25 Oct; the US changes on 1 Nov). | Quiet hours use the timezone in your Settings; the scheduling rules are tested across clock changes and across quiet hours that span midnight. |
| Phone and laptop both buzz every 15 minutes. | Reminders go only to devices you switched on. You see the list and can switch any off. |
| You sign out on a shared computer and it keeps receiving your reminders. | Signing out removes that device from your list first. |
| Battery saver, Focus or Do Not Disturb hold reminders back. | Cannot be fixed by any website. Reminders are sent as "urgent" to give them the best chance; the settings page says this in one line. |

### The habit

| What would break it | What the plan does |
|---|---|
| Answering takes too long, so you stop answering. | One tap from the reminder sheet logs a known thought; nothing after the tap is required. Target: about 3 seconds from tapping the reminder to logged. |
| Too many reminders become noise. | Quiet hours, pause, easy interval change, "Nothing notable", and your answered-reminder rate shown on the Frequencies tab so the default can be judged on facts. |
| The button list fills with near-copies ("I'm bad", "i am bad", "I am so bad"). | Same words in a different case or with punctuation count as the same thought; typing suggests existing matches; merge combines two thoughts and their history. Nothing is merged without you. |
| The list grows too long to scan. | Shows the top 8 to 12 by recent frequency, pinned ones first, then "Show all" with search. Archive hides a thought without losing its history. |
| Reframing never happens because nothing asks for it. | "Ready to reframe" appears at the top of the page once a thought is a few days old. |
| A reframe is a slogan ("I am great") that does not stick. | Short guidance in the flow: believable, specific, balanced. The reframe is shown again at the exact moment the old thought returns. |
| Seeing "I am bad × 143" makes things worse. | Counts are presented as information, not a score. The emphasis is on change: before and after the reframe. Wording is kind and plain. |

### The data

| What would break it | What the plan does |
|---|---|
| The database returns at most 1,000 rows per read (`.claude/rules/database.md`). At 64 reminders a day, one thought can pass 1,000 logs in about two weeks, and counts read in the app would silently stop growing. | Counts are computed inside the database, never by reading every log into the app. Tested with more than 1,000 logs. |
| A slow connection retries a tap and it counts twice. | Every tap carries an id made on the device; the same id is stored once. |
| A stored running total drifts from the real logs. | No stored totals. Every count is computed from the logs. |
| "Today" means different things on the server and on your phone. | "Today" is your day in your timezone. |
| Editing a thought's wording rewrites its past. | Editing the wording keeps all its logs and reframes: it is still the same thought. |

### Privacy and safety

| What would break it | What the plan does |
|---|---|
| Someone glancing at your lock screen reads "I am bad". | Reminders say only "What's on your mind?". Thought buttons on the notification itself (Android and laptops only; iPhones do not support them) are off unless you turn them on. |
| Another user reads your thoughts. | Database rules let each person reach only their own rows, proven by tests with a second account. |
| Anyone on the internet triggers reminders by calling the clock's address. | The clock's address refuses any call without the clock's secret. |
| Your thoughts end up in error reports or logs. | Thought text is never logged. The executing AI checks that the existing error-report scrubber (`src/shared/errorScrubService.ts`) keeps it out, with a test. |
| A user writes a thought about hurting themselves. | A gentle card with where to find help (Q14). No AI, no judgement, no blocking. |

## Security and privacy, stated plainly

These thoughts are the most private data in the whole app. Today you are the only user, so the risk is
small; the design is still built as if other people use it, because rebuilding privacy later is how leaks
happen.

1. Only you can read or change your thoughts, logs, reframes, settings and devices.
2. A device's notification address works like a password for sending to that device. It is stored only
   on the server, never shown, and deleted when the device signs out or stops answering.
3. The two notification keys and the clock's secret live only in Vercel's settings and the database
   vault, never in the code.
4. No thought is sent to any AI or any outside service. Notification contents are encrypted between the
   server and your device by the notification system itself.
5. **Before anyone else uses this feature** (a launch item, not a today item): thoughts like these count
   as health-related data under European privacy law. That needs clear consent, a way to export your
   data, and a way to delete your account. `vision.md` item 48 already records that none of those exist
   yet in the app. This plan makes deletion easy (all rows belong to the user and go with them) but does
   not build the legal pages.

---

# DESIGN RULES — up for your approval, each with its cost if wrong

| # | Rule | Cost if wrong |
|---|---|---|
| R1 | **One tap logs a known thought.** Nothing after the tap is ever required. | If you would rather add how strongly you felt it, that is one optional field added later; nothing is rebuilt. |
| R2 | **Counts are computed from the logs, never stored as running totals.** | Slightly more database work per page view; irrelevant at this size. |
| R3 | **Reminders never pile up, expire when stale, and never show a thought on the lock screen unless you turn that on.** | If you want the thoughts on the lock screen by default, it is one setting's default value. |
| R4 | **Reminder settings are data that both the server clock and a future native app read.** | None now; it is what lets the native app replace the server clock without new screens. |
| R5 | **Every log carries an id made on the device.** | None; it is what makes retries and offline taps safe. |
| R6 | **No AI touches a thought.** | AI reframe suggestions can be added later as an opt-in with its own budget (Q12). |
| R7 | **The notification parts are shared plumbing, not part of the thoughts feature.** | Slightly more care up front; saves rebuilding them for the time tracker and the gym. |

---

# BLOCKERS — things only a person can do, or that may stop execution

Each was attempted on 2026-10-30. The result is what happened.

| ID | What | Attempted, and what happened | Blocks | Recommendation |
|---|---|---|---|---|
| ~~B-ENV~~ | **Removed 2026-10-30:** the keys and the secret live in Supabase Vault, read by the server through `notification_secret` (service role only). Nobody pastes anything. Original row kept below for the record. |  |  |  |
| B-ENV (retired) | Put the two notification keys and the clock's secret into Vercel's settings | `which vercel`: not installed. No `~/.vercel` login. No AI session can reach the Vercel dashboard. | Phase 5's live check, Phase 6 | **You**, about 5 minutes, free: Vercel dashboard → the project → Settings → Environment Variables, paste three values from a file the AI prepares at `~/dg-secrets/thoughts-push.env` (mode 600, outside the repo). Then redeploy. The AI writes the exact steps with pictures-in-words when it gets there. |
| B-MIGRATE | Apply the new tables, switch on `pg_net`, store the clock's secret in the vault, schedule the clock job on the live database | Read-only probe via `supabase db query --linked` (linked from a scratch folder; this checkout is not linked and answers `ProjectRefNotLinkedError`): `pg_cron` 1.6.4 installed with one job (`20 3 * * *`, `prune_error_reports`), `pg_net` 0.19.5 available, not installed, `supabase_vault` 0.3.1 installed, no thought/push tables. `supabase migration list --linked`: all 64 local migrations applied, none pending. | Phase 2, Phase 6 | Your yes to this plan covers it ("What you are agreeing to"). Check `migration list --linked` again right before each push: another session may have added one. |
| B-DEP | Add the `web-push` library to `package.json` | `npm view web-push`: version 3.6.7, licence MPL-2.0 (fine to use unmodified), free. Not installed: a past session found the safety check refuses edits to `package.json` in this shared folder until you approve. | Phase 5 | The executing AI prepares the change in an isolated worktree and asks you once with a plain yes/no question. Fallback if refused: write the push encryption by hand with Node's built-in crypto (about 150 lines, more risk, more tests). |
| B-SW | Edit `public/sw.js`, the one background worker the whole site shares | `ListAgents`: one peer, `daygame-coach-c3`, waiting. The own-platform plan (M7) notes that another session owns sw.js's offline list. | Phase 5, Phase 9 | Message whichever session is active before editing; keep the push code separate from the offline rules inside the file; extend `tests/unit/shared/serviceWorker.test.ts`. |
| B-DESIGN | Your eyes on the screens before they are built | Done as far as it can be: the mock-up page https://claude.ai/artifact/KyF2G35P6txWVvu5e8D2Nc shows all eight screens (the first one clickable) and your seven decisions, each with Yes/Maybe/No or Agree/Change and a note. Its `marks` collection was empty when published. | The building of screens in Phases 3, 4, 7, 8 (not the data or the plumbing) | You mark the page. The executing AI reads the marks with `ArtifactData` (`list`, collection `marks`) at Phase 1. Work that is not screens continues meanwhile. |
| B-PHONE | A real phone, locked, receiving reminders | Cannot be attempted: no phone is reachable from here, and automated browsers cannot receive real pushes from Google or Apple. | Acceptance of Phases 5, 6, 7 and 10 | **You**, with your phone: install the app (iPhone: Home Screen), turn reminders on, lock the phone, and confirm the test reminder and two hours of reminders. The AI reads the server's delivery log to confirm what was sent. |
| B-IPHONE | If your phone is an iPhone: add the app to the Home Screen | Cannot be attempted for you. | B-PHONE on an iPhone | Safari → Share → Add to Home Screen, then open it from the icon. Needs iOS 16.4 or newer. |
| B-PEER-TREE | Another session's unfinished change turns the pre-commit tests red | `ListAgents`: one peer, waiting. | Committing, while it lasts | Message that session with the failing test names; continue work that needs no commit; never edit its files. |
| B-CI | Reading CI results | `gh auth status`: logged in as reachjvc. | Nothing | — |
| B-DISK | Disk space for production builds and browser tests | `df -h /mnt/c`: 1.1 TB free. | Nothing | Check again before Phase 10. |

---

# OPEN QUESTIONS — each decided, with the cost if the decision is wrong

**Yours:** Q2, Q5, Q6, Q8, Q12, Q14, Q20. The rest are technical defaults you do not need to judge.

| # | Question | Decision (recommendation) | Alternative | Cost if wrong |
|---|---|---|---|---|
| Q1 | Address and name | Page `/thoughts`, title **"Thought Frequencies"**, short label "Thoughts" in menus | `/thought-frequencies` | A redirect line |
| Q2 | Where it sits in the menus | **More sheet**, as "Thoughts", plus an "Log a thought" shortcut on the installed app's icon (Android and laptops; iPhones ignore icon shortcuts). The reminders are the main door anyway. | A bottom-bar tab, replacing one of the five | Moving it is one line in `navTabs.ts` |
| Q3 | Who can use it | **Any signed-in person, no purchase**, like Your plan | Paid only | One check |
| Q4 | Interval choices | **5, 10, 15 (default), 20, 30, 45, 60, 90, 120 minutes** | Free number entry | None |
| Q5 | Quiet hours by default | **No reminders 22:00–08:00 your time, every day**; editable, may span midnight | Remind around the clock | A night of buzzing if you forget to set it |
| Q6 | Thoughts on the lock screen | **Off by default.** The reminder says "What's on your mind?". A switch adds your top two thoughts as buttons on the reminder itself (Android and laptops only), so you can answer without opening the app. | On by default | Someone reads "I am bad" over your shoulder |
| Q7 | Which devices get reminders | **Only devices you switched on**; turning it on is per device | Every device you are signed in on | Double buzzing |
| Q8 | When a thought is "ready to reframe" | **3 days after it was first logged**, changeable from 1 to 14 days | A number of logs instead of days | It shows too early or too late; one number |
| Q9 | What a reframe requires | **Only the new sentence.** "How true does it feel" before and after, "what speaks against it", "what would you tell a friend" are optional | All steps required | More friction, fewer reframes |
| Q10 | Reminders about reframing | **In-app only** ("Ready to reframe" on the page). No extra push. | One daily push | Reframes forgotten; easy to add later |
| Q11 | Extra details per log (strength, place, mood) | **None** in this plan; one tap is the point. A short optional note can be added from the thought's own sheet. | Optional strength 1–5 after each tap | One optional field, later |
| Q12 | AI help (suggested reframes, grouping similar thoughts) | **Not in this plan.** It costs money per use and sends your most private text to an AI company. | Opt-in AI suggestions with a budget | Reframing stays fully manual |
| Q13 | Open `/thoughts` with no signal | **Yes**, added to the worker's short offline list: logging a thought on a train is exactly the case that list exists for | Online only | A browser error page on the train |
| Q14 | A help card for thoughts about self-harm | **Yes**, shown when such words are typed. No blocking, no AI. **Reuse the Black Box's existing help door** (`src/vice/components/HelpDoor.tsx`, tested in `tests/unit/vice/helpDoorReachable.test.tsx`): it already leads with a crisis service, asks the country before showing a number, and shows the emergency number. *Built 2026-10-30 as `src/thoughts/components/ThoughtHelpCard.tsx`, reusing the door's crisis numbers (`src/vice/data/help.ts`) and its country memory (`useHelpLocale`), not the dialog itself: the dialog's other sections are about addiction and rehab, the wrong conversation here.* | Nothing | A missed moment that matters, once other people use it |
| Q15 | What runs the clock | **The database's own clock (`pg_cron`, already in use) calling the website every minute through `pg_net`**, with a secret. Free, no new account. When the app moves to its own server, a server timer calls the same address instead. | Vercel's clock (once a day on the free plan; every minute needs Pro, about $20/month); a free outside service such as cron-job.org (needs an account of yours); GitHub's scheduled runs (often 10+ minutes late, and private-repo minutes are limited) | Swapping clocks is a few lines; the address stays the same |
| Q16 | Reminders missed while the phone was off | **Not caught up.** The next one comes at the normal time. | Send the missed ones | A burst of stale reminders |
| Q17 | When the 15 minutes start | **From your last log on any device, or the last reminder**, whichever is later | Fixed clock times (:00, :15, :30, :45) | A reminder right after you answered |
| Q18 | Deleting | **Archive** hides a thought and keeps its history. **Delete** removes the thought, all its logs and reframes, after a confirm. Both are yours to do in the app; no AI deletes your data. | Archive only | — |
| Q19 | Links to the Black Box, the journal, Your plan | **Not in this plan.** Later, a reframe could appear in the journal (vision item 2) | Build links now | None; later work |
| Q20 | Your phone | **Build for both iPhone and Android.** If iPhone: B-IPHONE applies. | — | The real-phone check (B-PHONE) is done on the right phone |

---

# THE PIECES — what the executing AI builds, described by purpose, not by code

## Stored data (new tables on the live database)

1. **Thoughts.** Your wording, a normalised form for duplicate detection (lower case, spaces collapsed,
   end punctuation dropped), created time, pinned, archived, and "merged into" for merged thoughts.
   One normalised wording per person.
2. **Logs.** One row per "it happened": which thought, when, how (tapped, typed, from a reminder, from a
   reminder button), which reminder it answered (if any), and the id made on the device (unique per
   person, so a retry is stored once). Also one row for "nothing notable" answers, with no thought.
3. **Reframes.** Which thought, the new sentence, optional "how true" before and after (0–100), optional
   evidence and friend answer, created time. Several per thought; the newest is current.
4. **Reminder settings**, one row per person: on/off, interval, quiet hours, active days, pause-until,
   show-thoughts-on-notification, reframe-after-days, and the next due time. Timezone comes from the
   existing Settings. The next due time is computed by the server only.
5. **Devices** (shared plumbing): who, the notification address and its keys, a readable label
   ("Pixel, installed app"), reminders on/off for this device, last success, failure count, created.
   Written only by the server.
6. **Reminder log** (shared plumbing): each reminder sent, to which devices, when, and the outcome
   (delivered to the service, failed, device removed). Lets the page say "last delivered 14:15" and
   lets the Frequencies tab compute how many reminders were answered.

Rules for all of them: each row belongs to one person and goes with them if the account is deleted; each
person reaches only their own rows; the rows the server computes cannot be written by the app's client
(`.claude/rules/database.md`: computed data is system-only, and every new write policy is listed in this
plan, so the owner's yes covers it). Constraints that must always hold are database constraints, not only
app checks.

## Server parts

- **Thought routes:** list thoughts with their counts; add a thought; log (single or a batch, for offline
  catch-up); undo a log; edit, pin, merge, archive, delete a thought; add and edit reframes; read the
  numbers for the Frequencies tab. Every route checks the signed-in user (the pattern in
  `app/api/black-box/route.ts`).
- **Device routes** (shared): register this device, switch it on or off, remove it, send a test reminder.
- **The clock's address:** refuses anything without the secret; claims every due reminder atomically;
  sends; records the outcome; computes the next due time; removes devices the service reports as gone;
  answers quickly. Running it twice at once sends each reminder once.
- **The sending code** (shared): wraps `web-push`; reminders are short-lived (about 10 minutes),
  urgent, and replace the previous reminder. The identifying "subject" is the site's address, not an
  email address.

## The background worker (`public/sw.js`)

- On a push: show the notification (title, body, which page to open, the reminder's id), replacing the
  previous one.
- On a tap: bring an open app window to the front and go to the quick-log sheet, or open one.
- On a tap of a thought button (only if Q6 is switched on): log it from the worker using the signed-in
  session, then show a brief "Logged" confirmation.
- When the browser changes the device's address: register the new one.
- Everything existing in sw.js (its five rules about offline pages) stays exactly as it is.

## Screens

Listed under "The screens" in Part 1. Built from `components/ui/`, `components/BottomSheet.tsx` and the
colour tokens in `app/globals.css`. Phone first (390 px wide), and good on a laptop. Every button at least
44 px tall. Tapping a thought updates the screen instantly and confirms in the background.

---

# PHASES

Each phase ends green (`npm test`, `node scripts/typecheck-ratchet.mjs`, `npm run lint:ratchet`),
committed with `git commit --only <paths>`, and pushed to `main`, which deploys the live site. Evidence goes
under the phase's heading as it is done. Each phase is a working state of the app, never a half-built
layer. Screens wait for B-DESIGN marks; data and plumbing do not.

## Phase 0 — Ground truth (no product change)
**Depends on:** nothing.
1. Re-check every claim in "What exists today" against the code and the live database (read only).
   Correct this plan where it is wrong, and say so in the evidence.
2. Read the relevant guides in `node_modules/next/dist/docs/` before writing any code, starting with
   `01-app/02-guides/progressive-web-apps.md` (it covers push), then route handlers, environment
   variables and the manifest. This Next.js version differs from what an AI remembers.
3. `ListAgents`: who is active, and who owns `public/sw.js`, `components/navTabs.ts`, `app/manifest.ts`
   and the Settings page. Message them about the files this plan will touch.
4. Read `src/shared/components/OfflineShell.tsx`, `StaleWorkerCleanup.tsx`, `public/sw.js` and its
   test, and both Log Out buttons (`src/shared/offlineCopies.ts` explains them), so Phase 5 fits the
   worker's existing rules.
5. Ask the owner Q20 (iPhone or Android) if not yet answered.
**Acceptance:** the plan is corrected where needed; evidence lists what was checked.

**Evidence (2026-10-30, session 7d):** `git status` clean at e1e0d770; `ListAgents`: one peer,
`daygame-coach-c3`, which answered that it touches no repo code and holds no edits in the shared files
named above. Read: `.claude/rules/*`, `docs/testing_behavior.md`, `public/sw.js`, `OfflineShell.tsx`,
`src/shared/offlineCopies.ts` (both Log Out buttons call `forgetOfflineCopies` from
`components/AppFrame.tsx` and `components/MobileTabBar.tsx`), `proxy.ts` (it never redirects `/api/*`
except `/api/timetrack/*`, so the clock's address needs no exception), `src/shared/dateUtils.ts`
(timezone helpers reused by the schedule). `node_modules/next/dist/docs/01-app/02-guides/progressive-web-apps.md`
covers push the standard way. `df -h /mnt/c`: 1.1 TB free. Q20 not answered (no marks); building for both.
**Correction:** the keys go in the vault, not Vercel (B-ENV removed).

## Phase 1 — The look, signed off (B-DESIGN)
**Depends on:** Phase 0.
1. Read the owner's marks on https://claude.ai/artifact/KyF2G35P6txWVvu5e8D2Nc (`ArtifactData` `list`,
   collection `marks`; document ids `screen-main`, `screen-quicklog`, `screen-reminder`,
   `screen-thought`, `screen-reframe`, `screen-frequencies`, `screen-settings`, `screen-iphone`, and
   `q2`, `q5`, `q6`, `q8`, `q12`, `q14`, `q20`). Write each decision mark into the questions table.
   Update the page (same URL; read it first) with anything Phase 0 corrected.
2. Include the states people forget: empty (first visit), one thought, forty thoughts, offline, reminders
   off, permission refused, iPhone not installed, reframe ready, loading.
3. The owner marks each screen Yes / Maybe / No with a note. Screens marked No are redesigned and marked
   again; Yes screens are the target for the build and for the Phase 10 comparison.
**Acceptance:** every screen marked Yes, or redesigned and re-marked.

**Evidence (2026-10-30):** the `marks` collection was empty when read. The owner said "go execute"
without marking, so the recommended answers stand as decisions and the mock-up is the build target. The
owner can still mark the page; a "No" there is redone as a change, not a blocker.

## Phase 2 — Storage
**Depends on:** Phase 0. (B-MIGRATE)
1. Write the migration for the six tables in "Stored data", with their rules, constraints and access
   rules, and a written way back (the reverse migration, kept in the evidence).
2. A database function or view that returns each thought's counts (today, 7 days, 30 days, all time,
   last logged) without reading every log, so the 1,000-row cap cannot falsify counts.
3. Repository functions in `src/db/` (all database access goes there), following the nearest sibling
   repo's style.
4. Tests against the database, inside transactions that are rolled back: a second account sees none of
   the first's rows; the same device-made id stored twice is one log; merging moves every log and reframe;
   counts are right with 1,500 logs; deleting a thought removes its logs and reframes and nothing else.
5. `supabase migration list --linked`; apply; check the tables exist on the live database.
**Acceptance:** tests green; tables live; nothing else in the database changed.

**Evidence (2026-10-30):** `supabase/migrations/20261030120000_thought_frequencies.sql`, way back in
`supabase/migrations/rollback/20261030120000_thought_frequencies.down.sql`. Seven tables (thoughts,
thought_logs, thought_reframes, thought_settings, thought_prompt_schedule, notification_sends,
push_devices), four functions (`thought_counts`, `merge_thought`, `claim_due_thought_prompts`,
`notification_secret`). Write policies added: owner-only insert/update/delete on thoughts,
thought_logs, thought_reframes, thought_settings (the person's own words and choices, not computed
data). No client policy at all on push_devices and thought_prompt_schedule; select-only on
notification_sends. `tests/integration/repos/thoughtsRepo.integration.test.ts`: 21 green on the local
stack, and 15 of them go red with `TEST_SHARED_USER=1`, so they depend on separate accounts. The row
security and cascade catalog tests name the two server-only tables and the one SET NULL with reasons.
`supabase migration list --linked`: only this migration pending; `db push --linked` applied it; all seven
tables exist live with row security on. Vault: `push_vapid_public`, `push_vapid_private`,
`notifications_clock_secret` stored from `~/dg-secrets/thoughts-vault.sql` (mode 600), checked by
name and length only.

## Phase 3 — You can log thoughts by hand (first usable version)
**Depends on:** Phases 1 (marks for screens 1 and 3) and 2.
1. The `src/thoughts/` slice: types, a service for the rules (normalising wording, matching suggestions,
   sorting the buttons by recent frequency with pinned first), hooks and components.
2. The address in `src/shared/routes.ts`, the page under `app/(app)/thoughts/`, the API routes, the
   "Thoughts" item in the More sheet, and the "Log a thought" shortcut in `app/manifest.ts`.
3. The main page: type box with suggestions of existing thoughts, thought buttons with counts, instant
   tap feedback (a short vibration on phones that support it), Undo for a few seconds, Show all with
   search.
4. A thought's own sheet: edit wording, pin, merge into another, archive, delete with confirm.
5. Unit tests for the rules (normalising, matching, sorting); browser tests on the phone lane (`@phone`)
   and desktop: type a new thought, get a suggestion for a near-copy, tap, undo, merge, archive, delete,
   reload and see everything kept, empty state.
6. Look at it in the browser at 390 px and 1280 px (Playwright MCP) against the marked mock-up.
**Acceptance:** on the live site, signed in, you can add "I am bad", tap it five times, undo one, and
see 4. Screenshots in the evidence.

**Evidence (2026-10-30):** `src/thoughts/` (service, schedule, queue, hook, components), `app/(app)/thoughts/page.tsx`,
`app/api/thoughts/*`, "Thoughts" second in the More sheet (icon `AudioWaveform`, used nowhere else), and a
"Log a thought" shortcut in `app/manifest.ts`. `tests/e2e/thoughts.spec.ts`: 5 tests × desktop and phone
lanes, 10 green, including the acceptance itself (add, five taps, undo, reload, 4). Looked at in a browser at
390 px and 1280 px on a seeded local account. Found and fixed on the way: a count fell back by one for
~1.5 s after a tap was sent (now settled into the screen at once, `settleLogs`, tested); the laptop
header's row was 929 px in an 879 px space at 1280 px once Thoughts joined, so Log Out sat half hidden —
header links now `px-2.5`, 845 px, measured. The page works offline-first from this phase: taps queue on
the phone and send when there is signal (Phase 9, step 1, done early).

## Phase 4 — You can reframe a thought
**Depends on:** Phase 3, and marks for screen 4.
1. The readiness rule (Q8) as a tested function; the "Ready to reframe" strip on the main page.
2. The reframe flow (Q9): how true it feels, optional evidence and friend answer, the new sentence,
   how true the old thought feels now. Short guidance on what makes a reframe work. Saves as a new
   reframe; earlier ones stay in the thought's history.
3. After tapping a reframed thought, show its current reframe under the confirmation for a few seconds.
4. Tests: readiness at the boundary (2 days 23 hours vs 3 days, in your timezone); a reframe saved,
   edited, and a second one added; the reframe shown on the next tap.
**Acceptance:** on the live site, a thought logged 3 days ago is offered for reframing, the reframe is
saved, and the next tap shows it.

**Evidence (2026-10-30):** readiness (`isReadyToReframe`) counts calendar days in the person's zone and
needs at least two logs; the boundary is tested (Wednesday 23:59 not ready, Thursday 00:10 ready for a
thought first logged Monday 23:50). `ReframeFlow`: one screen, only the sentence required, both "how
true" sliders start unanswered (stored as null, never 0). The e2e test saves a reframe and sees it under
the next tap's "Logged" notice.

## Phase 5 — A reminder reaches this device (notification plumbing)
**Depends on:** Phase 3. (B-DEP, B-SW, then B-ENV for the live check)
1. Generate the two notification keys and the clock's secret into `~/dg-secrets/thoughts-push.env`
   (mode 600, outside the repo); never print them in a transcript. Write the owner's B-ENV steps.
2. Add `web-push` (B-DEP). Build the shared `src/notifications/` slice: register a device, switch it,
   remove it, send to a person's switched-on devices, delete devices reported gone, record the outcome.
3. The worker (B-SW): push, tap and address-change handling as in "The background worker". Keep it apart
   from the offline rules. Extend the worker's unit test.
4. The Thoughts page registers the worker (production builds only, like `OfflineShell`), then offers
   "Turn on for this phone" which asks for permission from the tap, registers the device, and sends a
   test reminder. On an iPhone outside the installed app: the install guide instead. Permission refused:
   how to undo it, per phone type.
5. Both Log Out buttons remove this device from the person's list before signing out.
6. Tests: unit tests for the slice with the sending stubbed; a browser test against a local production
   build (`npm run build` then `npm start`; the dev server deliberately has no worker) that grants
   permission, turns reminders on and finds the device stored. Real delivery is B-PHONE.
**Acceptance:** after B-ENV, on the live site, the owner's phone receives the test reminder with the app
closed, and tapping it opens the Thoughts page.

**Evidence (2026-10-30):** `web-push` 3.6.7 (and `@types/web-push` 3.6.4) added; `npm run audit:ratchet`:
none new. `src/notifications/`: `endpoints.ts` (only the four push services the browsers use are accepted:
the server POSTs to the address, so anything else would let a browser make the server call any URL),
`pushService.ts` (TTL 600 s, urgency high, one topic per kind; no device means no send and no row),
`clockAuth.ts`, `pushClient.ts`, `hooks/usePushDevice.ts`. `public/sw.js`: push, notificationclick,
pushsubscriptionchange in their own block; the five offline rules untouched and their 26 tests still green;
`tests/unit/shared/serviceWorkerPush.test.ts` covers the new block (8 tests, including "an address on
another site is never opened" and "an action the notification did not offer is a plain tap"). Both Log Out
buttons remove this browser's device first (`src/shared/offlineCopies.ts`). Permission is asked only from
the "Turn on" tap; an iPhone outside the Home Screen app gets the install steps. Found on the way: the
shared `BottomSheet` had no height limit, so a tall sheet ran off the top of a phone screen with its top rows
unreachable — capped at 92% with the inside scrolling; the More menu and workout-menu specs (33) still pass.
**Not yet done: the real phone (B-PHONE).** Push delivery cannot be tested from here.

## Phase 6 — Reminders every X minutes
**Depends on:** Phase 5. (B-MIGRATE for the clock)
1. Reminder settings on the page (screen 6): on/off, interval (Q4), quiet hours (Q5), days, pause for an
   hour or the rest of the day, show-thoughts switch (Q6, wired in Phase 7), reframe-ready days (Q8),
   test reminder, device list with on/off and remove.
2. The scheduling rules as pure, tested functions: next due time from the interval, quiet hours spanning
   midnight, active days, pause, restarting from the last log (Q17), no catch-up (Q16), your timezone, and
   both clock changes (Europe 25 Oct 2026, US 1 Nov 2026).
3. The clock's address (see "Server parts"), with the secret checked in constant time.
4. The clock itself (Q15): switch on `pg_net`, store the website's address and the secret in the vault,
   schedule a `pg_cron` job every minute that calls the clock's address. A one-line way to stop it is
   written in the evidence and in a runbook.
5. Tests: two clock calls at the same moment send once; a call without the secret is refused; a person
   with reminders off, paused or in quiet hours gets nothing; a dead device is removed.
6. Check the clock from the database side: its call history shows answers from the website every minute.
**Acceptance:** B-PHONE: two hours of reminders roughly every 15 minutes with the phone locked; the next
morning, the reminder log shows none between 22:00 and 08:00.

**Evidence (2026-10-30):** the schedule rules are `src/thoughts/schedule.ts`, 20 unit tests including both
clock changes and quiet hours across midnight. The clock is `supabase/migrations/20261030130000_thoughts_clock.sql`:
a job every minute that calls the site only when a reminder is due (a quiet night makes no calls), reading
the address and the secret from the vault, and a nightly job that keeps a week of pg_cron's run history.
**To stop every reminder:** `select cron.unschedule('thoughts-clock');`.
`tests/integration/repos/thoughtsClock.integration.test.ts` (11 tests, push services faked): one send per
due reminder, two clocks at once send once, off/paused/quiet hours send nothing, a log restarts the wait, a
410 device is removed while the other still gets it, no device means no row.

## Phase 7 — Answer in one tap from the reminder
**Depends on:** Phase 6, and marks for screen 2.
1. A reminder opens the quick-log sheet directly, carrying the reminder's id: thought buttons, type box,
   Nothing notable. A tap logs, links the log to the reminder, and closes the sheet.
2. If the show-thoughts switch is on: the top two thoughts as buttons on the reminder itself (Android
   and laptops), logged by the worker without opening the app, with a brief "Logged" confirmation.
3. Measure the time from tapping the reminder to logged on the phone; target about 3 seconds on a
   warm app. Make the sheet usable before the rest of the page finishes loading.
4. Tests: the sheet opens from a reminder link; a log carries the reminder id; Nothing notable is
   recorded; a worker-side log uses the same device-made id rule and cannot double count.
**Acceptance:** B-PHONE: answer five reminders in a row from the lock screen; each takes one tap after
opening; the reminder log shows them answered.

**Evidence (2026-10-30):** `QuickLogSheet` opens from `?log=1&prompt=<id>` (a reminder) or `?log=1` (the
install shortcut, which has no "Nothing notable"); a tap logs with the reminder's id and closes it, and the
address goes back to `/thoughts` so a reload does not reopen it. The sheet shows while the page is still
loading. e2e: 3 more tests × 2 lanes, 16/16 green. Worker-side logging from a notification button is in
`public/sw.js` and its unit tests. Time-to-logged on a real phone is part of B-PHONE.

## Phase 8 — Frequencies (the charts)
**Depends on:** Phase 4, and marks for screen 5. Read the `dataviz` skill before drawing any chart.
1. Top thoughts this week and this month; for each thought, a small trend with the date of each reframe
   marked; when in the day and week thoughts come; how many reminders were answered; for reframed
   thoughts, how often they came before and after the reframe.
2. Thin-data states (one day of data must not look broken) and a calm tone throughout (see "The habit").
3. All numbers computed in the database; tests compare them with hand-counted fixtures.
**Acceptance:** with a week of the owner's real use, the charts match a count taken directly in the
database (read only), and look right at 390 px and 1280 px.

**Evidence (2026-10-30):** `supabase/migrations/20261030140000_thought_stats.sql`: one read-only function,
`thought_frequency_stats`, returns everything the tab shows as one JSON answer, in the person's own hours
and days. Applied live; test baseline refreshed (stamp 20261030140000, no drift). Two integration tests
compare it with hand counts (weekday/hour in Copenhagen, a 12-day-old log only in the month, before/after
a reframe, 1 of 2 reminders answered). Forms chosen by the dataviz method: ranked bars (one hue), a 7 × 24
one-hue grid with a "busiest hours" table for screen readers, before/after as two numbers, answered as one
stat, and a 14-day 2 px line with the reframe marked in each thought's sheet. Looked at on a seeded local
account at 390 px. The "reminders come too often" hint shows only below half answered.
Found and fixed on the way: the phone could draw a just-sent tap twice for several seconds under load (a
re-read could include it while the page still added it on top). The page's read now returns the ids of
logs stored in the last 15 minutes, read before its counts, and the log route says which taps were newly
stored, so the page knows exactly which taps a read already counts. 54/54 browser tests over three repeats.

## Phase 9 — Bad signal, lost permission, and the other rough edges
**Depends on:** Phases 7 and 8.
1. Offline taps: kept on the device, shown as "saved on this phone", sent when the signal returns, never
   counted twice (R5). Cleared at sign-out like the app's other offline copies.
2. Add `/thoughts` to the worker's offline list (Q13), following its five rules (stored with its scripts,
   emptied on sign-in changes). Coordinate with the worker's owner (B-SW).
3. A clear banner when permission was withdrawn, or when no reminder has been delivered to a switched-on
   device for 24 hours, with a "turn back on" button.
4. The help card (Q14), opening the existing `HelpDoor` rather than a second copy of it. If it needs
   to move to `src/shared/` to be used from two slices, ask the session that owns `src/vice/` first.
5. Prove thought text never reaches error reports or server logs (test against `errorScrubService`).
6. Accessibility: labels on every button, focus order, contrast with the colour tokens, reduced motion
   respected, screen reader reads counts sensibly.
7. Browser tests: offline tap then reconnect; permission refused; sign-out removes the device.
**Acceptance:** tests green; with the phone in airplane mode, the owner taps a thought, turns signal back
on, and sees it counted once.

**Evidence (2026-10-30):** offline taps were built in Phase 3; e2e now proves it: offline tap shows "1 saved
on this phone", returns with the signal, counts once after a reload (desktop and phone lanes). `/thoughts` is
the worker's fourth offline page (`public/sw.js`, `routeList.test.ts` updated); the page keeps its last read
on the phone and draws it, marked "No connection. Your thoughts as of 14:05", only when a read fails for want
of a connection. Both copies (waiting taps, the page copy) go at sign-out with the device registration. New
warnings: "Reminders stopped on this device" (permission taken back) and "No reminder has reached this device
for a day" (every-day schedules only, so a weekdays plan is not flagged at the weekend). Help card: Phase 3,
`ThoughtHelpCard`. `tests/unit/thoughts/thoughtTextStaysPrivate.test.ts`: every log line in the thoughts and
notifications code is a fixed tag plus an error message or status; a database error's `details`/`hint`
(which carry the row) are never read; a planted leak is caught. Accessibility: every thought button reads
its text and today's count; switches, the day buttons and the interval choices are labelled; the heat grid
has a text summary and a table; animations are `motion-safe`. Full unit suite: 5,414 passed.

## Phase 10 — Finished: real-phone day, look, review, documents
**Depends on:** Phase 9.
1. B-PHONE, a full day: reminders all day, quiet hours overnight, answers from the lock screen, one
   offline tap, one reframe on a thought from three days earlier. The AI reads the reminder log and the
   logs table to confirm.
2. Compare every screen at 390 px and 1280 px with the marked mock-up; fix differences.
3. `/code-review`, and a security review through a subagent on the explicit commit range (this checkout
   has no `origin/HEAD`), covering the access rules, the clock's address, device addresses and the
   worker.
4. Update `docs/product/map.md` (the new slice, the shared notifications slice, the clock job),
   `docs/product/vision.md` item 48 (notifications no longer 0%), a short runbook (how to stop all
   reminders, how to rotate the keys and the secret), and add a note to
   `docs/plans/own-platform-and-app.md` that its "no `pg_cron` anywhere" line is out of date and that the
   thoughts clock becomes a server timer on the new platform.
5. Mark this plan `**Status:** done <date>`; delete merged branches as `.claude/rules/finished-work.md`
   says.
**Acceptance:** the owner has used it for a full day and says it works and looks right.

---

# PART 2 — Ground rules for the executing session

1. Read `CLAUDE.md`, `.claude/rules/database.md`, `.claude/rules/ui.md`, `.claude/rules/testing.md`
   and this plan's Part 1 first.
2. Other sessions share the folder: `git commit --only <paths>`, never `git add -A` or `git stash`.
3. Live database: read freely; write only through migrations and the app, plus the one vault secret
   named in B-MIGRATE. Test writes go inside `begin; … rollback;`.
4. No money, no accounts, no passwords. If any step would cost money (a paid Vercel plan, a paid
   service), stop and ask the owner in plain words.
5. Never delete the owner's data. Deleting is something the owner does in the app.
6. Secrets (the two keys, the clock's secret) never go into the repo, a commit, a log, or a transcript.
7. Push code is tested on a production build (`npm run build` keeps `--webpack`); the dev server has no
   worker by design.
8. Run `node scripts/typecheck-ratchet.mjs` and `npm run lint:ratchet` before every push. Every push to
   `main` deploys the live site; check the commit's CI run afterwards.
9. Comments in this codebase are often stale. Check claims in the code before relying on them.
10. Report to the owner in plain words, doubt first, and show the screens on a page the owner can look at.

---

# `/goal` prompts

### Phases 0–2. Paste after `/goal`.

> Execute Plans/thought.md Phases 0 to 2 in order, following its Part 2 ground rules. Record evidence
> under each phase heading, commit with `git commit --only` and push to main at the end of each phase.
> Phase 1 waits for the owner's marks on the mock-up; continue with Phase 2 meanwhile. Stop and report in
> plain words if a phase's acceptance cannot be met.

### Phases 3–5, after the owner's marks. Paste after `/goal`.

> Execute Plans/thought.md Phases 3 to 5. Ask the owner once about the web-push dependency (B-DEP) and
> hand them the B-ENV steps when Phase 5 reaches them. Same rules and evidence as before.

### Phases 6–8, after B-ENV and the test reminder arrived on the owner's phone. Paste after `/goal`.

> Execute Plans/thought.md Phases 6 to 8. The clock goes live in Phase 6; write the one-line way to stop
> it before switching it on. Ask the owner for the two-hour B-PHONE check and read the reminder log
> afterwards.

### Phases 9–10. Paste after `/goal`.

> Execute Plans/thought.md Phases 9 and 10, including the owner's full-day B-PHONE check, the reviews and
> the document updates. Report with screenshots.
