# Toggl Track data model (API v9) + clone parity matrix

## Entity fields (from engineering.toggl.com / toggl_api_docs)

### TimeEntry
`id` · `workspace_id`(`wid`) · `user_id`(`uid`) · `description` · `project_id`(`pid`) · `task_id`(`tid`) ·
`tags` (names) · `tag_ids` · `billable` · `start` (ISO 8601) · `stop` (ISO 8601 | null) ·
`duration` (seconds — **if running, it is negative and equals −start_epoch, so real duration = now_epoch + duration**) ·
`duronly` (hide start/stop, show duration only) · `at` (last-updated) · `created_with` (required, client app name) ·
`server_deleted_at` · `shared_with`.

### Project
`id` · `workspace_id` · `client_id` · `name` · `color` (hex) · `active` · `is_private` · `billable` · `currency` ·
`rate` · `rate_last_updated` · `estimated_hours` / `estimated_seconds` · `auto_estimates` · `fixed_fee` ·
`recurring` + `recurring_parameters` · `current_period` · `start_date` · `end_date` · `template` ·
`actual_hours`/`actual_seconds` · `status` · `at` · `created_at` · `server_deleted_at`.

### Others
- **Client**: `id`, `wid`, `name`, `archived`, `at`.
- **Task**: `id`, `project_id`, `wid`, `name`, `estimated_seconds`, `active`, `user_id` (assignee), `tracked_seconds`, `at`.
- **Tag**: `id`, `wid`, `name`, `at`.
- **Workspace**: `id`, `name`, `default_currency`, `default_hourly_rate`, `rounding`, `rounding_minutes`, `only_admins_see_billable_rates`, `projects_billable_by_default`, `at`.
- **User/member**: `id`, `name`, `email`, `role` (basic|manager|admin), `hourly_rate`, `labour_cost`, `timezone`, `beginning_of_week`, `duration_format`, `time_format`, `date_format`.
- **Reports API**: `POST /reports/api/v3/workspace/{wid}/{summary|search}/time_entries` with `start_date`, `end_date`, `grouping`, `sub_grouping`, `project_ids`, `client_ids`, `tag_ids`, `user_ids`, `billable`, `description`, `rounding`, `rounding_minutes`.

Negative-duration encoding, the 4-level rate hierarchy, and the grouping/sub-grouping report shape are reproduced verbatim in the clone.

## Parity matrix — `/test/toggl`

| Toggl capability | Clone | Notes |
|---|---|---|
| One-click timer, running entry, live elapsed | ✅ | tab title shows elapsed like Toggl |
| Timer / Manual mode | ✅ | |
| `@project` / `#tag` inline autocomplete | ✅ | |
| Edit running duration → shifts start | ✅ | |
| Favorites + `1..9` hotkeys | ✅ | |
| Shortcuts `S N M C 1-9 Shift+?` | ✅ | overlay included |
| Day groups, day + week totals, grouped identical entries | ✅ | |
| Continue / duplicate / split(>10 min) / delete / copy start link | ✅ | |
| Bulk edit + bulk delete | ✅ | |
| Undo delete | ✅ | |
| Calendar view: day/week, drag-create, move, resize, now-line, overlap layout | ✅ | |
| External calendar column + click-to-track | ✅ | |
| Google Calendar import | ✅ (ICS secret address, .ics upload, service-account API) | OAuth "Connect" button needs a Google OAuth client — see §Limits |
| All-day events skipped, 60d back/30d forward window | ✅ | matches Toggl's rules |
| Clients / Projects / Tasks / Tags CRUD + archive | ✅ | |
| Project colors (Toggl palette) | ✅ | 15 official hexes |
| Estimates (hours or monetary), auto-estimates, fixed fee | ✅ | |
| Recurring estimate periods | ✅ | weekly→yearly |
| Project alerts at 50/75/80/90/100/150 % | ✅ | in-app alert center |
| Project dashboard w/ forecast + projected end date | ✅ | linear forecast from tracked pace |
| Rate hierarchy workspace→member→project→task + historical rates | ✅ | |
| Reports: Summary (bar+pie+group/subgroup), Detailed, Workload, Profitability | ✅ | |
| Summary-bar metric picker (7 metrics, pick 4) | ✅ | |
| Rounding (up/down/nearest × 1–60 min) | ✅ | |
| Saved reports + share link | ✅ | config encoded in URL |
| Export CSV / XLSX / PDF | CSV + JSON + print-to-PDF | XLSX needs a new dependency |
| Filters (date presets, client, project, task, tag, member, billable, text) | ✅ | |
| Team members, access levels, groups, member audit, reminders | ✅ (simulated members) | single real user; members are local records |
| Required fields, locked entries before date, timesheet approvals | ✅ | enforced on save |
| Duration/time/date format, first day of week, currency | ✅ | |
| Pomodoro (work+break intervals, notifications, continue) | ✅ | Web Notification API |
| Idle detection → keep/discard | ✅ | inactivity listener |
| AutoTracker keyword → project | ✅ | keyword rules on description |
| Timeline (auto app/browser recording) | ⚠️ partial | browser sandbox: records only this tab's visibility+route, not OS apps |
| CSV import of time entries / full JSON backup | ✅ | |
| Webhooks | ✅ simulated | outgoing calls logged in-app |
| Offline tracking + sync | n/a-by-design | storage is local-only, so it is always "offline" |
| Native desktop/mobile apps, browser extension | ❌ | out of scope for a web page |
| SSO, billing/subscription plans, QuickBooks invoicing, Jira/Salesforce/Zapier | ❌ | third-party accounts required |
| Real multi-user teams, email delivery of reports/reminders | ❌ | no auth/mail wiring on a test page |

