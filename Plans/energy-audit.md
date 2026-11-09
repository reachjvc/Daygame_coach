# Time and energy audit: Dan Martell's two-week audit, built into the app, replacing Thoughts

Written 2026-11-08. Built from the owner's marks and notes on the research page "Dread or Delight"
(https://claude.ai/artifact/V28AzK4axgj7yaczaU9Y4n, marks database collection `marks`), six read-only
research reports (code, live database, sources) and a four-reviewer attack on the first draft (8 blockers
and about 30 other problems found and fixed, 2026-11-08). Status: **Phases 0-3 in progress (2026-11-09).**
Notes since 2026-11-08 20:00 UTC: none (marks read 2026-11-09: 19 documents, the newest written 2026-11-08 18:43 UTC, so no decision changed). Look page: not made yet (Phase 4 makes it).

Format: owner answers first, then Part 1 in plain words, then DECISIONS, BLOCKERS, THE PIECES, PHASES,
Part 2 (ground rules for the executing session) and the `/goal` prompts at the end. The executing session
follows this file literally. Where it says "exactly", copy exactly.

---

## Only you decide these — your answers

Asked on 2026-11-08. The executing AI uses these answers and asks nothing else unless a NEW item of this
kind comes up (money, deleting other data, something that cannot be undone, a live database change not
listed here).

| # | What | Your answer |
|---|---|---|
| O1 | **Build this inside the current app**, although Jacob advises rebuilding the app from scratch. If you rebuild later, the design and this plan carry over; the code does not. | **Yes** (2026-11-08). |
| O2 | **Delete Thoughts completely**: its screens, its code, and everything stored in it (live today: 10 thoughts, 11 logs, 1 settings row, 1 reminder schedule, and the record of 516 reminders sent). No copy is kept. This cannot be undone. | **Yes, delete it and its history entirely** (2026-11-08). |
| O3 | **Two changes to your live database.** Migration A removes the Thoughts tables (O2) and keeps the shared notification clock running for Time. Migration B adds the audit's two new tables. Each comes with written steps to undo the change to the tables; Thoughts' data cannot come back. | **Yes** (2026-11-08). |

**Money:** none. Nothing is bought, rented or subscribed to. The pings use the reminder system that
already runs. **Public:** the repo is public. Transcripts, forms and the owner's notes stay in
`~/.cache/daygame-research/feelings-v2/`, never in the repo; this plan paraphrases them. **Cannot be
undone:** only the Thoughts data (O2, approved).

---

# PART 1 — In plain words

## What you asked

Make the tool from the research: start from Dan Martell's Time and Energy Audit exactly, then change only
the parts you asked to change. Your notes (2026-11-08), in short:

- **Time fills in the log.** If a timer runs in Time, the audit already knows what you are doing.
- **Score in the moment, review at the end.** Score each 15 minutes as it happens; look at the whole
  picture after two weeks, or when you end it.
- **Pings keep coming during work**, but you can mute them, and you will not answer every one. So you can
  fill in later, also for time you did not track in Time.
- **"Builds my life", not money, as the second score.** Martell prices each task in dollars; you want
  "does this build my life or ruin it", scored with a number instead of red or green.
- **Other words than "pulls" and "drains."**
- **Dread:** you were unsure. A full workout or daygame session is scored after it. If you dread something
  hours before it, that should go somewhere: an optional box, "why I feel like this right now".
- **Never push you during the two weeks.** It only collects; you want to see the data.
- **It replaces Thoughts.** It suggests what you wrote most often and finishes your words as you type,
  the way a code editor does when you change one word.
- **All three: what it did to you, whether you chose it, how you are right now.** Avoiding a task can be
  the activity itself, scored like any other.
- **Growth counts, not just energy:** something tiring that builds a lot beats something neutral that
  builds nothing.
- **"The energy audit"** was your name for Chris Bailey's energy-waves extra only. So this tool takes
  Martell's full name, and the energy-waves part keeps its own title inside the review.

## Doubt first

1. **You answered 1 of the 516 Thoughts reminders** (checked live, 2026-10-30 to 2026-11-08). A ping every
   15 minutes only works if answering costs almost nothing. This plan cuts that cost three ways:
   - Time fills in the activity;
   - one answer can cover several quarters;
   - the notification has a "Same as before" button.
   Whether that is enough, only your first days with it can show.
2. **Nobody has shown this audit works.** Martell's proof is his own use and one client story. The
   research checker found that most teachers never say what happened when people tried their method. Your
   two weeks are the first real test.
3. **The research leaned toward Dan Martell.** You noticed it: the brief and the first two picking rules
   came from his method, so "copy Martell" was partly built in.
4. **Time can fill in the wrong thing.** A timer keeps running while you drift to your phone; Martell says
   writing it yourself is what keeps you honest. Look at the filled-in activity before you save.
5. **The method you marked Yes is by a different Martell.** The hour-by-hour chart with two scores is by
   Christopher Martell, a depression therapist, not Dan Martell. Both are used here: Dan's audit is the
   skeleton, and Christopher's two scores replace Dan's colours and prices.
6. **Several parts are our inventions, not copies.** The table below marks every one, including the 1–7
   scales, the line at 4 that sorts activities into boxes, the box names and the "Same as before" button.
7. **One of Martell's steps is left out for now:** planning a "perfect week" from what gives you energy
   (his "Fill"). The look page asks whether you want it.
8. **Thoughts' "every 15 minutes" was really every 16 minutes** (checked live). The audit pings on the
   clock (:00, :15, :30, :45), so this cannot happen.
9. **Another AI session is finishing the time tracker right now.** This plan changes no Time screen, so the
   two should not clash.

## How it works: one day with it

1. **Start.** More → Time & energy audit → "Start a two-week audit". Martell's advice is shown: run it when
   you feel stuck or overwhelmed. It ends by itself after 14 days, or when you press "End now".
2. **Each quarter-hour**, your phone buzzes at :00, :15, :30 and :45, from 08:15 to 22:00. That window
   follows your Thoughts setting, quiet from 22:00 to 08:00, and you can change it. The 08:15 ping asks
   about 08:00–08:15; the 22:00 ping asks about 21:45–22:00. The lock screen shows only the times, never
   what you wrote.
3. **Tap it.** The answer sheet opens on every quarter you have not answered in the last 3 hours. Quarters
   with the same Time activity are grouped, so "Gym, 08:30–10:00" is one card. On each card you
   - check or change the activity: it is filled in from Time, or you pick from your most frequent ones;
   - tap **Energy 1–7**: 1 = takes my energy, 4 = neutral, 7 = gives me energy;
   - tap **Growth 1–7**: 1 = ruins my life, 4 = neither, 7 = builds my life;
   - optionally tap **"Avoiding something"**, if you did not choose this;
   - optionally write **"Why I feel like this"**.
   Press Save, and "✓ Saved" shows on the card. For a quarter Time already knows, that is three taps.
4. **Or don't open it.** The notification has two buttons. **Same as before** copies the previous
   quarter's answer to this one. **Mute 1 h** silences the pings for an hour. From the app you can also
   mute for 30 minutes, 2 hours, or until morning.
5. **Fill in later.** The Day list shows every quarter from 08:00 to 22:00 of each day. Answered quarters
   show their activity and both scores; gaps are grey. Select a stretch of gaps, answer once, and the
   answer covers the whole stretch. During the two weeks nothing is sorted or coloured.
6. **No pushing.** During the two weeks the app shows only your own entries: no tips, no summaries, no
   offers.
7. **The end.** After 14 days you get one notification: "Your two weeks are done." If you press "End now"
   instead, the review opens straight away and no notification is sent. The review shows:
   - **what it is based on:** "You answered 244 of 784 quarters (61 of 196 waking hours). Quarters you did
     not answer are not counted.";
   - **Martell's four boxes, with growth in place of money:** "Do more", "Worth it, but it costs me",
     "Cut", and "Fun that builds nothing". Each activity sits in its box with its hours, its two averages
     and how many answers they come from;
   - **the share of the answered time in each box.** Martell reads only "how much is red";
   - **under each activity:** your "why" notes, and how many of its hours you marked "avoiding";
   - **your choice for each activity:** Do more · Keep · Hand off · Cut · Change how, plus a note;
   - **"Your energy through the day":** your average energy for each hour of the day. This is Bailey's
     energy waves, made from the same scores.

## Where each part comes from

| Part | Source | Status |
|---|---|---|
| Run it when you feel stuck; two weeks; then stop | Dan Martell (YouTube, "How to Make Time For Everything") | copy |
| A ping every 15 minutes | Dan Martell ("have an alarm go off every 15 minutes to log it") | copy |
| Write what you did, work and home | Dan Martell | copy |
| No nudges until the end | Dan Martell's step order: look first, act after | copy (inferred) |
| Pre-filled from the Time timer | your note | change |
| Energy 1–7 in the moment, instead of colours afterwards | Christopher Martell's "how much you enjoyed it" score; Amy Landino (a YouTube time coach) scores each 15 minutes; the 1–7 range comes from beeper studies of daily mood | change |
| Growth 1–7, instead of $ | Christopher Martell's "how much you got done" score; wording from your note | change |
| "Avoiding something" toggle | your note ("whether he chose it") | invention |
| Optional "why I feel like this" | your note | invention |
| Pings stay on during work, with a mute | your note. The mute goes against Martell, whose alarm is there to catch leaks. | change |
| No pings 22:00–08:00 | Thomas Frank's night window; Martell has none | change |
| Fill in later | Amy Landino ("go back to check and add") | change |
| One answer covers several quarters; the sheet shows the last 3 hours | ours (for whole workout and daygame sessions) | invention |
| "Same as before" and "Mute 1 h" buttons | ours | invention |
| "Your two weeks are done" notice; "End now" | ours | invention |
| Suggestions that finish your words | your note; the matching code comes from Thoughts | invention |
| Four boxes, growth instead of money | Dan Martell's four boxes (energy against money). The box names and the line at 4 are ours. | change |
| Share of time per box | Dan Martell reads only the share of red time ("maybe today, 60% red"); one share per box is ours | change |
| Do more / Keep / Hand off / Cut / Change how | Dan Martell ("hand it off, even to family", "stop doing it"); Christopher Martell ("more of what lifts you, less of what brings you down") | copy plus merge |
| Plan a "perfect week" from your Do-more list (Martell's "Fill") | Dan Martell | **left out for now**: the look page asks |
| Your energy through the day | Chris Bailey | extra |

---

# DECISIONS — taken, each with its reason and the alternative

| ID | Decision | Why | Alternative |
|---|---|---|---|
| D-NAME | Called **"Time & energy audit"** (More item, page title, notification title). Address `/audit`, code folder `src/audit/`. In the review, the hour chart is called "Your energy through the day". | Martell's own name; your note kept "the energy audit" for the Bailey part. | "Energy audit". |
| D-QUARTERS | Fixed quarters at :00/:15/:30/:45 local time. The ping at 10:15 asks about 10:00–10:15. A ping goes out only in the first 5 minutes after its quarter ends, so after an outage nothing arrives late or in a burst. | Fixes the 16-minute drift; a missed quarter is well defined. | Thoughts' rule, "15 min after the last answer". |
| D-QUIET | Quiet hours 22:00–08:00 by default (your Thoughts setting), changeable in the audit's settings, every day. **A quarter is quiet when its START is in quiet hours.** With the default, the pinged quarters are 08:00–08:15 … 21:45–22:00, exactly the Day list, so the last ping goes out at 22:00. | Your own setting; one rule everywhere. | Pings around the clock. |
| D-RUN-QUARTERS | **A quarter belongs to a run** when `slotAt + 15 min > startedAt` and `slotAt < (endedAt ?? endsAt)`. **It is awake** when its start is outside quiet hours. The answer sheet, the "Answer now (N)" count, the Day list, the pings and the review all use only awake quarters of the run. An answer is accepted for any quarter of the run that has already started (`slotAt <= quarterStart(now)`). | One definition; the first quarter of a run can be answered. | — |
| D-SCALES | Energy 1–7 (1 takes my energy · 4 neutral · 7 gives me energy). Growth 1–7 (1 ruins my life · 4 neither · 7 builds my life). Seven buttons in a row: `flex gap-1`, each `h-11 min-w-0 flex-1` (44 px tall, filling the width). | Your words and your "3/7"; one tap per score; fits 360 px phones. | 0–10 as on Christopher Martell's forms. |
| D-REQUIRED | Activity, energy and growth are required to save. "Avoiding" and "why" are optional. An unanswered quarter stays a grey gap; nothing is invented for it. | A review needs both scores; gaps must stay honest. | Allow saving the activity alone. |
| D-RANGE | One answer can cover several quarters. The answer sheet shows the awake, unanswered quarters of the run from the last 3 hours, grouped by `groupQuarters`. Older gaps are filled from the Day list. | Scoring a 1.5 h workout once, after it (your note); keeps the sheet short. | One answer per quarter. |
| D-PREFILL | The activity comes from the Time entry covering most of the quarter (at least 7.5 of its 15 minutes). The text is the entry's description, else its project name. It is read when you open the sheet, not when the ping is sent, and is always editable. | Your note: Time fills it in. Read at opening time, it is the most up to date. | Show it only as a suggestion. |
| D-BUTTONS | On Android, the notification has two buttons. **Same as before** copies the previous quarter's activity, energy, growth and "avoiding", never its "why", and only if that quarter is answered and this one is not. **Mute 1 h** silences pings for an hour. Tapping the notification itself opens the answer sheet. The texts shown afterwards are given exactly in THE PIECES. | Android shows at most 2 buttons; these make a ping one tap. | One button, "Open". |
| D-MUTE | Mute for 30 min / 1 h / 2 h / until morning (the end of the quiet hours) from the app; "Mute 1 h" from the notification. | Your note: must be able to mute. | — |
| D-NO-PUSH | During the run: no tips, no summaries, no offers, and no box colours. Exactly one other notification exists: "Your two weeks are done", sent once after 14 days. "End now" sends nothing. | Your note: no pushing. | No end notification. |
| D-DREAD | No separate "how will this feel" question when starting a timer. Dread goes in the optional "why" box, or is logged as the activity itself ("dreading the 18:00 gym"). | You were unsure; Martell does not ask beforehand. | One tap on every Time Start. |
| D-LENGTH | 14 days, ending by itself; "End now" at any time, behind a confirm; then the review. A new audit can be started any time after, and old audits stay readable. | Martell: two weeks, repeated when stuck. | A chosen length. |
| D-BOXES | Activities are grouped by their wording, with case, spaces and punctuation folded. An activity is "high" on a scale when its average is **above 4** (exactly 4 counts as low). The boxes: high energy + high growth = **Do more**; low energy + high growth = **Worth it, but it costs me**; low energy + low growth = **Cut**; high energy + low growth = **Fun that builds nothing**. On screen, each name is labelled "our name". | 4 is the middle of your scale; easy to read. | Split at your own averages, as the beeper studies do. |
| D-CHOICES | In the review, each activity gets Do more · Keep · Hand off · Cut · Change how, plus a note. They are stored with the audit and shown again when you open it. Nothing else reads them yet. | Martell's "act on it", including his free hand-offs. You choose; the app does not. | No choices, look only. |
| D-FILL | Martell's "perfect week" (Fill) is not built. The look page has a card asking whether you want it. A "Yes" with a note becomes a new plan, not part of this one. | Keeps this plan to the audit itself. | Build it in Phase 6. |
| D-SUGGEST | Empty field: your 6 most frequent activities as chips, from this audit and earlier ones. While typing, matching uses **only the words up to the cursor**, in order: same wording first, then word starts, then small spelling slips, most frequent first. Picking a suggestion replaces everything from the start of the word being edited to the end of the field. So changing the first word of a filled-in activity offers your past phrases that start with the new word, with their rest. | Your note; the matching code already exists and is tested in Thoughts. | Whole-field matching only. |
| D-OFFLINE | Answers made with no signal wait on the phone and send when it comes back. Ids are made on the phone, so a resend saves once. Signing out wipes the audit's copy on the phone. | Daygame happens outside; a shared phone must not keep your text. | Refuse to save offline. |
| D-PRIVACY | The lock screen shows only times ("What did you do from 10:00 to 10:15?"). Activity, "why" and Time descriptions are never written to logs or error reports. A test enforces this. | Same rule as Thoughts. | — |
| D-TIME-UNTOUCHED | No Time screen changes. The audit only reads Time's entries, through a new repo file. The timer's push topic and tag stay as they are. | The toggl-parity session is working on those screens. | A row in Time's ⚙ menu, later. |
| D-CLOCK | Keep the existing database clock (pg_cron, every minute) and the push keys. Rename its job from `thoughts-clock` to `notifications-clock`. | It already runs, costs nothing new, and Time's 6 h alert depends on it. | A new clock. |
| D-DEVICES | Thoughts' device card and device list move to `src/notifications/components/` with neutral wording: turn on, help when blocked, list, test, remove. They appear in the audit's settings sheet. `push_devices.enabled` now means "audit pings on this device". | Deleting Thoughts would otherwise delete the only place to manage devices. | — |
| D-ICON | The nav icon is `BatteryCharging` from lucide-react, imported in `components/navTabs.ts` only. `src/shared/iconRoles.ts` is not edited: its header forbids additions without the owner's approval, and an icon used in one file needs no entry. | No question to the owner needed. | — |
| D-NO-BACKUP | Thoughts' data is deleted without a backup (O2: "entirely"). The `notification_sends` rows of kind `test` stay, because they are shared. | Your answer. | — |
| D-BASELINE | `tests/db/baseline.sql` is not regenerated. The test stack applies Migrations A and B on top of it. | Regenerating needs a live link in the repo folder and resets the shared test database. | Regenerate from the scratch link at the end. |

---

# BLOCKERS — each tried once

| ID | What | Attempted, and what it returned | Blocks | Recommendation |
|---|---|---|---|---|
| B-LIVE-DB | Read and change the live database | 2026-11-08, from a scratch folder: `supabase link --project-ref vcjzbmtcgmjrvvklzqaq` → exit 0, no password. SELECTs worked. Live and local migrations are in sync: 85 each, newest `20261105190000_checkpoint_days`. | Phases 2, 3 | Use the same method (Part 2, rule 6). |
| B-PEER | Another session works on Time (toggl-parity Phase 8) | `git log main..toggl-parity` → 25 commits. Branches `tp-pc8b`, `tp-phone8b`, `sync-p8c` were active 2026-11-08 19:16–19:28. They touch `src/db/notificationsRepo.ts`, `src/notifications/pushClient.ts`, `app/(app)/layout.tsx`. | Any phase touching those files | Rebase on `main` before every ship. Keep edits to those files to the lines named here. On a conflict, keep both sides' changes. |
| B-PHONE | Your days with it on your phone | Live: one Android phone with the installed app, pings on, delivered on 2026-11-08. So pings reach your phone; whether you answer them, only you can show. | The "works" claim | After Phase 7 you get a short "try these" list; the first days are the test. |
| B-PRE-COMMIT | Peers' red tests block commits in the shared folder | Seen 2026-11-05 (memory `shared-checkout-tool-quirks`). Phase 0 step 5 records today's state. | Every ship | Build in a worktree; ship with `git merge --ff-only` (Part 2 rule 3). |
| B-PROXY | A button press on the notification posts without an open page; the session may be stale | `proxy.ts:139-141`: only `/api/test/*` and `/api/timetrack/*` get their tokens refreshed by the proxy. | Phase 5 buttons | Add `/api/audit/:path*` to the matcher and to the 401 branch, exactly like `/api/timetrack/`. |
| B-TEST-DB | One shared test database; another session can reset it | Memory `shared-checkout-tool-quirks` items 4–5. Phase 0 step 5 records `test-stack.mjs env`. The test DB has no cron jobs and an empty vault (schema-only baseline). | Phases 2–7 tests | Run integration tests only when no browser run uses the test DB. Never add secrets to the test vault. When a test acts as if a new column is missing, check with psql, delete the stamp and run `node scripts/db/test-stack.mjs up`. |
| B-REAL-PUSH | Automated browsers cannot receive real pushes from Google | `Plans/thought.md:287`. | Phase 5 proof | Deliver the push with Chrome DevTools (CDP) into the worker (Phase 5 step 6); real delivery stays B-PHONE. |

---

# THE PIECES — what gets built

## Stored data (Migration B; live after Phase 3)

Use exactly this SQL layout: column lines indented by **two spaces**, closing `);` on its own line
(`tests/unit/db/selectsMatchTheSchema.test.ts` parses it).

```sql
create table if not exists public.audit_runs (
  id uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  started_at timestamptz not null,
  ends_at timestamptz not null,
  ended_at timestamptz,
  quiet_start smallint not null default 1320 check (quiet_start between 0 and 1439),
  quiet_end smallint not null default 480 check (quiet_end between 0 and 1439),
  muted_until timestamptz,
  review jsonb not null default '{}'::jsonb,
  end_sent_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (ends_at > started_at and ends_at <= started_at + interval '31 days'),
  check (ended_at is null or ended_at >= started_at),
  check (mod(quiet_start, 15) = 0 and mod(quiet_end, 15) = 0),
  unique (id, user_id)
);
create unique index if not exists audit_runs_one_open_per_person on public.audit_runs (user_id) where ended_at is null;

create table if not exists public.audit_slots (
  id uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  run_id uuid not null,
  slot_at timestamptz not null check (mod(extract(epoch from slot_at), 900) = 0),
  activity text not null check (length(activity) between 1 and 200),
  energy smallint not null check (energy between 1 and 7),
  growth smallint not null check (growth between 1 and 7),
  avoiding boolean not null default false,
  why text check (why is null or length(why) <= 2000),
  source text not null check (source in ('app', 'later', 'same')),
  time_entry_id text check (time_entry_id is null or length(time_entry_id) <= 200),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (run_id, user_id) references public.audit_runs (id, user_id) on delete cascade,
  unique (run_id, slot_at)
);
create index if not exists audit_slots_owner_slot on public.audit_slots (user_id, slot_at);
```

- **Open run:** `ended_at is null and now() < ends_at`. "End now" sets `ended_at = now()`. Starting a new
  run first sets `ended_at = ends_at` on the person's expired open run (same repo call), so the unique
  index never blocks a new start.
- **`review`** holds `{ "choices": { "<activity key>": "more" | "keep" | "handoff" | "cut" | "change" }, "notes": { "<activity key>": "<text ≤ 2000>" } }`,
  at most 300 keys each. `checkReview` in `src/audit/auditService.ts` refuses anything else.
- **Row security:** enable it on both tables. Copy the `DO $$ FOREACH … END $$` loop from
  `supabase/migrations/20261030120000_thought_frequencies.sql:238-252` for `audit_runs` and `audit_slots`
  (select/insert/update/delete own), then
  `revoke truncate on public.audit_runs, public.audit_slots from anon, authenticated;`.
- **Kinds:** drop and re-add `notification_sends_kind_check` as
  `('test', 'timetrack-running', 'timetrack-alert', 'audit-ping', 'audit-end')`. Add
  `create unique index if not exists notification_sends_one_ping_per_quarter on public.notification_sends (entry_id) where kind in ('audit-ping', 'audit-end');`.
  `entry_id` is `audit:<run id>:<epoch seconds of slot_at>` for a ping and `audit-end:<run id>` for the
  end notice.

## The clock (Migration B)

Both functions take the time as a parameter, so tests can pass fixed instants.

```sql
-- Pings due at p_now: the quarter that just ended, in the first 5 minutes after it ended.
create or replace function public.audit_pings_due(p_limit integer, p_now timestamptz default now())
returns table (run_id uuid, user_id uuid, slot_at timestamptz, timezone text)
language sql stable security definer set search_path = ''
as $$
  with q as (
    select to_timestamp(floor(extract(epoch from p_now) / 900) * 900) - interval '15 minutes' as slot_at
  )
  select r.id, r.user_id, q.slot_at, z.tz
    from public.audit_runs as r
    cross join q
    left join public.profiles as p on p.id = r.user_id
    cross join lateral (
      select case when p.timezone in (select name from pg_catalog.pg_timezone_names) then p.timezone else 'UTC' end as tz
    ) as z
    cross join lateral (
      select (extract(hour from q.slot_at at time zone z.tz) * 60
            + extract(minute from q.slot_at at time zone z.tz))::int as m
    ) as t
   where r.ended_at is null
     and p_now < r.ends_at
     and q.slot_at + interval '15 minutes' > r.started_at
     and p_now < q.slot_at + interval '20 minutes'
     and (r.muted_until is null or r.muted_until <= p_now)
     and not (
       case
         when r.quiet_start = r.quiet_end then false
         when r.quiet_start < r.quiet_end then t.m >= r.quiet_start and t.m < r.quiet_end
         else t.m >= r.quiet_start or t.m < r.quiet_end
       end
     )
     and exists (select 1 from public.push_devices as d where d.user_id = r.user_id and d.enabled)
     and not exists (select 1 from public.audit_slots as a where a.run_id = r.id and a.slot_at = q.slot_at)
     and not exists (
       select 1 from public.notification_sends as s
        where s.kind = 'audit-ping'
          and s.entry_id = 'audit:' || r.id::text || ':' || extract(epoch from q.slot_at)::bigint::text
     )
   order by r.user_id
   limit greatest(coalesce(p_limit, 0), 0)
$$;
revoke all on function public.audit_pings_due(integer, timestamptz) from public, anon, authenticated;
grant execute on function public.audit_pings_due(integer, timestamptz) to service_role;

-- "Your two weeks are done": once per run, after its 14 days (never after "End now").
create or replace function public.audit_ends_due(p_limit integer, p_now timestamptz default now())
returns table (run_id uuid, user_id uuid)
language sql stable security definer set search_path = ''
as $$
  select r.id, r.user_id
    from public.audit_runs as r
   where r.ended_at is null
     and p_now >= r.ends_at
     and p_now < r.ends_at + interval '2 days'
     and r.end_sent_at is null
     and exists (select 1 from public.push_devices as d where d.user_id = r.user_id and d.enabled)
     and not exists (select 1 from public.notification_sends as s where s.kind = 'audit-end' and s.entry_id = 'audit-end:' || r.id::text)
   order by r.ends_at
   limit greatest(coalesce(p_limit, 0), 0)
$$;
revoke all on function public.audit_ends_due(integer, timestamptz) from public, anon, authenticated;
grant execute on function public.audit_ends_due(integer, timestamptz) to service_role;
```

`notifications_clock_tick()` in Migration B: copy Migration A's version and change only the gate to
`if not exists (select 1 from public.audit_pings_due(1)) and not exists (select 1 from public.audit_ends_due(1)) and not public.timetrack_alert_due() then return null; end if;`.
Keep `revoke all on function public.notifications_clock_tick() from public, anon, authenticated, service_role;`
and end the migration with `notify pgrst, 'reload schema';`.

The 6 h alert's night hold (07:00–22:59) and the audit's quiet hours are separate. Do not merge them.

**Migration B rollback** (`rollback/<version>_energy_audit.down.sql`). Header in capitals:
**DESTRUCTIVE: DELETES ALL AUDIT DATA AND THE AUDIT'S SEND RECORDS.** Steps, in this order:
1. `create or replace function public.notifications_clock_tick()` with Migration A's gate, and the same
   revokes.
2. `drop function if exists public.audit_pings_due(integer, timestamptz);` and
   `drop function if exists public.audit_ends_due(integer, timestamptz);`
3. `drop index if exists public.notification_sends_one_ping_per_quarter;`
4. `delete from public.notification_sends where kind in ('audit-ping', 'audit-end');`
5. Drop and re-add the kind check as `('test', 'timetrack-running', 'timetrack-alert')`.
6. `drop table if exists public.audit_slots, public.audit_runs;`
7. `notify pgrst, 'reload schema';`

## Migration A (Phase 2): Thoughts out, the clock kept

One file, `supabase/migrations/<version>_thoughts_out.sql`, in this order:
1. `create or replace function public.notifications_clock_tick()`. Use the body of
   `20261105150000_running_timer_notification.sql:137-169` exactly, with only the gate reduced to
   `if not public.timetrack_alert_due() then return null; end if;`. Same revokes.
2. `delete from public.notification_sends where kind = 'thought-prompt';`
3. Drop the four functions with the exact argument types recorded in Phase 0 step 4. Expected, from
   the migration files:
   - `drop function if exists public.thought_frequency_stats(text, timestamptz);`
   - `drop function if exists public.thought_counts(text, timestamptz, uuid);`
   - `drop function if exists public.merge_thought(uuid, uuid);`
   - `drop function if exists public.claim_due_thought_prompts(timestamptz, interval, integer);`
   After writing them, run `\df public.*thought*` on the test DB: it must list nothing.
4. `drop table if exists public.thought_logs, public.thought_reframes, public.thoughts, public.thought_settings, public.thought_prompt_schedule;`
5. Drop and re-add the kind check as `('test', 'timetrack-running', 'timetrack-alert')`.
6. Rename the cron job without failing where it does not exist (the test DB has no cron jobs):
   `select cron.unschedule('thoughts-clock') where exists (select 1 from cron.job where jobname = 'thoughts-clock');`
   then `select cron.schedule('notifications-clock', '* * * * *', 'select public.notifications_clock_tick()');`
7. `notify pgrst, 'reload schema';`

Header: name this plan, O2 and O3. **The rollback** (`rollback/<version>_thoughts_out.down.sql`), in order:
1. Recreate the five tables, their indexes, policies and four functions by copying their definitions from
   `20261030120000_thought_frequencies.sql` and `20261030140000_thought_stats.sql`.
2. Restore the gate exactly as in `20261105150000_running_timer_notification.sql:137-169`, keeping
   `and not public.timetrack_alert_due()`. Never use the gate from `20261030130000_thoughts_clock.sql`:
   it drops Time's alert.
3. Restore the kind check with `'thought-prompt'`.
4. `select cron.unschedule('notifications-clock') where exists (select 1 from cron.job where jobname = 'notifications-clock');`
   then schedule `thoughts-clock` the same way.

Its header says in capitals: **THE DATA DOES NOT COME BACK.**

**Never run** `rollback/20261030120000_thought_frequencies.down.sql` or
`rollback/20261030130000_thoughts_clock.down.sql`. They drop `push_devices`, `notification_sends`,
`notification_secret()` and the clock, which Time needs.

## Server code

| File | What |
|---|---|
| `src/db/auditRepo.ts` | **Session-client functions:**<br>- `readOpenRun(userId)`, `readRuns(userId)`<br>- `readSlots(userId, runId)`: `readAllRows`, ordered by `id`<br>- `startRun(userId, {id, startedAt})`<br>- `updateRun(userId, runId, patch)`<br>- `upsertSlots(userId, slots[])`: at most 200 per call, `onConflict: "run_id,slot_at"`<br>- `deleteSlot(userId, id)`<br>- `frequentActivities(userId, limit)`<br>- `copyPreviousSlot(userId, runId, slotAt)`: used by the ping route<br>**Admin-client functions, for the clock:**<br>- `auditPingsDueAsServer(limit, now = new Date())` and `auditEndsDueAsServer(limit, now = new Date())`: rpc with `p_now`<br>- `markEndSentAsServer(runId)`<br>Every read filters `.eq("user_id", userId)`; every write sets `user_id`. Typed errors: `AuditRunNotFound`, `AuditRefused`. |
| `src/db/timetrackRangeRepo.ts` | New file, so `timetrackRepo.ts` stays untouched (B-PEER). `readTimeEntriesBetween(userId, fromIso, toIso)` returns `{id, description, projectName, startedAt, stoppedAt}[]`.<br>- Session client.<br>- Filters: `deleted_at is null`; `started_at < to`; `.or("stopped_at.is.null,stopped_at.gt.<from>")`.<br>- Embeds `project:timetrack_projects(name)`.<br>- `readAllRows`, ordered by `id`. |
| `src/audit/types.ts` | `AuditRun`, `AuditSlot`, `AuditAnswer`, `ReviewChoice`, `Review`, `ScaleValue` (1–7). |
| `src/audit/quarterService.ts` | Pure, no I/O.<br>- `QUARTER_MS = 900_000`; `quarterStart(ms)`; `quartersBetween(fromMs, toMs)`.<br>- `runQuarters(run, nowMs, tz)`: the run's awake, already-started quarters, per D-RUN-QUARTERS.<br>- `prefillQuarters(quarters, entries, nowMs)`: the largest overlap of at least 450 s wins; a tie goes to the later start; entries starting after now are skipped.<br>- `groupQuarters(quarters, prefill)`: merges neighbouring quarters with the same prefilled text; a blank merges with a blank.<br>- `quarterLabel(ms, tz)`: "10:00–10:15". |
| `src/audit/auditService.ts` | - `checkAnswer(input, run, now)`:<br>  - activity is 1–200 characters after trimming;<br>  - energy and growth are integers 1–7;<br>  - `avoiding` is a boolean;<br>  - why is at most 2,000 characters;<br>  - `slotAt` is on a quarter, belongs to the run (D-RUN-QUARTERS), and `slotAt <= quarterStart(now)`.<br>- `checkReview(input)`, `runIsOpen(run, now)`, `muteUntil(option, run, now, tz)`.<br>- `buildReview(slots, run, tz)`: see Phase 6. |
| `src/audit/suggestService.ts` | - `matchActivities(textBeforeCursor, items, limit)`, using `src/shared/textMatch.ts` (Phase 1).<br>- `applySuggestion(field, cursor, phrase)`: replaces from the start of the word being edited to the end of the field.<br>- `topActivities(counts, 6)`. |
| `src/audit/auditQueue.ts` | The audit's offline queue, built on `src/shared/offlineQueue.ts` (Phase 1). Exports `forgetAuditOnThisDevice()`. |
| `src/audit/pingService.ts` | `runAuditPingClock(now = new Date())`:<br>1. Read the due pings (limit 200).<br>2. For each one: `sendToPerson(row.userId, "audit-ping", (sendId) => pingPayload(row.slotAt, row.timezone, sendId), now, { entryId: \`audit:${row.runId}:${Date.parse(row.slotAt) / 1000}\` })`. **Never call `openSend` yourself**: `sendToPerson` opens the send. `alreadySent` means skip.<br>3. Then the ends: `sendToPerson(userId, "audit-end", build, now, { entryId: \`audit-end:${runId}\` })`, then `markEndSentAsServer(runId)` when the result has a `sendId` or `alreadySent`.<br>A failure on one person never stops the others. The model to copy is `src/timetrack/runningTimerService.ts:343-370`. |
| `app/api/audit/route.ts` | `GET ?from&to` returns `{ run, runs, slots, timeEntries, suggestions }`. Uses `requireAuth()`. Errors are logged as a fixed tag plus `error.message`, never user text. |
| `app/api/audit/runs/route.ts` | `POST {id}`: start a run (14 days). |
| `app/api/audit/runs/[id]/route.ts` | `PATCH { end: true } \| { mute: "30m"\|"1h"\|"2h"\|"morning"\|"off" } \| { quietStart, quietEnd } \| { review }`. `params` is a Promise (Next 16). |
| `app/api/audit/slots/route.ts` | `PUT { slots: AuditAnswer[] }` (1–200 answers), each checked with `checkAnswer`. |
| `app/api/audit/slots/[id]/route.ts` | `DELETE`. |
| `app/api/audit/ping/route.ts` | `POST { action: "same" \| "mute", slotAt, sendId }` from the service worker.<br>- Copy the guard of `app/api/timetrack/stop/route.ts:32-43` exactly: same-origin `Sec-Fetch-Site`, JSON content type.<br>- Check that `sendId` is this person's `audit-ping` send whose `entry_id` names this `slotAt`, and that `slotAt` passes `checkAnswer`'s quarter and run rules.<br>- **"same"**: `copyPreviousSlot` with source `same`, then answer 200 `{ title: "Time & energy audit", body: "Saved for 10:00–10:15 (same as before)" }`.<br>- **"same", refused** (previous quarter unanswered, or this one already answered): 409 `{ title: "Time & energy audit", body: "Not saved. Tap to answer." }`.<br>- **"mute"**: 1 h, then 200 `{ title: "Time & energy audit", body: "Muted until 11:15" }`.<br>- Times are in the person's zone. **No activity or "why" text ever appears in a body.** |
| `app/api/notifications/tick/route.ts` | Runs `runTimerAlertClock()` and `runAuditPingClock()` independently, each with its own `.catch`, as the timer does today. |
| `proxy.ts` | Add `"/api/audit/:path*"` to the matcher, and `\|\| path.startsWith("/api/audit/")` to the 401 branch at `:102`. |

**Ping payload** (exact): `{ kind: "audit-ping", title: "Time & energy audit", body: "What did you do from 10:00 to 10:15?", url: \`${ROUTES.audit}?answer=${slotIso}&send=${sendId}\`, tag: "audit-ping", slotAt: slotIso, sendId, actions: [{ id: "same", title: "Same as before" }, { id: "mute", title: "Mute 1 h" }] }`.
**End payload** (exact): `{ kind: "audit-end", title: "Time & energy audit", body: "Your two weeks are done. See what takes your energy and what builds your life.", url: \`${ROUTES.audit}?view=review\`, tag: "audit-end" }`.
In `src/notifications/pushService.ts`, `PushPayload` gets `kind?: "timetrack-running" | "audit-ping" | "audit-end"; slotAt?: string; sendId?: string`.
`topicOf` keeps `if (isTimerKind(kind)) return "timer-running"` unchanged, and its last line becomes
`return kind`. Do not change the expectation `topic: "timer-running"` in
`theRunningTimerReachesOnlyDevicesThatAskedForIt.integration.test.ts:107`.

## The service worker (`public/sw.js`)

- **Leave unchanged:** the TIMER_* constants (`:261-264`), every `timer ?` arm of the push handler, the
  Stop queue (`:313-478`: openStops, stopFromNotification, sendQueuedStops) and the sync and message
  listeners. Run `tests/unit/shared/theShadesStopButtonStopsTheTimer.test.ts` after every sw.js edit.
- **Change only:**
  - the default `fallback` of `sameSiteUrl` (`:267`): `/settings` in Phase 2, `/audit` in Phase 5;
  - the non-timer defaults (`:286-288`): title "Time & energy audit", body "", tag `data.tag || "audit-ping"`;
  - the non-timer `data` object (`:303`): `{ url: sameSiteUrl(data.url), kind: typeof data.kind === "string" ? data.kind : null, slotAt: typeof data.slotAt === "string" ? data.slotAt : null, sendId: typeof data.sendId === "string" ? data.sendId : null }`.
- **`notificationclick`**, before the generic open:
  `if (data.kind === "audit-ping" && (event.action === "same" || event.action === "mute") && data.slotAt)`.
  POST `/api/audit/ping` with `{ action, slotAt, sendId }` (`credentials: "same-origin"`, JSON body), then
  show the server's `{ title, body }` as a silent notification under tag `audit-ping`. On any failure,
  show "Not saved. Tap to answer." with the ping's `url`.
- **Phase 2 removes** `logFromNotification` (`:498-528`), the labels branch (`:541-544`) and `/thoughts`
  from `SHELL_PATHS` (`:93-96`). **Phase 5 adds** `/audit` to `SHELL_PATHS`, sets
  `tests/unit/navigation/routeList.test.ts:94` to
  `[ROUTES.time, ROUTES.quitVice, ROUTES.liveWorkout, ROUTES.audit]`, and fixes the comment at `:74-78`.

## Screens (all under `/audit`, phone first, 390 px wide)

| Screen | What it shows |
|---|---|
| **Start** (no open run) | - Title "Time & energy audit".<br>- Three lines in plain words: "Run it when you feel stuck. For two weeks, every 15 minutes, note what you did and how it felt. At the end you see what takes your energy and what builds your life."<br>- The button "Start a two-week audit".<br>- The device card, if pings are not on.<br>- The list of past audits; each one opens its review. |
| **Today** (open run) | - Header: "Day 3 of 14 · ends 22 Nov".<br>- A big "Answer now (3)" button, with the count of awake, unanswered quarters from the last 3 hours.<br>- The Day list for today.<br>- "Mute" and "Settings" buttons.<br>- "End now" at the bottom, behind a confirm. |
| **Answer sheet** (`BottomSheet`) | One card per group, e.g. "10:00–11:30 · from Time". Each card has:<br>- the activity field with suggestion chips;<br>- the Energy row 1–7, end labels "takes my energy" / "gives me energy";<br>- the Growth row 1–7, end labels "ruins my life" / "builds my life";<br>- the optional "Avoiding something" toggle;<br>- the optional "Why I feel like this" box;<br>- Save.<br>Saving shows "✓ Saved" on the card and moves to the next. Cards use `px-2`. |
| **Day list** | - Every awake quarter of the chosen day: answered ones show the activity and its two scores (E 3 · G 6); gaps are grey rows.<br>- No box colours until the review.<br>- Tap a gap to start a selection, tap another to end it, then "Answer these (6)" opens the sheet for that stretch.<br>- Tap an answered row to change or delete it.<br>- Day picker: the run's days. |
| **Mute sheet** | 30 min · 1 h · 2 h · Until morning; when muted, "Unmute". Shows "Muted until 11:15". |
| **Settings sheet** | Quiet hours (from–to, in 15-minute steps), plus the device card and device list (D-DEVICES). |
| **Review** | See Phase 6. |

**Rules for every screen:**
- 44 px touch targets (`tests/unit/shared/touchTargets.test.ts`).
- Inputs at 16 px or larger (`phoneInputZoom.test.ts`).
- Loading, error and empty kept apart with `src/shared/useLoad.ts`.
- A screen that saves refuses to open when its read failed (`.claude/rules/database.md`).
- No sideways scroll at 360 and 390 px. The e2e spec checks
  `document.documentElement.scrollWidth <= window.innerWidth` on the answer sheet.

---

# PHASES

Each phase: build with failing tests first, run the checks in Part 2 rule 4, ship (Part 2 rule 3), then
write a status line under the phase in this file. Phases 1–7: "Live <date>, commit <sha>, buildId
confirmed". Phase 0: "Ground truth recorded <date>".

## Phase 0 — Ground truth (no product change)

1. Read:
   - this plan, `CLAUDE.md` and the memory index;
   - `Plans/thought.md`, the sections "Reminders reaching you" and Phases 5–10;
   - `docs/runbooks/notifications.md`;
   - the Next guides `node_modules/next/dist/docs/01-app/01-getting-started/15-route-handlers.md` and
     `03-api-reference/03-file-conventions/route.md`.
2. Read the owner's marks again (ArtifactData `list`, collection `marks`, on the research page). Any note
   newer than 2026-11-08 20:00 UTC goes on the "Notes since" line at the top. Follow it where it changes
   a decision, and record which decision changed.
3. Make the worktree (Part 2 rule 3). Run `git log --oneline main..toggl-parity | wc -l` and record the
   count; if toggl-parity Phase 8 is merged, record that B-PEER is gone.
4. Live, read-only (Part 2 rule 6). Record:
   - `select p.proname, pg_get_function_identity_arguments(p.oid) from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'public' and p.proname like '%thought%';`
   - `select jobid, jobname, schedule from cron.job;`
   - the row counts of the five thought tables, and of `notification_sends` per kind;
   - `select status_code, count(*) from net._http_response group by 1;`
5. In the worktree, check that `node scripts/db/test-stack.mjs env` works and that `npx vitest run` is
   green on `main`. Record failures that are not ours (B-PRE-COMMIT, B-TEST-DB); do not fix them.

**Done when:** the status line under this phase lists the signatures, cron jobs, row counts, test
baseline and toggl-parity count.

**Status:** Ground truth recorded 2026-11-09.
- Live functions with `thought` in the name: `thought_counts(p_tz text, p_now timestamptz, p_user uuid)`, `merge_thought(p_from uuid, p_into uuid)`, `claim_due_thought_prompts(p_now timestamptz, p_lease interval, p_limit integer)`, `thought_frequency_stats(p_tz text, p_now timestamptz)`.
- Live cron jobs: 1 `prune-error-reports` (20 3 * * *), 2 `thoughts-clock` (* * * * *), 3 `prune-cron-history` (40 3 * * *).
- Live row counts: thoughts 10, thought_logs 11, thought_reframes 0, thought_settings 1, thought_prompt_schedule 1. `notification_sends`: thought-prompt 524, timetrack-running 9, test 1.
- `net._http_response`: 23 rows, all status 200. Cron runs in the last 5 minutes: all succeeded. Live and local migrations in sync (newest 20261105190000).
- Test baseline on `main` (at 42c43f56, in the worktree): `npx vitest run` 539 files passed, 6487 tests passed, 1 skipped. `node scripts/db/test-stack.mjs env` works.
- toggl-parity: 25 commits not on `main` (B-PEER still applies).

## Phase 1 — Lift the shared parts out of Thoughts (no behaviour change) · M

Goal: after this phase, deleting `src/thoughts/` breaks nothing else, and Thoughts still works.

1. Move `isUuid` to `src/shared/ids.ts`. Update `app/api/notifications/devices/[id]/route.ts:10` and
   Thoughts' own imports.
2. Move `inQuietHours`, `isAllowedAt` and `firstAllowedAtOrAfter` (`src/thoughts/schedule.ts:34-94`) to
   `src/notifications/quietHours.ts`. Their tests move from `tests/unit/thoughts/schedule.test.ts` to
   `tests/unit/notifications/quietHours.test.ts`. `schedule.ts` imports them back.
3. Move `normalizeThought`, the capped edit distance and `matchThoughts` (`thoughtsService.ts:34-130`) to
   `src/shared/textMatch.ts`, as `normalizePhrase`, `editDistanceAtMost` and
   `matchPhrases<T>(query, items, textOf, countOf, limit)`. Their tests move to
   `tests/unit/shared/textMatch.test.ts`. Thoughts uses the moved versions.
4. Move the generic offline queue to `src/shared/offlineQueue.ts`, with generic item types. It has two
   parts, and both move:
   - the queue state in `src/thoughts/logQueue.ts`: key-value store injection, owner tag, the
     forget-on-other-owner rule;
   - the flush loop in `src/thoughts/hooks/useThoughts.ts:65,184-288`: chunks of 200, a 4xx drops the
     item except 401, retries on `online` and `visibilitychange`.
   Thoughts becomes a thin user of it. The generic tests move to `tests/unit/shared/offlineQueue.test.ts`.
5. Move `RemindersCard.tsx` (install steps, help per OS when blocked, withdrawn, offer, silent for 24 h,
   on) and the device list of `RemindersSheet.tsx:236-263` to
   `src/notifications/components/PushDeviceCard.tsx` and `PushDeviceList.tsx`. The wording is passed in as
   props. Thoughts passes its old words, so its screen does not change.
6. Move the tests of shared plumbing that live in Thoughts-named files:
   - **into `tests/integration/repos/pushPlumbing.integration.test.ts`:**
     - `thoughtsRepo.integration.test.ts:298-385`: the whole "reminder clock's storage" block. Leave out
       its `writePromptSchedule`, `thought_prompt_schedule` and `claim_due_thought_prompts` lines.
     - `thoughtsClock.integration.test.ts:162-171` and `:203-214`.
   - **into `tests/e2e/pushDevices.spec.ts`:** `tests/e2e/thoughts.spec.ts:155-191` and `:267-280`
     (device register, switch, remove; devices forget).
7. Move `tests/unit/thoughts/thoughtTextStaysPrivate.test.ts` to
   `tests/unit/notifications/textStaysPrivate.test.ts`. For now it keeps every path it guards today.
8. `app/api/notifications/test/route.ts`: use neutral text ("Test notification" / "Pings will look like
   this."), url `/settings`, and no import from Thoughts.

**Checks:** all unit tests; the moved integration file; the moved e2e spec at phone size; the type and
lint ratchets.
**Done when:**
`grep -rn "src/thoughts" app src components --include=*.ts --include=*.tsx | grep -v "^src/thoughts\|^app/api/thoughts\|^app/(app)/thoughts\|^src/db/thoughtsRepo.ts"`
prints only `app/api/notifications/tick/route.ts` and `src/shared/offlineCopies.ts`. Also
`grep -rlw "removeDevice\|setDeviceEnabled\|moveDevice\|closeSend" tests --include=*.test.ts` lists
`pushPlumbing.integration.test.ts`.

**Status:** Live 2026-11-09, commit 0a6aa5bd (pushed 2026-11-09 06:59 UTC). Vercel never built this commit on its own: it built the next push, 9f8ecbcc, which contains it, so the buildId of 0a6aa5bd itself was never seen on the live site; the live site has run its code since 9f8ecbcc. Checks run: all unit tests (540 files), the moved integration file, the moved e2e spec and the whole old Thoughts e2e spec at phone size (10 passed) before deletion, the type ratchet (none new). The lint ratchet fails on main for a peer's file (`docs/research/addiction-one-pagers/board/check_render_v3.mjs`), not on files changed here; changed files were linted directly with no errors. Two parts differ from the plan: the Thoughts-only UI test of the device list stayed in `thoughts.spec.ts` until Phase 2 deleted it, and `pushDevices.spec.ts` checks the device routes through the app's own endpoints, not a screen. The Thoughts offline queue now uses `src/shared/offlineQueue.ts` for its owner rule and its send loop only; the Thoughts-specific queue state stayed in `logQueue.ts`.

## Phase 2 — Thoughts out (code, then Migration A) · M

1. **Delete the code:**
   - `src/thoughts/`, `src/db/thoughtsRepo.ts`, `app/(app)/thoughts/`, `app/api/thoughts/`;
   - `tests/unit/thoughts/` (everything still in it), `tests/integration/repos/thoughtsClock.integration.test.ts`,
     `thoughtsRepo.integration.test.ts`, `tests/e2e/thoughts.spec.ts`.
2. **Edit these places:**
   - `components/navTabs.ts`: remove the Thoughts item (`:73-80`) and the `AudioWaveform` import.
   - `app/manifest.ts:53-58`: remove the "Log a thought" shortcut.
   - `app/globals.css:453-473`: remove `thought-flash` and `thought-rise`.
   - `src/shared/routes.ts:69-74`: remove `ROUTES.thoughts`. Add no `LEGACY_ROUTES` row now; Phase 4
     adds `/thoughts` → `/audit` once.
   - `src/shared/offlineCopies.ts:20,79`: replace the Thoughts call with
     `try { localStorage.removeItem("thoughts-queue-v1"); localStorage.removeItem("thoughts-view-v1") } catch {}`.
     It wipes old Thoughts text from phones at sign-out; keep it for good. Update the comment at `:31-43`.
   - `public/sw.js`: as in THE PIECES ("Phase 2 removes"; fallback `/settings`).
   - `src/notifications/pushService.ts`: `topicOf` as in THE PIECES.
   - `src/db/notificationsRepo.ts`:
     - `SendKind` drops `thought-prompt`;
     - delete `readPromptSchedule`, `writePromptSchedule` and `claimDuePrompts` (`:304-353`);
     - keep `timezoneAsServer`.
   - `app/api/notifications/tick/route.ts`: only `runTimerAlertClock()` for now.
   - `tests/unit/notifications/textStaysPrivate.test.ts`:
     - drop the Thoughts paths;
     - keep `src/notifications`, `app/api/notifications` and `src/db/notificationsRepo.ts`;
     - lower its two "finds the code it guards" thresholds to the counts measured now, recorded in the
       file.
   - Other tests:
     - `tests/unit/navigation/routeList.test.ts:94`: drop `ROUTES.thoughts`;
     - `tests/unit/timetrack/theBackControlReturnsWhereYouCameFrom.test.tsx`: use `ROUTES.settings`;
     - `tests/unit/notifications/notifications.test.ts`: drop `:11` and `:94-115`;
     - `tests/unit/shared/serviceWorkerPush.test.ts:69-141`: use a `test` payload, and drop the
       thought-button block (`:108-141`);
     - `tests/unit/shared/theShadesStopButtonStopsTheTimer.test.ts:164-167,304`: use kind `test`;
     - `tests/integration/repos/theRunningTimerReachesOnlyDevicesThatAskedForIt.integration.test.ts:14,135-141`:
       a `test` payload.
   - `tests/support/writeCoverage.baseline.json`: remove `:90-100`, `:196-197`, `:52` and `:62`.
   - Comments naming Thoughts:
     - `src/notifications/hooks/usePushDevice.ts:11`;
     - `src/timetrack/components/RunningTimerSetting.tsx:12`;
     - `TogglLab.tsx:663`;
     - `components/AppFrame.tsx:59`;
     - `tests/unit/navigation/appFrame.test.tsx:98`.
     Comments that cite `Plans/thought.md` as history may stay. Do not change any other use of the word
     "thought".
3. **Ship the code first.** The live app then stops reading the Thoughts tables. Confirm the buildId.
   Then, live and read-only, run `select status_code, count(*) from net._http_response where created > now() - interval '15 minutes' group by 1`.
   Until Migration A, the clock calls the site every minute and gets 200 with no sends; record the
   result.
4. **Tests that list tables**, before any apply:
   - remove `thought_prompt_schedule` from
     `tests/integration/db/rowSecurityCatalog.integration.test.ts:37-39`, and fix the migration cited
     for `push_devices`;
   - remove `thought_logs_prompt_owner` from `userDataCascades.integration.test.ts:100-101`;
   - remove any thought entry from `scripts/auditRlsExpectations.ts`.
5. **Migration A**, exactly as in THE PIECES:
   1. Apply it to the test DB first, all or nothing:
      `docker exec -i supabase_db_daygame-tests psql -U postgres -v ON_ERROR_STOP=1 -1 -f - < <file>`.
   2. Run the catalog tests and `\df public.*thought*` (must list nothing).
   3. Apply it live (Part 2 rule 6).
   4. Live checks:
      - `select count(*) from pg_tables where schemaname = 'public' and tablename like 'thought%'` = 0;
      - `select jobname from cron.job` lists `notifications-clock` and not `thoughts-clock`;
      - `select public.timetrack_alert_due()` returns without error;
      - after 3 minutes, `select status, count(*) from cron.job_run_details where start_time > now() - interval '3 minutes' group by 1`
        shows only `succeeded`.
6. **Docs:**
   - `docs/product/map.md`:
     - the More sheet line;
     - remove the `thoughts/` slice entry;
     - the `notifications/` entry names `notifications-clock`.
   - `docs/product/vision.md` item 48: add one dated line, "2026-11-08: Thoughts deleted at the owner's
     request; notifications now serve Time and the time & energy audit". Do not renumber or remove text.
   - `docs/runbooks/notifications.md`: rewrite the Thoughts parts. The "stop every reminder" step now
     names `notifications-clock` and warns that it stops Time's alert too.
   - `Plans/thought.md`: add a first line, "Retired 2026-11-08: replaced by Plans/energy-audit.md".
7. Ship.

**Done when** all of these hold:
- live has no thought tables, and the clock succeeds every minute;
- `theRunningTimerReachesOnlyDevicesThatAskedForIt` passes;
- the More sheet shows no Thoughts;
- this prints nothing:
  `grep -rnE "src/thoughts|thoughtsRepo|/api/thoughts|ROUTES\.thoughts|thought-prompt|thought_(logs|settings|reframes|prompt_schedule)|forgetThoughtsOnThisDevice|runPromptClock|promptUrl|claimDuePrompts" app src components public tests scripts proxy.ts --include=*.ts --include=*.tsx --include=*.js --include=*.mjs`

**Status:** Live 2026-11-09, commit 9f8ecbcc, buildId confirmed (live `/api/healthz` showed 9f8ecbcc at 07:24 UTC). Code shipped first. The clock called the site 1 time in the 15 minutes before the migration, status 200 (no sends). Migration A (`20261109100000_thoughts_out.sql`) applied to the test database first (also rehearsed with its rollback and re-applied inside a rolled-back transaction), then live with `supabase db push --linked --yes` at about 07:25 UTC, after `supabase migration list --linked` showed only that file pending. Live checks: thought tables 0, thought functions 0, `cron.job` lists `notifications-clock` and not `thoughts-clock`, `select public.timetrack_alert_due()` returned false without error, and `notifications-clock` succeeded in each of the first three minutes after the apply (07:26, 07:27, 07:28 UTC). `notification_sends` now: timetrack-running 11, test 1 (524 thought-prompt rows deleted; the plan said 516, live had 524). The grep of Done-when prints nothing. The More sheet at 390 px shows Time, Ask Coach, Articles, Settings, Log Out. Differences from the plan: the migration is `20261109100000` (dated today), the rollback sits in `supabase/migrations/rollback/`, and `theRunningTimerReachesOnlyDevicesThatAskedForIt` passes.

## Phase 3 — Audit storage (Migration B) · M

1. Write Migration B (`<version>_energy_audit.sql`) and its rollback, exactly as in THE PIECES.
2. Write `src/audit/types.ts`, `src/db/auditRepo.ts` and `src/db/timetrackRangeRepo.ts`. In
   `src/db/notificationsRepo.ts`:
   - `SendKind` adds `audit-ping` and `audit-end`;
   - `openSend` returns null on 23505 for `timetrack-alert`, `audit-ping` and `audit-end`
     (`if (error?.code === "23505" && (kind === "timetrack-alert" || kind === "audit-ping" || kind === "audit-end")) return null`);
   - the first overload becomes `kind: Exclude<SendKind, "timetrack-alert" | "audit-ping" | "audit-end">`.
3. Integration tests in `tests/integration/repos/auditRepo.integration.test.ts` (harness `newUser`/`actAs`;
   fixed instants through `p_now`):
   - **Access and constraints:**
     - person A cannot read or write person B's runs or slots, and `TEST_SHARED_USER=1` turns this red;
     - a person has one open run; starting again after it expired works;
     - the database refuses: a slot off the quarter (`10:07`, and `10:00:00.4`), energy 0 or 8, and an
       activity of 201 characters;
     - `upsertSlots` twice with the same `(run_id, slot_at)` keeps one row;
     - deleting a run deletes its slots; deleting the user deletes both.
   - **`audit_pings_due`** (Europe/Copenhagen profile, quiet 22:00–08:00):
     - due at 10:15:30 for the 10:00 quarter; not due at 10:21;
     - not due while muted;
     - the 21:45 quarter is due at 22:00:30; the 07:45 quarter is not due at 08:00:30;
     - not due when the quarter is answered;
     - not due after a send for that quarter: a second `openSend` with the same `entry_id` returns null;
     - not due with no enabled device;
     - a run started at 10:07 makes the 10:00 quarter due at 10:15:30;
     - on 2026-10-25 (clock change) the quarter times are local.
   - **`audit_ends_due`:** due once per run; never after "End now".
   - **`readTimeEntriesBetween`:** returns a running entry and an entry crossing the range start, and
     never a deleted one.
4. Test bookkeeping:
   - In `tests/support/writePaths.ts:45`, add `"audit_pings_due", "audit_ends_due"` to `READ_ONLY_RPCS`,
     with a one-line comment like the one for `timetrack_alerts_due`.
   - Classify the real writes (`startRun`, `updateRun`, `upsertSlots`, `deleteSlot`, `copyPreviousSlot`,
     `markEndSentAsServer`) in `writeCoverage.baseline.json`.
   - Check that `rowSecurityCatalog` and `userDataCascades` pass. Both tables have own-row policies, so
     nothing is added to their lists.
5. Apply Migration B to the test DB (all or nothing, as in Phase 2), then live (Part 2 rule 6). Live
   checks:
   - both tables exist;
   - `select count(*) from public.audit_pings_due(10)` returns 0;
   - `select public.timetrack_alert_due()` returns without error;
   - after 3 minutes, the cron job still succeeds.
6. Ship.

**Done when:** live has the tables, the clock still succeeds every minute, and all checks are green.

## Phase 4 — Start, answer, fill in later (no pings yet) · L

1. **Routes and links:**
   - `ROUTES.audit = "/audit"`;
   - in `LEGACY_ROUTES`, `{ from: "/thoughts", to: "/audit" }`;
   - a More-sheet item "Time & energy audit" with `BatteryCharging`, in Thoughts' old place (D-NAME, D-ICON);
   - the `docs/product/map.md` entry for `audit/`.
2. **The page:**
   - `app/(app)/audit/page.tsx`: checks the user and redirects, like `app/(app)/time/page.tsx:24-33`;
     `metadata = { title: "Time & energy audit" }`.
   - `src/audit/components/AuditScreen.tsx` and every screen in THE PIECES except Review.
   - `src/audit/auditClient.ts`: a fetch wrapper with a typed error.
   - `src/audit/auditQueue.ts`.
   - `src/audit/hooks/useAudit.ts`: load, answer through the offline queue, mute, end.
   - Add `forgetAuditOnThisDevice()` to `forgetOfflineCopies` in `src/shared/offlineCopies.ts`.
3. **The API:**
   - `GET /api/audit`;
   - `POST /api/audit/runs`;
   - `PATCH /api/audit/runs/[id]`;
   - `PUT /api/audit/slots`;
   - `DELETE /api/audit/slots/[id]`;
   - the `proxy.ts` change.
4. **`quarterService.ts`, `auditService.ts` and `suggestService.ts`**, each with unit tests written first:
   - `prefillQuarters`: an entry covering 8 of 15 minutes wins; one covering 7 does not; of two entries,
     the larger overlap wins; a running entry counts up to now; a planned (future) entry never counts;
   - `groupQuarters`: Gym 08:30–10:00 is one group; a blank between two different activities stays apart;
   - `runQuarters`: the first ping of the day does not include quiet quarters; a run started at 10:07
     includes the 10:00 quarter;
   - quarters are local quarters in Asia/Kathmandu (+5:45) and Europe/Copenhagen;
   - `muteUntil("morning")`, both during quiet hours and outside them;
   - `checkAnswer` refuses the next quarter, accepts the current one, and refuses one before the run;
   - `matchActivities`:
     - "ema" finds "Email";
     - "emial" finds "Email";
     - in "Gym legs", changing "Gym" to "Day" with the cursor after "Day" offers "Daygame city centre";
       `applySuggestion` then replaces the whole field;
   - after `forgetOfflineCopies()`, the audit queue key is gone.
5. **Privacy:** add `src/audit`, `app/api/audit`, `src/db/auditRepo.ts` and `src/db/timetrackRangeRepo.ts`
   to `tests/unit/notifications/textStaysPrivate.test.ts`. No `console.*` call and no error report may
   include `activity`, `why` or a Time description.
6. **E2E**, `tests/e2e/audit.spec.ts`: import from `./fixtures/test`, phone size, no `waitForTimeout`.
   - **Start:** one test starts an audit from the Start screen and sees Today.
   - **The other tests** seed an open run through the repo, with `startedAt` = now − 3 h. They:
     - answer a quarter pre-filled from a Time entry the test created;
     - select three gaps in the Day list and answer once, so three rows show;
     - change one answer and delete one;
     - mute for 1 h and see "Muted until";
     - press "End now": a confirm appears, then the Start screen with one past audit;
     - answer while offline (`context.setOffline`), go back online, and see the row saved once;
     - sign out with a queued offline answer, sign in as another account, and see nothing of it;
     - check `scrollWidth <= innerWidth` on the answer sheet at 360 and 390 px.
7. **First look page.**
   - Take phone screenshots (390×844) of Start, Today, the answer sheet (filled and empty), the Day list
     with a selection, Mute and Settings. Use the e2e test account, never the owner's account.
   - Publish one Artifact page, "Audit look", with a card per screen (picture, what it does, Good /
     Change it / Not sure). Add one card each for D-NAME, D-SCALES, D-BOXES, D-CHOICES and D-SUGGEST, and
     one for D-FILL ("Do you want Martell's perfect-week step? Yes / Not now").
   - **Every block** on the page gets "+ Note" with the note log (memory `review-boards-note-log`; copy
     `history()`, `enhanceNotes()` and `saveNote()` from the Dread or Delight page, version 6). Store the
     notes in its `marks` collection.
   - Test the page with a fake `window.claude.use` store, including a failed save, before publishing.
   - Do not wait for marks. Put the page URL at the top of this plan, and read its marks at the start of
     every later phase.
8. Ship.

**Done when** both hold:
- On a local build against the test stack (memory `worktree-e2e-servers`), signed in as an e2e fixture
  account, every screen works and the e2e spec is green at phone and PC sizes.
- On the live site, checked signed out only: `/audit` redirects to sign-in, and
  `curl -s -o /dev/null -w "%{http_code}" -X POST https://daygame-coach.vercel.app/api/audit/runs` prints
  401. Never sign up or sign in on live.

## Phase 5 — The ping · M

1. Write `src/audit/pingService.ts` (`runAuditPingClock`, `pingPayload`) and wire it into the tick route,
   independent of the timer alert.
2. `src/notifications/pushService.ts`: the `PushPayload` fields from THE PIECES.
3. `app/api/audit/ping/route.ts` and the `public/sw.js` changes ("Phase 5 adds"; fallback `/audit`), plus
   the `routeList.test.ts:94` change.
4. On `/audit`, show the device card (`PushDeviceCard`) when none of this person's devices has pings on.
   The Settings sheet shows `PushDeviceList` and the quiet hours.
5. Tests first:
   - **Unit:**
     - `pingPayload` says "from 10:00 to 10:15" in the person's zone, and contains nothing the user
       wrote;
     - the worker keeps `kind`/`slotAt`/`sendId`, posts `same` or `mute`, and shows the answer;
     - when the post fails, the worker shows "Not saved. Tap to answer."
     These go in `tests/unit/shared/serviceWorkerPush.test.ts`. The timer tests stay green.
   - **Integration** (fake keys and a fake `web-push`, as the moved pushPlumbing tests do; never secrets
     in the test vault):
     - two ticks at once send exactly one push;
     - a failed send leaves no second send for the same quarter;
     - "same" copies activity, energy, growth and avoiding, but not why;
     - "same" answers 409 when the previous quarter is unanswered or this one is already answered;
     - a `sendId` of another person is refused;
     - the end notice is sent once, and `end_sent_at` is set.
   - **Route:** `/api/audit/ping` refuses a cross-site request and a non-JSON body, and no response body
     contains the copied activity.
6. **Production-build check of the worker.**
   - Run a production build in the worktree against the test stack (the dev server removes the worker on
     purpose).
   - Open `/audit` in Playwright Chromium with the `notifications` permission granted.
   - Deliver the exact ping payload through CDP:
     `const cdp = await context.newCDPSession(page)`, then `ServiceWorker.enable`, then
     `ServiceWorker.deliverPushMessage({ origin, registrationId, data })`.
   - Confirm that `registration.getNotifications()` shows the title, the body and both buttons.
   - If headless Chromium refuses the delivery, record that as "not proven". Real delivery stays B-PHONE.
7. Ship. Live checks: `select count(*) from public.audit_pings_due(10)` returns 0 (no open runs), and the
   cron job still succeeds.

**Done when:** the step 5 tests are green and the step 6 result is recorded here.

## Phase 6 — The end: review · M

1. **`buildReview(slots, run, tz)`** in `auditService.ts`: pure, tests written first.
   - `possibleQuarters`: the awake quarters of the run up to its end. `answered`: the count.
     `hours = answered × 0.25`.
   - `groups`, keyed by `normalizePhrase(activity)`. Each has:
     - its label: the most used original spelling;
     - `answers`, minutes, and average energy and growth (one decimal);
     - `avoidingMinutes`;
     - its whys, newest first, each with its quarter.
   - `box`: per D-BOXES.
   - `shares`: for each box, minutes ÷ answered minutes, in whole percent summing to 100 (largest
     remainder).
   - `bestHours`: the average energy for each local hour 0–23, with its answer count. Only hours with at
     least 4 answers.
   - Edge cases: no answers (an empty review that says so); one activity; 1,400 slots (no cap, because
     the repo read uses `readAllRows`).
2. **The Review screen.** Every number shows its basis:
   - the top line: "You answered 244 of 784 quarters (61 of 196 waking hours). Quarters you did not
     answer are not counted.";
   - each share says "of the 61 hours you answered";
   - each activity's averages say "from 12 answers";
   - each best-hours bar shows its answer count.
   The layout:
   - **the 2×2 grid**: growth up, energy right. Each box shows its share, its name with "our name" in
     small text, and its activities with hours and E/G averages.
   - **tapping an activity** opens its card: its "why" notes, its avoiding hours, Do more · Keep · Hand
     off · Cut · Change how, and a note. The choice and note are saved to `review` with PATCH, with a
     visible "✓ Saved".
   - **below the grid**, "Your energy through the day": 24 bars for the local hours, only hours with
     data. Read the `dataviz` skill first: one colour, labelled axes, works in dark mode.
3. The review opens when the run is over (14 days passed, or ended), and from the list of past audits.
   `/audit?view=review` opens the latest finished review.
4. E2E: seed a finished run through the repo and open the review. The seeded activities sit in the right
   boxes, and the basis line shows the right counts. Mark one activity "Cut" with a note, reload, and the
   choice and note are still there.
5. Update the look page with the Review screenshots (seeded data, never the owner's), each with "+ Note".
6. Ship.

**Done when:** the e2e spec is green and the look page has the Review cards.

## Phase 7 — Proof, then the report · M

1. **Adversarial audit** (memory `prove-fixes-with-adversarial-audit`). At least five independent agents,
   each in its own worktree against the test stack, each given only the app's address and its theme,
   never this plan's expectations:
   - phone answering: a whole simulated day, gaps, ranges, edits, deletes;
   - time and clocks: quarters across midnight, quiet hours, the 2026-03-29 and 2026-10-25 clock
     changes, a phone clock 10 minutes fast;
   - offline and two devices: answer offline on one, online on the other, the same quarter;
   - privacy and access: another account, signed out, cross-site posts to every `/api/audit` route,
     lock-screen text;
   - Time's 6 h alert and running-timer notification still work after Thoughts' removal.
   Each finding is reproduced twice and gets a failing test before its fix.
2. Run `/code-review` on the whole range from Phase 1's first commit. Run a security review through a
   subagent on the explicit `<start>..HEAD` range; `/security-review` fails in this checkout (memory
   `shared-checkout-tool-quirks`, item 2). Fix what they find, with tests.
3. Docs:
   - `docs/product/map.md`: the `audit/` slice entry, the More sheet line, and the "Live" section;
   - `docs/runbooks/notifications.md`: audit pings, and how to stop them (mute, quiet hours, or
     `update public.audit_runs set ended_at = now() where ended_at is null`).
4. Mark this plan "Live <date>; owner's look and phone test pending". Delete only the `energy-audit-*`
   branches that `git branch --merged main` lists, with `git branch -d`, then run `git worktree prune`.
5. **Report to the owner** in plain words, doubt first:
   - what changed;
   - where it is: a screenshot plus the taps ("More → Time & energy audit");
   - what is not proven: whether he answers the pings, and anything only tests saw;
   - the look page link;
   - this **"try these" list**:
     - Open More → Time & energy audit and start an audit.
     - If it asks, turn on pings for this phone, and check that a test ping arrives.
     - At the next quarter-hour, check that the ping arrives on time and that "Same as before" works
       from the notification.
     - Start a timer in Time, then answer: is the activity filled in?
     - After a workout, answer the whole session at once.
     - Mute for an hour, then unmute.
     - In the evening, fill one gap in the Day list.
   Say "built" and "live", never "works" or "done", until he has used it.

---

# PART 2 — Ground rules for the executing session

1. **Ask the owner nothing** except a new item of the kind in the answers table. The decisions above are
   taken. If one turns out wrong in a way the plan did not foresee, pick the alternative named in
   DECISIONS, note it under the phase, and go on.
2. **Shared working tree.** Other sessions use `/home/jonaswsl/projects/daygame-coach`.
   - Never `git add -A` and never `git stash`.
   - Never edit other sessions' files.
   - Never put throwaway specs in the shared `tests/e2e`.
   - Edit this plan only inside your worktree, and ship it with each phase.
3. **Build in a worktree, ship by fast-forward.** `$S` = your session's scratchpad.
   - **Start (each run):** `git -C /home/jonaswsl/projects/daygame-coach worktree prune`, then
     `git -C /home/jonaswsl/projects/daygame-coach worktree add -b energy-audit-$(date +%Y%m%d%H%M) $S/wt main`,
     then `ln -s /home/jonaswsl/projects/daygame-coach/node_modules $S/wt/node_modules`.
   - **Ship:**
     1. Commit in the worktree.
     2. `git -C $S/wt rebase main` (the shared local `main`). Resolve conflicts by keeping both sides.
     3. Run `npx vitest run` in the worktree.
     4. In the shared checkout: `git merge --ff-only <sha>`, then `git push origin main`.
   - **Confirm:** `curl -s https://daygame-coach.vercel.app/api/healthz` shows `buildId` = your sha. Wait
     up to 10 minutes; Vercel builds on push.
   - Commit messages end with the attribution line from the session's instructions.
4. **Checks before every ship:**
   - `npx vitest run`: all unit tests.
   - The phase's integration files:
     `npx vitest run --config vitest.integration.config.ts <files>`. Only when no browser run uses the
     test DB, because this command can reset it.
   - The phase's e2e spec, run from the worktree (memory `worktree-e2e-servers`: `next dev --webpack`,
     `E2E_STACK_ENV` preset, own port and `--output`).
   - `node scripts/typecheck-ratchet.mjs` and `npm run lint:ratchet`. If the lint ratchet trips on other
     worktrees, lint your changed files directly.
5. **Look at the thing.** After each screen change, open it in Playwright at 390×844 and look at the
   screenshot yourself before shipping. A green test is not a look.
6. **Live database. Never from the checkout or the worktree.**
   - Work in `$S/livedb`: `supabase link --project-ref vcjzbmtcgmjrvvklzqaq`.
   - Reads: only `supabase db query --linked "<select>"`.
   - To apply:
     1. Copy `supabase/migrations/*.sql` from the worktree into `$S/livedb/supabase/migrations/`.
     2. Run `supabase migration list --linked` and confirm that only your migration is pending.
     3. If someone else's is pending too, stop and record it. Never use `--include-all` for someone
        else's file.
     4. `supabase db push --linked --yes`.
   - O3 covers Migrations A and B only.
7. **The repo is public.** No transcripts, forms, owner notes or owner data in commits. Quotes in the app
   stay short and paraphrased.
8. **No new npm packages.** None is needed.
9. **Next.js 16.4.1 is not the one you know.** Read the guides named in Phase 0 before writing routes;
   `params` is a Promise.
10. **Never run** `rollback/20261030120000_thought_frequencies.down.sql` or
    `rollback/20261030130000_thoughts_clock.down.sql`.
11. **Don't stop between phases** for status updates. Stop only for:
    - a new owner-only item;
    - a live migration list showing someone else's pending migration;
    - the clock failing after a live apply. Read `return_message` in `cron.job_run_details` first.
      - **After Migration B:** re-apply Migration A's version of `notifications_clock_tick()` (gate
        `if not public.timetrack_alert_due() then return null; end if;`, same revokes), then report.
      - **After Migration A:** never re-apply an older gate on its own, because it reads a dropped table
        and every tick would fail. If you cannot fix it at once, run the whole
        `rollback/<version>_thoughts_out.down.sql`, which recreates the empty tables before the gate,
        then report.
12. **Words.** In the app and in reports, use plain words: no "ESM", "DRIP", "BA" or "slot". Say
    "quarter", "ping", "audit" and "box".

---

# `/goal` prompts

Two runs. The first removes Thoughts and builds the storage (the database work); the second builds what
you see. Start the second after the first reports.

### Phases 0–3. Paste after `/goal`.

```
Execute Plans/energy-audit.md, Phases 0 to 3, in one run.
First read: that plan (the owner's answers O1–O3 are at its top; use them and ask nothing else), CLAUDE.md,
your memory index, and the owner's marks on https://claude.ai/artifact/V28AzK4axgj7yaczaU9Y4n (ArtifactData
list, collection "marks").
Follow Part 2 exactly: build in a worktree, failing tests first, run the checks in rule 4, ship by
fast-forward, confirm the live buildId, and write each phase's status line into the plan in the worktree.
In Phase 2, ship the code before applying Migration A, and apply every migration to the test database
first. After each live migration, check that the cron job "notifications-clock" succeeds every minute and
that public.timetrack_alert_due() runs; if not, follow Part 2 rule 11.
Never run the two rollback files named in Part 2 rule 10.
Do not stop between phases. At the end, report in plain words, doubt first: what is gone, what is live,
what is not proven yet.
```

### Phases 4–7. Paste after `/goal`.

```
Execute Plans/energy-audit.md, Phases 4 to 7, in one run. Phase 0 must show its ground-truth line and
Phases 1–3 must show "Live" status lines; if not, stop and say so.
First read: that plan, CLAUDE.md, your memory index, the owner's marks on the research page
(https://claude.ai/artifact/V28AzK4axgj7yaczaU9Y4n) and, once it exists, on the look page named at the top
of the plan. Re-read the look page's marks at the start of each phase; a "Change it" with a note is done
in that phase and noted in the plan.
Follow Part 2 exactly: worktree, failing tests first, rule 4 checks, look at every screen at 390×844
before shipping, ship by fast-forward, confirm the live buildId, status lines in the plan.
In Phase 7 run the adversarial audit with at least five independent agents, then a code review and a
security review of the whole range, and fix what they find with tests before reporting.
Do not stop between phases. At the end, report to the owner in plain words, doubt first: what changed,
where it is (a screenshot plus the taps), what is not proven, the look page link, and the "try these"
list from Phase 7. Say "built" or "live", never "works".
```