## Where it lives
```
src/timetrack/
├── types.ts                     # every entity, mirroring API v9 fields
├── config.ts                    # Toggl palette, rounding/alert/format options, shortcuts
├── icons.ts                     # single lucide import point for the slice
├── timetrackService.ts          # entries, validation, rates, favorites, alerts, approvals
├── timetrackFormatService.ts    # duration/time formats + input parsing + rounding
├── reportsService.ts            # summary / detailed / workload / profitability + CSV
├── calendarService.ts           # ICS parse + RRULE expansion + grid geometry
├── calendarSyncService.ts       # server-only: ICS URL fetch, Google Calendar API
├── projectDashboardService.ts   # burn-up, forecast, projected end date, pace verdict
├── importExportService.ts       # workspace JSON backup + Toggl-shaped CSV import
├── data/seed.ts                 # deterministic demo workspace (24 days of history)
├── hooks/useTimetrack.ts        # persistence, clock, pomodoro, idle, reminders, timeline
└── components/                  # TogglLab shell + Timer, Calendar, Reports, Projects, Manage, Settings
app/test/toggl/page.tsx          # the page
app/api/timetrack/calendar/route.ts  # 22-line wrapper over calendarSyncService
tests/unit/timetrack/            # 135 unit tests
```

## Verified
- `npm test`: 2664 passing (135 new), architecture test green.
- Scripted browser audit, 42 checks, 0 console errors: timer start/stop, ticking tab title,
  `S`/`C`/`1`/`Shift+?` shortcuts, entry menu + duplicate, bulk-edit bar, calendar week/day/zoom,
  ICS import (4 events imported, 1 all-day skipped, recurring instances expanded across days),
  all five report tabs, rounding changing the totals, projects table, project dashboard + editor,
  clients/tags/team, all five settings tabs, required-fields enforcement (blocked then allowed),
  reload persistence, and no horizontal overflow at 390 px. Screenshots in `.playwright-mcp/toggl-*.png`.
- Bugs the audits caught and fixed:
  1. the seed generated today's blocks past the current clock, so the demo showed time tracked in the future;
  2. "continue last" could therefore continue a future-dated entry instead of the last real one;
  3. reopening the sandbox on a later day left it showing only past dates (see Limits below);
  4. new-entity ids were read out of a `setState` updater, which React need not run synchronously — an imported
     calendar's events were tagged with a stale id and silently never rendered. Ids now come from the render snapshot;
  5. edits made on a collapsed group only hit the first entry; they now apply to every entry in the group, like Toggl;
  6. an inline description field kept stale text after a bulk edit changed it elsewhere;
  7. dragging a calendar block also opened the entry editor on mouse-up;
  8. calendar entries were squeezed into half of each day even with no calendar connected.
- Cosmetic/copy pass: American spelling throughout (matching the rest of the app), visible field borders (the theme's
  `--input` equals the card background, so bordered inputs were invisible), labeled calendar-import fields, no
  unreadable text in sub-20-minute calendar blocks, correct singular/plural in report subtitles, and the calendar grid
  opens on working hours instead of midnight.

## Calendar import — the three methods, ranked by exposure

| Method | Where the credential lives | Re-sync | When to use |
|---|---|---|---|
| **Upload `.ics`** (default) | none — a file you exported | re-export and re-upload | the safe default |
| **Google Calendar API** | server only (`GOOGLE_SERVICE_ACCOUNT_JSON`); you share the calendar with its `client_email` | one click, no secret in the browser | best if the env var is set |
| **Secret iCal address** | nowhere by default; opt-in checkbox stores it in `localStorage` | one click only if remembered, otherwise re-paste | last resort |

Hardening applied to the secret-address path, since that URL *is* a bearer credential:
- field is `type="password"`, `autocomplete="off"`, `spellcheck="false"`, and the value is never rendered back;
- **not persisted** unless you tick "Remember this address in this browser" (off by default). Without it the calendar row
  reads "not saved" and its Sync button becomes "Paste address to sync";
- the API route strips the address out of any error message before returning it;
- the route refuses loopback/private/link-local hosts, so it can't be used to probe the network;
- the UI names the risk and points at Google's **Reset private URLs**.

Verified by a scripted run (12 checks): masking, SSRF refusal, "not written to localStorage", the re-paste flow,
opt-in persistence, and no address in error output.

## Limits worth knowing
- **Storage is `localStorage` only** (namespace `toggl-clone:v1`, `STATE_VERSION` 2 — a version bump reseeds the demo).
  No Supabase table, no migration, no RLS — deliberate, since this is a `/test` sandbox.
- **Demo data is re-dated on load.** The seeded history is anchored to the day it was generated, so reopening the sandbox
  later used to show only past dates, an empty "Today", and a demo timer "running" for days. `demoDataService` now shifts
  entries tagged `SEED_CREATED_WITH` forward so the newest demo day is today (never into the future), re-anchors the demo's
  running timer to minutes ago, and reports what it moved in a toast. **Entries you create are never moved.**
- A timer running longer than 12 h raises a "you probably forgot this" toast rather than being edited.
- Full OAuth "Connect" (multi-calendar picker + background refresh) needs a Google Cloud OAuth client ID/secret in env.
- Toggl's "Timeline" needs OS-level process access; a browser page cannot see other apps. Partial analog implemented and labeled as such in the UI.
- **Icon governance**: `Timer` and `CalendarClock` are used elsewhere in the app but are not in
  `src/shared/iconRoles.ts`, so the slice reuses the registered `Clock` (role: "duration/time display")
  for timer affordances instead of registering new icons. Needs a decision if you'd rather register them.
- Reports export CSV, JSON and print-to-PDF; XLSX would need a new dependency.
